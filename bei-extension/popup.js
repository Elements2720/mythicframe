/**
 * MythicFrame BEI Bridge - Popup Logic
 * Controls localhost launchers, project folder persistence, and account email discovery.
 */

const BRIDGE_PORT = 58925;
const STUDIO_PORT = 3488;
const DEFAULT_PROJECT_DIR = "D:\\GeminiWeb\\mythicframe";

async function checkBridgeStatus() {
  const badge = document.getElementById('statusBadge');
  
  // 1. First probe background worker directly via messaging
  let workerConnected = false;
  try {
    const workerStatus = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_WORKER_STATUS' }, (resp) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(resp);
      });
    });
    if (workerStatus && workerStatus.wsConnected) {
      workerConnected = true;
    }
  } catch (e) {}

  // 2. Also probe HTTP status endpoint
  let httpOk = false;
  const urls = [
    `http://127.0.0.1:${BRIDGE_PORT}/api/bei/status`,
    `http://localhost:${BRIDGE_PORT}/api/bei/status`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        httpOk = true;
        const data = await res.json();
        if (data.connected || workerConnected) {
          badge.textContent = 'Connected';
          badge.className = 'badge badge-connected';
        } else {
          badge.textContent = 'Bridge Up (No Tab)';
          badge.className = 'badge badge-connected';
        }
        return data;
      }
    } catch (e) {}
  }

  if (workerConnected) {
    badge.textContent = 'Connected (WS)';
    badge.className = 'badge badge-connected';
  } else {
    badge.textContent = 'Offline';
    badge.className = 'badge badge-disconnected';
  }
  return null;
}

async function updateTabs() {
  const geminiStatus = document.getElementById('geminiTabStatus');
  const chatgptStatus = document.getElementById('chatgptTabStatus');
  const geminiEmail = document.getElementById('geminiEmail');
  const chatgptEmail = document.getElementById('chatgptEmail');

  chrome.runtime.sendMessage({ type: 'QUERY_TABS_STATUS' }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.tabs) {
      geminiStatus.textContent = 'Scanning...';
      chatgptStatus.textContent = 'Scanning...';
      return;
    }

    const tabs = resp.tabs || [];
    const geminiTab = tabs.find(t => t.target === 'gemini');
    const accounts = resp.accounts || [];

    if (geminiTab) {
      geminiStatus.textContent = 'Active (Ready)';
      geminiStatus.className = 'target-status status-online';
      const email = geminiTab.email || (accounts.find(a => a.slot === (geminiTab.accountSlot || 0))?.email);
      if (email) {
        geminiEmail.textContent = `📧 ${email}`;
        geminiEmail.className = 'account-email font-mono account-detected';
      } else {
        geminiEmail.textContent = `Scanning email...`;
        geminiEmail.className = 'account-email font-mono text-slate-400';
      }
    } else {
      const defaultAcc = accounts[0];
      geminiStatus.textContent = 'Not Open';
      geminiStatus.className = 'target-status status-offline';
      geminiEmail.textContent = defaultAcc?.email ? `📧 ${defaultAcc.email} (Opens on generate)` : 'Auto-opens in background on generate';
      geminiEmail.className = 'account-email font-mono text-slate-400';
    }

    if (chatgptTab) {
      chatgptStatus.textContent = 'Active (Ready)';
      chatgptStatus.className = 'target-status status-online';
      if (chatgptTab.email) {
        chatgptEmail.textContent = `📧 ${chatgptTab.email}`;
        chatgptEmail.className = 'account-email font-mono account-detected';
      } else {
        chatgptEmail.textContent = 'Session Connected';
        chatgptEmail.className = 'account-email font-mono text-slate-300';
      }
    } else {
      chatgptStatus.textContent = 'Not Detected';
      chatgptStatus.className = 'target-status status-offline';
      chatgptEmail.textContent = 'Will auto-open in Chrome on generation';
      chatgptEmail.className = 'account-email font-mono text-slate-500';
    }
  });
}

function loadProjectDirectory() {
  const dirInput = document.getElementById('projectDirInput');
  const saveStatus = document.getElementById('saveStatus');

  chrome.storage.local.get(['mythicProjectDir'], (result) => {
    if (result && result.mythicProjectDir) {
      dirInput.value = result.mythicProjectDir;
    } else {
      dirInput.value = DEFAULT_PROJECT_DIR;
    }
    saveStatus.style.display = 'none';
  });
}

function saveProjectDirectory() {
  const dirInput = document.getElementById('projectDirInput');
  const saveStatus = document.getElementById('saveStatus');
  const path = dirInput.value.trim() || DEFAULT_PROJECT_DIR;

  chrome.storage.local.set({ mythicProjectDir: path }, () => {
    chrome.runtime.sendMessage({ type: 'SET_PROJECT_DIR', projectDir: path });
    saveStatus.textContent = 'Saved!';
    saveStatus.style.display = 'inline-block';
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 2000);
  });
}

function copyProjectDirectory() {
  const dirInput = document.getElementById('projectDirInput');
  navigator.clipboard.writeText(dirInput.value.trim()).then(() => {
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = 'Copied!';
    saveStatus.style.display = 'inline-block';
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjectDirectory();
  checkBridgeStatus();
  updateTabs();

  // Localhost Launchers
  document.getElementById('openStudioBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `http://localhost:${STUDIO_PORT}` });
  });

  document.getElementById('openBridgeBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `http://localhost:${BRIDGE_PORT}/api/bei/status` });
  });

  // Project Folder settings
  document.getElementById('saveProjectDirBtn').addEventListener('click', saveProjectDirectory);
  document.getElementById('copyProjectDirBtn').addEventListener('click', copyProjectDirectory);

  // Tabs management
  document.getElementById('openGeminiBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://gemini.google.com/u/0/app' });
  });

  document.getElementById('openChatgptBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com/' });
  });

  // Reconnect & Refresh
  document.getElementById('reconnectBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RECONNECT_BRIDGE' });
    setTimeout(() => {
      checkBridgeStatus();
      updateTabs();
    }, 800);
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    checkBridgeStatus();
    updateTabs();
  });

  document.getElementById('reloadExtBtn')?.addEventListener('click', () => {
    chrome.runtime.reload();
  });
});
