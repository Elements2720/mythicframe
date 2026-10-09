import { formatDisplayEmail, getIncognitoMode } from './privacyService';
import { BEIConfig, BEITarget } from '../types';
import { UnifiedGenerationParams } from './aiProviderService';
import { assembleFullMythicPrompt } from './promptTemplates';

const BEI_CONFIG_KEY = 'mythic_bei_config';
export const DEFAULT_BEI_PORT = 58925;

export const DEFAULT_BEI_CONFIG: BEIConfig = {
  target: 'gemini',
  accountSlot: 0,
  port: DEFAULT_BEI_PORT,
  timeoutSeconds: 900,
  tabMode: 'same_window_group',
  bringTabToFront: false,
  chatSessionMode: 'temporary_chat',
};

export const getBEIConfig = (): BEIConfig => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(BEI_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_BEI_CONFIG,
          ...parsed,
          port: parsed.port || DEFAULT_BEI_PORT,
        };
      }
    } catch (e) {
      // Fall through to default
    }
  }
  return DEFAULT_BEI_CONFIG;
};

export const setBEIConfig = (config: Partial<BEIConfig>): void => {
  if (typeof window !== 'undefined') {
    const current = getBEIConfig();
    const updated: BEIConfig = { ...current, ...config };
    localStorage.setItem(BEI_CONFIG_KEY, JSON.stringify(updated));
  }
};

export interface BEITabDetail {
  tabId: number;
  url: string;
  target: 'gemini' | 'chatgpt' | 'other';
  accountSlot?: number;
  email?: string;
  title?: string;
  status?: string;
  active?: boolean;
}

export { formatDisplayEmail, getIncognitoMode };

export interface BEIAccountDetail {
  slot: number;
  email: string;
  name?: string;
  tier?: 'free' | 'pro';
  customLimit?: number;
}

export const DEFAULT_KNOWN_ACCOUNTS: BEIAccountDetail[] = [
  { slot: 0, email: '', name: 'Account 1 (Default)', tier: 'pro' },
  { slot: 1, email: '', name: 'Account 2', tier: 'free' },
];

const BEI_ACCOUNTS_KEY = 'mythic_bei_accounts';

export const getSavedBEIAccounts = (): BEIAccountDetail[] => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(BEI_ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Purge dummy example.com emails from previous sessions
          return parsed.map((acc: BEIAccountDetail) => ({
            ...acc,
            email: (acc.email && !acc.email.includes('example.com')) ? acc.email : '',
            name: (acc.name && !acc.name.includes('example.com')) ? acc.name : `Account ${acc.slot + 1}`
          }));
        }
      }
    } catch (e) {}
  }
  return DEFAULT_KNOWN_ACCOUNTS;
};

export const setSavedBEIAccounts = (accounts: BEIAccountDetail[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BEI_ACCOUNTS_KEY, JSON.stringify(accounts));
  }
};

export const setBEIAccountTier = (slot: number, tier: 'free' | 'pro'): void => {
  const accounts = getSavedBEIAccounts();
  const updated = accounts.map(a => a.slot === slot ? { ...a, tier } : a);
  setSavedBEIAccounts(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mythic_bei_accounts_changed', { detail: { slot, tier } }));
    window.dispatchEvent(new Event('storage'));
  }
};

export interface BEIStatusResponse {
  ready: boolean;
  connected: boolean;
  port: number;
  extensionVersion?: string;
  tabs?: BEITabDetail[];
  accounts?: BEIAccountDetail[];
  activeJobsCount?: number;
  projectDir?: string;
  error?: string;
}

export const openBEITab = async (
  target: BEITarget, 
  accountSlot = 0,
  tabMode?: string,
  bringTabToFront?: boolean
): Promise<boolean> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;
  const chosenTabMode = tabMode || config.tabMode || 'same_window_group';
  const chosenBringFront = bringTabToFront !== undefined ? bringTabToFront : Boolean(config.bringTabToFront);
  const urls = [
    `http://127.0.0.1:${port}/api/bei/open-tab`,
    `/api/bei/open-tab`
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target, 
          accountSlot,
          tabMode: chosenTabMode,
          bringTabToFront: chosenBringFront
        }),
      });
      if (resp.ok) {
        return true;
      }
    } catch (e) {}
  }
  return false;
};

