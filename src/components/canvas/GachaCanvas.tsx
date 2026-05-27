
import React, { useState, useMemo, useCallback } from 'react';
import { GachaAsset, AspectRatio, Rarity, ReferenceAsset, BackgroundConfig, ChibiProportion, ChibiConfig, ArtStyle } from '../../types';
import { GACHA_ASSET_PRESETS, DEFAULT_BACKGROUND_CONFIG, AETHELGARD_RACES, CHIBI_STYLE_CONFIG, BACKGROUND_PATTERNS } from '../../constants';
import { exportSingleImage } from '../../services/exportService';
import FullScreenPreview from '../ui/FullScreenPreview';
import { useLanguage } from '../../i18n/LanguageContext';

interface AssetCardProps {
  asset: GachaAsset;
  isFocus?: boolean;
  index?: number;
  referenceAssets: ReferenceAsset[];
  onUpdateAsset: (id: string, updates: Partial<GachaAsset>) => void;
  onToggleReference?: (url: string) => void;
  onSelectAsset: (id: string | null) => void;
  selectedAssetId: string | null;
  onGenerateAsset: (append: boolean | string, id?: string) => void;
  setPreviewUrl: (url: string | null) => void;
  onRegenerateBackground?: (id: string) => void;
  onClearAssetImage?: (id: string) => void;
  setFocusIndex: (index: number) => void;
  setViewMode: (mode: 'dossier' | 'gallery' | 'focus') => void;
  onReorderAssets?: (startIndex: number, endIndex: number) => void;
  onResetAsset?: (id: string) => void;
  onRemoveAsset: (id: string) => void;
  setFullscreenEditId: (id: string | 'global' | null) => void;
  totalAssets: number;
}

interface GachaCanvasProps {
  assets: GachaAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
  onGenerateAsset: (append: boolean | string, id?: string) => void;
  onRegenerateBackground?: (id: string) => void;
  onCancelGeneration: () => void;
  traits: string;
  onUpdateTraits: (val: string) => void;
  characterName: string;
  onUpdateName: (val: string) => void;
  characterSubtitle: string;
  onUpdateSubtitle: (val: string) => void;
  characterRarity: Rarity;
  onUpdateRarity: (val: Rarity) => void;
  characterGender: string;
  onUpdateGender: (val: string) => void;
  characterRace: string;
  onUpdateRace: (val: string) => void;
  chibiProportions: ChibiProportion;
  onUpdateProportions: (val: ChibiProportion) => void;
  selectedStyleId: string;
  onUpdateStyle: (val: string) => void;
  onUpdateAsset: (id: string, updates: Partial<GachaAsset>) => void;
  onRemoveAsset: (id: string) => void;
  onResetAsset?: (id: string) => void;
  onClearAssetImage?: (id: string) => void;
  onReorderAssets?: (startIndex: number, endIndex: number) => void;
  onAddPreset?: (index: number) => void;
  onAddSlot?: () => void;
  onToggleReference?: (url: string) => void;
  referenceAssets: ReferenceAsset[];
  setReferenceAssets: React.Dispatch<React.SetStateAction<ReferenceAsset[]>>;
  continuityFlags?: Record<string, boolean>;
  onToggleContinuityFlag?: (flag: string) => void;
  onAddContinuityFlag?: (name: string) => void;
  onRemoveContinuityFlag?: (name: string) => void;
  onRenameContinuityFlag?: (oldName: string, newName: string) => void;
  isGenerating: boolean;
  onSuggestTraits?: () => void;
  onSuggestConcept?: () => void;
  isSuggesting?: boolean;
  onMatchReferenceSize?: (asset: ReferenceAsset) => void;
  onAnalyzeStyle?: () => void;
  isAnalyzing?: boolean;
  onGenerateAll: () => void;
  curatedArtStyles: ArtStyle[];
}

