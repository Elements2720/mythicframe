import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UIMode, BackgroundConfig, PixelDimensions, AspectRatio, ImageSize, ArtStyle,
  AvailableModel
} from '../../types';
import { ART_STYLES } from '../../constants';
import UnityInput from '../ui/UnityInput';
import { useLanguage } from '../../i18n/LanguageContext';
import { AIEngineSelectorCard } from '../ui/AIEngineSelectorCard';

interface UIReimaginePanelProps {
  mode: UIMode;
  selectedStyleId: string;
  setSelectedStyleId: (val: string) => void;
  bgConfig: BackgroundConfig;
  setBgConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  generatedImage: string | null;
  isGenerating: boolean;
  handleEnhance: () => void;
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
  isRightMinimized: boolean;
  setIsRightMinimized: (val: boolean) => void;
  uiReimagineChangeBg: boolean;
  setUiReimagineChangeBg: (val: boolean) => void;
  uiPositionsLocked: boolean;
  setUiPositionsLocked: (val: boolean) => void;
  uiThemeMood: string;
  setUiThemeMood: (val: string) => void;
  uiMoodEnabled: boolean;
  setUiMoodEnabled: (val: boolean) => void;
  uiElementsEnabled: boolean;
  setUiElementsEnabled: (val: boolean) => void;
  uiColorsEnabled: boolean;
  setUiColorsEnabled: (val: boolean) => void;
  uiMaterialEnabled: boolean;
  setUiMaterialEnabled: (val: boolean) => void;
  uiArchetype: string;
  setUiArchetype: (val: string) => void;
  uiMaterial: string;
  setUiMaterial: (val: string) => void;
  allArtStyles: ArtStyle[];
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const UI_ARCHETYPES = [
  { id: 'classic-rpg', label: 'Classic RPG HUD', icon: 'fa-shield-halved' },
  { id: 'sci-fi-terminal', label: 'Sci-Fi Terminal', icon: 'fa-microchip' },
  { id: 'mobile-action', label: 'Mobile Action', icon: 'fa-mobile-screen-button' },
  { id: 'tcg-layout', label: 'TCG Layout', icon: 'fa-id-card' },
  { id: 'minimalist-hud', label: 'Minimalist HUD', icon: 'fa-minus' }
];

const UI_MATERIALS = [
  { id: 'polished-metal', label: 'Polished Metal', icon: 'fa-cube' },
  { id: 'ornate-gold', label: 'Ornate Gold', icon: 'fa-crown' },
  { id: 'glowing-hologram', label: 'Glowing Hologram', icon: 'fa-atom' },
  { id: 'weathered-parchment', label: 'Weathered Parchment', icon: 'fa-scroll' },
  { id: 'high-gloss-tech', label: 'High-Gloss Tech', icon: 'fa-laptop-code' }
];

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

const SectionHeader = ({ label, enabled, onToggle, icon, color = "blue" }: any) => (
  <div className="flex items-center justify-between">
    <label className="text-[11px] font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
       {icon && <Icon name={icon} className={`text-${color}-500 text-xs`} />} {label}
    </label>
    <button onClick={(e) => { e.stopPropagation(); onToggle(!enabled); }} className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? `bg-${color}-600` : 'bg-slate-800'}`}>
       <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);

const UIReimaginePanel: React.FC<UIReimaginePanelProps> = (props) => {
  const { t } = useLanguage();
  const { 
    isRightMinimized, setIsRightMinimized,
    useProModel, setUseProModel, availableModels, activeModel, handleSelectModel,
    selectedStyleId, setSelectedStyleId,
    bgConfig, setBgConfig, selectedAspectRatio, setSelectedAspectRatio, useCustomResBox, setUseCustomResBox,
    isEditMode, setIsEditMode, customRes, setCustomRes,
    generatedImage, handleEnhance, isGenerating,
    uiReimagineChangeBg, setUiReimagineChangeBg, uiPositionsLocked, setUiPositionsLocked, uiThemeMood, setUiThemeMood,
    uiMoodEnabled, setUiMoodEnabled, uiElementsEnabled, setUiElementsEnabled, uiColorsEnabled, setUiColorsEnabled,
    uiMaterialEnabled, setUiMaterialEnabled,
    uiArchetype, setUiArchetype, uiMaterial, setUiMaterial, allArtStyles
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

  // Fix: Corrected syntax error in ternary operator
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

  if (isRightMinimized) return (
    <div className="w-10 h-full bg-[#0b1120] border-l border-slate-900 flex flex-col items-center py-4 shrink-0 z-[100]">
       <button onClick={() => setIsRightMinimized(false)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-lg"><Icon name="fa-chevron-left text-xs" /></button>
    </div>
  );

  const baseHueHex = rgbToHex(hsvToRgb(hsv.h, 1, 1).r, hsvToRgb(hsv.h, 1, 1).g, hsvToRgb(hsv.h, 1, 1).b);

  const builtInStyles = allArtStyles.filter(s => !s.isCustom);
  const userStyles = allArtStyles.filter(s => s.isCustom);

  return (
    <div ref={rootRef} className="w-full h-full bg-[#0b1120] border-l border-slate-900 flex flex-col shrink-0 z-[100] overflow-visible relative select-none font-sans">
       <button onClick={() => setIsRightMinimized(true)} className="absolute top-4 left-2 w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 z-[110] transition-colors"><Icon name="fa-chevron-right text-xs" /></button>
       
       {showAdvancedPicker && (
          <div ref={pickerRef} className="absolute right-[calc(100%+12px)] w-[240px] z-[999] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a]" style={{ top: Math.max(10, pickerTop - 60) }}>
             <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UI Color Mixer</span>
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
          <div className="space-y-6">
             <AIEngineSelectorCard
                setMode={(props as any).setMode}
                availableModels={availableModels}
                activeModel={activeModel}
                handleSelectModel={handleSelectModel}
                useProModel={useProModel}
                setUseProModel={setUseProModel}
              />
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">{t('art_style')}</label>
                <div className="relative group">
                  <select value={selectedStyleId} onChange={(e) => setSelectedStyleId(e.target.value)} className="w-full bg-[#161f32] border border-slate-800 rounded px-4 py-3 text-sm text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium appearance-none">
                    <optgroup label="Standard Library">
                      {builtInStyles.map(style => <option key={style.id} value={style.id} className="bg-[#161f32]">{style.name}</option>)}
                    </optgroup>
                    {userStyles.length > 0 && (
                      <optgroup label="User Custom Blueprints">
                        {userStyles.map(style => <option key={style.id} value={style.id} className="bg-[#161f32]">★ {style.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                  <Icon name="fa-caret-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
                </div>
             </div>
          </div>

          <div className="space-y-4">
             {/* THEME MOOD */}
             <div className={`bg-[#121a2b] border border-slate-800 rounded-xl p-4 transition-all duration-300 ${uiMoodEnabled ? 'space-y-3 shadow-md' : 'pb-4 opacity-70'}`}>
                <SectionHeader label="Interface Theme Mood" enabled={uiMoodEnabled} onToggle={setUiMoodEnabled} icon="fa-wand-magic-sparkles" color="purple" />
                {uiMoodEnabled && (
                  <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                     <input type="text" value={uiThemeMood} onChange={e => setUiThemeMood(e.target.value)} placeholder="e.g. Minimalist Sci-Fi, Gothic..." className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600 font-medium" />
                     <p className="text-[10px] text-slate-400 italic">Describe the visual aesthetic.</p>
                  </div>
                )}
             </div>

             {/* INTERFACE ARCHETYPE */}
             <div className={`bg-[#121a2b] border border-slate-800 rounded-xl p-4 transition-all duration-300 ${uiElementsEnabled ? 'space-y-3 shadow-md' : 'pb-4 opacity-70'}`}>
                <SectionHeader label="Interface Archetype" enabled={uiElementsEnabled} onToggle={setUiElementsEnabled} icon="fa-sitemap" color="blue" />
                {uiElementsEnabled && (
                  <div className="grid grid-cols-1 gap-2.5 animate-in slide-in-from-top-1 duration-200 pt-1">
                     {UI_ARCHETYPES.map(arch => (
                        <button 
                          key={arch.id} 
                          onClick={() => setUiArchetype(arch.id)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left ${uiArchetype === arch.id ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg' : 'bg-[#0b1120] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
                        >
                           <Icon name={arch.icon} className="w-4 text-center text-xs" />
                           <span className="text-[11px] font-bold uppercase tracking-tight">{arch.label}</span>
                        </button>
                     ))}
                  </div>
                )}
             </div>

             {/* MATERIAL FINISH */}
             <div className={`bg-[#121a2b] border border-slate-800 rounded-xl p-4 transition-all duration-300 ${uiMaterialEnabled ? 'space-y-3 shadow-md' : 'pb-4 opacity-70'}`}>
                <SectionHeader label="Surface Material & Finish" enabled={uiMaterialEnabled} onToggle={setUiMaterialEnabled} icon="fa-palette" color="green" />
                {uiMaterialEnabled && (
                  <div className="grid grid-cols-1 gap-2.5 pt-1 animate-in slide-in-from-top-1 duration-200">
                    {UI_MATERIALS.map(mat => (
                        <button 
                          key={mat.id} 
                          onClick={() => setUiMaterial(mat.id)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left ${uiMaterial === mat.id ? 'bg-green-600/20 border-green-500 text-white shadow-lg' : 'bg-[#0b1120] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
                        >
                          <Icon name={mat.icon} className="w-4 text-center text-xs" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{mat.label}</span>
                        </button>
                    ))}
                  </div>
                )}
             </div>

             {/* COLOR PALETTE */}
             <div className={`bg-[#121a2b] border border-slate-800 rounded-xl p-4 transition-all duration-300 ${uiColorsEnabled ? 'space-y-4 shadow-md' : 'pb-4 opacity-70'}`}>
                <SectionHeader label="UI Color Palette" enabled={uiColorsEnabled} onToggle={setUiColorsEnabled} icon="fa-droplet" color="cyan" />
                {uiColorsEnabled && (
                  <div className="flex items-center gap-6 animate-in slide-in-from-top-1 duration-200 pt-1">
                     <div className="flex flex-col items-center gap-2"><button ref={toggleBtnRef} onClick={() => handleTogglePicker('primary')} className="w-12 h-12 rounded-xl border-2 border-slate-700 shadow-inner hover:border-white transition-colors" style={{ backgroundColor: bgConfig.color }} /><span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Accent</span></div>
                     <div className="flex flex-col items-center gap-2"><button ref={secondaryToggleBtnRef} onClick={() => handleTogglePicker('secondary')} className="w-12 h-12 rounded-xl border-2 border-slate-700 shadow-inner hover:border-white transition-colors" style={{ backgroundColor: bgConfig.secondaryColor || '#000000' }} /><span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">Base</span></div>
                  </div>
                )}
             </div>

             <div className="space-y-2">
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 space-y-3 shadow-inner border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col"><span className="text-[12px] font-bold text-slate-100">Lock UI Layout</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Retain Placement</span></div>
                       <button onClick={() => setUiPositionsLocked(!uiPositionsLocked)} className={`w-12 h-6 rounded-full relative transition-colors ${uiPositionsLocked ? 'bg-blue-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${uiPositionsLocked ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                    </div>
                    <p className="text-[10px] text-slate-300 italic leading-relaxed font-medium">Keep existing buttons and bars in the exact same spatial coordinates.</p>
                </div>

                <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 space-y-3 shadow-inner border-l-4 border-l-purple-500">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col"><span className="text-[12px] font-bold text-slate-100">Blend Artwork</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Global Redesign</span></div>
                       <button onClick={() => setUiReimagineChangeBg(!uiReimagineChangeBg)} className={`w-12 h-6 rounded-full relative transition-colors ${uiReimagineChangeBg ? 'bg-purple-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${uiReimagineChangeBg ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                    </div>
                    <p className="text-[10px] text-slate-300 italic leading-relaxed font-medium">If enabled, AI will adjust the entire image style to match the new UI theme.</p>
                </div>
             </div>
          </div>

          <div className="space-y-3 pt-2">
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
             <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Refine & Finalize</label>
             {generatedImage && (
                <button onClick={handleEnhance} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white py-3.5 rounded text-[11px] font-bold uppercase tracking-wider border border-purple-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 active:scale-[0.98]"><Icon name="fa-sparkles" className="text-xs text-white" /> {t('enhance')} Assets</button>
             )}
             <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm border-l-4 border-l-purple-500/50">
                <span className="text-[11px] font-bold text-slate-100">{t('edit_region')} Mode</span>
                <button onClick={() => setIsEditMode(!isEditMode)} className={`w-12 h-6 rounded-full relative transition-colors ${isEditMode ? 'bg-purple-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isEditMode ? 'translate-x-6' : 'translate-x-0'}`} /></button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default UIReimaginePanel;