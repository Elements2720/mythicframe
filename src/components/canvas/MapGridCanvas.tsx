
import React, { useRef, useState, useEffect } from 'react';
import FullScreenPreview from '../ui/FullScreenPreview';
import { AspectRatio, PixelDimensions, MapGridConfig } from '../../types';

interface MapGridCanvasProps {
  generatedImage: string | null;
  mapGridConfig: MapGridConfig;
  aspectRatio: AspectRatio;
  customRes?: PixelDimensions;
  isGenerating?: boolean;
  statusMessage?: string;
  onImageUpload?: (file: File) => void;
  onClearImage?: () => void;
  sessionImages?: string[];
  onSelectSessionImage?: (url: string) => void;
  onGenerateMore?: () => void;
  onExportTileset?: () => void;
}

const MapGridCanvas: React.FC<MapGridCanvasProps> = ({
  generatedImage, mapGridConfig, aspectRatio, customRes,
  isGenerating, statusMessage, onImageUpload, onClearImage,
  sessionImages, onSelectSessionImage, onGenerateMore, onExportTileset
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPreview, setShowPreview] = useState(false);

  // Pan/Zoom State
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Monitor Container Size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize(prev => (prev.width === width && prev.height === height) ? prev : { width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pan/Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, view.scale + scaleAmount), 5);
    setView(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
       e.preventDefault();
       setIsPanning(true);
       lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
       e.preventDefault();
       const dx = e.clientX - lastMousePos.current.x;
       const dy = e.clientY - lastMousePos.current.y;
       setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
       lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const getAspectRatioStyle = (ratio: AspectRatio): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        transformOrigin: 'center center',
        transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        position: 'relative'
    };

    if (containerSize.width > 0 && containerSize.height > 0) {
        let r = 1;
        if (ratio === 'custom' && customRes) {
             r = customRes.width / customRes.height;
        } else {
             const ratioMap: Record<string, number> = { "1:1": 1, "3:4": 3/4, "4:3": 4/3, "9:16": 9/16, "16:9": 16/9, "21:9": 21/9 };
             r = ratioMap[ratio] || 1;
        }

        const containerRatio = containerSize.width / containerSize.height;
        let w, h;
        if (containerRatio > r) {
            h = containerSize.height;
            w = h * r;
        } else {
            w = containerSize.width;
            h = w / r;
        }
        return { ...baseStyle, width: w, height: h };
    }
    return { ...baseStyle, width: '100%', height: '100%', aspectRatio: '1 / 1' };
  };

  const renderGrid = () => {
    if (!mapGridConfig.showGrid) return null;

    const { gridWidth, gridHeight, viewMode, tileDiamondRatio } = mapGridConfig;
    
    if (viewMode === 'top-down') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-30">
          <defs>
            <pattern id="grid" width={`${100 / gridWidth}%`} height={`${100 / gridHeight}%`} patternUnits="userSpaceOnUse">
              <rect width="100%" height="100%" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      );
    } else {
      // Improved Isometric Grid
      const lines = [];
      // Vertical lines (along X axis)
      for (let i = 0; i <= gridWidth; i++) {
        const x = (i / gridWidth) * 100;
        lines.push(
          <line key={`v-${i}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="white" strokeWidth="0.5" />
        );
      }
      // Horizontal lines (along Y axis)
      for (let i = 0; i <= gridHeight; i++) {
        const y = (i / gridHeight) * 100;
        lines.push(
          <line key={`h-${i}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="white" strokeWidth="0.5" />
        );
      }

      return (
        <div className="absolute inset-0 z-10 opacity-30 pointer-events-none overflow-hidden">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
            style={{ 
              transform: `scaleY(${tileDiamondRatio}) rotate(45deg) scale(1.4)`,
              transformOrigin: 'center center'
            }}
          >
            {lines}
          </svg>
        </div>
      );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full bg-slate-900 relative flex items-center justify-center p-8 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] ${isPanning ? 'cursor-grabbing' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* View Reset Button */}
      {(view.scale !== 1 || view.x !== 0 || view.y !== 0) && (
          <div className="absolute bottom-6 left-6 z-30">
             <button 
                onClick={() => setView({ scale: 1, x: 0, y: 0 })}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 shadow-lg text-xs font-bold flex items-center gap-2"
             >
                <i className="fa-solid fa-compress" /> Reset View
             </button>
          </div>
      )}

      {/* SESSION GALLERY */}
      {sessionImages && sessionImages.length > 0 && (
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2">
             <div className="bg-black/60 backdrop-blur rounded-full p-1.5 flex gap-2 border border-white/10 shadow-xl overflow-x-auto max-w-[80vw] items-center">
                {sessionImages.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => onSelectSessionImage && onSelectSessionImage(img)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all shrink-0 ${generatedImage === img ? 'border-purple-500 scale-110 ring-2 ring-purple-500/50 z-10' : 'border-slate-600 hover:border-white opacity-80 hover:opacity-100'}`}
                    >
                       <img src={img} className="w-full h-full object-cover" />
                    </button>
                ))}
                {onGenerateMore && (
                    <button 
                      onClick={onGenerateMore}
                      disabled={isGenerating}
                      className="w-12 h-12 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-purple-500 text-slate-400 hover:text-purple-400 flex items-center justify-center transition-all shrink-0"
                    >
                       {isGenerating ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-plus text-lg" />}
                    </button>
                )}
             </div>
         </div>
      )}

      <div 
        ref={contentRef}
        className="group relative shadow-2xl shadow-purple-900/20 rounded-lg overflow-hidden border border-slate-700 inline-flex items-center justify-center bg-black"
        style={getAspectRatioStyle(aspectRatio)}
      >
        {/* LOADING OVERLAY */}
        {isGenerating && (
           <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <i className="fa-solid fa-circle-notch fa-spin text-4xl text-purple-500 mb-4" />
              <p className="text-white font-bold text-lg animate-pulse">{statusMessage || 'Generating Map...'}</p>
           </div>
        )}

        {/* IMAGE RENDERING */}
        {generatedImage ? (
           <>
             <img src={generatedImage} alt="Generated Map" className="w-full h-full object-contain block relative z-0" />
             <div className="absolute top-3 right-3 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   onClick={() => {
                     const link = document.createElement('a');
                     link.href = generatedImage;
                     link.download = `map-grid-${Date.now()}.png`;
                     link.click();
                   }}
                   className="w-8 h-8 bg-black/50 hover:bg-green-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                   title="Download PNG"
                 >
                   <i className="fa-solid fa-download text-xs" />
                 </button>
                 <button 
                   onClick={() => {
                     const canvas = document.createElement('canvas');
                     const img = new Image();
                     img.onload = () => {
                       canvas.width = img.width;
                       canvas.height = img.height;
                       const ctx = canvas.getContext('2d');
                       if (ctx) {
                         ctx.fillStyle = '#FFFFFF';
                         ctx.fillRect(0, 0, canvas.width, canvas.height);
                         ctx.drawImage(img, 0, 0);
                         const link = document.createElement('a');
                         link.href = canvas.toDataURL('image/jpeg', 0.9);
                         link.download = `map-grid-${Date.now()}.jpg`;
                         link.click();
                       }
                     };
                     img.src = generatedImage;
                   }}
                   className="w-8 h-8 bg-black/50 hover:bg-orange-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                   title="Download JPG"
                 >
                   <i className="fa-solid fa-file-image text-xs" />
                 </button>
                 <button 
                   onClick={() => {
                     const canvas = document.createElement('canvas');
                     const img = new Image();
                     img.onload = () => {
                       const { gridWidth, gridHeight } = mapGridConfig;
                       const tileW = img.width / gridWidth;
                       const tileH = img.height / gridHeight;
                       const padding = 2;
                       
                       canvas.width = img.width + (gridWidth * padding);
                       canvas.height = img.height + (gridHeight * padding);
                       const ctx = canvas.getContext('2d');
                       if (ctx) {
                         ctx.clearRect(0, 0, canvas.width, canvas.height);
                         for (let y = 0; y < gridHeight; y++) {
                           for (let x = 0; x < gridWidth; x++) {
                             ctx.drawImage(
                               img, 
                               x * tileW, y * tileH, tileW, tileH,
                               x * (tileW + padding), y * (tileH + padding), tileW, tileH
                             );
                           }
                         }
                         const link = document.createElement('a');
                         link.href = canvas.toDataURL('image/png');
                         link.download = `map-spritesheet-${Date.now()}.png`;
                         link.click();
                       }
                     };
                     img.src = generatedImage;
                   }}
                   className="w-8 h-8 bg-black/50 hover:bg-purple-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                   title="Export Tile-sliced Spritesheet"
                 >
                   <i className="fa-solid fa-grip text-xs" />
                 </button>
                 <button 
                   onClick={() => {
                     const data = {
                       config: mapGridConfig,
                       timestamp: Date.now(),
                       version: "1.0.0"
                     };
                     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                     const url = URL.createObjectURL(blob);
                     const link = document.createElement('a');
                     link.href = url;
                     link.download = `map-data-${Date.now()}.json`;
                     link.click();
                     URL.revokeObjectURL(url);
                   }}
                   className="w-8 h-8 bg-black/50 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                   title="Export JSON Data"
                 >
                   <i className="fa-solid fa-code text-xs" />
                 </button>
                 <button 
                    onClick={onExportTileset}
                    className="w-8 h-8 bg-black/50 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                    title="Download Tileset (ZIP)"
                  >
                    <i className="fa-solid fa-file-zipper text-xs" />
                  </button>
                  <button onClick={() => setShowPreview(true)} className="w-8 h-8 bg-black/50 hover:bg-blue-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg" title="Full Screen"><i className="fa-solid fa-expand text-xs" /></button>
                 {onClearImage && <button onClick={onClearImage} className="w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg" title="Clear Canvas"><i className="fa-solid fa-times text-xs" /></button>}
             </div>
           </>
        ) : (
           <div className="w-full h-full flex items-center justify-center flex-col gap-4 bg-slate-800/50 relative z-0 select-none">
              <i className="fa-solid fa-map text-6xl opacity-20 text-slate-500" />
              <div className="text-center">
                 <p className="text-lg font-bold text-slate-400 mb-1">Map Preview</p>
                 <p className="text-sm text-slate-500">Configure grid settings in the right panel</p>
              </div>
           </div>
        )}

        {/* GRID OVERLAY */}
        {renderGrid()}
      </div>

      <FullScreenPreview isOpen={showPreview} onClose={() => setShowPreview(false)} imageUrl={generatedImage} />
    </div>
  );
};

export default MapGridCanvas;