export const checkBEIConnection = async (): Promise<BEIStatusResponse> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;

  // Try direct BEI bridge port first, then fallback to same-origin proxy
  const urls = [
    `http://127.0.0.1:${port}/api/bei/status`,
    `/api/bei/status`
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        let accounts = getSavedBEIAccounts();
        let changed = false;

        // Clean any accounts sent from bridge
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          const validBridgeAccounts = data.accounts
            .filter((a: any) => a && typeof a === 'object')
            .map((a: any) => ({
              slot: typeof a.slot === 'number' ? a.slot : 0,
              email: (a.email && !a.email.includes('example.com')) ? a.email : '',
              name: (a.name && !a.name.includes('example.com')) ? a.name : `Account ${(a.slot ?? 0) + 1}`,
              tier: a.tier || 'pro'
            }));
          if (validBridgeAccounts.length > 0) {
            accounts = validBridgeAccounts;
            changed = true;
          }
        }

        // Merge discovered emails directly from open tabs
        if (Array.isArray(data.tabs)) {
          for (const tab of data.tabs) {
            if (tab.email && !tab.email.includes('example.com') && tab.target === 'gemini') {
              const slot = tab.accountSlot ?? 0;
              const idx = accounts.findIndex(a => a.slot === slot);
              if (idx !== -1) {
                if (accounts[idx].email !== tab.email) {
                  accounts[idx] = { ...accounts[idx], email: tab.email, name: tab.email };
                  changed = true;
                }
              } else {
                accounts.push({ slot, email: tab.email, name: tab.email, tier: 'pro' });
                changed = true;
              }
            }
          }
        }

        if (changed) {
          setSavedBEIAccounts(accounts);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mythic_bei_accounts_changed', { detail: accounts }));
          }
        }

        return {
          ready: Boolean(data.connected),
          connected: Boolean(data.connected),
          port: data.port || port,
          extensionVersion: data.extensionVersion,
          tabs: data.tabs || [],
          accounts,
          activeJobsCount: data.activeJobsCount || 0,
          projectDir: data.projectDir,
        };
      }
    } catch (err: any) {
      // Continue to next URL attempt
    }
  }

  return {
    ready: false,
    connected: false,
    port,
    tabs: [],
    accounts: getSavedBEIAccounts(),
    error: 'BEI Bridge or Chrome Extension is unreachable. Ensure server is running and extension is enabled.',
  };
};

export const generateWithBEI = async (
  params: UnifiedGenerationParams
): Promise<{ image: string; metadata: any }> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;

  // Check connection status first
  const status = await checkBEIConnection();
  if (!status.connected) {
    throw new Error(
      `BEI Connection Unavailable: The MythicFrame BEI Extension is not connected to port ${port}. ` +
      `Please ensure the extension is loaded in Chrome (chrome://extensions) and an authenticated ` +
      `${config.target === 'gemini' ? 'Gemini' : 'ChatGPT'} tab is open.`
    );
  }

  // Dynamic Context Assembly: Assembles the full 5-layer MythicFrame prompt:
  // Final Prompt = User Intent + Game Context (Setting/Tone) + Style Snippet + Spatial Constraints + System Rules
  const assembled = assembleFullMythicPrompt({
    ...params,
    aspectRatio: params.aspectRatio,
  });

  // Prepare optimized reference images if provided (Image-to-Image Multi-Modal RAG)
  let processedImages: Array<{ url: string; roleNote?: string }> = [];
  if (params.referenceAssets && params.referenceAssets.length > 0) {
    try {
      const { optimizeBase64Image } = await import('../utils/imageUtils');
      processedImages = await Promise.all(
        params.referenceAssets.map(async (ref) => {
          try {
            // Preserves transparent PNG/WebP cutout references
            const opt = await optimizeBase64Image(ref.url, 1024, 0.8);
            return { url: opt, roleNote: ref.roleNote };
          } catch {
            return { url: ref.url, roleNote: ref.roleNote };
          }
        })
      );
    } catch {
      processedImages = params.referenceAssets.map(ref => ({ url: ref.url, roleNote: ref.roleNote }));
    }
  }

  // Reference count limit: Gemini Web cannot handle more than 4-5 images reliably
  if (processedImages.length > 4) {
    console.warn(`[MythicFrame BEI] Limiting reference images from ${processedImages.length} to top 4 for web interface stability.`);
    processedImages = processedImages.slice(0, 4);
  }

  const chatSessionMode = params.chatSessionMode || (params.hasHoldingImages ? 'same_chat' : (config.chatSessionMode || 'temporary_chat'));

  const payload = {
    target: config.target,
    prompt: assembled.imagePromptDirective,
    fullPrompt: assembled.fullPrompt,
    aspectRatio: params.aspectRatio || '16:9',
    accountSlot: config.accountSlot || 0,
    timeoutSeconds: Math.max(config.timeoutSeconds || 900, 900),
    tabMode: config.tabMode || 'same_window_group',
    bringTabToFront: Boolean(config.bringTabToFront),
    chatSessionMode,
    tabSessionId: params.tabSessionId,
    images: processedImages,
  };

  if (params.signal) {
    if (params.signal.aborted) {
      cancelBEIGeneration().catch(() => {});
      throw new DOMException('Generation aborted', 'AbortError');
    }
    params.signal.addEventListener('abort', () => {
      cancelBEIGeneration().catch(() => {});
    });
  }

  const directUrl = `http://127.0.0.1:${port}/api/bei/generate`;
  const fallbackUrl = `/api/bei/generate`;

  let response: Response | null = null;
  let lastError: any = null;

  try {
    response = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: params.signal,
    });
  } catch (err: any) {
    if (params.signal?.aborted || err?.name === 'AbortError') {
      cancelBEIGeneration().catch(() => {});
      throw err;
    }
    lastError = err;
    try {
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: params.signal,
      });
    } catch (fallbackErr: any) {
      if (params.signal?.aborted || fallbackErr?.name === 'AbortError') {
        cancelBEIGeneration().catch(() => {});
        throw fallbackErr;
      }
      lastError = fallbackErr;
    }
  }

  if (!response) {
    throw new Error(`BEI Request failed: ${lastError?.message || 'Network error connecting to bridge'}`);
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson.message || errorJson.error || `HTTP ${response.status}: ${response.statusText}`;
    const isCancelled = /cancel|abort|stopped/i.test(message) || response.status === 499;
    if (!isCancelled) {
      const { recordBEISlotUsage } = await import('./quotaTrackerService');
      const isRateLimit = /limit|quota|exceeded|try again/i.test(message);
      recordBEISlotUsage(config.target, config.accountSlot || 0, isRateLimit ? 'rate_limited' : 'error');
      throw new Error(`BEI Generation Failed: ${message}`);
    }
    throw new Error(`Generation cancelled: ${message}`);
  }

  const result = await response.json();
  if (!result || !result.image) {
    throw new Error('BEI Bridge completed but did not return image data.');
  }

  const { recordBEISlotUsage } = await import('./quotaTrackerService');
  recordBEISlotUsage(config.target, config.accountSlot || 0, 'success');

  return {
    image: result.image,
    metadata: {
      fullPrompt: assembled.fullPrompt,
      directivePrompt: assembled.imagePromptDirective,
      provider: 'bei',
      target: config.target,
      accountSlot: config.accountSlot,
      jobId: result.jobId,
    },
  };
};

