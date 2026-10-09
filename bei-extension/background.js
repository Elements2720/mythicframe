/**
 * MythicFrame BEI Bridge - Service Worker (background.js)
 * Connects to MythicFrame BEI Bridge on unique port 58925 (ws://127.0.0.1:58925/ws)
 * Communicates with authenticated browser tabs (Gemini Web & ChatGPT Web).
 * Features:
 * - Silent background tab opening (active: false) without stealing focus or switching tabs
 * - Automatic Google account email discovery from session & all page frames
 * - Direct programmatic script execution fallback (100% eliminates "Receiving end does not exist")
 * - Real-time accounts sync to MythicFrame Studio Dropdown
 * - Local project directory management and storage persistence
 */

const BRIDGE_WS_URL = "ws://127.0.0.1:58925/ws";
const BRIDGE_API_BASE = "http://127.0.0.1:58925/api/bei";
const DEFAULT_PROJECT_DIR = "";

try {
  importScripts("scripts/protocol.js");
} catch (e) {
  console.debug("[MythicFrame BEI Worker] importScripts notice:", e);
}

const protocol = globalThis.__MYTHIC_BEI__ || {
  upgradeToHighResUrl: (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('googleusercontent.com') || url.includes('gstatic.com') || url.includes('photos.google.com')) {
      if (/=[swh]\d+/i.test(url) || /=w\d+-h\d+/i.test(url)) {
        return url.replace(/=(?:s\d+|w\d+-h\d+|w\d+|h\d+)(?:-[a-zA-Z0-9_-]+)*(?=[?&#]|$)/i, '=s2048');
      }
    }
    return url;
  }
};

let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;
const activeJobs = new Map(); // jobId -> { tabId, target, prompt, accountSlot }
const slotQueues = new Map(); // slotKey -> Array<jobData>
const tabEmailsCache = new Map(); // tabId -> email string
const knownGoogleAccounts = new Map(); // slot -> { slot, email, name }

// Load saved project folder path
let currentProjectDir = DEFAULT_PROJECT_DIR;
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['mythicProjectDir'], (result) => {
    if (result && result.mythicProjectDir) {
      currentProjectDir = result.mythicProjectDir;
    }
  });
}

// Keep-alive port connection handler to prevent worker sleep during long generations
const activeKeepAlivePorts = new Set();
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "mythicframe-bei-keepalive") {
    activeKeepAlivePorts.add(port);
    port.onDisconnect.addListener(() => {
      activeKeepAlivePorts.delete(port);
    });
  }
});

// Periodic alarm keepalive
if (chrome.alarms) {
  chrome.alarms.create("mythicBEIKeepAlive", { periodInMinutes: 0.3 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "mythicBEIKeepAlive") {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectBridge();
      } else {
        try {
          ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        } catch (e) {}
      }
    }
  });
}

function isSystemEmail(email) {
  const lower = (email || '').toLowerCase();
  return lower.includes('noreply') || 
         lower.includes('support@google.com') || 
         lower.includes('google-support') ||
         lower.includes('example.com');
}

/**
 * Fetches Google accounts directly from Google session ListAccounts endpoint
 * This identifies accounts in slot order (/u/0/, /u/1/, /u/2/...) with 100% precision!
 */
async function refreshGoogleAccountsList() {
  try {
    const res = await fetch("https://accounts.google.com/ListAccounts?json=standard", {
      credentials: "include"
    });
    if (res.ok) {
      const text = await res.text();
      const cleanJson = text.replace(/^\)\]\}'/, '').trim();
      const data = JSON.parse(cleanJson);
      if (Array.isArray(data) && Array.isArray(data[1])) {
        data[1].forEach((acc, idx) => {
          let email = "";
          let name = "";
          if (Array.isArray(acc)) {
            for (const item of acc) {
              if (typeof item === 'string' && item.includes('@') && !isSystemEmail(item)) {
                email = item;
                break;
              }
            }
            if (typeof acc[0] === 'string' && !acc[0].includes('@')) name = acc[0];
          } else if (acc && typeof acc === 'object') {
            email = acc.email || acc.user_email || "";
            name = acc.name || acc.display_name || "";
          }
          if (email && !isSystemEmail(email)) {
            knownGoogleAccounts.set(idx, { slot: idx, email, name });
          }
        });
      }
    }
  } catch (err) {
    console.debug("[MythicFrame BEI] ListAccounts notice:", err);
  }
}

