import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UIMode, BackgroundConfig, PixelDimensions,
  BackgroundPatternType, AspectRatio, ImageSize, SafeZoneConfig, ClothesParams, ArtStyle,
  AvailableModel
} from '../../types';
import { ART_STYLES, BACKGROUND_PATTERNS } from '../../constants';
import UnityInput from '../ui/UnityInput';
import { useLanguage } from '../../i18n/LanguageContext';

interface ClothesDesignerPanelProps {
  mode: UIMode;
  selectedStyleId: string;
  setSelectedStyleId: (val: string) => void;
  bgConfig: BackgroundConfig;
  setBgConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  generatedImage: string | null;
  isGenerating: boolean;
  handleRegenerateBackground: () => void;
  handleEnhance: () => void;
  handleExtractOutfit: () => void;
  selectedAspectRatio: AspectRatio;
  setSelectedAspectRatio: (val: AspectRatio) => void;
  useCustomResBox: boolean;
  setUseCustomResBox: (val: boolean) => void;
  customRes: PixelDimensions;
  setCustomRes: React.Dispatch<React.SetStateAction<PixelDimensions>>;
  useProModel: boolean;
  setUseProModel: (val: boolean) => void;
  availableModels?: AvailableModel[];
  activeModel?: string;
  handleSelectModel?: (val: string) => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  bgPatternType: BackgroundPatternType;
  setBgPatternType: (val: BackgroundPatternType) => void;
  safeZone: SafeZoneConfig;
  setSafeZone: (val: SafeZoneConfig) => void;
  clothesParams: ClothesParams;
  setClothesParams: (val: ClothesParams) => void;
  isRightMinimized: boolean;
  setIsRightMinimized: (val: boolean) => void;
  allArtStyles: ArtStyle[];
  usageMap?: Record<string, number>;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

// --- Color Helpers ---
function hsvToRgb(h: number, s: number, v: number) {
  let r=0, g=0, b=0;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = q; break;
    case 5: r = v, g = p, b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
function rgbToHex(r: number, g: number, b: number) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase(); }
function hexToRgb(hex: string) { let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 }; }
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255, g /= 255, b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h=0, s=0, v = max, d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
    h /= 6;
  }
  return { h, s, v };
}

