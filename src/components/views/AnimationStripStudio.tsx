import React, { useState, useRef, useEffect } from 'react';
import { SpriteStripConfig, ReferenceAsset, AspectRatio, ImageSize, IMAGE_SIZES } from '../../types';
import { 
  RefreshCw, Download, Wand2, Upload, Sparkles, X, 
  Image as ImageIcon, Settings, Terminal, Play, Pause, 
  Film, Layers, ChevronLeft, ChevronRight, Copy, Check, 
  AlertCircle, CheckCircle2, Info
} from 'lucide-react';
import { optimizeBase64Image } from '../../utils/imageUtils';
import { analyzeCharacterDesign, suggestAttackAction } from '../../services/geminiService';
import { buildAnimationStripPrompt } from '../../services/promptTemplates';
import { AIEngineSelectorCard } from '../ui/AIEngineSelectorCard';

interface AnimationStripStudioProps {
  engine: any;
}

export const AnimationStripStudio: React.FC<AnimationStripStudioProps> = ({ engine }) => {
  const { 
    spriteStripConfig, 
    setSpriteStripConfig, 
    handleGenerate, 
    handleCancel, 
    isGenerating, 
    statusMessage, 
    generatedImage, 
    setGeneratedImage,
    selectedStyleId, 
    setSelectedStyleId, 
    curatedArtStyles = [], 
    bgConfig, 
    setBgConfig, 
    referenceAssets = [], 
    setReferenceAssets, 
    selectedSize, 
    setSelectedSize, 
    selectedAspectRatio, 
    setSelectedAspectRatio, 
    availableModels = [], 
    activeModel, 
    handleSelectModel, 
    useProModel, 
    setUseProModel, 
    handleFetchModels, 
    isLoadingModels, 
    gameContext, 
    sessionImages = [], 
    prompt, 
    setPrompt 
  } = engine;

  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState(false);
  const [isSuggestingAttack, setIsSuggestingAttack] = useState(false);
  const [showPromptConsole, setShowPromptConsole] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  const showToast = (type: 'error' | 'success' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(prev => prev?.message === message ? null : prev), 5000);
  };
  
  // Animation Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [viewMode, setViewMode] = useState<'strip' | 'preview'>('strip');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeConfig: SpriteStripConfig = {
    prompt: spriteStripConfig?.prompt !== undefined ? spriteStripConfig.prompt : (prompt || ''),
    action: spriteStripConfig?.action || 'walking',
    frameCount: spriteStripConfig?.frameCount || 4,
    direction: spriteStripConfig?.direction || 'left',
    frameMargin: spriteStripConfig?.frameMargin || 'extreme',
    batchCharacters: spriteStripConfig?.batchCharacters || false
  };

  const updateConfig = (updates: Partial<SpriteStripConfig>) => {
    setSpriteStripConfig((prev: SpriteStripConfig) => ({ ...safeConfig, ...(prev || {}), ...updates }));
    if (updates.prompt !== undefined && setPrompt) {
      setPrompt(updates.prompt);
    }
  };

  // Sync initial state and defaults on mount
  useEffect(() => {
    if (bgConfig?.mode !== 'solid' || !bgConfig?.color) {
      setBgConfig({ ...(bgConfig || {}), mode: 'solid', color: '#FFFFFF', gradientType: 'none' });
    }
    if (selectedAspectRatio === '1:1' && setSelectedAspectRatio) {
      setSelectedAspectRatio('16:9');
    }
  }, []);

  // Frame animation playback loop
  useEffect(() => {
    if (!isPlaying || viewMode !== 'preview' || !generatedImage) return;

    const frameCount = safeConfig.frameCount || 4;
    const intervalMs = 1000 / fps;

    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frameCount);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, viewMode, fps, safeConfig.frameCount, generatedImage]);

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const refName = referenceAssets?.[0]?.filename ? `${referenceAssets[0].filename}_` : '';
      a.download = `${refName}animation_strip_${Date.now()}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const optimized = await optimizeBase64Image(result, 1024, 0.7);
        const newAsset: ReferenceAsset = {
          id: (Date.now() + Math.random()).toString(),
          url: optimized,
          roleNote: 'Description Source',
          filename: file.name.split('.')[0]
        };
        setReferenceAssets((prev: any) => [...(prev || []), newAsset]);
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const optimized = await optimizeBase64Image(result, 1024, 0.7);
          const newAsset: ReferenceAsset = {
            id: (Date.now() + Math.random()).toString(),
            url: optimized,
            roleNote: 'Description Source',
            filename: file.name.split('.')[0]
          };
          setReferenceAssets((prev: any) => [...(prev || []), newAsset]);
        } catch (err) {
          console.error(err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoDetect = async () => {
    const sourceRef = (referenceAssets || []).find((r: ReferenceAsset) => r.roleNote?.includes('Description Source')) || referenceAssets?.[0];
    if (!sourceRef) {
      showToast("info", "Please upload a reference image first.");
      return;
    }

    setIsAnalyzingLocal(true);
    try {
      const analysis = await analyzeCharacterDesign(sourceRef.url);
      const desc = `${analysis.charDesc}. ${analysis.weapon && analysis.weapon !== 'none' ? 'Holding ' + analysis.weapon + '.' : ''}`;
      updateConfig({ prompt: desc });
      showToast("success", "Character appearance analyzed and updated!");
    } catch (e) {
      console.error("Auto detect failed", e);
      showToast("error", "Failed to analyze reference image. Check your AI Engine connection.");
    } finally {
      setIsAnalyzingLocal(false);
    }
  };

  const handleAutoAttack = async () => {
    const sourceRef = (referenceAssets || []).find((r: ReferenceAsset) => r.roleNote?.includes('Description Source')) || referenceAssets?.[0];
    const imageToUse = sourceRef?.url;
    
    if (!safeConfig.prompt && !imageToUse) {
      showToast("info", "Please provide a character description or upload a reference image first.");
      return;
    }

    setIsSuggestingAttack(true);
    try {
      const result = await suggestAttackAction(
        safeConfig.prompt || '',
        safeConfig.frameCount || 4,
        imageToUse
      );
      if (result.action) {
        updateConfig({ action: result.action });
        showToast("success", `Suggested action: ${result.action}`);
      }
    } catch (e) {
      console.error("Auto attack suggest failed", e);
      showToast("error", "Failed to generate attack action. Check your AI Engine connection.");
    } finally {
      setIsSuggestingAttack(false);
    }
  };

  const rawBuiltPrompt = buildAnimationStripPrompt(
    safeConfig.prompt || '',
    gameContext || { setting: '', tone: '', visualConstraints: '' },
    '',
    bgConfig || { mode: 'solid', color: '#FFFFFF' },
    safeConfig,
    referenceAssets || [],
    undefined,
    undefined
  ).textPrompt;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(rawBuiltPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 relative">
      {/* In-App Notification Toast */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 backdrop-blur-xl border animate-in fade-in slide-in-from-top-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-950/50'
            : toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
            : 'bg-slate-900/90 border-purple-500/50 text-purple-200 shadow-purple-950/40'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="ml-3 text-slate-400 hover:text-white transition-colors p-0.5 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative p-6">
        <header className="flex items-center justify-between gap-4 mb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Film className="w-6 h-6 text-purple-400" />
              Animation Strip Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Generate sequence of character animation frames in a unified strip. Preview live looping or export full resolution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {generatedImage && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('strip')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'strip' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Strip View
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'preview' 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" /> Animated Loop
                </button>
              </div>
            )}

            {generatedImage && (
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
              >
                <Download className="w-3.5 h-3.5" /> Download Strip
              </button>
            )}
          </div>
        </header>

        {/* Canvas Display Viewport */}
        <div className="flex-1 border-2 border-slate-800/60 rounded-2xl bg-slate-900/40 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm min-h-0">
          {generatedImage ? (
            viewMode === 'strip' ? (
              /* Strip View */
              <div className="relative w-full h-full p-4 flex items-center justify-center">
                <img 
                  src={generatedImage} 
                  alt="Sprite Strip" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-800/80" 
                />
              </div>
            ) : (
              /* Animated Player Preview */
              <div className="flex flex-col items-center justify-center gap-6 p-8 w-full h-full">
                <div className="relative border-2 border-purple-500/40 rounded-2xl bg-black/60 shadow-2xl overflow-hidden flex items-center justify-center p-4"
                     style={{ width: '320px', height: '320px' }}>
                  <div 
                    className="relative overflow-hidden w-full h-full flex items-center justify-center"
                  >
                    <div 
                      className="w-full h-full overflow-hidden relative"
                    >
                      <img 
                        src={generatedImage} 
                        alt="Current Frame" 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: `-${currentFrameIndex * 100}%`,
                          width: `${(safeConfig.frameCount || 4) * 100}%`,
                          height: '100%',
                          objectFit: 'contain',
                          maxWidth: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-purple-300 border border-purple-500/30">
                    Frame {currentFrameIndex + 1} / {safeConfig.frameCount || 4}
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-6 py-3 rounded-full backdrop-blur-md">
                  <button 
                    onClick={() => setCurrentFrameIndex(prev => (prev - 1 + (safeConfig.frameCount || 4)) % (safeConfig.frameCount || 4))}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Previous Frame"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-lg shadow-purple-900/30"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button 
                    onClick={() => setCurrentFrameIndex(prev => (prev + 1) % (safeConfig.frameCount || 4))}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Next Frame"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-slate-800 mx-1" />

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed:</span>
                    <input 
                      type="range" 
                      min="2" 
                      max="16" 
                      value={fps} 
                      onChange={e => setFps(parseInt(e.target.value))}
                      className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                    />
                    <span className="text-xs font-mono font-bold text-purple-400 w-8">{fps} FPS</span>
                  </div>
                </div>
              </div>
            )
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin opacity-80" />
              <p className="text-purple-400 font-medium tracking-wide animate-pulse">
                {statusMessage || "Rendering animation sequence..."}
              </p>
              <button 
                onClick={handleCancel}
                className="mt-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all"
              >
                Cancel Generation
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Film className="w-16 h-16 opacity-20 text-purple-400" />
              <p className="font-semibold text-slate-400 text-sm">Configure strip parameters & click Generate Strip</p>
              <p className="text-xs text-slate-600 max-w-sm text-center">
                Outputs multiple sequential action poses aligned seamlessly in a clean horizontal strip.
              </p>
            </div>
          )}
        </div>

        {/* Session Images Strip */}
        {sessionImages && sessionImages.length > 1 && (
          <div className="mt-3 shrink-0 flex items-center gap-2 overflow-x-auto p-2 bg-slate-900/60 border border-slate-800/80 rounded-xl custom-scrollbar">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 shrink-0">
              Session Takes:
            </span>
            {sessionImages.map((imgUrl: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => setGeneratedImage && setGeneratedImage(imgUrl)}
                className={`relative h-12 w-24 rounded-lg overflow-hidden border shrink-0 transition-all ${
                  generatedImage === imgUrl ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Take ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Configuration Sidebar - STRICT FIXED WIDTH to prevent blowout */}
      <div className="w-[380px] min-w-[380px] max-w-[380px] shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar shadow-2xl z-10 h-full">
        <div className="p-4 space-y-5">
          
          {/* AI Engine & Model Selector Card in Compact Mode */}
          <div className="w-full">
            <AIEngineSelectorCard
              compact={true}
              availableModels={availableModels}
              activeModel={activeModel}
              handleSelectModel={handleSelectModel}
              useProModel={useProModel}
              setUseProModel={setUseProModel}
              handleFetchModels={handleFetchModels}
              isLoadingModels={isLoadingModels}
            />
          </div>

          <div className="h-px bg-slate-800/60" />

          {/* Prompt Configuration */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Character & Action</h3>
                <button 
                  onClick={() => setShowPromptConsole(true)}
                  className="text-slate-500 hover:text-purple-400 transition-colors"
                  title="View full prompt sent to AI"
                >
                  <Terminal className="w-3.5 h-3.5" />
                </button>
              </div>
              {referenceAssets.length > 0 && (
                <button 
                  onClick={handleAutoDetect} 
                  disabled={isAnalyzingLocal}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {isAnalyzingLocal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto-Detect
                </button>
              )}
            </div>
            
            {/* Reference Upload Box - STRICT BOUNDS */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleRefDrop}
              onClick={() => (!referenceAssets || referenceAssets.length === 0) && fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed transition-all p-3 w-full ${
                isDragOver ? 'bg-purple-600/10 border-purple-500' : 'bg-slate-950 border-slate-800'
              } ${(!referenceAssets || referenceAssets.length === 0) ? 'cursor-pointer hover:border-slate-700' : ''}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              {(!referenceAssets || referenceAssets.length === 0) ? (
                <div className="py-2.5 flex flex-col items-center justify-center text-slate-600 space-y-1">
                  <Upload className="w-4 h-4 mb-0.5 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-400 text-center">
                    Upload Character Reference
                  </span>
                  <span className="text-[9px] text-slate-600">
                    Click or drag PNG/JPG to extract character look
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      References ({referenceAssets.length})
                    </span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Add More
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                    {referenceAssets.map((ref: ReferenceAsset) => (
                      <div key={ref.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black group/ref">
                        <img src={ref.url} alt="Ref" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceAssets((prev: any) => (prev || []).filter((a: any) => a.id !== ref.id));
                          }} 
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover/ref:opacity-100 transition-all shadow-md"
                          title="Remove Reference"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5 text-center">
                          <span className="text-[7px] text-purple-300 font-bold uppercase tracking-widest truncate block px-0.5">Source</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Character Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Character Description</label>
              <textarea
                value={safeConfig.prompt || ''}
                onChange={e => updateConfig({ prompt: e.target.value })}
                placeholder="e.g. Red-haired knight in silver armor, emerald eyes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 h-20 resize-none transition-colors shadow-inner"
              />
            </div>

            {/* Action / Animation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Action / Animation Cycle</label>
                <button
                  onClick={handleAutoAttack}
                  disabled={isSuggestingAttack}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {isSuggestingAttack ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto Suggest
                </button>
              </div>
              <input
                type="text"
                value={safeConfig.action || ''}
                onChange={e => updateConfig({ action: e.target.value })}
                placeholder="e.g. running cycle, heavy sword swing, spell cast"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
              />
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Facing Direction</label>
              <select 
                value={safeConfig.direction || 'right'}
                onChange={e => updateConfig({ direction: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors shadow-inner cursor-pointer"
              >
                <option value="right">Facing Right (Standard 2D Side-Scroller)</option>
                <option value="left">Facing Left (Standard 2D)</option>
                <option value="front">Facing Front (Top-Down / RPG)</option>
                <option value="back">Facing Back (Top-Down)</option>
                <option value="isometric">Isometric View</option>
                <option value="isometric-front-left">Isometric Front-Left</option>
                <option value="isometric-front-right">Isometric Front-Right</option>
              </select>
            </div>

            {/* Frame Count Slider */}
            <div className="space-y-1.5 p-3 rounded-xl border border-slate-800 bg-slate-950">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">Animation Frames</label>
                <span className="text-xs text-purple-400 font-black px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30">
                  {safeConfig.frameCount || 4} Frames
                </span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="8" 
                step="1"
                value={safeConfig.frameCount || 4}
                onChange={e => updateConfig({ frameCount: parseInt(e.target.value) as any })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
              </div>
            </div>

            {/* Frame Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Frame Spacing (Margin)</label>
              <select 
                value={safeConfig.frameMargin || 'extreme'}
                onChange={e => updateConfig({ frameMargin: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors shadow-inner cursor-pointer"
              >
                <option value="extreme">Extreme Spacing (Easiest to Slice & Rig)</option>
                <option value="wide">Wide (Avoid overlapping weapons/cape)</option>
                <option value="standard">Standard (Even spreading)</option>
                <option value="tight">Tight (Compact strip)</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-800/60" />

          {/* Canvas Parameters & Background */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Canvas & Output Settings
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Aspect Ratio</label>
                <select 
                  value={selectedAspectRatio} 
                  onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 shadow-inner cursor-pointer"
                >
                  <option value="16:9">Wide (16:9) - Recommended</option>
                  <option value="21:9">Ultrawide (21:9)</option>
                  <option value="4:3">Standard (4:3)</option>
                  <option value="1:1">Square (1:1)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Resolution</label>
                <select 
                  value={selectedSize} 
                  onChange={(e) => setSelectedSize(e.target.value as ImageSize)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 shadow-inner cursor-pointer"
                >
                  {Object.keys(IMAGE_SIZES).map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Background Settings */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-purple-400" /> BACKGROUND
              </label>
              <select 
                value={bgConfig?.mode || 'solid'} 
                onChange={(e) => {
                  const newMode = e.target.value as any;
                  if (newMode === 'solid') {
                    setBgConfig((prev: any) => ({ ...prev, mode: 'solid', gradientType: 'none', color: prev?.color || '#FFFFFF' }));
                  } else {
                    setBgConfig((prev: any) => ({ ...prev, mode: newMode }));
                  }
                }} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="solid">SOLID COLOR (CHROMA KEY)</option>
                <option value="transparent">TRANSPARENT (AUTO REMOVE BG)</option>
                <option value="transparent_neo">TRANSPARENT NEO (DECONTAMINATE)</option>
                <option value="none">WHITE / NEUTRAL</option>
              </select>

              {bgConfig?.mode === 'solid' && (
                <div className="flex gap-2 justify-end mt-1.5">
                  {['#FFFFFF', '#00FF00', '#FF00FF', '#0000FF', '#000000'].map(c => (
                    <button 
                      key={c} 
                      onClick={() => setBgConfig({ ...bgConfig, color: c })}
                      className={`w-6 h-6 rounded border transition-all ${
                        bgConfig?.color === c 
                          ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900 border-white' 
                          : 'border-slate-700 hover:border-slate-500'
                      }`} 
                      style={{ backgroundColor: c }} 
                      title={`Chroma Key Color: ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Art Style */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Art Style
              </label>
              <select
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {(curatedArtStyles || []).map((style: any) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Generate / Cancel CTA Button */}
        <div className="mt-auto p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md sticky bottom-0 z-20">
          <button
            onClick={isGenerating ? handleCancel : () => handleGenerate()}
            disabled={!isGenerating && !safeConfig.prompt}
            className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-black text-xs tracking-wider uppercase transition-all shadow-xl ${
              isGenerating 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30' 
                : !safeConfig.prompt
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-800'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-900/40 border border-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isGenerating ? (
              <>
                <X className="w-4 h-4" /> Cancel Generation
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generate Strip
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prompt Console Modal */}
      {showPromptConsole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-purple-400" />
                <h2 className="text-xs font-black text-slate-200 uppercase tracking-widest">Built Animation Strip Prompt</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? 'Copied!' : 'Copy'}
                </button>
                <button 
                  onClick={() => setShowPromptConsole(false)} 
                  className="text-slate-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap bg-[#0c1017]">
              {rawBuiltPrompt}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
              <button 
                onClick={() => setShowPromptConsole(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
