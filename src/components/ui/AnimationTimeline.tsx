
import React, { useRef, useEffect, useState } from 'react';
import { AnimationFrame, ReferenceAsset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface AnimationTimelineProps {
  frames: AnimationFrame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
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
  
  // Reference Assets Support
  referenceAssets?: ReferenceAsset[];
  setReferenceAssets?: React.Dispatch<React.SetStateAction<ReferenceAsset[]>>;
  isAnalyzing?: boolean;
  onAnalyzeStyle?: () => void;
  
  // New Spin Feature
  handleCreateSpinAnimation?: (subject: string) => void;
}

const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  frames, selectedFrameId, onSelectFrame,
  onAddFrame, onUpdateFramePrompt, onDeleteFrame, onDuplicateFrame,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelHeight, setPanelHeight] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [generateMode, setGenerateMode] = useState<'single' | 'all'>('single');
  const [globalPrompt, setGlobalPrompt] = useState('');

  // Auto-scroll to new frames
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [frames.length]);

  // Sync global prompt with active frame when switching modes initially
  useEffect(() => {
    if (generateMode === 'all' && activeFrame && !globalPrompt) {
      setGlobalPrompt(activeFrame.prompt);
    }
  }, [generateMode]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 200 && newHeight < 600) {
          setPanelHeight(newHeight);
        }
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const copyPreviousPrompt = () => {
     if (activeFrameIndex > 0) {
        const prevPrompt = frames[activeFrameIndex - 1].prompt;
        if(prevPrompt) onUpdateFramePrompt(activeFrame.id, prevPrompt);
     }
  };

  // --- Reference Logic ---
  const processRefFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const newAsset: ReferenceAsset = {
        id: Date.now().toString(),
        url: result,
        roleNote: ''
      };
      if (setReferenceAssets) setReferenceAssets(prev => [...prev, newAsset]);
    };
    reader.readAsDataURL(file);
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processRefFile(file);
    e.target.value = ''; // Reset input
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processRefFile(file);
  };

  const handleFrameDrop = (e: React.DragEvent, frameId: string) => {
     e.preventDefault(); e.stopPropagation();
     const file = e.dataTransfer.files?.[0];
     if (file && file.type.startsWith('image/') && onUploadFrameImage) {
        onUploadFrameImage(frameId, file);
     }
  };
  
  const removeRef = (id: string) => {
     if(setReferenceAssets) setReferenceAssets(prev => prev.filter(a => a.id !== id));
  };
  
  const updateRefNote = (id: string, note: string) => {
     if(setReferenceAssets) setReferenceAssets(prev => prev.map(a => a.id === id ? { ...a, roleNote: note } : a));
  };

  const handleGenerateClick = () => {
    if (generateMode === 'all' && onGenerateAnimation) {
      onGenerateAnimation(globalPrompt);
    } else {
      onGenerateFrame(activeFrame.id);
    }
  };

  const onSpinClick = () => {
     if (handleCreateSpinAnimation) {
        const subject = globalPrompt || activeFrame?.prompt;
        if (!subject) {
           alert("Please enter a subject in the prompt first.");
           return;
        }
        if(confirm("This will replace current frames with an 8-frame spin animation of: " + subject)) {
           handleCreateSpinAnimation(subject);
        }
     }
  };

  return (
    <div 
       className={`w-full bg-slate-900 border-t border-slate-800 z-40 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.3)] transition-all duration-300 shrink-0 relative`}
       style={{ height: isMinimized ? '50px' : panelHeight }}
    >
      {/* Resizer Handle */}
      <div 
         className="h-1.5 bg-slate-800 hover:bg-purple-500 cursor-ns-resize w-full flex items-center justify-center transition-colors group absolute -top-1.5 z-50"
         onMouseDown={() => { setIsResizing(true); setIsMinimized(false); }}
      >
         <div className="w-16 h-1 bg-slate-600 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
      </div>
      
      {/* Header */}
      <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/95 backdrop-blur shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={onTogglePlay}
              className={`w-10 h-8 rounded flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
            >
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
            </button>
            <span className="text-xs text-slate-500 font-mono ml-2">
              {frames.length} {t('frames')}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800"></div>

          {/* Reference Toggle - Main Panel Toggle */}
          {referenceAssets && setReferenceAssets && (
             <button 
                onClick={() => setShowRefs(!showRefs)}
                className={`text-xs flex items-center gap-2 px-2 py-1 rounded transition-colors ${showRefs ? 'bg-purple-900/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
             >
                <i className="fa-solid fa-images" /> 
                {t('references')}
                {referenceAssets.length > 0 && <span className="bg-slate-700 text-white px-1.5 rounded-full text-[9px]">{referenceAssets.length}</span>}
                <i className={`fa-solid fa-chevron-${showRefs ? 'down' : 'up'} text-[9px] ml-1`} />
             </button>
          )}
          
          {handleCreateSpinAnimation && (
             <button 
                onClick={onSpinClick}
                className="text-xs flex items-center gap-2 px-2 py-1 rounded transition-colors hover:bg-slate-800 text-purple-400 border border-purple-500/20"
                title={t('gen_spin')}
             >
                <i className="fa-solid fa-sync" /> {t('magic_spin')}
             </button>
          )}
        </div>

        <div className="flex items-center gap-3">
           <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
           >
              <i className={`fa-solid fa-chevron-${isMinimized ? 'up' : 'down'}`} />
           </button>
        </div>
      </div>

      {/* Main Content (Hidden if minimized) */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0">
            
            {/* REFERENCE ASSETS PANEL (Expandable ABOVE Prompt) */}
            {showRefs && referenceAssets && setReferenceAssets && (
               <div className="flex flex-col bg-slate-950 border-b border-slate-800 shrink-0">
                   <div className="px-3 py-1 flex justify-between items-center bg-slate-900/50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{t('ref_library')}</span>
                      <button onClick={() => setShowRefs(false)} className="text-slate-500 hover:text-white px-2">
                         <i className="fa-solid fa-chevron-up text-xs" />
                      </button>
                   </div>
                   <div className="h-[130px] p-3 flex gap-3 overflow-x-auto animate-in slide-in-from-top-2 fade-in">
                       {referenceAssets.map(asset => (
                          <div key={asset.id} className="bg-slate-900 p-2 rounded border border-slate-700 flex gap-2 w-64 shrink-0 group">
                             <div className="relative w-20 h-20 shrink-0 bg-black rounded overflow-hidden">
                                <img src={asset.url} className="w-full h-full object-cover" />
                                <button onClick={() => removeRef(asset.id)} className="absolute top-0 right-0 bg-slate-900/80 text-white w-5 h-5 flex items-center justify-center hover:bg-red-500">
                                   <i className="fa-solid fa-times text-[10px]" />
                                </button>
                             </div>
                             <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{t('usage')}</span>
                                <textarea 
                                   value={asset.roleNote}
                                   onChange={e => updateRefNote(asset.id, e.target.value)}
                                   placeholder="e.g. Character design"
                                   className="w-full flex-1 bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-300 resize-none outline-none focus:border-purple-500"
                                />
                             </div>
                          </div>
                       ))}
                       
                       <label 
                           onDragOver={handleDragOver}
                           onDragLeave={handleDragLeave}
                           onDrop={handleDrop}
                           className={`w-24 h-24 shrink-0 border-2 border-dashed rounded cursor-pointer flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-purple-400 hover:bg-slate-900/50 transition-colors ${isDragOver ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800'}`}
                       >
                           <i className="fa-solid fa-plus text-lg" />
                           <span className="text-[9px] font-bold uppercase">{t('add_ref')}</span>
                           <input type="file" className="hidden" accept="image/*" onChange={handleRefUpload} />
                       </label>
                   </div>
               </div>
            )}

            {/* Prompt & Controls */}
            <div className="flex-1 flex overflow-hidden">
               {activeFrame ? (
                  <div className="flex-1 p-4 flex flex-col gap-2 relative">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           {generateMode === 'all' ? (
                               <span className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                                  <i className="fa-solid fa-film" /> {t('global_prompt')}
                               </span>
                           ) : (
                               <span className="text-xs font-bold text-slate-400 uppercase">{t('frame_prompt', [String(frames.indexOf(activeFrame) + 1)])}</span>
                           )}
                           
                           {activeFrameIndex > 0 && generateMode === 'single' && (
                              <button onClick={copyPreviousPrompt} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 px-2 py-0.5 rounded transition-colors flex items-center gap-1">
                                 <i className="fa-solid fa-arrow-up" /> {t('copy_prev')}
                              </button>
                           )}
                           
                           {/* Generation Mode Switcher */}
                           <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 ml-4">
                               <button 
                                 onClick={() => setGenerateMode('single')}
                                 className={`px-3 py-1 text-[10px] rounded transition-colors uppercase font-bold ${generateMode === 'single' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                  {t('frame_only')}
                               </button>
                               <button 
                                 onClick={() => setGenerateMode('all')}
                                 className={`px-3 py-1 text-[10px] rounded transition-colors uppercase font-bold ${generateMode === 'all' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                  {t('all_frames')}
                               </button>
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <button onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded border border-slate-700 flex items-center gap-2" title={t('upload_frame')}>
                              <i className="fa-solid fa-upload" />
                           </button>
                           <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => {
                                 if (e.target.files?.[0] && onUploadFrameImage) {
                                    onUploadFrameImage(activeFrame.id, e.target.files[0]);
                                 }
                                 e.target.value = ''; // Reset input
                              }} 
                           />
                           <button onClick={() => onDuplicateFrame(activeFrame.id)} className="text-xs text-slate-400 hover:text-white px-2 py-1" title={t('duplicate')}><i className="fa-solid fa-copy" /></button>
                           <button onClick={() => onDeleteFrame(activeFrame.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1" title={t('delete')}><i className="fa-solid fa-trash" /></button>
                        </div>
                     </div>
                     
                     <div className="flex gap-2 h-full">
                        {generateMode === 'all' ? (
                           <textarea 
                             value={globalPrompt}
                             onChange={(e) => setGlobalPrompt(e.target.value)}
                             className="flex-1 bg-slate-950 border border-purple-500/50 rounded p-3 text-sm text-slate-200 outline-none focus:border-purple-500 resize-none font-sans leading-relaxed custom-scrollbar shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]"
                             placeholder="Enter a prompt that applies to ALL frames (e.g., 'A flickering blue flame loop'). This will overwrite individual frame prompts."
                           />
                        ) : (
                           <textarea 
                             value={activeFrame.prompt}
                             onChange={(e) => onUpdateFramePrompt(activeFrame.id, e.target.value)}
                             className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 outline-none focus:border-purple-500 resize-none font-sans leading-relaxed custom-scrollbar"
                             placeholder="Describe this specific frame..."
                           />
                        )}
                        
                        <div className="w-40 flex flex-col gap-2">
                            {isGenerating ? (
                               <button 
                                  onClick={onCancel}
                                  className="h-full bg-red-900/50 hover:bg-red-800 border border-red-500/50 text-red-200 rounded flex flex-col items-center justify-center gap-2 transition-all animate-pulse"
                               >
                                  <i className="fa-solid fa-stop text-xl" />
                                  <span className="text-xs font-bold">{t('cancel').toUpperCase()}</span>
                               </button>
                            ) : (
                               <button 
                                  onClick={handleGenerateClick}
                                  disabled={generateMode === 'all' ? !globalPrompt : !activeFrame.prompt}
                                  className={`h-full border rounded flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 group ${generateMode === 'all' ? 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/50 text-purple-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`}
                               >
                                  {generateMode === 'all' ? <i className="fa-solid fa-layer-group text-xl group-hover:scale-110 transition-transform" /> : <i className="fa-solid fa-wand-magic-sparkles text-xl group-hover:scale-110 transition-transform" />}
                                  <span className="text-xs font-bold text-center px-2">
                                     {generateMode === 'all' ? t('gen_all') : t('gen_frame')}
                                  </span>
                               </button>
                            )}
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                     Select a frame to edit
                  </div>
               )}
            </div>

            {/* Bottom: Timeline Strip */}
            <div className="h-28 bg-slate-950 border-t border-slate-800 overflow-x-auto flex items-center px-4 gap-2 custom-scrollbar shrink-0" ref={scrollRef}>
               {frames.map((frame, index) => (
                  <div 
                    key={frame.id}
                    onClick={() => onSelectFrame(frame.id)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => handleFrameDrop(e, frame.id)}
                    className={`relative shrink-0 w-24 h-20 rounded border-2 cursor-pointer transition-all group overflow-hidden bg-slate-900 ${selectedFrameId === frame.id ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                  >
                     {frame.imageUrl ? (
                        <img src={frame.imageUrl} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-2 group-hover:text-slate-500 transition-colors">
                           <span className="text-xs font-mono">{index + 1}</span>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <i className="fa-solid fa-image" title="Drop Image Here" />
                           </div>
                        </div>
                     )}
                     
                     {/* Frame Number Badge */}
                     <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] px-1 font-mono">
                        {index + 1}
                     </div>
                     
                     {/* Upload Button Overlay */}
                     <button 
                        onClick={(e) => { 
                           e.stopPropagation(); 
                           // Trigger hidden input logic manually or use the main uploader
                           if(onSelectFrame) onSelectFrame(frame.id);
                           setTimeout(() => fileInputRef.current?.click(), 50);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-purple-600 rounded flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('upload_frame')}
                     >
                        <i className="fa-solid fa-upload text-[10px]" />
                     </button>
                  </div>
               ))}
               
               <button 
                  onClick={onAddFrame}
                  className="shrink-0 w-24 h-20 rounded border-2 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900 flex items-center justify-center text-slate-600 transition-colors"
               >
                  <i className="fa-solid fa-plus" />
               </button>

               {onClearFrames && frames.length > 0 && (
                   <div className="h-12 w-px bg-slate-800 mx-2"></div>
               )}
               
               {onClearFrames && frames.length > 0 && (
                   <button 
                      onClick={() => { if(confirm(t('confirm_clear'))) onClearFrames(); }}
                      className="shrink-0 w-8 h-20 rounded hover:bg-red-900/20 text-slate-600 hover:text-red-400 flex items-center justify-center transition-colors"
                      title={t('clear_all')}
                   >
                      <i className="fa-solid fa-trash" />
                   </button>
               )}
            </div>
        </div>
      )}
    </div>
  );
};

export default AnimationTimeline;
