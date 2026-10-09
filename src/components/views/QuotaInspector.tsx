import React, { useState, useEffect } from 'react';
import { 
  getQuotaSummary, getQuotaRecords, clearQuotaRecords, 
  probeGeminiQuota, probeOpenAIQuota, probeBEIQuota, QuotaProbeResult, 
  QuotaSummary, QuotaUsageRecord, setCustomMonthlyBudget 
} from '../../services/quotaTrackerService';
import { getActiveAIProvider, setActiveAIProvider } from '../../services/aiProviderService';
import { getApiKey } from '../../services/geminiService';
import { getOpenAIApiKey } from '../../services/openAIService';
import { AIProvider, UIMode } from '../../types';

interface QuotaInspectorProps {
  apiKeyReady: boolean;
  onNavigate: (mode: UIMode) => void;
}

export const QuotaInspector: React.FC<QuotaInspectorProps> = ({ apiKeyReady, onNavigate }) => {
  const [summary, setSummary] = useState<QuotaSummary>(() => getQuotaSummary());
  const [records, setRecords] = useState<QuotaUsageRecord[]>(() => getQuotaRecords());
  const [customBudgetInput, setCustomBudgetInput] = useState(() => String(summary.customMonthlyBudget));
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [activeProvider, setActiveProviderState] = useState<AIProvider>(() => getActiveAIProvider());

  // Probe states
  const [geminiProbe, setGeminiProbe] = useState<QuotaProbeResult | null>(null);
  const [isProbingGemini, setIsProbingGemini] = useState(false);
  const [openAIProbe, setOpenAIProbe] = useState<QuotaProbeResult | null>(null);
  const [isProbingOpenAI, setIsProbingOpenAI] = useState(false);
  const [beiProbe, setBeiProbe] = useState<QuotaProbeResult | null>(null);
  const [isProbingBei, setIsProbingBei] = useState(false);

  const hasGeminiKey = Boolean(getApiKey());
  const hasOpenAIKey = Boolean(getOpenAIApiKey());

  const refreshData = () => {
    setSummary(getQuotaSummary());
    setRecords(getQuotaRecords());
    setActiveProviderState(getActiveAIProvider());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectProvider = (prov: AIProvider) => {
    setActiveAIProvider(prov);
    setActiveProviderState(prov);
    refreshData();
  };

  const handleProbeGemini = async () => {
    setIsProbingGemini(true);
    setGeminiProbe(null);
    try {
      const result = await probeGeminiQuota();
      setGeminiProbe(result);
    } finally {
      setIsProbingGemini(false);
      refreshData();
    }
  };

  const handleProbeOpenAI = async () => {
    setIsProbingOpenAI(true);
    setOpenAIProbe(null);
    try {
      const result = await probeOpenAIQuota();
      setOpenAIProbe(result);
    } finally {
      setIsProbingOpenAI(false);
      refreshData();
    }
  };

  const handleProbeBei = async () => {
    setIsProbingBei(true);
    setBeiProbe(null);
    try {
      const result = await probeBEIQuota();
      setBeiProbe(result);
    } finally {
      setIsProbingBei(false);
      refreshData();
    }
  };

  const handleProbeAll = async () => {
    handleProbeBei();
    handleProbeGemini();
    if (hasOpenAIKey) handleProbeOpenAI();
  };

  const handleSaveBudget = () => {
    const val = parseFloat(customBudgetInput);
    if (!isNaN(val) && val > 0) {
      setCustomMonthlyBudget(val);
      setIsEditingBudget(false);
      refreshData();
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all local API request usage history?')) {
      clearQuotaRecords();
      refreshData();
    }
  };

  const freeRemaining = summary.freeTierRemainingDaily;
  const freePct = Math.min(100, Math.round((freeRemaining / summary.freeTierLimitDaily) * 100));

  const isExhaustedAlert = summary.isQuotaExhaustedDetected || geminiProbe?.status === 'exhausted';

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-lg">
                <i className="fa-solid fa-gauge-high" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Quota & Usage Inspector</h2>
                <p className="text-slate-400 text-sm">
                  Live health check, provider diagnostics, rate limits, and expense tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProbeAll}
              disabled={isProbingGemini || isProbingOpenAI || isProbingBei}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-900/30 flex items-center gap-2 cursor-pointer"
            >
              <i className={`fa-solid fa-bolt ${isProbingGemini || isProbingOpenAI || isProbingBei ? 'animate-spin' : ''}`} />
              <span>Probe All Providers</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-gear" /> Configure Keys
            </button>
          </div>
        </div>

        {/* Quota Exhaustion / $0 Balance Callout Banner */}
        {isExhaustedAlert && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <i className="fa-solid fa-triangle-exclamation text-base" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-200 flex items-center gap-2">
                  <span>Google Gemini API Quota Exhausted / $0 Balance (429)</span>
                  <span className="text-[10px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded-full border border-red-700/50">RESOURCE_EXHAUSTED</span>
                </h4>
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Your Google API key has $0 balance or has reached rate limits. Failed calls did <b>NOT</b> deduct from your quota count. 
                  Switch to <b>BEI Mode</b> to bypass API limits and generate unlimited assets via your browser session for free!
                </p>
                {summary.lastQuotaErrorMessage && (
                  <p className="text-[11px] font-mono text-red-400/90 bg-black/50 p-2 rounded max-h-16 overflow-y-auto break-all">
                    {summary.lastQuotaErrorMessage}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleSelectProvider('bei')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95 whitespace-nowrap"
            >
              <i className="fa-solid fa-puzzle-piece" />
              <span>Switch to Free BEI Mode</span>
            </button>
          </div>
        )}

        {/* Top KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Provider-Aware Active Quota Card */}
          {activeProvider === 'bei' ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-puzzle-piece text-emerald-400" /> BEI Mode Active
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/40 font-mono">Port 58925</span>
              </div>
              <div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  <span className="text-emerald-400">Unlimited</span>
                  <span className="text-xs text-slate-400 font-semibold">/ $0.00</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Browser Extension Bridge • 0 API tokens consumed
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
              <div className="flex justify-between text-[10px] text-emerald-400 font-mono">
                <span>Direct Web Session</span>
                <span>Zero Billing</span>
              </div>
            </div>
          ) : activeProvider === 'google' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Google API Quota (Est.)</span>
                <i className="fa-brands fa-google text-amber-400 text-sm" />
              </div>
              <div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                  <span>{freeRemaining.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ {summary.freeTierLimitDaily} est. left</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {summary.todayGoogleSuccessfulRequests} ok, {summary.todayGoogleFailedRequests} failed/limited today
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${freePct > 50 ? 'bg-emerald-500' : freePct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} 
                  style={{ width: `${freePct}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>* App-side tracker</span>
                <span>Failures not deducted</span>
              </div>
            </div>
          ) : activeProvider === 'pollinations' ? (
            <div className="bg-slate-900 border border-pink-500/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-pink-400 uppercase tracking-wider">
                <span>Pollinations Free Engine</span>
                <i className="fa-solid fa-wand-magic-sparkles text-pink-400 text-sm" />
              </div>
              <div>
                <div className="text-3xl font-black text-pink-300">Unlimited</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Open community AI image generator
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-pink-500 w-full" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Free Tier</span>
                <span>$0.00 Cost</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>OpenAI DALL-E</span>
                <i className="fa-solid fa-robot text-emerald-400 text-sm" />
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-400">
                  ${summary.todayCost.toFixed(3)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Prepaid API credit consumption today
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Pay-As-You-Go</span>
                <span>Check platform.openai.com</span>
              </div>
            </div>
          )}

          {/* Card 2: Rate Limit (RPM) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Rate Limit (RPM)</span>
              <i className="fa-solid fa-stopwatch text-blue-400 text-sm" />
            </div>
            <div>
              <div className="text-3xl font-black text-white flex items-baseline gap-1.5">
                <span>{summary.recentRpmCount}</span>
                <span className="text-xs text-slate-500 font-semibold">/ {summary.freeTierRpmLimit} req/min</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Requests sent in the last 60 seconds
              </p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (summary.recentRpmCount / summary.freeTierRpmLimit) * 100)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className={summary.recentRpmCount > 12 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {summary.recentRpmCount > 12 ? 'Near Limit' : 'Optimal'}
              </span>
              <span>Max 15 RPM (Google Free)</span>
            </div>
          </div>

          {/* Card 3: Monthly Spend & Budget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Monthly Spend</span>
              <i className="fa-solid fa-coins text-emerald-400 text-sm" />
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-1.5">
                <span>${summary.monthCost.toFixed(3)}</span>
                <span className="text-xs text-slate-500 font-semibold">/ ${summary.customMonthlyBudget.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ${summary.budgetRemaining.toFixed(3)} remaining budget
              </p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${summary.budgetPercentUsed > 90 ? 'bg-red-500' : summary.budgetPercentUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${summary.budgetPercentUsed}%` }} 
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>{summary.budgetPercentUsed}% budget used</span>
              <button
                onClick={() => setIsEditingBudget(!isEditingBudget)}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Set Limit
              </button>
            </div>
          </div>

          {/* Card 4: Total Calls & Active Engine Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xl font-black text-purple-300 uppercase truncate">
                {activeProvider === 'bei' ? 'BEI Mode' : activeProvider}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {summary.todaySuccessfulRequests} ok, {summary.todayFailedRequests} failed today
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[10px]">
              <span className="text-slate-500">Switch:</span>
              <div className="flex items-center gap-1 font-semibold">
                <button
                  onClick={() => handleSelectProvider('bei')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${activeProvider === 'bei' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  title="Switch to BEI Mode"
                >
                  BEI
                </button>
                <button
                  onClick={() => handleSelectProvider('google')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${activeProvider === 'google' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  title="Switch to Google Gemini API"
                >
                  Google
                </button>
                <button
                  onClick={() => handleSelectProvider('pollinations')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${activeProvider === 'pollinations' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  title="Switch to Pollinations"
                >
                  Poll
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Editor Modal / Inline Form */}
        {isEditingBudget && (
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs text-slate-300">
              <b className="text-white block mb-0.5">Custom Monthly Spend Budget</b>
              Set a monthly threshold to track expenses and prevent unexpected API bills.
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={customBudgetInput}
                  onChange={(e) => setCustomBudgetInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white w-28 focus:border-purple-500 outline-none"
                />
              </div>
              <button
                onClick={handleSaveBudget}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LIVE HEALTH & PROBE DIAGNOSTICS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-heart-pulse text-pink-400" />
                Live Provider Quota & Bridge Diagnostics
              </h3>
              <p className="text-xs text-slate-400">
                Test whether your API keys have remaining quota or whether the BEI Browser Extension bridge is connected.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. BEI Bridge Probe Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-puzzle-piece text-emerald-400" />
                  <span className="font-bold text-xs text-slate-200">BEI Browser Bridge</span>
                </div>
                <button
                  onClick={handleProbeBei}
                  disabled={isProbingBei}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <i className={`fa-solid fa-arrows-rotate ${isProbingBei ? 'animate-spin' : ''}`} />
                  <span>{isProbingBei ? 'Testing...' : 'Test BEI'}</span>
                </button>
              </div>

              {beiProbe ? (
                <div className={`p-3 rounded-lg text-xs space-y-1.5 border ${
                  beiProbe.status === 'healthy' 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : beiProbe.status === 'exhausted'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                    : 'bg-red-950/40 border-red-500/30 text-red-300'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <i className={`fa-solid ${beiProbe.status === 'healthy' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation'}`} />
                      {beiProbe.status === 'healthy' ? 'Bridge Connected & Ready' : beiProbe.status === 'exhausted' ? 'Bridge Running (Awaiting Tab)' : 'Bridge Offline'}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">{beiProbe.latencyMs}ms</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{beiProbe.message}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 p-3 bg-slate-900/50 rounded border border-slate-800/80 flex items-center justify-between">
                  <span>Port: 58925 (Click Test BEI)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
                </div>
              )}
            </div>

            {/* 2. Gemini Probe Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-brands fa-google text-amber-400" />
                  <span className="font-bold text-xs text-slate-200">Google Gemini API</span>
                </div>
                <button
                  onClick={handleProbeGemini}
                  disabled={isProbingGemini}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <i className={`fa-solid fa-arrows-rotate ${isProbingGemini ? 'animate-spin' : ''}`} />
                  <span>{isProbingGemini ? 'Testing...' : 'Test Gemini'}</span>
                </button>
              </div>

              {geminiProbe ? (
                <div className={`p-3 rounded-lg text-xs space-y-1.5 border ${
                  geminiProbe.status === 'healthy' 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : geminiProbe.status === 'exhausted'
                    ? 'bg-red-950/40 border-red-500/30 text-red-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <i className={`fa-solid ${geminiProbe.status === 'healthy' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation'}`} />
                      {geminiProbe.status === 'healthy' ? 'Endpoint Reachable' : geminiProbe.status === 'exhausted' ? 'Quota Exhausted (429)' : 'Configuration Alert'}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">{geminiProbe.latencyMs}ms</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{geminiProbe.message}</p>
                  {geminiProbe.rawDetails && (
                    <div className="font-mono text-[10px] bg-black/40 p-2 rounded max-h-20 overflow-y-auto whitespace-pre-wrap break-all text-slate-400">
                      {geminiProbe.rawDetails}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 p-3 bg-slate-900/50 rounded border border-slate-800/80 flex items-center justify-between">
                  <span>Status: {hasGeminiKey ? 'Key Configured (Click Test)' : 'No API key set'}</span>
                  {hasGeminiKey && <span className="w-2 h-2 rounded-full bg-emerald-500/50" />}
                </div>
              )}
            </div>

            {/* 3. OpenAI Probe Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-robot text-emerald-400" />
                  <span className="font-bold text-xs text-slate-200">OpenAI API</span>
                </div>
                <button
                  onClick={handleProbeOpenAI}
                  disabled={isProbingOpenAI || !hasOpenAIKey}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <i className={`fa-solid fa-arrows-rotate ${isProbingOpenAI ? 'animate-spin' : ''}`} />
                  <span>{isProbingOpenAI ? 'Testing...' : 'Test OpenAI'}</span>
                </button>
              </div>

              {openAIProbe ? (
                <div className={`p-3 rounded-lg text-xs space-y-1.5 border ${
                  openAIProbe.status === 'healthy' 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : openAIProbe.status === 'exhausted'
                    ? 'bg-red-950/40 border-red-500/30 text-red-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <i className={`fa-solid ${openAIProbe.status === 'healthy' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation'}`} />
                      {openAIProbe.status === 'healthy' ? 'OpenAI Key Valid' : openAIProbe.status === 'exhausted' ? 'Credits Depleted (429)' : 'Key Missing / Error'}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">{openAIProbe.latencyMs}ms</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{openAIProbe.message}</p>
                  {openAIProbe.rawDetails && (
                    <div className="font-mono text-[10px] bg-black/40 p-2 rounded max-h-20 overflow-y-auto whitespace-pre-wrap break-all text-slate-400">
                      {openAIProbe.rawDetails}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 p-3 bg-slate-900/50 rounded border border-slate-800/80 flex items-center justify-between">
                  <span>Status: {hasOpenAIKey ? 'Key Configured (Click Test)' : 'No OpenAI key set in Settings'}</span>
                  {hasOpenAIKey && <span className="w-2 h-2 rounded-full bg-emerald-500/50" />}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* OFFICIAL QUOTA DASHBOARDS & SHORTCUTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-arrow-up-right-from-square text-blue-400" />
              Official Cloud Provider Dashboards
            </h3>
            <p className="text-xs text-slate-400">
              Direct access to live Google Cloud billing, Gemini API quotas, and OpenAI balance sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href="https://ai.google.dev/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 rounded-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-xs text-purple-300 group-hover:text-purple-200 flex items-center gap-1.5 mb-1">
                  <i className="fa-brands fa-google text-amber-400" /> Google Gemini API Quotas
                </div>
                <div className="text-[11px] text-slate-400">View free tier RPM/RPD limits and Google Cloud project quotas.</div>
              </div>
              <div className="text-[10px] text-purple-400 font-mono mt-3 flex items-center gap-1">
                Open Documentation <i className="fa-solid fa-chevron-right text-[8px]" />
              </div>
            </a>

            <a
              href="https://console.cloud.google.com/iam-admin/quotas"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-xs text-blue-300 group-hover:text-blue-200 flex items-center gap-1.5 mb-1">
                  <i className="fa-solid fa-cloud text-blue-400" /> GCP IAM & Quotas
                </div>
                <div className="text-[11px] text-slate-400">Inspect exact API quotas and request quota limit increases.</div>
              </div>
              <div className="text-[10px] text-blue-400 font-mono mt-3 flex items-center gap-1">
                Open Quotas <i className="fa-solid fa-chevron-right text-[8px]" />
              </div>
            </a>

            <a
              href="https://console.cloud.google.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-xs text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5 mb-1">
                  <i className="fa-solid fa-receipt text-emerald-400" /> Google Cloud Billing
                </div>
                <div className="text-[11px] text-slate-400">View current invoice, linked cards, and monthly cost charts.</div>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-3 flex items-center gap-1">
                Open Billing <i className="fa-solid fa-chevron-right text-[8px]" />
              </div>
            </a>

            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-xs text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5 mb-1">
                  <i className="fa-solid fa-wallet text-emerald-400" /> OpenAI Credit Balance
                </div>
                <div className="text-[11px] text-slate-400">Check remaining prepaid credit balance and usage graphs.</div>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-3 flex items-center gap-1">
                Open OpenAI <i className="fa-solid fa-chevron-right text-[8px]" />
              </div>
            </a>
          </div>
        </div>

        {/* MODEL PRICING & LIMITS REFERENCE TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-table-list text-purple-400" />
              Model Limits & Cost Reference Guide
            </h3>
            <p className="text-xs text-slate-400">
              Comparison across BEI Chrome Extension bridge, Google Gemini, OpenAI, and free engines.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Model / Engine</th>
                  <th className="py-2.5 px-3">Tier Quota</th>
                  <th className="py-2.5 px-3">Rate Limit</th>
                  <th className="py-2.5 px-3">Est. Cost / Asset</th>
                  <th className="py-2.5 px-3">Billing Requirement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {/* BEI Mode Row */}
                <tr className="bg-emerald-950/20 hover:bg-emerald-950/40 border-l-2 border-emerald-500">
                  <td className="py-2.5 px-3 font-bold text-emerald-300 font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 
                    BEI Mode (Chrome Extension Bridge)
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold font-sans">Unlimited (Web Session)</td>
                  <td className="py-2.5 px-3 text-emerald-300 font-sans">Web UI Limits</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">$0.000 (Free)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-sans">None (Uses Gemini/ChatGPT Web login)</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Gemini 3.1 Flash Image API
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">1,500 RPD Free (Estimate)</td>
                  <td className="py-2.5 px-3 text-slate-300">15 RPM</td>
                  <td className="py-2.5 px-3 text-slate-300">~$0.002</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Free tier key (Subject to region/limits)</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> Gemini 3 Pro Image API
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Requires Pay-As-You-Go</td>
                  <td className="py-2.5 px-3 text-slate-300">360 RPM</td>
                  <td className="py-2.5 px-3 text-slate-300">~$0.030</td>
                  <td className="py-2.5 px-3 text-amber-400 font-sans">Google Cloud Billing Account</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> OpenAI DALL-E 3 API
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Prepaid balance only</td>
                  <td className="py-2.5 px-3 text-slate-300">5-7 images/min</td>
                  <td className="py-2.5 px-3 text-slate-300">$0.040 - $0.080</td>
                  <td className="py-2.5 px-3 text-amber-400 font-sans">OpenAI Prepaid Credits ($5+ minimum)</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-400" /> Pollinations.ai
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">Unlimited</td>
                  <td className="py-2.5 px-3 text-emerald-400">Unthrottled</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">$0.000 (Free)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-sans">No key or account needed</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> Prompt-Only Mode
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">Unlimited</td>
                  <td className="py-2.5 px-3 text-emerald-400">Instant</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">$0.000 (Local)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-sans">None (Exports to Clipboard)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT REQUESTS LOG TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-slate-400" />
                Recent Generation Request History
              </h3>
              <p className="text-xs text-slate-400">
                Local log of recent AI requests with latency, status, error causes, and costs.
              </p>
            </div>
            {records.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded text-xs transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {records.length > 0 ? (
            <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Engine</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Est. Cost</th>
                    <th className="py-2.5 px-3">Details / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-[11px] bg-slate-900/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-300">
                        {r.provider}
                      </td>
                      <td className="py-2 px-3 text-purple-300 truncate max-w-[140px]" title={r.model}>
                        {r.model}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {r.status === 'success' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                            <i className="fa-solid fa-circle-check" /> 200 OK
                          </span>
                        )}
                        {r.status === 'rate_limited' && (
                          <span className="text-red-400 flex items-center gap-1 font-semibold text-[10px]">
                            <i className="fa-solid fa-triangle-exclamation" /> 429 Quota
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold text-[10px]">
                            <i className="fa-solid fa-circle-xmark" /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {r.latencyMs ? `${r.latencyMs}ms` : '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        ${r.estimatedCost.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-slate-400 max-w-[240px] truncate" title={r.errorMessage || r.promptSnippet}>
                        {r.errorMessage ? (
                          <span className="text-red-400 text-[10px] font-sans">
                            {r.errorMessage}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">
                            {r.promptSnippet || 'Success'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800">
              No generation requests recorded in this session yet. Start generating to track your live quota consumption.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default QuotaInspector;
