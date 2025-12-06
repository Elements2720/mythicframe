
import React, { useRef } from 'react';
import { useAppEngine } from '../../hooks/useAppEngine';
import { AspectRatio } from '../../types';
import { exportSingleImage } from '../../services/exportService';

type Engine = ReturnType<typeof useAppEngine>;

interface ResizeViewProps {
  engine: Engine;
}

const Resize: React.FC<ResizeViewProps> = ({ engine }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    resizeQueue,
    selectedResizeId,
    onAddResizeFiles,
    onSelectResizeItem,
    onRemoveResizeItem,
    handleClearResizeResult,
    resizeZoom,
    setResizeZoom,
    resizePan,
    setResizePan,
    getTargetDimensions,
    handleGenerate,
    isGenerating,
    statusMessage,
    generatedImage,
    selectedAspectRatio,
    setSelectedAspectRatio,
    customRes,
    setCustomRes,
    useCustomResBox,
    setUseCustomResBox
  } = engine;

  const targetDim = getTargetDimensions();

  // Helper to trigger file input
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddResizeFiles(e.target.files);
    }
  };

  return (
    <div className="flex h-full text-slate-200 overflow-hidden bg-slate-950">
      {/* --- LEFT PANEL: QUEUE --- */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-purple-500" /> Batch Queue
          </h2>
          <p className="text-xs text-slate-500">Upload multiple images to resize.</p>
        </div>

        <div className="p-4 border-b border-slate-800">
          <button
            onClick={handleUploadClick}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-bold text-sm shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all"
          >
            <i className="fa-solid fa-upload" /> Add Images
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {resizeQueue.length === 0 ? (
            <div className="text-center py-10 text-slate-600 italic text-xs">
              Queue is empty.<br />Add images to start.
            </div>
          ) : (
            resizeQueue.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectResizeItem(item.id)}
                className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-3 group ${
                  item.id === selectedResizeId
                    ? 'bg-slate-800 border-purple-500 shadow-md'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="w-12 h-12 rounded bg-slate-950 shrink-0 overflow-hidden relative border border-slate-800">
                  <img
                    src={item.resultUrl || item.url}
                    className="w-full h-full object-cover"
                    alt="thumb"
                  />
                  {item.status === 'done' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <i className="fa-solid fa-check-circle text-green-400 drop-shadow-md" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${item.id === selectedResizeId ? 'text-white' : 'text-slate-400'}`}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                    {item.status === 'done' ? (
                      <span className="text-green-500">Complete</span>
                    ) : (
                      <span>{item.status}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.status === 'done' && item.resultUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearResizeResult(item.id);
                      }}
                      className="w-6 h-6 rounded bg-slate-700 text-yellow-500 hover:text-white hover:bg-yellow-600 flex items-center justify-center"
                      title="Reset / Retry"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveResizeItem(item.id);
                    }}
                    className="w-6 h-6 rounded bg-slate-700 text-slate-400 hover:text-white hover:bg-red-500 flex items-center justify-center"
                    title="Remove"
                  >
                    <i className="fa-solid fa-times text-[10px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- RIGHT PANEL: WORKSPACE --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-6">
             
             {/* Aspect Ratio */}
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Ratio</label>
                <select 
                   value={selectedAspectRatio} 
                   onChange={(e) => { setSelectedAspectRatio(e.target.value as AspectRatio); if(e.target.value==='custom') setUseCustomResBox(false); }} 
                   className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500"
                >
                    <option value="1:1">Square (1:1)</option>
                    <option value="3:4">Portrait (3:4)</option>
                    <option value="4:3">Landscape (4:3)</option>
                    <option value="9:16">Mobile (9:16)</option>
                    <option value="16:9">Cinematic (16:9)</option>
                    <option value="custom">Custom</option>
                </select>
             </div>

             {/* Custom Dimensions Input */}
             {(selectedAspectRatio === 'custom' || useCustomResBox) && (
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size (px)</label>
                   <div className="flex items-center gap-1">
                      <input type="number" value={customRes.width} onChange={e => setCustomRes(p=>({...p, width: parseInt(e.target.value)}))} className="w-16 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-center text-slate-200" placeholder="W" />
                      <span className="text-slate-600">x</span>
                      <input type="number" value={customRes.height} onChange={e => setCustomRes(p=>({...p, height: parseInt(e.target.value)}))} className="w-16 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-center text-slate-200" placeholder="H" />
                   </div>
                </div>
             )}

             <div className="w-px h-8 bg-slate-800"></div>

             {/* Transform Controls */}
             <div className="flex items-center gap-4">
                 <div className="flex flex-col gap-1 w-32">
                    <div className="flex justify-between text-[10px] text-slate-400">
                       <span>Zoom</span>
                       <span className="text-purple-400 font-mono">{Math.round(resizeZoom * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="10" max="200" step="1" 
                      value={resizeZoom * 100} 
                      onChange={(e) => setResizeZoom(parseFloat(e.target.value) / 100)} 
                      className="w-full accent-purple-500 h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                    />
                 </div>
                 <div className="flex flex-col gap-1 w-24">
                    <label className="text-[10px] text-slate-400">Pan X ({Math.round(resizePan.x)})</label>
                    <input 
                      type="range" min="-300" max="300" 
                      value={resizePan.x} 
                      onChange={(e) => setResizePan(p => ({...p, x: parseInt(e.target.value)}))}
                      className="w-full accent-purple-500 h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                    />
                 </div>
                 <div className="flex flex-col gap-1 w-24">
                    <label className="text-[10px] text-slate-400">Pan Y ({Math.round(resizePan.y)})</label>
                    <input 
                      type="range" min="-300" max="300" 
                      value={resizePan.y} 
                      onChange={(e) => setResizePan(p => ({...p, y: parseInt(e.target.value)}))}
                      className="w-full accent-purple-500 h-1 bg-slate-700 rounded appearance-none cursor-pointer"
                    />
                 </div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Output Size</div>
                <div className="text-xs font-mono text-slate-300">{targetDim.width} x {targetDim.height}</div>
             </div>
             <button 
                onClick={() => handleGenerate()}
                disabled={isGenerating || !selectedResizeId}
                className="bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
                {isGenerating ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                {isGenerating ? 'Generating...' : 'Generate Outpaint'}
             </button>
          </div>
        </div>
        
        {/* Info Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center justify-between text-xs">
           <div className="text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-info-circle" />
              <span>Zoom/Pan controls affect the next generation.</span>
           </div>
           {statusMessage && (
              <div className="text-purple-400 font-bold animate-pulse">
                 {statusMessage}
              </div>
           )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden bg-black flex items-center justify-center relative p-8">
           {/* Checkered Background */}
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

           {generatedImage ? (
              <div className="relative shadow-2xl shadow-black border border-slate-800 bg-black max-w-full max-h-full">
                 <img 
                   src={generatedImage} 
                   alt="Preview" 
                   className="max-w-full max-h-full object-contain block"
                   style={{ maxHeight: 'calc(100vh - 200px)' }}
                 />
                 
                 {/* Current Zoom/Pan visualizer (Optional visual aid to show where source is) */}
                 {/* Note: Logic is complex to visualize overlay on result, so we stick to just showing image as requested */}
              </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-slate-600 gap-4 border-2 border-dashed border-slate-800 rounded-xl p-12">
                <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center">
                   <i className="fa-solid fa-image text-4xl text-slate-700" />
                </div>
                <p>Select an image from the queue to start.</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Resize;
