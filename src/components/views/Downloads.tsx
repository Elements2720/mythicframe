
import React from 'react';
import { ExportHistoryEntry } from '../../types';

interface DownloadsProps {
  exportHistory: ExportHistoryEntry[];
  onDelete: (id: string) => void;
  onDownloadAgain: (id: string, name: string) => void;
}

const Downloads: React.FC<DownloadsProps> = ({ exportHistory, onDelete, onDownloadAgain }) => {
  return (
    <div className="flex-1 bg-slate-950 p-8 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <i className="fa-solid fa-file-zipper text-orange-500" /> Export Downloads
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {exportHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 flex-col gap-2">
            <i className="fa-solid fa-box-open text-4xl mb-2" />
            <p>No exported files available.</p>
            <p className="text-sm">Export a batch or project to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportHistory.map(entry => (
              <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 group hover:border-orange-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <i className={`fa-solid ${entry.type === 'zip' ? 'fa-file-zipper' : entry.type === 'csv' ? 'fa-file-csv' : 'fa-file-image'} text-xl`} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm truncate max-w-[180px]" title={entry.name}>
                        {entry.name}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDelete(entry.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  >
                    <i className="fa-solid fa-trash-can text-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-black/20 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-layer-group text-[10px]" /> {entry.itemCount} items
                  </span>
                  {entry.fileSize && (
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-weight-hanging text-[10px]" /> {(entry.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-1">
                  {entry.hasBlob || entry.blob ? (
                    <button 
                      onClick={() => onDownloadAgain(entry.id, entry.name)}
                      className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-download" /> Download Again
                    </button>
                  ) : entry.url ? (
                    <a 
                      href={entry.url}
                      download={entry.name}
                      className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-download" /> Download
                    </a>
                  ) : (
                    <div className="flex-1 bg-slate-800 text-slate-500 text-xs py-2 rounded-lg text-center">
                      File expired or unavailable
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Downloads;
