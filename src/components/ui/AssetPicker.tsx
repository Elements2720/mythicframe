
import React, { useState } from 'react';
import { HistoryEntry, UIMode } from '../../types';

interface AssetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onSelect: (imageUrl: string) => void;
}

const AssetPicker: React.FC<AssetPickerProps> = ({ isOpen, onClose, history, onSelect }) => {
  const [filterMode, setFilterMode] = useState<UIMode | 'all'>('all');

  if (!isOpen) return null;

  const filtered = history.filter(h => filterMode === 'all' || h.mode === filterMode);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[800px] h-[600px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
           <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <i className="fa-solid fa-images text-purple-500" /> Select Asset
              </h2>
              <p className="text-xs text-slate-400">Choose an image from your library to use in the layout.</p>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white px-2">
              <i className="fa-solid fa-times text-lg" />
           </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-slate-800 bg-slate-900 flex gap-2 overflow-x-auto shrink-0">
           {['all', 'illustration', 'background', 'frame'].map(m => (
              <button
                 key={m}
                 onClick={() => setFilterMode(m as any)}
                 className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${filterMode === m ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}
              >
                 {m}
              </button>
           ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950">
           {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                 <i className="fa-regular fa-folder-open text-3xl" />
                 <p className="text-sm">No assets found.</p>
              </div>
           ) : (
              <div className="grid grid-cols-4 gap-3">
                 {filtered.map(entry => (
                    <button 
                       key={entry.id}
                       onClick={() => { onSelect(entry.thumbnailUrl); onClose(); }}
                       className="group relative aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-purple-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                       <img src={entry.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" />
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold">Select</span>
                       </div>
                       <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/70 backdrop-blur text-[9px] text-slate-300 truncate text-left">
                          {entry.userPrompt}
                       </div>
                    </button>
                 ))}
              </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end shrink-0">
           <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
        </div>

      </div>
    </div>
  );
};

export default AssetPicker;
