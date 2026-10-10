
import React, { useEffect, useRef, useState } from 'react';
import { PixelDimensions } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  targetSize: PixelDimensions;
  onApply: (croppedImageUrl: string) => void;
  initialCrop?: { x: number; y: number; width: number; height: number }; // Percentages relative to image
}

interface CropState {
  x: number;
  y: number;
  scale: number;
}

const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, imageUrl, targetSize, onApply, initialCrop }) => {
  const { t } = useLanguage();
  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [state, setState] = useState<CropState>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  
  // Load Image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      
      // If we have an explicit initial crop (from Safe Zone), use it
      if (initialCrop) {
         // Convert Percentage Rect to Viewport Transform
         const imgW = img.width;
         const imgH = img.height;
         
         const cropX = (initialCrop.x / 100) * imgW;
         const cropY = (initialCrop.y / 100) * imgH;
         const cropW = (initialCrop.width / 100) * imgW;
         const cropH = (initialCrop.height / 100) * imgH;
         
         // Scale needed to make the crop rect fill the target dimensions
         // We take the max scale to ensure coverage (cover)
         const sW = targetSize.width / cropW;
         const sH = targetSize.height / cropH;
         const s = Math.max(sW, sH);
         
         // Center the crop rect in the view
         const cropCX = cropX * s + (cropW * s) / 2;
         const cropCY = cropY * s + (cropH * s) / 2;
         
         const targetCX = targetSize.width / 2;
         const targetCY = targetSize.height / 2;
         
         const x = targetCX - cropCX;
         const y = targetCY - cropCY;
         
         setState({ x, y, scale: s });

      } else {
         // Default Auto-Fit
         fitImage(img, 'cover');
      }
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, targetSize, initialCrop]);

  // Handle Resize / Fit to Screen
  useEffect(() => {
    const updateLayout = () => {
      // Calculate max available space for the preview (approx 600px height or 80vw)
      const maxW = Math.min(window.innerWidth * 0.8, 800);
      const maxH = Math.min(window.innerHeight * 0.6, 600);
      
      const targetRatio = targetSize.width / targetSize.height;
      
      let w = maxW;
      let h = w / targetRatio;
      
      if (h > maxH) {
        h = maxH;
        w = h * targetRatio;
      }
      setPreviewSize({ width: w, height: h });
    };

    if (isOpen) {
      updateLayout();
      window.addEventListener('resize', updateLayout);
    }
    return () => window.removeEventListener('resize', updateLayout);
  }, [isOpen, targetSize]);

  // Render Loop
  useEffect(() => {
    if (!image || !canvasRef.current || previewSize.width === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, previewSize.width, previewSize.height);

    // Calculate view scale (ratio of preview pixels to target pixels)
    const viewScale = previewSize.width / targetSize.width;

    ctx.save();
    // Apply View Scale
    ctx.scale(viewScale, viewScale);
    
    // Draw Image (using Target Coordinate Space)
    ctx.drawImage(
      image, 
      state.x, 
      state.y, 
      image.width * state.scale, 
      image.height * state.scale
    );

    ctx.restore();

    // Draw Overlay Guides (Rule of Thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Verticals
    ctx.beginPath();
    ctx.moveTo(previewSize.width / 3, 0);
    ctx.lineTo(previewSize.width / 3, previewSize.height);
    ctx.moveTo((previewSize.width / 3) * 2, 0);
    ctx.lineTo((previewSize.width / 3) * 2, previewSize.height);
    ctx.stroke();

    // Horizontals
    ctx.beginPath();
    ctx.moveTo(0, previewSize.height / 3);
    ctx.lineTo(previewSize.width, previewSize.height / 3);
    ctx.moveTo(0, (previewSize.height / 3) * 2);
    ctx.lineTo(previewSize.width, (previewSize.height / 3) * 2);
    ctx.stroke();

  }, [image, state, previewSize, targetSize]);

  // --- Logic Helpers ---

  const constrain = (s: CropState, img: HTMLImageElement): CropState => {
    // Goal: Keep image covering the frame if possible
    // Only constrain if image is larger than frame.
    const imgW = img.width * s.scale;
    const imgH = img.height * s.scale;
    
    let newX = s.x;
    let newY = s.y;

    // If image width > target width, don't let edges show
    if (imgW >= targetSize.width) {
      if (newX > 0) newX = 0; // Left gap
      if (newX + imgW < targetSize.width) newX = targetSize.width - imgW; // Right gap
    } else {
       // Center it
       newX = (targetSize.width - imgW) / 2;
    }

    // Same for height
    if (imgH >= targetSize.height) {
      if (newY > 0) newY = 0;
      if (newY + imgH < targetSize.height) newY = targetSize.height - imgH;
    } else {
       newY = (targetSize.height - imgH) / 2;
    }

    return { ...s, x: newX, y: newY };
  };

  const fitImage = (img: HTMLImageElement, mode: 'cover' | 'contain' | 'width' | 'height') => {
    let s = 1;
    if (mode === 'cover') {
      const sW = targetSize.width / img.width;
      const sH = targetSize.height / img.height;
      s = Math.max(sW, sH);
    } else if (mode === 'contain') {
      const sW = targetSize.width / img.width;
      const sH = targetSize.height / img.height;
      s = Math.min(sW, sH);
    } else if (mode === 'width') {
      s = targetSize.width / img.width;
    } else if (mode === 'height') {
      s = targetSize.height / img.height;
    }

    // Center
    const w = img.width * s;
    const h = img.height * s;
    const x = (targetSize.width - w) / 2;
    const y = (targetSize.height - h) / 2;

    setState({ x, y, scale: s });
  };

  const align = (direction: 'center' | 'top' | 'bottom') => {
    if (!image) return;
    let newY = state.y;
    const imgH = image.height * state.scale;
    
    if (direction === 'center') {
      newY = (targetSize.height - imgH) / 2;
    } else if (direction === 'top') {
      newY = 0;
    } else if (direction === 'bottom') {
      newY = targetSize.height - imgH;
    }
    setState(constrain({ ...state, y: newY }, image));
  };

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    if (!image) return;
    e.preventDefault();
    const zoomIntensity = 0.001;
    let newScale = state.scale + (e.deltaY * -zoomIntensity * state.scale);
    
    // Limits
    const minScale = Math.max(targetSize.width / image.width, targetSize.height / image.height) * 0.5;
    const maxScale = minScale * 5;
    
    if (newScale < minScale) newScale = minScale;
    if (newScale > maxScale) newScale = maxScale;

    // Zoom towards center of target
    const ratio = newScale / state.scale;
    const cx = targetSize.width / 2;
    const cy = targetSize.height / 2;
    const newX = cx - (cx - state.x) * ratio;
    const newY = cy - (cy - state.y) * ratio;

    setState(constrain({ x: newX, y: newY, scale: newScale }, image));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !image) return;
    
    const viewScale = previewSize.width / targetSize.width;
    const dx = (e.clientX - dragStart.x) / viewScale; // Convert screen pixels to target pixels
    const dy = (e.clientY - dragStart.y) / viewScale;
    
    const nextState = { ...state, x: state.x + dx, y: state.y + dy };
    setState(constrain(nextState, image));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleApply = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Render final crop
    ctx.drawImage(
      image,
      state.x,
      state.y,
      image.width * state.scale,
      image.height * state.scale
    );
    
    onApply(canvas.toDataURL('image/png'));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
       <div 
         className="bg-slate-950 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-w-[90vw] max-h-[90vh] overflow-hidden w-[850px]"
         onClick={(e) => e.stopPropagation()}
       >
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
             <div>
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-crop-simple text-purple-500" /> {t('custom_crop_box')}
               </h2>
               <p className="text-xs text-slate-400">
                  Target: <span className="text-purple-300 font-mono">{targetSize.width} x {targetSize.height}</span>
               </p>
             </div>
             <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <i className="fa-solid fa-times" />
             </button>
          </div>

          {/* Main Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center p-8 overflow-hidden select-none">
             {/* Canvas Container */}
             <div 
               style={{ width: previewSize.width, height: previewSize.height }} 
               className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-move"
               onWheel={handleWheel}
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
             >
                <canvas 
                   ref={canvasRef}
                   width={previewSize.width}
                   height={previewSize.height}
                   className="w-full h-full block bg-slate-800"
                />
                
                {/* Visual Border */}
                <div className="absolute inset-0 border border-purple-500/30 pointer-events-none shadow-inner" />
             </div>
             
             {/* Hint */}
             <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">
                   Scroll to Zoom • Drag to Pan
                </span>
             </div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-4">
             
             {/* Tools Row */}
             <div className="flex items-center justify-between">
                <div className="flex gap-2">
                   <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                      <button onClick={() => image && fitImage(image, 'cover')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Auto Fit (Cover)">
                         Auto
                      </button>
                      <button onClick={() => image && fitImage(image, 'width')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Fit Width">
                         W
                      </button>
                      <button onClick={() => image && fitImage(image, 'height')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Fit Height">
                         H
                      </button>
                   </div>
                   
                   <div className="w-px bg-slate-700 mx-1"></div>

                   <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                      <button onClick={() => align('top')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Align Top">
                         <i className="fa-solid fa-arrow-up" />
                      </button>
                      <button onClick={() => align('center')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Center">
                         <i className="fa-solid fa-arrows-to-dot" />
                      </button>
                      <button onClick={() => align('bottom')} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded" title="Align Bottom">
                         <i className="fa-solid fa-arrow-down" />
                      </button>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                      {t('cancel')}
                   </button>
                   <button 
                      onClick={handleApply}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg shadow-purple-900/20 flex items-center gap-2"
                   >
                      <i className="fa-solid fa-check" /> {t('crop_result')}
                   </button>
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default CropModal;
