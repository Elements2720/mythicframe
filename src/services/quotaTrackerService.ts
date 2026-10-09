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
}

const STORAGE_KEY_RECORDS = 'mythic_quota_usage_records';
const STORAGE_KEY_BUDGET = 'mythic_quota_monthly_budget';

export const estimateModelCost = (provider: AIProvider, model: string): number => {
  if (provider === 'pollinations' || provider === 'offline' || provider === 'opencode') {
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
  let todayCost = 0;
  let monthRequests = 0;
  let monthCost = 0;
  let recentRpmCount = 0;
  let todayGoogleRequests = 0;

  for (const r of records) {
    if (r.timestamp >= startOfDayMs) {
      todayRequests++;
      todayCost += r.estimatedCost;
      if (r.provider === 'google') {
        todayGoogleRequests++;
      }
    }
    if (r.timestamp >= startOfMonthMs) {
      monthRequests++;
      monthCost += r.estimatedCost;
    }
    if (r.timestamp >= oneMinuteAgoMs) {
      recentRpmCount++;
    }
  }

  const freeTierLimitDaily = 1500;
  const freeTierRpmLimit = 15;
  const freeTierRemainingDaily = Math.max(0, freeTierLimitDaily - todayGoogleRequests);

  const customMonthlyBudget = getCustomMonthlyBudget();
  const budgetRemaining = Math.max(0, customMonthlyBudget - monthCost);
  const budgetPercentUsed = Math.min(100, (monthCost / customMonthlyBudget) * 100);

  return {
    todayRequests,
    todayCost: parseFloat(todayCost.toFixed(4)),
    monthRequests,
    monthCost: parseFloat(monthCost.toFixed(4)),
    freeTierRemainingDaily,
    freeTierLimitDaily,
    recentRpmCount,
    freeTierRpmLimit,
    customMonthlyBudget,
    budgetRemaining: parseFloat(budgetRemaining.toFixed(4)),
    budgetPercentUsed: parseFloat(budgetPercentUsed.toFixed(1))
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
