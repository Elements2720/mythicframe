
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ReferenceAsset, Rarity } from '../../types';
import { AETHELGARD_RACES } from '../../constants';

interface GachaBottomPanelProps {
  traits: string;
  onUpdateTraits: (val: string) => void;
  characterName: string;
  onUpdateName: (val: string) => void;
  characterSubtitle: string;
  onUpdateSubtitle: (val: string) => void;
  characterRace: string;
  onUpdateRace: (val: string) => void;
  characterRarity: Rarity;
  onUpdateRarity: (val: Rarity) => void;
  characterGender: string;
  onUpdateGender: (val: string) => void;
  isGenerating: boolean;
  onGenerateAll: () => void;
  onCancel: () => void;
  onAddSlot: () => void;
  onNewCharacter?: () => void; 
  referenceAssets: ReferenceAsset[];
  setReferenceAssets: React.Dispatch<React.SetStateAction<ReferenceAsset[]>>;
  isAnalyzing: boolean;
  onAnalyzeStyle: () => void;
  onSuggestTraits?: () => void;
  onSuggestConcept?: () => void;
  isSuggesting?: boolean;
  onMatchReferenceSize?: (asset: ReferenceAsset) => void;
  showRefs: boolean;
  setShowRefs: (val: boolean) => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const GachaBottomPanel: React.FC<GachaBottomPanelProps> = ({
  traits, onUpdateTraits, characterName, onUpdateName, characterSubtitle, onUpdateSubtitle,
  characterRace, onUpdateRace, characterGender, onUpdateGender,
  isGenerating, onGenerateAll, onCancel, onAddSlot, onNewCharacter,
  referenceAssets, setReferenceAssets, isAnalyzing, onAnalyzeStyle, onSuggestTraits, onSuggestConcept, isSuggesting,
  onMatchReferenceSize,
  showRefs, setShowRefs
}) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('mythic_gacha_height');
    return saved ? parseInt(saved) : 400;
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const currentHeightRef = useRef(height);

  useEffect(() => { 
    localStorage.setItem('mythic_gacha_height', String(height)); 
    currentHeightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(160, Math.min(window.innerHeight * 0.95, window.innerHeight - e.clientY));
      currentHeightRef.current = newHeight;
      if (panelRef.current) {
        panelRef.current.style.height = `${newHeight}px`;
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      setHeight(currentHeightRef.current);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => { 
      window.removeEventListener('mousemove', handleMouseMove); 
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
           try {
             const { optimizeBase64Image } = await import('../../utils/imageUtils');
             const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7);
             setReferenceAssets(prev => [...prev, { id: Date.now().toString(), url: optimized, roleNote: '' }]);
             setShowRefs(true);
           } catch(err) {}
        };
        reader.readAsDataURL(file);
    }
  };

  const selectedRace = AETHELGARD_RACES.find(r => r.id === characterRace);

