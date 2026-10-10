import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface BEITabInfo {
  tabId: number;
  url: string;
  target: 'gemini' | 'chatgpt' | 'other';
  accountSlot?: number;
  email?: string;
  title?: string;
  status?: string;
  active?: boolean;
}

export interface BEIAccountInfo {
  slot: number;
  email: string;
  name?: string;
  tier?: 'free' | 'pro';
}

export interface MythicEngineStatus {
  serverRunning: boolean;
  serverUrl: string;
  bridgeRunning: boolean;
  bridgePort: number;
  beiConnected: boolean;
  tabs: BEITabInfo[];
  accounts: BEIAccountInfo[];
  activeJobsCount: number;
  hasGeminiApiKey: boolean;
  availableEngines: ('bei' | 'gemini-api' | 'prompt-only')[];
  summary: string;
}

export interface BEIGenerateOptions {
  prompt: string;
  aspectRatio?: string;
  target?: 'gemini' | 'chatgpt';
  accountSlot?: number;
  images?: string[];
  timeoutSeconds?: number;
  tabMode?: 'current' | 'new';
  bringTabToFront?: boolean;
}

export interface BEIGenerateResult {
  success: boolean;
  filePath: string;
  imageBase64: string;
  jobId: string;
  metadata?: any;
}

const BRIDGE_PORT = 58925;
const WEB_PORT = 3488;
const PROJECT_ROOT = 'd:\\GeminiWeb\\mythicframe';

/**
 * Checks the status of MythicFrame web server and BEI extension bridge.
 */
export async function checkMythicStatus(): Promise<MythicEngineStatus> {
  let bridgeRunning = false;
  let beiConnected = false;
  let tabs: BEITabInfo[] = [];
  let accounts: BEIAccountInfo[] = [];
  let activeJobsCount = 0;
  let serverRunning = false;

  // 1. Probe BEI Bridge port 58925
  try {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/status`, {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      bridgeRunning = true;
      const data: any = await res.json();
      beiConnected = !!data.connected;
      tabs = data.tabs || [];
      accounts = data.accounts || [];
      activeJobsCount = data.activeJobsCount || 0;
    }
  } catch {
    // Bridge offline
  }

  // 2. Probe Web server port 3488
  try {
    const res = await fetch(`http://localhost:${WEB_PORT}/api/bei/status`, {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      serverRunning = true;
    }
  } catch {
    // Server offline
  }

  // 3. Check for Gemini API key in .env or .env.local
  let hasGeminiApiKey = false;
  try {
    const envLocal = path.join(PROJECT_ROOT, '.env.local');
    const envFile = path.join(PROJECT_ROOT, '.env');
    if (fs.existsSync(envLocal)) {
      const txt = fs.readFileSync(envLocal, 'utf8');
      if (/GEMINI_API_KEY=\S+/.test(txt)) hasGeminiApiKey = true;
    }
    if (!hasGeminiApiKey && fs.existsSync(envFile)) {
      const txt = fs.readFileSync(envFile, 'utf8');
      if (/GEMINI_API_KEY=\S+/.test(txt)) hasGeminiApiKey = true;
    }
    if (!hasGeminiApiKey && process.env.GEMINI_API_KEY) {
      hasGeminiApiKey = true;
    }
  } catch {
    // ignore
  }

  const availableEngines: ('bei' | 'gemini-api' | 'prompt-only')[] = ['prompt-only'];
  if (beiConnected && tabs.some(t => t.target === 'gemini' || t.target === 'chatgpt')) {
    availableEngines.unshift('bei');
  }
  if (hasGeminiApiKey) {
    availableEngines.push('gemini-api');
  }

  // Summary message
  const statusParts: string[] = [];
  if (serverRunning || bridgeRunning) {
    statusParts.push(`Server: Running on http://localhost:${WEB_PORT} (Bridge Port ${BRIDGE_PORT})`);
  } else {
    statusParts.push(`Server: OFFLINE (use mythic_launch_server or npm run dev)`);
  }

  if (beiConnected) {
    const activeTab = tabs.find(t => t.target === 'gemini' || t.target === 'chatgpt');
    const accountStr = activeTab?.email ? ` (${activeTab.email})` : '';
    statusParts.push(`BEI Extension: Connected with ${tabs.length} tab(s)${accountStr}`);
  } else {
    statusParts.push(`BEI Extension: Not connected (ensure Chrome extension is installed & Chrome tab open)`);
  }

  if (hasGeminiApiKey) {
    statusParts.push(`Gemini API Key: Configured in environment`);
  } else {
    statusParts.push(`Gemini API Key: Not configured (optional if using BEI)`);
  }

  return {
    serverRunning: serverRunning || bridgeRunning,
    serverUrl: `http://localhost:${WEB_PORT}`,
    bridgeRunning,
    bridgePort: BRIDGE_PORT,
    beiConnected,
    tabs,
    accounts,
    activeJobsCount,
    hasGeminiApiKey,
    availableEngines,
    summary: statusParts.join(' | ')
  };
}

