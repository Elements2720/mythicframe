
import React from 'react';
import { 
  UIMode, CardLayout, LayoutElement, BackgroundConfig, PixelDimensions,
  FrameElement, BackgroundPatternType, AspectRatio, CsvCardData, AnimationProject, ImageSize, SafeZoneConfig, ResizeItem, CharacterToolState, ClothesParams
} from '../../types';
import { ART_STYLES, DEFAULT_CARD_LAYOUT, CARD_FONTS, FRAME_ELEMENTS, BACKGROUND_PATTERNS } from '../../constants';
import UnityInput from '../ui/UnityInput';
import { useLanguage } from '../../i18n/LanguageContext';

interface RightPanelProps {
  mode: UIMode;
  cardLayout: CardLayout;
  setCardLayout: React.Dispatch<React.SetStateAction<CardLayout>>;
  selectedLayoutElement: keyof CardLayout | null;
  setSelectedLayoutElement: (key: keyof CardLayout | null) => void;
  updateLayout: (key: keyof CardLayout, field: keyof LayoutElement, value: any) => void;
  cardName: string;
  setCardName: (val: string) => void;
  cardMana: string;
  setCardMana: (val: string) => void;
  cardEffects: string;
  setCardEffects: (val: string) => void;
  cardType?: string;
  setCardType?: (val: string) => void;
  
  selectedStyleId: string;
  setSelectedStyleId: (val: string) => void;
  
  bgConfig: BackgroundConfig;
  setBgConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  generatedImage: string | null;
  isGenerating: boolean;
  handleRegenerateBackground: () => void;
  
  // Resolution & Model Props
  selectedAspectRatio: AspectRatio;
  setSelectedAspectRatio: (val: AspectRatio) => void;
  useCustomResBox: boolean;
  setUseCustomResBox: (val: boolean) => void;
  customRes: PixelDimensions;
  setCustomRes: React.Dispatch<React.SetStateAction<PixelDimensions>>;
  useProModel: boolean;
  setUseProModel: (val: boolean) => void;
  selectedSize: ImageSize;
  setSelectedSize: (val: ImageSize) => void;
  
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  showOverlays: boolean;
  setShowOverlays: (val: boolean) => void;

  frameElements: FrameElement[];
  setFrameElements: (val: FrameElement[]) => void;
  bgPatternType: BackgroundPatternType;
  setBgPatternType: (val: BackgroundPatternType) => void;
  batchSize?: number;
  setBatchSize?: (val: number) => void;

  // CSV Props
  csvData: CsvCardData[];
  csvIndex: number;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCsvNavigate: (index: number) => void;

  // Animation Props
  animConfig: AnimationProject;
  setAnimConfig: (val: AnimationProject) => void;
  showOnionSkin: boolean;
  setShowOnionSkin: (val: boolean) => void;

  // New Integration Props
  onOpenAssetPicker: () => void;
  onOpenCrop?: () => void;

  // Safe Zone
  safeZone: SafeZoneConfig;
  setSafeZone: (val: SafeZoneConfig) => void;
  onMatchSafeZoneToCustom: () => void;

  // Character Tool
  characterTool?: CharacterToolState;
  setCharacterTool?: React.Dispatch<React.SetStateAction<CharacterToolState>>;
  onRegeneratePose?: () => void;

  // Clothes Mode
  clothesParams?: ClothesParams;
  setClothesParams?: (val: ClothesParams) => void;

  // Resize Mode
  resizeZoom: number;
  setResizeZoom: (val: number) => void;
  resizePan: { x: number; y: number };
  setResizePan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  handleMagicCrop: () => void;
  resizeQueue?: ResizeItem[];
  selectedResizeId?: string | null;
  onSelectResizeItem?: (id: string) => void;
  onRemoveResizeItem?: (id: string) => void;
  onAddResizeFiles?: (files: FileList) => void;
  onClearResult?: (id: string) => void;
}

const Icon = ({ name }: { name: string }) => <i className={`fa-solid ${name}`} />;

