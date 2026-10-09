import { AIEngineSelectorCard } from '../ui/AIEngineSelectorCard';

import React, { useState, useCallback } from 'react';
import { Wand2, RefreshCw, Trash2, Settings2, LayoutGrid, Image as ImageIcon, Sparkles, Plus, X, Info, Check, ChevronDown, Download } from 'lucide-react';
import { AspectRatio, BackgroundConfig } from '../../types';
import { BACKGROUND_PATTERNS } from '../../constants';

interface SpriteSheetControlsProps {
  engine: any;
}

export const SpriteSheetControls: React.FC<SpriteSheetControlsProps> = ({ engine }) => {
  const { 
    spriteSheet, 
    setGlobalPrompt, 
    setAnimationGoal,
    setSpriteAspectRatio, 
    setGlobalBackground,
    setFrameCount,
    referenceAssets,
    setReferenceAssets,
    updateFrame,
    handleGenerateSpriteSheet,
    handleExportSpriteSheet,
    handleExportSpriteSheetGrid,
    handleSuggestPoses,
    handleGenerateAnimationFrames,
    handleRefineSpriteSheetGlobalPrompt,
    clearResults,
    clearAll,
    isGenerating,
    isSuggesting,
    statusMessage
  } = engine;

  const [isDragging, setIsDragging] = useState(false);

  const aspectRatios: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];

  const handleFrameCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value);
    if (!isNaN(count) && count > 0 && count <= 24) {
      setFrameCount(count);
    }
  };

  const updateBgProp = (prop: keyof BackgroundConfig, value: any) => {
    setGlobalBackground({ ...spriteSheet.globalBackground, [prop]: value });
  };

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const { optimizeBase64Image } = await import('../../utils/imageUtils');
            const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7);
            setReferenceAssets((prev: any) => [
              { id: Date.now().toString() + Math.random(), url: optimized, roleNote: 'Visual Reference' },
              ...prev
            ]);
          } catch(e) {}
        };
        reader.readAsDataURL(file);
      }
    });
  }, [setReferenceAssets]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
        <AIEngineSelectorCard
          setMode={engine.setMode}
          availableModels={engine.availableModels}
          activeModel={engine.activeModel}
          handleSelectModel={engine.handleSelectModel}
          useProModel={engine.useProModel}
          setUseProModel={engine.setUseProModel}
          handleFetchModels={engine.handleFetchModels}
          isLoadingModels={engine.isLoadingModels}
        />

        {/* Global Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Settings2 size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest">Global Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Character Description</label>
                <button 
                  onClick={handleRefineSpriteSheetGlobalPrompt}
                  disabled={isSuggesting || !spriteSheet.globalPrompt}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider disabled:opacity-50"
                >
                  Refine with AI
                </button>
              </div>
              <textarea
                value={spriteSheet.globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                placeholder="Describe your character (appearance, outfit, style)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none h-24 custom-scrollbar shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Animation Goal</label>
              <textarea
                value={spriteSheet.animationGoal || ''}
                onChange={(e) => setAnimationGoal(e.target.value)}
                placeholder="e.g., swinging a sword, walking, casting a spell..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none h-20 custom-scrollbar shadow-inner"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-500">Frames</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={spriteSheet.frames.length}
                  onChange={handleFrameCountChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-500">Aspect Ratio</label>
                <select
                  value={spriteSheet.aspectRatio}
                  onChange={(e) => setSpriteAspectRatio(e.target.value as AspectRatio)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
                >
                  {aspectRatios.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Art Style</label>
              <div className="relative group">
                <select
                  value={engine.selectedStyleId}
                  onChange={(e) => engine.setSelectedStyleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer font-bold"
                >
                  {engine.curatedArtStyles.map((style: any) => (
                    <option key={style.id} value={style.id}>
                      {style.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-500">Global Background</label>
              <div className="relative group">
                <select
                  value={spriteSheet.globalBackground.mode}
                  onChange={(e) => {
                    const newMode = e.target.value as any;
                    if (newMode === 'solid') {
                      setGlobalBackground({ ...spriteSheet.globalBackground, mode: 'solid', gradientType: 'none' });
                    } else if (newMode === 'transparent') {
                      setGlobalBackground({ ...spriteSheet.globalBackground, mode: 'transparent', keyColor: '#FFFFFF' });
                    } else {
                      updateBgProp('mode', newMode);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer font-bold"
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
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
              </div>
              
              {spriteSheet.globalBackground.mode === 'solid' && (
                <div className="flex flex-col gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={spriteSheet.globalBackground.color} 
                      onChange={(e) => updateBgProp('color', e.target.value)}
                      className="w-8 h-8 rounded border-2 border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-200 uppercase font-bold">{spriteSheet.globalBackground.color}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gradient Style</label>
                    <div className="flex gap-1">
                      {(['none', 'linear', 'radial'] as const).map(t => (
                        <button 
                          key={t} 
                          onClick={() => updateBgProp('gradientType', t)} 
                          className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${spriteSheet.globalBackground.gradientType === t ? 'bg-purple-600/30 border-purple-500 text-purple-200' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {spriteSheet.globalBackground.gradientType !== 'none' && (
                    <div className="flex items-center gap-3 mt-1 animate-in slide-in-from-top-1">
                      <input 
                        type="color" 
                        value={spriteSheet.globalBackground.secondaryColor || '#000000'} 
                        onChange={(e) => updateBgProp('secondaryColor', e.target.value)}
                        className="w-8 h-8 rounded border-2 border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-200 uppercase font-bold">{spriteSheet.globalBackground.secondaryColor || '#000000'}</span>
                    </div>
                  )}
                </div>
              )}

              {(spriteSheet.globalBackground.mode === 'transparent' || spriteSheet.globalBackground.mode === 'transparent_neo') && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-4 animate-in slide-in-from-top-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${spriteSheet.globalBackground.removeHoles ? 'bg-purple-600 border-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.5)]' : 'bg-slate-950 border-slate-700'}`}>
                      {spriteSheet.globalBackground.removeHoles && <Check size={10} className="text-white" />}
                    </div>
                    <input type="checkbox" className="sr-only" checked={spriteSheet.globalBackground.removeHoles} onChange={e => updateBgProp('removeHoles', e.target.checked)} />
                    <span className="text-[11px] font-bold text-slate-200 uppercase group-hover:text-white">Remove Holes (Heal)</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Healing Power</span>
                      <span className="text-purple-300 font-mono text-[11px] font-bold">{spriteSheet.globalBackground.healingPower}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={spriteSheet.globalBackground.healingPower} onChange={e => updateBgProp('healingPower', parseInt(e.target.value))} className="w-full accent-purple-600 h-1 bg-slate-900 rounded appearance-none cursor-pointer" />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/50">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Chroma Key Color</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['#FFFFFF', '#000000', '#00FF00', '#FF00FF'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => updateBgProp('keyColor', c)} 
                          className={`w-6 h-6 rounded border transition-all ${spriteSheet.globalBackground.keyColor === c ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900 border-white' : 'border-slate-700 hover:border-slate-500'}`} 
                          style={{ backgroundColor: c }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {spriteSheet.globalBackground.mode === 'transparent_neo' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-5 animate-in slide-in-from-top-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Edge Softness</span>
                      <span className="text-purple-300 font-mono text-[10px]">{spriteSheet.globalBackground.softRadius}px</span>
                    </div>
                    <input type="range" min="1" max="10" step="0.5" value={spriteSheet.globalBackground.softRadius} onChange={e => updateBgProp('softRadius', parseFloat(e.target.value))} className="w-full accent-purple-600 h-1 bg-slate-900 rounded appearance-none" />
                  </div>
                </div>
              )}

              {spriteSheet.globalBackground.mode === 'pattern' && (
                <div className="space-y-3 animate-in slide-in-from-top-1">
                  <select 
                    value={spriteSheet.globalBackground.patternType} 
                    onChange={e => updateBgProp('patternType', e.target.value as any)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none hover:border-slate-700 font-medium"
                  >
                    {BACKGROUND_PATTERNS.map(p => <option key={p.id} value={p.id} className="bg-slate-950">{p.name}</option>)}
                  </select>
                </div>
              )}

              {(spriteSheet.globalBackground.mode === 'scene' || spriteSheet.globalBackground.mode === 'pattern' || spriteSheet.globalBackground.mode === 'prompt_only') && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Optional BG Context</label>
                  <textarea 
                    value={spriteSheet.globalBackground.promptFragment} 
                    onChange={e => updateBgProp('promptFragment', e.target.value)} 
                    placeholder="Describe the environment / details..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600 font-medium h-24 resize-none custom-scrollbar" 
                  />
                </div>
              )}

              <button
                onClick={() => {
                  spriteSheet.frames.forEach((frame: any) => {
                    updateFrame(frame.id, { bgConfig: { ...spriteSheet.globalBackground } });
                  });
                }}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border border-slate-700 active:scale-95"
              >
                Apply Background to All Frames
              </button>
            </div>
          </div>
        </section>

        {/* Reference Images */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <ImageIcon size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">References</h2>
            </div>
            <button 
              onClick={() => engine.setShowAssetPicker(true)}
              className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
              title="Add from Library"
            >
              <Plus size={16} />
            </button>
          </div>

          <div 
            className={`space-y-3 p-3 rounded-xl border-2 border-dashed transition-all ${
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-slate-950/30'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="grid grid-cols-4 gap-2">
              {referenceAssets.map((asset: any) => (
                <div key={asset.id} className="flex flex-col gap-1.5 group">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-800">
                    <img src={asset.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setReferenceAssets((prev: any) => prev.filter((a: any) => a.id !== asset.id))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={asset.roleNote || ''}
                    onChange={(e) => {
                      const newNote = e.target.value;
                      setReferenceAssets((prev: any) => prev.map((a: any) => a.id === asset.id ? { ...a, roleNote: newNote } : a));
                    }}
                    placeholder="Purpose..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[9px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    title="Specify purpose (e.g. 'looks only', 'pose only')"
                  />
                </div>
              ))}
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e: any) => {
                    if (e.target.files) handleFiles(e.target.files);
                  };
                  input.click();
                }}
                className="aspect-square rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-slate-600 hover:text-purple-400 hover:border-purple-500/50 transition-all bg-slate-950"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed text-center">
              Drag & drop images here or use the + button to add references.
            </p>
          </div>
        </section>

        {/* AI Assistance */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles size={16} />
            <h2 className="text-xs font-bold uppercase tracking-widest">AI Assistance</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={handleSuggestPoses}
              disabled={isSuggesting || isGenerating || !spriteSheet.globalPrompt}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
            >
              <LayoutGrid size={16} className={isSuggesting ? 'animate-spin' : ''} />
              Suggest Poses
            </button>
            <button
              onClick={handleGenerateAnimationFrames}
              disabled={isSuggesting || isGenerating || !spriteSheet.globalPrompt || !spriteSheet.animationGoal}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
            >
              <Wand2 size={16} className={isSuggesting ? 'animate-spin' : ''} />
              AI Animation Prompts
            </button>
          </div>
          <p className="text-[10px] text-slate-500 italic text-center px-2">
            AI will generate frame-by-frame prompts based on your character and animation goal.
          </p>
        </section>
      </div>

      {/* Action Footer */}
      <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-3">
        {isGenerating && (
          <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl animate-pulse">
            <RefreshCw className="w-4 h-4 text-purple-500 animate-spin" />
            <span className="text-xs font-medium text-purple-400 truncate">{statusMessage || 'Generating Set...'}</span>
          </div>
        )}

        <button
          onClick={() => handleGenerateSpriteSheet()}
          disabled={isGenerating || !spriteSheet.globalPrompt}
          className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95"
        >
          <LayoutGrid size={20} />
          Generate Entire Set
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportSpriteSheet}
            disabled={isGenerating || !spriteSheet.frames.some((f: any) => f.url && f.status === 'done')}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-700"
          >
            <Download size={14} />
            Export Set (ZIP)
          </button>
          <button
            onClick={handleExportSpriteSheetGrid}
            disabled={isGenerating || !spriteSheet.frames.some((f: any) => f.url && f.status === 'done')}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-700"
          >
            <LayoutGrid size={14} />
            Download Grid
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearResults}
            className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800"
          >
            Clear Results
          </button>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to completely reset the Sprite Sheet Studio? This will delete your prompt and all frames.")) {
                clearAll();
              }
            }}
            className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-500/70 hover:text-red-400 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10"
          >
            Reset Studio
          </button>
        </div>
      </div>
    </div>
  );
};
