// Quota & API Usage Tracker Service
import { AIProvider } from '../types';
import { getApiKey } from './geminiService';
import { getOpenAIApiKey } from './openAIService';

export interface QuotaUsageRecord {
  id: string;
  timestamp: number;
  provider: AIProvider;
  model: string;
  status: 'success' | 'rate_limited' | 'error';
  latencyMs?: number;
  estimatedCost: number; // in USD
  promptSnippet?: string;
  errorMessage?: string;
}

export interface QuotaSummary {
  todayRequests: number;
  todaySuccessfulRequests: number;
  todayFailedRequests: number;
  todayRateLimitedRequests: number;
  todayGoogleSuccessfulRequests: number;
  todayGoogleFailedRequests: number;
  todayBeiRequests: number;
  todayCost: number;
  monthRequests: number;
  monthCost: number;
  freeTierRemainingDaily: number;
  freeTierLimitDaily: number;
  recentRpmCount: number;
  freeTierRpmLimit: number;
  customMonthlyBudget: number;
  budgetRemaining: number;
  budgetPercentUsed: number;
  isQuotaExhaustedDetected: boolean;
  lastQuotaErrorMessage?: string;
}

const STORAGE_KEY_RECORDS = 'mythic_quota_usage_records';
const STORAGE_KEY_BUDGET = 'mythic_quota_monthly_budget';

export const estimateModelCost = (provider: AIProvider, model: string): number => {
  if (provider === 'pollinations' || provider === 'offline' || provider === 'opencode' || provider === 'bei') {
    return 0;
  }
  if (provider === 'openai') {
    if (model.includes('dall-e-3')) return 0.040;
    if (model.includes('dall-e-2')) return 0.020;
    return 0.030;
  }
  if (provider === 'google') {
    if (model.includes('pro')) return 0.030;
    if (model.includes('flash')) return 0.002;
    return 0.005;
  }
  return 0;
};

export const getQuotaRecords = (): QuotaUsageRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearQuotaRecords = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
  }
};

export const trackApiCall = (call: Omit<QuotaUsageRecord, 'id' | 'timestamp'>): void => {
  if (typeof window === 'undefined') return;
  try {
    const records = getQuotaRecords();
    const newRecord: QuotaUsageRecord = {
      ...call,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    // Keep last 500 records
    const updated = [newRecord, ...records].slice(0, 500);
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save quota record to localStorage:', err);
  }
};

export const getCustomMonthlyBudget = (): number => {
  if (typeof window === 'undefined') return 10.0;
  const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
  return raw ? parseFloat(raw) || 10.0 : 10.0;
};

export const setCustomMonthlyBudget = (budget: number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_BUDGET, String(Math.max(1, budget)));
  }
};

export const getQuotaSummary = (): QuotaSummary => {
  const records = getQuotaRecords();
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthMs = startOfMonth.getTime();

  const oneMinuteAgoMs = now - 60000;

  let todayRequests = 0;
  let todaySuccessfulRequests = 0;
  let todayFailedRequests = 0;
  let todayRateLimitedRequests = 0;
  let todayGoogleSuccessfulRequests = 0;
  let todayGoogleFailedRequests = 0;
  let todayBeiRequests = 0;
  let todayCost = 0;
  let monthRequests = 0;
  let monthCost = 0;
  let recentRpmCount = 0;
  let isQuotaExhaustedDetected = false;
  let lastQuotaErrorMessage: string | undefined = undefined;

  for (const r of records) {
    if (r.timestamp >= startOfDayMs) {
      todayRequests++;

      if (r.status === 'success') {
        todaySuccessfulRequests++;
        todayCost += r.estimatedCost;
        if (r.provider === 'google') {
          todayGoogleSuccessfulRequests++;
        }
        if (r.provider === 'bei') {
          todayBeiRequests++;
        }
      } else {
        todayFailedRequests++;
        if (r.status === 'rate_limited') {
          todayRateLimitedRequests++;
          isQuotaExhaustedDetected = true;
        }
        if (r.provider === 'google') {
          todayGoogleFailedRequests++;
          const errLower = (r.errorMessage || '').toLowerCase();
          if (errLower.includes('quota') || errLower.includes('resource_exhausted') || errLower.includes('429')) {
            isQuotaExhaustedDetected = true;
          }
        }
        if (!lastQuotaErrorMessage && r.errorMessage) {
          lastQuotaErrorMessage = r.errorMessage;
        }
      }
    }
    if (r.timestamp >= startOfMonthMs && r.status === 'success') {
      monthRequests++;
      monthCost += r.estimatedCost;
    }
    if (r.timestamp >= oneMinuteAgoMs) {
      recentRpmCount++;
    }
  }

  const freeTierLimitDaily = 1500;
  const freeTierRpmLimit = 15;
  // CRITICAL FIX: Only deduct SUCCESSFUL requests from the local free tier tracker.
  // Failed requests (e.g. $0 balance, network error, 429) do NOT deduct from quota!
  const freeTierRemainingDaily = Math.max(0, freeTierLimitDaily - todayGoogleSuccessfulRequests);

  const customMonthlyBudget = getCustomMonthlyBudget();
  const budgetRemaining = Math.max(0, customMonthlyBudget - monthCost);
  const budgetPercentUsed = Math.min(100, (monthCost / customMonthlyBudget) * 100);

  return {
    todayRequests,
    todaySuccessfulRequests,
    todayFailedRequests,
    todayRateLimitedRequests,
    todayGoogleSuccessfulRequests,
    todayGoogleFailedRequests,
    todayBeiRequests,
    todayCost: parseFloat(todayCost.toFixed(4)),
    monthRequests,
    monthCost: parseFloat(monthCost.toFixed(4)),
    freeTierRemainingDaily,
    freeTierLimitDaily,
    recentRpmCount,
    freeTierRpmLimit,
    customMonthlyBudget,
    budgetRemaining: parseFloat(budgetRemaining.toFixed(4)),
    budgetPercentUsed: parseFloat(budgetPercentUsed.toFixed(1)),
    isQuotaExhaustedDetected,
    lastQuotaErrorMessage
  };
};

