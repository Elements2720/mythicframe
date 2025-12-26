import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GenerationModel, ImageSize, AspectRatio, ReferenceAsset, BackgroundConfig, GameContext, UIMode, FrameElement, BackgroundPatternType, SafeZoneConfig, ClothesParams, ChibiProportion, ChibiConfig } from "../types";
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
import { optimizeBase64Image, blobUrlToBase64 } from "../utils/imageUtils";

// Helper to get client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found. Please connect an API key.");
  return new GoogleGenAI({ apiKey });
};

// --- RETRY LOGIC ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message || '';
    const isRetryable = retries > 0 && (
        msg.includes('500') || 
        msg.includes('503') || 
        msg.includes('xhr') || 
        msg.includes('fetch failed') || 
        msg.includes('network') ||
        msg.includes('Rpc failed')
    );
    
    if (msg.includes("Requested entity was not found")) {
        if (window.aistudio && window.aistudio.openSelectKey) {
            await window.aistudio.openSelectKey();
        }
    }

    if (isRetryable) {
      console.warn(`API call failed (${msg}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
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
      model: 'gemini-3-flash-preview',
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

// generateIllustration with enhanced system logic for structural and stylistic strictly adherence
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
  clothesParams?: ClothesParams,
  continuityFlags?: Record<string, boolean>,
  chibiProportion?: ChibiProportion,
  chibiConfig?: ChibiConfig
): Promise<{ image: string; metadata: any }> => {
  const ai = getClient();
  
  let finalPrompt = "";
  let parts: any[] = [];
  let referenceParts: { text?: string }[] = [];

  if (mode === 'frame') {
     finalPrompt = buildFramePrompt(prompt, gameContext, styleSnippet, frameElements);
     parts.push({ text: finalPrompt });
  } else if (mode === 'background') {
     finalPrompt = buildBackgroundPrompt(prompt, gameContext, styleSnippet, bgPatternType);
     parts.push({ text: finalPrompt });
  } else if (mode === 'clothes') {
     const built = buildClothesPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, clothesParams);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
     parts.push({ text: finalPrompt });
  } else {
     const built = buildIllustrationPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, continuityFlags, chibiProportion, chibiConfig);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
     parts.push({ text: finalPrompt });
  }

  // Inject Reference Guidance (Role Metadata)
  if (referenceParts.length > 0) {
      parts.push(...referenceParts);
  }

  if (referenceAssets.length > 0) {
      for (const ref of referenceAssets) {
         try {
             const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
             parts.push({ 
                inlineData: { 
                  mimeType: getMimeType(optimizedUrl),
                  data: base64ImageToBase64(optimizedUrl)
                } 
             });
         } catch(e) {
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
    config: { 
      imageConfig,
      systemInstruction: `You are a specialized game asset image generator. 
[STRICT RULES]:
1. NEVER respond with text, conversation, or helpful introductions.
2. ONLY output image data.
3. If a reference is provided, you MUST PRESERVE character identity, including facial structure and skin color.
4. If a "Structural Template" or "Mannequin" role is assigned, do NOT change the pose or body proportions.
5. If a "Style Lock" is assigned, IGNORE default realistic textures. Use only the provided art style.
6. Generate ONLY one character/subject unless explicitly told otherwise.`
    }
  }));

  if (!response.candidates || response.candidates.length === 0) {
      throw new Error("Generation failed: No candidates returned.");
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
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          throw new Error(`Generation blocked. Reason: ${candidate.finishReason}. ${textPart}`);
      }
      throw new Error(textPart || "No image generated.");
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
  gameContext: GameContext,
  referenceAssets: ReferenceAsset[] = []
): Promise<string> => {
  const ai = getClient();
  const optimizedInput = await optimizeBase64Image(base64Image, 1024, 0.9);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  let finalPrompt = prompt;
  if (!finalPrompt && bgConfig) {
      finalPrompt = buildBackgroundRegenPrompt(gameContext, bgConfig);
  }

  if (!finalPrompt || finalPrompt.trim() === "") {
      finalPrompt = "Edit this image.";
  }

  const parts: any[] = [
    { inlineData: { mimeType: mimeType, data: cleanBase64 } }
  ];

  // Include Reference Images in Edit Request
  if (referenceAssets.length > 0) {
    for (const ref of referenceAssets) {
      try {
        const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
        parts.push({
          inlineData: {
            mimeType: getMimeType(optimizedUrl),
            data: base64ImageToBase64(optimizedUrl)
          }
        });
      } catch (e) {
        parts.push({
          inlineData: {
            mimeType: getMimeType(ref.url),
            data: base64ImageToBase64(ref.url)
          }
        });
      }
    }
  }

  parts.push({ text: finalPrompt });

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
     model: 'gemini-2.5-flash-image', 
     contents: { parts },
     config: {
       systemInstruction: "You are an image editing tool. NEVER respond with text. ONLY return image data. Adhere strictly to the requested style and structure. PRESERVE character skin color and features."
     }
  }));

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
      throw new Error(`Edit failed: ${textPart}`);
  }
  
  return `data:image/png;base64,${resultImage}`;
};

/**
 * Enhanced Details Refinement
 * Re-runs the image through a detail-oriented prompt to sharpen and improve quality.
 */
export const enhanceImage = async (
  base64Image: string,
  gameContext: GameContext
): Promise<string> => {
  const ai = getClient();
  const optimizedInput = await optimizeBase64Image(base64Image, 1024, 1.0);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const prompt = `ENHANCE AND REFINE THIS IMAGE.
1. QUALITY: Sharpen all lines, improve visual fidelity, and add high-end professional digital painting textures.
2. DETAILS: Refine small details like jewelry, eyes, fabric folds, and lighting effects.
3. CONSISTENCY (MANDATORY): DO NOT change the subject, pose, composition, hair color, eye color, or overall character design.
4. FINISH: Make this look like a 4K resolution finished game asset.
Setting Context: ${gameContext.setting || 'High Fantasy'}. Tone: ${gameContext.tone || 'Epic'}.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
     model: 'gemini-2.5-flash-image', 
     contents: {
       parts: [
         { inlineData: { mimeType: mimeType, data: cleanBase64 } },
         { text: prompt }
       ]
     },
     config: {
       systemInstruction: "You are an image enhancement engine. NEVER speak. ONLY return enhanced image data."
     }
  }));

  if (!response.candidates || response.candidates.length === 0) throw new Error("No response from enhancement model.");
  
  let resultImage = "";
  const candidate = response.candidates[0];
  if (candidate.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        resultImage = part.inlineData.data;
        break;
      }
    }
  }

  if (!resultImage) throw new Error("Enhancement failed to produce an image.");
  return `data:image/png;base64,${resultImage}`;
};

