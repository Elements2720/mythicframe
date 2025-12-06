
import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface BgReplaceCanvasProps {
  generatedImage: string | null;     // Result
  originalImage: string | null;      // Source
  onAddFiles?: (files: FileList) => void;
}

const BgReplaceCanvas: React.FC<BgReplaceCanvasProps> = ({ generatedImage, originalImage, onAddFiles }) => {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0 && onAddFiles) onAddFiles(e.dataTransfer.files);
  };

  const hasResult = generatedImage && originalImage && generatedImage !== originalImage;
  const displayImage = (hasResult && !isComparing) ? generatedImage : (originalImage || generatedImage);

  return (
    <div 
      className={`flex-1 bg-black relative flex items-center justify-center p-8 overflow-hidden min-h-[400px] transition-colors ${isDragOver ? 'ring-4 ring-purple-500/50' : ''}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {isDragOver && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-purple-900/40 backdrop-blur-sm pointer-events-none">
            <div className="text-2xl font-bold text-white flex flex-col items-center gap-2">
               <i className="fa-solid fa-cloud-arrow-up text-5xl" />
               {t('drop_images')}
            </div>
         </div>
      )}

      {hasResult && (
          <div className="absolute bottom-6 z-50 flex gap-2 animate-in slide-in-from-bottom-4 fade-in">
             <button 
                onMouseDown={() => setIsComparing(true)}
                onMouseUp={() => setIsComparing(false)}
                onMouseLeave={() => setIsComparing(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full border border-slate-600 shadow-xl font-bold text-sm active:scale-95 transition-transform select-none flex items-center gap-2"
             >
                <i className="fa-solid fa-eye" /> {t('hold_compare')}
             </button>
          </div>
      )}

      <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 inline-flex items-center justify-center bg-black max-w-full max-h-full">
         {displayImage ? (
            <img src={displayImage} alt="Canvas" className="max-w-full max-h-[70vh] object-contain block" />
         ) : (
            <div className="w-96 h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-purple-500/30 rounded p-10 select-none bg-slate-900/50">
               <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-purple-500">
                  <i className="fa-solid fa-panorama text-4xl" />
               </div>
               <div className="text-center text-slate-400">
                  <h3 className="text-lg font-bold text-slate-200">Background Replacer</h3>
                  <p className="text-sm mt-1">Drag images here to start batch processing.</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default BgReplaceCanvas;
