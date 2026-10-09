import React, { useState, useRef } from 'react';
import { SpriteStripConfig, ReferenceAsset, AspectRatio, ImageSize, IMAGE_SIZES } from '../../types';
import { RefreshCw, Download, Wand2, Upload, Sparkles, X, Image as ImageIcon, Settings, Terminal } from 'lucide-react';
import { optimizeBase64Image } from '../../utils/imageUtils';
import { analyzeCharacterDesign, suggestAttackAction } from '../../services/geminiService';
import { buildAnimationStripPrompt } from '../../services/promptTemplates';

interface AnimationStripStudioProps {
  engine: any;
}

export const AnimationStripStudio: React.FC<AnimationStripStudioProps> = ({ engine }) => {
  const { spriteStripConfig, setSpriteStripConfig, handleGenerate, handleCancel, isGenerating, statusMessage, generatedImage, selectedStyleId, setSelectedStyleId, curatedArtStyles, bgConfig, setBgConfig, referenceAssets, setReferenceAssets, selectedSize, setSelectedSize, selectedAspectRatio, setSelectedAspectRatio, selectedImageModel, setSelectedImageModel, selectedTextModel, setSelectedTextModel, gameContext } = engine;
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState(false);
  const [isSuggestingAttack, setIsSuggestingAttack] = useState(false);
  const [showPromptConsole, setShowPromptConsole] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (updates: Partial<SpriteStripConfig>) => {
    setSpriteStripConfig((prev: SpriteStripConfig) => ({ ...prev, ...updates }));
  };

  React.useEffect(() => {
    if (bgConfig?.mode !== 'solid' || bgConfig?.color !== '#FFFFFF') {
      setBgConfig({ ...bgConfig, mode: 'solid', color: '#FFFFFF', gradientType: 'none' });
    }
  }, []); // Only on mount

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
           setReferenceAssets((prev: any) => [...prev, newAsset]);
        } catch(err) {
           console.error(err);
        }
     };
     reader.readAsDataURL(file);
     if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
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
              setReferenceAssets((prev: any) => [...prev, newAsset]);
           } catch(err) {
              console.error(err);
           }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAutoDetect = async () => {
    const sourceRef = referenceAssets.find((r: ReferenceAsset) => r.roleNote.includes('Description Source')) || referenceAssets[0];
    if (!sourceRef) {
       alert("Please upload a reference image first.");
       return;
    }

    setIsAnalyzingLocal(true);
    try {
       const analysis = await analyzeCharacterDesign(sourceRef.url);
       updateConfig({
         prompt: `${analysis.charDesc}. ${analysis.weapon !== 'none' ? 'Holding ' + analysis.weapon + '.' : ''}`
       });
    } catch (e) {
       console.error("Auto detect failed", e);
       alert("Failed to analyze image. Please try again.");
    } finally {
       setIsAnalyzingLocal(false);
    }
  };

  const handleAutoAttack = async () => {
    const sourceRef = referenceAssets.find((r: ReferenceAsset) => r.roleNote.includes('Description Source')) || referenceAssets[0];
    const imageToUse = sourceRef?.url;
    
    if (!spriteStripConfig?.prompt && !imageToUse) {
       alert("Please provide a character description or upload a reference image first.");
       return;
    }

    setIsSuggestingAttack(true);
    try {
       const result = await suggestAttackAction(
         spriteStripConfig?.prompt || '',
         spriteStripConfig?.frameCount || 4,
         imageToUse
       );
       if (result.action) {
           updateConfig({ action: result.action });
       }
    } catch (e) {
       console.error("Auto attack suggest failed", e);
       alert("Failed to generate attack action. Please try again.");
    } finally {
       setIsSuggestingAttack(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative p-8">
        <header className="space-y-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-between">
            Animation Strip
            {generatedImage && (
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Strip
              </button>
            )}
          </h1>
          <p className="text-slate-400">
            Generate an entire animation sheet inside a single image. Define the character, action, and frame count.
          </p>
        </header>

        <div className="flex-1 border-2 border-slate-800/50 rounded-2xl bg-slate-900/50 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-sm">
          {generatedImage ? (
             <div className="relative w-full h-full p-4 flex items-center justify-center">
                {/* We use 16:9 for strips generally, so object-contain helps */}
                <img src={generatedImage} alt="Sprite Strip" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
             </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center space-y-4">
               <RefreshCw className="w-12 h-12 text-purple-500 animate-spin opacity-80" />
               <p className="text-purple-400 font-medium tracking-wide animate-pulse">
                {statusMessage || "Rendering animation sequence..."}
               </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 space-y-4">
              <i className="fa-solid fa-film text-6xl opacity-20" />
              <p className="font-medium tracking-wide">Configure layout & click Generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col overflow-y-auto custom-scrollbar shadow-xl z-10 shrink-0">
        <div className="p-6 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prompt Configuration</h3>
                  <button 
                     onClick={() => setShowPromptConsole(true)}
                     className="text-slate-500 hover:text-purple-400 transition-colors"
                     title="View the raw prompt sent to Gemini"
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
            
            <div className="space-y-4">
              <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleRefDrop}
                  onClick={() => referenceAssets.length === 0 && fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed transition-all p-3 grid grid-cols-3 gap-2 ${isDragOver ? 'bg-purple-600/10 border-purple-500' : 'bg-slate-950 border-slate-800'} ${referenceAssets.length === 0 ? 'cursor-pointer hover:border-slate-600' : ''}`}
              >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  {referenceAssets.length === 0 ? (
                      <div className="col-span-3 py-2 flex flex-col items-center justify-center text-slate-600 space-y-1">
                          <Upload className="w-4 h-4 mb-1" />
                          <span className="text-[10px] font-medium text-center px-4 leading-tight">Click or Drop character reference<br/>for Description Source</span>
                      </div>
                  ) : (
                      referenceAssets.map((ref: ReferenceAsset) => (
                          <div key={ref.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black group/ref">
                             <img src={ref.url} alt="Ref" className="w-full h-full object-cover" />
                             <button onClick={() => setReferenceAssets((prev: any) => prev.filter((a: any) => a.id !== ref.id))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover/ref:opacity-100 transition-opacity">
                               <X className="w-3 h-3" />
                             </button>
                             <div className="absolute bottom-0 inset-x-0 bg-black/80 w-full p-0.5 text-center">
                                <span className="text-[7px] text-purple-300 font-bold uppercase tracking-widest truncate block px-0.5">Source</span>
                             </div>
                          </div>
                      ))
                  )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Character Description</label>
                <textarea
                  value={spriteStripConfig?.prompt || ''}
                  onChange={e => updateConfig({ prompt: e.target.value })}
                  placeholder="Red haired chibi knight in silver armor..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 h-24 resize-none transition-colors shadow-inner flex-shrink-0"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <label className="text-xs font-medium text-slate-300">Action / Animation</label>
                   <button
                     onClick={handleAutoAttack}
                     disabled={isSuggestingAttack}
                     className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                   >
                     {isSuggestingAttack ? <RefreshCw className="w-3 h-3 animate-spin" /> : <i className="fa-solid fa-khanda w-3 h-3" />}
                     Auto Attack
                   </button>
                </div>
                <input
                  type="text"
                  value={spriteStripConfig?.action || ''}
                  onChange={e => updateConfig({ action: e.target.value })}
                  placeholder="e.g. running cycle"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Direction</label>
                <select 
                  value={spriteStripConfig?.direction || 'left'}
                  onChange={e => updateConfig({ direction: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors shadow-inner appearance-none"
                >
                  <option value="right">Facing Right (Standard 2D)</option>
                  <option value="left">Facing Left (Standard 2D)</option>
                  <option value="front">Facing Front (Standard 2D)</option>
                  <option value="back">Facing Back (Standard 2D)</option>
                  <option value="isometric">Isometric View</option>
                  <option value="isometric-front-left">Isometric Front-Left</option>
                  <option value="isometric-front-right">Isometric Front-Right</option>
                  <option value="isometric-back-left">Isometric Back-Left</option>
                  <option value="isometric-back-right">Isometric Back-Right</option>
                </select>
              </div>

              <div className="space-y-2">
                 <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block">Batch Generation</label>
                      <span className="text-[10px] text-slate-500">Create one strip for each reference image</span>
                    </div>
                    <button
                        onClick={() => updateConfig({ batchCharacters: !spriteStripConfig?.batchCharacters })}
                        className={`w-10 h-5 rounded-full relative transition-colors ${spriteStripConfig?.batchCharacters ? 'bg-purple-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${spriteStripConfig?.batchCharacters ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                 </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-300">Number of Frames</label>
                  <span className="text-xs text-purple-400 font-bold">{spriteStripConfig?.frameCount || 4}</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="8" 
                  step="1"
                  value={spriteStripConfig?.frameCount || 4}
                  onChange={e => updateConfig({ frameCount: parseInt(e.target.value) as any })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Gemini generates the whole strip in a single image.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Frame Margin (Spacing)</label>
                <select 
                  value={spriteStripConfig?.frameMargin || 'extreme'}
                  onChange={e => updateConfig({ frameMargin: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors shadow-inner appearance-none"
                >
                  <option value="tight">Tight (Almost touching)</option>
                  <option value="standard">Standard (Even spreading)</option>
                  <option value="wide">Wide (Avoid overlapping)</option>
                  <option value="extreme">Extreme (Maximum cutting padding)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800/50" />

          {/* Engine Parameters */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
               Base Settings
             </h3>

             <div className="grid grid-cols-2 gap-2">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Aspect Ratio</label>
                   <select 
                      value={selectedAspectRatio} 
                      onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 shadow-inner appearance-none"
                   >
                      <option value="16:9">Wide (16:9)</option>
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 shadow-inner appearance-none"
                   >
                      {Object.keys(IMAGE_SIZES).map(size => (
                         <option key={size} value={size}>{size}</option>
                      ))}
                   </select>
                 </div>
             </div>

             <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Image Model</label>
                <select
                  value={selectedImageModel}
                  onChange={(e) => setSelectedImageModel(e.target.value)}
                  className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-bold appearance-none"
                >
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                  <option value="gemini-3-pro-image">Gemini 3 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Text Model</label>
                <select
                  value={selectedTextModel}
                  onChange={(e) => setSelectedTextModel(e.target.value)}
                  className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-bold appearance-none"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Preview)</option>
                  <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                </select>
              </div>
             </div>

             <div className="space-y-1 mt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2 mt-1">
                   <ImageIcon className="w-3 h-3 text-blue-500" /> BACKGROUND
                </label>
                <div className="relative group">
                   <select 
                     value={bgConfig?.mode || 'auto'} 
                     onChange={(e) => {
                       const newMode = e.target.value as any;
                       if (newMode === 'solid') {
                         setBgConfig((prev: any) => ({ ...prev, mode: 'solid', gradientType: 'none', color: prev?.color || '#00FF00' }));
                       } else {
                         setBgConfig((prev: any) => ({ ...prev, mode: newMode }));
                       }
                     }} 
                     className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-bold appearance-none"
                   >
                      <option value="auto">AI DECIDES</option>
                      <option value="none">NONE (EMPTY)</option>
                      <option value="prompt_only">PROMPT ONLY</option>
                      <option value="pattern">PATTERN</option>
                      <option value="solid">SOLID</option>
                      <option value="transparent">TRANSPARENT</option>
                      <option value="transparent_neo">TRANSPARENT NEO</option>
                      <option value="scene">SCENE</option>
                   </select>
                   <Settings className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                </div>

                {bgConfig?.mode === 'solid' && (
                  <div className="flex gap-2 justify-end mt-2 animate-in slide-in-from-top-1">
                    {['#00FF00', '#FF00FF', '#0000FF', '#000000', '#FFFFFF'].map(c => (
                       <button 
                          key={c} 
                          onClick={() => setBgConfig({ ...bgConfig, color: c })}
                          className={`w-6 h-6 rounded border transition-all ${bgConfig?.color === c ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900 border-white' : 'border-slate-700 hover:border-slate-500'}`} 
                          style={{ backgroundColor: c }} 
                          title={`Chroma Key ${c}`}
                       />
                    ))}
                  </div>
                )}
             </div>
          </div>

          <div className="h-px bg-slate-800/50" />

          {/* Art Style config inherited */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
              Art Style
            </h3>
            
            <div className="space-y-2">
              <select
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500 transition-all shadow-inner hover:border-slate-700"
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

        <div className="mt-auto p-6 bg-slate-950/50 border-t border-slate-800/80 backdrop-blur-md sticky bottom-0 z-20">
            <button
               onClick={isGenerating ? handleCancel : () => handleGenerate()}
               disabled={!isGenerating && !spriteStripConfig?.prompt}
               className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm tracking-wide transition-all shadow-xl ${
                  isGenerating 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                    : !spriteStripConfig?.prompt
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-800'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-900/30 border border-purple-500/30'
               }`}
            >
              {isGenerating ? (
                <>
                  <X className="w-5 h-5" /> Cancel Generation
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" /> Generate Strip
                </>
              )}
            </button>
        </div>
      </div>

      {/* Prompt Console Modal */}
      {showPromptConsole && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
               <div className="flex items-center gap-3">
                 <Terminal className="w-5 h-5 text-purple-400" />
                 <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Built Prompt Console</h2>
               </div>
               <button onClick={() => setShowPromptConsole(false)} className="text-slate-500 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap bg-[#0c1017]">
               {buildAnimationStripPrompt(
                 spriteStripConfig?.prompt || '',
                 gameContext,
                 '',
                 bgConfig,
                 spriteStripConfig,
                 referenceAssets,
                 undefined,
                 undefined
               ).textPrompt}
             </div>
             <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
                <button 
                  onClick={() => setShowPromptConsole(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
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