type ManifestViewMode = 'dossier' | 'gallery' | 'focus';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, isFocus = false, index = 0,
  referenceAssets, onUpdateAsset, onToggleReference, onSelectAsset, selectedAssetId,
  onGenerateAsset, setPreviewUrl, onRegenerateBackground, onClearAssetImage,
  setFocusIndex, setViewMode, onReorderAssets, onResetAsset, onRemoveAsset, setFullscreenEditId, totalAssets
}) => {
  const isProcessing = asset.status === 'processing';
  const curBg = asset.bgConfig || { ...DEFAULT_BACKGROUND_CONFIG };
  const chibi = asset.chibiConfig || { enabled: false, proportions: 'simple', headStyle: 'moe', bodyStyle: 'geometric', focus: 'kawaii' };
  const isReference = asset.imageUrl ? referenceAssets.some(r => r.url === asset.imageUrl) : false;

  const getAspectClass = (ratio: AspectRatio) => {
    const map: any = { '1:1': 'aspect-square', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]', '16:9': 'aspect-video', '9:16': 'aspect-[9/16]', '21:9': 'aspect-[21/9]' };
    return map[ratio] || 'aspect-square';
  };

  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !asset.locked;
    onUpdateAsset(asset.id, { locked: nextLocked });
    if (nextLocked && asset.imageUrl && !isReference) {
        onToggleReference?.(asset.imageUrl);
    }
  };

  const updateBgProp = (prop: keyof BackgroundConfig, val: any) => {
      onUpdateAsset(asset.id, { bgConfig: { ...curBg, [prop]: val } });
  };

  return (
    <div 
      onClick={() => onSelectAsset(asset.id)}
      className={`bg-slate-900 border-2 rounded-2xl overflow-hidden transition-all group self-start cursor-pointer ${selectedAssetId === asset.id ? 'border-blue-500 shadow-2xl' : 'border-slate-800 hover:border-slate-700 shadow-xl'} ${isFocus ? 'flex flex-col lg:flex-row h-full' : ''}`}
    >
      <div className={`relative bg-black flex items-center justify-center overflow-hidden shrink-0 ${isFocus ? 'lg:w-[65%] h-full' : 'w-full ' + getAspectClass(asset.aspectRatio)}`}>
         {asset.imageUrl ? <img src={asset.imageUrl} className="w-full h-full object-contain transition-transform group-hover:scale-105" /> : <div className="flex flex-col items-center gap-2 opacity-20"><Icon name="fa-paintbrush text-4xl" /><span className="text-xs font-black uppercase tracking-widest">Awaiting Synthesis</span></div>}
         {isProcessing && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2"><Icon name="fa-circle-notch fa-spin text-blue-500 text-4xl" /><span className="text-sm font-bold text-blue-400 uppercase animate-pulse">Rendering</span></div>}
         
         <div className={`absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 ${isProcessing ? 'hidden' : ''} pointer-events-auto`}>
            <div className="flex flex-col items-center gap-3">
               <button 
                 onClick={e => { e.stopPropagation(); onGenerateAsset(false, asset.id); }} 
                 disabled={asset.locked} 
                 title={asset.locked ? "Asset is locked" : "Regenerate this specific asset"}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-2xl transition-all disabled:opacity-50 flex items-center gap-2"
               >
                 <Icon name={asset.imageUrl ? "fa-rotate-left" : "fa-wand-magic-sparkles"} /> {asset.imageUrl ? 'RE-SYNC ART' : 'GENERATE'}
               </button>
               
               {asset.imageUrl && (
                  <div className="flex items-center gap-2">
                     <button onClick={e => { e.stopPropagation(); setPreviewUrl(asset.imageUrl); }} title="Open in Full Screen" className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg border border-white/5"><Icon name="fa-maximize text-xs" /></button>
                     <button onClick={e => { e.stopPropagation(); exportSingleImage(asset.imageUrl!, `${asset.name}.png`); }} title="Download PNG" className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg border border-white/5"><Icon name="fa-download text-xs" /></button>
                     <button onClick={e => { e.stopPropagation(); onRegenerateBackground?.(asset.id); }} title="Regenerate Background (AI)" className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg border border-white/5"><Icon name="fa-panorama text-xs" /></button>
                     <button onClick={e => { e.stopPropagation(); onToggleReference?.(asset.imageUrl!); }} title={isReference ? "Remove from References" : "Add to References"} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shadow-lg border border-white/5 ${isReference ? 'bg-purple-600 text-white' : 'bg-slate-800 text-white hover:bg-purple-600'}`}><Icon name={isReference ? "fa-bookmark" : "fa-plus-square text-xs"} /></button>
                     <button onClick={e => { e.stopPropagation(); onClearAssetImage?.(asset.id); }} title="Clear Image" className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg border border-white/5"><Icon name="fa-eraser text-xs" /></button>
                  </div>
               )}
            </div>
         </div>

         <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            {!isFocus && <button onClick={(e) => { e.stopPropagation(); setFocusIndex(index); setViewMode('focus'); }} title="Focus Mode" className="w-10 h-10 bg-black/60 hover:bg-blue-600 text-white rounded-xl backdrop-blur-md flex items-center justify-center shadow-lg border border-white/5 transition-all group/focus"><Icon name="fa-expand text-xs group-hover/focus:scale-110 transition-transform" /></button>}
            <button 
              onClick={handleLockToggle}
              title={asset.locked ? "Unlock Image" : "Lock Image (Prevents re-generation and adds to library)"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md transition-all ${asset.locked ? 'bg-yellow-600 text-white scale-110' : 'bg-black/60 text-slate-400 hover:text-white'}`}
            >
              <Icon name={asset.locked ? "fa-lock" : "fa-lock-open"} className="text-xs" />
            </button>
         </div>
         
         <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-20 group/chibi">
            <button 
              onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, enabled: !chibi.enabled } }); }} 
              title="Toggle Chibi Proportions"
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chibi.enabled ? 'bg-purple-600 text-white ring-2 ring-purple-400/50' : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10 backdrop-blur'}`}
            >
              <Icon name="fa-child mr-2" /> Chibi {chibi.enabled ? 'On' : 'Off'}
            </button>
            
            {chibi.enabled && (
              <div className="invisible group-hover/chibi:visible opacity-0 group-hover/chibi:opacity-100 transition-all duration-200 pointer-events-none group-hover/chibi:pointer-events-auto bg-slate-900/95 border border-purple-500/50 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex flex-col gap-3 w-44 animate-in fade-in slide-in-from-top-1">
                 <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Body Ratio</span>
                    <div className="grid grid-cols-3 gap-1">
                       {['1:2', '1:3', '1:4'].map(r => (
                         <button 
                            key={r} 
                            onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, bodyRatio: r } }); }}
                            className={`py-1 text-[9px] font-black rounded border transition-all ${chibi.bodyRatio === r ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                         >
                            {r}
                         </button>
                       ))}
                    </div>
                    <input 
                       value={chibi.bodyRatio || ''} 
                       onChange={e => onUpdateAsset(asset.id, { chibiConfig: { ...chibi, bodyRatio: e.target.value } })}
                       onClick={e => e.stopPropagation()}
                       placeholder="Custom (e.g. 1:2.5)" 
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-purple-500 outline-none"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Scale Preset</span>
                    <select 
                      value={chibi.presetProportion || 'standard'} 
                      onChange={e => onUpdateAsset(asset.id, { chibiConfig: { ...chibi, presetProportion: e.target.value as ChibiProportion } })}
                      onClick={e => e.stopPropagation()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1 py-1 text-[10px] text-white outline-none cursor-pointer"
                    >
                       {Object.entries(CHIBI_STYLE_CONFIG).map(([k,v]) => (
                          <option key={k} value={k}>{v.label}</option>
                       ))}
                    </select>
                 </div>
              </div>
            )}
         </div>
      </div>
      <div className={`flex-1 flex flex-col min-w-0 ${isFocus ? 'bg-[#0b1120] overflow-y-auto' : ''}`}>
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/50 flex justify-between items-center shrink-0">
           <input value={asset.name} onChange={e => onUpdateAsset(asset.id, { name: e.target.value })} onClick={e => e.stopPropagation()} title="Asset Slot Name" className="bg-transparent text-base font-black text-slate-200 outline-none w-1/2 focus:text-white" />
           <div className="flex gap-3 items-center">
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 mr-2">
                 <button 
                   onClick={e => { e.stopPropagation(); if (index > 0) onReorderAssets?.(index, index - 1); }} 
                   disabled={index === 0}
                   className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-400 disabled:opacity-20 transition-colors"
                   title="Move Up"
                 >
                   <Icon name="fa-chevron-up text-[10px]" />
                 </button>
                 <button 
                   onClick={e => { e.stopPropagation(); if (index < totalAssets - 1) onReorderAssets?.(index, index + 1); }} 
                   disabled={index === totalAssets - 1}
                   className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-400 disabled:opacity-20 transition-colors"
                   title="Move Down"
                 >
                   <Icon name="fa-chevron-down text-[10px]" />
                 </button>
              </div>
              <button onClick={e => { e.stopPropagation(); onResetAsset?.(asset.id); }} title="Reset to default state" className="text-slate-600 hover:text-yellow-400 p-2"><Icon name="fa-arrow-rotate-left text-xs" /></button>
              <select 
                 value={curBg.mode} 
                 onChange={e => onUpdateAsset(asset.id, { bgConfig: { ...curBg, mode: e.target.value as any } })}
                 onClick={e => e.stopPropagation()}
                 title="Select Background Generation Mode"
                 className="bg-slate-800 rounded px-2 py-1 text-[10px] font-black text-blue-400 uppercase outline-none cursor-pointer hover:bg-slate-700 transition-colors"
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
              <select 
                 value={asset.framing || 'full-body'} 
                 onChange={e => onUpdateAsset(asset.id, { framing: e.target.value as any })}
                 onClick={e => e.stopPropagation()}
                 title="Camera Framing"
                 className="bg-slate-800 rounded px-2 py-1 text-[10px] font-black text-purple-400 uppercase outline-none cursor-pointer hover:bg-slate-700 transition-colors"
              >
                 <option value="full-body">FULL BODY</option>
                 <option value="waist-up">WAIST UP</option>
                 <option value="bust">BUST</option>
                 <option value="head-only">HEAD ONLY</option>
              </select>
              <select value={asset.aspectRatio} onChange={e => onUpdateAsset(asset.id, { aspectRatio: e.target.value as any })} onClick={e => e.stopPropagation()} title="Aspect Ratio" className="bg-transparent text-xs font-black text-slate-500 uppercase outline-none cursor-pointer hover:text-white transition-colors"><option value="1:1">1:1</option><option value="3:4">3:4</option><option value="4:3">4:3</option><option value="9:16">9:16</option><option value="16:9">16:9</option></select>
              <button onClick={e => { e.stopPropagation(); onRemoveAsset(asset.id); }} title="Remove this slot" className="text-slate-600 hover:text-red-400 p-2"><Icon name="fa-trash-can text-xs" /></button>
           </div>
        </div>
        
        <div className="p-5 space-y-4 flex-1 flex flex-col">
           {/* Dynamic Background Settings Inline */}
           {(curBg.mode === 'solid' || curBg.mode === 'pattern' || curBg.mode === 'transparent' || curBg.mode === 'transparent_neo' || curBg.mode === 'scene' || curBg.mode === 'prompt_only' || curBg.mode === 'auto') && (
              <div onClick={e => e.stopPropagation()} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-4 items-center animate-in slide-in-from-top-1 duration-200">
                 {curBg.mode === 'solid' && (
                    <>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-slate-500 uppercase">Color</span>
                         <input type="color" value={curBg.color} onChange={e => updateBgProp('color', e.target.value)} className="w-5 h-5 rounded-md cursor-pointer border-0 p-0 overflow-hidden" />
                      </div>
                      <select value={curBg.gradientType || 'none'} onChange={e => updateBgProp('gradientType', e.target.value as any)} className="bg-slate-800 rounded px-1.5 py-1 text-[8px] font-bold text-slate-300 outline-none"><option value="none">FLAT</option><option value="linear">LINEAR</option><option value="radial">RADIAL</option></select>
                      {curBg.gradientType !== 'none' && <input type="color" value={curBg.secondaryColor || '#000000'} onChange={e => updateBgProp('secondaryColor', e.target.value)} className="w-5 h-5 rounded-md cursor-pointer border-0 p-0 overflow-hidden" />}
                    </>
                 )}
                 {curBg.mode === 'pattern' && (
                    <select value={curBg.patternType} onChange={e => updateBgProp('patternType', e.target.value as any)} className="bg-slate-800 rounded px-1.5 py-1 text-[8px] font-bold text-slate-300 outline-none">
                       {BACKGROUND_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                    </select>
                 )}
                 {(curBg.mode === 'transparent' || curBg.mode === 'transparent_neo') && (
                    <>
                       <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input type="checkbox" checked={curBg.removeHoles} onChange={e => updateBgProp('removeHoles', e.target.checked)} className="w-3 h-3 accent-blue-600 rounded" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-blue-300 transition-colors">Heal Holes</span>
                       </label>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Power</span>
                          <input type="range" min="0" max="100" value={curBg.healingPower} onChange={e => updateBgProp('healingPower', parseInt(e.target.value))} className="w-16 accent-blue-600 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                       </div>
                    </>
                 )}
                 {(curBg.mode === 'scene' || curBg.mode === 'pattern' || curBg.mode === 'solid' || curBg.mode === 'prompt_only' || curBg.mode === 'auto') && (
                    <div className="w-full pt-1">
                       <input 
                          type="text"
                          value={curBg.promptFragment || ''} 
                          onChange={e => updateBgProp('promptFragment', e.target.value)} 
                          placeholder="Optional: background context..." 
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500/50"
                       />
                    </div>
                 )}
              </div>
           )}

           <div className="space-y-2 flex-1 flex flex-col min-h-[100px]">
              <div className="flex justify-between items-center">
                 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Asset Logic</span>
                 <button onClick={(e) => { e.stopPropagation(); setFullscreenEditId(asset.id); }} title="Edit in Full Screen Editor" className="text-slate-600 hover:text-blue-400 transition-colors"><Icon name="fa-maximize text-[10px]" /></button>
              </div>
              <textarea value={asset.promptSuffix} onChange={e => onUpdateAsset(asset.id, { promptSuffix: e.target.value })} onClick={e => e.stopPropagation()} className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 font-medium italic outline-none focus:border-blue-500/50 resize-y min-h-[100px] custom-scrollbar" placeholder="Logic specifics for this slot..." />
           </div>
           {isFocus && (
              <div className="pt-4 border-t border-slate-800 flex gap-3">
                 <button onClick={(e) => { e.stopPropagation(); onGenerateAsset(false, asset.id); }} disabled={isProcessing || asset.locked} title="Regenerate this asset using physical constants" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-30 transition-all"><Icon name="fa-wand-magic-sparkles mr-2" /> SYNC ART</button>
                 {asset.imageUrl && <button onClick={(e) => { e.stopPropagation(); onRegenerateBackground?.(asset.id); }} disabled={isProcessing} title="Swap Background using current mode" className="flex-1 border border-slate-700 hover:bg-slate-800 text-slate-300 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all"><Icon name="fa-panorama mr-2" /> SWAP BG</button>}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

const GachaCanvas: React.FC<GachaCanvasProps> = ({
  assets, selectedAssetId, onSelectAsset, onGenerateAsset, onRegenerateBackground, onCancelGeneration, 
  traits, onUpdateTraits, characterName, characterSubtitle, characterGender, characterRarity, characterRace, onUpdateRace,
  onUpdateName, onUpdateSubtitle, onUpdateGender, onUpdateRarity, chibiProportions, onUpdateProportions,
  selectedStyleId, onUpdateStyle,
  onUpdateAsset, onRemoveAsset, onResetAsset, onClearAssetImage, onReorderAssets, onAddPreset, onAddSlot, onToggleReference, referenceAssets, setReferenceAssets,
  continuityFlags = {}, onToggleContinuityFlag, onAddContinuityFlag, onRemoveContinuityFlag, onRenameContinuityFlag,
  isGenerating, isSuggesting, onSuggestTraits, onAnalyzeStyle, isAnalyzing, onGenerateAll,
  curatedArtStyles
}) => {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ManifestViewMode>('dossier');
  const [focusIndex, setFocusIndex] = useState(0);
  const [fullscreenEditId, setFullscreenEditId] = useState<string | 'global' | null>(null);

  const activeFocusAsset = useMemo(() => assets[focusIndex] || assets[0], [assets, focusIndex]);

  const getAspectClass = (ratio: AspectRatio) => {
    const map: any = { '1:1': 'aspect-square', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]', '16:9': 'aspect-video', '9:16': 'aspect-[9/16]', '21:9': 'aspect-[21/9]' };
    return map[ratio] || 'aspect-square';
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
           try {
             const { optimizeBase64Image } = await import('../../utils/imageUtils');
             const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7);
             setReferenceAssets(prev => [{ id: Date.now().toString(), url: optimized, roleNote: 'Visual Master' }, ...prev]);
           } catch(e) {}
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePrevFocus = () => setFocusIndex(prev => (prev === 0 ? assets.length - 1 : prev - 1));
  const handleNextFocus = () => setFocusIndex(prev => (prev === assets.length - 1 ? 0 : prev + 1));

  const editingValue = useMemo(() => {
    if (fullscreenEditId === 'global') return traits;
    if (fullscreenEditId) return assets.find(a => a.id === fullscreenEditId)?.promptSuffix || '';
    return '';
  }, [fullscreenEditId, traits, assets]);

  const editingTitle = useMemo(() => {
    if (fullscreenEditId === 'global') return 'Physical Constants Editor';
    if (fullscreenEditId) {
      const asset = assets.find(a => a.id === fullscreenEditId);
      return `${asset?.name || 'Slot'} Logic Editor`;
    }
    return '';
  }, [fullscreenEditId, assets]);

  const handleUpdateFullscreenValue = (val: string) => {
    if (fullscreenEditId === 'global') onUpdateTraits(val);
    else if (fullscreenEditId) onUpdateAsset(fullscreenEditId, { promptSuffix: val });
  };

  const userCurated = curatedArtStyles.filter(s => s.isCustom);
  const builtInCurated = curatedArtStyles.filter(s => !s.isCustom);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden font-sans">
      <FullScreenPreview isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} imageUrl={previewUrl} />
      
      {/* Full Screen Text Editor Overlay */}
      {fullscreenEditId && (
         <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-10 shrink-0">
               <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <Icon name="fa-pen-nib text-blue-500" /> {editingTitle}
               </h2>
               <button onClick={() => setFullscreenEditId(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center transition-all"><Icon name="fa-times text-lg" /></button>
            </div>
            <div className="flex-1 p-10 flex flex-col">
               <textarea 
                  value={editingValue}
                  onChange={e => handleUpdateFullscreenValue(e.target.value)}
                  className="flex-1 bg-transparent text-2xl font-serif italic text-slate-100 leading-relaxed outline-none resize-none custom-scrollbar p-6"
                  placeholder="Enter details..."
                  autoFocus
               />
               <div className="pt-6 border-t border-white/10 flex justify-end">
                  <button onClick={() => setFullscreenEditId(null)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all active:scale-95">SAVE CHANGES</button>
               </div>
            </div>
         </div>
      )}

      <div className="h-24 bg-slate-900/50 border-b border-slate-800 flex items-center px-10 gap-10 shrink-0 z-10 shadow-2xl">
         <div className="flex items-center gap-6 shrink-0">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? "Expand Profile" : "Minimize Profile"} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSidebarCollapsed ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><Icon name={isSidebarCollapsed ? "fa-id-card" : "fa-chevron-left"} className="text-sm" /></button>
            <div className="h-8 w-px bg-slate-800" />
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1"><span className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Character Bible</span><div className="h-px w-10 bg-slate-800" /><select value={characterRarity} onChange={e => onUpdateRarity(e.target.value as Rarity)} title="Unit Rarity" className="bg-transparent text-xs font-black text-yellow-500 uppercase outline-none cursor-pointer">{['R','SR','SSR','UR'].map(r => <option key={r} value={r} className="bg-slate-900">{r} Tier</option>)}</select></div>
            <div className="flex items-baseline gap-4"><input value={characterName} onChange={e => onUpdateName(e.target.value)} title="Name" className="bg-transparent text-4xl font-black text-white outline-none focus:text-blue-400 transition-colors w-1/2" placeholder="Character Name" /><input value={characterSubtitle} onChange={e => onUpdateSubtitle(e.target.value)} title="Subtitle / Class" className="bg-transparent text-lg font-medium text-slate-500 italic outline-none focus:text-slate-300 transition-colors flex-1" placeholder="Add title..." /></div>
         </div>
         <div className="flex gap-6 shrink-0">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Art Direction</span>
               <div className="relative group">
                  <select value={selectedStyleId} onChange={(e) => onUpdateStyle(e.target.value)} title="Global Aesthetic Blueprint" className="bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white outline-none focus:border-blue-500 min-w-[160px] appearance-none cursor-pointer">
                    <option value="none">No Art Style</option>
                    {userCurated.length > 0 && <optgroup label="My Styles">{userCurated.map(s => <option key={s.id} value={s.id}>★ {s.name}</option>)}</optgroup>}
                    {builtInCurated.map(s => s.id !== 'none' && <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Icon name="fa-caret-down" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" />
               </div>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
               {isGenerating ? <button onClick={onCancelGeneration} title="Abort current batch" className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 animate-pulse"><Icon name="fa-stop" /> Abort</button> : <button onClick={onGenerateAll} disabled={!traits} title="Synchronize all slots using character traits" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 disabled:opacity-30 active:scale-95 transition-all"><Icon name="fa-layer-group" /> Sync Bible</button>}
            </div>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         <div className={`border-r border-slate-800 bg-[#0b1120] flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0 relative ${isSidebarCollapsed ? 'w-0 border-r-0 shadow-none' : 'w-[420px] shadow-2xl z-10'}`}>
            <div className={`${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'} flex flex-col h-full`}>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Icon name="fa-fingerprint text-blue-500" /> Physical Constants</h3>
                        <div className="flex gap-2">
                           <button onClick={() => setFullscreenEditId('global')} title="Global Constants Editor" className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-md"><Icon name="fa-expand text-xs" /></button>
                           <button onClick={onSuggestTraits} disabled={isSuggesting || !characterName} title="AI Suggest traits based on name" className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 h-8 rounded-lg flex items-center gap-2 transition-all shadow-md border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">{isSuggesting ? <Icon name="fa-circle-notch fa-spin" /> : <Icon name="fa-wand-magic-sparkles text-xs" />} {isSuggesting ? 'Thinking...' : 'Suggest'}</button>
                        </div>
                     </div>
                     <textarea value={traits} onChange={e => onUpdateTraits(e.target.value)} title="Core character features" className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 font-serif italic leading-relaxed outline-none focus:border-blue-500/50 shadow-inner transition-all resize-none" placeholder="Enter hair color, eye shape, signature armor..." />
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Race & Identity</h3>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><span className="text-xs font-bold text-slate-500 uppercase">Race</span><select value={characterRace} onChange={e => onUpdateRace(e.target.value)} title="Unit Species" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 cursor-pointer">{AETHELGARD_RACES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        <div className="space-y-1.5"><span className="text-xs font-bold text-slate-500 uppercase">Gender</span><select value={characterGender} onChange={e => onUpdateGender(e.target.value)} title="Base model gender" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></div>
                     </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Icon name="fa-images text-purple-500" /> Reference Library</h3>
                        <button onClick={onAnalyzeStyle} disabled={isAnalyzing || referenceAssets.length === 0} title="Analyze references for style logic" className="text-xs text-purple-400 hover:text-purple-300 font-black uppercase tracking-tighter disabled:opacity-20 transition-colors">{isAnalyzing ? <Icon name="fa-spinner fa-spin" /> : "Analyze"}</button>
                     </div>
                     <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleRefDrop}
                        className={`min-h-[160px] rounded-2xl border-2 border-dashed transition-all p-3 grid grid-cols-3 gap-2 ${isDragOver ? 'bg-purple-600/10 border-purple-500' : 'bg-slate-950 border-slate-800'}`}
                     >
                        {referenceAssets.map(ref => (
                           <div key={ref.id} className="flex flex-col gap-1.5 group/ref">
                              <div className="relative aspect-square rounded-lg overflow-hidden border border-white/5 bg-black">
                                 <img src={ref.url} className="w-full h-full object-cover" />
                                 <button onClick={() => setReferenceAssets(p => p.filter(r => r.id !== ref.id))} title="Remove reference" className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-all shadow-lg z-10"><Icon name="fa-times text-[10px]" /></button>
                              </div>
                              <input 
                                 type="text"
                                 value={ref.roleNote || ''}
                                 onChange={(e) => {
                                    const newNote = e.target.value;
                                    setReferenceAssets(prev => prev.map(r => r.id === ref.id ? { ...r, roleNote: newNote } : r));
                                 }}
                                 placeholder="Purpose..."
                                 className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[8px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                                 title="Specify purpose (e.g. 'looks only', 'pose only')"
                              />
                           </div>
                        ))}
                        <label title="Add local image reference" className="aspect-square border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-purple-400 hover:border-purple-500 cursor-pointer transition-all bg-slate-950/40">
                           <Icon name="fa-plus text-xs" />
                           <input type="file" className="hidden" accept="image/*" onChange={e => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = async () => { try { const { optimizeBase64Image } = await import('../../utils/imageUtils'); const optimized = await optimizeBase64Image(reader.result as string, 1024, 0.7); setReferenceAssets(p => [{ id: Date.now().toString(), url: optimized, roleNote: 'Visual Master' }, ...p]); } catch(err){} }; reader.readAsDataURL(e.target.files[0]); } }} />
                        </label>
                     </div>
                     <p className="text-[10px] text-slate-500 italic leading-relaxed">Generated art is added here automatically when locked.</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950 relative">
            <div className="max-w-7xl mx-auto space-y-8">
               <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur shadow-lg sticky top-0 z-30">
                  <div className="flex items-center gap-4">
                     <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3"><Icon name="fa-table-cells text-blue-500" /> Bible Manifest <span className="px-3 py-1 rounded-full bg-slate-950 text-[11px] text-slate-400 border border-slate-800 font-bold">{assets.length} Slots</span></h2>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setViewMode('dossier')} title="Multi-asset sheet view" className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Dossier</button>
                        <button onClick={() => setViewMode('gallery')} title="Compact grid overview" className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'gallery' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Gallery</button>
                        <button onClick={() => setViewMode('focus')} title="Detailed inspector view" className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'focus' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Focus</button>
                     </div>
                     <button onClick={onAddSlot} title="Add new asset slot" className="text-xs font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-2 px-3 transition-colors"><Icon name="fa-plus-circle" /> NEW SLOT</button>
                  </div>
               </div>

               {viewMode === 'dossier' && (
                  <div className={`grid gap-10 items-start ${isSidebarCollapsed ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
                     {assets.map((asset, idx) => (
                        <AssetCard 
                           key={asset.id} 
                           asset={asset} 
                           index={idx} 
                           referenceAssets={referenceAssets}
                           onUpdateAsset={onUpdateAsset}
                           onToggleReference={onToggleReference}
                           onSelectAsset={onSelectAsset}
                           selectedAssetId={selectedAssetId}
                           onGenerateAsset={onGenerateAsset}
                           setPreviewUrl={setPreviewUrl}
                           onRegenerateBackground={onRegenerateBackground}
                           onClearAssetImage={onClearAssetImage}
                           setFocusIndex={setFocusIndex}
                           setViewMode={setViewMode}
                           onReorderAssets={onReorderAssets}
                           onResetAsset={onResetAsset}
                           onRemoveAsset={onRemoveAsset}
                           setFullscreenEditId={setFullscreenEditId}
                           totalAssets={assets.length}
                        />
                     ))}
                  </div>
               )}

               {viewMode === 'gallery' && (
                  <div className={`grid gap-6 ${isSidebarCollapsed ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                     {assets.map((asset, idx) => (
                        <div key={asset.id} onClick={() => { setFocusIndex(idx); setViewMode('focus'); }} className="relative aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group cursor-pointer hover:border-blue-500 transition-all hover:scale-[1.03] hover:shadow-2xl">
                           {asset.imageUrl ? <img src={asset.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 font-black text-xs uppercase opacity-40"><Icon name="fa-image text-3xl mb-3" /> No Art</div>}
                           <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-xs font-black text-white uppercase tracking-wider truncate block">{asset.name}</span>
                              {asset.locked && <Icon name="fa-lock text-yellow-500 absolute top-4 right-4" />}
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {viewMode === 'focus' && activeFocusAsset && (
                  <div className="relative animate-in zoom-in-95 duration-300 flex flex-col items-center gap-8">
                     <div className="w-full max-w-7xl h-[calc(100vh-280px)] min-h-[600px]">
                        <AssetCard 
                           asset={activeFocusAsset} 
                           isFocus={true} 
                           index={focusIndex} 
                           referenceAssets={referenceAssets}
                           onUpdateAsset={onUpdateAsset}
                           onToggleReference={onToggleReference}
                           onSelectAsset={onSelectAsset}
                           selectedAssetId={selectedAssetId}
                           onGenerateAsset={onGenerateAsset}
                           setPreviewUrl={setPreviewUrl}
                           onRegenerateBackground={onRegenerateBackground}
                           onClearAssetImage={onClearAssetImage}
                           setFocusIndex={setFocusIndex}
                           setViewMode={setViewMode}
                           onReorderAssets={onReorderAssets}
                           onResetAsset={onResetAsset}
                           onRemoveAsset={onRemoveAsset}
                           setFullscreenEditId={setFullscreenEditId}
                           totalAssets={assets.length}
                        />
                     </div>
                     <div className="flex items-center gap-10 bg-slate-900/60 border border-slate-800 rounded-full px-10 py-4 backdrop-blur shadow-2xl shrink-0">
                        <button onClick={handlePrevFocus} title="Previous slot" className="w-12 h-12 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"><Icon name="fa-chevron-left" /></button>
                        <div className="flex flex-col items-center">
                           <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{focusIndex + 1} / {assets.length}</span>
                           <div className="flex gap-2 mt-3">{assets.map((_, i) => <div key={i} className={`h-2 rounded-full transition-all ${i === focusIndex ? 'w-10 bg-blue-500' : 'w-3 bg-slate-800'}`} />)}</div>
                        </div>
                        <button onClick={handleNextFocus} title="Next slot" className="w-12 h-12 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"><Icon name="fa-chevron-right" /></button>
                        <div className="w-px h-10 bg-slate-800 mx-2" />
                        <button onClick={() => setViewMode('dossier')} className="text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest px-4 transition-colors">Exit Focus</button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default GachaCanvas;