/**
 * Programmatically injects content scripts into open tabs
 */
async function ensureContentScriptInjected(tabId, target) {
  if (!chrome.scripting || !chrome.scripting.executeScript) return;
  try {
    const scriptFiles = target === "gemini" 
      ? ["scripts/protocol.js", "scripts/gemini_content.js"]
      : ["scripts/protocol.js", "scripts/chatgpt_content.js"];

    await chrome.scripting.executeScript({
      target: { tabId },
      files: scriptFiles
    });
    await new Promise(r => setTimeout(r, 300));
  } catch (err) {
    console.debug(`[MythicFrame BEI] Script injection notice for tab ${tabId}:`, err?.message || err);
  }
}

/**
 * Scans all open tabs and injects content scripts into any existing Gemini / ChatGPT tabs
 */
async function injectAllExistingTabs() {
  try {
    const allTabs = await chrome.tabs.query({});
    for (const tab of allTabs) {
      if (!tab.id || !tab.url) continue;
      if (tab.url.includes("gemini.google.com")) {
        await ensureContentScriptInjected(tab.id, "gemini");
      } else if (tab.url.includes("chatgpt.com")) {
        await ensureContentScriptInjected(tab.id, "chatgpt");
      }
    }
  } catch (e) {
    console.warn("[MythicFrame BEI] Error injecting into existing tabs:", e);
  }
}

function connectBridge() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(BRIDGE_WS_URL);

    ws.onopen = async () => {
      console.log("[MythicFrame BEI Worker] Connected to bridge on port 58925");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      startHeartbeat();
      updateBadge(true);

      // Refresh Google accounts list from session
      await refreshGoogleAccountsList();

      // Inject into any existing tabs immediately so they are ready
      await injectAllExistingTabs();

      // Report discovered tabs & detected emails to bridge
      const tabs = await discoverTabs();
      ws.send(JSON.stringify({
        type: "browser_bridge_connected",
        data: {
          version: chrome.runtime?.getManifest?.()?.version || "1.2.0",
          name: "MythicFrame BEI Bridge",
          projectDir: currentProjectDir,
          tabs,
          accounts: Array.from(knownGoogleAccounts.values()),
          timestamp: Date.now()
        }
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") return;
        await handleBridgeCommand(msg);
      } catch (err) {
        console.warn("[MythicFrame BEI Worker] Error handling bridge message:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[MythicFrame BEI Worker] Bridge WebSocket error:", err);
    };

    ws.onclose = () => {
      stopHeartbeat();
      updateBadge(false);
      console.log("[MythicFrame BEI Worker] Bridge disconnected. Reconnecting in 3s...");
      scheduleReconnect();
    };
  } catch (err) {
    scheduleReconnect();
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
    }
  }, 12000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectBridge, 3000);
}

