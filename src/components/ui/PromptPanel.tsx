
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

const PromptPanel: React.FC<PromptPanelProps> = ({
  prompt, setPrompt, isGenerating, onGenerate, onCancel,
  gameContext, showInspiration, setShowInspiration, isSuggesting,
  referenceAssets, setReferenceAssets, onMatchReferenceSize, isAnalyzing, onAnalyzeStyle, onRefinePrompt,
  onUndoPrompt, mode
}) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState(350); 
  const [isDragging, setIsDragging] = useState(false);
  const [showRefs, setShowRefs] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const newAsset: ReferenceAsset = {
        id: Date.now().toString(),
        url: result,
        roleNote: ''
      };
      setReferenceAssets(prev => [...prev, newAsset]);
    };
    reader.readAsDataURL(file);
  };

  // Reference Upload Handler
  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       processFile(file);
    }
  };

  const updateReferenceNote = (id: string, note: string) => {
    setReferenceAssets(prev => prev.map(a => a.id === id ? { ...a, roleNote: note } : a));
  };
  
  const removeReferenceAsset = (id: string) => {
    setReferenceAssets(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 150 && newHeight < 800) {
          setHeight(newHeight);
        }
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const getPlaceholder = () => {
    if (mode === 'frame') return t('describe_frame');
    if (mode === 'background') return t('describe_bg');
    if (mode === 'clothes') return t('describe_clothes');
    return t('describe_illustration');
  };

  return (
    <div 
       className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.3)]"
       style={{ height: height }}
    >
       {/* Resizer Handle */}
       <div 
          className="h-1.5 bg-slate-800 hover:bg-purple-500 cursor-ns-resize w-full flex items-center justify-center transition-colors group"
          onMouseDown={() => setIsDragging(true)}
       >
         <div className="w-16 h-1 bg-slate-600 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
       </div>

       <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          
          {/* Reference Header / Toggle */}
          <div className="flex items-center gap-4 shrink-0">
             <button 
                onClick={() => setShowRefs(!showRefs)}
                className="text-xs font-bold text-slate-500 hover:text-purple-400 uppercase tracking-wider flex items-center gap-2 transition-colors select-none focus:outline-none"
             >
                <i className={`fa-solid fa-chevron-${showRefs ? 'down' : 'right'} w-4 text-center transition-transform`} />
                {t('references')}
                {referenceAssets.length > 0 && (
                   <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full text-[9px] border border-slate-700">
                      {referenceAssets.length}
                   </span>
                )}
             </button>

             {/* Mini Preview when collapsed */}
             {!showRefs && referenceAssets.length > 0 && (
                 <div className="flex -space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    {referenceAssets.slice(0, 5).map(a => (
                        <div key={a.id} className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800 overflow-hidden ring-2 ring-slate-900 relative">
                           <img src={a.url} className="w-full h-full object-cover" />
                        </div>
                    ))}
                    {referenceAssets.length > 5 && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-400 ring-2 ring-slate-900 z-10">
                           +{referenceAssets.length - 5}
                        </div>
                    )}
                 </div>
             )}
          </div>

          {/* Top Bar: Controls & Ref Thumbnails */}
          {showRefs && (
            <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 custom-scrollbar items-start min-h-[160px] animate-in slide-in-from-top-2 fade-in duration-200">
               {/* Reference List */}
               {referenceAssets.map(asset => (
                  <div key={asset.id} className="bg-slate-950 p-3 rounded-lg border border-slate-700 flex gap-3 w-96 shrink-0 group relative shadow-sm hover:border-purple-500/50 transition-colors">
                      <div className="relative shrink-0 w-28 h-28">
                        <img src={asset.url} className="w-full h-full object-cover rounded-md bg-slate-900 border border-slate-800" />
                        <div className="absolute inset-x-0 bottom-0 flex flex-col">
                           <button 
                             onClick={() => onMatchReferenceSize(asset)} 
                             className="bg-black/70 hover:bg-blue-600 text-white text-[10px] py-1.5 text-center backdrop-blur-md rounded-b-md transition-colors font-medium border-t border-white/10"
                             title="Set generation resolution to match this image"
                           >
                              Match Size
                           </button>
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 gap-1 min-w-0 h-28">
                        <div className="flex justify-between items-center h-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role / Intent</span>
                            <button 
                              onClick={() => removeReferenceAsset(asset.id)} 
                              className="text-slate-600 hover:text-red-400 p-1 -mr-1 transition-colors"
                              title="Remove Reference"
                            >
                              <i className="fa-solid fa-times" />
                            </button>
                        </div>
                        <textarea 
                            placeholder="How should this image be used? (e.g. 'Use this character', 'Copy palette')"
                            value={asset.roleNote}
                            onChange={(e) => updateReferenceNote(asset.id, e.target.value)}
                            className="w-full flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-purple-500 outline-none resize-none leading-relaxed placeholder:text-slate-600 custom-scrollbar"
                        />
                      </div>
                  </div>
               ))}

               <label 
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}
                 className={`shrink-0 w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center text-xs text-slate-400 gap-2 transition-all group mt-2 ${isDragOver ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 hover:bg-slate-800/30'}`}
               >
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-purple-500 text-white' : 'bg-slate-800 group-hover:bg-purple-500/20'}`}>
                   <i className={`fa-solid fa-plus text-lg ${isDragOver ? 'text-white' : 'group-hover:text-purple-400'}`} />
                 </div>
                 <span className="font-medium">{isDragOver ? 'Drop Image' : t('add_ref')}</span>
                 <input type="file" className="hidden" accept="image/*" onChange={handleRefUpload} />
               </label>

               {referenceAssets.length > 0 && (
                  <button 
                    onClick={onAnalyzeStyle}
                    disabled={isAnalyzing}
                    className="shrink-0 w-32 h-32 mt-2 bg-slate-800/50 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition-colors flex flex-col items-center justify-center gap-2 text-slate-300 group"
                  >
                    <div className={`w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : 'group-hover:border-purple-500'}`}>
                       {isAnalyzing ? <i className="fa-solid fa-spinner fa-spin text-purple-500" /> : <i className="fa-solid fa-wand-magic-sparkles text-purple-400" />}
                    </div>
                    <span className="font-medium">{t('analyze_style')}</span>
                  </button>
               )}
            </div>
          )}

          {/* Inspiration & Context Bar */}
          <div className="flex items-center justify-between shrink-0">
             <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowInspiration(!showInspiration)} 
                  className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${showInspiration ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                   <i className="fa-solid fa-lightbulb" /> {t('inspire_me')}
                </button>
                <button 
                   onClick={onRefinePrompt}
                   disabled={!prompt}
                   className="text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                   title="Fix grammar & format (Strict)"
                >
                   <i className="fa-solid fa-sparkles" /> {t('refine')}
                </button>
                
                {/* Undo Button */}
                {onUndoPrompt && (
                   <button 
                      onClick={onUndoPrompt}
                      className="text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 hover:border-slate-500"
                      title="Undo Refine"
                   >
                      <i className="fa-solid fa-rotate-left" /> {t('undo')}
                   </button>
                )}

                {gameContext.setting && (
                   <span className="text-[10px] px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <i className="fa-solid fa-book" /> {t('context_active')}
                   </span>
                )}
             </div>
             {isSuggesting && <span className="text-[10px] text-purple-400 animate-pulse">Generating suggestions...</span>}
          </div>

          {/* Inspiration Panel (Collapsible) */}
          {showInspiration && (
             <div className="bg-slate-800 p-2 rounded grid grid-cols-4 gap-3 text-[10px] overflow-y-auto max-h-32 shrink-0 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                {Object.entries(INSPIRATION_CATEGORIES).map(([cat, tags]) => (
                   <div key={cat}>
                      <strong className="text-slate-400 block mb-1 uppercase tracking-wider text-[9px]">{cat}</strong>
                      <div className="flex flex-wrap gap-1">
                         {tags.map(t => (
                           <button 
                             key={t} 
                             onClick={() => { setPrompt(p => p + (p ? ', ' : '') + t); setShowInspiration(false); }} 
                             className="px-2 py-1 bg-slate-700 hover:bg-purple-600 hover:text-white rounded text-slate-300 transition-colors"
                           >
                             {t}
                           </button>
                         ))}
                      </div>
                   </div>
                ))}
             </div>
          )}

          {/* Prompt Input & Generate */}
          <div className="flex gap-2 flex-1 min-h-0">
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 outline-none focus:border-purple-500 resize-none font-sans leading-relaxed custom-scrollbar"
                placeholder={getPlaceholder()}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenerate(); }}}
             />
             <div className="flex flex-col gap-2 w-48">
               {!isGenerating ? (
                  <button 
                     onClick={onGenerate} 
                     disabled={!prompt} 
                     className="flex-1 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/40 flex items-center justify-center gap-3 group border border-purple-500/20"
                  >
                     <div className="flex flex-col items-center">
                        <i className="fa-solid fa-paintbrush text-xl group-hover:scale-110 transition-transform mb-1" />
                        <span className="text-xs tracking-wider uppercase">{t('generate')}</span>
                     </div>
                  </button>
               ) : (
                  <button 
                     onClick={onCancel} 
                     className="flex-1 bg-red-900/80 hover:bg-red-800 text-red-100 rounded font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 animate-pulse border border-red-500/30"
                  >
                     <i className="fa-solid fa-stop" />
                     <span>{t('cancel').toUpperCase()}</span>
                  </button>
               )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default PromptPanel;
