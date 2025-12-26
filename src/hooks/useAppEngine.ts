import React, { useState, useEffect, useRef } from 'react';
import { 
  checkApiKey, requestApiKey, generateIllustration, analyzeImageStyle,
  editImage, refinePrompt, generateCharacterTraits, generateCharacterConcept
} from '../services/geminiService';
import { exportResizeBatch } from '../services/exportService';
import { uploadImageToDrive, getDriveConnectionStatus } from '../services/googleDriveService';
import { buildBackgroundRegenPrompt } from '../services/promptTemplates';
import { 
  GenerationModel, ImageSize, AspectRatio, 
  PixelDimensions, ReferenceAsset, GameContext,
  BackgroundPatternType, SafeZoneConfig, ResizeItem,
  WorkspaceTab, ClothesParams, BgReplaceItem, BackgroundConfig, PixelStyle, PixelizeItem, GachaAsset, Rarity
} from '../types';
import { ART_STYLES, DEFAULT_BACKGROUND_CONFIG } from '../constants';
import { useTabs } from './useTabs';
import { useHistory } from './useHistory';
import { useResize } from './useResize';
import { useBgReplace } from './useBgReplace';
import { usePixelize } from './usePixelize';
import { useAnimation } from './useAnimation';
import { useGacha } from './useGacha';
import { useGeneration } from './useGeneration';
import { useLanguage } from '../i18n/LanguageContext';

