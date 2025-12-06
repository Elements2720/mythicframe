
import { useState, useRef } from 'react';
import { generateIllustration, editImage } from '../services/geminiService';
import { removeBackground, createCompositeImage } from '../utils/imageUtils';
import { buildOutpaintPrompt, buildBackgroundRegenPrompt } from '../services/promptTemplates';
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
  logConsole: (msg: string) => void,
  getTargetDimensions: () => PixelDimensions
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
     if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
     setIsGenerating(false); setStatusMessage('');
  };

  const handleGenerate = async (append = false) => {
    // Validation
    if (activeTab.mode === 'resize') {
       if (!activeTab.selectedResizeId) return; 
    } else if (activeTab.mode === 'bg-replace') {
       if (!activeTab.selectedBgReplaceId) return;
    } else {
       if (!activeTab.prompt && !activeTab.generatedImage) return; 
    }

    if (!apiKeyReady) { alert("Please connect your API Key in settings."); return; }

    setIsGenerating(true);
    setStatusMessage('Initializing...');
    abortControllerRef.current = new AbortController();
    
    if (!append) setSessionImages(() => []);

    try {
       const styleSnippet = activeTab.selectedStyleId !== 'none' ? ART_STYLES.find((s:any) => s.id === activeTab.selectedStyleId)?.promptSnippet || '' : '';
       const model = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_2_5;
       const count = (append || ['resize', 'animation', 'fullcard', 'bg-replace'].includes(activeTab.mode)) ? 1 : batchSize;

       for (let i = 0; i < count; i++) {
           if (abortControllerRef.current?.signal.aborted) break;
           setStatusMessage(count > 1 ? `Generating ${i+1}/${count}...` : 'Generating...');
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

               // History ...

           } else if (activeTab.mode === 'bg-replace') {
               // --- BG REPLACE LOGIC ---
               const item = activeTab.bgReplaceQueue.find((x:any) => x.id === activeTab.selectedBgReplaceId);
               if (!item) throw new Error("Item not found");
               
               // Use item's prompt/config if available (synced to activeTab by selection)
               // The hook ensures activeTab.bgConfig matches selected item.
               const prompt = buildBackgroundRegenPrompt(gameContext, activeTab.bgConfig);
               
               logConsole(`[BG-REPLACE] ${prompt}`);
               // Note: activeTab.prompt is the user's specific instruction for the background
               // buildBackgroundRegenPrompt uses bgConfig.promptFragment usually, but if user typed in main prompt box, we can append it?
               // Actually buildBackgroundRegenPrompt uses bgConfig properties. The "Prompt" input in UI maps to bgConfig.promptFragment or generic prompt?
               // Let's assume activeTab.bgConfig is fully populated.
               
               // We need to pass the prompt which includes user text.
               // We pass activeTab.prompt as the explicit text instruction if generic prompt is needed.
               // But editImage takes prompt string.
               
               resultUrl = await editImage(item.url, prompt, activeTab.bgConfig, gameContext);
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

           } else if (activeTab.isEditMode && activeTab.generatedImage) {
               // --- EDIT LOGIC ---
               resultUrl = await editImage(activeTab.generatedImage, activeTab.prompt, activeTab.bgConfig, gameContext);
               finalPrompt = activeTab.prompt;
               // History ...
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
                   resultUrl = await removeBackground(resultUrl);
               }
               // History ...
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
       setIsGenerating(false); setStatusMessage(''); abortControllerRef.current = null;
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
