
import React, { useRef, useEffect, useState } from 'react';
import { AnimationFrame, ReferenceAsset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { showInAppConfirm } from '../../services/dialogService';

interface AnimationTimelineProps {
  frames: AnimationFrame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onAddMultipleFrames?: (prompts: string[]) => void;
  onUpdateFramePrompt: (id: string, prompt: string) => void;
  onDeleteFrame: (id: string) => void;
  onDuplicateFrame: (id: string) => void;
  onGenerateFrame: (id: string) => void;
  onGenerateAnimation?: (promptOverride?: string) => void;
  onClearFrames?: () => void;
  isGenerating: boolean;
  onCancel?: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUploadFrameImage?: (id: string, file: File) => void;
  referenceAssets?: ReferenceAsset[];
  setReferenceAssets?: React.Dispatch<React.SetStateAction<ReferenceAsset[]>>;
  isAnalyzing?: boolean;
  onAnalyzeStyle?: () => void;
  handleCreateSpinAnimation?: (subject: string) => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  frames, selectedFrameId, onSelectFrame,
  onAddFrame, onAddMultipleFrames, onUpdateFramePrompt, onDeleteFrame, onDuplicateFrame,
  onGenerateFrame, onGenerateAnimation, onClearFrames, isGenerating, onCancel,
  isPlaying, onTogglePlay, onUploadFrameImage,
  referenceAssets, setReferenceAssets, isAnalyzing, onAnalyzeStyle,
  handleCreateSpinAnimation
}) => {
  const { t } = useLanguage();
  const activeFrameIndex = frames.findIndex(f => f.id === selectedFrameId);
  const activeFrame = frames[activeFrameIndex];
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showRefs, setShowRefs] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('mythic_anim_height');
    return saved ? parseInt(saved) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [generateMode, setGenerateMode] = useState<'single' | 'all'>('single');
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const currentHeightRef = useRef(panelHeight);

  useEffect(() => {
    localStorage.setItem('mythic_anim_height', String(panelHeight));
    currentHeightRef.current = panelHeight;
  }, [panelHeight]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Check for internal draggable urls first
    const url = e.dataTransfer.getData('application/mythic-image-url') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('blob:') || url.startsWith('data:image/') || url.startsWith('http'))) {
      if (setReferenceAssets) {
        setReferenceAssets(p => [...p, { id: Date.now().toString() + Math.random(), url: url, roleNote: '' }]);
        setShowRefs(true);
      }
      return;
    }
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/') && setReferenceAssets) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const { optimizeBase64Image } = await import('../../utils/imageUtils');
            const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7);
            setReferenceAssets(p => [...p, { id: Date.now().toString() + Math.random(), url: optimized, roleNote: '' }]);
            setShowRefs(true);
          } catch(err){}
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            const { parseBatchFile } = await import('../../utils/batchParser');
            const items = parseBatchFile(reader.result, file.name);
            
            // If parsed successfully as batch items
            if (items && items.length > 0 && onAddMultipleFrames) {
              const prompts = items.map(item => `${item.name}: ${item.prompt}`);
              onAddMultipleFrames(prompts);
            } else if (onAddMultipleFrames) {
              // Fallback to simple line-by-line if parser fails or returns empty
              const prompts = reader.result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              if (prompts.length > 0) {
                 onAddMultipleFrames(prompts);
              }
            }
          }
        };
        reader.readAsText(file);
      }
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [frames.length]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(160, Math.min(window.innerHeight * 0.9, window.innerHeight - e.clientY));
      currentHeightRef.current = newHeight;
      if (panelRef.current) {
        panelRef.current.style.height = `${newHeight}px`;
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      setPanelHeight(currentHeightRef.current);
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

  const handleGenerateClick = () => {
    if (generateMode === 'all' && onGenerateAnimation) onGenerateAnimation(globalPrompt);
    else onGenerateFrame(activeFrame.id);
  };

  return (
    <div 
       ref={panelRef}
       className={`w-full bg-[#0b1120] border-t border-slate-800 z-40 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] shrink-0 relative ${
         isResizing ? '!transition-none select-none' : 'transition-all duration-200'
       }`}
       style={{ height: isMinimized ? 48 : panelHeight }}
    >
      <div 
        className="h-2 bg-slate-900/80 hover:bg-purple-600 cursor-ns-resize w-full flex items-center justify-center transition-colors group absolute -top-2 z-50 touch-none py-1" 
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      >
         <div className="w-20 h-1 bg-slate-700 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
      </div>
      
      {/* Unified Toolbar */}
      <div className="h-12 border-b border-slate-800 flex items-center px-5 justify-between bg-[#0b1120] relative z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button onClick={onTogglePlay} className={`w-10 h-7 rounded-lg flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}><Icon name={isPlaying ? "fa-pause" : "fa-play"} className="text-xs" /></button>
            <span className="text-[11px] font-bold text-slate-100 uppercase tracking-widest">{frames.length} {t('frames')}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <button onClick={() => setShowRefs(!showRefs)} className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${showRefs ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'}`}>
             <Icon name={showRefs ? "fa-eye-slash" : "fa-images"} /> {t('references')}
             {referenceAssets && referenceAssets.length > 0 && <span className="bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded-full text-[9px]">{referenceAssets.length}</span>}
          </button>
          <button onClick={() => handleCreateSpinAnimation?.(globalPrompt || activeFrame?.prompt)} className="text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-2"><Icon name="fa-sync" /> {t('magic_spin')}</button>
        </div>

        <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-all">
           <Icon name={isMinimized ? "fa-chevron-up" : "fa-chevron-down"} />
        </button>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Unified Collapsible Refs */}
            {showRefs && referenceAssets && setReferenceAssets && (
               <div className="bg-[#0f172a] border-b border-slate-800/50 p-4 flex gap-4 overflow-x-auto custom-scrollbar shrink-0 animate-in slide-in-from-top-2 duration-300">
                   {referenceAssets.map(asset => (
                      <div key={asset.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex gap-3 w-72 shrink-0 group hover:border-purple-500/50 transition-colors shadow-lg">
                         <div className="relative w-20 h-20 shrink-0 bg-black rounded-lg overflow-hidden border border-slate-800">
                            <img src={asset.url} className="w-full h-full object-cover" />
                            <button onClick={() => setReferenceAssets(p => p.filter(r => r.id !== asset.id))} className="absolute top-0 right-0 bg-black/80 text-white w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"><Icon name="fa-times text-[10px]" /></button>
                         </div>
                         <div className="flex-1 flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('usage')}</span>
                            <textarea value={asset.roleNote} onChange={e => setReferenceAssets(p => p.map(a => a.id === asset.id ? { ...a, roleNote: e.target.value } : a))} placeholder="Usage notes..." className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 outline-none focus:border-purple-500/50 resize-none custom-scrollbar" />
                         </div>
                      </div>
                   ))}
                   <label onDragOver={e => {e.preventDefault(); setIsDragOver(true);}} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`w-20 h-20 shrink-0 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ${isDragOver ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-slate-800 text-slate-500 hover:text-purple-400 hover:border-purple-500 hover:bg-slate-800/30'}`}>
                       <Icon name="fa-plus text-lg" /><span className="text-[8px] font-bold uppercase">{t('add_ref')}</span>
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = async () => { try { const { optimizeBase64Image } = await import('../../utils/imageUtils'); const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7); setReferenceAssets(p => [...p, { id: Date.now().toString(), url: optimized, roleNote: '' }]); setShowRefs(true); } catch(err){} }; reader.readAsDataURL(e.target.files[0]); } }} />
                   </label>
               </div>
            )}

            {/* Timeline Strip */}
            <div className="h-24 bg-slate-950 border-b border-slate-800 overflow-x-auto flex items-center px-4 gap-2.5 custom-scrollbar shrink-0" ref={scrollRef}>
               {frames.map((frame, index) => (
                  <div key={frame.id} onClick={() => onSelectFrame(frame.id)} className={`relative shrink-0 w-24 h-16 rounded-xl border-2 cursor-pointer transition-all group overflow-hidden bg-slate-900 ${selectedFrameId === frame.id ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-slate-800 hover:border-slate-600'}`}>
                     {frame.imageUrl ? <img src={frame.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 text-[10px] font-mono">{index + 1}</div>}
                     <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] px-1.5 font-mono rounded-tr-lg">{index + 1}</div>
                     <button onClick={(e) => { e.stopPropagation(); onSelectFrame(frame.id); setTimeout(() => fileInputRef.current?.click(), 50); }} className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-purple-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg"><Icon name="fa-upload text-[10px]" /></button>
                  </div>
               ))}
               <button onClick={onAddFrame} className="shrink-0 w-24 h-16 rounded-xl border-2 border-dashed border-slate-800 hover:border-purple-600 hover:bg-purple-900/10 text-slate-600 hover:text-purple-400 transition-all"><Icon name="fa-plus" /></button>
               <div className="h-10 w-px bg-slate-800 mx-2" />
               <button onClick={async () => { const ok = await showInAppConfirm(t('confirm_clear'), { title: 'Clear Frames', isDestructive: true }); if (ok) onClearFrames?.(); }} className="shrink-0 w-10 h-16 rounded-xl hover:bg-red-900/20 text-slate-700 hover:text-red-400 transition-all"><Icon name="fa-trash" /></button>
            </div>

            {/* Prompt & Action Section */}
            <div 
                className={`flex-1 p-4 flex gap-4 min-h-0 transition-colors ${isDragOver ? 'bg-purple-900/20' : 'bg-[#0b1120]'}`}
                onDragOver={e => {e.preventDefault(); setIsDragOver(true);}}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
               <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                     <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setGenerateMode('single')} className={`px-4 py-1.5 text-[10px] rounded-md transition-all font-bold uppercase tracking-tight ${generateMode === 'single' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('frame_only')}</button>
                        <button onClick={() => setGenerateMode('all')} className={`px-4 py-1.5 text-[10px] rounded-md transition-all font-bold uppercase tracking-tight ${generateMode === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('all_frames')}</button>
                     </div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{generateMode === 'all' ? t('global_prompt') : t('frame_prompt', [String(activeFrameIndex + 1)])}</span>
                  </div>
                  <textarea value={generateMode === 'all' ? globalPrompt : activeFrame?.prompt} onChange={(e) => generateMode === 'all' ? setGlobalPrompt(e.target.value) : onUpdateFramePrompt(activeFrame.id, e.target.value)} className={`flex-1 bg-slate-950 border rounded-2xl p-4 text-[13px] text-slate-100 outline-none transition-all resize-none font-medium leading-relaxed custom-scrollbar placeholder:text-slate-700 ${generateMode === 'all' ? 'border-purple-600/30 focus:border-purple-500' : 'border-slate-800 focus:border-blue-500/50'}`} placeholder={generateMode === 'all' ? "Describe the global sequence movement..." : "Describe this specific animation frame..."} />
               </div>
               
               <div className="w-52 shrink-0 h-full pt-8">
                  {isGenerating ? (
                     <button onClick={onCancel} className="w-full h-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 animate-pulse"><Icon name="fa-stop text-2xl" /><span className="text-[11px] tracking-widest uppercase">{t('cancel')}</span></button>
                  ) : (
                     <button onClick={handleGenerateClick} disabled={generateMode === 'all' ? !globalPrompt : !activeFrame?.prompt} className={`w-full h-full text-white rounded-2xl font-black transition-all shadow-xl flex flex-col items-center justify-center gap-2 border border-white/10 group ${generateMode === 'all' ? 'bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-900/30' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-900/30'}`}>
                        <Icon name={generateMode === 'all' ? "fa-layer-group" : "fa-wand-magic-sparkles"} className="text-2xl group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] tracking-widest uppercase">{generateMode === 'all' ? t('gen_all') : t('gen_frame')}</span>
                     </button>
                  )}
               </div>
            </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0] && onUploadFrameImage && activeFrame) onUploadFrameImage(activeFrame.id, e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
};

export default AnimationTimeline;
