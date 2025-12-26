import React, { useState, useEffect } from 'react';
import { INSPIRATION_CATEGORIES } from '../../constants';
import { GameContext, ReferenceAsset, UIMode } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface PromptPanelProps {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isGenerating: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  gameContext: GameContext;
  showInspiration: boolean;
  setShowInspiration: (show: boolean) => void;
  isSuggesting?: boolean;
  
  // Reference Assets
  referenceAssets: ReferenceAsset[];
  setReferenceAssets: React.Dispatch<React.SetStateAction<ReferenceAsset[]>>;
  onMatchReferenceSize: (asset: ReferenceAsset) => void;
  isAnalyzing: boolean;
  onAnalyzeStyle: () => void;
  onRefinePrompt: () => void;
  onUndoPrompt?: () => void;
  mode?: UIMode;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const PromptPanel: React.FC<PromptPanelProps> = ({
  prompt, setPrompt, isGenerating, onGenerate, onCancel,
  gameContext, showInspiration, setShowInspiration, isSuggesting,
  referenceAssets, setReferenceAssets, onMatchReferenceSize, isAnalyzing, onAnalyzeStyle, onRefinePrompt,
  onUndoPrompt, mode
}) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('mythic_bottom_height');
    return saved ? parseInt(saved) : 300;
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    localStorage.setItem('mythic_bottom_height', String(height));
  }, [height]);

  const processFile = (file: File) => {
    if (!(file instanceof Blob)) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const newAsset: ReferenceAsset = {
        id: Date.now().toString(),
        url: result,
        roleNote: ''
      };
      setReferenceAssets(prev => [...prev, newAsset]);
      setShowRefs(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.9) {
        setHeight(newHeight);
        if (isMinimized) setIsMinimized(false);
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  const setAssetRole = (id: string, role: 'mannequin' | 'style') => {
      const roleText = role === 'mannequin' ? 'Role: Mannequin (Pose & Body Reference)' : 'Role: Style (Texture & Aesthetic Reference)';
      setReferenceAssets(prev => prev.map(a => a.id === id ? { ...a, roleNote: roleText } : a));
  };

  return (
    <div 
       className="w-full bg-[#0b1120] border-t border-slate-800 z-40 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] shrink-0 transition-[height] duration-300 relative"
       style={{ height: isMinimized ? 48 : height }}
    >
       {/* Resizer Handle */}
       <div 
          className="h-1.5 bg-slate-900 hover:bg-purple-600 cursor-ns-resize w-full flex items-center justify-center transition-colors group absolute -top-1.5 z-50"
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
       >
         <div className="w-20 h-1 bg-slate-700 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
       </div>

       {/* Toolbar Header */}
       <div className="h-12 flex items-center px-5 justify-between shrink-0 bg-[#0b1120] border-b border-slate-800/50 relative z-20">
          <div className="flex items-center gap-6">
             <button 
                onClick={() => setShowRefs(!showRefs)}
                className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${showRefs ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Icon name={showRefs ? "fa-eye-slash" : "fa-images"} className="text-xs" />
                {t('references')}
                {referenceAssets.length > 0 && <span className="bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded-full text-[9px] border border-purple-500/30">{referenceAssets.length}</span>}
             </button>
             <div className="h-4 w-px bg-slate-800" />
             <div className="flex items-center gap-4">
                <button onClick={() => setShowInspiration(!showInspiration)} className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${showInspiration ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}><Icon name="fa-lightbulb" /> {t('inspire_me')}</button>
                <button onClick={onRefinePrompt} disabled={!prompt} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-400 hover:text-slate-200 disabled:opacity-30"><Icon name="fa-sparkles" /> {t('refine')}</button>
                {onUndoPrompt && <button onClick={onUndoPrompt} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-400 hover:text-slate-200"><Icon name="fa-rotate-left" /> {t('undo')}</button>}
             </div>
          </div>
          <div className="flex items-center gap-4">
             {isSuggesting && <span className="text-[10px] text-purple-400 font-bold animate-pulse uppercase tracking-widest">Processing...</span>}
             <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-all">
                <Icon name={isMinimized ? "fa-chevron-up" : "fa-chevron-down"} />
             </button>
          </div>
       </div>

       <div className={`flex-1 flex flex-col min-h-0 ${isMinimized ? 'hidden' : 'block'}`}>
          {/* Collapsible Reference Area */}
          {showRefs && (
            <div className="bg-[#0f172a] border-b border-slate-800/50 p-4 flex gap-4 overflow-x-auto custom-scrollbar shrink-0 animate-in slide-in-from-top-2 duration-300">
               {referenceAssets.map(asset => {
                  const isMannequin = asset.roleNote.toLowerCase().includes('mannequin');
                  const isStyle = asset.roleNote.toLowerCase().includes('style');
                  
                  return (
                    <div key={asset.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex gap-3 w-[360px] shrink-0 group hover:border-purple-500/50 transition-colors shadow-lg">
                        <div className="relative shrink-0 w-24 h-24">
                          <img src={asset.url} className="w-full h-full object-cover rounded-lg bg-black border border-slate-800" />
                          <button onClick={() => onMatchReferenceSize(asset)} className="absolute inset-x-0 bottom-0 bg-black/80 hover:bg-blue-600 text-white text-[9px] py-1 text-center backdrop-blur-md rounded-b-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">MATCH SIZE</button>
                        </div>
                        <div className="flex flex-col flex-1 gap-2 min-w-0">
                          <div className="flex justify-between items-center">
                              <div className="flex gap-1.5">
                                 <button 
                                    onClick={() => setAssetRole(asset.id, 'mannequin')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${isMannequin ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                    title={t('ref_role_mannequin')}
                                 >
                                    <Icon name="fa-user-check" className="mr-1" /> {t('ref_role_mannequin_short')}
                                 </button>
                                 <button 
                                    onClick={() => setAssetRole(asset.id, 'style')}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${isStyle ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                    title={t('ref_role_style')}
                                 >
                                    <Icon name="fa-palette" className="mr-1" /> {t('ref_role_style_short')}
                                 </button>
                              </div>
                              <button onClick={() => setReferenceAssets(prev => prev.filter(a => a.id !== asset.id))} className="text-slate-600 hover:text-red-400 p-1"><Icon name="fa-times" /></button>
                          </div>
                          <textarea 
                              placeholder="Usage notes..."
                              value={asset.roleNote}
                              onChange={(e) => setReferenceAssets(prev => prev.map(a => a.id === asset.id ? { ...a, roleNote: e.target.value } : a))}
                              className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-purple-500/50 resize-none leading-relaxed custom-scrollbar font-medium"
                          />
                        </div>
                    </div>
                  );
               })}
               <label onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`shrink-0 w-24 h-24 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center text-[10px] font-bold gap-2 transition-all ${isDragOver ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-800/30'}`}>
                 <Icon name="fa-plus" className="text-lg" />
                 <input type="file" className="hidden" accept="image/*" onChange={handleRefUpload} />
               </label>
               {referenceAssets.length > 0 && (
                  <button onClick={onAnalyzeStyle} disabled={isAnalyzing} className="shrink-0 w-24 h-24 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-purple-400 hover:border-purple-500 transition-all disabled:opacity-30">
                    <Icon name={isAnalyzing ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"} className="text-lg" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Analyze</span>
                  </button>
               )}
            </div>
          )}

          {/* Inspiration Tags */}
          {showInspiration && (
             <div className="bg-[#0f172a] p-3 border-b border-slate-800/50 grid grid-cols-4 gap-4 text-[10px] overflow-y-auto max-h-32 shrink-0 animate-in fade-in duration-200">
                {Object.entries(INSPIRATION_CATEGORIES).map(([cat, tags]) => (
                   <div key={cat} className="space-y-1.5">
                      <strong className="text-slate-500 block uppercase tracking-widest text-[9px] font-black">{cat}</strong>
                      <div className="flex flex-wrap gap-1.5">
                         {tags.map(t => <button key={t} onClick={() => { setPrompt(p => p + (p ? ', ' : '') + t); setShowInspiration(false); }} className="px-2 py-1 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded border border-slate-700 hover:border-purple-500 transition-all font-bold">{t}</button>)}
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* Main Prompt & Generate Row */}
          <div className="flex-1 p-4 flex gap-4 min-h-0 bg-[#0b1120]">
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[13px] text-slate-100 outline-none focus:border-purple-600/50 transition-all resize-none font-medium leading-relaxed custom-scrollbar placeholder:text-slate-700"
                placeholder={mode === 'ui-reimagine' ? t('describe_ui') : t('describe_illustration')}
             />
             <div className="w-52 shrink-0 h-full">
               {!isGenerating ? (
                  <button onClick={onGenerate} disabled={!prompt} className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-2xl font-black transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-purple-900/30 flex flex-col items-center justify-center gap-2 border border-purple-500/20 group">
                     <Icon name="fa-paintbrush" className="text-2xl group-hover:scale-110 transition-transform" />
                     <span className="text-[11px] tracking-widest uppercase">{t('generate')}</span>
                  </button>
               ) : (
                  <button onClick={onCancel} className="w-full h-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 animate-pulse">
                     <Icon name="fa-stop" className="text-2xl" />
                     <span className="text-[11px] tracking-widest uppercase">{t('cancel')}</span>
                  </button>
               )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default PromptPanel;