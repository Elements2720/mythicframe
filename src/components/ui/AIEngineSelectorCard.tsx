import React, { useState, useEffect } from 'react';
import { AIProvider, AvailableModel } from '../../types';
import { getActiveAIProvider, setActiveAIProvider } from '../../services/aiProviderService';
import { getPollinationsModel, setPollinationsModel, POLLINATIONS_MODELS } from '../../services/pollinationsService';
import { getBEIConfig, setBEIConfig, checkBEIConnection, openBEITab, scanBEIAccounts, BEIStatusResponse, getSavedBEIAccounts, setBEIAccountTier } from '../../services/beiService';
import { getBEIAccountQuota } from '../../services/quotaTrackerService';
import { getIncognitoMode, setIncognitoMode, formatDisplayEmail } from '../../services/privacyService';
import { useLanguage } from '../../i18n/LanguageContext';

interface AIEngineSelectorCardProps {
  compact?: boolean;
  setMode?: (mode: string) => void;
  availableModels?: AvailableModel[];
  activeModel?: string;
  handleSelectModel?: (val: string) => void;
  useProModel?: boolean;
  setUseProModel?: (val: boolean) => void;
  handleFetchModels?: () => void;
  isLoadingModels?: boolean;
  className?: string;
}

export const AIEngineSelectorCard: React.FC<AIEngineSelectorCardProps> = ({
  compact = false,
  setMode,
  availableModels,
  activeModel,
  handleSelectModel,
  useProModel,
  setUseProModel,
  handleFetchModels,
  isLoadingModels,
  className = ''
}) => {
  const { t } = useLanguage();
  const [currentEngine, setCurrentEngine] = useState<AIProvider>(getActiveAIProvider());
  const [pollinationsModel, setPollModel] = useState<string>(getPollinationsModel());
  const [beiConfig, setBEIState] = useState(getBEIConfig());
  const [beiStatus, setBEIStatus] = useState<BEIStatusResponse>({ ready: false, connected: false, port: beiConfig.port });
  const [isOpeningTab, setIsOpeningTab] = useState(false);
  const [knownAccounts, setKnownAccounts] = useState(() => getSavedBEIAccounts());
  const [isIncognito, setIsIncognito] = useState(() => getIncognitoMode());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('mythic_ai_engine_card_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('mythic_ai_engine_card_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleProviderChange = (e: any) => {
      if (e?.detail) setCurrentEngine(e.detail);
    };
    const handleAccountsChange = () => {
      setKnownAccounts(getSavedBEIAccounts());
    };
    const handleIncognitoChange = (e: any) => {
      setIsIncognito(typeof e?.detail === 'boolean' ? e.detail : getIncognitoMode());
    };
    const handleStorage = () => {
      setCurrentEngine(getActiveAIProvider());
      setPollModel(getPollinationsModel());
      setBEIState(getBEIConfig());
      setKnownAccounts(getSavedBEIAccounts());
    };
    window.addEventListener('mythic_ai_provider_changed', handleProviderChange);
    window.addEventListener('mythic_bei_accounts_changed', handleAccountsChange);
    window.addEventListener('mythic_incognito_mode_changed', handleIncognitoChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('mythic_ai_provider_changed', handleProviderChange);
      window.removeEventListener('mythic_bei_accounts_changed', handleAccountsChange);
    window.removeEventListener('mythic_incognito_mode_changed', handleIncognitoChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (currentEngine === 'bei') {
      checkBEIConnection().then(setBEIStatus);
      const interval = setInterval(() => {
        checkBEIConnection().then(setBEIStatus);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentEngine, beiConfig.target, beiConfig.accountSlot]);

  const switchEngine = (prov: AIProvider) => {
    setActiveAIProvider(prov);
    setCurrentEngine(prov);
  };

  const updatePollModel = (modelId: string) => {
    setPollinationsModel(modelId);
    setPollModel(modelId);
    if (handleSelectModel) handleSelectModel(modelId);
  };

  const updateBEITarget = (target: 'gemini' | 'chatgpt') => {
    setBEIConfig({ target });
    setBEIState(prev => ({ ...prev, target }));
  };

  const updateBEITabMode = (tabMode: 'same_window_group' | 'new_window_group' | 'background_tab') => {
    setBEIConfig({ tabMode });
    setBEIState(prev => ({ ...prev, tabMode }));
  };

  const updateBEISlot = (slot: number) => {
    setBEIConfig({ accountSlot: slot });
    setBEIState(prev => ({ ...prev, accountSlot: slot }));
    const hasTab = beiStatus.tabs?.some(t => t.target === 'gemini' && (t.accountSlot ?? 0) === slot);
    if (!hasTab && beiStatus.connected) {
      openBEITab('gemini', slot, beiConfig.tabMode, true).then(() => {
        setTimeout(() => checkBEIConnection().then(setBEIStatus), 2000);
      });
    }
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const ok = await scanBEIAccounts();
      if (ok) {
        setTimeout(() => {
          checkBEIConnection().then(st => {
            setBEIStatus(st);
            setKnownAccounts(getSavedBEIAccounts());
          });
        }, 2000);
        setTimeout(() => {
          checkBEIConnection().then(st => {
            setBEIStatus(st);
            setKnownAccounts(getSavedBEIAccounts());
            setIsScanning(false);
          });
        }, 4000);
      } else {
        setIsScanning(false);
      }
    } catch (e) {
      setIsScanning(false);
    }
  };

  const handleOpenTab = async () => {
    setIsOpeningTab(true);
    await openBEITab(beiConfig.target, beiConfig.accountSlot, beiConfig.tabMode, true);
    setTimeout(async () => {
      const res = await checkBEIConnection();
      setBEIStatus(res);
      setIsOpeningTab(false);
    }, 1500);
  };

  return (
    <div className={`bg-[#121927] border border-slate-800 rounded-xl p-3 shadow-lg transition-all ${className}`}>
      {/* Clickable Engine Header & Quick Collapse Toggle */}
      <div 
        onClick={toggleCollapse}
        className="flex items-center justify-between cursor-pointer select-none group min-h-[24px]"
        title={isCollapsed ? "Click to expand AI Engine settings" : "Click to minimize AI Engine settings"}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <i className="fa-solid fa-microchip text-purple-400 group-hover:text-purple-300 transition-colors text-[11px] shrink-0" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider group-hover:text-white transition-colors truncate">
            AI Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
            currentEngine === 'pollinations'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80'
              : currentEngine === 'bei'
              ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/80'
              : currentEngine === 'google'
              ? 'bg-purple-950/70 text-purple-300 border-purple-700/80'
              : currentEngine === 'openai'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {currentEngine === 'pollinations' ? 'Pollinations' :
             currentEngine === 'bei' ? (beiConfig.target === 'gemini' ? 'BEI · Gemini' : 'BEI · ChatGPT') :
             currentEngine === 'google' ? 'Gemini API' :
             currentEngine === 'openai' ? 'DALL-E 3' :
             currentEngine === 'opencode' ? 'OpenCode' : 'Prompt Only'}
          </span>
          <div className="w-4 h-4 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
            <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ease-out ${
              isCollapsed ? '-rotate-90' : 'rotate-0'
            }`} />
          </div>
        </div>
      </div>

      {/* Accordion Content with Smooth CSS Grid Transition */}
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        isCollapsed ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
      }`}>
        <div className="overflow-hidden space-y-3 pt-2">
          {/* 1-Click Engine Switcher Buttons */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => switchEngine('bei')}
            className={`py-2 px-2 rounded text-[11px] font-bold transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              currentEngine === 'bei'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="BEI Mode — Browser Extension Interface hooking into Gemini / ChatGPT Web"
          >
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-bolt text-[10px] text-cyan-400" />
              <span>BEI Bridge</span>
            </span>
            <span className="text-[9px] text-cyan-400/80 font-mono font-normal">Web Extension</span>
          </button>

          <button
            type="button"
            onClick={() => switchEngine('google')}
            className={`py-2 px-2 rounded text-[11px] font-bold transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer ${
              currentEngine === 'google'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Google Gemini Official Cloud API"
          >
            <span className="flex items-center gap-1.5">
              <i className="fa-brands fa-google text-[10px] text-purple-400" />
              <span>Gemini API</span>
            </span>
            <span className="text-[9px] text-purple-400/80 font-mono font-normal">Official Key</span>
          </button>
        </div>

      {/* Engine-Specific Model & Config Controls */}



      {/* 2. BEI Controls */}
      {currentEngine === 'bei' && (
        <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">BEI Web Target</span>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className={`w-1.5 h-1.5 rounded-full ${beiStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={beiStatus.connected ? 'text-emerald-400' : 'text-amber-400'}>
                {beiStatus.connected ? `Bridge Connected (v${beiStatus.extensionVersion || '1.0.0'})` : 'Extension Waiting'}
              </span>
            </div>
          </div>

          {beiStatus.connected && beiStatus.extensionVersion === '1.0.0' && (
            <div className="p-2 rounded bg-amber-950/50 border border-amber-500/50 text-[10px] text-amber-200 flex items-start gap-1.5">
              <i className="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span><b>Action Required:</b> Please reload the extension in Chrome (<code className="text-amber-300">chrome://extensions</code> ➔ Click <b>↻ Reload</b>) to activate email detection & silent background tabs.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => updateBEITarget('gemini')}
              className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                beiConfig.target === 'gemini'
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <i className="fa-brands fa-google text-[10px]" /> Gemini Web
            </button>
            <button
              type="button"
              onClick={() => updateBEITarget('chatgpt')}
              className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                beiConfig.target === 'chatgpt'
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-robot text-[10px]" /> ChatGPT Web
            </button>
          </div>

          {/* Account Email Dropdown for Gemini & ChatGPT */}
          {beiConfig.target === 'gemini' ? (
            <div className="space-y-2">
              {/* Row 1: Clear Label, Scan Button, and Quota Badge */}
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <i className="fa-brands fa-google text-cyan-400 text-xs" />
                    <span>Slot:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="Auto-detect all logged-in Google accounts across Chrome slots /u/0 to /u/3"
                  >
                    <i className={`fa-solid ${isScanning ? 'fa-spinner fa-spin' : 'fa-radar'}`} />
                    <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
                  </button>
                </div>
                {(() => {
                  const currentSlot = beiConfig.accountSlot ?? 0;
                  const quota = getBEIAccountQuota('gemini', currentSlot);
                  if (quota.status === 'rate_limited') {
                    return (
                      <span className="font-mono text-[9px] text-rose-300 bg-rose-950/70 border border-rose-500/50 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm shrink-0" title="Rate limit cooldown active">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>🔴 Cooldown ({quota.cooldownRemainingMinutes}m)</span>
                      </span>
                    );
                  }
                  if (quota.status === 'high_usage') {
                    return (
                      <span className="font-mono text-[9px] text-amber-300 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm shrink-0" title="High daily usage">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>🟡 {quota.callsToday}/{quota.dailyLimit} reqs</span>
                      </span>
                    );
                  }
                  return (
                    <span className="font-mono text-[9px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm shrink-0" title={`Ready • ${quota.tier === 'pro' ? 'Advanced' : 'Free'} limit`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>🟢 {quota.callsToday}/{quota.dailyLimit} reqs</span>
                    </span>
                  );
                })()}
              </div>

              {/* Row 2: Clean Dropdown showing Real Email directly - ALWAYS 4 slots */}
              <div className="relative">
                <select
                  value={String(beiConfig.accountSlot ?? 0)}
                  onChange={(e) => updateBEISlot(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-cyan-500/40 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none hover:border-cyan-400 transition-colors cursor-pointer font-medium appearance-none pr-8 focus:ring-1 focus:ring-cyan-500 font-mono"
                >
                  {(() => {
                    const availableSlots = Array.from(new Set([
                      0, 1, 2, 3,
                      ...(beiStatus.accounts || []).map(a => a.slot),
                      ...(knownAccounts || []).map(a => a.slot),
                      ...(beiStatus.tabs || []).filter(t => t.target === 'gemini' && typeof t.accountSlot === 'number').map(t => t.accountSlot!)
                    ])).sort((a, b) => a - b);

                    return availableSlots.map(slot => {
                      const geminiTabs = beiStatus.tabs?.filter(t => t.target === 'gemini') || [];
                      const tab = geminiTabs.find(t => (t.accountSlot ?? 0) === slot);
                      const acc = (beiStatus.accounts || []).find(a => a.slot === slot) || knownAccounts.find(a => a.slot === slot);
                      const rawEmail = tab?.email || acc?.email;
                      const displayEmail = rawEmail 
                        ? (isIncognito ? formatDisplayEmail(rawEmail, true) : rawEmail) 
                        : `Slot ${slot + 1} (/u/${slot}/) • Auto-opens on generate`;
                      const hasTab = Boolean(tab);

                      return (
                        <option 
                          key={`acc-${slot}`} 
                          value={String(slot)}
                          className="bg-[#121927] text-slate-100 font-medium py-1.5"
                        >
                          📧 {displayEmail} {hasTab ? '• [Tab Open]' : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none text-xs" />
              </div>

              {/* Row 3: Spacious Controls Row (Tier Toggle + Incognito Toggle) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {(() => {
                  const currentSlot = beiConfig.accountSlot ?? 0;
                  const quota = getBEIAccountQuota('gemini', currentSlot);
                  const isPro = quota.tier === 'pro';
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const nextTier = isPro ? 'free' : 'pro';
                        setBEIAccountTier(currentSlot, nextTier);
                        setKnownAccounts(getSavedBEIAccounts());
                      }}
                      className={`text-[10px] font-bold py-1.5 px-2 rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isPro
                          ? 'bg-purple-950/80 text-purple-300 border-purple-500/70 hover:bg-purple-900/80 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title="Click to toggle between Free Tier (~30 req/day) and Pro/Advanced Tier (~200 req/day)"
                    >
                      <i className={`fa-solid ${isPro ? 'fa-gem text-purple-400' : 'fa-user text-slate-400'} text-[9px]`} />
                      <span>{isPro ? '✨ Pro / Advanced' : 'Free Tier'}</span>
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    const next = !isIncognito;
                    setIncognitoMode(next);
                    setIsIncognito(next);
                  }}
                  className={`text-[10px] font-bold py-1.5 px-2 rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isIncognito
                      ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/80'
                      : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isIncognito ? "Incognito / Streamer Mode is ON (click to reveal real email)" : "Incognito / Streamer Mode is OFF (click to mask email for streaming)"}
                >
                  <i className={`fa-solid ${isIncognito ? 'fa-eye-slash text-amber-400' : 'fa-eye text-slate-400'} text-[9px]`} />
                  <span>{isIncognito ? 'Incognito' : 'Email Visible'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-robot text-emerald-400 text-[10px]" />
                    <span>ChatGPT:</span>
                  </span>
                  {(() => {
                    const quota = getBEIAccountQuota('chatgpt', 0);
                    const isPro = quota.tier === 'pro';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const nextTier = isPro ? 'free' : 'pro';
                          setBEIAccountTier(0, nextTier);
                          setKnownAccounts(getSavedBEIAccounts());
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1 ${
                          isPro
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900/80 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        title="Click to toggle between Free Tier (~10 req/day) and Plus/Pro Tier (~100 req/day)"
                      >
                        <i className={`fa-solid ${isPro ? 'fa-gem text-emerald-400' : 'fa-user text-slate-400'} text-[8px]`} />
                        <span>{isPro ? '✨ Plus / Pro' : 'Free Tier'}</span>
                      </button>
                    );
                  })()}
                </div>
                {(() => {
                  const quota = getBEIAccountQuota('chatgpt', 0);
                  if (quota.status === 'rate_limited') {
                    return (
                      <span className="font-mono text-[9px] text-rose-300 bg-rose-950/70 border border-rose-500/50 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>🔴 Cooldown ({quota.cooldownRemainingMinutes}m)</span>
                      </span>
                    );
                  }
                  return (
                    <span className="font-mono text-[9px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>🟢 {quota.callsToday}/{quota.dailyLimit} reqs</span>
                    </span>
                  );
                })()}
              </div>
              <div className="p-2 rounded bg-slate-900 border border-emerald-500/30 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <i className="fa-solid fa-user-circle text-emerald-400 text-xs" />
                  <span className="font-mono text-slate-200 truncate">
                    {beiStatus.tabs?.find(t => t.target === 'chatgpt')?.email || 
                     (beiStatus.tabs?.some(t => t.target === 'chatgpt') ? 'Logged-in ChatGPT Session • [Tab Active]' : 'No ChatGPT tab open yet (Auto-opens on generate)')}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Tab Management Mode */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-layer-group text-purple-400 text-[10px]" />
                <span>Tab Layout Mode:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => updateBEITabMode('same_window_group')}
                className={`py-1 px-1.5 rounded text-[10px] font-medium border text-center transition-all ${
                  (beiConfig.tabMode || 'same_window_group') === 'same_window_group'
                    ? 'bg-purple-950/70 text-purple-300 border-purple-500/80 font-bold'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
                title="Single 'MythicFrame BEI' tab group in current Chrome window"
              >
                Same Window Group
              </button>
              <button
                type="button"
                onClick={() => updateBEITabMode('new_window_group')}
                className={`py-1 px-1.5 rounded text-[10px] font-medium border text-center transition-all ${
                  beiConfig.tabMode === 'new_window_group'
                    ? 'bg-purple-950/70 text-purple-300 border-purple-500/80 font-bold'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
                title="Dedicated separate Chrome window with tab group"
              >
                Dedicated Window
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
            <button
              type="button"
              onClick={handleOpenTab}
              disabled={isOpeningTab}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <i className={`fa-solid ${isOpeningTab ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'} text-[9px]`} />
              <span>{isOpeningTab ? 'Syncing...' : 'Sync Account in Background'}</span>
            </button>
            {setMode && (
              <button
                type="button"
                onClick={() => setMode('settings')}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                BEI Setup
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Google Gemini Controls */}
      {currentEngine === 'google' && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{t('ai_model')}</label>
            <div className="flex items-center gap-2">
              {handleFetchModels && (
                <button
                  type="button"
                  onClick={() => handleFetchModels()}
                  disabled={isLoadingModels}
                  title="Scan API for available models"
                  className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <i className={`fa-solid fa-arrows-rotate ${isLoadingModels ? 'animate-spin' : ''}`} />
                  <span>{isLoadingModels ? 'Scanning...' : 'Scan API'}</span>
                </button>
              )}
              {setMode && (
                <button
                  type="button"
                  onClick={() => setMode('quota')}
                  className="text-[10px] text-slate-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  title="Inspect API Quotas & Remaining Requests"
                >
                  <i className="fa-solid fa-gauge-high text-[9px]" /> Quota
                </button>
              )}
            </div>
          </div>
          <div className="relative group">
            <select
              value={activeModel || (useProModel ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image')}
              onChange={(e) => {
                if (handleSelectModel) handleSelectModel(e.target.value);
                else if (setUseProModel) setUseProModel(e.target.value.includes('pro'));
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none hover:border-slate-600 transition-colors cursor-pointer font-medium appearance-none"
            >
              {availableModels && availableModels.length > 0 ? (
                <>
                  {availableModels.filter(m => m.isImageModel).length > 0 && (
                    <optgroup label="🎨 Image Generation Models">
                      {availableModels.filter(m => m.isImageModel).map(m => (
                        <option key={m.id} value={m.id} className="text-purple-300 font-semibold bg-[#121927]">
                          {m.displayName || m.id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availableModels.filter(m => !m.isImageModel).length > 0 && (
                    <optgroup label="⚡ Multimodal / Chat Models">
                      {availableModels.filter(m => !m.isImageModel).map(m => (
                        <option key={m.id} value={m.id} className="text-slate-300 bg-[#121927]">
                          {m.displayName || m.id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                <>
                  <option value="gemini-3.1-flash-image" className="bg-[#121927]">Gemini 3.1 Flash Image (Fast)</option>
                  <option value="gemini-3-pro-image" className="bg-[#121927]">Gemini 3 Pro Image (High Quality)</option>
                  <option value="gemini-2.5-flash" className="bg-[#121927]">Gemini 2.5 Flash</option>
                </>
              )}
            </select>
            <i className="fa-solid fa-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-0.5">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
              <span className="truncate">Active: <code className="text-purple-300 font-mono">{activeModel || (useProModel ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image')}</code></span>
            </span>
          </div>
        </div>
      )}

      {/* 4. OpenAI Controls */}
      {currentEngine === 'openai' && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">OpenAI Model</label>
            <span className="text-[10px] text-emerald-400 font-mono">DALL-E</span>
          </div>
          <select
            value={activeModel || 'dall-e-3'}
            onChange={(e) => { if (handleSelectModel) handleSelectModel(e.target.value); }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-medium outline-none cursor-pointer"
          >
            <option value="dall-e-3" className="bg-[#121927]">DALL-E 3 (Highest Detail)</option>
            <option value="dall-e-2" className="bg-[#121927]">DALL-E 2 (Fast Generation)</option>
          </select>
        </div>
      )}

      {/* 5. OpenCode / Local AI Controls */}
      {currentEngine === 'opencode' && (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Local AI Endpoint:</span>
            {setMode && (
              <button
                type="button"
                onClick={() => setMode('settings')}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Configure
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500">Uses local Ollama or OpenAI-compatible server configured in Settings.</p>
        </div>
      )}

      {/* 6. Prompt Only / Offline Mode */}
      {currentEngine === 'offline' && (
        <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
          <p className="text-[10px] text-slate-400">
            Prompt-Only Mode active. Clicking Generate opens the structured prompt export modal ready for Midjourney or ComfyUI.
          </p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