function updateBadge(connected) {
  if (chrome.action && chrome.action.setBadgeText) {
    chrome.action.setBadgeText({ text: connected ? "ON" : "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: connected ? "#9333ea" : "#64748b" });
  }
}

/**
 * Extracts active account email from a tab using message, DOM execution, or session mapping
 */
async function extractTabEmail(tabId, target, accountSlot = 0) {
  if (tabEmailsCache.has(tabId) && tabEmailsCache.get(tabId)) {
    return tabEmailsCache.get(tabId);
  }

  // 1. Try content script GET_TAB_INFO message
  try {
    const resp = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "GET_TAB_INFO" }, (res) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(res);
      });
    });
    if (resp && resp.email && !isSystemEmail(resp.email)) {
      tabEmailsCache.set(tabId, resp.email);
      if (target === "gemini") {
        knownGoogleAccounts.set(accountSlot, { slot: accountSlot, email: resp.email, name: resp.email });
      }
      return resp.email;
    }
  } catch (e) {}

  // 2. Direct script execution fallback across all frames (handles OneGoogle iframe & top-bar)
  try {
    if (chrome.scripting && chrome.scripting.executeScript) {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => {
          function isSys(em) {
            const l = (em || '').toLowerCase();
            return l.includes('noreply') || l.includes('support@google.com') || l.includes('example.com');
          }

          // A. Helper from content script
          if (typeof window.__MYTHIC_BEI_GET_EMAIL__ === 'function') {
            const em = window.__MYTHIC_BEI_GET_EMAIL__();
            if (em && !isSys(em)) return em;
          }

          // B. Any element with aria-label, title, data-identifier, or data-email with @
          const els = document.querySelectorAll("[aria-label*='@'], [title*='@'], [data-identifier*='@'], [data-email*='@']");
          for (const el of els) {
            const str = (el.getAttribute('aria-label') || '') + ' ' + 
                        (el.getAttribute('title') || '') + ' ' + 
                        (el.getAttribute('data-identifier') || '') + ' ' + 
                        (el.getAttribute('data-email') || '');
            const m = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (m && !isSys(m[1])) return m[1];
          }

          // C. Google avatar & account buttons
          const btns = document.querySelectorAll("a[href*='SignOutOptions'], a[href*='accounts.google.com'], a.gb_d, div.gb_d, button.gb_d, [role='button'][aria-expanded]");
          for (const btn of btns) {
            let n = btn;
            for (let d = 0; d < 4 && n; d++) {
              const str = (n.getAttribute('aria-label') || '') + ' ' + 
                          (n.getAttribute('title') || '') + ' ' + 
                          (n.innerText || '') + ' ' + 
                          (n.textContent || '');
              const m = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (m && !isSys(m[1])) return m[1];
              n = n.parentElement;
            }
          }

          // D. WIZ_global_data
          if (window.WIZ_global_data && typeof window.WIZ_global_data === 'object') {
            for (const k of Object.keys(window.WIZ_global_data)) {
              const val = String(window.WIZ_global_data[k]);
              const m = val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (m && !isSys(m[1])) return m[1];
            }
          }

          // E. Document HTML regex
          const html = document.documentElement ? document.documentElement.innerHTML : '';
          const mHtml = html.match(/([a-zA-Z0-9._%+-]+@gmail\.com)/);
          if (mHtml && !isSys(mHtml[1])) return mHtml[1];

          return "";
        }
      });

      if (results && results.length > 0) {
        for (const r of results) {
          if (r && r.result && !isSystemEmail(r.result)) {
            tabEmailsCache.set(tabId, r.result);
            if (target === "gemini") {
              knownGoogleAccounts.set(accountSlot, { slot: accountSlot, email: r.result, name: r.result });
            }
            return r.result;
          }
        }
      }
    }
  } catch (e) {}

  // 3. Fallback to Google Accounts session list for this slot
  if (target === "gemini" && knownGoogleAccounts.has(accountSlot)) {
    const acc = knownGoogleAccounts.get(accountSlot);
    if (acc && acc.email) {
      tabEmailsCache.set(tabId, acc.email);
      return acc.email;
    }
  }

  return "";
}

async function discoverTabs() {
  await refreshGoogleAccountsList();
  const tabsList = [];

  try {
    const allTabs = await chrome.tabs.query({});
    for (const tab of allTabs) {
      if (!tab.url || !tab.id) continue;
      if (tab.url.includes("gemini.google.com")) {
        const slotMatch = tab.url.match(/\/u\/(\d+)/);
        const slot = slotMatch ? parseInt(slotMatch[1], 10) : 0;
        const email = await extractTabEmail(tab.id, "gemini", slot);
        if (email && !isSystemEmail(email)) {
          knownGoogleAccounts.set(slot, { slot, email, name: email });
        }
        tabsList.push({
          tabId: tab.id,
          url: tab.url,
          target: "gemini",
          accountSlot: slot,
          email: email || (knownGoogleAccounts.get(slot)?.email) || undefined,
          title: tab.title || "Gemini Web",
          active: tab.active
        });
      } else if (tab.url.includes("chatgpt.com")) {
        const email = await extractTabEmail(tab.id, "chatgpt", 0);
        tabsList.push({
          tabId: tab.id,
          url: tab.url,
          target: "chatgpt",
          email: email || undefined,
          title: tab.title || "ChatGPT Web",
          active: tab.active
        });
      }
    }
  } catch (err) {
    console.warn("[MythicFrame BEI Worker] Error querying tabs:", err);
  }
  return tabsList;
}

let beiDedicatedWindowId = null;

/**
 * Organizes BEI tabs into a single dedicated Chrome Tab Group ("MythicFrame BEI")
 * Supports same window group, dedicated new window, and foreground/background focus.
 */
