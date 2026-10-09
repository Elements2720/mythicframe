
import React, { useRef, useState, useEffect } from 'react';
import { BgReplaceItem } from '../../types';
import { exportSingleImage } from '../../services/exportService';
import { useLanguage } from '../../i18n/LanguageContext';

interface BgReplaceBottomPanelProps {
  queue: BgReplaceItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: FileList) => void;
  onClearResult: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  prompt: string;
  setPrompt: (val: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onGenerateAll?: () => void;
  onExportAll?: () => void;
  onCancel: () => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const BgReplaceBottomPanel: React.FC<BgReplaceBottomPanelProps> = ({
  queue, selectedId, onSelect, onRemove, onAddFiles, onClearResult, onRename,
  prompt, setPrompt, isGenerating, onGenerate, onGenerateAll, onExportAll, onCancel
}) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState(380); 
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const pendingCount = queue.filter(i => i.status !== 'done').length;
  const completedCount = queue.filter(i => i.status === 'done' && i.resultUrl).length;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [queue.length]);

  const panelRef = useRef<HTMLDivElement>(null);
  const currentHeightRef = useRef(height);

  useEffect(() => {
    currentHeightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(150, Math.min(window.innerHeight * 0.9, window.innerHeight - e.clientY));
      currentHeightRef.current = newHeight;
      if (panelRef.current) {
        panelRef.current.style.height = `${newHeight}px`;
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setHeight(currentHeightRef.current);
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingId(id); setEditName(currentName);
  };
  const finishRename = () => { if (editingId && editName.trim()) onRename(editingId, editName.trim()); setEditingId(null); };

  return (
    <div 
       ref={panelRef}
       className={`w-full bg-[#0b1120] border-t border-slate-800 z-40 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] shrink-0 relative ${
         isResizing ? '!transition-none select-none' : 'transition-[height] duration-200'
       }`}
       style={{ height: isMinimized ? 48 : height }}
    >
       <div className="h-2 bg-slate-900/80 hover:bg-purple-600 cursor-ns-resize w-full flex items-center justify-center transition-colors group absolute -top-2 z-50 touch-none py-1" onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}>
         <div className="w-20 h-1 bg-slate-700 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
       </div>

       {/* Unified Toolbar */}
       <div className="h-12 flex items-center px-5 justify-between shrink-0 bg-[#0b1120] border-b border-slate-800/50 relative z-20">
          <div className="flex items-center gap-6">
             <span className="text-[11px] font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2"><Icon name="fa-panorama text-blue-500" /> {t('bg_replace_queue')} ({queue.length})</span>
             <div className="h-4 w-px bg-slate-800" />
             {completedCount > 0 && onExportAll && (
                 <button onClick={onExportAll} className="text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-all"><Icon name="fa-file-zipper" /> {t('export_all')} ({completedCount})</button>
             )}
             {pendingCount > 0 && onGenerateAll && (
                 <button onClick={onGenerateAll} disabled={isGenerating} className="text-[11px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-all disabled:opacity-30"><Icon name="fa-play" /> {t('gen_all')} ({pendingCount})</button>
             )}
          </div>
          <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-all">
             <Icon name={isMinimized ? "fa-chevron-up" : "fa-chevron-down"} />
          </button>
       </div>
       
       {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
             {/* Carousel */}
             <div 
                className={`h-24 bg-slate-950 border-b border-slate-800/50 flex items-center p-3 gap-3 overflow-x-auto custom-scrollbar transition-colors ${isDragOver ? 'bg-purple-900/10' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) onAddFiles(e.dataTransfer.files); }}
                ref={scrollRef}
             >
                {queue.map((item) => (
                   <div key={item.id} onClick={() => onSelect(item.id)} className={`relative shrink-0 w-24 h-16 rounded-xl border-2 cursor-pointer transition-all group overflow-hidden bg-slate-900 ${selectedId === item.id ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-slate-800 hover:border-slate-600'}`}>
                      <img src={item.resultUrl || item.url} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1">
                         {item.status === 'done' && <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white"><Icon name="fa-check" /></div>}
                         {item.status === 'processing' && <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white animate-spin"><Icon name="fa-circle-notch" /></div>}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-1 bg-black/80 backdrop-blur flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="w-5 h-5 bg-slate-800 hover:bg-red-600 rounded flex items-center justify-center text-white ml-auto transition-colors"><Icon name="fa-times text-[8px]" /></button>
                      </div>
                   </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className={`shrink-0 w-24 h-16 rounded-xl border-2 border-dashed border-slate-800 transition-all flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-purple-400 hover:border-purple-500 bg-slate-900/30`}>
                   <Icon name="fa-plus text-lg" /><input type="file" multiple className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { if(e.target.files?.length) onAddFiles(e.target.files); e.target.value = ''; }} />
                </button>
             </div>

             <div className="flex-1 p-4 flex gap-4 min-h-0 bg-[#0b1120]">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[13px] text-slate-100 outline-none focus:border-purple-600/50 transition-all resize-none font-medium leading-relaxed custom-scrollbar placeholder:text-slate-700" placeholder={t('bg_replace_prompt_hint')} />
                <div className="w-52 shrink-0 h-full">
                   {isGenerating ? (
                        <button onClick={onCancel} className="w-full h-full bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-2 animate-pulse"><Icon name="fa-stop text-2xl" /><span className="text-[11px] tracking-widest uppercase">{t('cancel')}</span></button>
                    ) : (
                        <button onClick={onGenerate} disabled={!selectedId} className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl font-black transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-blue-900/30 flex flex-col items-center justify-center gap-2 border border-blue-500/20 group">
                           <Icon name="fa-wand-magic-sparkles" className="text-2xl group-hover:scale-110 transition-transform" />
                           <span className="text-[11px] tracking-widest uppercase">REPLACE</span>
                        </button>
                    )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default BgReplaceBottomPanel;