export const cancelBEIGeneration = async (jobId?: string): Promise<boolean> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;
  const urls = [
    `http://127.0.0.1:${port}/api/bei/cancel`,
    `/api/bei/cancel`
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (resp.ok) return true;
    } catch (e) {}
  }
  return false;
};

export const generateBEIText = async (prompt: string, timeoutSeconds = 60): Promise<string> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;
  const urls = [
    `http://127.0.0.1:${port}/api/bei/text`,
    `/api/bei/text`
  ];

  const payload = {
    prompt,
    target: config.target,
    accountSlot: config.accountSlot || 0,
    timeoutSeconds
  };

  let lastError: any = null;
  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.text) return data.text.trim();
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`BEI text generation failed: ${lastError?.message || 'Bridge unreachable'}`);
};

export const resetBEISession = async (tabSessionId?: string): Promise<boolean> => {
  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;
  const urls = [
    `http://127.0.0.1:${port}/api/bei/reset-session`,
    `/api/bei/reset-session`
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: config.target,
          accountSlot: config.accountSlot || 0,
          tabSessionId
        })
      });
      if (resp.ok) return true;
    } catch (e) {}
  }
  return false;
};

let beiEventSource: EventSource | null = null;
let reconnectTimeout: any = null;

export const initBEIProgressStream = (): void => {
  if (typeof window === 'undefined') return;
  if (beiEventSource && beiEventSource.readyState !== EventSource.CLOSED) return;

  const config = getBEIConfig();
  const port = config.port || DEFAULT_BEI_PORT;
  const urls = [
    `http://127.0.0.1:${port}/api/bei/events`,
    `/api/bei/events`
  ];

  const tryConnect = (idx: number) => {
    if (idx >= urls.length) {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => tryConnect(0), 5000);
      return;
    }

    try {
      const es = new EventSource(urls[idx]);
      beiEventSource = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.step && data.detail) {
            window.dispatchEvent(new CustomEvent('mythic_bei_progress', { detail: data }));
          }
        } catch (e) {}
      };

      es.onerror = () => {
        es.close();
        beiEventSource = null;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => tryConnect(idx + 1), 3000);
      };
    } catch (err) {
      tryConnect(idx + 1);
    }
  };

  tryConnect(0);
};

if (typeof window !== 'undefined') {
  setTimeout(() => initBEIProgressStream(), 1000);
}
