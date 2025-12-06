import React, { useRef, useState, useEffect } from 'react';
import ResizableBox from '../ui/ResizableBox';
import { UIMode, AspectRatio, PixelDimensions, SafeZoneConfig, CharacterToolState } from '../../types';
import { exportSingleImage } from '../../services/exportService';

interface IllustrationCanvasProps {
  generatedImage: string | null;
  showOverlays?: boolean;
  cardName?: string;
  cardEffects?: string;
  useCustomResBox: boolean;
  customResBox: any;
  setCustomResBox: (val: any) => void;
  isEditMode: boolean;
  editRegion: any;
  setEditRegion: (val: any) => void;
  mode?: UIMode;
  aspectRatio: AspectRatio;
  customRes?: PixelDimensions;
  
  // Animation Props
  isPlaying?: boolean;
  currentFrameIndex?: number;
  totalFrames?: number;
  onionSkinImage?: string | null;

  // Safe Zone
  safeZone: SafeZoneConfig;
  setSafeZone: (val: SafeZoneConfig) => void;

  // New Upload Handler
  onImageUpload?: (file: File) => void;
  onClearImage?: () => void;

  // Session / Batch Gallery
  sessionImages?: string[];
  onSelectSessionImage?: (url: string) => void;
  onGenerateMore?: () => void;
  onClearSession?: () => void;
  onRemoveSessionImage?: (url: string) => void;
  isGenerating?: boolean;

  // Character Tool
  characterTool?: CharacterToolState;
  onCharacterLookClick?: (x: number, y: number) => void;
}

