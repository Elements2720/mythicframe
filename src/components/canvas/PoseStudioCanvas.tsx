
import React, { useRef, useState, useEffect, useMemo } from 'react';
import FullScreenPreview from '../ui/FullScreenPreview';
import { AspectRatio, PixelDimensions, PoseData, PoseJoint } from '../../types';
import { DEFAULT_POSE_DATA } from '../../constants/pose';

interface PoseStudioCanvasProps {
  generatedImage: string | null;
  poseData: PoseData;
  setPoseData: (val: PoseData | ((prev: PoseData) => PoseData)) => void;
  aspectRatio: AspectRatio;
  customRes?: PixelDimensions;
  isGenerating?: boolean;
  statusMessage?: string;
  onImageUpload?: (file: File) => void;
  onClearImage?: () => void;
  sessionImages?: string[];
  onSelectSessionImage?: (url: string) => void;
  onGenerateMore?: () => void;
  onClearSession?: () => void;
  onRemoveSessionImage?: (url: string) => void;
}

const PoseStudioCanvas: React.FC<PoseStudioCanvasProps> = ({
  generatedImage, poseData, setPoseData, aspectRatio, customRes,
  isGenerating, statusMessage, onImageUpload, onClearImage,
  sessionImages, onSelectSessionImage, onGenerateMore, onClearSession, onRemoveSessionImage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeJointId, setActiveJointId] = useState<string | null>(null);
  const [selectedJointIds, setSelectedJointIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

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
       return;
    }

    if (e.button === 0) {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Check if we clicked a joint (this is handled by the joint's own onMouseDown, 
      // but we need to know if we clicked the background for selection box)
      const isJointClick = (e.target as HTMLElement).closest('.joint-handle');
      
      if (!isJointClick) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectionBox({ start: { x, y }, end: { x, y } });
        if (!e.shiftKey) setSelectedJointIds(new Set());
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
       e.preventDefault();
       const dx = e.clientX - lastMousePos.current.x;
       const dy = e.clientY - lastMousePos.current.y;
       setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
       lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (selectionBox) {
       const x = ((e.clientX - rect.left) / rect.width) * 100;
       const y = ((e.clientY - rect.top) / rect.height) * 100;
       setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null);
       
       // Update selection in real-time
       const xMin = Math.min(selectionBox.start.x, x);
       const xMax = Math.max(selectionBox.start.x, x);
       const yMin = Math.min(selectionBox.start.y, y);
       const yMax = Math.max(selectionBox.start.y, y);

       const newSelected = new Set(selectedJointIds);
       poseData.joints.forEach(j => {
         if (j.x >= xMin && j.x <= xMax && j.y >= yMin && j.y <= yMax) {
           newSelected.add(j.id);
         } else if (!e.shiftKey) {
           newSelected.delete(j.id);
         }
       });
       setSelectedJointIds(newSelected);
    } else if (activeJointId) {
       const x = ((e.clientX - rect.left) / rect.width) * 100;
       const y = ((e.clientY - rect.top) / rect.height) * 100;
       
       const joint = poseData.joints.find(j => j.id === activeJointId);
       if (!joint) return;

       const dx = x - joint.x;
       const dy = y - joint.y;

       setPoseData(prev => ({
         ...prev,
         joints: prev.joints.map(j => {
           if (j.id === activeJointId || selectedJointIds.has(j.id)) {
             return { ...j, x: j.x + dx, y: j.y + dy };
           }
           return j;
         })
       }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setActiveJointId(null);
    setSelectionBox(null);
  };

  const handleScale = (factor: number) => {
    if (selectedJointIds.size === 0) return;

    setPoseData(prev => {
      const selectedJoints = prev.joints.filter(j => selectedJointIds.has(j.id));
      if (selectedJoints.length === 0) return prev;

      // Find center of selection
      const centerX = selectedJoints.reduce((sum, j) => sum + j.x, 0) / selectedJoints.length;
      const centerY = selectedJoints.reduce((sum, j) => sum + j.y, 0) / selectedJoints.length;

      return {
        ...prev,
        joints: prev.joints.map(j => {
          if (selectedJointIds.has(j.id)) {
            return {
              ...j,
              x: centerX + (j.x - centerX) * factor,
              y: centerY + (j.y - centerY) * factor
            };
          }
          return j;
        })
      };
    });
  };

  const applyPreset = (type: 'full' | 'waist') => {
    if (type === 'full') {
      setPoseData({ ...DEFAULT_POSE_DATA });
    } else {
      // Waist up: scale up and move down
      const scale = 1.8;
      const offsetY = -20;
      setPoseData({
        ...DEFAULT_POSE_DATA,
        joints: DEFAULT_POSE_DATA.joints.map(j => ({
          ...j,
          x: 50 + (j.x - 50) * scale,
          y: 30 + (j.y - 30) * scale + offsetY
        })).filter(j => j.y < 110 && j.y > -10 && j.x < 110 && j.x > -10)
      });
    }
    setSelectedJointIds(new Set());
  };

  const getAspectRatioStyle = (ratio: AspectRatio): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        transformOrigin: 'center center',
        transition: (isPanning || activeJointId) ? 'none' : 'transform 0.1s ease-out',
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

  const renderSkeleton = () => {
    if (!poseData.showSkeleton) return null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
        {/* Draw Bones */}
        {poseData.joints.map(joint => {
          if (!joint.parent) return null;
          const parent = poseData.joints.find(j => j.id === joint.parent);
          if (!parent) return null;
          return (
            <line 
              key={`bone-${joint.id}`}
              x1={`${parent.x}%`} y1={`${parent.y}%`}
              x2={`${joint.x}%`} y2={`${joint.y}%`}
              stroke="rgba(168, 85, 247, 0.6)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Draw Joints */}
        {poseData.joints.map(joint => (
          <g key={`joint-group-${joint.id}`} className="pointer-events-auto cursor-move joint-handle">
            <circle 
              cx={`${joint.x}%`} cy={`${joint.y}%`}
              r="8"
              fill={selectedJointIds.has(joint.id) || activeJointId === joint.id ? "#a855f7" : "rgba(168, 85, 247, 0.8)"}
              stroke={selectedJointIds.has(joint.id) ? "white" : "rgba(255,255,255,0.5)"}
              strokeWidth={selectedJointIds.has(joint.id) ? "3" : "1"}
              onMouseDown={(e) => { 
                e.stopPropagation(); 
                setActiveJointId(joint.id); 
                if (!e.shiftKey && !selectedJointIds.has(joint.id)) {
                  setSelectedJointIds(new Set([joint.id]));
                } else if (e.shiftKey) {
                  const next = new Set(selectedJointIds);
                  if (next.has(joint.id)) next.delete(joint.id);
                  else next.add(joint.id);
                  setSelectedJointIds(next);
                }
              }}
              className="transition-all hover:fill-purple-400"
            />
            <text 
              x={`${joint.x}%`} y={`${joint.y - 3}%`}
              textAnchor="middle"
              className={`text-[10px] fill-white font-bold pointer-events-none drop-shadow-md transition-opacity ${selectedJointIds.has(joint.id) ? 'opacity-100' : 'opacity-40'}`}
              style={{ fontSize: '10px' }}
            >
              {joint.name}
            </text>
          </g>
        ))}

        {/* Selection Box */}
        {selectionBox && (
          <rect 
            x={`${Math.min(selectionBox.start.x, selectionBox.end.x)}%`}
            y={`${Math.min(selectionBox.start.y, selectionBox.end.y)}%`}
            width={`${Math.abs(selectionBox.end.x - selectionBox.start.x)}%`}
            height={`${Math.abs(selectionBox.end.y - selectionBox.start.y)}%`}
            fill="rgba(168, 85, 247, 0.1)"
            stroke="#a855f7"
            strokeWidth="1"
            strokeDasharray="4"
          />
        )}
      </svg>
    );
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
                {onClearSession && (
                    <button 
                      onClick={() => { if(confirm("Clear all variants?")) onClearSession(); }}
                      className="w-10 h-10 rounded-full bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-900/40 flex items-center justify-center transition-all shrink-0"
                      title="Clear All Variants"
                    >
                       <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                )}
                <div className="w-px h-6 bg-white/10 shrink-0" />
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
              <p className="text-white font-bold text-lg animate-pulse">{statusMessage || 'Generating...'}</p>
           </div>
        )}

        {/* IMAGE RENDERING */}
        {generatedImage ? (
           <>
             <img src={generatedImage} alt="Generated" className="w-full h-full object-contain block relative z-0" />
             <div className="absolute top-3 right-3 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                   onClick={() => {
                     const link = document.createElement('a');
                     link.href = generatedImage;
                     link.download = `pose-studio-${Date.now()}.png`;
                     link.click();
                   }}
                   className="w-8 h-8 bg-black/50 hover:bg-green-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg"
                   title="Download Image"
                 >
                   <i className="fa-solid fa-download text-xs" />
                 </button>
                 <button onClick={() => setShowPreview(true)} className="w-8 h-8 bg-black/50 hover:bg-blue-600 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg" title="Full Screen"><i className="fa-solid fa-expand text-xs" /></button>
                 {onClearImage && <button onClick={onClearImage} className="w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg" title="Clear Canvas"><i className="fa-solid fa-times text-xs" /></button>}
             </div>
           </>
        ) : (
           <div className={`w-full h-full flex items-center justify-center flex-col gap-4 border-2 border-dashed rounded p-10 relative z-0 select-none transition-colors ${isDragOver ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800/50 border-slate-700'}`}>
              <i className="fa-solid fa-person-rays text-6xl opacity-50 text-slate-500" />
              <div className="text-center">
                 <p className="text-lg font-bold text-slate-200 mb-1">Pose Studio</p>
                 <p className="text-sm text-slate-400">Move the joints to define character pose</p>
              </div>
           </div>
        )}

        {/* SKELETON OVERLAY */}
        {renderSkeleton()}
      </div>

      <FullScreenPreview isOpen={showPreview} onClose={() => setShowPreview(false)} imageUrl={generatedImage} />
      
      {/* Pose Controls Floating Panel */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-6 right-6 z-50 bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl w-56"
      >
          <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-bone" /> Pose Controls
          </h3>
          
          <div className="space-y-4">
              <div className="space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">View Presets</p>
                  <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => applyPreset('full')}
                        className="py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-person" /> Full Body
                      </button>
                      <button 
                        onClick={() => applyPreset('waist')}
                        className="py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-user" /> Waist Up
                      </button>
                  </div>
              </div>

              <div className="space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Selection Tools</p>
                  <div className="grid grid-cols-2 gap-2">
                      <button 
                        disabled={selectedJointIds.size === 0}
                        onClick={() => handleScale(1.1)}
                        className="py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
                        title="Scale Selection Up"
                      >
                          <i className="fa-solid fa-maximize" /> Scale +
                      </button>
                      <button 
                        disabled={selectedJointIds.size === 0}
                        onClick={() => handleScale(0.9)}
                        className="py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
                        title="Scale Selection Down"
                      >
                          <i className="fa-solid fa-minimize" /> Scale -
                      </button>
                  </div>
                  <button 
                    onClick={() => setSelectedJointIds(new Set(poseData.joints.map(j => j.id)))}
                    className="w-full py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                      Select All
                  </button>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button 
                    onClick={() => setPoseData(prev => ({ ...prev, showSkeleton: !prev.showSkeleton }))}
                    className={`w-full py-2 px-3 rounded-lg text-[10px] font-bold flex items-center justify-between transition-colors ${poseData.showSkeleton ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                      Skeleton Overlay <span>{poseData.showSkeleton ? 'ON' : 'OFF'}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                        if (confirm("Reset pose to default?")) {
                            setPoseData({ ...DEFAULT_POSE_DATA });
                            setSelectedJointIds(new Set());
                        }
                    }}
                    className="w-full py-2 px-3 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 hover:bg-red-900 hover:text-white transition-colors flex items-center gap-2 justify-center"
                  >
                      <i className="fa-solid fa-rotate-left" /> Reset Pose
                  </button>
              </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-[9px] text-slate-500 leading-relaxed">
                  <i className="fa-solid fa-circle-info mr-1" />
                  Drag to select multiple joints. Hold Shift to add to selection.
              </p>
          </div>
      </div>
    </div>
  );
};

export default PoseStudioCanvas;
