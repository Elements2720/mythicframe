
import React, { useState, useEffect, useRef } from 'react';
import { 
  checkApiKey, requestApiKey, generateIllustration, analyzeImageStyle,
  editImage, generateCardSuggestions, refinePrompt
} from '../services/geminiService';
import { parseCSV, mapCsvRowToCard } from '../services/csvService';
import { exportCompositeCard, exportResizeBatch } from '../services/exportService';
import { uploadImageToDrive, getDriveConnectionStatus } from '../services/googleDriveService';
import { cropImage, removeBackground } from '../utils/imageUtils';
import { buildBackgroundRegenPrompt } from '../services/promptTemplates';
import { 
  GenerationModel, ImageSize, AspectRatio, CardLayout, LayoutElement, 
  PixelDimensions, ReferenceAsset, GameContext,
  FrameElement, BackgroundPatternType, CsvCardData, SafeZoneConfig, ResizeItem,
  WorkspaceTab, ClothesParams, BgReplaceItem, BackgroundConfig, PixelStyle, PixelizeItem
} from '../types';
import { ART_STYLES, DEFAULT_CARD_LAYOUT, CARD_TEMPLATES, DEFAULT_BACKGROUND_CONFIG } from '../constants';
import { useTabs } from './useTabs';
import { useHistory } from './useHistory';
import { useResize } from './useResize';
import { useBgReplace } from './useBgReplace';
import { usePixelize } from './usePixelize';
import { useAnimation } from './useAnimation';
import { useGeneration } from './useGeneration';
import { useLanguage } from '../i18n/LanguageContext';

