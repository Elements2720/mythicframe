
import React, { useState } from 'react';
import { HistoryEntry, ExportConfig } from '../../types';
import { exportZip, exportSessionImages } from '../../services/exportService';
import { useLanguage } from '../../i18n/LanguageContext';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntry: HistoryEntry | null;
  currentImage?: string | null;
  sessionImages?: string[];
  mode?: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, 
  onClose, 
  currentEntry, 
  currentImage, 
  sessionImages = [], 
  mode = 'illustration' 
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ExportConfig>({
    includeImage: true,
    includePrompts: true,
    includeProjectContext: true,
    format: 'zip'
  });

  // Construct a fallback entry if active image doesn't match history or history is missing
  const effectiveEntry: HistoryEntry | null = (currentEntry && currentEntry.thumbnailUrl === currentImage) 
    ? currentEntry 
    : (currentImage ? {
        id: `temp_${Date.now()}`,
        timestamp: Date.now(),
        mode: mode as any,
        thumbnailUrl: currentImage,
        fullPrompt: '',
        userPrompt: 'Exported Asset',
        gameContext: { setting: '', tone: '', visualConstraints: '' },
        styleId: 'none',
        bgConfig: { mode: 'none', color: '#000000', allowTransparency: false, promptFragment: '' },
        referenceAssets: [],
        size: '1K',
        aspectRatio: '1:1'
    } as HistoryEntry : null);

  if (!isOpen) return null;

  if (!effectiveEntry) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-slate-900 border border-red-500/50 rounded-lg p-6 w-[400px] shadow-2xl text-center">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-3" />
              <h2 className="text-lg font-bold text-white mb-2">Export Error</h2>
              <p className="text-sm text-slate-400 mb-4">
                 No image data found to export. Please generate or upload an image first.
              </p>
              <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm">
                 {t('close')}
              </button>
           </div>
        </div>
      );
  }

  const imageToExport = currentImage || effectiveEntry.thumbnailUrl;

  const handleExport = async () => {
    await exportZip(effectiveEntry, config, undefined, imageToExport);
    onClose();
  };

  const handleExportBatch = async () => {
     if (sessionImages.length > 0) {
        await exportSessionImages(sessionImages, `mythic_session_${Date.now()}`);
        onClose();
     }
  };

  const isPngOnly = config.includeImage && !config.includePrompts;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
       <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-[400px] shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
             <i className="fa-solid fa-file-export text-purple-500" /> {t('export_asset')}
          </h2>
          
          <div className="space-y-4 mb-6">
             <div className="bg-slate-800 p-3 rounded flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-950 rounded overflow-hidden shrink-0 border border-slate-700">
                   <img src={imageToExport} className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden">
                   <div className="text-xs text-slate-400 uppercase font-bold">{effectiveEntry.mode}</div>
                   <div className="text-sm text-slate-200 truncate">{effectiveEntry.userPrompt || "Generated Asset"}</div>
                </div>
             </div>

             {/* Batch Export Option */}
             {sessionImages.length > 1 && (
                <div className="bg-purple-900/20 border border-purple-500/20 p-3 rounded">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-purple-300 uppercase">Current Session Batch</span>
                      <span className="text-[10px] bg-purple-600 text-white px-1.5 rounded-full">{sessionImages.length} Images</span>
                   </div>
                   <button 
                      onClick={handleExportBatch}
                      className="w-full bg-slate-800 hover:bg-purple-700 text-white text-xs py-2 rounded transition-colors flex items-center justify-center gap-2 border border-slate-700"
                   >
                      <i className="fa-solid fa-file-zipper" /> {t('download_zip')}
                   </button>
                </div>
             )}

             <div className="pt-2 border-t border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('single_export')}</h4>
                <label className="flex items-center gap-2 text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                   <input type="checkbox" checked={config.includeImage} onChange={e => setConfig(p => ({...p, includeImage: e.target.checked}))} className="rounded border-slate-600 bg-slate-700 text-purple-600" />
                   {t('include_image')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                   <input type="checkbox" checked={config.includePrompts} onChange={e => setConfig(p => ({...p, includePrompts: e.target.checked}))} className="rounded border-slate-600 bg-slate-700 text-purple-600" />
                   {t('include_meta')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 p-2 hover:bg-slate-800 rounded cursor-pointer ml-6 transition-colors">
                   <input type="checkbox" checked={config.includeProjectContext} onChange={e => setConfig(p => ({...p, includeProjectContext: e.target.checked}))} disabled={!config.includePrompts} className="rounded border-slate-600 bg-slate-700 text-purple-600 disabled:opacity-50" />
                   {t('include_context')}
                </label>
             </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('cancel')}</button>
             <button 
                onClick={handleExport} 
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg shadow-purple-900/20 transition-all active:scale-95"
             >
                {isPngOnly ? t('download_png') : t('download_zip')}
             </button>
          </div>
       </div>
    </div>
  );
};

export default ExportDialog;
