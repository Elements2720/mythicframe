
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UIMode, BackgroundConfig, PixelDimensions,
  BackgroundPatternType, AspectRatio, ImageSize, SafeZoneConfig, CharacterToolState
} from '../../types';
import { ART_STYLES, BACKGROUND_PATTERNS } from '../../constants';
import UnityInput from '../ui/UnityInput';
import { useLanguage } from '../../i18n/LanguageContext';

interface RightPanelProps {
  mode: UIMode;
  selectedStyleId: string;
  setSelectedStyleId: (val: string) => void;
  bgConfig: BackgroundConfig;
  setBgConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  generatedImage: string | null;
  isGenerating: boolean;
  handleRegenerateBackground: () => void;
  handleEnhance: () => void;
  selectedAspectRatio: AspectRatio;
  setSelectedAspectRatio: (val: AspectRatio) => void;
  useCustomResBox: boolean;
  setUseCustomResBox: (val: boolean) => void;
  customRes: PixelDimensions;
  setCustomRes: React.Dispatch<React.SetStateAction<PixelDimensions>>;
  useProModel: boolean;
  setUseProModel: (val: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  bgPatternType: BackgroundPatternType;
  setBgPatternType: (val: BackgroundPatternType) => void;
  safeZone: SafeZoneConfig;
  setSafeZone: (val: SafeZoneConfig) => void;
  characterTool?: CharacterToolState;
  setCharacterTool?: React.Dispatch<React.SetStateAction<CharacterToolState>>;
  isRightMinimized: boolean;
  setIsRightMinimized: (val: boolean) => void;
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

const RightPanel: React.FC<RightPanelProps> = (props) => {
  const { t } = useLanguage();
  const { 
    isRightMinimized, setIsRightMinimized, mode,
    useProModel, setUseProModel, selectedStyleId, setSelectedStyleId,
    bgConfig, setBgConfig, characterTool, setCharacterTool,
    selectedAspectRatio, setSelectedAspectRatio, useCustomResBox, setUseCustomResBox,
    isEditMode, setIsEditMode, customRes, setCustomRes,
    bgPatternType, setBgPatternType,
    generatedImage, handleRegenerateBackground, handleEnhance, isGenerating
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

  return (
    <div ref={rootRef} className="w-full h-full bg-[#0b1120] border-l border-slate-900 flex flex-col shrink-0 z-[100] overflow-visible relative select-none font-sans">
       <button onClick={() => setIsRightMinimized(true)} className="absolute top-4 left-2 w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 z-[110] transition-colors"><Icon name="fa-chevron-right text-xs" /></button>
       
       {showAdvancedPicker && (
          <div ref={pickerRef} className="absolute right-[calc(100%+12px)] w-[240px] z-[999] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a]" style={{ top: Math.max(10, pickerTop - 60) }}>
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
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">{t('ai_model')}</label>
                <div className="flex bg-[#161f32] rounded border border-slate-800 p-1">
                   <button onClick={() => setUseProModel(false)} className={`flex-1 py-1.5 text-[11px] font-bold rounded transition-all ${!useProModel ? 'bg-[#2a3754] text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('std_model')}</button>
                   <button onClick={() => setUseProModel(true)} className={`flex-1 py-1.5 text-[11px] font-bold rounded transition-all ${useProModel ? 'bg-[#2a3754] text-white' : 'text-slate-400 hover:text-slate-200'}`}>{t('pro_model').replace('Model', '')}</button>
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">{t('art_style')}</label>
                <select value={selectedStyleId} onChange={(e) => setSelectedStyleId(e.target.value)} className="w-full bg-[#161f32] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium">
                  {ART_STYLES.map(style => <option key={style.id} value={style.id} className="bg-[#161f32]">{style.name}</option>)}
                </select>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"><Icon name="fa-image" className="text-blue-400" /> Background Mode</label>
                <div className="grid grid-cols-2 gap-2">
                   {(['none', 'solid', 'scene', 'pattern', 'transparent'] as const).map(b => (
                      <button key={b} onClick={() => updateBgProp('mode', b)} className={`px-2 py-2 rounded border text-[10px] font-bold uppercase transition-all ${bgConfig.mode === b ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-lg' : 'bg-[#0b1120] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>{b}</button>
                   ))}
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

                {bgConfig.mode === 'transparent' && (
                   <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${bgConfig.removeHoles ? 'bg-blue-600 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-950 border-slate-700'}`}>
                            {bgConfig.removeHoles && <Icon name="fa-check" className="text-[9px] text-white" />}
                         </div>
                         <input type="checkbox" className="sr-only" checked={bgConfig.removeHoles} onChange={e => updateBgProp('removeHoles', e.target.checked)} />
                         <span className="text-[11px] font-bold text-slate-200 uppercase group-hover:text-white">Remove Holes (Heal Assets)</span>
                      </label>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Detail Healing Power</span>
                            <span className="text-blue-300 font-mono text-[11px] font-bold">{bgConfig.healingPower}%</span>
                         </div>
                         <input type="range" min="0" max="100" value={bgConfig.healingPower} onChange={e => updateBgProp('healingPower', parseInt(e.target.value))} className="w-full accent-blue-600 h-1 bg-slate-950 rounded appearance-none cursor-pointer" />
                      </div>
                   </div>
                )}

                {bgConfig.mode === 'pattern' && (
                   <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                      <select value={bgPatternType} onChange={e => setBgPatternType(e.target.value as any)} className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none hover:border-slate-700 font-medium">
                         {BACKGROUND_PATTERNS.map(p => <option key={p.id} value={p.id} className="bg-[#0b1120]">{p.name}</option>)}
                      </select>
                   </div>
                )}

                {(bgConfig.mode === 'scene' || bgConfig.mode === 'pattern' || bgConfig.mode === 'solid') && (
                   <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Optional BG Context</label>
                      <input value={bgConfig.promptFragment} onChange={e => updateBgProp('promptFragment', e.target.value)} placeholder="Describe the environment / details..." className="w-full bg-[#0b1120] border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-medium" />
                   </div>
                )}
             </div>

             {(mode === 'illustration' || mode === 'gacha') && characterTool && setCharacterTool && (
                <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
                   <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-slate-300"><Icon name="fa-person" className="text-xs" /><label className="text-[11px] font-bold uppercase tracking-wider">{t('character_helper')}</label></div><button onClick={() => setCharacterTool(prev => ({...prev, enabled: !prev.enabled}))} className={`w-10 h-5 rounded-full relative transition-colors ${characterTool.enabled ? 'bg-purple-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${characterTool.enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
                   {characterTool.enabled && (
                      <div className="space-y-3 pt-1 animate-in slide-in-from-top-2">
                        <textarea value={characterTool.poseDescription} onChange={e => setCharacterTool(p => ({...p, poseDescription: e.target.value}))} className="w-full bg-[#0b1120] border border-slate-800 rounded p-3 text-[11px] text-slate-100 h-20 resize-none outline-none focus:border-purple-500 transition-colors font-medium leading-relaxed" placeholder="e.g. Dynamic action pose..." />
                        <button onClick={() => setCharacterTool(p => ({...p, isSettingLookTarget: !p.isSettingLookTarget}))} className={`w-full py-2.5 rounded text-[11px] font-bold uppercase tracking-wider border transition-all ${characterTool.isSettingLookTarget ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/20' : 'bg-[#161f32] text-slate-200 border-slate-700 hover:bg-slate-600 hover:text-white'}`}>{characterTool.isSettingLookTarget ? 'Click on Canvas' : t('set_target')}</button>
                      </div>
                   )}
                </div>
             )}
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">{t('output_ratio')}</label>
            <select value={selectedAspectRatio} onChange={(e) => { setSelectedAspectRatio(e.target.value as AspectRatio); if(e.target.value === 'custom') setUseCustomResBox(false); }} className="w-full bg-[#161f32] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 outline-none hover:border-slate-700 transition-colors cursor-pointer font-medium">
                <option value="1:1" className="bg-[#161f32]">Square (1:1)</option>
                <option value="3:4" className="bg-[#161f32]">Portrait (3:4)</option>
                <option value="4:3" className="bg-[#161f32]">Landscape (4:3)</option>
                <option value="9:16" className="bg-[#161f32]">Mobile (9:16)</option>
                <option value="16:9" className="bg-[#161f32]">Cinematic (16:9)</option>
                <option value="custom" className="bg-[#161f32]">Custom Dimensions</option>
            </select>
            {(selectedAspectRatio === 'custom' || useCustomResBox) && (
               <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                  <UnityInput label="Width" value={customRes.width} onChange={v => setCustomRes(p => ({...p, width: v}))} min={256} max={4096} step={8} suffix="px" />
                  <UnityInput label="Height" value={customRes.height} onChange={v => setCustomRes(p => ({...p, height: v}))} min={256} max={4096} step={8} suffix="px" />
               </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-900 overflow-visible">
             <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Refine & Finalize</label>
             <div className="flex flex-col gap-2.5">
                {generatedImage && (
                    <>
                       <button onClick={handleEnhance} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white py-3 rounded text-[11px] font-bold uppercase tracking-wider border border-purple-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 active:scale-[0.98]"><Icon name="fa-sparkles" className="text-xs text-white" /> {t('enhance')} Assets</button>
                       <button onClick={handleRegenerateBackground} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white py-3 rounded text-[11px] font-bold uppercase tracking-wider border border-blue-500/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30 active:scale-[0.98]"><Icon name="fa-panorama" className="text-xs text-white" /> Regenerate Background</button>
                    </>
                )}
                <div className="bg-[#121a2b] border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm border-l-4 border-l-purple-500/50">
                   <span className="text-[11px] font-bold text-slate-100">{t('edit_region')} Mode</span>
                   <button onClick={() => setIsEditMode(!isEditMode)} className={`w-10 h-5 rounded-full relative transition-colors ${isEditMode ? 'bg-purple-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isEditMode ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default RightPanel;
