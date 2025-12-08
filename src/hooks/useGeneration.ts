

import { useState, useRef } from 'react';
import { generateIllustration, editImage } from '../services/geminiService';
import { removeBackground, createCompositeImage, blobUrlToBase64 } from '../utils/imageUtils';
import { buildOutpaintPrompt, buildBackgroundRegenPrompt, buildPixelizePrompt } from '../services/promptTemplates';
import { GenerationModel, PixelDimensions } from '../types';
import { ART_STYLES } from '../constants';

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
  logConsole: (msg: string) => void,
  getTargetDimensions: () => PixelDimensions
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
    // Initial status before timer ticks
    setStatusMessage(`${prefix}... (Preparing assets...)`);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      // Dynamic context messages based on time elapsed
      if (elapsed < 2) {
         setStatusMessage(`${prefix}... (Optimizing assets)`);
      } else if (elapsed < 5) {
         setStatusMessage(`${prefix}... (Sending request: ${elapsed}s)`);
      } else if (elapsed < 15) {
         setStatusMessage(`${prefix}... (Processing: ${elapsed}s)`);
      } else if (elapsed < 30) {
         setStatusMessage(`${prefix}... (Still working: ${elapsed}s)`);
      } else {
         setStatusMessage(`${prefix}... (Taking longer than usual: ${elapsed}s)`);
      }
    }, 1000);
  };

  const handleCancel = () => {
     if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
     clearTimer();
     setIsGenerating(false); 
     setStatusMessage('');
  };

  const handleGenerate = async (append = false) => {
    // Validation
    if (activeTab.mode === 'resize') {
       if (!activeTab.selectedResizeId) return; 
    } else if (activeTab.mode === 'bg-replace') {
       if (!activeTab.selectedBgReplaceId) return;
    } else if (activeTab.mode === 'pixelize') {
       if (!activeTab.selectedPixelizeId) return;
    } else {
       if (!activeTab.prompt && !activeTab.generatedImage) return; 
    }

    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    
    if (!append) setSessionImages(() => []);

    try {
       const styleSnippet = activeTab.selectedStyleId !== 'none' ? ART_STYLES.find((s:any) => s.id === activeTab.selectedStyleId)?.promptSnippet || '' : '';
       const model = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_2_5;
       const count = (append || ['resize', 'animation', 'fullcard', 'bg-replace', 'pixelize'].includes(activeTab.mode)) ? 1 : batchSize;

       for (let i = 0; i < count; i++) {
           if (abortControllerRef.current?.signal.aborted) break;
           
           // Start timer for this specific generation item
           const prefix = count > 1 ? `Generating ${i+1}/${count}` : "Generating";
           startTimer(prefix);

           let resultUrl = '';
           let finalPrompt = '';

           if (activeTab.mode === 'resize') {
               // --- RESIZE LOGIC ---
               const item = activeTab.resizeQueue.find((x:any) => x.id === activeTab.selectedResizeId);
               if (!item) throw new Error("Item not found");
               const dim = getTargetDimensions();
               const compositeBase64 = await createCompositeImage(item.url, dim.width, dim.height, activeTab.resizeZoom, activeTab.resizePan.x, activeTab.resizePan.y);
               const outpaintPrompt = buildOutpaintPrompt(activeTab.prompt, gameContext, styleSnippet);
               
               resultUrl = await editImage(compositeBase64, outpaintPrompt, undefined, gameContext);
               finalPrompt = outpaintPrompt;
               
               setResizeQueue(q => q.map(x => x.id === activeTab.selectedResizeId ? { ...x, status: 'done', resultUrl } : x));
               setGeneratedImage(resultUrl);

           } else if (activeTab.mode === 'bg-replace') {
               // --- BG REPLACE LOGIC ---
               const item = activeTab.bgReplaceQueue.find((x:any) => x.id === activeTab.selectedBgReplaceId);
               if (!item) throw new Error("Item not found");
               
               const base64Input = await blobUrlToBase64(item.url);
               const prompt = buildBackgroundRegenPrompt(gameContext, activeTab.bgConfig);
               logConsole(`[BG-REPLACE] ${prompt}`);
               
               resultUrl = await editImage(base64Input, prompt, activeTab.bgConfig, gameContext);
               finalPrompt = prompt;

               setBgReplaceQueue(q => q.map(x => x.id === activeTab.selectedBgReplaceId ? { ...x, status: 'done', resultUrl } : x));
               setGeneratedImage(resultUrl);

               await addHistoryEntry({
                  mode: 'bg-replace',
                  thumbnailUrl: resultUrl,
                  fullPrompt: finalPrompt,
                  userPrompt: activeTab.prompt || 'Background Replace',
                  gameContext,
                  styleId: activeTab.selectedStyleId,
                  bgConfig: activeTab.bgConfig,
                  referenceAssets: [],
                  size: activeTab.selectedSize,
                  aspectRatio: activeTab.selectedAspectRatio
               });

           } else if (activeTab.mode === 'pixelize') {
               // --- PIXELIZE LOGIC ---
               const item = activeTab.pixelizeQueue.find((x:any) => x.id === activeTab.selectedPixelizeId);
               if (!item) throw new Error("Item not found");

               const base64Input = await blobUrlToBase64(item.url);
               const prompt = buildPixelizePrompt(item.pixelStyle, ""); 
               logConsole(`[PIXELIZE] ${prompt}`);

               resultUrl = await editImage(base64Input, prompt, undefined, gameContext);
               finalPrompt = prompt;

               setPixelizeQueue(q => q.map(x => x.id === activeTab.selectedPixelizeId ? { ...x, status: 'done', resultUrl } : x));
               setGeneratedImage(resultUrl);

               await addHistoryEntry({
                  mode: 'pixelize',
                  thumbnailUrl: resultUrl,
                  fullPrompt: finalPrompt,
                  userPrompt: `Pixelize (${item.pixelStyle})`,
                  gameContext,
                  styleId: 'none',
                  bgConfig: { ...activeTab.bgConfig },
                  referenceAssets: [],
                  size: activeTab.selectedSize,
                  aspectRatio: activeTab.selectedAspectRatio,
                  pixelStyle: item.pixelStyle
               });

           } else if (activeTab.isEditMode && activeTab.generatedImage) {
               // --- EDIT LOGIC (Standard) ---
               const base64Input = await blobUrlToBase64(activeTab.generatedImage);
               resultUrl = await editImage(base64Input, activeTab.prompt, activeTab.bgConfig, gameContext);
               finalPrompt = activeTab.prompt;
               
           } else {
               // --- CREATE LOGIC ---
               const { image, metadata } = await generateIllustration(
                  activeTab.prompt, model, activeTab.selectedSize, activeTab.selectedAspectRatio,
                  activeTab.referenceAssets, activeTab.bgConfig, gameContext, abortControllerRef.current.signal,
                  styleSnippet, activeTab.mode, activeTab.frameElements, activeTab.bgPatternType, activeTab.safeZone,
                  activeTab.clothesParams
               );
               resultUrl = image;
               finalPrompt = metadata.fullPrompt;
               
               if (activeTab.bgConfig.mode === 'transparent') {
                   setStatusMessage('Removing Background...');
                   // Pause timer for post-processing display
                   clearTimer(); 
                   resultUrl = await removeBackground(resultUrl);
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
           }

           setSessionImages(prev => [resultUrl, ...prev]);
           setGeneratedImage(resultUrl);
       }
    } catch (e: any) {
       if (e.name !== 'AbortError') {
          console.error(e);
          alert(`Generation failed: ${e.message}`);
          logConsole(`ERROR: ${e.message}`);
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
    handleCancel,
    abortControllerRef
  };
};
