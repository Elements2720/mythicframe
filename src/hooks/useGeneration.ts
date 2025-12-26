import { useState, useRef } from "react";
import { generateIllustration, editImage, enhanceImage } from '../services/geminiService';
import { removeBackground, createCompositeImage, blobUrlToBase64 } from '../utils/imageUtils';
import { buildOutpaintPrompt, buildBackgroundRegenPrompt, buildPixelizePrompt, buildIllustrationPrompt, buildExtractClothesPrompt, buildUIReimaginePrompt } from '../services/promptTemplates';
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
  updateTabById: (id: string, updates: Partial<WorkspaceTab> | ((prev: WorkspaceTab) => Partial<WorkspaceTab>)) => void
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (prefix: string = "Generating") => {
    clearTimer();
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
     clearTimer();
     setIsGenerating(false); 
     setStatusMessage('');
  };

  const handleEnhance = async () => {
    const initiatingTabId = activeTab.id;
    if (!activeTab.generatedImage) return;
    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

    setIsGenerating(true);
    startTimer("Enhancing Details");
    abortControllerRef.current = new AbortController();

    try {
      const base64Input = await blobUrlToBase64(activeTab.generatedImage);
      const enhancedUrl = await enhanceImage(base64Input, gameContext);

      updateTabById(initiatingTabId, prev => ({
          generatedImage: enhancedUrl,
          sessionImages: [enhancedUrl, ...prev.sessionImages]
      }));

      await addHistoryEntry({
        mode: activeTab.mode,
        thumbnailUrl: enhancedUrl,
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
      if (e.name !== 'AbortError') {
        console.error(e);
        alert(`Enhancement failed: ${e.message}`);
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleExtractOutfit = async (fileInput?: any) => {
    const initiatingTabId = activeTab.id;
    const sourceImage = activeTab.generatedImage;
    if (!sourceImage && !(fileInput instanceof Blob)) return;
    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

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

      let resultUrl = await editImage(base64Input, extractPrompt, activeTab.bgConfig, gameContext);

      if (activeTab.bgConfig.mode === 'transparent') {
        setStatusMessage('Keying Out Background & Healing...');
        resultUrl = await removeBackground(resultUrl, 30, true, 100);
      }

      updateTabById(initiatingTabId, prev => ({
          generatedImage: resultUrl,
          sessionImages: [resultUrl, ...prev.sessionImages],
          clothesParams: { ...prev.clothesParams, renderMode: 'asset' }
      }));

      await addHistoryEntry({
        mode: 'clothes',
        thumbnailUrl: resultUrl,
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
      if (e.name !== 'AbortError') {
        console.error(e);
        alert(`Extraction failed: ${e.message}`);
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateBackground = async (targetId?: string) => {
    const initiatingTabId = activeTab.id;
    const isGacha = activeTab.mode === 'gacha';
    const targetAsset = isGacha && targetId ? activeTab.gachaAssets.find((a: GachaAsset) => a.id === targetId) : null;
    const sourceImage = targetAsset ? targetAsset.imageUrl : activeTab.generatedImage;
    const sourceBgConfig = targetAsset ? (targetAsset.bgConfig || activeTab.bgConfig) : activeTab.bgConfig;

    if (!sourceImage) return;
    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

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

      let resultUrl = await editImage(base64Input, regenPrompt, sourceBgConfig, gameContext);

      if (sourceBgConfig.mode === 'transparent') {
        setStatusMessage('Removing Background & Healing...');
        resultUrl = await removeBackground(resultUrl, 20, sourceBgConfig.removeHoles, sourceBgConfig.healingPower);
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
        thumbnailUrl: resultUrl,
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
      if (e.name !== 'AbortError') {
        console.error(e);
        alert(`Background replacement failed: ${e.message}`);
        if (isGacha && targetId) {
          updateTabById(initiatingTabId, prev => ({
              gachaAssets: prev.gachaAssets.map(a => a.id === targetId ? { ...a, status: 'failed' } : a)
          }));
        }
      }
    } finally {
      clearTimer();
      setIsGenerating(false);
      setStatusMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleGenerate = async (append: boolean | string = false, targetAssetId?: string) => {
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
          alert("Please select a slot to generate.");
          return;
       }
    } else if (activeTab.mode === 'ui-reimagine') {
       if (!activeTab.generatedImage) {
          alert("Please upload an image to reimagine the UI for.");
          return;
       }
    } else {
       if (!activeTab.prompt && !activeTab.generatedImage) return; 
    }

    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    
    try {
       const styleSnippet = activeTab.selectedStyleId !== 'none' ? ART_STYLES.find((s:any) => s.id === activeTab.selectedStyleId)?.promptSnippet || '' : '';
       const model = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_2_5;
       
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

              const { image, metadata } = await generateIllustration(
                  `${racePrompt}, ${activeTab.characterTraits}, ${asset.promptSuffix}`,
                  model, asset.size, asset.aspectRatio,
                  activeTab.referenceAssets, assetBgConfig, gameContext, abortControllerRef.current.signal,
                  styleSnippet, 'illustration', [], 'scene', activeTab.safeZone, undefined,
                  activeTab.continuityFlags, proportionToUse, asset.chibiConfig
              );

              resultUrl = image;
              finalPrompt = metadata.fullPrompt;

              if (assetBgConfig.mode === 'transparent') {
                  setStatusMessage('Removing Background & Healing...');
                  resultUrl = await removeBackground(resultUrl, 30, assetBgConfig.removeHoles, assetBgConfig.healingPower);
              }

              updateTabById(initiatingTabId, prev => ({
                  gachaAssets: prev.gachaAssets.map(a => a.id === asset.id ? { ...a, status: 'done', imageUrl: resultUrl } : a),
                  generatedImage: resultUrl
              }));

              await addHistoryEntry({
                  mode: 'gacha',
                  thumbnailUrl: resultUrl,
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
               resultUrl = await editImage(compositeBase64, outpaintPrompt, undefined, gameContext);
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
               resultUrl = await editImage(base64Input, prompt, activeTab.bgConfig, gameContext);
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
               resultUrl = await editImage(base64Input, prompt, undefined, gameContext);
               finalPrompt = prompt;
               updateTabById(initiatingTabId, prev => ({
                   pixelizeQueue: prev.pixelizeQueue.map(x => x.id === activeTab.selectedPixelizeId ? { ...x, status: 'done', resultUrl } : x),
                   generatedImage: resultUrl
               }));
           } else if (activeTab.mode === 'ui-reimagine') {
               const base64Input = await blobUrlToBase64(activeTab.generatedImage);
               const prompt = buildUIReimaginePrompt(activeTab.prompt, gameContext, styleSnippet, activeTab.uiReimagineChangeBg);
               resultUrl = await editImage(base64Input, prompt, undefined, gameContext, activeTab.referenceAssets);
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
               const { image, metadata } = await generateIllustration(
                  activeTab.prompt, model, activeTab.selectedSize, activeTab.selectedAspectRatio,
                  activeTab.referenceAssets, activeTab.bgConfig, gameContext, abortControllerRef.current.signal,
                  styleSnippet, activeTab.mode, activeTab.frameElements, activeTab.bgPatternType, activeTab.safeZone,
                  activeTab.clothesParams,
                  activeTab.continuityFlags,
                  activeTab.chibiProportions
               );
               resultUrl = image;
               finalPrompt = metadata.fullPrompt;
               if (activeTab.bgConfig.mode === 'transparent') {
                   setStatusMessage('Removing Background & Healing...');
                   clearTimer(); 
                   resultUrl = await removeBackground(resultUrl, 30, activeTab.bgConfig.removeHoles, activeTab.bgConfig.healingPower);
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
       if (e.name !== 'AbortError') {
          console.error(e);
          alert(`Generation failed: ${e.message}`);
          logConsole(`ERROR: ${e.message}`);
          if (finalAssetId && activeTab.mode === 'gacha') {
             updateTabById(initiatingTabId, prev => ({
                 gachaAssets: prev.gachaAssets.map(a => a.id === finalAssetId ? { ...a, status: 'failed' } : a)
             }));
          }
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