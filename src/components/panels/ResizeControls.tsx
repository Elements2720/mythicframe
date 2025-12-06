
import React, { useRef } from 'react';
import { ResizeItem, AspectRatio } from '../../types';
import { exportSingleImage } from '../../services/exportService';

interface ResizeControlsProps {
  queue?: ResizeItem[];
  currentId?: string | null;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  onAddFiles?: (files: FileList) => void;
  onClearResult?: (id: string) => void;
  
  // Controls
  zoom: number;
  setZoom: (val: number) => void;
  pan: { x: number; y: number };
  setPan: (val: { x: number; y: number }) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (val: AspectRatio) => void;
  
  isGenerating: boolean;
}

const ResizeControls: React.FC<ResizeControlsProps> = ({
  queue = [], 
  currentId, 
  onSelect, 
  onRemove, 
  onAddFiles, 
  onClearResult,
  zoom, 
  setZoom, 
  pan, 
  setPan, 
  aspectRatio, 
  setAspectRatio,
  isGenerating
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val / 100);
  };

  // Safe handlers
  const handleSelect = (id: string) => onSelect && onSelect(id);
  const handleRemove = (id: string) => onRemove && onRemove(id);
  const handleAdd = (files: FileList) => onAddFiles && onAddFiles(files);
  const handleClear = (id: string) => onClearResult && onClearResult(id);

  return (
    <div className="space-y-6">
       
       {/* BATCH QUEUE */}
       <div className="bg-slate-800 p-3 rounded border border-slate-700">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-xs font-bold text-slate-400 uppercase">Batch Queue</h4>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors"
             >
                <i className="fa-solid fa-plus" /> Add Images
             </button>
             <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                accept="image/*"
                onChange={(e) => { if(e.target.files && e.target.files.length > 0) handleAdd(e.target.files); }}
             />
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {queue.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs border border-dashed border-slate-700 rounded select-none">
                   Drag images here
                </div>
             ) : (
                queue.map((item) => (
                   <div 
                      key={item.id} 
                      onClick={() => handleSelect(item.id)}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border transition-colors group ${item.id === currentId ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-900 border-transparent hover:border-slate-600'}`}
                   >
                      <div className="w-8 h-8 rounded bg-slate-950 shrink-0 overflow-hidden relative">
                         <img src={item.resultUrl || item.url} className="w-full h-full object-cover" alt="thumbnail" />
                         {item.status === 'done' && (
                             <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                <i className="fa-solid fa-check text-[10px] text-white drop-shadow-md" />
                             </div>
                         )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="text-[10px] text-slate-200 truncate font-medium">{item.name}</div>
                         <div className="text-[9px] text-slate-500 capitalize flex items-center gap-1">
                            {item.status}
                         </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {item.status === 'done' && item.resultUrl && (
                             <>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); exportSingleImage(item.resultUrl!, `resized_${item.name}.png`); }}
                                   className="text-slate-400 hover:text-blue-400 p-1 bg-slate-800 rounded"
                                   title="Download Result"
                                >
                                   <i className="fa-solid fa-download text-[10px]" />
                                </button>
                                {onClearResult && (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); handleClear(item.id); }}
                                      className="text-slate-400 hover:text-yellow-400 p-1 bg-slate-800 rounded"
                                      title="Reset / Retry"
                                   >
                                      <i className="fa-solid fa-rotate-left text-[10px]" />
                                   </button>
                                )}
                             </>
                         )}
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                            className="text-slate-400 hover:text-red-400 p-1 bg-slate-800 rounded"
                            title="Remove"
                         >
                            <i className="fa-solid fa-times text-[10px]" />
                         </button>
                      </div>
                   </div>
                ))
             )}
          </div>
       </div>

       {/* COMPOSITION CONTROLS */}
       <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Aspect Ratio</label>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 mb-4">
             <option value="1:1">Square (1:1)</option>
             <option value="3:4">Portrait (3:4)</option>
             <option value="4:3">Landscape (4:3)</option>
             <option value="9:16">Mobile (9:16)</option>
             <option value="16:9">Cinematic (16:9)</option>
             <option value="21:9">Ultrawide (21:9)</option>
             <option value="custom">Custom</option>
          </select>

          <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Transform Source</h4>
              
              {/* Zoom Percentage */}
              <div>
                 <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Zoom</span>
                    <span className="text-white font-mono">{Math.round(zoom * 100)}%</span>
                 </div>
                 <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    value={zoom * 100} 
                    onChange={handleZoomChange}
                    className="w-full accent-purple-500 h-1 bg-slate-600 rounded appearance-none cursor-pointer"
                 />
                 <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>10%</span>
                    <span>100%</span>
                    <span>300%</span>
                 </div>
              </div>

              {/* Reset */}
              <button 
                 onClick={() => { setZoom(1); setPan({x:0, y:0}); }}
                 className="w-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 rounded transition-colors"
              >
                 Reset Transform
              </button>
          </div>
       </div>
    </div>
  );
};

export default ResizeControls;