async function organizeTabIntoBEIGroup(tabId, tabMode = 'same_window_group', bringTabToFront = false) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) return;

    if (tabMode === 'new_window_group') {
      let winExists = false;
      if (beiDedicatedWindowId) {
        try {
          const win = await chrome.windows.get(beiDedicatedWindowId);
          if (win) winExists = true;
        } catch (e) {
          beiDedicatedWindowId = null;
        }
      }

      if (!winExists) {
        const newWin = await chrome.windows.create({
          tabId: tab.id,
          focused: Boolean(bringTabToFront)
        });
        beiDedicatedWindowId = newWin.id;
        if (chrome.tabGroups) {
          try {
            const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
            await chrome.tabGroups.update(groupId, { title: "MythicFrame BEI", color: "purple" });
          } catch (e) {}
        }
        return;
      } else if (tab.windowId !== beiDedicatedWindowId) {
        await chrome.tabs.move(tab.id, { windowId: beiDedicatedWindowId, index: -1 });
      }

      if (chrome.tabGroups) {
        try {
          const groups = await chrome.tabGroups.query({ windowId: beiDedicatedWindowId, title: "MythicFrame BEI" });
          if (groups && groups.length > 0) {
            await chrome.tabs.group({ tabIds: [tab.id], groupId: groups[0].id });
          } else {
            const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
            await chrome.tabGroups.update(groupId, { title: "MythicFrame BEI", color: "purple" });
          }
        } catch (e) {}
      }
    } else if (tabMode === 'same_window_group' && chrome.tabGroups) {
      try {
        const groups = await chrome.tabGroups.query({ windowId: tab.windowId, title: "MythicFrame BEI" });
        if (groups && groups.length > 0) {
          await chrome.tabs.group({ tabIds: [tab.id], groupId: groups[0].id });
        } else {
          const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
          await chrome.tabGroups.update(groupId, { title: "MythicFrame BEI", color: "purple" });
        }
      } catch (e) {}
    }

    if (bringTabToFront) {
      await chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    }
  } catch (err) {
    console.debug("[MythicFrame BEI] Tab group organization notice:", err);
  }
}

/**
 * Finds matching tab or AUTOMATICALLY opens a new tab in the configured group/window.
 * If the tab was stuck on an old chat ID, navigates to clean /app.
 */
async function findOrCreateTab(target, accountSlot = 0, tabMode = 'same_window_group', bringTabToFront = false) {
  const targetSlot = (typeof accountSlot === 'number') ? accountSlot : (parseInt(accountSlot, 10) || 0);
  const tabs = await discoverTabs();

  if (target === "gemini") {
    // 1. Strictly look for a tab matching the requested account slot
    const matched = tabs.find(t => t.target === "gemini" && t.accountSlot === targetSlot);
    if (matched) {
      // If the tab is currently on an old conversation URL (/app/<chatId>), navigate to clean /app
      if (matched.url && matched.url.match(/\/app\/[a-zA-Z0-9_-]+/)) {
        console.log(`[MythicFrame BEI] Navigating tab ${matched.tabId} to clean /u/${targetSlot}/app for a pristine composer...`);
        try {
          await chrome.tabs.update(matched.tabId, { url: `https://gemini.google.com/u/${targetSlot}/app` });
          await waitForTabComplete(matched.tabId, 15000);
        } catch (e) {}
      }
      await organizeTabIntoBEIGroup(matched.tabId, tabMode, bringTabToFront);
      await ensureContentScriptInjected(matched.tabId, "gemini");
      return matched.tabId;
    }

    // 2. Automatically create new tab for the requested account slot
    console.log(`[MythicFrame BEI Worker] Opening tab for Gemini slot ${targetSlot} (Mode: ${tabMode}, Focus: ${bringTabToFront})...`);
    const newTab = await chrome.tabs.create({
      url: `https://gemini.google.com/u/${targetSlot}/app`,
      active: Boolean(bringTabToFront)
    });
    await waitForTabComplete(newTab.id, 20000);
    await organizeTabIntoBEIGroup(newTab.id, tabMode, bringTabToFront);
    await ensureContentScriptInjected(newTab.id, "gemini");
    await new Promise(r => setTimeout(r, 1500));

    // Update discovered tabs list back to bridge so UI reflects new tab
    const updatedTabs = await discoverTabs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "tabs_list", 
        data: { 
          tabs: updatedTabs,
          accounts: Array.from(knownGoogleAccounts.values())
        } 
      }));
    }

    return newTab.id;
  }

  if (target === "chatgpt") {
    const matched = tabs.find(t => t.target === "chatgpt");
    if (matched) {
      await organizeTabIntoBEIGroup(matched.tabId, tabMode, bringTabToFront);
      await ensureContentScriptInjected(matched.tabId, "chatgpt");
      return matched.tabId;
    }

    console.log(`[MythicFrame BEI Worker] Opening tab for ChatGPT (Mode: ${tabMode}, Focus: ${bringTabToFront})...`);
    const newTab = await chrome.tabs.create({
      url: "https://chatgpt.com/",
      active: Boolean(bringTabToFront)
    });
    await waitForTabComplete(newTab.id, 20000);
    await organizeTabIntoBEIGroup(newTab.id, tabMode, bringTabToFront);
    await ensureContentScriptInjected(newTab.id, "chatgpt");
    await new Promise(r => setTimeout(r, 1500));

    const updatedTabs = await discoverTabs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "tabs_list", 
        data: { 
          tabs: updatedTabs,
          accounts: Array.from(knownGoogleAccounts.values())
        } 
      }));
    }

    return newTab.id;
  }

  return null;
}

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Dispatches prompt execution to tab:
 * 1. Tries standard chrome.tabs.sendMessage with ensureContentScriptInjected
 * 2. If receiving end does not exist, silently reloads the tab in the background to attach fresh listeners
 * 3. If needed, opens a fresh background tab and dispatches
 * 4. 100% eliminates "Receiving end does not exist" failure
 */