/**
 * Auto-launches MythicFrame web/bridge server if not already running.
 */
export async function launchMythicServer(): Promise<{ success: boolean; message: string }> {
  const current = await checkMythicStatus();
  if (current.serverRunning) {
    return { success: true, message: `MythicFrame server is already running (${current.summary})` };
  }

  try {
    const devServer = spawn("cmd.exe", ["/c", "start", "/MIN", "npm.cmd", "run", "dev"], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: { ...process.env, NODE_ENV: "development" }
    });
    devServer.unref();

    // Poll for up to 8 seconds
    const start = Date.now();
    while (Date.now() - start < 8000) {
      await new Promise(r => setTimeout(r, 1000));
      const checked = await checkMythicStatus();
      if (checked.serverRunning) {
        return {
          success: true,
          message: `Successfully launched MythicFrame server on http://localhost:${WEB_PORT} (Bridge Port: ${BRIDGE_PORT})`
        };
      }
    }

    return {
      success: true,
      message: `Launched server start command; please allow a few seconds for initialization on http://localhost:${WEB_PORT}.`
    };
  } catch (err: any) {
    return { success: false, message: `Failed to launch server: ${err.message}` };
  }
}

/**
 * Focuses or opens a Chrome browser tab for Google Gemini or ChatGPT via BEI.
 */
export async function openBEITab(target: 'gemini' | 'chatgpt' = 'gemini', accountSlot: number = 0): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/open-tab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, accountSlot, bringTabToFront: true })
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Failed to open tab: ${errText}` };
    }
    const data: any = await res.json();
    return { success: true, message: `Opened/focused ${target} tab in Chrome (Account slot ${accountSlot})` };
  } catch (err: any) {
    return { success: false, message: `Could not reach BEI Bridge: ${err.message}` };
  }
}

/**
 * Triggers background scanning of Google account slots /u/0 through /u/3 via BEI.
 */
export async function scanBEIAccounts(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/scan-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Scan request failed: ${errText}` };
    }
    return { success: true, message: `Account auto-detection initiated in Chrome background.` };
  } catch (err: any) {
    return { success: false, message: `Could not reach BEI Bridge: ${err.message}` };
  }
}

/**
 * Dispatches an image generation request directly to the BEI extension bridge.
 */
export async function generateWithBEI(options: BEIGenerateOptions): Promise<BEIGenerateResult> {
  const {
    prompt,
    aspectRatio = '1:1',
    target = 'gemini',
    accountSlot = 0,
    images = [],
    timeoutSeconds = 900,
    tabMode = 'new_window_group',
    bringTabToFront = false
  } = options;

  // Process reference images (convert local file paths to base64 data URIs if necessary)
  const processedImages: string[] = [];
  for (const img of images) {
    if (img.startsWith('data:image/')) {
      processedImages.push(img);
    } else if (fs.existsSync(img)) {
      const ext = path.extname(img).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const b64 = fs.readFileSync(img).toString('base64');
      processedImages.push(`data:${mime};base64,${b64}`);
    }
  }

  const payload = {
    prompt,
    fullPrompt: prompt,
    aspectRatio,
    target,
    accountSlot,
    images: processedImages,
    timeoutSeconds,
    tabMode,
    bringTabToFront
  };

  const response = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `BEI generation failed with status ${response.status}`);
  }

  const result: any = await response.json();
  if (!result.success || !result.image) {
    throw new Error(result.error || 'BEI bridge did not return a valid image.');
  }

  // Save generated image to local disk in outputs/bei
  const outDir = path.join(PROJECT_ROOT, 'outputs', 'bei');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const isPng = result.image.startsWith('data:image/png');
  const extension = isPng ? 'png' : 'jpg';
  const fileName = `bei_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${extension}`;
  const filePath = path.join(outDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return {
    success: true,
    filePath,
    imageBase64: result.image,
    jobId: result.jobId,
    metadata: result.metadata
  };
}
