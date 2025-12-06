
import React, { useRef, useState, useEffect } from 'react';
import { PixelDimensions, SafeZoneConfig } from '../../types';
import ResizableBox from '../ui/ResizableBox';
import { useLanguage } from '../../i18n/LanguageContext';

interface ResizeCanvasProps {
  // Image Data
  generatedImage: string | null;     // The "Result" (or current view)
  resizeOriginalImage: string | null; // The "Source" (for composition)
  
  // Dimensions
  targetDimensions: PixelDimensions;
  
  // Transform State
  resizeZoom: number;
  setResizeZoom: (val: number) => void;
  resizePan: { x: number; y: number };
  setResizePan: (val: { x: number; y: number }) => void;
  
  // Interactions
  onAddFiles?: (files: FileList) => void;
  
  // Overlays
  safeZone: SafeZoneConfig;
  setSafeZone: (val: SafeZoneConfig) => void;
  useCustomResBox: boolean;
  customResBox: any;
  setCustomResBox: (val: any) => void;
}

const ResizeCanvas: React.FC<ResizeCanvasProps> = ({
  generatedImage, resizeOriginalImage, targetDimensions,
  resizeZoom, setResizeZoom, resizePan, setResizePan,
  onAddFiles,
  safeZone, setSafeZone, useCustomResBox, customResBox, setCustomResBox
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentDims, setContentDims] = useState({ width: 0, height: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // Monitor Content Size for accurate overlay positioning
  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [generatedImage, resizeOriginalImage, targetDimensions]);

  // --- Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(0.1, Math.min(3.0, resizeZoom + delta));
    setResizeZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow pan if we are manipulating the SOURCE (not viewing a result without compare)
    const isViewingResult = generatedImage && resizeOriginalImage && generatedImage !== resizeOriginalImage && !isComparing;
    if (isViewingResult) return;

    e.preventDefault();
    setIsDraggingPan(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPan({ x: resizePan.x, y: resizePan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan) return;
    e.preventDefault();
    
    // Calculate movement in "Target Pixel" space
    const viewScale = (contentDims.width && targetDimensions && targetDimensions.width) ? contentDims.width / targetDimensions.width : 1;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const targetDx = dx / viewScale;
    const targetDy = dy / viewScale;
    
    setResizePan({ x: startPan.x + targetDx, y: startPan.y + targetDy });
  };

  const handleMouseUp = () => setIsDraggingPan(false);

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0 && onAddFiles) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  // --- Styles ---

  const getCanvasStyle = () => {
     if (!targetDimensions) return { width: '300px', height: '300px' };
     const ratio = targetDimensions.width / targetDimensions.height;
     return {
         width: `min(100%, 70vh * ${ratio})`,
         height: `min(70vh, 100% / ${ratio})`,
         aspectRatio: `${ratio}`,
         maxWidth: '100%',
         maxHeight: '70vh'
     };
  };

  const getSourceTransformStyle = () => {
    const viewScale = (contentDims.width && targetDimensions && targetDimensions.width) ? contentDims.width / targetDimensions.width : 1;
    const translateX = resizePan.x * viewScale;
    const translateY = resizePan.y * viewScale;
    
    return {
       position: 'absolute' as const,
       left: '50%',
       top: '50%',
       maxWidth: '100%',
       maxHeight: '100%',
       width: 'auto',
       height: 'auto',
       transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${resizeZoom})`,
       cursor: isDraggingPan ? 'grabbing' : 'grab',
       transition: isDraggingPan ? 'none' : 'transform 0.1s ease-out',
       userSelect: 'none' as const,
       pointerEvents: 'auto' as const
    };
  };

  const hasImage = !!(generatedImage || resizeOriginalImage);
  const isResultAvailable = generatedImage && resizeOriginalImage && generatedImage !== resizeOriginalImage;
  const showResult = isResultAvailable && !isComparing;

  return (
    <div 
      ref={containerRef}
      className={`flex-1 bg-black relative flex items-center justify-center p-8 overflow-hidden min-h-[400px] transition-colors ${isDragOver ? 'ring-4 ring-purple-500/50' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Hint */}
      {isDragOver && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-purple-900/40 backdrop-blur-sm pointer-events-none">
            <div className="text-2xl font-bold text-white flex flex-col items-center gap-2">
               <i className="fa-solid fa-cloud-arrow-up text-5xl" />
               {t('drop_images')}
            </div>
         </div>
      )}

      {/* Compare Button */}
      {isResultAvailable && (
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


      <div 
        ref={contentRef}
        className={`relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 inline-flex items-center justify-center transition-all duration-300 bg-black`}
        style={getCanvasStyle()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
         {hasImage ? (
            <>
               {showResult ? (
                  <img 
                    src={generatedImage!} 
                    alt="Result"
                    className="w-full h-full object-contain z-10 pointer-events-none"
                    draggable={false}
                  />
               ) : (

                  <>
                     <img 
                        src={resizeOriginalImage || generatedImage!} 
                        alt="Source"
                        style={getSourceTransformStyle()}
                        draggable={false}
                        className="z-10"
                     />

                     <div className="absolute inset-0 border-2 border-dashed border-purple-500/50 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                        <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                           {isComparing ? t('orig_input') : t('output_area')}
                        </div>
                     </div>
                  </>
               )}

               {/* --- Safe Zone Overlay --- */}
               {safeZone.enabled && (
                  <div className="absolute inset-0 z-30 pointer-events-none">
                      <div className="absolute top-0 left-0 right-0 bg-black/70 pointer-events-none transition-all duration-200" style={{ height: `${safeZone.y}%` }} />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 pointer-events-none transition-all duration-200" style={{ height: `${100 - (safeZone.y + safeZone.height)}%` }} />
                      <div className="absolute left-0 bg-black/70 pointer-events-none transition-all duration-200" style={{ top: `${safeZone.y}%`, height: `${safeZone.height}%`, width: `${safeZone.x}%` }} />
                      <div className="absolute right-0 bg-black/70 pointer-events-none transition-all duration-200" style={{ top: `${safeZone.y}%`, height: `${safeZone.height}%`, width: `${100 - (safeZone.x + safeZone.width)}%` }} />
                      
                      <div className="absolute inset-0 z-40 pointer-events-auto">
                        <ResizableBox 
                            x={safeZone.x}
                            y={safeZone.y}
                            width={safeZone.width}
                            height={safeZone.height}
                            onDragStop={(x, y) => setSafeZone({...safeZone, x, y})}
                            onResizeStop={(width, height, x, y) => setSafeZone({...safeZone, width, height, x, y})}
                            label="Safe Zone"
                            color="green"
                            showDimensions
                            isSelected={true}
                            containerWidth={contentDims.width}
                            containerHeight={contentDims.height}
                        />
                      </div>
                  </div>
               )}

               {useCustomResBox && (
                  <div className="absolute inset-0 z-50">
                      <ResizableBox 
                        {...customResBox}
                        onDragStop={(x: number, y: number) => setCustomResBox({ ...customResBox, x, y })}
                        onResizeStop={(w: number, h: number, x: number, y: number) => setCustomResBox({ x, y, width: w, height: h })}
                        label="Crop Region"
                        color="cyan"
                        showDimensions
                        containerWidth={contentDims.width}
                        containerHeight={contentDims.height}
                        isSelected={true}
                      />
                  </div>
               )}
            </>
         ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-purple-500/30 rounded p-10 select-none cursor-pointer bg-slate-900/50 hover:bg-slate-800/80 transition-colors">
               <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-purple-500">
                  <i className="fa-solid fa-expand text-4xl" />
               </div>
               <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-200">{t('magic_resizer')}</h3>
                  <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">
                     {t('drag_drop_hint')}
                  </p>
               </div>
            </div>
         )}
      </div>

    </div>
  );
};

export default ResizeCanvas;
