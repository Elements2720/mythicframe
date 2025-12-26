import React, { useState, useMemo } from 'react';
import { GachaAsset, AspectRatio, Rarity, ReferenceAsset, BackgroundConfig, ChibiProportion, ChibiConfig } from '../../types';
import { GACHA_ASSET_PRESETS, DEFAULT_BACKGROUND_CONFIG, AETHELGARD_RACES, ART_STYLES } from '../../constants';
import { exportSingleImage, exportSessionImages } from '../../services/exportService';
import FullScreenPreview from '../ui/FullScreenPreview';
import { useLanguage } from '../../i18n/LanguageContext';

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
  isSuggesting?: boolean;
  onSuggestTraits?: () => void;
  onAnalyzeStyle?: () => void;
  isAnalyzing?: boolean;
  onGenerateAll: () => void;
}

type ManifestViewMode = 'dossier' | 'gallery' | 'focus';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const GachaCanvas: React.FC<GachaCanvasProps> = ({
  assets, selectedAssetId, onSelectAsset, onGenerateAsset, onRegenerateBackground, onCancelGeneration, 
  traits, onUpdateTraits, characterName, characterSubtitle, characterGender, characterRarity, characterRace, onUpdateRace,
  onUpdateName, onUpdateSubtitle, onUpdateGender, onUpdateRarity, chibiProportions, onUpdateProportions,
  selectedStyleId, onUpdateStyle,
  onUpdateAsset, onRemoveAsset, onAddPreset, onAddSlot, onToggleReference, referenceAssets, setReferenceAssets,
  continuityFlags = {}, onToggleContinuityFlag, onAddContinuityFlag, onRemoveContinuityFlag, onRenameContinuityFlag,
  isGenerating, isSuggesting, onSuggestTraits, onAnalyzeStyle, isAnalyzing, onGenerateAll
}) => {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<ManifestViewMode>('dossier');
  const [focusIndex, setFocusIndex] = useState(0);
  const [fullscreenEditId, setFullscreenEditId] = useState<string | 'global' | null>(null);

  const safeCharName = String(characterName || 'New Hero');
  const activeFocusAsset = useMemo(() => assets[focusIndex] || assets[0], [assets, focusIndex]);

  const getAspectClass = (ratio: AspectRatio) => {
    const map: any = { '1:1': 'aspect-square', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]', '16:9': 'aspect-video', '9:16': 'aspect-[9/16]', '21:9': 'aspect-[21/9]' };
    return map[ratio] || 'aspect-square';
  };

  const updateBgProp = (id: string, current: BackgroundConfig, prop: keyof BackgroundConfig, value: any) => {
    onUpdateAsset(id, { bgConfig: { ...current, [prop]: value } });
  };

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
           setReferenceAssets(prev => [{ id: Date.now().toString(), url: reader.result as string, roleNote: '' }, ...prev]);
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePrevFocus = () => setFocusIndex(prev => (prev === 0 ? assets.length - 1 : prev - 1));
  const handleNextFocus = () => setFocusIndex(prev => (prev === assets.length - 1 ? 0 : prev + 1));

  // Full Screen Editor Values
  const editingValue = useMemo(() => {
    if (fullscreenEditId === 'global') return traits;
    if (fullscreenEditId) return assets.find(a => a.id === fullscreenEditId)?.promptSuffix || '';
    return '';
  }, [fullscreenEditId, traits, assets]);

  const editingTitle = useMemo(() => {
    if (fullscreenEditId === 'global') return 'Physical Constants Editor';
    if (fullscreenEditId) {
      const asset = assets.find(a => a.id === fullscreenEditId);
      return `${asset?.name || 'Slot'} Extension Editor`;
    }
    return '';
  }, [fullscreenEditId, assets]);

  const handleUpdateFullscreenValue = (val: string) => {
    if (fullscreenEditId === 'global') onUpdateTraits(val);
    else if (fullscreenEditId) onUpdateAsset(fullscreenEditId, { promptSuffix: val });
  };

  const AssetCard: React.FC<{ asset: GachaAsset, isFocus?: boolean, index?: number }> = ({ asset, isFocus = false, index = 0 }) => {
    const isProcessing = asset.status === 'processing';
    const curBg = asset.bgConfig || { ...DEFAULT_BACKGROUND_CONFIG };
    const chibi = asset.chibiConfig || { enabled: false, proportions: 'simple', headStyle: 'moe', bodyStyle: 'geometric', focus: 'kawaii' };
    const isReference = asset.imageUrl ? referenceAssets.some(r => r.url === asset.imageUrl) : false;

    return (
      <div className={`bg-slate-900 border-2 rounded-2xl overflow-hidden transition-all group self-start ${selectedAssetId === asset.id ? 'border-blue-500 shadow-2xl' : 'border-slate-800 hover:border-slate-700 shadow-xl'} ${isFocus ? 'flex flex-col lg:flex-row h-full' : ''}`}>
        
        <div className={`relative bg-black flex items-center justify-center overflow-hidden shrink-0 ${isFocus ? 'lg:w-[65%] h-full' : 'w-full ' + getAspectClass(asset.aspectRatio)}`}>
           {asset.imageUrl ? <img src={asset.imageUrl} className="w-full h-full object-contain transition-transform group-hover:scale-105" /> : <div className="flex flex-col items-center gap-2 opacity-20"><Icon name="fa-paintbrush text-4xl" /><span className="text-xs font-black uppercase tracking-widest">Awaiting Synthesis</span></div>}
           {isProcessing && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2"><Icon name="fa-circle-notch fa-spin text-blue-500 text-4xl" /><span className="text-sm font-bold text-blue-400 uppercase animate-pulse">Rendering</span></div>}
           
           <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 ${isProcessing ? 'hidden' : ''}`}>
              <button onClick={e => { e.stopPropagation(); onGenerateAsset(false, asset.id); }} disabled={asset.locked} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all disabled:opacity-50"><Icon name={asset.imageUrl ? "fa-rotate-left" : "fa-wand-magic-sparkles"} /> {asset.imageUrl ? 'RE-SYNC' : 'GENERATE'}</button>
              {asset.imageUrl && (
                 <div className="flex flex-col gap-2 translate-y-2 group-hover:translate-y-0 transition-all delay-75">
                    <button onClick={e => { e.stopPropagation(); setPreviewUrl(asset.imageUrl); }} className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg"><Icon name="fa-maximize text-xs" /></button>
                    <button onClick={e => { e.stopPropagation(); onRegenerateBackground?.(asset.id); }} className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg"><Icon name="fa-panorama text-xs" /></button>
                    <button onClick={e => { e.stopPropagation(); onToggleReference?.(asset.imageUrl!); }} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-lg ${isReference ? 'bg-purple-600 text-white' : 'bg-slate-800 text-white hover:bg-purple-600'}`}><Icon name={isReference ? "fa-bookmark" : "fa-plus-square text-xs"} /></button>
                 </div>
              )}
           </div>

           {/* Top-Left Action Cluster */}
           <div className="absolute top-4 left-4 flex gap-2 z-20">
              {!isFocus && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); setFocusIndex(index); setViewMode('focus'); }}
                    className="w-10 h-10 bg-black/60 hover:bg-blue-600 text-white rounded-xl backdrop-blur-md flex items-center justify-center shadow-lg border border-white/5 transition-all group/focus"
                    title="Focus on this Asset"
                 >
                    <Icon name="fa-expand text-xs group-hover/focus:scale-110 transition-transform" />
                 </button>
              )}
              {asset.locked && <div className="bg-yellow-600/90 backdrop-blur text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg animate-in zoom-in duration-300 border border-white/10"><Icon name="fa-lock text-xs" /></div>}
           </div>

           <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, enabled: !chibi.enabled } }); }} className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all z-20 ${chibi.enabled ? 'bg-purple-600 text-white' : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10 backdrop-blur'}`}><Icon name="fa-child mr-2" /> Chibi {chibi.enabled ? 'On' : 'Off'}</button>
        </div>

        <div className={`flex-1 flex flex-col min-w-0 ${isFocus ? 'bg-[#0b1120] overflow-y-auto' : ''}`}>
          <div className="p-4 bg-slate-950/40 border-b border-slate-800/50 flex justify-between items-center shrink-0">
             <input value={asset.name} onChange={e => onUpdateAsset(asset.id, { name: e.target.value })} onClick={e => e.stopPropagation()} className="bg-transparent text-base font-black text-slate-200 outline-none w-1/2 focus:text-white" />
             <div className="flex gap-3 items-center">
                <select value={asset.aspectRatio} onChange={e => onUpdateAsset(asset.id, { aspectRatio: e.target.value as any })} onClick={e => e.stopPropagation()} className="bg-transparent text-xs font-black text-slate-500 uppercase outline-none cursor-pointer"><option value="1:1">1:1</option><option value="3:4">3:4</option><option value="4:3">4:3</option><option value="9:16">9:16</option><option value="16:9">16:9</option></select>
                <button onClick={e => { e.stopPropagation(); onRemoveAsset(asset.id); }} className="text-slate-600 hover:text-red-400 p-2"><Icon name="fa-times text-xs" /></button>
             </div>
          </div>

          <div className="p-5 space-y-5">
             {chibi.enabled && (
                <div className="grid grid-cols-2 gap-3 bg-[#070b14] p-3 rounded-2xl border border-purple-500/10">
                   {['proportions', 'headStyle', 'bodyStyle', 'focus'].map((field) => (
                      <div key={field} className="space-y-1.5">
                         <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider">{field.replace('Style', '')}</span>
                         <div className="flex bg-black p-0.5 rounded-lg border border-slate-800">
                            {field === 'proportions' && <>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, proportions: 'simple' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.proportions === 'simple' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>2H</button>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, proportions: 'semi' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.proportions === 'semi' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>3H</button>
                            </>}
                            {field === 'headStyle' && <>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, headStyle: 'moe' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.headStyle === 'moe' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Moe</button>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, headStyle: 'realistic' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.headStyle === 'realistic' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Real</button>
                            </>}
                            {field === 'bodyStyle' && <>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, bodyStyle: 'geometric' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.bodyStyle === 'geometric' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Geo</button>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, bodyStyle: 'defined' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.bodyStyle === 'defined' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Def</button>
                            </>}
                            {field === 'focus' && <>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, focus: 'kawaii' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.focus === 'kawaii' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Kawaii</button>
                               <button onClick={e => { e.stopPropagation(); onUpdateAsset(asset.id, { chibiConfig: { ...chibi, focus: 'detailed' } }); }} className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${chibi.focus === 'detailed' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Det</button>
                            </>}
                         </div>
                      </div>
                   ))}
                </div>
             )}

             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Environment Overlays</span>
                   <select value={curBg.mode} onChange={e => updateBgProp(asset.id, curBg, 'mode', e.target.value)} onClick={e => e.stopPropagation()} className="bg-slate-950 border border-slate-800 text-[10px] font-black text-blue-400 rounded-lg px-3 py-1 outline-none"><option value="none">AI Decide</option><option value="scene">Scene</option><option value="transparent">Transparent</option><option value="solid">Solid</option></select>
                </div>
                {curBg.mode === 'transparent' && (
                   <div className="bg-black/40 p-4 rounded-xl border border-blue-500/10 space-y-4 animate-in slide-in-from-top-1" onClick={e => e.stopPropagation()}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={curBg.removeHoles} onChange={e => updateBgProp(asset.id, curBg, 'removeHoles', e.target.checked)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded accent-blue-600" />
                         <span className="text-xs font-black text-slate-400 uppercase group-hover:text-slate-200">Remove Holes (Heal)</span>
                      </label>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-600 uppercase">Healing Power</span><span className="text-blue-400 font-mono text-xs font-bold">{curBg.healingPower}%</span></div>
                         <input type="range" min="0" max="100" value={curBg.healingPower} onChange={e => updateBgProp(asset.id, curBg, 'healingPower', parseInt(e.target.value))} onClick={e => e.stopPropagation()} className="w-full h-1 accent-blue-600 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                      </div>
                   </div>
                )}
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Slot-Specific Traits</span>
                   <button 
                      onClick={(e) => { e.stopPropagation(); setFullscreenEditId(asset.id); }}
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Expanded Editor"
                   >
                      <Icon name="fa-up-right-and-down-left-from-center text-[10px]" />
                   </button>
                </div>
                <textarea value={asset.promptSuffix} onChange={e => onUpdateAsset(asset.id, { promptSuffix: e.target.value })} onClick={e => e.stopPropagation()} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 font-medium italic leading-relaxed outline-none focus:border-blue-500/50 resize-none custom-scrollbar" placeholder="Add specific traits for this slot..." />
             </div>

             {isFocus && (
                <div className="pt-4 border-t border-slate-800 flex gap-3">
                   <button onClick={() => onGenerateAsset(false, asset.id)} disabled={isProcessing || asset.locked} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-30"><Icon name="fa-wand-magic-sparkles mr-2" /> SYNC ART</button>
                   {asset.imageUrl && <button onClick={() => onRegenerateBackground?.(asset.id)} disabled={isProcessing} className="flex-1 border border-slate-700 hover:bg-slate-800 text-slate-300 py-3 rounded-xl font-black text-sm uppercase tracking-widest"><Icon name="fa-panorama mr-2" /> SWAP BG</button>}
                </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden font-sans">
      <FullScreenPreview isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} imageUrl={previewUrl} />
      
      {/* Unified Full Screen Prompt Modal */}
      {fullscreenEditId && (
         <div className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-10 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl h-[70vh] flex flex-col gap-6">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-100 uppercase tracking-[0.3em] flex items-center gap-3">
                     <Icon name={fullscreenEditId === 'global' ? "fa-fingerprint text-blue-500" : "fa-pen-to-square text-purple-500"} /> 
                     {editingTitle}
                  </h2>
                  <button onClick={() => setFullscreenEditId(null)} className="w-12 h-12 rounded-full bg-slate-800 text-white hover:bg-red-600 transition-all flex items-center justify-center shadow-xl"><Icon name="fa-times text-xl" /></button>
               </div>
               <textarea 
                  value={editingValue} 
                  onChange={e => handleUpdateFullscreenValue(e.target.value)} 
                  className={`w-full flex-1 bg-slate-900 border-2 rounded-3xl p-10 text-2xl text-slate-100 font-serif italic leading-relaxed outline-none shadow-2xl resize-none custom-scrollbar ${fullscreenEditId === 'global' ? 'border-slate-800 focus:border-blue-500/50' : 'border-slate-800 focus:border-purple-500/50'}`} 
                  placeholder={fullscreenEditId === 'global' ? "Describe hair color, eye shape, armor details..." : "Describe slot specific traits..."} 
                  autoFocus 
               />
               <div className="flex justify-center"><button onClick={() => setFullscreenEditId(null)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40 active:scale-95 transition-all">Save Changes & Close</button></div>
            </div>
         </div>
      )}

      <div className="h-24 bg-slate-900/50 border-b border-slate-800 flex items-center px-10 gap-10 shrink-0 z-10 shadow-2xl">
         <div className="flex items-center gap-6 shrink-0">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSidebarCollapsed ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}><Icon name={isSidebarCollapsed ? "fa-id-card" : "fa-chevron-left"} className="text-sm" /></button>
            <div className="h-8 w-px bg-slate-800" />
         </div>

         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
               <span className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Character Dossier</span>
               <div className="h-px w-10 bg-slate-800" />
               <select value={characterRarity} onChange={e => onUpdateRarity(e.target.value as Rarity)} className="bg-transparent text-xs font-black text-yellow-500 uppercase outline-none cursor-pointer">
                  {['R','SR','SSR','UR'].map(r => <option key={r} value={r} className="bg-slate-900">{r} Tier</option>)}
               </select>
            </div>
            <div className="flex items-baseline gap-4">
               <input value={characterName} onChange={e => onUpdateName(e.target.value)} className="bg-transparent text-4xl font-black text-white outline-none focus:text-blue-400 transition-colors w-1/2" placeholder="Character Name" />
               <input value={characterSubtitle} onChange={e => onUpdateSubtitle(e.target.value)} className="bg-transparent text-lg font-medium text-slate-500 italic outline-none focus:text-slate-300 transition-colors flex-1" placeholder="Add title..." />
            </div>
         </div>
         
         <div className="flex gap-6 shrink-0">
            <div className="flex flex-col gap-1">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Render Style</span>
               <select value={selectedStyleId} onChange={(e) => onUpdateStyle(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 min-w-[140px]">
                  {ART_STYLES.map(style => <option key={style.id} value={style.id}>{style.name}</option>)}
               </select>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
               {isGenerating ? (
                  <button onClick={onCancelGeneration} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-red-900/30 flex items-center gap-2 animate-pulse"><Icon name="fa-stop" /> Abort</button>
               ) : (
                  <button onClick={onGenerateAll} disabled={!traits} className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-red-900/30 flex items-center gap-2 disabled:opacity-30"><Icon name="fa-layer-group" /> Sync Bible</button>
               )}
            </div>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
         <div className={`border-r border-slate-800 bg-[#0b1120] flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0 relative ${isSidebarCollapsed ? 'w-0 border-r-0 shadow-none' : 'w-[400px] shadow-2xl z-10'}`}>
            <div className={`${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'} flex flex-col h-full`}>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Icon name="fa-fingerprint text-blue-500" /> Physical Constants
                          </h3>
                          <div className="flex gap-2">
                             <button onClick={() => setFullscreenEditId('global')} className="w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-md" title="Full Screen Editor"><Icon name="fa-expand text-xs" /></button>
                             <button onClick={onSuggestTraits} disabled={isSuggesting || !characterName} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-3 h-8 rounded-lg flex items-center gap-2 transition-all shadow-md border border-blue-500/20 text-[10px] font-black uppercase tracking-widest" title="AI Suggestions">
                                <Icon name={isSuggesting ? "fa-circle-notch fa-spin" : "fa-wand-magic-sparkles text-xs"} />
                                {isSuggesting ? 'Thinking...' : 'Suggest'}
                             </button>
                          </div>
                       </div>
                       <div className="relative group">
                          <textarea value={traits} onChange={e => onUpdateTraits(e.target.value)} className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-base text-slate-100 font-serif italic leading-relaxed outline-none focus:border-blue-500/50 shadow-inner transition-all resize-none" placeholder="Constant traits..." />
                          <div className="absolute inset-0 rounded-2xl pointer-events-none border border-blue-500/0 group-focus-within:border-blue-500/10 transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Race & Identity</h3></div>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><span className="text-xs font-bold text-slate-500 uppercase">Race</span><select value={characterRace} onChange={e => onUpdateRace(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500">{AETHELGARD_RACES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                          <div className="space-y-1.5"><span className="text-xs font-bold text-slate-500 uppercase">Gender</span><select value={characterGender} onChange={e => onUpdateGender(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></div>
                       </div>
                    </div>

                    <div className="space-y-4 pb-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">Style References {isAnalyzing ? <Icon name="fa-spinner fa-spin text-blue-500" /> : <button onClick={onAnalyzeStyle} className="text-blue-500 hover:text-blue-400"><Icon name="fa-wand-magic-sparkles" /></button>}</h3>
                       <div className={`grid grid-cols-3 gap-3 p-4 rounded-2xl border-2 border-dashed transition-all ${isDragOver ? 'bg-blue-500/5 border-blue-500 shadow-xl' : 'bg-slate-950/30 border-slate-800'}`} onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleRefDrop}>
                          {referenceAssets.map(asset => (
                             <div key={asset.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group/ref"><img src={asset.url} className="w-full h-full object-cover" /><button onClick={() => setReferenceAssets(p => p.filter(r => r.id !== asset.id))} className="absolute top-0 right-0 w-5 h-5 bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity hover:bg-red-600"><Icon name="fa-times text-[8px]" /></button></div>
                          ))}
                          <label className="aspect-square rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 hover:text-blue-400 hover:border-blue-500 cursor-pointer transition-all bg-slate-900/20"><Icon name="fa-plus text-sm" /><input type="file" className="sr-only" onChange={e => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = () => { setReferenceAssets(prev => [{ id: Date.now().toString(), url: reader.result as string, roleNote: '' }, ...prev]); }; reader.readAsDataURL(e.target.files[0]); } }} /></label>
                       </div>
                    </div>
                </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950 relative">
            <div className="max-w-7xl mx-auto space-y-8">
               <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur shadow-lg sticky top-0 z-30">
                  <div className="flex items-center gap-4"><h2 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3"><Icon name="fa-table-cells text-blue-500" /> Bible Manifest <span className="px-3 py-1 rounded-full bg-slate-950 text-[11px] text-slate-400 border border-slate-800 font-bold">{assets.length} Slots</span></h2></div>
                  <div className="flex items-center gap-4">
                     <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setViewMode('dossier')} className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Dossier</button>
                        <button onClick={() => setViewMode('gallery')} className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'gallery' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Gallery</button>
                        <button onClick={() => setViewMode('focus')} className={`px-5 py-2 rounded-md text-xs font-black uppercase transition-all ${viewMode === 'focus' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Focus</button>
                     </div>
                     <button onClick={onAddSlot} className="text-xs font-black text-blue-400 hover:text-white uppercase tracking-widest flex items-center gap-2 px-3"><Icon name="fa-plus" /> NEW SLOT</button>
                  </div>
               </div>

               {viewMode === 'dossier' && (
                  <div className={`grid gap-10 items-start ${isSidebarCollapsed ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
                     {assets.map((asset, idx) => <AssetCard key={asset.id} asset={asset} index={idx} />)}
                  </div>
               )}

               {viewMode === 'gallery' && (
                  <div className={`grid gap-6 ${isSidebarCollapsed ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                     {assets.map((asset, idx) => (
                        <div key={asset.id} onClick={() => { setFocusIndex(idx); setViewMode('focus'); }} className="relative aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group cursor-pointer hover:border-blue-500 transition-all hover:scale-[1.03] hover:shadow-2xl">
                           {asset.imageUrl ? <img src={asset.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 font-black text-xs uppercase opacity-40"><Icon name="fa-image text-3xl mb-3" /> No Art</div>}
                           <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-xs font-black text-white uppercase tracking-wider truncate block">{asset.name}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {viewMode === 'focus' && activeFocusAsset && (
                  <div className="relative animate-in zoom-in-95 duration-300 flex flex-col items-center gap-8">
                     <div className="w-full max-w-7xl h-[calc(100vh-280px)] min-h-[600px]">
                        <AssetCard asset={activeFocusAsset} isFocus={true} index={focusIndex} />
                     </div>
                     <div className="flex items-center gap-10 bg-slate-900/60 border border-slate-800 rounded-full px-10 py-4 backdrop-blur shadow-2xl shrink-0">
                        <button onClick={handlePrevFocus} className="w-12 h-12 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"><Icon name="fa-chevron-left" /></button>
                        <div className="flex flex-col items-center">
                           <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{focusIndex + 1} / {assets.length}</span>
                           <div className="flex gap-2 mt-3">
                              {assets.map((_, i) => <div key={i} className={`h-2 rounded-full transition-all ${i === focusIndex ? 'w-10 bg-blue-500' : 'w-3 bg-slate-800'}`} />)}
                           </div>
                        </div>
                        <button onClick={handleNextFocus} className="w-12 h-12 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"><Icon name="fa-chevron-right" /></button>
                        <div className="w-px h-10 bg-slate-800 mx-2" />
                        <button onClick={() => setViewMode('dossier')} className="text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest px-4">Exit Focus</button>
                     </div>
                  </div>
               )}

               {viewMode === 'dossier' && (
                  <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-10 space-y-8 shadow-inner">
                     <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3"><Icon name="fa-bolt text-yellow-500" /> Supplemental Layout Presets</h3>
                     <div className={`grid gap-5 ${isSidebarCollapsed ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
                        {GACHA_ASSET_PRESETS.map((p, idx) => (
                           <button key={idx} onClick={() => onAddPreset?.(idx)} className="flex flex-col items-center gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group shadow-sm hover:shadow-xl"><div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-blue-400 border border-slate-800 group-hover:border-blue-500/50 transition-colors shadow-inner"><Icon name={`${p.icon} text-base`} /></div><span className="text-xs font-black text-slate-400 group-hover:text-white uppercase tracking-tighter text-center leading-tight">{p.name}</span></button>
                        ))}
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