
import React, { useState, useEffect } from 'react';
import { HistoryEntry, ExportConfig, WorkspaceTab } from '../../types';
import { exportZip, exportProjectBatch } from '../../services/exportService';
import { useLanguage } from '../../i18n/LanguageContext';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntry: HistoryEntry | null;
  currentImage?: string | null;
  sessionImages?: string[];
  mode?: string;
  tabs?: WorkspaceTab[]; 
}

const ExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, onClose, currentEntry, currentImage, sessionImages = [], mode = 'illustration', tabs = []
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ExportConfig>({
    includeImage: true,
    includePrompts: true,
    includeProjectContext: true,
    selectedTabIds: tabs.map(t => t.id),
    format: 'zip'
  });

  // Sync selected tabs when tabs list changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setConfig(p => ({ ...p, selectedTabIds: tabs.map(t => t.id) }));
    }
  }, [isOpen, tabs]);

  const toggleTab = (id: string) => {
     setConfig(p => ({
        ...p,
        selectedTabIds: p.selectedTabIds.includes(id) 
           ? p.selectedTabIds.filter(tid => tid !== id)
           : [...p.selectedTabIds, id]
     }));
  };

  if (!isOpen) return null;

  const handleExportBatch = async () => {
     if (config.selectedTabIds.length === 0) {
        alert("Please select at least one character to export.");
        return;
     }
     try {
        await exportProjectBatch(tabs, config);
        onClose();
     } catch (e: any) {
        console.error("Export failed", e);
        alert(`Export failed: ${e.message || "Unknown error"}`);
     }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
       <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[500px] shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <h2 className="text-xl font-black text-white flex items-center gap-3">
                <i className="fa-solid fa-file-zipper text-blue-500" /> Project Bundle Export
             </h2>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-times" /></button>
          </div>
          
          <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
             <p className="text-xs text-slate-400">All selected characters will be bundled into a single ZIP file, organized into folders.</p>

             {/* Character Selection */}
             {tabs.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                      <span>Select Workspaces to Bundle</span>
                      <span className="text-blue-400">{config.selectedTabIds.length} / {tabs.length}</span>
                   </h4>
                   <div className="max-h-48 overflow-y-auto bg-slate-950/50 rounded-xl border border-slate-800 p-2 custom-scrollbar space-y-1">
                      {tabs.map(tab => (
                         <label key={tab.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group">
                            <input 
                               type="checkbox" 
                               checked={config.selectedTabIds.includes(tab.id)}
                               onChange={() => toggleTab(tab.id)}
                               className="w-4 h-4 accent-blue-600 rounded"
                            />
                            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 overflow-hidden shrink-0">
                               {tab.generatedImage ? (
                                 <img src={tab.generatedImage} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-slate-800"><i className="fa-solid fa-image text-[8px] text-slate-600"/></div>
                               )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold text-slate-200 truncate">{tab.characterName || tab.name}</div>
                               <div className="text-[9px] text-slate-500 uppercase font-mono">{tab.mode}</div>
                            </div>
                         </label>
                      ))}
                   </div>
                </div>
             )}

             {/* Export Settings */}
             <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Included Data</h4>
                   <label className="flex items-center gap-2 text-xs text-slate-400 p-1 cursor-pointer hover:text-slate-200">
                      <input type="checkbox" checked={config.includeImage} onChange={e => setConfig(p => ({...p, includeImage: e.target.checked}))} className="accent-blue-600" />
                      Work (Images)
                   </label>
                   <label className="flex items-center gap-2 text-xs text-slate-400 p-1 cursor-pointer hover:text-slate-200">
                      <input type="checkbox" checked={config.includePrompts} onChange={e => setConfig(p => ({...p, includePrompts: e.target.checked}))} className="accent-blue-600" />
                      Metadata & Prompts
                   </label>
                   <label className="flex items-center gap-2 text-xs text-slate-400 p-1 cursor-pointer hover:text-slate-200">
                      <input type="checkbox" checked={config.includeProjectContext} onChange={e => setConfig(p => ({...p, includeProjectContext: e.target.checked}))} className="accent-blue-600" />
                      Project Overview
                   </label>
                </div>
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 flex flex-col justify-center">
                   <div className="text-[10px] font-black text-blue-400 uppercase mb-1">ZIP Structure</div>
                   <div className="text-[10px] text-slate-400 leading-relaxed">
                      Each character gets a folder named after them containing their generated assets.
                   </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-800 shrink-0">
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">Cancel</button>
             <button 
                onClick={handleExportBatch} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-900/40 active:scale-95 transition-all flex items-center gap-2"
             >
                <i className="fa-solid fa-download" /> Download Project ZIP
             </button>
          </div>
       </div>
    </div>
  );
};

export default ExportDialog;