export interface QuotaProbeResult {
  status: 'healthy' | 'exhausted' | 'unauthorized' | 'error';
  statusCode?: number;
  message: string;
  latencyMs: number;
  rawDetails?: string;
}

export const probeGeminiQuota = async (): Promise<QuotaProbeResult> => {
  const startTime = performance.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      status: 'unauthorized',
      message: 'No Google Gemini API Key configured in Settings.',
      latencyMs: 0
    };
  }

  try {
    // Probe Gemini API with a lightweight models.get check
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`, {
      method: 'GET'
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      return {
        status: 'healthy',
        statusCode: 200,
        message: 'Google Gemini API is healthy and accepting requests! Quota active.',
        latencyMs
      };
    }

    const errJson = await response.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || response.statusText;

    if (response.status === 429) {
      return {
        status: 'exhausted',
        statusCode: 429,
        message: 'Quota Exhausted / Rate Limited (429 RESOURCE_EXHAUSTED). Rate limit exceeded or free tier daily quota consumed.',
        latencyMs,
        rawDetails: errMsg
      };
    }

    if (response.status === 400 || response.status === 403) {
      return {
        status: 'unauthorized',
        statusCode: response.status,
        message: `Authentication / Permission Error (${response.status}): ${errMsg}`,
        latencyMs,
        rawDetails: errMsg
      };
    }

    return {
      status: 'error',
      statusCode: response.status,
      message: `API Error ${response.status}: ${errMsg}`,
      latencyMs,
      rawDetails: errMsg
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      message: `Network or probe failure: ${err?.message || String(err)}`,
      latencyMs
    };
  }
};

export const probeOpenAIQuota = async (): Promise<QuotaProbeResult> => {
  const startTime = performance.now();
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      status: 'unauthorized',
      message: 'No OpenAI API Key configured in Settings.',
      latencyMs: 0
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      return {
        status: 'healthy',
        statusCode: 200,
        message: 'OpenAI API key is valid and connected!',
        latencyMs
      };
    }

    const errJson = await response.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || response.statusText;

    if (response.status === 429) {
      return {
        status: 'exhausted',
        statusCode: 429,
        message: 'OpenAI Quota Exceeded / Rate Limit Reached (429). Check your billing credits at platform.openai.com.',
        latencyMs,
        rawDetails: errMsg
      };
    }

    return {
      status: 'error',
      statusCode: response.status,
      message: `OpenAI Error (${response.status}): ${errMsg}`,
      latencyMs,
      rawDetails: errMsg
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      message: `OpenAI Network error: ${err?.message || String(err)}`,
      latencyMs
    };
  }
};

export const probeBEIQuota = async (): Promise<QuotaProbeResult> => {
  const startTime = performance.now();
  try {
    const { checkBEIConnection, getBEIConfig } = await import('./beiService');
    const status = await checkBEIConnection();
    const config = getBEIConfig();
    const latencyMs = Math.round(performance.now() - startTime);

    if (status.connected) {
      return {
        status: 'healthy',
        statusCode: 200,
        message: `BEI Bridge active on port ${status.port}! Chrome Extension connected to ${config.target.toUpperCase()} (Account Slot /u/${config.accountSlot}/). Unlimited free browser sessions ready.`,
        latencyMs,
        rawDetails: JSON.stringify(status, null, 2)
      };
    } else if (status.port) {
      return {
        status: 'exhausted',
        statusCode: 200,
        message: `BEI Bridge is listening on port ${status.port}, but Chrome Extension is not connected yet. Enable the extension in Chrome and open a Gemini/ChatGPT tab.`,
        latencyMs,
        rawDetails: JSON.stringify(status, null, 2)
      };
    } else {
      return {
        status: 'error',
        message: 'BEI Bridge server is not responding on port 58925. Ensure MythicFrame backend is running.',
        latencyMs
      };
    }
  } catch (err: any) {
    return {
      status: 'error',
      message: `BEI Probe error: ${err?.message || String(err)}`,
      latencyMs: Math.round(performance.now() - startTime)
    };
  }
};

const STORAGE_KEY_BEI_QUOTAS = 'mythic_bei_slot_quotas';

interface StoredSlotQuota {
  slot: number;
  target: 'gemini' | 'chatgpt';
  dateStr: string; // YYYY-MM-DD
  callsToday: number;
  cooldownUntil?: number;
  lastUsed?: number;
}

const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

const getAllStoredBEIQuotas = (): Record<string, StoredSlotQuota> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BEI_QUOTAS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAllStoredBEIQuotas = (data: Record<string, StoredSlotQuota>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BEI_QUOTAS, JSON.stringify(data));
  } catch {}
};

export const getBEIAccountQuota = (target: 'gemini' | 'chatgpt' = 'gemini', slot: number = 0): {
  slot: number;
  target: 'gemini' | 'chatgpt';
  tier?: 'free' | 'pro';
  callsToday: number;
  dailyLimit: number;
  status: 'ready' | 'high_usage' | 'rate_limited';
  cooldownUntil?: number;
  cooldownRemainingMinutes?: number;
  lastUsed?: number;
} => {
  const key = `${target}:${slot}`;
  const all = getAllStoredBEIQuotas();
  const today = getTodayDateStr();
  const stored = all[key];

  let callsToday = 0;
  let cooldownUntil: number | undefined = undefined;
  let lastUsed: number | undefined = undefined;

  if (stored) {
    if (stored.dateStr === today) {
      callsToday = stored.callsToday || 0;
    }
    if (stored.cooldownUntil && stored.cooldownUntil > Date.now()) {
      cooldownUntil = stored.cooldownUntil;
    }
    lastUsed = stored.lastUsed;
  }

  let tier: 'free' | 'pro' = 'free';
  if (typeof window !== 'undefined') {
    try {
      const savedAccounts = localStorage.getItem('mythic_bei_accounts');
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        const acc = Array.isArray(parsed) ? parsed.find((a: any) => a.slot === slot) : null;
        if (acc?.tier) tier = acc.tier;
      }
    } catch (e) {}
  }

  // Realistic Quotas: Free accounts have ~30 daily image limits; Pro/Advanced have 200+
  const dailyLimit = tier === 'pro' 
    ? (target === 'gemini' ? 200 : 100) 
    : (target === 'gemini' ? 30 : 10);

  let status: 'ready' | 'high_usage' | 'rate_limited' = 'ready';
  let cooldownRemainingMinutes: number | undefined = undefined;

  if (cooldownUntil && cooldownUntil > Date.now()) {
    status = 'rate_limited';
    cooldownRemainingMinutes = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / (60 * 1000)));
  } else if (callsToday >= Math.floor(dailyLimit * 0.8)) {
    status = 'high_usage';
  }

  return {
    slot,
    target,
    tier,
    callsToday,
    dailyLimit,
    status,
    cooldownUntil,
    cooldownRemainingMinutes,
    lastUsed
  };
};

export const recordBEISlotUsage = (
  target: 'gemini' | 'chatgpt',
  slot: number,
  result: 'success' | 'rate_limited' | 'error'
) => {
  const key = `${target}:${slot}`;
  const all = getAllStoredBEIQuotas();
  const today = getTodayDateStr();
  const prev = all[key] || { slot, target, dateStr: today, callsToday: 0 };

  const currentCalls = prev.dateStr === today ? (prev.callsToday || 0) : 0;
  const callsToday = result === 'success' ? currentCalls + 1 : currentCalls;

  let cooldownUntil = prev.cooldownUntil;
  if (result === 'rate_limited') {
    // 20 minute cooldown on rate limit
    cooldownUntil = Date.now() + 20 * 60 * 1000;
  }

  all[key] = {
    slot,
    target,
    dateStr: today,
    callsToday,
    cooldownUntil,
    lastUsed: Date.now()
  };

  saveAllStoredBEIQuotas(all);
};

export const resetBEISlotCooldown = (target: 'gemini' | 'chatgpt', slot: number) => {
  const key = `${target}:${slot}`;
  const all = getAllStoredBEIQuotas();
  if (all[key]) {
    delete all[key].cooldownUntil;
    saveAllStoredBEIQuotas(all);
  }
};