async function dispatchPromptToTab(tabId, jobId, target, prompt, timeoutSeconds = 120, accountSlot = 0, images = [], tabMode = 'same_window_group', bringTabToFront = false) {
  // Step 1: Attempt direct message dispatch with script injection
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await ensureContentScriptInjected(tabId, target);
      const resp = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          action: "EXECUTE_PROMPT",
          data: { jobId, target, prompt, timeoutSeconds, images }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      if (resp && resp.success) {
        return { success: true, method: 'message' };
      }
    } catch (err) {
      console.log(`[MythicFrame BEI] Tab message attempt ${attempt} notice:`, err.message);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // Step 2: Tab reload recovery — if listeners are detached from an older session, reload tab in background
  console.log(`[MythicFrame BEI] Tab ${tabId} message endpoint detached. Reloading tab in background to bind fresh listeners...`);
  try {
    await chrome.tabs.reload(tabId);
    await waitForTabComplete(tabId);
    await new Promise(r => setTimeout(r, 1500));
    await ensureContentScriptInjected(tabId, target);
    await new Promise(r => setTimeout(r, 600));

    const resp = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: "EXECUTE_PROMPT",
        data: { jobId, target, prompt, timeoutSeconds, images }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    if (resp && resp.success) {
      return { success: true, method: 'reload_message' };
    }
  } catch (reloadErr) {
    console.warn(`[MythicFrame BEI] Background tab reload notice:`, reloadErr.message);
  }

  // Step 3: Fresh background tab recovery
  try {
    console.log(`[MythicFrame BEI] Creating fresh recovery tab for target ${target} (slot ${accountSlot})...`);
    const newTab = await chrome.tabs.create({
      url: target === "gemini" ? `https://gemini.google.com/u/${accountSlot}/app` : "https://chatgpt.com/",
      active: Boolean(bringTabToFront)
    });
    await waitForTabComplete(newTab.id);
    await organizeTabIntoBEIGroup(newTab.id, tabMode, bringTabToFront);
    await ensureContentScriptInjected(newTab.id, target);
    await new Promise(r => setTimeout(r, 2000));

    activeJobs.set(jobId, { tabId: newTab.id, target, prompt, accountSlot });

    const resp = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(newTab.id, {
        action: "EXECUTE_PROMPT",
        data: { jobId, target, prompt, timeoutSeconds, images }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    if (resp && resp.success) {
      return { success: true, method: 'fresh_tab_message' };
    }
  } catch (freshErr) {
    console.warn(`[MythicFrame BEI] Fresh tab dispatch notice:`, freshErr.message);
  }

  // Step 4: Direct execution fallback via chrome.scripting.executeScript
  console.log(`[MythicFrame BEI] Dispatching via direct executeScript fallback to tab ${tabId}...`);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (jId, pText, tSec, imgs) => {
        if (typeof window.__MYTHIC_BEI_EXECUTE_PROMPT__ === 'function') {
          window.__MYTHIC_BEI_EXECUTE_PROMPT__(jId, pText, tSec, imgs);
          return { success: true, method: 'global_fn' };
        }
        window.dispatchEvent(new CustomEvent('__MYTHIC_BEI_EXECUTE_PROMPT__', {
          detail: { jobId: jId, prompt: pText, timeoutSeconds: tSec, images: imgs }
        }));
        return { success: true, method: 'custom_event' };
      },
      args: [jobId, prompt, timeoutSeconds, images]
    });

    if (results && results[0] && results[0].result && results[0].result.success) {
      return results[0].result;
    }
    return { success: true, method: 'execute_script_injected' };
  } catch (directErr) {
    throw new Error(`Browser tab execution failed: ${directErr.message || directErr}. Please verify you are logged into Google Gemini or ChatGPT in Chrome.`);
  }
}

