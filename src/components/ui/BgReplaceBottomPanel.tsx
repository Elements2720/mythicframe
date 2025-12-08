
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

const BgReplaceBottomPanel: React.FC<BgReplaceBottomPanelProps> = ({
  queue, selectedId, onSelect, onRemove, onAddFiles, onClearResult, onRename,
  prompt, setPrompt, isGenerating, onGenerate, onGenerateAll, onExportAll, onCancel
}) => {
  const { t } = useLanguage();
  const [height, setHeight] = useState(320); 
  const [isResizing, setIsResizing] = useState(false);
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 200 && newHeight < 600) setHeight(newHeight);
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) onAddFiles(e.dataTransfer.files);
  };

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingId(id); setEditName(currentName);
  };
  const finishRename = () => { if (editingId && editName.trim()) onRename(editingId, editName.trim()); setEditingId(null); };

  return (
    <div 
       className="w-full bg-slate-900 border-t border-slate-800 z-40 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.3)] shrink-0"
       style={{ height: height }}
    >
       <div 
          className="h-1.5 bg-slate-800 hover:bg-purple-500 cursor-ns-resize w-full flex items-center justify-center transition-colors group shrink-0"
          onMouseDown={() => setIsResizing(true)}
       >
         <div className="w-16 h-1 bg-slate-600 rounded-full group-hover:bg-purple-300 opacity-50 transition-colors"></div>
       </div>

       <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-8 flex items-center px-4 justify-between bg-slate-900/50 backdrop-blur shrink-0 border-b border-slate-800/50">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <i className="fa-solid fa-panorama" /> {t('bg_replace_queue')} ({queue.length})
             </div>
             
             <div className="flex items-center gap-2">
                 {completedCount > 1 && onExportAll && (
                     <button onClick={onExportAll} className="text-[10px] bg-slate-800 hover:bg-blue-900/40 text-blue-300 border border-slate-700 px-2 py-0.5 rounded transition-colors flex items-center gap-1">
                        <i className="fa-solid fa-file-zipper" /> {t('export_all')} ({completedCount})
                     </button>
                 )}
                 {pendingCount > 1 && onGenerateAll && (
                     <button onClick={onGenerateAll} disabled={isGenerating} className="text-[10px] bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50">
                        <i className="fa-solid fa-play" /> {t('gen_all')} ({pendingCount})
                     </button>
                 )}
             </div>
          </div>
          
          <div 
             className={`flex-1 overflow-x-auto flex items-center p-3 gap-3 custom-scrollbar transition-colors ${isDragOver ? 'bg-purple-900/10' : 'bg-slate-950/50'}`}
             onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} ref={scrollRef}
          >
             {queue.map((item) => (
                <div 
                   key={item.id} onClick={() => onSelect(item.id)}
                   className={`relative shrink-0 w-32 h-32 rounded-lg border-2 cursor-pointer transition-all group overflow-hidden shadow-sm hover:shadow-md ${selectedId === item.id ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                >
                   <img src={item.resultUrl || item.url} className="w-full h-full object-cover bg-slate-800" />
                   
                   <div className="absolute top-0 inset-x-0 p-1 bg-gradient-to-b from-black/80 to-transparent z-20">
                     {editingId === item.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={finishRename} onKeyDown={(e) => { if(e.key === 'Enter') finishRename(); }} className="w-full bg-slate-100 text-slate-900 text-[10px] px-1 rounded outline-none" autoFocus onClick={(e) => e.stopPropagation()} />
                     ) : (
                        <div className="text-[9px] text-white truncate font-medium flex items-center gap-1 hover:text-blue-300">
                           <span className="truncate flex-1">{item.name}</span>
                           <button onClick={(e) => startRename(item.id, item.name, e)} className="opacity-0 group-hover:opacity-100 hover:text-white text-slate-400"><i className="fa-solid fa-pencil" /></button>
                        </div>
                     )}
                   </div>

                   <div className="absolute top-1 right-1 z-10 pointer-events-none">
                      {item.status === 'done' && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white shadow-sm border border-black/20"><i className="fa-solid fa-check" /></div>}
                      {item.status === 'processing' && <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white shadow-sm animate-spin border border-black/20"><i className="fa-solid fa-circle-notch" /></div>}
                   </div>

                   <div className={`absolute inset-x-0 bottom-0 p-1.5 bg-black/80 backdrop-blur flex justify-between items-center transition-opacity ${selectedId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {item.status === 'done' && item.resultUrl && (
                         <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); exportSingleImage(item.resultUrl!, `${item.name}.png`); }} className="w-6 h-6 rounded bg-slate-700 hover:bg-blue-600 text-white flex items-center justify-center border border-white/10" title="Download">
                               <i className="fa-solid fa-download text-[10px]" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onClearResult(item.id); }} className="w-6 h-6 rounded bg-slate-700 hover:bg-yellow-600 text-white flex items-center justify-center border border-white/10" title="Retry">
                               <i className="fa-solid fa-rotate-left text-[10px]" />
                            </button>
                         </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} className="w-6 h-6 rounded bg-slate-700 hover:bg-red-500 text-white flex items-center justify-center ml-auto border border-white/10" title={t('delete')}>
                         <i className="fa-solid fa-times text-[10px]" />
                      </button>
                   </div>
                </div>
             ))}

             <button 
                onClick={() => fileInputRef.current?.click()}
                className={`shrink-0 w-32 h-32 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-purple-400 group bg-slate-900/30 ${isDragOver ? 'border-purple-500 bg-purple-500/20' : 'border-slate-700 hover:border-purple-500 hover:bg-slate-800/50'}`}
             >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-purple-500 text-white' : 'bg-slate-800 group-hover:bg-purple-500/20'}`}>
                   <i className="fa-solid fa-plus text-lg" />
                </div>
                <span className="text-xs font-bold uppercase">{isDragOver ? t('drop_here') : t('add_images')}</span>
                <input 
                   type="file" 
                   multiple 
                   className="hidden" 
                   ref={fileInputRef} 
                   accept="image/*" 
                   onChange={(e) => { 
                      if(e.target.files && e.target.files.length > 0) onAddFiles(e.target.files); 
                      e.target.value = ''; // Reset input
                   }} 
                />
             </button>
          </div>

          {/* Prompt & Action Area */}
          <div className="h-20 bg-slate-900 border-t border-slate-800 p-3 flex gap-3 shrink-0 items-center">
             <div className="flex-1 flex flex-col justify-center h-full">
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-purple-500 resize-none custom-scrollbar placeholder:text-slate-600 leading-relaxed font-sans"
                    placeholder={t('bg_replace_prompt_hint')}
                />
             </div>
             <div className="w-48 h-full">
                 {isGenerating ? (
                     <button onClick={onCancel} className="w-full h-full bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 text-red-200 rounded font-bold flex items-center justify-center gap-2 transition-all animate-pulse">
                        <i className="fa-solid fa-stop" />
                        <span className="text-xs">{t('cancel').toUpperCase()}</span>
                     </button>
                  ) : (
                     <button onClick={onGenerate} disabled={!selectedId} className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded font-bold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/40 border border-purple-500/20 group">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-wand-magic-sparkles group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold tracking-wide">REPLACE</span>
                        </div>
                     </button>
                  )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default BgReplaceBottomPanel;
