

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GenerationModel, ImageSize, AspectRatio, ReferenceAsset, BackgroundConfig, GameContext, UIMode, FrameElement, BackgroundPatternType, SafeZoneConfig, ClothesParams } from "../types";
import { 
  buildIllustrationPrompt, 
  buildFramePrompt,
  buildBackgroundPrompt,
  buildClothesPrompt,
  buildBackgroundRegenPrompt, 
  buildStyleAnalysisPrompt, 
  buildPromptSuggestionsPrompt, 
  buildCardSuggestionsPrompt, 
  buildRefinementPrompt
} from "./promptTemplates";
import { optimizeBase64Image } from "../utils/imageUtils";

// Helper to get client
const getClient = () => {
  // Check LocalStorage first for manual override
  const manualKey = typeof window !== 'undefined' ? localStorage.getItem('mythic_api_key') : null;
  const apiKey = manualKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please connect or enter a key in Settings.");
  return new GoogleGenAI({ apiKey });
};

// --- RETRY LOGIC ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message || '';
    // Retry on 500 (Server Error), 503 (Service Unavailable), or generic Network/XHR errors
    const isRetryable = retries > 0 && (
        msg.includes('500') || 
        msg.includes('503') || 
        msg.includes('xhr') || 
        msg.includes('fetch failed') || 
        msg.includes('network') ||
        msg.includes('Rpc failed')
    );
    
    if (isRetryable) {
      console.warn(`API call failed (${msg}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

// Check for AI Studio Key Selection or Manual Key
export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && localStorage.getItem('mythic_api_key')) return true;
  if (process.env.API_KEY) return true;
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

export const verifyManualApiKey = async (key: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: 'Ping' }] }
    }));
    return true;
  } catch (e) {
    console.warn("Key verification failed", e);
    return false;
  }
};

function base64ImageToBase64(dataUrl: string): string {
  if (dataUrl.includes('base64,')) {
    return dataUrl.split('base64,')[1];
  }
  return dataUrl;
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/png';
}

export const analyzeImageStyle = async (base64Image: string): Promise<{ description: string; promptSnippet: string }> => {
  const ai = getClient();
  const prompt = buildStyleAnalysisPrompt();
  
  // Optimize input image for analysis
  const optimizedInput = await optimizeBase64Image(base64Image, 512, 0.7);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: cleanBase64 } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          promptSnippet: { type: Type.STRING }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No analysis returned");
  return JSON.parse(text);
};

export const generateIllustration = async (
  prompt: string,
  model: string,
  size: ImageSize,
  aspectRatio: AspectRatio,
  referenceAssets: ReferenceAsset[],
  bgConfig: BackgroundConfig,
  gameContext: GameContext,
  signal: AbortSignal,
  styleSnippet: string,
  mode: UIMode,
  frameElements: FrameElement[],
  bgPatternType: BackgroundPatternType,
  safeZone?: SafeZoneConfig,
  clothesParams?: ClothesParams
): Promise<{ image: string; metadata: any }> => {
  const ai = getClient();
  
  let finalPrompt = "";
  let parts: any[] = [];

  if (mode === 'frame') {
     finalPrompt = buildFramePrompt(prompt, gameContext, styleSnippet, frameElements);
     parts.push({ text: finalPrompt });
  } else if (mode === 'background') {
     finalPrompt = buildBackgroundPrompt(prompt, gameContext, styleSnippet, bgPatternType);
     parts.push({ text: finalPrompt });
  } else if (mode === 'clothes') {
     const built = buildClothesPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, clothesParams);
     finalPrompt = built.textPrompt;
     parts.push({ text: finalPrompt });
  } else {
     const built = buildIllustrationPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone);
     finalPrompt = built.textPrompt;
     parts.push({ text: finalPrompt });
  }

  // --- ASSET OPTIMIZATION LOOP ---
  if (referenceAssets.length > 0) {
      console.log(`[GeminiService] Optimizing ${referenceAssets.length} reference assets...`);
      for (const ref of referenceAssets) {
         try {
             // Optimize: Max 1024px, 80% JPEG quality
             const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
             parts.push({ 
                inlineData: { 
                  mimeType: getMimeType(optimizedUrl),
                  data: base64ImageToBase64(optimizedUrl)
                } 
             });
         } catch(e) {
             console.warn("Failed to optimize reference asset, sending original.", e);
             parts.push({ 
                inlineData: { 
                  mimeType: getMimeType(ref.url),
                  data: base64ImageToBase64(ref.url)
                } 
             });
         }
      }
  }

  let validAspectRatio = aspectRatio;
  if (aspectRatio === 'custom' || aspectRatio === '21:9') {
     validAspectRatio = '16:9';
  }

  const imageConfig: any = {
     aspectRatio: validAspectRatio
  };

  if (model === GenerationModel.PRO_3) {
     imageConfig.imageSize = size;
  }

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: model,
    contents: { parts },
    config: { imageConfig }
  }));

  // --- ROBUST RESPONSE HANDLING ---
  if (!response.candidates || response.candidates.length === 0) {
      throw new Error("Generation failed: No candidates returned. Request likely blocked by safety filters.");
  }

  const candidate = response.candidates[0];
  let base64Image = "";
  let textPart = "";

  if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
              base64Image = part.inlineData.data;
              break;
          }
          if (part.text) {
              textPart += part.text;
          }
      }
  }

  if (!base64Image) {
      // Check finish reason if no image found
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(`Generation blocked. Reason: ${candidate.finishReason}. ${textPart}`);
      }
      throw new Error(textPart || "No image generated. The model response was empty or contained only text.");
  }

  return {
    image: `data:image/png;base64,${base64Image}`,
    metadata: { fullPrompt: finalPrompt }
  };
};

export const editImage = async (
  base64Image: string,
  prompt: string,
  bgConfig: BackgroundConfig | undefined,
  gameContext: GameContext
): Promise<string> => {
  const ai = getClient();
  
  // Optimize input image for editing (Max 1024 to keep speed high)
  const optimizedInput = await optimizeBase64Image(base64Image, 1024, 0.9);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  let finalPrompt = prompt;
  if (!finalPrompt && bgConfig) {
      finalPrompt = buildBackgroundRegenPrompt(gameContext, bgConfig);
  }

  // Fallback to ensure prompt is never empty (API requires at least one text part usually)
  if (!finalPrompt || finalPrompt.trim() === "") {
      finalPrompt = "Edit this image.";
  }

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
     model: 'gemini-2.5-flash-image', 
     contents: {
       parts: [
         { inlineData: { mimeType: mimeType, data: cleanBase64 } },
         { text: finalPrompt }
       ]
     }
  }));

  // --- ERROR HANDLING ---
  if (!response.candidates || response.candidates.length === 0) throw new Error("No response from edit model.");
  
  let resultImage = "";
  let textPart = "";

  const candidate = response.candidates[0];
  if (candidate.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        resultImage = part.inlineData.data;
        break;
      }
      if (part.text) textPart += part.text;
    }
  }

  if (!resultImage) {
      const reason = candidate.finishReason || 'Unknown';
      throw new Error(`Edit failed (${reason}): ${textPart}`);
  }
  
  return `data:image/png;base64,${resultImage}`;
};

export const generateCardSuggestions = async (
  artPrompt: string,
  currentName: string
): Promise<{ names: string[]; effects: string[] }> => {
  const ai = getClient();
  const prompt = buildCardSuggestionsPrompt(artPrompt, currentName);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          names: { type: Type.ARRAY, items: { type: Type.STRING } },
          effects: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) return { names: [], effects: [] };
  try {
     return JSON.parse(text);
  } catch {
     return { names: [], effects: [] };
  }
};

export const refinePrompt = async (currentPrompt: string): Promise<string> => {
  const ai = getClient();
  const prompt = buildRefinementPrompt(currentPrompt);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || currentPrompt;
};