export const useAppEngine = () => {
  const { t } = useLanguage();
  const {
    tabs, activeTabId, activeTab, effectiveMode, setMode,
    updateActiveTab, updateTabById, handleAddTab, handleCloseTab, handleSwitchTab, handleRenameTab
  } = useTabs();

  const {
    history, setHistory, currentHistoryEntry, setCurrentHistoryEntry,
    addHistoryEntry, handleRestore, handleClearHistory, handleDeleteHistoryItem, handleRenameHistoryItem, createHistoryEntry
  } = useHistory(setMode, updateActiveTab);

  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [gameContext, setGameContext] = useState<GameContext>({ setting: '', tone: '', visualConstraints: '' });
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState(localStorage.getItem('mythic_drive_folder_id') || '');
  const [driveFolderName, setDriveFolderName] = useState(localStorage.getItem('mythic_drive_folder_name') || '');
  
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [useProModel, setUseProModel] = useState(false);
  const [isRightMinimized, setIsRightMinimized] = useState(() => localStorage.getItem('mythic_right_minimized') === 'true');
  
  const [showInspiration, setShowInspiration] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animFrameIndex, setAnimFrameIndex] = useState(0);
  
  const [batchSize, setBatchSize] = useState(1);

  useEffect(() => {
    localStorage.setItem('mythic_right_minimized', String(isRightMinimized));
  }, [isRightMinimized]);

  const setTabProp = <K extends keyof WorkspaceTab>(key: K, val: any) => updateActiveTab({ [key]: val });
  const setTabPropFunc = <K extends keyof WorkspaceTab>(key: K, val: any) => updateActiveTab((prev) => ({ [key]: typeof val === 'function' ? val(prev[key]) : val }));

  const prompt = activeTab.prompt; const setPrompt = (v: any) => setTabPropFunc('prompt', v);
  const generatedImage = activeTab.generatedImage; const setGeneratedImage = (v: string | null) => setTabProp('generatedImage', v);
  const sessionImages = activeTab.sessionImages; const setSessionImages = (v: any) => setTabPropFunc('sessionImages', v);
  const referenceAssets = activeTab.referenceAssets; const setReferenceAssets = (v: any) => setTabPropFunc('referenceAssets', v);
  const selectedStyleId = activeTab.selectedStyleId; const setSelectedStyleId = (v: string) => setTabProp('selectedStyleId', v);
  const bgConfig = activeTab.bgConfig; const setBgConfig = (v: any) => setTabPropFunc('bgConfig', v);
  const selectedAspectRatio = activeTab.selectedAspectRatio; const setSelectedAspectRatio = (v: AspectRatio) => setTabProp('selectedAspectRatio', v);
  const selectedSize = activeTab.selectedSize; const setSelectedSize = (v: ImageSize) => setTabProp('selectedSize', v);
  const bgPatternType = activeTab.bgPatternType; const setBgPatternType = (v: BackgroundPatternType) => setTabProp('bgPatternType', v);
  
  const safeZone = activeTab.safeZone; const setSafeZone = (v:SafeZoneConfig)=>setTabProp('safeZone',v);
  const characterTool = activeTab.characterTool; const setCharacterTool = (v:any)=>setTabPropFunc('characterTool',v);
  const clothesParams = activeTab.clothesParams; const setClothesParams = (v:ClothesParams)=>setTabProp('clothesParams',v);

  const isEditMode = activeTab.isEditMode; const setIsEditMode = (v:boolean)=>setTabProp('isEditMode',v);
  const editRegion = activeTab.editRegion; const setEditRegion = (v:any)=>setTabProp('editRegion',v);
  const customRes = activeTab.customRes; const setCustomRes = (v:any)=>setTabPropFunc('customRes',v);
  const useCustomResBox = activeTab.useCustomResBox; const setUseCustomResBox = (v:boolean)=>setTabProp('useCustomResBox',v);
  const customResBox = activeTab.customResBox; const setCustomResBox = (v:any)=>setTabProp('customResBox',v);
  const lastPrompt = activeTab.lastPrompt; const setLastPrompt = (v:string|null)=>setTabProp('lastPrompt',v);
  
  const selectedPixelStyle = activeTab.selectedPixelStyle; const setSelectedPixelStyle = (v:PixelStyle) => setTabProp('selectedPixelStyle', v);

  const selectedTemplateId = activeTab.selectedTemplateId; const setSelectedTemplateId = (v:string) => setTabProp('selectedTemplateId', v);
  const templateImage = activeTab.templateImage; const setTemplateImage = (v:string|null) => setTabProp('templateImage', v);

  // FIX: Fixed potential infinite recursion by correctly using setTabProp in setter functions
  const uiReimagineChangeBg = activeTab.uiReimagineChangeBg; const setUiReimagineChangeBg = (v:boolean) => setTabProp('uiReimagineChangeBg', v);
  const uiThemeMood = activeTab.uiThemeMood; const setUiThemeMood = (v:string) => setTabProp('uiThemeMood', v);
  const uiElements = activeTab.uiElements; const setUiElements = (v:string[]) => setTabProp('uiElements', v);
  const uiMoodEnabled = activeTab.uiMoodEnabled; const setUiMoodEnabled = (v:boolean) => setTabProp('uiMoodEnabled', v);
  const uiElementsEnabled = activeTab.uiElementsEnabled; const setUiElementsEnabled = (v:boolean) => setTabProp('uiElementsEnabled', v);
  const uiColorsEnabled = activeTab.uiColorsEnabled; const setUiColorsEnabled = (v:boolean) => setTabProp('uiColorsEnabled', v);

  const resizeLogic = useResize(activeTab, updateActiveTab, setGeneratedImage);
  const animLogic = useAnimation(activeTab, updateActiveTab, setGeneratedImage);
  const gachaLogic = useGacha(activeTab, updateActiveTab);
  
  const bgReplaceLogic = useBgReplace(activeTab, updateActiveTab, setGeneratedImage, (p, conf) => {
      updateActiveTab({ prompt: p, bgConfig: conf });
  });

  const pixelizeLogic = usePixelize(activeTab, updateActiveTab, setGeneratedImage, (style) => {
      setSelectedPixelStyle(style);
  });

  useEffect(() => {
      if (activeTab.mode === 'bg-replace' && activeTab.selectedBgReplaceId) {
          bgReplaceLogic.updateSelectedItem({ 
              prompt: activeTab.prompt, 
              bgConfig: activeTab.bgConfig 
          });
      }
  }, [activeTab.prompt, activeTab.bgConfig, activeTab.mode, activeTab.selectedBgReplaceId]);

  useEffect(() => {
      if (activeTab.mode === 'pixelize' && activeTab.selectedPixelizeId) {
          pixelizeLogic.updateSelectedItem({
              pixelStyle: activeTab.selectedPixelStyle
          });
      }
  }, [activeTab.selectedPixelStyle, activeTab.mode, activeTab.selectedPixelizeId]);

  const logConsole = (msg: string) => setConsoleLogs(p => [msg, ...p]);
  const getTargetDimensions = (): PixelDimensions => {
     if (selectedAspectRatio === 'custom') return customRes;
     const dimMap: Record<string, [number, number]> = { "1:1":[1024,1024], "3:4":[768,1024], "4:3":[1024,768], "9:16":[576,1024], "16:9":[1024,576], "21:9":[1024,440] };
     const d = dimMap[selectedAspectRatio] || [1024,1024];
     return { width: d[0], height: d[1] };
  };

  const generation = useGeneration(
    activeTab, apiKeyReady, useProModel, gameContext, batchSize,
    setGeneratedImage, setSessionImages, addHistoryEntry, 
    resizeLogic.setResizeQueue, bgReplaceLogic.setBgReplaceQueue, pixelizeLogic.setPixelizeQueue,
    gachaLogic.setGachaAssets,
    logConsole, getTargetDimensions,
    updateTabById
  );

  const handleGenerateAllResize = async () => {
    const pending = activeTab.resizeQueue.filter((i: any) => i.status === 'pending');
    for (const item of pending) {
        resizeLogic.onSelectResizeItem(item.id);
        await new Promise(r => setTimeout(r, 50));
        await generation.handleGenerate();
    }
  };

  const handleGenerateAllBgReplace = async () => {
     const pending = activeTab.bgReplaceQueue.filter(i => i.status === 'pending');
     for (const item of pending) {
         bgReplaceLogic.onSelectBgReplaceItem(item.id);
         await new Promise(r => setTimeout(r, 50));
         await generation.handleGenerate();
     }
  };

  const handleGenerateAllPixelize = async () => {
     const pending = activeTab.pixelizeQueue.filter(i => i.status === 'pending');
     for (const item of pending) {
         pixelizeLogic.onSelectPixelizeItem(item.id);
         await new Promise(r => setTimeout(r, 50));
         await generation.handleGenerate();
     }
  };

  const handleGenerateEntireSet = async () => {
    // FIX: Respect 'locked' property to avoid regenerating finalized assets
    const pending = activeTab.gachaAssets.filter(a => a.status !== 'processing' && !a.locked);
    for (const asset of pending) {
      gachaLogic.setSelectedGachaAssetId(asset.id);
      await new Promise(r => setTimeout(r, 50));
      await generation.handleGenerate(false, asset.id);
    }
  };

  // FIX: Implemented handleExportAllResize to fix "Cannot find name" error on line 451
  const handleExportAllResize = async () => {
    await exportResizeBatch(activeTab.resizeQueue);
  };

  const handleConnect = async () => {
     await requestApiKey();
     const hasKey = await checkApiKey();
     setApiKeyReady(hasKey);
  };

  const handleRefreshKey = async () => {
     const hasKey = await checkApiKey();
     setApiKeyReady(hasKey);
  };

  const handleSaveToDrive = async () => {
     if (!generatedImage) return;
     try {
        const name = `Mythic_${activeTab.mode}_${Date.now()}`;
        const id = await uploadImageToDrive(generatedImage, name, driveFolderId || undefined);
        alert(`Saved to Drive! File ID: ${id}`);
     } catch(e: any) {
        alert(`Failed to save to Drive: ${e.message}`);
     }
  };

  const handleAssetSelect = (url: string) => {
     if (activeTab.mode === 'resize') {
        resizeLogic.onSelectResizeItem(url); 
        setGeneratedImage(url);
     } else {
        setGeneratedImage(url);
     }
  };

  const handleApplyCrop = (croppedUrl: string) => {
     if (activeTab.mode === 'resize') {
        resizeLogic.setResizeOriginalImage(croppedUrl);
     }
     setGeneratedImage(croppedUrl);
     setShowCropModal(false);
  };

  const handleMatchReferenceSize = (asset: ReferenceAsset) => {
     const img = new Image();
     img.onload = () => {
        setCustomRes({ width: img.width, height: img.height });
        setSelectedAspectRatio('custom');
     };
     img.src = asset.url;
  };

  const handleAnalyzeStyle = async () => {
     const ref = referenceAssets[0];
     if (!ref) return;
     setIsAnalyzing(true);
     try {
        const analysis = await analyzeImageStyle(ref.url);
        setPrompt(p => p + (p ? "\n" : "") + analysis.promptSnippet);
        logConsole(`Style Analyzed: ${analysis.description}`);
     } catch(e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const handleRefinePrompt = async () => {
     if (!prompt) return;
     setLastPrompt(prompt);
     setIsSuggesting(true);
     try {
        const refined = await refinePrompt(prompt);
        setPrompt(refined);
     } catch(e) { console.error(e); } finally { setIsSuggesting(false); }
  };

  const handleSuggestTraits = async () => {
     if (!activeTab.characterName) {
        alert("Please enter a character name first.");
        return;
     }
     setIsSuggesting(true);
     try {
        const suggested = await generateCharacterTraits(
            activeTab.characterName,
            activeTab.characterSubtitle,
            activeTab.characterGender,
            gameContext
        );
        gachaLogic.setCharacterTraits(suggested);
        logConsole(`Suggested traits for ${activeTab.characterName}`);
     } catch (e) {
        console.error(e);
     } finally {
        setIsSuggesting(false);
     }
  };

  const handleSuggestConcept = async () => {
     setIsSuggesting(true);
     try {
        const concept = await generateCharacterConcept(gameContext);
        gachaLogic.setCharacterName(concept.name);
        gachaLogic.setCharacterSubtitle(concept.subtitle);
        gachaLogic.setCharacterGender(concept.gender);
        gachaLogic.setCharacterTraits(concept.traits);
        logConsole(`Suggested new concept: ${concept.name}`);
     } catch (e) {
        console.error(e);
     } finally {
        setIsSuggesting(false);
     }
  };

  const handleUndoPrompt = () => {
     if (lastPrompt) {
        setPrompt(lastPrompt);
        setLastPrompt(null);
     }
  };

  useEffect(() => {
     checkApiKey().then(setApiKeyReady);
     setDriveConnected(getDriveConnectionStatus());
  }, []);

  const handleClearSession = () => {
    const tabId = activeTabId;
    const count = activeTab.sessionImages.length;
    console.log(`[QA TEST] handleClearSession executing for tab: ${tabId}, Project: "${activeTab.name}", variations removed: ${count}`);
    logConsole(`[DEBUG] Clearing All Variations for Project: "${activeTab.name}". Count: ${count}`);
    
    updateTabById(tabId, (prev: WorkspaceTab) => {
        return {
          ...prev,
          sessionImages: [],
          generatedImage: null,
          resizeOriginalImage: prev.mode === 'resize' ? null : prev.resizeOriginalImage
        };
    });
  };

  // Programmatic QA Hook
  useEffect(() => {
    (window as any).mythic_debug_clear = () => {
        console.log("[QA TEST] Programmatic clear trigger called via window.mythic_debug_clear");
        handleClearSession();
    };
  }, [activeTabId, activeTab]);

  return {
    mode: effectiveMode,
    setMode,
    tabs, activeTabId, activeTab,
    handleAddTab, handleCloseTab, handleSwitchTab, handleRenameTab,
    
    history, showHistory, setShowHistory, currentHistoryEntry,
    handleRestore, handleClearHistory, handleDeleteHistoryItem, handleRenameHistoryItem,
    
    apiKeyReady, handleConnect, handleRefreshKey,
    gameContext, setGameContext,
    driveConnected, driveFolderId, setDriveFolderId, driveFolderName, setDriveFolderName, handleSaveToDrive,
    
    showExport, setShowExport, showConsole, setShowConsole, consoleLogs,
    showAssetPicker, setShowAssetPicker, handleAssetSelect,
    showFolderPicker, setShowFolderPicker, 
    handleFolderSelect: (id: string, name: string) => { setDriveFolderId(id); setDriveFolderName(name); },
    showCropModal, setShowCropModal, handleApplyCrop,
    
    prompt, setPrompt,
    generatedImage, setGeneratedImage,
    sessionImages, 
    referenceAssets, setReferenceAssets,
    selectedStyleId, setSelectedStyleId,
    selectedSize, setSelectedSize,
    selectedAspectRatio, setSelectedAspectRatio,
    bgConfig, setBgConfig, bgPatternType, setBgPatternType,
    safeZone, setSafeZone,
    characterTool, setCharacterTool,
    clothesParams, setClothesParams,
    
    animConfig: animLogic.animConfig,
    selectedFrameId: animLogic.selectedFrameId,
    setSelectedFrameId: animLogic.setSelectedFrameId,
    handleAddFrame: animLogic.handleAddFrame,
    handleUpdateFramePrompt: animLogic.handleUpdateFramePrompt,
    handleDeleteFrame: animLogic.handleDeleteFrame,
    handleDuplicateFrame: animLogic.handleDuplicateFrame,
    handleClearFrames: animLogic.handleClearFrames,
    handleFrameImageUpload: animLogic.handleFrameImageUpload,
    
    resizeQueue: resizeLogic.resizeQueue,
    selectedResizeId: resizeLogic.selectedResizeId,
    resizeOriginalImage: resizeLogic.resizeOriginalImage,
    resizeZoom: resizeLogic.resizeZoom,
    resizePan: resizeLogic.resizePan,
    setResizeZoom: resizeLogic.setResizeZoom,
    setResizePan: resizeLogic.setResizePan,
    onAddResizeFiles: resizeLogic.onAddResizeFiles,
    onSelectResizeItem: resizeLogic.onSelectResizeItem,
    onRemoveResizeItem: resizeLogic.onRemoveResizeItem,
    handleClearResizeResult: resizeLogic.handleClearResizeResult,
    handleResizeRename: resizeLogic.handleResizeRename,
    
    bgReplaceQueue: bgReplaceLogic.bgReplaceQueue,
    selectedBgReplaceId: bgReplaceLogic.selectedBgReplaceId,
    onAddBgReplaceFiles: bgReplaceLogic.onAddBgReplaceFiles,
    onSelectBgReplaceItem: bgReplaceLogic.onSelectBgReplaceItem,
    onRemoveBgReplaceItem: bgReplaceLogic.onRemoveBgReplaceItem,
    handleClearBgReplaceResult: bgReplaceLogic.handleClearBgReplaceResult,
    handleBgReplaceRename: bgReplaceLogic.handleBgReplaceRename,
    
    pixelizeQueue: pixelizeLogic.pixelizeQueue,
    selectedPixelizeId: pixelizeLogic.selectedPixelizeId,
    selectedPixelStyle, setSelectedPixelStyle,
    onAddPixelizeFiles: pixelizeLogic.onAddPixelizeFiles,
    onSelectPixelizeItem: pixelizeLogic.onSelectPixelizeItem,
    onRemovePixelizeItem: pixelizeLogic.onRemovePixelizeItem,
    handleClearPixelizeResult: pixelizeLogic.handleClearPixelizeResult,
    handlePixelizeRename: pixelizeLogic.handlePixelizeRename,

    gachaAssets: gachaLogic.gachaAssets,
    characterTraits: gachaLogic.characterTraits,
    characterName: gachaLogic.characterName,
    characterSubtitle: gachaLogic.characterSubtitle,
    characterRace: gachaLogic.characterRace,
    characterRarity: gachaLogic.characterRarity,
    characterGender: gachaLogic.characterGender,
    // Fix: Export chibiProportions and onUpdateProportions to use in GachaCanvas
    chibiProportions: gachaLogic.chibiProportions,
    onUpdateProportions: gachaLogic.setChibiProportions,
    selectedGachaAssetId: gachaLogic.selectedGachaAssetId,
    continuityFlags: gachaLogic.continuityFlags,
    gachaShowRefs: gachaLogic.gachaShowRefs,
    setCharacterTraits: gachaLogic.setCharacterTraits,
    setCharacterName: gachaLogic.setCharacterName,
    setCharacterSubtitle: gachaLogic.setCharacterSubtitle,
    setCharacterRace: gachaLogic.setCharacterRace,
    setCharacterRarity: gachaLogic.setCharacterRarity,
    setCharacterGender: gachaLogic.setCharacterGender,
    addGachaAsset: gachaLogic.addGachaAsset,
    addGachaAssetFromPreset: gachaLogic.addGachaAssetFromPreset,
    updateGachaAsset: gachaLogic.updateGachaAsset,
    removeGachaAsset: gachaLogic.removeGachaAsset,
    setSelectedGachaAssetId: gachaLogic.setSelectedGachaAssetId,
    setContinuityFlags: gachaLogic.setContinuityFlags,
    setGachaShowRefs: gachaLogic.setGachaShowRefs,
    handleGenerateEntireSet,
    handleGenerateAllResize,
    handleSuggestTraits,
    handleSuggestConcept,
    
    isEditMode, setIsEditMode,
    editRegion, setEditRegion,
    customRes, setCustomRes,
    useCustomResBox, setUseCustomResBox,
    customResBox, setCustomResBox,
    lastPrompt,
    
    isGenerating: generation.isGenerating,
    statusMessage: generation.statusMessage,
    handleGenerate: generation.handleGenerate,
    handleRegenerateBackground: generation.handleRegenerateBackground,
    handleEnhance: generation.handleEnhance,
    handleExtractOutfit: generation.handleExtractOutfit,
    handleGenerateFrame: generation.handleGenerate,
    handleGenerateAnimation: generation.handleGenerate,
    handleCancel: generation.handleCancel,
    
    handleGenerateAll: generation.handleGenerate, 
    handleGenerateAllBgReplace,
    handleGenerateAllPixelize,
    handleExportAllResize,
    
    useProModel, setUseProModel,
    isRightMinimized, setIsRightMinimized,
    batchSize, setBatchSize,
    
    showInspiration, setShowInspiration,
    isAnalyzing, isSuggesting,
    handleMatchReferenceSize, handleAnalyzeStyle, handleRefinePrompt, handleUndoPrompt,
    
    showOnionSkin, setShowOnionSkin,
    isPlayingAnimation, setIsPlayingAnimation,
    animFrameIndex,
    
    handleImageUpload: (file: File) => {
        if (!(file instanceof Blob)) return;
        const reader = new FileReader();
        reader.onload = () => {
           const result = reader.result as string;
           logConsole(`[DEBUG] Image uploaded to "${activeTab.name}". Adding to project gallery.`);
           updateTabById(activeTabId, prev => {
              const nextSession = [result, ...prev.sessionImages];
              return {
                 generatedImage: result,
                 sessionImages: nextSession,
                 resizeOriginalImage: prev.mode === 'resize' ? result : prev.resizeOriginalImage
              };
           });
        };
        reader.readAsDataURL(file);
    },
    handleClearImage: () => setGeneratedImage(null),
    handleClearSession,
    handleRemoveSessionImage: (url: string) => {
       logConsole(`[DEBUG] Removing specific variation from Project: "${activeTab.name}".`);
       updateTabById(activeTabId, prev => {
          const newList = prev.sessionImages.filter(u => u !== url);
          const isCurrent = prev.generatedImage === url;
          const nextImage = isCurrent 
             ? (newList.length > 0 ? newList[0] : null)
             : prev.generatedImage;
          
          const nextResizeOrig = prev.resizeOriginalImage === url ? nextImage : prev.resizeOriginalImage;
          
          return {
             sessionImages: newList,
             generatedImage: nextImage,
             resizeOriginalImage: nextResizeOrig
          };
       });
    },
    handleCharacterLookClick: (x: number, y: number) => setCharacterTool((p:any) => ({...p, lookTarget: {x,y}, isSettingLookTarget: false})),
    handleRegeneratePose: () => {}, 
    handleCreateSpinAnimation: () => {}, 
    handleMagicCrop: () => {}, 
    
    getTargetDimensions,

    selectedTemplateId, setSelectedTemplateId,
    templateImage, setTemplateImage,
    handleTemplateSelect: (id: string) => setSelectedTemplateId(id),

    uiReimagineChangeBg, setUiReimagineChangeBg,
    uiThemeMood, setUiThemeMood,
    uiElements, setUiElements,
    uiMoodEnabled, setUiMoodEnabled,
    uiElementsEnabled, setUiElementsEnabled,
    uiColorsEnabled, setUiColorsEnabled
  };
};