const ClothesDesignerPanel: React.FC<ClothesDesignerPanelProps> = (props) => {
  const { t } = useLanguage();
  const { 
    isRightMinimized, setIsRightMinimized,
    useProModel, setUseProModel, availableModels, activeModel, handleSelectModel,
    selectedStyleId, setSelectedStyleId,
    bgConfig, setBgConfig, clothesParams, setClothesParams,
    selectedAspectRatio, setSelectedAspectRatio, useCustomResBox, setUseCustomResBox,
    isEditMode, setIsEditMode, customRes, setCustomRes,
    generatedImage, handleRegenerateBackground, handleEnhance, handleExtractOutfit, isGenerating,
    safeZone, setSafeZone, allArtStyles, usageMap
  } = props;

  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
  const [activePickingTarget, setActivePickingTarget] = useState<'primary' | 'secondary'>('primary');
  const [pickerTop, setPickerTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const secondaryToggleBtnRef = useRef<HTMLButtonElement>(null);
  const [hsv, setHsv] = useState({ h: 0, s: 1, v: 1 });
  const [isDraggingMixer, setIsDraggingMixer] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  const currentWorkingColor = activePickingTarget === 'primary' ? bgConfig.color : (bgConfig.secondaryColor || '#000000');

  useEffect(() => {
    if (showAdvancedPicker) {
      const rgb = hexToRgb(currentWorkingColor);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  }, [showAdvancedPicker, activePickingTarget, currentWorkingColor]);

  const updateColorFromHsv = useCallback((newHsv: { h: number, s: number, v: number }) => {
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    if (activePickingTarget === 'primary') setBgConfig(prev => ({ ...prev, color: hex }));
    else setBgConfig(prev => ({ ...prev, secondaryColor: hex }));
  }, [activePickingTarget, setBgConfig]);

  const handleMixerMove = useCallback((e: MouseEvent) => {
    if (!pickerRef.current || !isDraggingMixer) return;
    const mixerRect = pickerRef.current.querySelector('.mixer-square')?.getBoundingClientRect();
    if (!mixerRect) return;
    let s = (e.clientX - mixerRect.left) / mixerRect.width, v = 1 - (e.clientY - mixerRect.top) / mixerRect.height;
    s = Math.max(0, Math.min(1, s)); v = Math.max(0, Math.min(1, v));
    const nextHsv = { ...hsv, s, v }; setHsv(nextHsv); updateColorFromHsv(nextHsv);
  }, [isDraggingMixer, hsv, updateColorFromHsv]);

  const handleHueMove = useCallback((e: MouseEvent) => {
    if (!pickerRef.current || !isDraggingHue) return;
    const hueRect = pickerRef.current.querySelector('.hue-slider')?.getBoundingClientRect();
    if (!hueRect) return;
    let h = (e.clientX - hueRect.left) / hueRect.width; h = Math.max(0, Math.min(1, h));
    const nextHsv = { ...hsv, h }; setHsv(nextHsv); updateColorFromHsv(nextHsv);
  }, [isDraggingHue, hsv, updateColorFromHsv]);

  useEffect(() => {
    if (isDraggingMixer) { window.addEventListener('mousemove', handleMixerMove); window.addEventListener('mouseup', () => setIsDraggingMixer(false)); }
    if (isDraggingHue) { window.addEventListener('mousemove', handleHueMove); window.addEventListener('mouseup', () => setIsDraggingHue(false)); }
    return () => { window.removeEventListener('mousemove', handleMixerMove); window.removeEventListener('mouseup', () => setIsDraggingMixer(false)); window.removeEventListener('mousemove', handleHueMove); window.removeEventListener('mouseup', () => setIsDraggingHue(false)); };
  }, [isDraggingMixer, isDraggingHue, handleMixerMove, handleHueMove]);

  const handleTogglePicker = (target: 'primary' | 'secondary') => {
    if (showAdvancedPicker && activePickingTarget === target) setShowAdvancedPicker(false);
    else {
      setActivePickingTarget(target);
      const btn = target === 'primary' ? toggleBtnRef.current : secondaryToggleBtnRef.current;
      if (btn && rootRef.current) { let btnRect = btn.getBoundingClientRect(), rootRect = rootRef.current.getBoundingClientRect(); setPickerTop(btnRect.top - rootRect.top); }
      setShowAdvancedPicker(true);
    }
  };

  const updateBgProp = (prop: keyof BackgroundConfig, value: any) => {
    setBgConfig(prev => ({ ...prev, [prop]: value }));
  };

  if (isRightMinimized) return (
    <div className="w-10 h-full bg-[#0b1120] border-l border-slate-900 flex flex-col items-center py-4 shrink-0 z-[100]">
       <button onClick={() => setIsRightMinimized(false)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-lg"><Icon name="fa-chevron-left text-xs" /></button>
    </div>
  );

  const baseHueRgb = hsvToRgb(hsv.h, 1, 1), baseHueHex = rgbToHex(baseHueRgb.r, baseHueRgb.g, baseHueRgb.b);
  const builtInStyles = allArtStyles.filter(s => !s.isCustom);
  const userStyles = allArtStyles.filter(s => s.isCustom);

  const mostUsedStyles = allArtStyles
    .filter(s => s.id !== 'none' && usageMap && usageMap[s.id] > 0)
    .sort((a, b) => (usageMap?.[b.id] || 0) - (usageMap?.[a.id] || 0))
    .slice(0, 5);

  return (
    <div ref={rootRef} className="w-full h-full bg-[#0b1120] border-l border-slate-900 flex flex-col shrink-0 z-[100] overflow-visible relative select-none font-sans">
       <button onClick={() => setIsRightMinimized(true)} className="absolute top-4 left-2 w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 z-[110] transition-colors"><Icon name="fa-chevron-right text-xs" /></button>
       
       {showAdvancedPicker && (
          <div ref={pickerRef} className="absolute right-[calc(100%+12px)] w-[240px] z-[999] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a]" style={{ top: Math.max(10, pickerTop - 60) }}>
             <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment Color</span>
                <button onClick={() => setShowAdvancedPicker(false)} className="text-slate-500 hover:text-white transition-colors">
                   <i className="fa-solid fa-times text-xs" />
                </button>
             </div>
             <div className="p-4 space-y-5">
                <div className="mixer-square relative aspect-square rounded-lg overflow-hidden border border-slate-800 cursor-crosshair" style={{ backgroundColor: baseHueHex }} onMouseDown={() => setIsDraggingMixer(true)}>
                   <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                   <div className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
                </div>
                <div className="hue-slider relative h-3 rounded-full cursor-pointer" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }} onMouseDown={() => setIsDraggingHue(true)}>
                   <div className="absolute top-1/2 w-4 h-4 bg-white rounded-full border border-slate-400 shadow-lg -translate-y-1/2 transform -translate-x-1/2 pointer-events-none" style={{ left: `${hsv.h * 100}%` }} />
                </div>
             </div>
          </div>
       )}

       <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pt-10 space-y-7">
          {/* LOGIC ENGINE */}
          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 space-y-4 shadow-sm border-l-4 border-l-indigo-500">
             <label className="text-[11px] font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2"><Icon name="fa-microchip" className="text-indigo-400" /> Swap Intelligence</label>
             
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-slate-300 uppercase">Pose & Anatomy Lock</span>
                   <button 
                     onClick={() => setClothesParams({...clothesParams, lockPose: !clothesParams.lockPose})}
                     className={`w-10 h-5 rounded-full relative transition-colors ${clothesParams.lockPose ? 'bg-indigo-600' : 'bg-slate-800'}`}
                   >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${clothesParams.lockPose ? 'translate-x-5' : 'translate-x-0'}`} />
                   </button>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">Force AI to keep the exact stance and body type of your character reference.</p>
             </div>

             <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Designer Workflow</span>
                <div className="flex bg-slate-950 rounded border border-slate-800 p-1">
                   <button onClick={() => setClothesParams({...clothesParams, renderMode: 'model'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${clothesParams.renderMode === 'model' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>On Character</button>
                   <button onClick={() => setClothesParams({...clothesParams, renderMode: 'asset'})} className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${clothesParams.renderMode === 'asset' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Ghost Asset</button>
                </div>
             </div>

             <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Framing / Crop</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 rounded border border-slate-800 p-1">
                   <button onClick={() => setClothesParams({...clothesParams, framing: 'full-body'})} className={`py-1.5 text-[9px] font-bold rounded transition-all ${clothesParams.framing === 'full-body' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Full Body</button>
                   <button onClick={() => setClothesParams({...clothesParams, framing: 'waist-up'})} className={`py-1.5 text-[9px] font-bold rounded transition-all ${clothesParams.framing === 'waist-up' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Waist Up</button>
                   <button onClick={() => setClothesParams({...clothesParams, framing: 'bust'})} className={`py-1.5 text-[9px] font-bold rounded transition-all ${clothesParams.framing === 'bust' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Bust</button>
                   <button onClick={() => setClothesParams({...clothesParams, framing: 'head-only'})} className={`py-1.5 text-[9px] font-bold rounded transition-all ${clothesParams.framing === 'head-only' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Head Only</button>
                </div>
             </div>
          </div>

          {/* AI MODEL & STYLE */}
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Synthesis Model</label>
                <div className="relative group">
                   <select
                      value={activeModel || (useProModel ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image')}
                      onChange={(e) => {
                         if (handleSelectModel) {
                            handleSelectModel(e.target.value);
                         } else {
                            setUseProModel(e.target.value.includes('pro'));
                         }
                      }}
                      className="w-full bg-[#161f32] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium appearance-none"
                   >
                      {availableModels && availableModels.length > 0 ? (
                         <>
                            {availableModels.filter(m => m.isImageModel).length > 0 && (
                               <optgroup label="🎨 Image Generation Models" className="bg-[#161f32]">
                                  {availableModels.filter(m => m.isImageModel).map(m => (
                                     <option key={m.id} value={m.id} className="bg-[#161f32] text-purple-300 font-semibold">
                                        {m.displayName || m.id}
                                     </option>
                                  ))}
                               </optgroup>
                            )}
                            {availableModels.filter(m => !m.isImageModel).length > 0 && (
                               <optgroup label="⚡ Multimodal / Chat Models" className="bg-[#161f32]">
                                  {availableModels.filter(m => !m.isImageModel).map(m => (
                                     <option key={m.id} value={m.id} className="bg-[#161f32] text-slate-300">
                                        {m.displayName || m.id}
                                     </option>
                                  ))}
                               </optgroup>
                            )}
                         </>
                      ) : (
                         <>
                            <option value="gemini-3.1-flash-image" className="bg-[#161f32]">Gemini 3.1 Flash Image (Fast)</option>
                            <option value="gemini-3-pro-image" className="bg-[#161f32]">Gemini 3 Pro Image (High Quality)</option>
                            <option value="gemini-2.5-flash" className="bg-[#161f32]">Gemini 2.5 Flash</option>
                         </>
                      )}
                   </select>
                   <Icon name="fa-caret-down" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Art Direction</label>
                <div className="relative group">
                  <select value={selectedStyleId} onChange={(e) => setSelectedStyleId(e.target.value)} className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium appearance-none">
                    {mostUsedStyles.length > 0 && (
                      <optgroup label="Most Used">
                        {mostUsedStyles.map(style => <option key={`most-used-${style.id}`} value={style.id} className="bg-[#161f32] text-yellow-400 font-bold">🔥 {style.name}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="Standard Library">
                      {builtInStyles.map(style => <option key={style.id} value={style.id} className="bg-[#161f32]">{style.name}</option>)}
                    </optgroup>
                    {userStyles.length > 0 && (
                      <optgroup label="Custom Blueprints">
                        {userStyles.map(style => <option key={style.id} value={style.id} className="bg-[#161f32]">★ {style.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                  <Icon name="fa-caret-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                </div>
             </div>
          </div>

          {/* BACKGROUND CONTROLS */}
          <div className="space-y-6">
             <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><Icon name="fa-image" className="text-blue-400" /> Environment</label>
                
                <div className="relative group">
                  <select 
                    value={bgConfig.mode} 
                    onChange={(e) => updateBgProp('mode', e.target.value)}
                    className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-bold appearance-none"
                  >
                     <option value="auto">AI DECIDES</option>
                     <option value="none">NONE (EMPTY)</option>
                     <option value="solid">SOLID COLOR</option>
                     <option value="scene">SCENE</option>
                     <option value="pattern">PATTERN</option>
                     <option value="transparent">TRANSPARENT</option>
                     <option value="transparent_neo">TRANSPARENT NEO</option>
                  </select>
                  <Icon name="fa-caret-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                </div>

                {bgConfig.mode === 'solid' && (
                   <div className="flex flex-col gap-3 bg-[#0b1120] p-3 rounded border border-slate-800 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-3">
                         <button ref={toggleBtnRef} onClick={() => handleTogglePicker('primary')} className="w-8 h-8 rounded border-2 border-slate-700 shadow-inner" style={{ backgroundColor: bgConfig.color }} />
                         <span className="text-[11px] font-mono text-slate-200 uppercase font-bold">{bgConfig.color}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                         <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gradient Style</label>
                         <div className="flex gap-1">
                            {(['none', 'linear', 'radial'] as const).map(t => (
                               <button key={t} onClick={() => updateBgProp('gradientType', t)} className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${bgConfig.gradientType === t ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>{t}</button>
                            ))}
                         </div>
                      </div>
                      {bgConfig.gradientType !== 'none' && (
                         <div className="flex items-center gap-3 mt-1 animate-in slide-in-from-top-1">
                            <button ref={secondaryToggleBtnRef} onClick={() => handleTogglePicker('secondary')} className="w-8 h-8 rounded border-2 border-slate-700 shadow-inner" style={{ backgroundColor: bgConfig.secondaryColor || '#000000' }} />
                            <span className="text-[11px] font-mono text-slate-200 uppercase font-bold">{bgConfig.secondaryColor || '#000000'}</span>
                         </div>
                      )}
                   </div>
                )}
                
                {bgConfig.mode.includes('transparent') && (
                   <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Matte Sensitivity</span>
                         <span className="text-blue-400 font-mono text-[10px]">{bgConfig.tolBg}</span>
                      </div>
                      <input type="range" min="10" max="100" value={bgConfig.tolBg} onChange={e => updateBgProp('tolBg', parseInt(e.target.value))} className="w-full accent-blue-600 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                   </div>
                )}
             </div>
          </div>

          {/* OUTPUT CONFIG */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">{t('output_ratio')}</label>
            <div className="relative group">
              <select value={selectedAspectRatio} onChange={(e) => { setSelectedAspectRatio(e.target.value as AspectRatio); if(e.target.value === 'custom') setUseCustomResBox(false); }} className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium appearance-none">
                  <option value="1:1" className="bg-[#161f32]">Square (1:1)</option>
                  <option value="3:4" className="bg-[#161f32]">Portrait (3:4)</option>
                  <option value="4:3" className="bg-[#161f32]">Landscape (4:3)</option>
                  <option value="9:16" className="bg-[#161f32]">Mobile (9:16)</option>
                  <option value="16:9" className="bg-[#161f32]">Cinematic (16:9)</option>
                  <option value="custom" className="bg-[#161f32]">Custom Dimensions</option>
              </select>
              <Icon name="fa-caret-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
            </div>
            {(selectedAspectRatio === 'custom' || useCustomResBox) && (
               <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                  <UnityInput label="Width" value={customRes.width} onChange={v => setCustomRes(p => ({...p, width: v}))} min={256} max={4096} step={8} suffix="px" />
                  <UnityInput label="Height" value={customRes.height} onChange={v => setCustomRes(p => ({...p, height: v}))} min={256} max={4096} step={8} suffix="px" />
               </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-900 overflow-visible">
             <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Designer Tools</label>
             <div className="flex flex-col gap-2.5">
                {generatedImage && (
                    <>
                       <button onClick={handleEnhance} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white py-3.5 rounded text-[11px] font-black uppercase tracking-widest border border-purple-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/30 active:scale-[0.98]"><Icon name="fa-sparkles" className="text-xs" /> {t('enhance')} Details</button>
                       <button onClick={handleExtractOutfit} disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-3.5 rounded text-[11px] font-black uppercase tracking-widest border border-indigo-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 active:scale-[0.98]"><Icon name="fa-scissors" className="text-xs" /> Biological Eraser</button>
                       <button onClick={handleRegenerateBackground} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white py-3.5 rounded text-[11px] font-black uppercase tracking-widest border border-blue-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30 active:scale-[0.98]"><Icon name="fa-panorama" className="text-xs" /> Sync Backdrop</button>
                    </>
                )}
                <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm border-l-4 border-l-purple-500/50">
                   <span className="text-[11px] font-bold text-slate-100">{t('edit_region')} Mode</span>
                   <button onClick={() => setIsEditMode(!isEditMode)} className={`w-12 h-6 rounded-full relative transition-colors ${isEditMode ? 'bg-purple-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isEditMode ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default ClothesDesignerPanel;