export const useAppEngine = () => {
  const { t } = useLanguage();
  // --- SUB-HOOKS ---
  const {
    tabs, activeTabId, activeTab, effectiveMode, setMode,
    updateActiveTab, handleAddTab, handleCloseTab, handleSwitchTab, handleRenameTab
  } = useTabs();

  const {
    history, setHistory, currentHistoryEntry, setCurrentHistoryEntry,
    addHistoryEntry, handleRestore, handleClearHistory, handleDeleteHistoryItem, handleRenameHistoryItem, createHistoryEntry
  } = useHistory(setMode, updateActiveTab);

  // --- GLOBAL APP STATE ---
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
  
  const [showInspiration, setShowInspiration] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animFrameIndex, setAnimFrameIndex] = useState(0);
  const [showOverlays, setShowOverlays] = useState(false);
  
  const [csvData, setCsvData] = useState<CsvCardData[]>([]);
  const [csvIndex, setCsvIndex] = useState(0);
  const [batchSize, setBatchSize] = useState(1);

  // --- STATE PROXIES ---
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
  const frameElements = activeTab.frameElements; const setFrameElements = (v: FrameElement[]) => setTabProp('frameElements', v);
  const bgPatternType = activeTab.bgPatternType; const setBgPatternType = (v: BackgroundPatternType) => setTabProp('bgPatternType', v);
  
  const cardName = activeTab.cardName; const setCardName = (v:string)=>setTabProp('cardName',v);
  const cardMana = activeTab.cardMana; const setCardMana = (v:string)=>setTabProp('cardMana',v);
  const cardEffects = activeTab.cardEffects; const setCardEffects = (v:string)=>setTabProp('cardEffects',v);
  const cardType = activeTab.cardType; const setCardType = (v:string)=>setTabProp('cardType',v);
  const cardLayout = activeTab.cardLayout; const setCardLayout = (v:any)=>setTabPropFunc('cardLayout',v);
  const templateImage = activeTab.templateImage; const setTemplateImage = (v:string|null)=>setTabProp('templateImage',v);
  const selectedTemplateId = activeTab.selectedTemplateId; const setSelectedTemplateId = (v:string)=>setTabProp('selectedTemplateId',v);
  const selectedLayoutElement = activeTab.selectedLayoutElement; const setSelectedLayoutElement = (v:any)=>setTabProp('selectedLayoutElement',v);
  
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

  const fullCardRef = useRef<HTMLDivElement>(null);

  // --- LOGIC HOOKS ---
  const resizeLogic = useResize(activeTab, updateActiveTab, setGeneratedImage);
  const animLogic = useAnimation(activeTab, updateActiveTab, setGeneratedImage);
  
  // New Hook for BgReplace
  const bgReplaceLogic = useBgReplace(activeTab, updateActiveTab, setGeneratedImage, (p, conf) => {
      // Sync callback: update global state when item selected
      updateActiveTab({ prompt: p, bgConfig: conf });
  });

  // Hook for Pixelize
  const pixelizeLogic = usePixelize(activeTab, updateActiveTab, setGeneratedImage, (style) => {
      setSelectedPixelStyle(style);
  });

  // Sync effect: When prompt or bgConfig changes in bg-replace mode, update the selected item
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

  // --- HELPERS ---
  const logConsole = (msg: string) => setConsoleLogs(p => [msg, ...p]);
  const getTargetDimensions = (): PixelDimensions => {
     if (selectedAspectRatio === 'custom') return customRes;
     const dimMap: Record<string, [number, number]> = { "1:1":[1024,1024], "3:4":[768,1024], "4:3":[1024,768], "9:16":[576,1024], "16:9":[1024,576], "21:9":[1024,440] };
     const d = dimMap[selectedAspectRatio] || [1024,1024];
     return { width: d[0], height: d[1] };
  };

  // --- GENERATION HANDLER ---
  const generation = useGeneration(
    activeTab, apiKeyReady, useProModel, gameContext, batchSize,
    setGeneratedImage, setSessionImages, addHistoryEntry, 
    resizeLogic.setResizeQueue, bgReplaceLogic.setBgReplaceQueue, pixelizeLogic.setPixelizeQueue,
    logConsole, getTargetDimensions
  );

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

  // --- EFFECTS ---
  useEffect(() => { checkApiKey().then(setApiKeyReady); }, []);
  
  useEffect(() => {
    if (!generatedImage) {
        setCurrentHistoryEntry(null);
        return;
    }
    const match = history.find(h => h.thumbnailUrl === generatedImage);
    setCurrentHistoryEntry(match || null);
  }, [generatedImage, history]);

  useEffect(() => {
    const checkDrive = () => { setDriveConnected(getDriveConnectionStatus()); };
    const interval = setInterval(checkDrive, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: number;
    if (isPlayingAnimation && animLogic.animConfig.frames.length > 0) {
       interval = window.setInterval(() => { setAnimFrameIndex(prev => (prev + 1) % animLogic.animConfig.frames.length); }, 1000 / animLogic.animConfig.fps);
    } else { setAnimFrameIndex(0); }
    return () => clearInterval(interval);
  }, [isPlayingAnimation, animLogic.animConfig.fps, animLogic.animConfig.frames.length]);

  useEffect(() => {
     if (activeTab.mode === 'animation') {
        if (isPlayingAnimation) { setGeneratedImage(animLogic.animConfig.frames[animFrameIndex]?.imageUrl || null); } 
        else { const active = animLogic.animConfig.frames.find(f => f.id === animLogic.selectedFrameId); setGeneratedImage(active?.imageUrl || null); }
     }
  }, [activeTab.mode, isPlayingAnimation, animFrameIndex, animLogic.selectedFrameId, animLogic.animConfig.frames]);

  // --- FEATURE HANDLERS ---
  const handleConnect = async () => { try { await requestApiKey(); setApiKeyReady(await checkApiKey()); } catch (e) { console.error(e); alert("Failed to connect API Key"); } };
  const handleRefreshKey = async () => { setApiKeyReady(await checkApiKey()); };

  const handleRefinePrompt = async () => {
    if (!prompt) return;
    generation.setStatusMessage('Refining prompt...');
    try {
       const refined = await refinePrompt(prompt);
       setLastPrompt(prompt);
       setPrompt(refined);
    } catch(e) { console.error(e); } finally { generation.setStatusMessage(''); }
  };

  const handleUndoPrompt = () => { if(lastPrompt) { setPrompt(lastPrompt); setLastPrompt(null); } };

  // ... Animation Handlers ...
  const handleGenerateFrame = async (id: string, promptOverride?: string) => {
    const frameIndex = animLogic.animConfig.frames.findIndex(f => f.id === id);
    const frame = animLogic.animConfig.frames[frameIndex];
    if (!frame) return;
    const promptToUse = promptOverride || frame.prompt;
    if (!promptToUse) return;
    
    generation.setIsGenerating(true);
    generation.setStatusMessage(`Generating Frame ${frameIndex + 1}...`);
    try {
        const styleSnippet = selectedStyleId !== 'none' ? ART_STYLES.find(s => s.id === selectedStyleId)?.promptSnippet || '' : '';
        const model = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_2_5;
        const effectiveRefs = [...referenceAssets];
        if (frameIndex > 0) {
            const prevFrame = animLogic.animConfig.frames[frameIndex - 1];
            if (prevFrame.imageUrl) {
                effectiveRefs.push({
                    id: `prev_frame_ref_${prevFrame.id}`,
                    url: prevFrame.imageUrl,
                    roleNote: `PREVIOUS FRAME (Frame ${frameIndex}). You are generating Frame ${frameIndex + 1}. Continue the movement/action logically from this reference. Maintain exact character consistency.`
                });
            }
        }
        let { image } = await generateIllustration(
           promptToUse, model, selectedSize, selectedAspectRatio, effectiveRefs, bgConfig, gameContext, generation.abortControllerRef.current?.signal!, styleSnippet,
           animLogic.animConfig.type === 'background' ? 'background' : 'illustration', [], bgPatternType, undefined, clothesParams
        );
        if (bgConfig.mode === 'transparent') {
           image = await removeBackground(image);
        }
        animLogic.setAnimConfig((prev:any) => ({ ...prev, frames: prev.frames.map((f:any) => f.id === id ? { ...f, imageUrl: image } : f) }));
        if (animLogic.selectedFrameId === id) setGeneratedImage(image);
        await addHistoryEntry({
            mode: 'animation',
            thumbnailUrl: image,
            fullPrompt: promptToUse,
            userPrompt: `Frame ${frameIndex + 1}: ${promptToUse}`,
            gameContext,
            styleId: selectedStyleId,
            bgConfig,
            referenceAssets,
            size: selectedSize,
            aspectRatio: selectedAspectRatio,
            animationData: animLogic.animConfig
        });
    } catch(e: any) { 
        if(e.name !== 'AbortError') { console.error(e); alert(`Generation failed: ${e.message}`); } 
    } 
    finally { generation.setIsGenerating(false); generation.setStatusMessage(''); }
  };

  const handleGenerateAnimation = async (promptOverride?: string) => {
     generation.setIsGenerating(true);
     if (promptOverride) { 
         animLogic.setAnimConfig((prev:any) => ({ ...prev, frames: prev.frames.map((f:any) => ({ ...f, prompt: promptOverride })) })); 
     }
     const total = animLogic.animConfig.frames.length;
     let lastGeneratedImage: string | null = null; 
     try {
        for (let i = 0; i < total; i++) {
           if (generation.abortControllerRef.current?.signal.aborted) break;
           const frame = animLogic.animConfig.frames[i];
           const promptToUse = promptOverride || frame.prompt;
           if (promptToUse) {
               generation.setStatusMessage(`Generating Frame ${i+1}/${total}...`);
               const styleSnippet = selectedStyleId !== 'none' ? ART_STYLES.find(s => s.id === selectedStyleId)?.promptSnippet || '' : '';
               const model = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_2_5;
               const effectiveRefs = [...referenceAssets];
               let prevRefImage = lastGeneratedImage;
               if (!prevRefImage && i > 0) {
                   prevRefImage = animLogic.animConfig.frames[i-1].imageUrl;
               }
               if (prevRefImage) {
                   effectiveRefs.push({
                       id: `chain_ref_${i}`,
                       url: prevRefImage,
                       roleNote: `PREVIOUS FRAME (Frame ${i}). You are generating Frame ${i + 1}. Continue the movement/action logically from this reference. Maintain exact character consistency.`
                   });
               }
               let { image } = await generateIllustration(
                  promptToUse, model, selectedSize, selectedAspectRatio, effectiveRefs, bgConfig, gameContext, generation.abortControllerRef.current?.signal!, styleSnippet,
                  animLogic.animConfig.type === 'background' ? 'background' : 'illustration', [], bgPatternType, undefined, clothesParams
               );
               if (bgConfig.mode === 'transparent') image = await removeBackground(image);
               animLogic.setAnimConfig((prev:any) => ({ ...prev, frames: prev.frames.map((f:any) => f.id === frame.id ? { ...f, imageUrl: image } : f) }));
               if (animLogic.selectedFrameId === frame.id) setGeneratedImage(image);
               lastGeneratedImage = image;
               await addHistoryEntry({
                  mode: 'animation',
                  thumbnailUrl: image,
                  fullPrompt: promptToUse,
                  userPrompt: `Seq ${i+1}: ${promptToUse}`,
                  gameContext,
                  styleId: selectedStyleId,
                  bgConfig,
                  referenceAssets,
                  size: selectedSize,
                  aspectRatio: selectedAspectRatio,
                  animationData: animLogic.animConfig
               });
           }
        }
     } catch(e: any) { 
         if(e.name !== 'AbortError') { console.error(e); alert(`Animation sequence stopped: ${e.message}`); }
     } finally { generation.setIsGenerating(false); generation.setStatusMessage(''); }
  };

  const handleCreateSpinAnimation = (subject: string) => {
      const angles = ["front view", "front-right 3/4 view", "right side profile view", "back-right view", "back view", "back-left view", "left side profile view", "front-left 3/4 view"];
      const newFrames = angles.map((angle, idx) => ({ id: Date.now().toString() + idx, prompt: `${subject}, ${angle}`, imageUrl: null }));
      animLogic.setAnimConfig({ type: 'illustration', fps: 8, frames: newFrames });
      animLogic.setSelectedFrameId(newFrames[0].id);
  };

  const handleCharacterLookClick = (x: number, y: number) => { 
      if (!characterTool.enabled || !characterTool.isSettingLookTarget) return; 
      setCharacterTool(prev => ({ ...prev, lookTarget: { x, y }, isSettingLookTarget: false })); 
  };

  const handleRegeneratePose = async () => {
      if (!generatedImage || !characterTool.enabled || !apiKeyReady) return;
      generation.setIsGenerating(true); generation.setStatusMessage("Adjusting Pose...");
      try {
          let directionDesc = "looking straight at the viewer";
          let headInstruction = "Face the camera directly.";
          
          if (characterTool.lookTarget) {
              const { x, y } = characterTool.lookTarget;
              const isUp = y < 40; const isDown = y > 60; const isLeft = x < 40; const isRight = x > 60;
              const vDir = isUp ? "UP" : isDown ? "DOWN" : ""; const hDir = isLeft ? "LEFT" : isRight ? "RIGHT" : "";
              if (vDir || hDir) {
                  directionDesc = `looking ${vDir} ${hDir}`.trim();
                  const moves = [];
                  if (isUp) moves.push("TILT CHIN UP"); if (isDown) moves.push("TILT CHIN DOWN");
                  if (isLeft) moves.push("TURN FACE LEFT"); if (isRight) moves.push("TURN FACE RIGHT");
                  headInstruction = `The character MUST physically ${moves.join(" and ")} to align with the target.`;
              }
          }
          const posePrompt = `Image Editing Task: Adjust Head Orientation.
TARGET: The character should be ${directionDesc}.
INSTRUCTION: ${headInstruction}
IMPORTANT RULES:
1. ROTATE THE HEAD: Do not just move the pupils. The entire head/face must angle towards the target.
2. EYES OPEN: Ensure eyes remain OPEN and visible. Do NOT close eyes when looking down.
3. CONSISTENCY: Keep the body pose, outfit, and background exactly unchanged. Only animate the neck and head.
${characterTool.poseDescription ? `ADDITIONAL: ${characterTool.poseDescription}` : ''}`;
          const res = await editImage(generatedImage, posePrompt, undefined, gameContext);
          setGeneratedImage(res);
          setSessionImages(prev => [res, ...prev]);
          await addHistoryEntry({
             mode: 'illustration',
             thumbnailUrl: res,
             fullPrompt: posePrompt,
             userPrompt: 'Pose Adjustment',
             gameContext,
             styleId: selectedStyleId,
             bgConfig,
             referenceAssets,
             size: selectedSize,
             aspectRatio: selectedAspectRatio
          });
      } catch(e: any) { console.error(e); alert(e.message); } finally { generation.setIsGenerating(false); generation.setStatusMessage(""); }
  };

  const handleEnhance = async () => {
      if (!generatedImage || !apiKeyReady) return;
      generation.setIsGenerating(true);
      generation.setStatusMessage(t('enhancing')); // "Enhancing..."
      try {
         const enhancePrompt = "Enhance the visual quality of this image. Increase resolution, sharpness, and texture details. Remove blur and artifacts. Make it look like a high-fidelity game asset. Keep exact composition and subject.";
         const res = await editImage(generatedImage, enhancePrompt, undefined, gameContext);
         setGeneratedImage(res);
         setSessionImages(prev => [res, ...prev]);
         await addHistoryEntry({
            mode: activeTab.mode,
            thumbnailUrl: res,
            fullPrompt: enhancePrompt,
            userPrompt: 'Enhanced Asset',
            gameContext,
            styleId: selectedStyleId,
            bgConfig,
            referenceAssets,
            size: selectedSize,
            aspectRatio: selectedAspectRatio
         });
      } catch(e: any) { console.error(e); alert(e.message); } finally { generation.setIsGenerating(false); generation.setStatusMessage(""); }
  };

  // --- GENERIC HANDLERS ---
  const handleAssetSelect = (url: string) => {
     if (activeTab.mode === 'fullcard') {
         setCardLayout((prev:any) => ({ ...prev, art: { ...prev.art, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0 } }));
         setGeneratedImage(url);
     } else if (activeTab.mode === 'resize') {
         const newItem: ResizeItem = { id: Date.now().toString(), url, name: 'Library Asset', status: 'pending' };
         resizeLogic.setResizeQueue((prev: ResizeItem[]) => [...prev, newItem]);
         updateActiveTab({
            selectedResizeId: newItem.id,
            resizeOriginalImage: newItem.url,
            generatedImage: newItem.url
         });
     } else if (activeTab.mode === 'bg-replace') {
         const newItem: BgReplaceItem = { 
             id: Date.now().toString(), 
             url, 
             name: 'Library Asset', 
             status: 'pending',
             prompt: '',
             bgConfig: { ...DEFAULT_BACKGROUND_CONFIG }
         };
         bgReplaceLogic.setBgReplaceQueue((prev) => [...prev, newItem]);
         updateActiveTab({
            selectedBgReplaceId: newItem.id,
            generatedImage: newItem.url
         });
     } else if (activeTab.mode === 'pixelize') {
         const newItem: PixelizeItem = {
             id: Date.now().toString(),
             url,
             name: 'Library Asset',
             status: 'pending',
             pixelStyle: '16bit'
         };
         pixelizeLogic.setPixelizeQueue((prev) => [...prev, newItem]);
         updateActiveTab({
             selectedPixelizeId: newItem.id,
             generatedImage: newItem.url
         });
     } else {
         setGeneratedImage(url);
     }
  };

  const handleImageUpload = (file: File) => {
     const reader = new FileReader();
     reader.onload = () => {
        const url = reader.result as string;
        setGeneratedImage(url);
        setSessionImages(prev => [url, ...prev]);
     };
     reader.readAsDataURL(file);
  };

  const handleClearImage = () => setGeneratedImage(null);
  
  const handleClearSession = () => {
      setSessionImages([]);
      setGeneratedImage(null);
  };
  
  const handleRemoveSessionImage = (urlToRemove: string) => {
      const newImages = activeTab.sessionImages.filter(url => url !== urlToRemove);
      setSessionImages(newImages);
      if (generatedImage === urlToRemove) {
          setGeneratedImage(newImages.length > 0 ? newImages[0] : null);
      }
  };
  
  const handleAnalyzeStyle = async () => {
     if (referenceAssets.length === 0) return;
     setIsAnalyzing(true);
     try {
        const { description } = await analyzeImageStyle(referenceAssets[0].url);
        setPrompt(prev => prev + (prev ? " " : "") + description);
     } catch(e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const handleMatchReferenceSize = (asset: ReferenceAsset) => {
      const img = new Image();
      img.onload = () => {
         const ratio = img.width / img.height;
         if (Math.abs(ratio - 1) < 0.1) setSelectedAspectRatio('1:1');
         else if (Math.abs(ratio - 1.33) < 0.1) setSelectedAspectRatio('4:3');
         else if (Math.abs(ratio - 0.75) < 0.1) setSelectedAspectRatio('3:4');
         else if (Math.abs(ratio - 1.77) < 0.1) setSelectedAspectRatio('16:9');
         else if (Math.abs(ratio - 0.56) < 0.1) setSelectedAspectRatio('9:16');
         else {
             setSelectedAspectRatio('custom');
             setCustomRes({ width: img.width, height: img.height });
         }
      };
      img.src = asset.url;
  };

  const handleGenerateAll = async () => {
     const pending = activeTab.resizeQueue.filter(i => i.status === 'pending');
     for (const item of pending) {
         resizeLogic.onSelectResizeItem(item.id);
         await generation.handleGenerate();
     }
  };
  const handleExportAllResize = async () => { await exportResizeBatch(activeTab.resizeQueue); };

  const handleCompositeExport = async () => {
      if (fullCardRef.current) {
         await exportCompositeCard(fullCardRef.current, `card_${cardName.replace(/\s/g,'_')}.png`);
      }
  };
  
  const handleSetAsTemplate = () => { if (generatedImage) setTemplateImage(generatedImage); };
  
  const handleUseInLayout = () => {
      if (generatedImage) {
          setMode('fullcard');
          updateActiveTab({ mode: 'fullcard', generatedImage: generatedImage });
          setGeneratedImage(generatedImage);
      }
  };

  const handleSaveCard = () => {
      addHistoryEntry({
          mode: 'fullcard',
          thumbnailUrl: generatedImage || '',
          fullPrompt: '', 
          userPrompt: 'Card Layout',
          gameContext,
          styleId: 'none',
          bgConfig: DEFAULT_BACKGROUND_CONFIG,
          referenceAssets: [],
          size: '1K',
          aspectRatio: '1:1',
          cardData: { name: cardName, mana: cardMana, type: cardType, description: cardEffects, layout: cardLayout }
      });
      alert("Card layout saved to history.");
  };

  const handleCardSuggestions = async () => {
      setIsSuggesting(true);
      try {
          const { names, effects } = await generateCardSuggestions(prompt || "fantasy creature", cardName);
          if (names.length > 0) setCardName(names[0]);
          if (effects.length > 0) setCardEffects(effects[0]);
      } catch(e) { console.error(e); } finally { setIsSuggesting(false); }
  };

  const handleSaveToDrive = async () => {
      if (!generatedImage) return;
      if (!driveConnected) { alert("Please connect Google Drive in Settings first."); return; }
      try {
          await uploadImageToDrive(generatedImage, `mythic_${Date.now()}`, driveFolderId);
          alert("Saved to Drive!");
      } catch(e: any) { alert("Upload failed: " + e.message); }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
         const text = evt.target?.result as string;
         const data = parseCSV(text);
         setCsvData(data);
         if (data.length > 0) applyCsvRow(data[0]);
      };
      reader.readAsText(file);
  };

  const applyCsvRow = (row: CsvCardData) => {
      const mapped = mapCsvRowToCard(row);
      if (mapped.name) setCardName(mapped.name);
      if (mapped.mana) setCardMana(mapped.mana);
      if (mapped.effects) setCardEffects(mapped.effects);
  };

  const onCsvNavigate = (idx: number) => {
      if (idx >= 0 && idx < csvData.length) {
          setCsvIndex(idx);
          applyCsvRow(csvData[idx]);
      }
  };

  const handleRegenerateBackground = async () => {
      if (!generatedImage) return;
      generation.setIsGenerating(true); generation.setStatusMessage("Regenerating Background...");
      try {
         const prompt = buildBackgroundRegenPrompt(gameContext, bgConfig);
         const res = await editImage(generatedImage, prompt, bgConfig, gameContext);
         setGeneratedImage(res);
         setSessionImages(prev => [res, ...prev]);
      } catch(e: any) { console.error(e); alert(e.message); } finally { generation.setIsGenerating(false); generation.setStatusMessage(""); }
  };
  
  const handleMagicCrop = async () => {
      if (!generatedImage) return;
      let cropRect = { x: 0, y: 0, w: 0, h: 0 };
      if (useCustomResBox) {
         cropRect = { x: customResBox.x, y: customResBox.y, w: customResBox.width, h: customResBox.height };
      } else if (safeZone.enabled) {
         cropRect = { x: safeZone.x, y: safeZone.y, w: safeZone.width, h: safeZone.height };
      } else { return; }
      
      const cropped = await cropImage(generatedImage, cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      engine.handleApplyCrop(cropped);
  };

  const updateLayout = (key: keyof CardLayout, field: keyof LayoutElement, value: any) => {
     setCardLayout((prev:any) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const engine = {
    // Basic State
    mode: effectiveMode,
    setMode,
    history, setHistory, currentHistoryEntry,
    
    // UI Flags
    showExport, setShowExport, showConsole, setShowConsole, consoleLogs,
    showAssetPicker, setShowAssetPicker, showCropModal, setShowCropModal,
    showFolderPicker, setShowFolderPicker, showHistory, setShowHistory,
    showInspiration, setShowInspiration, isGenerating: generation.isGenerating, statusMessage: generation.statusMessage,
    
    // State Values (Directly mapped)
    prompt, setPrompt, generatedImage, setGeneratedImage, sessionImages, setSessionImages,
    referenceAssets, setReferenceAssets, selectedStyleId, setSelectedStyleId,
    selectedSize, setSelectedSize, selectedAspectRatio, setSelectedAspectRatio,
    bgConfig, setBgConfig, frameElements, setFrameElements, bgPatternType, setBgPatternType,
    
    // Animation
    animConfig: animLogic.animConfig, setAnimConfig: animLogic.setAnimConfig,
    selectedFrameId: animLogic.selectedFrameId, setSelectedFrameId: animLogic.setSelectedFrameId,
    
    // Resize
    resizeQueue: resizeLogic.resizeQueue, setResizeQueue: resizeLogic.setResizeQueue,
    selectedResizeId: resizeLogic.selectedResizeId, setSelectedResizeId: resizeLogic.onSelectResizeItem,
    resizeOriginalImage: resizeLogic.resizeOriginalImage,
    resizeZoom: resizeLogic.resizeZoom, setResizeZoom: resizeLogic.setResizeZoom,
    resizePan: resizeLogic.resizePan, setResizePan: resizeLogic.setResizePan,

    // Bg Replace
    bgReplaceQueue: bgReplaceLogic.bgReplaceQueue, setBgReplaceQueue: bgReplaceLogic.setBgReplaceQueue,
    selectedBgReplaceId: bgReplaceLogic.selectedBgReplaceId, setSelectedBgReplaceId: bgReplaceLogic.onSelectBgReplaceItem,
    
    // Pixelize
    pixelizeQueue: pixelizeLogic.pixelizeQueue, setPixelizeQueue: pixelizeLogic.setPixelizeQueue,
    selectedPixelizeId: pixelizeLogic.selectedPixelizeId, setSelectedPixelizeId: pixelizeLogic.onSelectPixelizeItem,
    selectedPixelStyle, setSelectedPixelStyle,

    // Card & Tool
    cardName, setCardName, cardMana, setCardMana, cardEffects, setCardEffects, cardType, setCardType,
    cardLayout, setCardLayout, templateImage, setTemplateImage,
    selectedTemplateId, setSelectedTemplateId, selectedLayoutElement, setSelectedLayoutElement,
    safeZone, setSafeZone, characterTool, setCharacterTool,
    clothesParams, setClothesParams,
    isEditMode, setIsEditMode, editRegion, setEditRegion,
    customRes, setCustomRes, useCustomResBox, setUseCustomResBox, customResBox, setCustomResBox,
    lastPrompt,
    
    // Global
    gameContext, setGameContext, apiKeyReady, driveConnected,
    driveFolderId, setDriveFolderId, driveFolderName, setDriveFolderName,
    useProModel, setUseProModel, isAnalyzing, isSuggesting, showOnionSkin, setShowOnionSkin,
    isPlayingAnimation, setIsPlayingAnimation, animFrameIndex, showOverlays, setShowOverlays,
    csvData, setCsvData, csvIndex, setCsvIndex, batchSize, setBatchSize,
    
    // Handlers
    handleAssetSelect, handleFolderSelect: (id:string, name:string) => { setDriveFolderId(id); setDriveFolderName(name); },
    handleApplyCrop: (url:string) => { setGeneratedImage(url); setShowCropModal(false); },
    handleTemplateSelect: (id: string) => { 
        setSelectedTemplateId(id); 
        const tmpl = CARD_TEMPLATES.find(t => t.id === id);
        if(tmpl) { if(tmpl.imageUrl) setTemplateImage(tmpl.imageUrl); setCardLayout(tmpl.defaultLayout); }
    },
    handleRestore, handleConnect, handleRefreshKey, updateLayout,
    
    // Resize Handlers
    onAddResizeFiles: resizeLogic.onAddResizeFiles,
    onSelectResizeItem: resizeLogic.onSelectResizeItem,
    onRemoveResizeItem: resizeLogic.onRemoveResizeItem,
    handleClearResizeResult: resizeLogic.handleClearResizeResult,
    handleResizeRename: resizeLogic.handleResizeRename,
    handleGenerateAll,
    handleExportAllResize,
    
    // Bg Replace Handlers
    onAddBgReplaceFiles: bgReplaceLogic.onAddBgReplaceFiles,
    onSelectBgReplaceItem: bgReplaceLogic.onSelectBgReplaceItem,
    onRemoveBgReplaceItem: bgReplaceLogic.onRemoveBgReplaceItem,
    handleClearBgReplaceResult: bgReplaceLogic.handleClearBgReplaceResult,
    handleBgReplaceRename: bgReplaceLogic.handleBgReplaceRename,
    handleGenerateAllBgReplace,

    // Pixelize Handlers
    onAddPixelizeFiles: pixelizeLogic.onAddPixelizeFiles,
    onSelectPixelizeItem: pixelizeLogic.onSelectPixelizeItem,
    onRemovePixelizeItem: pixelizeLogic.onRemovePixelizeItem,
    handleClearPixelizeResult: pixelizeLogic.handleClearPixelizeResult,
    handlePixelizeRename: pixelizeLogic.handlePixelizeRename,
    handleGenerateAllPixelize,

    onCsvUpload: handleCsvUpload, onCsvNavigate,
    handleMatchReferenceSize, handleRefinePrompt, handleUndoPrompt,
    handleGenerate: generation.handleGenerate, handleCancel: generation.handleCancel,
    
    // Animation Handlers
    handleGenerateFrame, handleGenerateAnimation, handleCreateSpinAnimation,
    handleAddFrame: animLogic.handleAddFrame,
    handleUpdateFramePrompt: animLogic.handleUpdateFramePrompt,
    handleDeleteFrame: animLogic.handleDeleteFrame,
    handleDuplicateFrame: animLogic.handleDuplicateFrame,
    handleClearFrames: animLogic.handleClearFrames,
    handleFrameImageUpload: animLogic.handleFrameImageUpload,
    
    handleCharacterLookClick, handleRegeneratePose, handleAnalyzeStyle,
    handleImageUpload, handleClearImage, handleClearSession, handleRemoveSessionImage,
    handleCompositeExport, handleSetAsTemplate, handleUseInLayout,
    handleSaveCard, handleCardSuggestions, handleSaveToDrive, handleRegenerateBackground, handleEnhance,
    handleMagicCrop, fullCardRef, getTargetDimensions,
    
    // History
    handleRenameHistoryItem, handleDeleteHistoryItem, handleClearHistory,
    
    // Tabs
    tabs, activeTabId, handleAddTab, handleCloseTab, handleSwitchTab, activeTab
  };

  return engine;
};