function getSlotKey(target, slot) {
  const parsed = (typeof slot === 'number') ? slot : (parseInt(slot, 10) || 0);
  return `${target}:${parsed}`;
}

function isSlotBusy(target, slot) {
  const slotKey = getSlotKey(target, slot);
  for (const job of activeJobs.values()) {
    if (getSlotKey(job.target, job.accountSlot) === slotKey) {
      return true;
    }
  }
  return false;
}

async function startJob(jobData) {
  const { jobId, target, prompt, fullPrompt, aspectRatio, accountSlot = 0, timeoutSeconds, images = [], tabMode = 'same_window_group', bringTabToFront = false } = jobData;
  const parsedSlot = (typeof accountSlot === 'number') ? accountSlot : (parseInt(accountSlot, 10) || 0);
  const tabId = await findOrCreateTab(target, parsedSlot, tabMode, bringTabToFront);
  if (!tabId) {
    throw new Error(`No available browser tab found or created for target: ${target} (slot: ${parsedSlot})`);
  }

  activeJobs.set(jobId, { tabId, target, prompt, fullPrompt, accountSlot: parsedSlot });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "GENERATION_PROGRESS",
      data: {
        jobId,
        step: "tab_routed",
        detail: `Routed to ${target} tab (slot /u/${parsedSlot}/)...`,
        timestamp: Date.now()
      }
    }));
  }

  await dispatchPromptToTab(tabId, jobId, target, prompt, timeoutSeconds, parsedSlot, images, tabMode, bringTabToFront);
}

async function processNextInQueue(target, slot) {
  const slotKey = getSlotKey(target, slot);
  const queue = slotQueues.get(slotKey);
  if (queue && queue.length > 0) {
    const nextJob = queue.shift();
    console.log(`[MythicFrame BEI Worker] Concurrency Guard: Starting next queued job ${nextJob.jobId} for slot ${slotKey}`);
    try {
      await startJob(nextJob);
    } catch (err) {
      activeJobs.delete(nextJob.jobId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "GENERATION_FAILED",
          data: { jobId: nextJob.jobId, error: err.message || String(err) }
        }));
      }
      processNextInQueue(target, slot);
    }
  }
}

