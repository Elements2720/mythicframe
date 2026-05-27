
import React, { useState } from 'react';
import { HistoryEntry } from '../../types';
import { exportSingleImage } from '../../services/exportService';

interface LibraryProps {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

const Library: React.FC<LibraryProps> = ({ history, onRestore }) => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const filteredHistory = history.filter(h => filter === 'all' || h.mode === filter);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleDownloadSelected = async () => {
      if (selectedIds.size === 0) return;
      setIsDownloading(true);
      
      try {
          const selectedEntries = history.filter(h => selectedIds.has(h.id));
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          for (const entry of selectedEntries) {
              const styleLabel = entry.fullPrompt.toLowerCase().includes('chibi') ? 'CHIBI' : 
                                entry.fullPrompt.toLowerCase().includes('waist up') ? 'WAIST_UP' : 
                                entry.fullPrompt.toLowerCase().includes('full body') ? 'FULL_BODY' : '';
              
              let safeCharName = (entry.customName || 'asset').replace(/\[.*?\]/g, '').replace(/chibi|full\s*body|waist\s*up/gi, "").trim().replace(/[^a-z0-9]/gi, '_');
              safeCharName = safeCharName.replace(/_+/g, '_').replace(/^_|_$/g, '');

              const filename = styleLabel ? `${safeCharName}_${styleLabel}.png` : `${safeCharName}_${entry.id}.png`;
              
              const response = await fetch(entry.thumbnailUrl);
              const blob = await response.blob();
              zip.file(filename, blob);
          }
          
          const content = await zip.generateAsync({ type: 'blob' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = `Library_Assets_${Date.now()}.zip`;
          link.click();
          
          // Clear selection on success
          setSelectedIds(new Set());
      } catch (err) {
          console.error("Failed downloading zipped assets", err);
      } finally {
          setIsDownloading(false);
      }
  };

  return (
    <div className="flex-1 bg-slate-950 p-8 flex flex-col overflow-hidden">
       <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                 <i className="fa-solid fa-images text-purple-500" /> Asset Library
              </h2>
              {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in ml-4 border-l border-slate-800 pl-4">
                      <span className="text-xs font-bold text-purple-400">{selectedIds.size} Selected</span>
                      <button
                         onClick={handleDownloadSelected}
                         disabled={isDownloading}
                         className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-lg transition-all flex items-center gap-2"
                      >
                         <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`} />
                         {isDownloading ? 'Zipping...' : 'Download ZIP'}
                      </button>
                      <button
                         onClick={() => setSelectedIds(new Set())}
                         className="px-2 py-1.5 text-slate-500 hover:text-white transition-all text-xs"
                      >
                         Clear
                      </button>
                  </div>
              )}
          </div>
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
             {['all', 'illustration', 'frame', 'background', 'fullcard', 'batch'].map(f => (
                <button
                   key={f}
                   onClick={() => setFilter(f)}
                   className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${filter === f ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                >
                   {f}
                </button>
             ))}
          </div>
       </div>
       
       <div className="flex-1 overflow-y-auto custom-scrollbar">
         {filteredHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 flex-col gap-2">
               <i className="fa-regular fa-folder-open text-4xl mb-2" />
               <p>No assets found in this filter.</p>
            </div>
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-12">
               {filteredHistory.map(entry => (
                  <div 
                      key={entry.id} 
                      onClick={(e) => toggleSelect(entry.id, e)}
                      className={`bg-slate-900 border rounded-lg overflow-hidden group transition-all flex flex-col cursor-pointer relative ${selectedIds.has(entry.id) ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-slate-800 hover:border-purple-500/50'}`}
                  >
                     {/* Checkbox indicator */}
                     <div className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center z-10 transition-all ${selectedIds.has(entry.id) ? 'bg-purple-500 text-white' : 'bg-black/50 text-transparent group-hover:text-white/50 border border-white/20'}`}>
                         <i className="fa-solid fa-check text-[10px]" />
                     </div>
                     
                     <div className="aspect-square relative bg-black/20">
                        <img src={entry.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:bg-black/60 transition-opacity flex items-center justify-center gap-2">
                            <button 
                               onClick={(e) => { e.stopPropagation(); setFullScreenImage(entry.thumbnailUrl); }}
                               className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 hover:text-white"
                               title="View Full Screen"
                            >
                               <i className="fa-solid fa-expand" />
                            </button>
                            <button 
                               onClick={(e) => { e.stopPropagation(); onRestore(entry); }}
                               className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500"
                               title={entry.batchQueue && entry.batchQueue.length > 0 ? "Re-open Batch Studio" : "Edit / Restore"}
                            >
                               <i className={`fa-solid ${entry.batchQueue && entry.batchQueue.length > 0 ? 'fa-layer-group' : 'fa-pen-to-square'}`} />
                            </button>
                            <button 
                               onClick={(e) => {
                                  e.stopPropagation();
                                  const styleLabel = entry.fullPrompt.toLowerCase().includes('chibi') ? 'CHIBI' : 
                                                    entry.fullPrompt.toLowerCase().includes('waist up') ? 'WAIST_UP' : 
                                                    entry.fullPrompt.toLowerCase().includes('full body') ? 'FULL_BODY' : '';
                                  
                                  let safeCharName = (entry.customName || 'asset').replace(/\[.*?\]/g, '').replace(/chibi|full\s*body|waist\s*up/gi, "").trim().replace(/[^a-z0-9]/gi, '_');
                                  safeCharName = safeCharName.replace(/_+/g, '_').replace(/^_|_$/g, '');

                                  const filename = styleLabel ? `${safeCharName}_${styleLabel}.png` : `${safeCharName}_${entry.id}.png`;
                                  exportSingleImage(entry.thumbnailUrl, filename);
                               }}
                               className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center hover:bg-slate-500"
                               title="Download PNG"
                            >
                               <i className="fa-solid fa-download" />
                            </button>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                           <div className="px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[10px] text-white uppercase font-bold tracking-wider">
                              {entry.mode}
                           </div>
                           {entry.batchQueue && entry.batchQueue.length > 0 && (
                              <div className="px-2 py-0.5 bg-purple-600/80 backdrop-blur rounded text-[10px] text-white uppercase font-bold tracking-wider flex items-center gap-1">
                                 <i className="fa-solid fa-layer-group text-[8px]" /> Batch
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="p-3 flex-1 flex flex-col pointer-events-none">
                        <p className="text-xs text-slate-300 line-clamp-2 mb-2 font-medium" title={entry.userPrompt}>
                           {entry.userPrompt || "No prompt"}
                        </p>
                        <div className="mt-auto text-[10px] text-slate-500 flex justify-between">
                           <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                           <span>{entry.size}</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
       </div>
       
       {fullScreenImage && (
           <div 
               className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out animate-in fade-in"
               onClick={() => setFullScreenImage(null)}
           >
               <img src={fullScreenImage} className="max-w-full max-h-full object-contain shadow-2xl" />
               <button 
                  onClick={() => setFullScreenImage(null)}
                  className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors text-xl"
               >
                  <i className="fa-solid fa-xmark" />
               </button>
           </div>
       )}
    </div>
  );
};

export default Library;
