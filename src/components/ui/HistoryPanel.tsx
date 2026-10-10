
import React, { useState } from 'react';
import { HistoryEntry } from '../../types';
import { exportSingleImage } from '../../services/exportService';
import { useLanguage } from '../../i18n/LanguageContext';
import { showInAppConfirm } from '../../services/dialogService';

interface HistoryPanelProps {
  history: HistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
  onRename?: (entry: HistoryEntry, newName: string) => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, isOpen, onClose, onRestore, onRename, onDelete, onClearAll 
}) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const startRename = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditName(entry.customName || entry.userPrompt || 'Untitled');
  };

  const finishRename = (entry: HistoryEntry) => {
    if (onRename && editName.trim()) {
       onRename(entry, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="absolute top-0 right-0 bottom-14 w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
       <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-200">{t('history')}</h3>
              {onClearAll && history.length > 0 && (
                  <button 
                    onClick={async () => {
                      const ok = await showInAppConfirm(t('confirm_clear'), {
                        title: t('clear_all'),
                        isDestructive: true
                      });
                      if (ok) onClearAll();
                    }} 
                    className="text-[10px] text-red-400 bg-red-900/20 hover:bg-red-900/40 px-2 py-0.5 rounded border border-red-500/20 transition-colors ml-2"
                  >
                      {t('clear_all')}
                  </button>
              )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
             <i className="fa-solid fa-times" />
          </button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {history.length === 0 ? (
             <div className="text-center text-slate-500 mt-10 text-sm whitespace-pre-wrap">
                {t('no_history')}
             </div>
          ) : (
             history.map((entry) => (
                <div key={entry.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 group hover:border-purple-500/50 transition-colors">
                   <div className="relative aspect-video bg-slate-950">
                      <img src={entry.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                         <div className="flex gap-2">
                             <button 
                                onClick={() => onRestore(entry)}
                                className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-500"
                                title={t('restore')}
                             >
                                {t('restore')}
                             </button>
                             <button 
                                onClick={() => exportSingleImage(entry.thumbnailUrl, `${entry.customName || `mythicframe_${entry.id}`}.png`)}
                                className="bg-slate-700 text-white text-xs px-2 py-1 rounded hover:bg-slate-600"
                                title={t('download_image')}
                             >
                                <i className="fa-solid fa-download" />
                             </button>
                         </div>
                         {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                                className="text-red-300 hover:text-red-100 text-[10px] flex items-center gap-1 mt-1 hover:underline"
                            >
                                <i className="fa-solid fa-trash" /> {t('delete')}
                            </button>
                         )}
                      </div>
                   </div>
                   <div className="p-3">
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-[10px] uppercase font-bold text-slate-500">{entry.mode}</span>
                         <span className="text-[10px] text-slate-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      {editingId === entry.id ? (
                          <input 
                             type="text" 
                             value={editName} 
                             onChange={(e) => setEditName(e.target.value)}
                             onBlur={() => finishRename(entry)}
                             onKeyDown={(e) => { if(e.key==='Enter') finishRename(entry); }}
                             className="w-full bg-slate-900 border border-slate-600 rounded px-1 text-xs text-white outline-none"
                             autoFocus
                          />
                      ) : (
                          <div className="group/text flex justify-between gap-2">
                             <p 
                                className="text-xs text-slate-300 line-clamp-2 font-medium cursor-text" 
                                title="Double click to rename"
                                onDoubleClick={() => startRename(entry)}
                             >
                                {entry.customName || entry.userPrompt}
                             </p>
                             {onRename && (
                                <button 
                                   onClick={() => startRename(entry)} 
                                   className="text-slate-500 hover:text-white opacity-0 group-hover/text:opacity-100 transition-opacity px-1"
                                   title={t('rename')}
                                >
                                   <i className="fa-solid fa-pencil text-[10px]" />
                                </button>
                             )}
                          </div>
                      )}
                   </div>
                </div>
             ))
          )}
       </div>
    </div>
  );
};

export default HistoryPanel;