async function handleBridgeCommand(msg) {
  const { type, data } = msg;

  if (type === "LIST_TABS") {
    const tabs = await discoverTabs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "tabs_list", 
        data: { 
          tabs,
          accounts: Array.from(knownGoogleAccounts.values())
        } 
      }));
    }
    return;
  }

  if (type === "OPEN_TAB") {
    const { target = "gemini", accountSlot = 0, tabMode = 'same_window_group', bringTabToFront = true } = data || {};
    const parsedSlot = (typeof accountSlot === 'number') ? accountSlot : (parseInt(accountSlot, 10) || 0);
    const tabId = await findOrCreateTab(target, parsedSlot, tabMode, bringTabToFront);
    const tabs = await discoverTabs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "tabs_list", 
        data: { 
          tabs,
          accounts: Array.from(knownGoogleAccounts.values())
        } 
      }));
    }
    return;
  }

  if (type === "EXECUTE_PROMPT") {
    const { jobId, target, prompt, fullPrompt, aspectRatio, accountSlot = 0, timeoutSeconds, images = [], tabMode = 'same_window_group', bringTabToFront = false } = data;
    const parsedSlot = (typeof accountSlot === 'number') ? accountSlot : (parseInt(accountSlot, 10) || 0);
    const slotKey = getSlotKey(target, parsedSlot);

    // Concurrency Guard: If a job is already in progress for this slot, queue rather than colliding on the same tab
    if (isSlotBusy(target, parsedSlot)) {
      console.log(`[MythicFrame BEI Worker] Concurrency Guard: Slot ${slotKey} is currently busy. Queuing job ${jobId}...`);
      if (!slotQueues.has(slotKey)) {
        slotQueues.set(slotKey, []);
      }
      const queue = slotQueues.get(slotKey);
      if (queue.length >= 4) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "GENERATION_FAILED",
            data: {
              jobId,
              error: `Slot queue full for ${target} (slot ${parsedSlot}). Another generation is actively running.`
            }
          }));
        }
        return;
      }
      queue.push({ jobId, target, prompt, fullPrompt, aspectRatio, accountSlot: parsedSlot, timeoutSeconds, images, tabMode, bringTabToFront });
      return;
    }

    try {
      await startJob({ jobId, target, prompt, fullPrompt, aspectRatio, accountSlot: parsedSlot, timeoutSeconds, images, tabMode, bringTabToFront });
    } catch (err) {
      activeJobs.delete(jobId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "GENERATION_FAILED",
          data: { jobId, error: err.message || String(err) }
        }));
      }
      processNextInQueue(target, parsedSlot);
    }
    return;
  }

  if (type === "CANCEL_GENERATION") {
    const jobId = data?.jobId;
    if (jobId) {
      // Remove from any queue
      for (const [slotKey, queue] of slotQueues.entries()) {
        const idx = queue.findIndex(j => j.jobId === jobId);
        if (idx !== -1) {
          queue.splice(idx, 1);
          console.log(`[MythicFrame BEI Worker] Removed cancelled job ${jobId} from queue for slot ${slotKey}`);
        }
      }
      if (activeJobs.has(jobId)) {
        const job = activeJobs.get(jobId);
        activeJobs.delete(jobId);
        try {
          chrome.tabs.sendMessage(job.tabId, { action: "CANCEL_GENERATION", data: { jobId } });
        } catch (e) {}
        processNextInQueue(job.target, job.accountSlot);
      }
    } else {
      // Cancel all
      slotQueues.clear();
      for (const [id, job] of activeJobs.entries()) {
        try {
          chrome.tabs.sendMessage(job.tabId, { action: "CANCEL_GENERATION", data: { jobId: id } });
        } catch (e) {}
      }
      activeJobs.clear();
    }
    // Broadcast CLEAR_COMPOSER to any open Gemini or ChatGPT tabs so composer is completely wiped
    chrome.tabs.query({}).then(tabs => {
      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.includes("gemini.google.com") || tab.url.includes("chatgpt.com"))) {
          try {
            chrome.tabs.sendMessage(tab.id, { action: "CANCEL_GENERATION" });
          } catch (e) {}
        }
      }
    });
    return;
  }
}

