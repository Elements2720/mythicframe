
import React, { useState } from 'react';
import { HistoryEntry } from '../../types';
import { exportSingleImage } from '../../services/exportService';

interface LibraryProps {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

const Library: React.FC<LibraryProps> = ({ history, onRestore }) => {
  const [filter, setFilter] = useState<string>('all');
  
  const filteredHistory = history.filter(h => filter === 'all' || h.mode === filter);

  return (
    <div className="flex-1 bg-slate-950 p-8 flex flex-col overflow-hidden">
       <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <i className="fa-solid fa-images text-purple-500" /> Asset Library
          </h2>
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
             {['all', 'illustration', 'frame', 'background', 'fullcard'].map(f => (
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {filteredHistory.map(entry => (
                  <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden group hover:border-purple-500/50 transition-colors flex flex-col">
                     <div className="aspect-square relative bg-black/20">
                        <img src={entry.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                               onClick={() => onRestore(entry)}
                               className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500"
                               title="Edit / Restore"
                            >
                               <i className="fa-solid fa-pen-to-square" />
                            </button>
                            <button 
                               onClick={() => exportSingleImage(entry.thumbnailUrl, `asset_${entry.id}.png`)}
                               className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center hover:bg-slate-500"
                               title="Download PNG"
                            >
                               <i className="fa-solid fa-download" />
                            </button>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[10px] text-white uppercase font-bold tracking-wider">
                           {entry.mode}
                        </div>
                     </div>
                     <div className="p-3 flex-1 flex flex-col">
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
    </div>
  );
};

export default Library;