const SliderControl = ({ label, value, onChange, min=0, max=100, step=0.1 }: any) => (
  <div className="flex items-center gap-2 text-xs">
    <label className="w-20 text-slate-400 truncate" title={label}>{label}</label>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
    <span className="w-8 text-right text-slate-300">{Number.isInteger(step) ? value : Math.round(value * 10) / 10}</span>
  </div>
);

const ColorPicker = ({ label, value, onChange }: any) => (
  <div className="flex items-center gap-2 text-xs">
     <label className="w-20 text-slate-400 truncate">{label}</label>
     <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded p-1 border border-slate-700">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
        <span className="text-slate-300 text-[10px]">{value}</span>
     </div>
  </div>
);

const FontSelector = ({ label, value, onChange }: any) => (
  <div className="flex flex-col gap-1 text-xs">
     <label className="text-slate-400">{label}</label>
     <select value={value || 'Inter'} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-slate-200">
        {CARD_FONTS.map(f => <option key={f.name} value={f.family}>{f.name} ({f.type})</option>)}
     </select>
  </div>
);

const RightPanel: React.FC<RightPanelProps> = ({
  mode, cardLayout, setCardLayout, selectedLayoutElement, setSelectedLayoutElement, updateLayout,
  cardName, setCardName, cardMana, setCardMana, cardEffects, setCardEffects, cardType, setCardType,
  selectedStyleId, setSelectedStyleId, bgConfig, setBgConfig, generatedImage, isGenerating, handleRegenerateBackground,
  selectedAspectRatio, setSelectedAspectRatio, useCustomResBox, setUseCustomResBox, customRes, setCustomRes,
  useProModel, setUseProModel, selectedSize, setSelectedSize,
  isEditMode, setIsEditMode, showOverlays, setShowOverlays,
  frameElements, setFrameElements, bgPatternType, setBgPatternType, batchSize, setBatchSize,
  csvData, csvIndex, onCsvUpload, onCsvNavigate,
  animConfig, setAnimConfig, showOnionSkin, setShowOnionSkin,
  onOpenAssetPicker, onOpenCrop,
  safeZone, setSafeZone, onMatchSafeZoneToCustom,
  characterTool, setCharacterTool, onRegeneratePose,
  clothesParams, setClothesParams,
  resizeZoom, setResizeZoom, resizePan, setResizePan, handleMagicCrop,
  resizeQueue = [], selectedResizeId = null, onSelectResizeItem = () => {}, onRemoveResizeItem = () => {}, onAddResizeFiles = () => {}, onClearResult
}) => {
  const { t } = useLanguage();

  const toggleFrameElement = (id: FrameElement) => {
    if (frameElements.includes(id)) {
      setFrameElements(frameElements.filter(e => e !== id));
    } else {
      setFrameElements([...frameElements, id]);
    }
  };

  // --- RESIZE MODE PANEL ---
  if (mode === 'resize') {
     return (
       <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 z-20">
          <div className="animate-in fade-in space-y-6">
             {/* ... Resize Mode Content ... */}
             <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('ai_model')}</label>
                  </div>
                  <div className="flex bg-slate-900 rounded p-1 border border-slate-700 mb-3">
                     <button 
                        onClick={() => setUseProModel(false)} 
                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${!useProModel ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        Nano (Fast)
                     </button>
                     <button 
                        disabled
                        className="flex-1 py-1.5 text-xs rounded transition-colors text-slate-600 cursor-not-allowed opacity-50"
                        title="Pro model not available for outpainting"
                     >
                        Pro (N/A)
                     </button>
                  </div>
              </div>

             {/* Target Settings */}
             <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="fa-bullseye" /> {t('output_ratio')}
                 </h4>
                 
                 <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t('output_ratio')}</label>
                    <select value={selectedAspectRatio} onChange={(e) => setSelectedAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
                        <option value="1:1">Square (1:1)</option>
                        <option value="3:4">Portrait (3:4)</option>
                        <option value="4:3">Landscape (4:3)</option>
                        <option value="9:16">Mobile (9:16)</option>
                        <option value="16:9">Cinematic (16:9)</option>
                        <option value="custom">Custom</option>
                    </select>
                 </div>

                 {(selectedAspectRatio === 'custom' || useCustomResBox) && (
                     <div className="flex gap-2">
                        <div className="flex-1">
                          <UnityInput 
                            label="W" 
                            value={customRes.width} 
                            onChange={(val) => setCustomRes(p => ({...p, width: val}))} 
                            min={64} max={4096} step={8}
                          />
                        </div>
                        <div className="flex-1">
                          <UnityInput 
                            label="H" 
                            value={customRes.height} 
                            onChange={(val) => setCustomRes(p => ({...p, height: val}))} 
                            min={64} max={4096} step={8}
                          />
                        </div>
                     </div>
                 )}
             </div>

             {/* Transform Controls */}
             <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-3">
                 <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <Icon name="fa-arrows-up-down-left-right" /> {t('transform')}
                    </h4>
                    <button 
                        onClick={() => { setResizeZoom(1); setResizePan({x:0, y:0}); }}
                        className="text-[10px] text-slate-500 hover:text-white transition-colors"
                        title={t('reset_transform')}
                    >
                        <i className="fa-solid fa-rotate-left" />
                    </button>
                 </div>
                 
                 <UnityInput 
                    label={t('zoom')}
                    value={Math.round(resizeZoom * 100)} 
                    onChange={(val) => setResizeZoom(val / 100)}
                    min={10} max={300} step={1}
                    icon="fa-magnifying-glass"
                    suffix="%"
                 />

                 <div className="flex gap-2">
                     <div className="flex-1">
                        <UnityInput 
                            label={t('pan_x')}
                            value={Math.round(resizePan.x)} 
                            onChange={(val) => setResizePan(p => ({...p, x: val}))}
                            min={-2048} max={2048} step={1}
                            icon="fa-arrows-left-right"
                            sensitivity={1}
                        />
                     </div>
                     <div className="flex-1">
                        <UnityInput 
                            label={t('pan_y')}
                            value={Math.round(resizePan.y)} 
                            onChange={(val) => setResizePan(p => ({...p, y: val}))}
                            min={-2048} max={2048} step={1}
                            icon="fa-arrows-up-down"
                            sensitivity={1}
                        />
                     </div>
                 </div>
             </div>

             {/* Post Process */}
             <div className="border-t border-slate-800 pt-4 space-y-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="fa-sliders" /> {t('post_process')}
                 </h4>
                 
                 <label className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                       <Icon name="fa-vector-square" />
                       <span>{t('show_safe_zone')}</span>
                    </div>
                    <input type="checkbox" checked={safeZone.enabled} onChange={(e) => setSafeZone({...safeZone, enabled: e.target.checked})} className="rounded bg-slate-900 border-slate-600 text-green-500" />
                 </label>
                 
                 <label className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                       <Icon name="fa-crop-simple" />
                       <span>{t('custom_crop_box')}</span>
                    </div>
                    <input type="checkbox" checked={useCustomResBox} onChange={(e) => setUseCustomResBox(e.target.checked)} className="rounded bg-slate-900 border-slate-600 text-cyan-500" />
                 </label>

                 {(safeZone.enabled || useCustomResBox) && generatedImage && (
                     <button 
                        onClick={handleMagicCrop}
                        className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 mt-2"
                     >
                        <Icon name="fa-scissors" /> {t('crop_result')}
                     </button>
                 )}
             </div>
          </div>
       </div>
     );
  }

  // --- FULL CARD MODE PANEL ---
  if (mode === 'fullcard') {
    return (
       <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 z-20">
          <div className="space-y-6 pb-20">
             <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                 <h3 className="font-bold text-slate-200">Layout Layers</h3>
                 <button onClick={() => setCardLayout(DEFAULT_CARD_LAYOUT)} className="text-xs text-red-400 hover:text-red-300">
                   <Icon name="fa-rotate-left" /> Reset
                 </button>
              </div>
              {/* ... Full Card content ... */}
              <div className="flex flex-col gap-1">
                 {['art', 'name', 'type', 'mana', 'description'].map((k) => (
                    <button 
                      key={k}
                      onClick={() => setSelectedLayoutElement(k as any)}
                      className={`text-left px-3 py-2 rounded text-xs flex justify-between items-center ${selectedLayoutElement === k ? 'bg-blue-900/30 text-blue-200 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                       <span className="capitalize">{k}</span>
                       {selectedLayoutElement === k && <Icon name="fa-check" />}
                    </button>
                 ))}
              </div>

              {selectedLayoutElement && (
                  <div className="bg-slate-900 p-3 rounded border border-blue-500/30 animate-in fade-in">
                     <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Properties</h4>
                     <SliderControl label="X %" value={cardLayout[selectedLayoutElement].x} onChange={(v:number) => updateLayout(selectedLayoutElement, 'x', v)} />
                     <SliderControl label="Y %" value={cardLayout[selectedLayoutElement].y} onChange={(v:number) => updateLayout(selectedLayoutElement, 'y', v)} />
                     <SliderControl label="W %" value={cardLayout[selectedLayoutElement].width} onChange={(v:number) => updateLayout(selectedLayoutElement, 'width', v)} />
                     
                     {selectedLayoutElement === 'art' && (
                        <>
                           <div className="h-px bg-slate-800 my-2"></div>
                           <p className="text-[10px] text-slate-500 font-bold mb-1">INNER IMAGE</p>
                           <button 
                              onClick={onOpenAssetPicker}
                              className="w-full mb-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded py-1.5 text-xs flex items-center justify-center gap-2 transition-colors"
                           >
                              <Icon name="fa-images" /> {t('select')}
                           </button>
                           <SliderControl label="Zoom" min={0.1} max={3} value={cardLayout.art.imageScale || 1} onChange={(v:number) => updateLayout('art', 'imageScale', v)} />
                           <SliderControl label="Pan X" min={-100} max={100} value={cardLayout.art.imageOffsetX || 0} onChange={(v:number) => updateLayout('art', 'imageOffsetX', v)} />
                           <SliderControl label="Pan Y" min={-100} max={100} value={cardLayout.art.imageOffsetY || 0} onChange={(v:number) => updateLayout('art', 'imageOffsetY', v)} />
                        </>
                     )}
                     {selectedLayoutElement !== 'art' && (
                        <div className="mt-3 space-y-3">
                           <SliderControl label="Size" value={cardLayout[selectedLayoutElement].fontSize!} max={60} onChange={(v:number) => updateLayout(selectedLayoutElement, 'fontSize', v)} />
                           <FontSelector label="Font Family" value={cardLayout[selectedLayoutElement].fontFamily} onChange={(v:string) => updateLayout(selectedLayoutElement, 'fontFamily', v)} />
                           <ColorPicker label="Text Color" value={cardLayout[selectedLayoutElement].color} onChange={(v:string) => updateLayout(selectedLayoutElement, 'color', v)} />
                        </div>
                     )}
                  </div>
               )}
               
               {/* CSV Data Source */}
               <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase">Data Source</h4>
                    <span className="text-[10px] text-slate-500">{csvData.length} records</span>
                  </div>
                  
                  {csvData.length === 0 ? (
                     <label className="flex flex-col items-center justify-center w-full h-16 border border-dashed border-slate-700 rounded cursor-pointer hover:border-purple-500 hover:bg-slate-800/50 transition-colors bg-slate-900/50 text-slate-500 hover:text-purple-400">
                        <div className="text-xs font-medium"><Icon name="fa-file-csv" /> Upload CSV</div>
                        <span className="text-[9px]">name, mana, description</span>
                        <input type="file" className="hidden" accept=".csv" onChange={onCsvUpload} />
                     </label>
                  ) : (
                     <div className="bg-slate-800/50 rounded p-2 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                           <button onClick={() => onCsvNavigate(csvIndex - 1)} disabled={csvIndex <= 0} className="hover:text-white disabled:opacity-30"><Icon name="fa-chevron-left"/></button>
                           <span>Row {csvIndex + 1} of {csvData.length}</span>
                           <button onClick={() => onCsvNavigate(csvIndex + 1)} disabled={csvIndex >= csvData.length - 1} className="hover:text-white disabled:opacity-30"><Icon name="fa-chevron-right"/></button>
                        </div>
                        <input 
                           type="range" 
                           min={0} 
                           max={csvData.length - 1} 
                           value={csvIndex} 
                           onChange={(e) => onCsvNavigate(parseInt(e.target.value))}
                           className="w-full accent-purple-500 h-1 bg-slate-600 rounded appearance-none cursor-pointer"
                        />
                        <div className="text-[10px] text-slate-500 flex justify-between">
                           <button onClick={() => onCsvUpload({target: {files: []}} as any)} className="text-red-400 hover:underline">Clear Data</button>
                           <label className="text-purple-400 cursor-pointer hover:underline">
                              Replace File
                              <input type="file" className="hidden" accept=".csv" onChange={onCsvUpload} />
                           </label>
                        </div>
                     </div>
                  )}
               </div>

               <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">{t('card_content')}</h4>
                  <input type="text" value={cardName} onChange={e=>setCardName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" placeholder={t('card_name')}/>
                  <div className="flex gap-2">
                      <input type="text" value={cardType || ''} onChange={e=>setCardType && setCardType(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" placeholder={t('card_type')}/>
                      <input type="text" value={cardMana} onChange={e=>setCardMana(e.target.value)} className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200" placeholder="Cost"/>
                  </div>
                  <textarea value={cardEffects} onChange={e=>setCardEffects(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm h-20 text-slate-200" placeholder={t('card_desc')}/>
               </div>
          </div>
       </div>
    );
  }

  // --- STANDARD STUDIO MODES (Illustration, Frame, Background, Animation, Clothes, BG Replace) ---
  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 z-20">
       <div className="space-y-6 pb-20">
              
              {/* Model Selection */}
              <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('ai_model')}</label>
                  </div>
                  <div className="flex bg-slate-900 rounded p-1 border border-slate-700 mb-3">
                     <button 
                        onClick={() => setUseProModel(false)} 
                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${!useProModel ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        Standard (Fast)
                     </button>
                     <button 
                        onClick={() => setUseProModel(true)} 
                        className={`flex-1 py-1.5 text-xs rounded transition-colors ${useProModel ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                        Gemini 3 (Pro)
                     </button>
                  </div>
              </div>

              {/* Clothes Mode Specifics */}
              {mode === 'clothes' && clothesParams && setClothesParams && (
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('clothes_render_mode')}</label>
                    <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
                        <button 
                           onClick={() => setClothesParams({ ...clothesParams, renderMode: 'model' })} 
                           className={`flex-1 py-1.5 text-xs rounded transition-colors ${clothesParams.renderMode === 'model' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                           {t('render_model')}
                        </button>
                        <button 
                           onClick={() => setClothesParams({ ...clothesParams, renderMode: 'asset' })} 
                           className={`flex-1 py-1.5 text-xs rounded transition-colors ${clothesParams.renderMode === 'asset' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                           {t('render_asset')}
                        </button>
                    </div>
                    {clothesParams.renderMode === 'asset' && (
                       <p className="text-[10px] text-slate-500 mt-1 italic">
                          Ghost Mannequin mode: Renders hollow clothes without body parts. Ideal for game assets.
                       </p>
                    )}
                 </div>
              )}

              {/* Animation Mode Specifics */}
              {mode === 'animation' && (
                 <div className="space-y-4">
                     <div className="bg-slate-800 p-3 rounded border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Animation Settings</h4>
                        <div className="space-y-3">
                           <div>
                              <label className="block text-xs text-slate-500 mb-1">Type</label>
                              <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
                                 <button 
                                   onClick={() => setAnimConfig({...animConfig, type: 'illustration'})}
                                   className={`flex-1 py-1 text-xs rounded transition-colors ${animConfig.type === 'illustration' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                 >
                                    {t('illustration')}
                                 </button>
                                 <button 
                                   onClick={() => setAnimConfig({...animConfig, type: 'background'})}
                                   className={`flex-1 py-1 text-xs rounded transition-colors ${animConfig.type === 'background' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                 >
                                    {t('background_setting')}
                                 </button>
                              </div>
                           </div>
                           <SliderControl label="FPS" min={1} max={12} value={animConfig.fps} onChange={(v:number) => setAnimConfig({...animConfig, fps: v})} />
                           
                           <div className="flex items-center justify-between pt-2 border-t border-slate-700 mt-2">
                               <label className="text-xs text-slate-400">Onion Skin</label>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={showOnionSkin} onChange={e => setShowOnionSkin(e.target.checked)} className="sr-only peer" />
                                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                               </label>
                           </div>
                        </div>
                     </div>
                 </div>
              )}

              {/* Frame Mode Specifics */}
              {mode === 'frame' && (
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('frame_elements')}</h4>
                    <div className="space-y-2">
                      {FRAME_ELEMENTS.map(el => (
                        <label key={el.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                           <input 
                              type="checkbox" 
                              checked={frameElements.includes(el.id as FrameElement)} 
                              onChange={() => toggleFrameElement(el.id as FrameElement)}
                              className="rounded border-slate-600 bg-slate-700 text-purple-600"
                           />
                           {el.label}
                        </label>
                      ))}
                    </div>

                    {/* Batch Size for Frame Mode */}
                    {batchSize !== undefined && setBatchSize && (
                        <div className="pt-2 mt-2 border-t border-slate-700">
                           <SliderControl label={t('batch_count')} value={batchSize} min={1} max={4} step={1} onChange={setBatchSize} />
                        </div>
                    )}
                </div>
              )}

              {/* Background Mode Specifics (Also for Animation Backgrounds) */}
              {(mode === 'background' || (mode === 'animation' && animConfig.type === 'background')) && (
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('pattern_type')}</label>
                    <select 
                       value={bgPatternType} 
                       onChange={(e) => setBgPatternType(e.target.value as BackgroundPatternType)} 
                       className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                    >
                       {BACKGROUND_PATTERNS.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                       ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-2">
                       {BACKGROUND_PATTERNS.find(p => p.id === bgPatternType)?.description}
                    </p>
                 </div>
              )}

              {/* Art Style */}
              <div>
                 <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('art_style')}</label>
                 <select value={selectedStyleId} onChange={(e) => setSelectedStyleId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200">
                    {ART_STYLES.map(style => <option key={style.id} value={style.id}>{style.name}</option>)}
                 </select>
              </div>

              {/* Background Config (Illustration, Background, Clothes, Animation Illustration, Bg Replace) */}
              {(mode === 'illustration' || mode === 'background' || mode === 'clothes' || mode === 'bg-replace' || (mode === 'animation' && animConfig.type === 'illustration')) && (
                 <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-3">
                     <div className="flex justify-between items-center">
                         <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('background_setting')}</label>
                         {generatedImage && (mode === 'illustration' || mode === 'clothes' || mode === 'bg-replace') && (
                             <button 
                                 onClick={handleRegenerateBackground} 
                                 disabled={isGenerating}
                                 className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1 shadow-sm"
                             >
                                 {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic"></i>} {t('regenerate')}
                             </button>
                         )}
                     </div>

                     {/* Batch Size for Illustration/Clothes */}
                     {(mode === 'illustration' || mode === 'clothes') && batchSize !== undefined && setBatchSize && (
                         <div className="pb-2 border-b border-slate-700 mb-2">
                            <SliderControl label={t('batch_count')} value={batchSize} min={1} max={4} step={1} onChange={setBatchSize} />
                         </div>
                     )}

                     <div className="flex gap-2 items-center">
                        {bgConfig.mode === 'solid' && (
                            <input type="color" value={bgConfig.color} onChange={e => setBgConfig(p => ({...p, color: e.target.value}))} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none shrink-0" title="Pick Color" />
                        )}
                        <select 
                             value={bgConfig.mode} 
                             onChange={e => setBgConfig(p => ({...p, mode: e.target.value as any}))} 
                             className="flex-1 bg-slate-900 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200 outline-none focus:border-purple-500"
                         >
                              <option value="none">AI Decides</option>
                              <option value="scene">Prompt Only</option>
                              <option value="pattern">Pattern / Style</option>
                              <option value="solid">Solid Color</option>
                              <option value="transparent">Transparent (Auto-Remove)</option>
                        </select>
                     </div>
                     
                     {/* Pattern Selection Dropdown */}
                     {bgConfig.mode === 'pattern' && (
                        <div>
                           <select
                              value={bgConfig.patternType || 'abstract'}
                              onChange={e => setBgConfig(p => ({...p, patternType: e.target.value as any}))}
                              className="w-full bg-slate-900 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200 outline-none focus:border-purple-500"
                           >
                              {BACKGROUND_PATTERNS.map(p => (
                                 <option key={p.id} value={p.id}>{p.label}</option>
                              ))}
                           </select>
                        </div>
                     )}

                     {(bgConfig.mode === 'scene' || bgConfig.mode === 'none' || bgConfig.mode === 'pattern') && (
                         <textarea 
                             placeholder={bgConfig.mode === 'none' ? "Optional hints for AI..." : "Describe the background..."}
                             value={bgConfig.promptFragment} 
                             onChange={e => setBgConfig(p => ({...p, promptFragment: e.target.value}))} 
                             className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 h-20 resize-none focus:border-purple-500 outline-none custom-scrollbar" 
                         />
                     )}
                  </div>
              )}

              {/* Character Helper Tool (Illustration Only) */}
              {mode === 'illustration' && characterTool && setCharacterTool && (
                  <div className="bg-slate-800 p-3 rounded border border-slate-700 animate-in fade-in">
                      <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                              <Icon name="fa-person" /> {t('character_helper')}
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={characterTool.enabled} 
                                  onChange={e => setCharacterTool({...characterTool, enabled: e.target.checked, isSettingLookTarget: false})} 
                                  className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                      </div>

                      {characterTool.enabled && (
                          <div className="space-y-3">
                              <div>
                                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">{t('pose_desc')}</label>
                                  <textarea 
                                      value={characterTool.poseDescription}
                                      onChange={e => setCharacterTool({...characterTool, poseDescription: e.target.value})}
                                      placeholder="e.g. Holding a sword up, crouching..."
                                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-purple-500 h-16 resize-none custom-scrollbar"
                                  />
                              </div>
                              
                              <div className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded border border-slate-800">
                                  <div className="flex flex-col">
                                      <span className="text-slate-400 mb-1">Look Target:</span>
                                      {characterTool.lookTarget ? (
                                          <span className="text-green-400 font-bold flex items-center gap-1 text-[10px]">
                                              <i className="fa-solid fa-check-circle"/> ({Math.round(characterTool.lookTarget.x)}%, {Math.round(characterTool.lookTarget.y)}%)
                                          </span>
                                      ) : (
                                          <span className="text-slate-500 italic text-[10px]">Not set</span>
                                      )}
                                  </div>
                                  <button 
                                      onClick={() => setCharacterTool({ ...characterTool, isSettingLookTarget: !characterTool.isSettingLookTarget })}
                                      className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all border ${
                                          characterTool.isSettingLookTarget 
                                          ? 'bg-yellow-600 text-white border-yellow-500 animate-pulse' 
                                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                      }`}
                                  >
                                      {characterTool.isSettingLookTarget ? 'Click on Canvas...' : t('set_target')}
                                  </button>
                              </div>

                              {onRegeneratePose && (
                                  <button 
                                      onClick={onRegeneratePose}
                                      disabled={isGenerating || !generatedImage}
                                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                      {isGenerating ? <i className="fa-solid fa-spinner fa-spin"/> : <i className="fa-solid fa-person-rays"/>} Regenerate Pose
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
              )}

              {/* Resolution (Standard Modes) */}
              <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('output_ratio')}</label>
                  <select value={selectedAspectRatio} onChange={(e) => { 
                     setSelectedAspectRatio(e.target.value as AspectRatio); 
                     if(e.target.value === 'custom') setUseCustomResBox(false); 
                  }} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200">
                      <option value="1:1">Square (1:1)</option>
                      <option value="3:4">Portrait (3:4)</option>
                      <option value="4:3">Landscape (4:3)</option>
                      <option value="9:16">Mobile (9:16)</option>
                      <option value="16:9">Cinematic (16:9)</option>
                      <option value="21:9">Ultrawide (21:9)</option>
                      <option value="custom">Custom Size / Crop</option>
                  </select>
                  
                  {(selectedAspectRatio === 'custom' || useCustomResBox) && (
                     <div className="flex gap-2 mt-2">
                        <input type="number" value={customRes.width} onChange={e => setCustomRes(p=>({...p, width: parseInt(e.target.value)}))} className="w-1/2 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-center text-slate-200" placeholder="W" />
                        <input type="number" value={customRes.height} onChange={e => setCustomRes(p=>({...p, height: parseInt(e.target.value)}))} className="w-1/2 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-center text-slate-200" placeholder="H" />
                     </div>
                  )}

                  {selectedAspectRatio === 'custom' && generatedImage && onOpenCrop && (
                     <button 
                        onClick={onOpenCrop}
                        className="w-full mt-3 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 rounded py-2 text-xs font-bold transition-all flex items-center justify-center gap-2"
                     >
                        <i className="fa-solid fa-crop-simple" /> Smart Resize & Crop
                     </button>
                  )}

                  {selectedAspectRatio !== 'custom' && (
                     <div className="space-y-2 mt-3">
                         <div className="flex items-center gap-2">
                            <input type="checkbox" checked={useCustomResBox} onChange={(e) => setUseCustomResBox(e.target.checked)} id="customRes" className="rounded bg-slate-800 border-slate-600 text-purple-600" />
                            <label htmlFor="customRes" className="text-xs text-slate-300">Custom Region Box</label>
                         </div>
                         {useCustomResBox && generatedImage && (
                             <button 
                                onClick={handleMagicCrop}
                                className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-2"
                             >
                                <Icon name="fa-crop-simple" /> {t('crop_result')}
                             </button>
                         )}
                         
                         {/* Safe Zone Toggle for Illustration & Clothes Mode */}
                         {(mode === 'illustration' || mode === 'clothes') && (
                             <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" checked={safeZone.enabled} onChange={(e) => setSafeZone({...safeZone, enabled: e.target.checked})} id="safeZone" className="rounded bg-slate-800 border-slate-600 text-green-500" />
                                <label htmlFor="safeZone" className="text-xs text-slate-300">{t('show_safe_zone')}</label>
                             </div>
                         )}
                     </div>
                  )}
              </div>
              
              {/* Text Overlay (Illustration Only) */}
              {mode === 'illustration' && (
                <>
                   <div className="border-t border-slate-800 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                         <h4 className="text-xs font-bold text-slate-400 uppercase">{t('illustration_content')}</h4>
                         <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                            <input type="checkbox" checked={showOverlays} onChange={e => setShowOverlays(e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-purple-600" />
                            {t('show_text')}
                         </label>
                      </div>
                      {showOverlays && (
                         <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <input type="text" value={cardName} onChange={e=>setCardName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" placeholder={t('illustration_name')}/>
                            <textarea value={cardEffects} onChange={e=>setCardEffects(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs h-16 text-slate-200 resize-none" placeholder={t('illustration_desc')}/>
                         </div>
                      )}
                   </div>

                   <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                      <span className="text-sm text-slate-300">{t('edit_region')}</span>
                      <button onClick={() => setIsEditMode(!isEditMode)} className={`w-10 h-5 rounded-full relative transition-colors ${isEditMode ? 'bg-purple-600' : 'bg-slate-600'}`}>
                         <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isEditMode ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                   </div>
                </>
              )}
       </div>
    </div>
  );
};

export default RightPanel;