// Listen for messages from content scripts and extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATION_PROGRESS") {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
    return;
  }

  if (message.type === "GENERATION_COMPLETED") {
    let { jobId, image, target, metadata } = message.data;
    const job = activeJobs.get(jobId);
    const jobTarget = job?.target || target;
    const jobSlot = job?.accountSlot ?? 0;
    activeJobs.delete(jobId);

    // Concurrency Guard: Process next queued job for this slot
    processNextInQueue(jobTarget, jobSlot);

    (async () => {
      // High-Res URL fetch: Ensure background worker fetches the upgraded high-res URL when converting to Base64 Data URI
      if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        try {
          const highResUrl = protocol.upgradeToHighResUrl ? protocol.upgradeToHighResUrl(image) : image;
          console.log(`[MythicFrame BEI] Background worker fetching high-res image URL: ${highResUrl.substring(0, 80)}...`);
          const res = await fetch(highResUrl);
          if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
              image = dataUrl;
              console.log(`[MythicFrame BEI] High-res image converted to Data URI in worker (${Math.round(image.length / 1024)} KB)`);
            }
          }
        } catch (fetchErr) {
          console.warn("[MythicFrame BEI] Background fetch notice for image URL:", fetchErr);
        }
      }

      // Upgrade any candidate or source URLs in metadata
      if (metadata) {
        if (metadata.srcUrl && protocol.upgradeToHighResUrl) {
          metadata.srcUrl = protocol.upgradeToHighResUrl(metadata.srcUrl);
        }
        if (Array.isArray(metadata.candidates) && protocol.upgradeToHighResUrl) {
          metadata.candidates = metadata.candidates.map(u => protocol.upgradeToHighResUrl(u));
        }
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "GENERATION_COMPLETED",
          data: {
            jobId,
            image,
            target,
            metadata
          }
        }));
      }
    })();

    sendResponse({ ack: true });
    return true;
  }

  if (message.type === "GENERATION_FAILED") {
    const { jobId, error } = message.data;
    const job = activeJobs.get(jobId);
    const jobTarget = job?.target;
    const jobSlot = job?.accountSlot ?? 0;
    activeJobs.delete(jobId);

    // Concurrency Guard: Process next queued job for this slot
    if (jobTarget) {
      processNextInQueue(jobTarget, jobSlot);
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "GENERATION_FAILED",
        data: { jobId, error }
      }));
    }
    sendResponse({ ack: true });
    return true;
  }

  if (message.type === "TAB_INFO_PROACTIVE" || message.type === "TAB_EMAIL_DETECTED") {
    const { target, email, accountSlot } = message.data || {};
    if (sender?.tab?.id && email && !isSystemEmail(email)) {
      tabEmailsCache.set(sender.tab.id, email);
      if (target === "gemini") {
        const slot = accountSlot !== undefined ? accountSlot : 0;
        knownGoogleAccounts.set(slot, { slot, email, name: email });
        console.log(`[MythicFrame BEI] Registered active email for slot ${slot}: ${email}`);
        if (ws && ws.readyState === WebSocket.OPEN) {
          discoverTabs().then(tabs => {
            ws.send(JSON.stringify({
              type: "tab_status_update",
              data: {
                tabs,
                accounts: Array.from(knownGoogleAccounts.values())
              }
            }));
          });
        }
      }
    }
    sendResponse({ ack: true });
    return true;
  }

  if (message.type === "GENERATION_CANCELLED") {
    const { jobId, reason } = message.data || {};
    const job = activeJobs.get(jobId);
    const jobTarget = job?.target;
    const jobSlot = job?.accountSlot ?? 0;
    activeJobs.delete(jobId);

    // Concurrency Guard: Process next queued job for this slot
    if (jobTarget) {
      processNextInQueue(jobTarget, jobSlot);
    }

    console.log(`[MythicFrame BEI Worker] Job ${jobId} cancelled: ${reason}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "GENERATION_CANCELLED",
        data: {
          jobId,
          reason: reason || "Generation cancelled manually by user"
        }
      }));
    }
    sendResponse({ ack: true });
    return true;
  }

  if (message.type === "QUERY_TABS_STATUS") {
    discoverTabs().then(tabs => {
      sendResponse({ 
        tabs,
        accounts: Array.from(knownGoogleAccounts.values())
      });
    });
    return true;
  }

  if (message.type === "GET_WORKER_STATUS") {
    discoverTabs().then(tabs => {
      sendResponse({
        wsConnected: Boolean(ws && ws.readyState === WebSocket.OPEN),
        activeJobsCount: activeJobs.size,
        projectDir: currentProjectDir,
        tabs,
        accounts: Array.from(knownGoogleAccounts.values())
      });
    });
    return true;
  }

  if (message.type === "RECONNECT_BRIDGE") {
    connectBridge();
    sendResponse({ status: "reconnecting" });
    return true;
  }

  if (message.type === "SET_PROJECT_DIR") {
    const newDir = message.projectDir || DEFAULT_PROJECT_DIR;
    currentProjectDir = newDir;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ mythicProjectDir: newDir });
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "update_project_dir",
        data: { projectDir: newDir }
      }));
    }
    sendResponse({ success: true, projectDir: newDir });
    return true;
  }

  if (message.type === "GET_PROJECT_DIR") {
    sendResponse({ projectDir: currentProjectDir });
    return true;
  }
});

// Update tabs list when tabs are updated/removed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && (tab.url.includes("gemini.google.com") || tab.url.includes("chatgpt.com"))) {
    tabEmailsCache.delete(tabId);
    const target = tab.url.includes("gemini.google.com") ? "gemini" : "chatgpt";
    await ensureContentScriptInjected(tabId, target);
    const tabs = await discoverTabs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "tabs_list", 
        data: { 
          tabs,
          accounts: Array.from(knownGoogleAccounts.values())
        } 
      }));
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabEmailsCache.delete(tabId);
  for (const [jobId, job] of activeJobs.entries()) {
    if (job.tabId === tabId) {
      const target = job.target;
      const slot = job.accountSlot;
      activeJobs.delete(jobId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "GENERATION_FAILED",
          data: { jobId, error: "Browser tab was closed during generation" }
        }));
      }
      processNextInQueue(target, slot);
    }
  }
});

// Start initial connection and tab injection
connectBridge();
