
import { useState, useRef, useEffect } from "react";
import { generateIllustration, editImage, enhanceImage } from '../services/geminiService';
import { generateWithActiveProvider, editWithActiveProvider, getActiveAIProvider, isProviderReady } from '../services/aiProviderService';
import { getPollinationsModel } from '../services/pollinationsService';
import { removeBackground, removeBackgroundNeo, createCompositeImage, blobUrlToBase64, base64ToBlobUrl, optimizeBase64Image } from '../utils/imageUtils';
import { buildOutpaintPrompt, buildBackgroundRegenPrompt, buildPixelizePrompt, buildIllustrationPrompt, buildExtractClothesPrompt, buildUIReimaginePrompt, buildMapGridPrompt } from '../services/promptTemplates';
import { GenerationModel, PixelDimensions, GachaAsset, BackgroundConfig, WorkspaceTab } from '../types';
import { ART_STYLES, DEFAULT_BACKGROUND_CONFIG, AETHELGARD_RACES } from '../constants';

export const useGeneration = (
  activeTab: any,
  apiKeyReady: boolean,
  useProModel: boolean,
  gameContext: any,
  batchSize: number,
  setGeneratedImage: (url: string | null) => void,
  setSessionImages: (fn: (prev: string[]) => string[]) => void,
  addHistoryEntry: (entry: any) => Promise<void>,
  setResizeQueue: (fn: (q: any[]) => any[]) => void,
  setBgReplaceQueue: (fn: (q: any[]) => any[]) => void,
  setPixelizeQueue: (fn: (q: any[]) => any[]) => void,
  setGachaAssets: (fn: (q: GachaAsset[]) => GachaAsset[]) => void,
  logConsole: (msg: string) => void,
  getTargetDimensions: () => PixelDimensions,
  updateTabById: (id: string, updates: Partial<WorkspaceTab> | ((prev: WorkspaceTab) => Partial<WorkspaceTab>)) => void,
  recordStyleUsage?: (styleId: string) => void,
  activeModel?: string,
  onError?: (title: string, error: any) => void,
  onOpenPromptModal?: (isNoApi?: boolean) => void
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to granular BEI real-time progress events
  useEffect(() => {
    const handleBEIProgress = (e: any) => {
      const data = e.detail;
      if (data && data.detail && isGenerating && getActiveAIProvider() === 'bei') {
        setStatusMessage(data.detail);
      }
    };

    window.addEventListener('mythic_bei_progress', handleBEIProgress);
    return () => {
      window.removeEventListener('mythic_bei_progress', handleBEIProgress);
    };
  }, [isGenerating]);

  const notifyError = (title: string, err: any) => {
    if (onError) {
      onError(title, err);
    } else {
      alert(`${title}: ${err?.message || err}`);
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (prefix: string = "Generating") => {
    clearTimer();
    const isBEI = getActiveAIProvider() === 'bei';
    if (isBEI) {
      setStatusMessage(`${prefix}... (Routing to Gemini Web via BEI...)`);
      // Do NOT run fake mock timer in BEI mode — status is driven by authentic real-time progress events!
      return;
    }

    const startTime = Date.now();
    setStatusMessage(`${prefix}... (Preparing assets...)`);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed < 2) setStatusMessage(`${prefix}... (Optimizing assets)`);
      else if (elapsed < 5) setStatusMessage(`${prefix}... (Sending request: ${elapsed}s)`);
      else if (elapsed < 15) setStatusMessage(`${prefix}... (Processing: ${elapsed}s)`);
      else if (elapsed < 30) setStatusMessage(`${prefix}... (Still working: ${elapsed}s)`);
      else setStatusMessage(`${prefix}... (Taking longer than usual: ${elapsed}s)`);
    }, 1000);
  };

  const handleCancel = () => {
     if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
     if (getActiveAIProvider() === 'bei') {
       import('../services/beiService').then(({ cancelBEIGeneration }) => {
         cancelBEIGeneration().catch(() => {});
       });
     }
     clearTimer();
     setIsGenerating(false); 
     setStatusMessage('');
  };

  const handleEnhance = async () => {
    if (isGenerating) return;
    const initiatingTabId = activeTab.id;
    if (!activeTab.generatedImage) return;
    if (!apiKeyReady) { notifyError("API Key Required", new Error("Please connect your API Key in Settings first.")); return; }

    setIsGenerating(true);
    startTimer("Enhancing Details");
    abortControllerRef.current = new AbortController();

    try {
      const base64Input = await blobUrlToBase64(activeTab.generatedImage);
      const resultBase64 = await enhanceImage(base64Input, gameContext);
      const resultUrl = base64ToBlobUrl(resultBase64);
      const optimizedForHistory = await optimizeBase64Image(resultBase64, 1024, 0.7);

      updateTabById(initiatingTabId, prev => ({
          generatedImage: resultUrl,
          sessionImages: [resultUrl, ...prev.sessionImages]
      }));

      await addHistoryEntry({
        mode: activeTab.mode,
        thumbnailUrl: optimizedForHistory,
        fullPrompt: "Automated Enhancement / Detail Refinement",
        userPrompt: `Enhanced: ${activeTab.prompt || 'Source Image'}`,
        gameContext,
        styleId: activeTab.selectedStyleId,
        bgConfig: activeTab.bgConfig,
        referenceAssets: activeTab.referenceAssets,
        size: activeTab.selectedSize,
        aspectRatio: activeTab.selectedAspectRatio
      });

      logConsole("Image Enhancement Complete");

    } catch (e: any) {
      const isCancelled = e?.name === 'AbortError' || /cancel|aborted|stopped/i.test(e?.message || '');
      if (!isCancelled) {
        console.error(e);
        notifyError("Enhancement Failed", e);
      } else {
        logConsole("Enhancement cancelled.");
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleExtractOutfit = async (fileInput?: any) => {
    if (isGenerating) return;
    const initiatingTabId = activeTab.id;
    const sourceImage = activeTab.generatedImage;
    if (!sourceImage && !(fileInput instanceof Blob)) return;

    const currentProvider = getActiveAIProvider();
    const providerReady = await isProviderReady(currentProvider);
    if (!providerReady) {
      const errorMsg = currentProvider === 'bei' 
        ? "BEI Bridge extension is not connected. Please reload the extension in chrome://extensions."
        : currentProvider === 'openai'
        ? "OpenAI API Key is missing. Please configure it in Settings."
        : currentProvider === 'opencode'
        ? "OpenCode / Local AI endpoint is not configured. Please set it in Settings."
        : "Gemini API Key is missing. Please connect your API key in Settings.";
      notifyError(`${currentProvider.toUpperCase()} Setup Required`, new Error(errorMsg));
      return;
    }

    setIsGenerating(true);
    startTimer("Extracting Clothes");
    setStatusMessage("Isolating Full Outfit...");
    abortControllerRef.current = new AbortController();

    try {
      let base64Input = "";
      if (fileInput instanceof Blob) {
        base64Input = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileInput);
        });
      } else {
        base64Input = await blobUrlToBase64(sourceImage);
      }

      const extractPrompt = buildExtractClothesPrompt(gameContext, activeTab.bgConfig);
      logConsole(`Extraction Prompt: ${extractPrompt}`);

      const resultBase64 = await editWithActiveProvider({
        base64Image: base64Input,
        prompt: extractPrompt,
        bgConfig: activeTab.bgConfig,
        gameContext,
        signal: abortControllerRef.current.signal
      });
      let resultUrl = base64ToBlobUrl(resultBase64);
      const optimizedForHistory = await optimizeBase64Image(resultBase64, 1024, 0.7);

      if (activeTab.bgConfig.mode === 'transparent') {
        setStatusMessage('Keying Out Background & Healing...');
        resultUrl = await removeBackground(resultUrl, 60, true, 100, '#FFFFFF');
      } else if (activeTab.bgConfig.mode === 'transparent_neo') {
        setStatusMessage('Decontaminating & Matting (NEO)...');
        resultUrl = await removeBackgroundNeo(resultUrl, activeTab.bgConfig);
      }

      updateTabById(initiatingTabId, prev => ({
          generatedImage: resultUrl,
          sessionImages: [resultUrl, ...prev.sessionImages],
          clothesParams: { ...prev.clothesParams, renderMode: 'asset' }
      }));

      await addHistoryEntry({
        mode: 'clothes',
        thumbnailUrl: optimizedForHistory,
        fullPrompt: extractPrompt,
        userPrompt: `Extracted Garment Asset`,
        gameContext,
        styleId: activeTab.selectedStyleId,
        bgConfig: activeTab.bgConfig,
        referenceAssets: activeTab.referenceAssets,
        size: activeTab.selectedSize,
        aspectRatio: activeTab.selectedAspectRatio
      });

    } catch (e: any) {
      const isCancelled = e?.name === 'AbortError' || /cancel|aborted|stopped/i.test(e?.message || '');
      if (!isCancelled) {
        console.error(e);
        notifyError("Extraction Failed", e);
      } else {
        logConsole("Extraction cancelled.");
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateBackground = async (targetId?: string) => {
    if (isGenerating) return;
    const initiatingTabId = activeTab.id;
    const isGacha = activeTab.mode === 'gacha';
    const targetAsset = isGacha && targetId ? activeTab.gachaAssets.find((a: GachaAsset) => a.id === targetId) : null;
    const sourceImage = targetAsset ? targetAsset.imageUrl : activeTab.generatedImage;
    const sourceBgConfig = targetAsset ? (targetAsset.bgConfig || activeTab.bgConfig) : activeTab.bgConfig;

    if (!sourceImage) return;

    const currentProvider = getActiveAIProvider();
    const providerReady = await isProviderReady(currentProvider);
    if (!providerReady) {
      const errorMsg = currentProvider === 'bei' 
        ? "BEI Bridge extension is not connected. Please reload the extension in chrome://extensions."
        : currentProvider === 'openai'
        ? "OpenAI API Key is missing. Please configure it in Settings."
        : currentProvider === 'opencode'
        ? "OpenCode / Local AI endpoint is not configured. Please set it in Settings."
        : "Gemini API Key is missing. Please connect your API key in Settings.";
      notifyError(`${currentProvider.toUpperCase()} Setup Required`, new Error(errorMsg));
      return;
    }

    setIsGenerating(true);
    if (isGacha && targetId) {
      updateTabById(initiatingTabId, prev => ({
          gachaAssets: prev.gachaAssets.map(a => a.id === targetId ? { ...a, status: 'processing' } : a)
      }));
    }

    startTimer("Replacing Background");
    abortControllerRef.current = new AbortController();

    try {
      const base64Input = await blobUrlToBase64(sourceImage);
      const regenPrompt = buildBackgroundRegenPrompt(gameContext, sourceBgConfig);
      logConsole(`Regen Prompt: ${regenPrompt}`);

      const resultBase64 = await editWithActiveProvider({
        base64Image: base64Input,
        prompt: regenPrompt,
        bgConfig: sourceBgConfig,
        gameContext,
        signal: abortControllerRef.current.signal
      });
      let resultUrl = base64ToBlobUrl(resultBase64);
      const optimizedForHistory = await optimizeBase64Image(resultBase64, 1024, 0.7);

      if (sourceBgConfig.mode === 'transparent') {
        setStatusMessage('Removing Background & Healing...');
        resultUrl = await removeBackground(resultUrl, 60, sourceBgConfig.removeHoles, sourceBgConfig.healingPower, '#FFFFFF');
      } else if (sourceBgConfig.mode === 'transparent_neo') {
        setStatusMessage('Decontaminating & Matting (NEO)...');
        resultUrl = await removeBackgroundNeo(resultUrl, sourceBgConfig);
      }

      if (isGacha && targetId) {
        updateTabById(initiatingTabId, prev => ({
            gachaAssets: prev.gachaAssets.map(a => a.id === targetId ? { ...a, status: 'done', imageUrl: resultUrl } : a)
        }));
      } else {
        updateTabById(initiatingTabId, prev => ({
            generatedImage: resultUrl,
            sessionImages: [resultUrl, ...prev.sessionImages]
        }));
      }

      await addHistoryEntry({
        mode: activeTab.mode,
        thumbnailUrl: optimizedForHistory,
        fullPrompt: regenPrompt,
        userPrompt: `Background Replacement: ${sourceBgConfig.promptFragment || sourceBgConfig.mode}`,
        gameContext,
        styleId: activeTab.selectedStyleId,
        bgConfig: sourceBgConfig,
        referenceAssets: activeTab.referenceAssets,
        size: targetAsset ? targetAsset.size : activeTab.selectedSize,
        aspectRatio: targetAsset ? targetAsset.aspectRatio : activeTab.selectedAspectRatio
      });

    } catch (e: any) {
      const isCancelled = e?.name === 'AbortError' || /cancel|aborted|stopped/i.test(e?.message || '');
      if (!isCancelled) {
        console.error(e);
        notifyError("Background Replacement Failed", e);
        if (isGacha && targetId) {
          updateTabById(initiatingTabId, prev => ({
              gachaAssets: prev.gachaAssets.map(a => a.id === targetId ? { ...a, status: 'failed' } : a)
          }));
        }
      } else {
        logConsole("Background replacement cancelled.");
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleGenerate = async (append: boolean | string = false, targetAssetId?: string) => {
    if (isGenerating) return;
    const initiatingTabId = activeTab.id;
    const isAppend = typeof append === 'boolean' ? append : false;
    const finalAssetId = targetAssetId || (typeof append === 'string' ? append : activeTab.selectedGachaAssetId);
    
    if (activeTab.mode === 'resize') {
       if (!activeTab.selectedResizeId) return; 
    } else if (activeTab.mode === 'bg-replace') {
       if (!activeTab.selectedBgReplaceId) return;
    } else if (activeTab.mode === 'pixelize') {
       if (!activeTab.selectedPixelizeId) return;
    } else if (activeTab.mode === 'gacha') {
       if (!finalAssetId) {
          notifyError("Selection Required", new Error("Please select a slot to generate."));
          return;
       }
    } else if (activeTab.mode === 'ui-reimagine') {
       if (!activeTab.generatedImage) {
          notifyError("Image Required", new Error("Please upload an image to reimagine the UI for."));
          return;
       }
    } else {
       if (!activeTab.prompt && !activeTab.generatedImage) return; 
    }

    // 1. Prompt-Only Mode: Immediately open prompt export modal without generating
    if (activeTab.isPromptOnlyMode || getActiveAIProvider() === 'offline') {
      if (onOpenPromptModal) {
        onOpenPromptModal(false);
        return;
      }
    }

    // 2. Check provider readiness. If not configured, gracefully open prompt modal instead of erroring
    const currentProvider = getActiveAIProvider();
    const providerReady = await isProviderReady(currentProvider);
    if (!providerReady) {
      if (onOpenPromptModal) {
        onOpenPromptModal(true);
        return;
      }
      const errorMsg = currentProvider === 'bei' 
        ? "BEI Bridge extension is not connected. Please reload the extension in chrome://extensions."
        : currentProvider === 'openai'
        ? "OpenAI API Key is missing. Please configure it in Settings."
        : currentProvider === 'opencode'
        ? "OpenCode / Local AI endpoint is not configured. Please set it in Settings."
        : "Gemini API Key is missing. Please connect your API key in Settings.";
      notifyError(`${currentProvider.toUpperCase()} Setup Required`, new Error(errorMsg));
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    
    if (recordStyleUsage && activeTab.selectedStyleId) {
       recordStyleUsage(activeTab.selectedStyleId);
    }
    
    try {
       let styleSnippet = activeTab.selectedStyleId !== 'none' ? ART_STYLES.find((s:any) => s.id === activeTab.selectedStyleId)?.promptSnippet || '' : '';
       
       // Apply bit size override for pixel art styles
       if (activeTab.pixelBitSize && (activeTab.selectedStyleId === 'pixel_art' || activeTab.selectedStyleId === 'retro_8bit_micro')) {
          styleSnippet = styleSnippet.replace(/16-bit/g, activeTab.pixelBitSize).replace(/8-bit/g, activeTab.pixelBitSize);
          if (!styleSnippet.includes(activeTab.pixelBitSize)) {
            styleSnippet += `, ${activeTab.pixelBitSize}`;
          }
       }

       const model = currentProvider === 'pollinations'
         ? (activeModel || getPollinationsModel())
         : currentProvider === 'openai'
         ? (activeModel || 'dall-e-3')
         : (activeModel || (useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_3_1));
       
       const count = (isAppend || ['resize', 'animation', 'fullcard', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine'].includes(activeTab.mode)) ? 1 : batchSize;

       for (let i = 0; i < count; i++) {
           if (abortControllerRef.current?.signal.aborted) break;
           
           const prefix = count > 1 ? `Generating ${i+1}/${count}` : "Generating";
           startTimer(prefix);

           let resultUrl = '';
           let finalPrompt = '';

           if (activeTab.mode === 'gacha') {
              const asset = activeTab.gachaAssets.find((a: GachaAsset) => a.id === finalAssetId);
              if (!asset) throw new Error("Target asset slot not found.");
              
              updateTabById(initiatingTabId, prev => ({
                  gachaAssets: prev.gachaAssets.map(a => a.id === asset.id ? { ...a, status: 'processing' } : a)
              }));

              const assetBgConfig = asset.bgConfig || activeTab.bgConfig || DEFAULT_BACKGROUND_CONFIG;

              const race = AETHELGARD_RACES.find(r => r.id === activeTab.characterRace);
              const racePrompt = (activeTab.characterGender === 'Female' ? race?.traitPromptFemale : race?.traitPromptMale) || '';

              const proportionToUse = asset.chibiProportions || activeTab.chibiProportions;

              const { image, metadata } = await generateWithActiveProvider({
                  prompt: `${racePrompt}, ${activeTab.characterTraits}, ${asset.promptSuffix}`,
                  model,
                  size: asset.size,
                  aspectRatio: asset.aspectRatio,
                  referenceAssets: activeTab.referenceAssets,
                  bgConfig: assetBgConfig,
                  gameContext,
                  signal: abortControllerRef.current.signal,
                  styleSnippet,
                  mode: 'illustration',
                  frameElements: [],
                  bgPatternType: 'scene',
                  safeZone: activeTab.safeZone,
                  clothesParams: undefined,
                  continuityFlags: activeTab.continuityFlags,
                  chibiProportion: proportionToUse,
                  chibiConfig: asset.chibiConfig,
                  viewpoint: undefined,
                  noCharacters: activeTab.noCharacters,
                  framing: asset.framing || activeTab.framing,
                  seed: activeTab.seed,
                  hasHoldingImages: Boolean(activeTab.sessionImages && activeTab.sessionImages.length > 0),
                  tabSessionId: activeTab.id,
                  chatSessionMode: (activeTab.sessionImages && activeTab.sessionImages.length > 0) ? 'same_chat' : 'temporary_chat'
              });

              const resultBase64 = image;
              let resultUrl = base64ToBlobUrl(resultBase64);
              const optimizedForHistory = await optimizeBase64Image(resultBase64, 1024, 0.7);
              finalPrompt = metadata.fullPrompt;

              if (assetBgConfig.mode === 'transparent') {
                  setStatusMessage('Removing Background & Healing...');
                  resultUrl = await removeBackground(resultUrl, assetBgConfig.tolBg || 60, assetBgConfig.removeHoles, assetBgConfig.healingPower, '#FFFFFF');
              } else if (assetBgConfig.mode === 'transparent_neo') {
                  setStatusMessage('Decontaminating & Matting (NEO)...');
                  resultUrl = await removeBackgroundNeo(resultUrl, assetBgConfig);
              }

              updateTabById(initiatingTabId, prev => ({
                  gachaAssets: prev.gachaAssets.map(a => a.id === asset.id ? { ...a, status: 'done', imageUrl: resultUrl } : a),
                  generatedImage: resultUrl
              }));

              await addHistoryEntry({
                  mode: 'gacha',
                  thumbnailUrl: optimizedForHistory,
                  fullPrompt: finalPrompt,
                  userPrompt: `${asset.name}: ${activeTab.characterTraits}`,
                  gameContext,
                  styleId: activeTab.selectedStyleId,
                  bgConfig: assetBgConfig,
                  referenceAssets: activeTab.referenceAssets,
                  size: asset.size,
                  aspectRatio: asset.aspectRatio,
                  gachaAssets: activeTab.gachaAssets,
                  characterTraits: activeTab.characterTraits,
                  characterName: activeTab.characterName,
                  rarity: activeTab.characterRarity,
                  continuityFlags: activeTab.continuityFlags
              });

           } else if (activeTab.mode === 'resize') {
               const item = activeTab.resizeQueue.find((x:any) => x.id === activeTab.selectedResizeId);
               if (!item) throw new Error("Item not found");
               const dim = getTargetDimensions();
               const compositeBase64 = await createCompositeImage(item.url, dim.width, dim.height, activeTab.resizeZoom, activeTab.resizePan.x, activeTab.resizePan.y);
               const outpaintPrompt = buildOutpaintPrompt(activeTab.prompt, gameContext, styleSnippet);
               resultUrl = base64ToBlobUrl(await editWithActiveProvider({
                   base64Image: compositeBase64,
                   prompt: outpaintPrompt,
                   gameContext,
                   signal: abortControllerRef.current?.signal
               }));
               finalPrompt = outpaintPrompt;
               updateTabById(initiatingTabId, prev => ({
                   resizeQueue: prev.resizeQueue.map(x => x.id === activeTab.selectedResizeId ? { ...x, status: 'done', resultUrl } : x),
                   generatedImage: resultUrl
               }));
           } else if (activeTab.mode === 'bg-replace') {
               const item = activeTab.bgReplaceQueue.find((x:any) => x.id === activeTab.selectedBgReplaceId);
               if (!item) throw new Error("Item not found");
               const base64Input = await blobUrlToBase64(item.url);
               const prompt = buildBackgroundRegenPrompt(gameContext, activeTab.bgConfig);
               resultUrl = base64ToBlobUrl(await editWithActiveProvider({
                   base64Image: base64Input,
                   prompt,
                   bgConfig: activeTab.bgConfig,
                   gameContext,
                   signal: abortControllerRef.current?.signal
               }));
               finalPrompt = prompt;
               updateTabById(initiatingTabId, prev => ({
                   bgReplaceQueue: prev.bgReplaceQueue.map(x => x.id === activeTab.selectedBgReplaceId ? { ...x, status: 'done', resultUrl } : x),
                   generatedImage: resultUrl
               }));
           } else if (activeTab.mode === 'pixelize') {
               const item = activeTab.pixelizeQueue.find((x:any) => x.id === activeTab.selectedPixelizeId);
               if (!item) throw new Error("Item not found");
               const base64Input = await blobUrlToBase64(item.url);
               const prompt = buildPixelizePrompt(item.pixelStyle, ""); 
               resultUrl = base64ToBlobUrl(await editWithActiveProvider({
                   base64Image: base64Input,
                   prompt,
                   gameContext,
                   signal: abortControllerRef.current?.signal
               }));
               finalPrompt = prompt;
               updateTabById(initiatingTabId, prev => ({
                   pixelizeQueue: prev.pixelizeQueue.map(x => x.id === activeTab.selectedPixelizeId ? { ...x, status: 'done', resultUrl } : x),
                   generatedImage: resultUrl
               }));
           } else if (activeTab.mode === 'ui-reimagine') {
               const base64Input = await blobUrlToBase64(activeTab.generatedImage);
               const prompt = buildUIReimaginePrompt(
                   activeTab.prompt, 
                   gameContext, 
                   styleSnippet, 
                   activeTab.uiReimagineChangeBg,
                   activeTab.uiMoodEnabled ? activeTab.uiThemeMood : undefined,
                   activeTab.uiElementsEnabled ? activeTab.uiElements : undefined,
                   activeTab.uiColorsEnabled ? { primary: activeTab.bgConfig.color, secondary: activeTab.bgConfig.secondaryColor || '#000000' } : undefined,
                   activeTab.uiElementsEnabled ? activeTab.uiArchetype : undefined,
                   activeTab.uiMaterialEnabled ? activeTab.uiMaterial : undefined,
                   activeTab.uiPositionsLocked
               );
               resultUrl = base64ToBlobUrl(await editWithActiveProvider({
                   base64Image: base64Input,
                   prompt,
                   gameContext,
                   referenceAssets: activeTab.referenceAssets,
                   signal: abortControllerRef.current?.signal
               }));
               finalPrompt = prompt;
               updateTabById(initiatingTabId, prev => ({
                   sessionImages: [resultUrl, ...prev.sessionImages],
                   generatedImage: resultUrl
               }));
               await addHistoryEntry({
                  mode: 'ui-reimagine',
                  thumbnailUrl: resultUrl,
                  fullPrompt: finalPrompt,
                  userPrompt: activeTab.prompt || 'UI Reimagined',
                  gameContext,
                  styleId: activeTab.selectedStyleId,
                  bgConfig: activeTab.bgConfig,
                  referenceAssets: activeTab.referenceAssets,
                  size: activeTab.selectedSize,
                  aspectRatio: activeTab.selectedAspectRatio
               });
           } else {
               const { image, metadata } = await generateWithActiveProvider({
                  prompt: activeTab.prompt,
                  model,
                  size: activeTab.selectedSize,
                  aspectRatio: activeTab.selectedAspectRatio,
                  referenceAssets: activeTab.referenceAssets,
                  bgConfig: activeTab.bgConfig,
                  gameContext,
                  signal: abortControllerRef.current.signal,
                  styleSnippet,
                  mode: activeTab.mode,
                  frameElements: activeTab.frameElements,
                  bgPatternType: activeTab.bgPatternType,
                  safeZone: activeTab.safeZone,
                  clothesParams: activeTab.clothesParams,
                  continuityFlags: activeTab.continuityFlags,
                  chibiProportion: activeTab.chibiProportions,
                  chibiConfig: activeTab.chibiConfig,
                  poseData: activeTab.poseData,
                  mapGridConfig: activeTab.mapGridConfig,
                  viewpoint: activeTab.viewpoint,
                  noCharacters: activeTab.noCharacters,
                  framing: activeTab.framing,
                  seed: activeTab.seed,
                  hasHoldingImages: Boolean(activeTab.sessionImages && activeTab.sessionImages.length > 0),
                  tabSessionId: activeTab.id,
                  chatSessionMode: (activeTab.sessionImages && activeTab.sessionImages.length > 0) ? 'same_chat' : 'temporary_chat'
               });
               resultUrl = base64ToBlobUrl(image);
               finalPrompt = metadata.fullPrompt;
               logConsole(`Generation Prompt: ${finalPrompt}`);
               if (activeTab.bgConfig.mode === 'transparent') {
                   setStatusMessage('Removing Background & Healing...');
                   clearTimer(); 
                   resultUrl = await removeBackground(resultUrl, activeTab.bgConfig.tolBg || 60, activeTab.bgConfig.removeHoles, activeTab.bgConfig.healingPower, '#FFFFFF');
               } else if (activeTab.bgConfig.mode === 'transparent_neo') {
                   setStatusMessage('Decontaminating & Matting (NEO)...');
                   clearTimer();
                   resultUrl = await removeBackgroundNeo(resultUrl, activeTab.bgConfig);
               }
               await addHistoryEntry({
                  mode: activeTab.mode,
                  thumbnailUrl: resultUrl,
                  fullPrompt: finalPrompt,
                  userPrompt: activeTab.prompt || 'Generated',
                  gameContext,
                  styleId: activeTab.selectedStyleId,
                  bgConfig: activeTab.bgConfig,
                  referenceAssets: activeTab.referenceAssets,
                  size: activeTab.selectedSize,
                  aspectRatio: activeTab.selectedAspectRatio,
                  frameElements: activeTab.mode === 'frame' ? activeTab.frameElements : undefined,
                  bgPatternType: activeTab.mode === 'background' ? activeTab.bgPatternType : undefined,
                  safeZone: activeTab.mode === 'illustration' ? activeTab.safeZone : undefined,
                  clothesParams: activeTab.mode === 'clothes' ? activeTab.clothesParams : undefined
               });
               
               updateTabById(initiatingTabId, prev => ({
                   sessionImages: [resultUrl, ...prev.sessionImages],
                   generatedImage: resultUrl
               }));
           }
       }
    } catch (e: any) {
       const isCancelled = e?.name === 'AbortError' || /cancel|aborted|stopped/i.test(e?.message || '');
       if (!isCancelled) {
          console.error(e);
          notifyError("Generation Failed", e);
          logConsole(`ERROR: ${e.message}`);
          if (finalAssetId && activeTab.mode === 'gacha') {
             updateTabById(initiatingTabId, prev => ({
                 gachaAssets: prev.gachaAssets.map(a => a.id === finalAssetId ? { ...a, status: 'failed' } : a)
             }));
          }
       } else {
          logConsole("Generation cancelled by user.");
       }
    } finally {
       clearTimer();
       setIsGenerating(false); 
       setStatusMessage(''); 
       abortControllerRef.current = null;
    }
  };

  return {
    isGenerating,
    setIsGenerating,
    statusMessage,
    setStatusMessage,
    handleGenerate,
    handleRegenerateBackground,
    handleEnhance,
    handleExtractOutfit,
    handleCancel,
    abortControllerRef
  };
};