const IllustrationCanvas: React.FC<IllustrationCanvasProps> = ({
  generatedImage, showOverlays, cardName, cardEffects,
  useCustomResBox, customResBox, setCustomResBox,
  isEditMode, editRegion, setEditRegion, mode, aspectRatio, customRes,
  isPlaying, currentFrameIndex, totalFrames, onionSkinImage,
  safeZone, setSafeZone, onImageUpload, onClearImage,
  sessionImages, onSelectSessionImage, onGenerateMore, onClearSession, onRemoveSessionImage, isGenerating,
  characterTool, onCharacterLookClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentDims, setContentDims] = useState({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Pan/Zoom State
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Monitor the actual size of the image/placeholder content
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
  }, [generatedImage, aspectRatio, mode, customRes]);

  // Pan/Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        // Prevent default browser zoom if ctrl is held (optional, but good UX)
        e.preventDefault();
    }
    // Zoom Logic
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, view.scale + scaleAmount), 5);
    setView(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle Mouse Button (1)
    if (e.button === 1) {
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

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => setIsPanning(false);

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!generatedImage && onImageUpload) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!generatedImage && onImageUpload && e.dataTransfer.files.length > 0) {
       const file = e.dataTransfer.files[0];
       if (file.type.startsWith('image/')) {
          onImageUpload(file);
       }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0 && onImageUpload) {
        onImageUpload(e.target.files[0]);
     }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      // Only trigger if we are actively setting the target
      if (characterTool?.enabled && characterTool.isSettingLookTarget && onCharacterLookClick && contentRef.current) {
          const rect = contentRef.current.getBoundingClientRect();
          // Adjust for scale
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onCharacterLookClick(x, y);
      }
  };

  // Helper to convert aspect ratio string to CSS style
  const getAspectRatioStyle = (ratio: AspectRatio): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        transformOrigin: 'center center',
        transition: isPanning ? 'none' : 'transform 0.1s ease-out'
    };

    // If we have an image, let it define the ratio naturally (auto) to avoid letterboxing
    if (generatedImage) {
        return {
           ...baseStyle,
           width: 'auto',
           height: 'auto',
           maxWidth: '100%',
           maxHeight: '70vh'
        };
    }

    // Otherwise use placeholder ratio
    if (ratio === 'custom' && customRes) {
        const ratioVal = customRes.width / customRes.height;
        return {
           ...baseStyle,
           width: `min(100%, 70vh * ${ratioVal})`,
           height: `min(70vh, 100% / ${ratioVal})`,
           aspectRatio: `${ratioVal}`,
           maxWidth: '100%',
           maxHeight: '70vh'
       };
    }
    const ratioMap: Record<string, number> = { "1:1": 1, "3:4": 3/4, "4:3": 4/3, "9:16": 9/16, "16:9": 16/9, "21:9": 21/9 };
    const numericRatio = ratioMap[ratio] || 1;
    return {
      ...baseStyle,
      width: `min(100%, 70vh * ${numericRatio})`,
      height: `min(70vh, 100% / ${numericRatio})`,
      aspectRatio: `${numericRatio}`,
      maxWidth: '100%',
      maxHeight: '70vh'
    };
  };

  const containerBgClass = 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]';

  return (
    <div 
      ref={containerRef}
      className={`flex-1 bg-slate-900 relative flex items-center justify-center p-8 overflow-hidden min-h-[400px] transition-colors ${containerBgClass} ${isPanning ? 'cursor-grabbing' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      
      {/* View Reset Button */}
      {(view.scale !== 1 || view.x !== 0 || view.y !== 0) && (
          <div className="absolute bottom-6 left-6 z-50 animate-in fade-in">
             <button 
                onClick={() => setView({ scale: 1, x: 0, y: 0 })}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 shadow-lg text-xs font-bold flex items-center gap-2"
             >
                <i className="fa-solid fa-compress" /> Reset View
             </button>
          </div>
      )}

      {/* TOP SESSION GALLERY (Variations) */}
      {sessionImages && sessionImages.length > 0 && (
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 animate-in slide-in-from-top-4 fade-in">
             <div className="bg-black/60 backdrop-blur rounded-full p-1.5 flex gap-2 border border-white/10 shadow-xl overflow-x-auto max-w-[80vw] custom-scrollbar">
                {sessionImages.map((img, idx) => (
                    <div key={idx} className="relative group/thumb">
                        <button 
                          onClick={() => onSelectSessionImage && onSelectSessionImage(img)}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all relative shrink-0 ${generatedImage === img ? 'border-purple-500 scale-110 ring-2 ring-purple-500/50 z-10' : 'border-slate-600 hover:border-white opacity-80 hover:opacity-100 hover:scale-105'}`}
                        >
                           <img src={img} className="w-full h-full object-cover" />
                        </button>
                        
                        {/* Download Button Overlay */}
                        <button
                           onClick={(e) => { 
                               e.stopPropagation(); 
                               const name = cardName?.trim() ? cardName.trim().replace(/\s+/g, '_') : 'variation';
                               exportSingleImage(img, `${name}_${idx + 1}.png`); 
                           }}
                           className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-md border border-slate-600 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20"
                           title="Download Variation"
                        >
                           <i className="fa-solid fa-download" />
                        </button>

                        {/* Delete Button Overlay */}
                        {onRemoveSessionImage && (
                           <button
                              onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if(confirm('Delete this image?')) onRemoveSessionImage(img); 
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-md border border-slate-600 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20"
                              title="Delete Variation"
                           >
                              <i className="fa-solid fa-times" />
                           </button>
                        )}
                    </div>
                ))}
                
                {/* Add Variation Button */}
                {onGenerateMore && (
                    <button 
                      onClick={onGenerateMore}
                      disabled={isGenerating}
                      className="w-12 h-12 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-purple-500 hover:bg-purple-900/20 text-slate-400 hover:text-purple-400 flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
                      title="Generate Another Variation"
                    >
                       {isGenerating ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-plus text-lg" />}
                    </button>
                )}
             </div>

             {/* Clear Session Button - Clears ALL */}
             {sessionImages.length > 1 && onClearSession && (
                <button 
                   onClick={() => { if(confirm("Clear current session gallery?")) onClearSession(); }}
                   className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-900/50 text-slate-500 hover:text-red-400 border border-slate-700 flex items-center justify-center transition-colors shadow-lg"
                   title="Clear Gallery (All)"
                >
                   <i className="fa-solid fa-trash text-xs" />
                </button>
             )}
         </div>
      )}

      <div 
        ref={contentRef}
        className={`relative group shadow-2xl shadow-purple-900/20 rounded-lg overflow-hidden border border-slate-700 inline-flex items-center justify-center ${isPlaying ? 'ring-2 ring-green-500' : ''}`}
        style={{ ...getAspectRatioStyle(aspectRatio), minWidth: generatedImage ? 'auto' : '300px' }}
      >
        {/* CHARACTER TOOL OVERLAY (Click Capture) */}
        {characterTool?.enabled && generatedImage && (
            <div 
                className={`absolute inset-0 z-50 ${characterTool.isSettingLookTarget ? 'cursor-crosshair bg-black/10' : 'pointer-events-none'}`}
                onClick={handleCanvasClick}
            >
                {/* Visual Feedback for Look Target */}
                {characterTool.lookTarget && (
                    <div 
                        className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-green-400 rounded-full flex items-center justify-center pointer-events-none shadow-lg animate-in zoom-in duration-200 z-50"
                        style={{ left: `${characterTool.lookTarget.x}%`, top: `${characterTool.lookTarget.y}%` }}
                    >
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                        <div className="absolute top-full mt-1 text-[9px] font-bold bg-black/60 text-green-300 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur">
                            Look At
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Onion Skin Layer */}
        {!isPlaying && onionSkinImage && mode === 'animation' && (
           <img 
             src={onionSkinImage} 
             alt="Onion Skin"
             className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none mix-blend-screen z-10"
             style={{ filter: 'grayscale(100%)' }}
           />
        )}

        {/* IMAGE RENDERING */}
        {generatedImage ? (
           <>
             <img 
               src={generatedImage} 
               alt="Generated" 
               className="max-h-[70vh] max-w-full object-contain block relative z-0"
             />
             
             {/* Close / Clear Image Button */}
             {onClearImage && (
                <div className="absolute top-3 right-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                      onClick={(e) => { e.stopPropagation(); onClearImage(); }}
                      className="w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 transition-colors shadow-lg"
                      title="Remove Image"
                   >
                      <i className="fa-solid fa-times" />
                   </button>
                </div>
             )}
           </>
        ) : (
           // PLACEHOLDER / DROP ZONE
           <div 
              className={`w-full h-full flex items-center justify-center flex-col gap-4 border-2 border-dashed rounded p-10 relative z-0 select-none transition-colors ${isDragOver ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800/50 border-slate-700'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
           >
              <i className={`fa-solid ${mode === 'frame' ? 'fa-border-all' : mode === 'background' ? 'fa-image' : mode === 'animation' ? 'fa-film' : mode === 'clothes' ? 'fa-shirt' : 'fa-paintbrush'} text-6xl opacity-50 ${isDragOver ? 'text-purple-400' : 'text-slate-500'}`} />
              <div className="text-center">
                 <p className="text-lg font-bold text-slate-200 mb-1">
                    {mode === 'frame' ? "Generate a card frame" : 
                     mode === 'background' ? "Generate a background" : 
                     mode === 'animation' ? "Animation Preview" :
                     mode === 'clothes' ? "Generate an outfit" :
                     "Generate an illustration"}
                 </p>
                 <p className="text-sm text-slate-400">
                    {aspectRatio === 'custom' && customRes 
                      ? `${customRes.width} x ${customRes.height}` 
                      : aspectRatio}
                 </p>
                 
                 {/* Explicitly Check Mode and Callback for Upload Button */}
                 {(mode === 'illustration' || mode === 'clothes') && onImageUpload && (
                    <div className="mt-4">
                       <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs bg-slate-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-2 mx-auto"
                       >
                          <i className="fa-solid fa-upload" /> Upload Image
                       </button>
                       <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                       />
                       <p className="text-[10px] text-slate-500 mt-2">or Drag & Drop to upload</p>
                    </div>
                 )}
              </div>
           </div>
        )}
        
        {/* Animation Playback Overlay Info */}
        {mode === 'animation' && (generatedImage || isPlaying) && (
           <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] font-mono rounded backdrop-blur pointer-events-none z-20">
              {isPlaying ? 'PLAYING' : 'PAUSED'} {typeof currentFrameIndex === 'number' ? `[${currentFrameIndex + 1}/${totalFrames}]` : ''}
           </div>
        )}

        {/* Frame Mode Visual Guide */}
        {mode === 'frame' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col z-20">
             <div className="h-[15%] w-full border-b border-dashed border-white/20 flex items-center justify-center">
                <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest bg-black/50 px-2 rounded">Header Area</span>
             </div>
             <div className="flex-1 w-full flex items-center justify-center">
                 <div className="border border-white/10 w-[80%] h-[70%] rounded flex items-center justify-center">
                    <span className="text-white/10 text-[10px] uppercase font-bold tracking-widest text-center">Transparent<br/>Content Area</span>
                 </div>
             </div>
             <div className="h-[25%] w-full border-t border-dashed border-white/20 flex items-center justify-center">
                <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest bg-black/50 px-2 rounded">Text Box Area</span>
             </div>
          </div>
        )}

        {/* OVERLAYS (Text) */}
        {showOverlays && generatedImage && (cardName || cardEffects) && mode !== 'frame' && mode !== 'background' && mode !== 'animation' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
            {cardName && (
              <div className="bg-black/60 backdrop-blur-sm p-2 rounded border border-white/20 self-start max-w-full">
                <h3 className="text-white font-serif text-lg font-bold drop-shadow-md">{cardName}</h3>
              </div>
            )}
            {cardEffects && (
              <div className="bg-black/70 backdrop-blur-sm p-3 rounded border border-white/20 mt-auto">
                <p className="text-white text-sm font-serif leading-relaxed drop-shadow-md whitespace-pre-wrap">{cardEffects}</p>
              </div>
            )}
          </div>
        )}

        {/* --- SAFE ZONE OVERLAY (Zoom-Out Tool) - Illustration & Clothes Mode Only --- */}
        {safeZone.enabled && contentDims.width > 0 && (mode === 'illustration' || mode === 'clothes') && (
           <>
              <div className="absolute top-0 left-0 right-0 bg-black/70 z-30 pointer-events-none transition-all duration-200 backdrop-grayscale-[30%]" style={{ height: `${safeZone.y}%` }} />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 z-30 pointer-events-none transition-all duration-200 backdrop-grayscale-[30%]" style={{ height: `${100 - (safeZone.y + safeZone.height)}%` }} />
              <div className="absolute left-0 bg-black/70 z-30 pointer-events-none transition-all duration-200" style={{ top: `${safeZone.y}%`, height: `${safeZone.height}%`, width: `${safeZone.x}%` }} />
              <div className="absolute right-0 bg-black/70 z-30 pointer-events-none transition-all duration-200" style={{ top: `${safeZone.y}%`, height: `${safeZone.height}%`, width: `${100 - (safeZone.x + safeZone.width)}%` }} />
              
              {/* Only show handles if Character Tool is disabled (avoid conflict) */}
              <div className={`absolute inset-0 z-40 ${characterTool?.enabled ? 'pointer-events-none' : ''}`}>
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
                    isSelected={!characterTool?.enabled}
                    containerWidth={contentDims.width}
                    containerHeight={contentDims.height}
                    disableDragging={characterTool?.enabled}
                    scale={view.scale}
                 >
                    <div className="absolute inset-0 border-2 border-green-400/80 shadow-[0_0_20px_rgba(74,222,128,0.3)] pointer-events-none">
                       <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 opacity-70">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-green-400"></div>
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-400"></div>
                       </div>
                       <div className="absolute top-2 left-2 text-[9px] text-green-300 font-bold bg-black/50 px-1 rounded uppercase tracking-wider backdrop-blur">
                          Main Content
                       </div>
                    </div>
                 </ResizableBox>
              </div>
           </>
        )}

        {/* Custom Resolution Box */}
        {useCustomResBox && !generatedImage && contentDims.width > 0 && (
           <div className="absolute inset-0 z-30">
              <ResizableBox 
                {...customResBox}
                onDragStop={(x: number, y: number) => setCustomResBox({ ...customResBox, x, y })}
                onResizeStop={(w: number, h: number, x: number, y: number) => setCustomResBox({ x, y, width: w, height: h })}
                label="Target Area"
                color="cyan"
                showDimensions
                containerWidth={contentDims.width}
                containerHeight={contentDims.height}
                isSelected={true}
                scale={view.scale}
              />
           </div>
        )}

        {/* Edit Region Box */}
        {isEditMode && generatedImage && contentDims.width > 0 && (
           <div className="absolute inset-0 z-30 bg-black/40">
             <ResizableBox 
                {...editRegion}
                onDragStop={(x: number, y: number) => setEditRegion({ ...editRegion, x, y })}
                onResizeStop={(w: number, h: number, x: number, y: number) => setEditRegion({ x, y, width: w, height: h })}
                label="Edit Mask"
                color="pink"
                isSelected
                containerWidth={contentDims.width}
                containerHeight={contentDims.height}
                scale={view.scale}
              />
           </div>
        )}
      </div>

    </div>
  );
};

export default IllustrationCanvas;