export const generateCardSuggestions = async (
  artPrompt: string,
  currentName: string
): Promise<{ names: string[]; effects: string[] }> => {
  const ai = getClient();
  const prompt = buildCardSuggestionsPrompt(artPrompt, currentName);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

export const generateCharacterConcept = async (
  context: GameContext
): Promise<{ name: string; subtitle: string; gender: string; traits: string }> => {
  const ai = getClient();
  const prompt = `Based on the following game world context, suggest a new unique character concept.
Setting: ${context.setting}
Tone: ${context.tone}
Constraints: ${context.visualConstraints}

Return a JSON object with:
- "name": A cool name for the character.
- "subtitle": A title or alias (e.g. "The Frozen Queen").
- "gender": Gender/Class identity (e.g. "Female Archer").
- "traits": A detailed physical description (under 50 words) for an AI master prompt focusing on clothing, hair, and features.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          gender: { type: Type.STRING },
          traits: { type: Type.STRING }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("No concept returned");
  return JSON.parse(text);
};

export const generateCharacterTraits = async (
  name: string,
  subtitle: string,
  gender: string,
  context: GameContext
): Promise<string> => {
  const ai = getClient();
  const prompt = `Based on the character "${name}" (${subtitle}, ${gender}) in a game world with this context:
Setting: ${context.setting}
Tone: ${context.tone}
Constraints: ${context.visualConstraints}

Suggest a detailed physical description (visual traits) that can be used as a master AI prompt for consistent art generation. 
Focus on: hairstyle/color, eyes, armor/clothing style, signature items, and distinctive marks.
Respond with ONLY the description text, under 60 words.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || "";
};

export const refinePrompt = async (currentPrompt: string): Promise<string> => {
  const ai = getClient();
  const prompt = buildRefinementPrompt(currentPrompt);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || currentPrompt;
};