  return (
    <div 
       ref={panelRef}
       className={`w-full bg-[#0b1120] border-t border-slate-800 z-40 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] shrink-0 relative ${
         isResizing ? '!transition-none select-none' : 'transition-all duration-200'
       }`}
       style={{ height: isMinimized ? 48 : height }}
    >
       <div 
         className="h-2 bg-slate-900/80 hover:bg-purple-600 cursor-ns-resize w-full flex items-center justify-center transition-colors group absolute -top-2 z-50 touch-none py-1" 
         onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
       >
         <div className="w-20 h-1 bg-slate-700 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
       </div>

       {/* Unified Toolbar */}
       <div className="h-12 flex items-center px-5 justify-between shrink-0 bg-[#0b1120] border-b border-slate-800/50 relative z-20">
          <div className="flex items-center gap-6">
             <button onClick={() => setShowRefs(!showRefs)} className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${showRefs ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'}`}><Icon name={showRefs ? "fa-eye-slash" : "fa-images"} /> {t('references')} {referenceAssets.length > 0 && <span className="bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded-full text-[9px]">{referenceAssets.length}</span>}</button>
             <div className="h-4 w-px bg-slate-800" />
             <button onClick={onAddSlot} className="text-[11px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider flex items-center gap-2 transition-all"><Icon name="fa-plus" /> Add Asset Slot</button>
             <button onClick={onNewCharacter} className="text-[11px] font-bold text-green-500 hover:text-green-400 uppercase tracking-wider flex items-center gap-2 transition-all"><Icon name="fa-user-plus" /> New Character</button>
          </div>
          <div className="flex items-center gap-4">
             {isSuggesting && <span className="text-[10px] text-purple-400 font-bold animate-pulse uppercase tracking-widest">Processing...</span>}
             <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-all"><Icon name={isMinimized ? "fa-chevron-up" : "fa-chevron-down"} /></button>
          </div>
       </div>

       {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
             {/* Integrated Refs Area */}
             {showRefs && (
               <div className="bg-[#0f172a] border-b border-slate-800/50 p-4 flex gap-4 overflow-x-auto custom-scrollbar shrink-0 animate-in slide-in-from-top-2 duration-300">
                  {referenceAssets.map(asset => (
                     <div key={asset.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex gap-3 w-72 shrink-0 group hover:border-purple-500/50 transition-colors shadow-lg">
                         <div className="relative w-20 h-20 shrink-0 bg-black rounded-lg overflow-hidden border border-slate-800"><img src={asset.url} className="w-full h-full object-cover" /><button onClick={() => setReferenceAssets(p => p.filter(r => r.id !== asset.id))} className="absolute top-0 right-0 bg-black/80 text-white w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"><Icon name="fa-times text-[10px]" /></button></div>
                         <div className="flex-1 flex flex-col gap-1.5"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('usage')}</span><textarea value={asset.roleNote} onChange={e => setReferenceAssets(p => p.map(a => a.id === asset.id ? { ...a, roleNote: e.target.value } : a))} placeholder="Usage notes..." className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 outline-none focus:border-purple-500/50 resize-none custom-scrollbar" /></div>
                     </div>
                  ))}
                  <label onDragOver={e => {e.preventDefault(); setIsDragOver(true);}} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`w-20 h-20 shrink-0 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 text-[8px] font-bold uppercase transition-all ${isDragOver ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-800/30'}`}><Icon name="fa-plus text-lg" /><span>{t('add_ref')}</span><input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = async () => { try { const { optimizeBase64Image } = await import('../../utils/imageUtils'); const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7); setReferenceAssets(p => [...p, { id: Date.now().toString(), url: optimized, roleNote: '' }]); setShowRefs(true); } catch(err){} }; reader.readAsDataURL(e.target.files[0]); } }} /></label>
                  {referenceAssets.length > 0 && <button onClick={onAnalyzeStyle} disabled={isAnalyzing} className="shrink-0 w-20 h-20 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-purple-400 hover:border-purple-500 transition-all disabled:opacity-30"><Icon name={isAnalyzing ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"} className="text-lg" /><span className="text-[8px] font-bold uppercase">Analyze</span></button>}
               </div>
             )}

             <div className="p-4 bg-[#0b1120] border-b border-slate-800/50 flex gap-4 shrink-0 overflow-x-auto custom-scrollbar">
                <div className="flex flex-col gap-1.5 w-48 shrink-0"><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Name</label><input type="text" value={characterName} onChange={e => onUpdateName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5 w-48 shrink-0"><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Subtitle</label><input type="text" value={characterSubtitle} onChange={e => onUpdateSubtitle(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5 w-40 shrink-0"><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Race</label><select value={characterRace} onChange={e => onUpdateRace(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none">{AETHELGARD_RACES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div className="flex flex-col gap-1.5 w-32 shrink-0"><label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Gender</label><select value={characterGender} onChange={e => onUpdateGender(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></div>
             </div>

             <div 
                className={`flex-1 p-4 flex gap-4 min-h-0 transition-colors ${isDragOver ? 'bg-purple-900/20' : 'bg-[#0b1120]'}`}
                onDragOver={e => {e.preventDefault(); setIsDragOver(true);}}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
             >
                <div className="flex-1 flex flex-col gap-2">
                   <div className="flex justify-between items-center"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Visual Trait Master Prompt</label><button onClick={onSuggestTraits} disabled={isSuggesting || !characterName} className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50"><Icon name="fa-sparkles" /> Suggest Traits</button></div>
                   <textarea value={traits} onChange={(e) => onUpdateTraits(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[13px] text-slate-100 outline-none focus:border-blue-600/50 transition-all resize-none font-medium italic leading-relaxed custom-scrollbar placeholder:text-slate-700 shadow-inner" placeholder="Physical constants (hair, eyes, armor)..." />
                </div>
                <div className="w-52 shrink-0 h-full pt-6">
                   {!isGenerating ? (
                        <button onClick={onGenerateAll} disabled={!traits} className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-900/30 flex flex-col items-center justify-center gap-2 border border-blue-500/20 group"><Icon name="fa-layer-group" className="text-3xl group-hover:scale-110 transition-transform" /><span className="text-[11px] tracking-widest uppercase">Generate Bible</span></button>
                    ) : (
                        <button onClick={onCancel} className="w-full h-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 animate-pulse"><Icon name="fa-stop text-3xl" /><span className="text-[11px] tracking-widest uppercase">Abort</span></button>
                    )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default GachaBottomPanel;
