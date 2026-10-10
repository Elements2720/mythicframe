import { AIEngineSelectorCard } from '../ui/AIEngineSelectorCard';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { UIMode, AIProvider } from '../../types';
import { getActiveAIProvider } from '../../services/aiProviderService';
import { getEffectiveBEIBrowser } from '../../services/beiService';

interface AppHeaderProps {
  mode: UIMode;
  title: string;
  useProModel: boolean;
  apiKeyReady: boolean;
  onConnect: () => void;
  generatedImage: string | null;
  onExport: () => void;
  onSaveToDrive?: () => void;
  isDriveConnected?: boolean;
  showConsole: boolean;
  setShowConsole: (show: boolean) => void;
  isSuggesting?: boolean;
  onSuggest?: () => void;
  onCompositeExport?: () => void;
  onSetTemplate?: () => void;
  onUseInLayout?: () => void;
  onSaveCard?: () => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`}></i>;

const AppHeader: React.FC<any> = (props) => {
  const {
    mode, title, useProModel, apiKeyReady, onConnect,
    generatedImage, onExport, onSaveToDrive, isDriveConnected, showConsole, setShowConsole,
    isSuggesting, onSuggest, onCompositeExport, onSetTemplate, onUseInLayout, onSaveCard
  } = props;
  const { t } = useLanguage();
  const [showEnginePopover, setShowEnginePopover] = useState(false);
  const [currentEngine, setCurrentEngine] = useState<AIProvider>(() => getActiveAIProvider());

  useEffect(() => {
    const handleSync = (e: any) => {
      const prov = e?.detail || getActiveAIProvider();
      setCurrentEngine(prov);
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('mythic_ai_provider_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('mythic_ai_provider_changed', handleSync);
    };
  }, []);

  return (
    <div className="h-14 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-6 shrink-0 z-30">
      <div className="flex items-center gap-4">
         <h2 className="text-lg font-semibold text-slate-200 capitalize">{t(mode as any) || title}</h2>
         {mode !== 'fullcard' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEnginePopover(!showEnginePopover)}
                className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-xs border border-slate-700/80 hover:border-purple-500/60 flex items-center gap-1.5 font-medium transition-all cursor-pointer shadow-sm group"
                title="Click to view or switch AI Generation Engine & Model"
              >
                {currentEngine === 'bei' && <><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /><span className="text-cyan-300">BEI Mode ({getEffectiveBEIBrowser() === 'brave' ? 'Brave' : getEffectiveBEIBrowser() === 'edge' ? 'Edge' : 'Chrome'})</span></>}
                {currentEngine === 'pollinations' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-300">Pollinations (Free)</span></>}
                {currentEngine === 'openai' && <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-blue-300">OpenAI DALL-E</span></>}
                {currentEngine === 'opencode' && <><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /><span className="text-cyan-300">OpenCode Local</span></>}
                {currentEngine === 'offline' && <><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span className="text-slate-400">Prompt Only</span></>}
                {currentEngine === 'google' && <><span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /><span className="text-purple-300">Gemini: {useProModel ? t('pro_model') : t('std_model')}</span></>}
                <i className="fa-solid fa-chevron-down text-[9px] text-slate-500 group-hover:text-purple-400 transition-colors ml-0.5" />
              </button>

              {showEnginePopover && (
                <>
                  <div className="fixed inset-0 z-[600]" onClick={() => setShowEnginePopover(false)} />
                  <div className="absolute left-0 top-full mt-2 w-80 z-[610] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <AIEngineSelectorCard
                      availableModels={(props as any).availableModels}
                      activeModel={(props as any).activeModel}
                      handleSelectModel={(props as any).handleSelectModel}
                      useProModel={useProModel}
                      setUseProModel={(props as any).setUseProModel}
                      handleFetchModels={(props as any).handleFetchModels}
                      isLoadingModels={(props as any).isLoadingModels}
                    />
                  </div>
                </>
              )}
            </div>
         )}
      </div>
      
       {mode === 'fullcard' && onSuggest && (
          <button onClick={onSuggest} className="text-xs bg-purple-900/30 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded hover:bg-purple-900/50 flex items-center gap-2">
             {isSuggesting ? <Icon name="fa-spinner fa-spin" /> : <Icon name="fa-lightbulb"/>} Suggest Content
          </button>
       )}

      <div className="flex items-center gap-4">
        {mode === 'frame' && generatedImage && onSetTemplate && (
           <button 
             onClick={onSetTemplate} 
             className="text-xs bg-pink-600/20 text-pink-400 border border-pink-500/30 px-3 py-1.5 rounded hover:bg-pink-600/30 flex items-center gap-2 animate-in fade-in"
           >
              <Icon name="fa-border-all" /> Use as Card Template
           </button>
        )}

        {(mode === 'illustration' || mode === 'background') && generatedImage && onUseInLayout && (
           <button 
             onClick={onUseInLayout} 
             className="text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded hover:bg-purple-600/30 flex items-center gap-2 animate-in fade-in"
           >
              <Icon name="fa-pen-ruler" /> Use in Layout
           </button>
        )}

        <button 
           onClick={() => setShowConsole(!showConsole)} 
           className={`text-xs px-3 py-1.5 rounded hover:bg-slate-800 border transition-colors flex items-center gap-2 ${showConsole ? 'bg-slate-800 text-green-400 border-green-900' : 'text-slate-400 border-transparent'}`}
           title="Debug Console"
         >
           <Icon name="fa-terminal" />
         </button>

         {/* Export Button Logic */}
         {mode === 'fullcard' ? (
            <>
               {onSaveCard && (
                  <button 
                     onClick={onSaveCard}
                     className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded hover:bg-slate-700 hover:text-white flex items-center gap-2"
                  >
                     <Icon name="fa-floppy-disk" /> {t('save')}
                  </button>
               )}
               {onCompositeExport && (
                  <button 
                     onClick={onCompositeExport}
                     className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded hover:bg-blue-600/30 flex items-center gap-2"
                  >
                     <Icon name="fa-download" /> {t('export')}
                  </button>
               )}
            </>
         ) : (
            generatedImage && (
              <div className="flex bg-blue-900/10 border border-blue-500/30 rounded overflow-hidden">
                <button 
                  onClick={onExport} 
                  className="text-xs text-blue-400 px-3 py-1.5 hover:bg-blue-600/20 flex items-center gap-2 border-r border-blue-500/20"
                >
                  <Icon name="fa-download" /> {t('export')}
                </button>
                {onSaveToDrive && (
                  <button 
                    onClick={onSaveToDrive} 
                    className={`text-xs px-3 py-1.5 hover:bg-green-600/20 flex items-center gap-2 transition-colors ${isDriveConnected ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title={isDriveConnected ? "Save to Google Drive" : "Configure Drive in Settings"}
                  >
                    <Icon name="fa-brands fa-google-drive" />
                  </button>
                )}
              </div>
            )
         )}
         
         {!apiKeyReady && (
           <button onClick={onConnect} className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded hover:bg-amber-500/20">
             <Icon name="fa-key" /> {t('connect_key')}
           </button>
         )}
      </div>
    </div>
  );
};

export default AppHeader;
