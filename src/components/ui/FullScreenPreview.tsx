
import React, { useEffect } from 'react';

interface FullScreenPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const FullScreenPreview: React.FC<FullScreenPreviewProps> = ({ isOpen, onClose, imageUrl }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200 backdrop-blur-sm">
       {/* Toolbar */}
       <div className="absolute top-4 right-4 z-50 flex gap-2">
          <a
            href={imageUrl}
            download={`preview_${Date.now()}.png`}
            className="w-12 h-12 rounded-full bg-black/50 hover:bg-slate-800 text-white flex items-center justify-center transition-colors border border-white/10 group"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
             <i className="fa-solid fa-download group-hover:scale-110 transition-transform" />
          </a>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-black/50 hover:bg-red-900/50 text-white flex items-center justify-center transition-colors border border-white/10 group"
            title="Close (Esc)"
          >
             <i className="fa-solid fa-times text-xl group-hover:scale-110 transition-transform" />
          </button>
       </div>

       {/* Image Area */}
       <div className="flex-1 flex items-center justify-center p-4 w-full h-full cursor-zoom-out" onClick={onClose}>
          <img
            src={imageUrl}
            className="max-w-full max-h-full object-contain shadow-2xl cursor-default"
            alt="Full Screen Preview"
            onClick={(e) => e.stopPropagation()}
          />
       </div>
    </div>
  );
};

export default FullScreenPreview;
