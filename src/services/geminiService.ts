
// Service for interacting with Gemini API
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GenerationModel, ImageSize, AspectRatio, ReferenceAsset, BackgroundConfig, GameContext, UIMode, FrameElement, BackgroundPatternType, SafeZoneConfig, ClothesParams, ChibiProportion, ChibiConfig, AIConfig, PoseData, MapGridConfig, AvailableModel } from "../types";
import { 
  buildIllustrationPrompt, 
  buildFramePrompt,
  buildBackgroundAssetPrompt,
  buildClothesPrompt,
  buildBackgroundRegenPrompt, 
  buildStyleAnalysisPrompt, 
  buildPromptSuggestionsPrompt, 
  buildCardSuggestionsPrompt, 
  buildRefinementPrompt,
  buildPoseStudioPrompt,
  buildMapGridPrompt,
  buildSpriteSheetPromptsPrompt,
  buildSpriteSheetAnimationPromptsPrompt
} from "./promptTemplates";
import { optimizeBase64Image, blobUrlToBase64 } from "../utils/imageUtils";

// Dynamic API key resolution with priority:
// 1. Browser localStorage ('mythic_gemini_api_key')
// 2. Real environment variable (process.env.API_KEY / GEMINI_API_KEY, ignoring placeholders)
export const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('mythic_gemini_api_key');
    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  }
  const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY') {
    return envKey;
  }
  return '';
};

export const getApiKeySource = (): 'local' | 'env' | 'aistudio' | 'placeholder' | 'none' => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('mythic_gemini_api_key');
    if (localKey && localKey.trim()) return 'local';
  }
  const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY') return 'env';
  if (envKey === 'PLACEHOLDER_API_KEY') return 'placeholder';
  if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) return 'aistudio';
  return 'none';
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('mythic_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('mythic_gemini_api_key');
    }
  }
};

export const clearStoredApiKey = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mythic_gemini_api_key');
  }
};

export const getSelectedModel = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mythic_selected_model');
    if (saved && saved.trim()) return saved.trim();
  }
  return '';
};

export const setSelectedModel = (modelId: string): void => {
  if (typeof window !== 'undefined') {
    if (modelId && modelId.trim()) {
      localStorage.setItem('mythic_selected_model', modelId.trim());
    } else {
      localStorage.removeItem('mythic_selected_model');
    }
  }
};

export const fetchAvailableModels = async (): Promise<AvailableModel[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No API key configured. Please set your Gemini API key in Settings first.");
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Failed to fetch models from Gemini API: ${errorMsg}`);
  }

  const data = await res.json();
  const rawModels: any[] = data.models || [];

  const models: AvailableModel[] = rawModels.map(m => {
    const cleanId = (m.name || '').replace(/^models\//, '');
    const methods: string[] = m.supportedGenerationMethods || [];
    const isImage = cleanId.includes('image') || 
                    cleanId.includes('imagen') || 
                    methods.includes('generateImages');

    return {
      id: cleanId,
      displayName: m.displayName || cleanId,
      description: m.description,
      supportedMethods: methods,
      isImageModel: isImage
    };
  });

  // Sort so image models come first
  models.sort((a, b) => {
    if (a.isImageModel && !b.isImageModel) return -1;
    if (!a.isImageModel && b.isImageModel) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return models;
};

// Helper to get client with strict adherence to Coding Guidelines
const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key found. Please provide an API key in Settings or set GEMINI_API_KEY in .env.local.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to get effective model name
const getModelName = (defaultModel: string): string => {
  const selectedCustom = getSelectedModel();
  if (selectedCustom) {
    return selectedCustom;
  }
  const savedConfig = localStorage.getItem('mythic_ai_config');
  if (savedConfig) {
    try {
      const config: AIConfig = JSON.parse(savedConfig);
      if (config.provider === 'custom' && config.customModelName) {
        return config.customModelName;
      }
    } catch (e) {}
  }
  return defaultModel;
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
        if (typeof window !== 'undefined' && (window as any).aistudio && (window as any).aistudio.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
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
  const key = getApiKey();
  if (key) return true;
  if (typeof window !== 'undefined' && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async (): Promise<void> => {
  if (typeof window !== 'undefined' && (window as any).aistudio && (window as any).aistudio.openSelectKey) {
    await (window as any).aistudio.openSelectKey();
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
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = buildStyleAnalysisPrompt();
  
  const optimizedInput = await optimizeBase64Image(base64Image, 512, 0.7);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-pro-preview'),
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

export const generateStyleExample = async (snippet: string, subject?: string): Promise<string> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const defaultSubject = "A majestic high-fantasy knight standing in a heroic pose, holding a glowing sword, detailed armor";
  const finalPrompt = `${subject || defaultSubject}${snippet}`;
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-2.5-flash-image'),
    contents: { parts: [{ text: finalPrompt }] },
    config: {
      imageConfig: { aspectRatio: '1:1' },
      systemInstruction: "You are a style showcase tool. Generate ONLY the image matching the style snippet provided."
    }
  }));

  const candidate = response.candidates[0];
  let base64Image = "";
  if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
              base64Image = part.inlineData.data;
              break;
          }
      }
  }

  if (!base64Image) throw new Error("Style example generation failed.");
  return `data:image/png;base64,${base64Image}`;
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
  clothesParams?: ClothesParams,
  continuityFlags?: Record<string, boolean>,
  chibiProportion?: ChibiProportion,
  chibiConfig?: ChibiConfig,
  poseData?: PoseData,
  mapGridConfig?: MapGridConfig,
  viewpoint?: string,
  noCharacters?: boolean,
  framing?: 'full-body' | 'waist-up' | 'bust' | 'head-only',
  seed?: number | null
): Promise<{ image: string; metadata: any }> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const activeModel = getModelName(model);
  
  let finalPrompt = "";
  let parts: any[] = [];
  let referenceParts: { text?: string }[] = [];

  if (mode === 'frame') {
     finalPrompt = buildFramePrompt(prompt, gameContext, styleSnippet, frameElements);
     parts.push({ text: finalPrompt });
  } else if (mode === 'background') {
     finalPrompt = buildBackgroundAssetPrompt(prompt, gameContext, styleSnippet, bgPatternType);
     parts.push({ text: finalPrompt });
  } else if (mode === 'clothes') {
     const built = buildClothesPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, clothesParams);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
     parts.push({ text: finalPrompt });
  } else if (mode === 'pose-studio' && poseData) {
     const built = buildPoseStudioPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, poseData, safeZone);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
     parts.push({ text: finalPrompt });
  } else if (mode === 'map-grid' && mapGridConfig) {
     finalPrompt = buildMapGridPrompt(prompt, gameContext, styleSnippet, mapGridConfig);
     parts.push({ text: finalPrompt });
  } else {
     const built = buildIllustrationPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, continuityFlags, chibiProportion, chibiConfig, viewpoint, noCharacters, framing);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
     parts.push({ text: finalPrompt });
  }

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

  // Detect if user is requesting photorealism to override cartoon bias
  const isPhotorealistic = finalPrompt.toLowerCase().includes('photorealistic') || finalPrompt.toLowerCase().includes('raw photo') || finalPrompt.toLowerCase().includes('lifelike');

  // CRITICAL: Clean up newline characters and multi-spaces from the final prompt
  // as many image generation APIs fail or exhibit unexpected behavior with multiline strings.
  const sanitizedPrompt = finalPrompt.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

  const configObj: any = {
    imageConfig,
    systemInstruction: `You are a specialized game asset generator. 
[STRICT RULES]:
1. NEVER respond with text, conversation, or helpful introductions.
2. ONLY output image data.
3. ABSOLUTELY NO TEXT INSIDE THE IMAGE. No labels, no names, no watermarks, no signatures, no UI elements.
4. If a reference is provided, you MUST PRESERVE character identity, including facial structure and skin color.
4. If a "Structural Template" or "Mannequin" role is assigned, do NOT change the pose or body proportions.
5. If a "Style Lock" is assigned, IGNORE default realistic textures. Use only the provided art style.
6. If in "POSE-DRIVEN" mode, you MUST treat the provided coordinates as absolute spatial anchors. The character's joints MUST be placed at those exact pixels.
7. If in "MAP-GRID" mode, you MUST NEVER add characters, UI, HUD, or perspective beyond the selected view. Align strictly to the grid and environment directives.
${isPhotorealistic ? '8. [PHOTOREALISM OVERRIDE]: You MUST produce a lifelike photograph. NO 2D art, NO anime, NO drawing, NO digital painting textures. Use RAW camera characteristics.' : '8. Strictly follow the user\'s SUBJECT. If the subject is an object, monster, or landscape, do NOT add human characters.'}`
  };
  
  // Gemini 2.5 uses top-level seed while imagen 3 might use something else! 
  // we add it to both places to be safe and compatible with the dynamic AI configurations since typing is 'any'
  if (seed !== undefined && seed !== null) {
      configObj.seed = seed;
  }

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: activeModel,
    contents: { parts: [{ text: sanitizedPrompt }, ...parts.slice(1)] },
    config: configObj
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
          // Provide actionable advice for common block reasons
          if (candidate.finishReason === 'IMAGE_OTHER') {
              throw new Error("The AI was unable to finalize this image due to internal safety policies or an edge case. Try slightly changing your prompt, subject, or pose description to proceed.");
          }
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
  // CRITICAL: Always create instance right before call as per Coding Guidelines
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

  // Sanitize prompt for API compatibility
  const sanitizedPrompt = finalPrompt.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

  const parts: any[] = [
    { inlineData: { mimeType: mimeType, data: cleanBase64 } }
  ];

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

  parts.push({ text: sanitizedPrompt });

  const isPhotorealistic = finalPrompt.toLowerCase().includes('photorealistic') || finalPrompt.toLowerCase().includes('raw photo') || finalPrompt.toLowerCase().includes('lifelike');

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
     model: getModelName('gemini-2.5-flash-image'), 
     contents: { parts },
     config: {
       systemInstruction: `You are an image editing tool. NEVER respond with text. ONLY return image data. Adhere strictly to the requested style and structure. PRESERVE character skin color and features. ${isPhotorealistic ? '[MANDATORY]: Use extreme photorealism. No drawing/painting artifacts.' : ''}`
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
      if (candidate.finishReason === 'IMAGE_OTHER') {
          throw new Error("The edit was blocked due to an internal safety filter. Try adjusting your description or masking region.");
      }
      throw new Error(`Edit failed: ${textPart}`);
  }
  
  return `data:image/png;base64,${resultImage}`;
};

export const enhanceImage = async (
  base64Image: string,
  gameContext: GameContext
): Promise<string> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const optimizedInput = await optimizeBase64Image(base64Image, 1024, 1.0);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const prompt = `ENHANCE AND REFINE THIS IMAGE. 1. QUALITY: Sharpen all lines, improve visual fidelity, and add high-end professional textures. 2. DETAILS: Refine small details like jewelry, eyes, fabric folds, and lighting effects. 3. CONSISTENCY (MANDATORY): DO NOT change the subject, pose, composition, hair color, eye color, or overall character design. 4. FINISH: Make this look like a 4K resolution finished game asset. Setting Context: ${gameContext.setting || 'High Fantasy'}. Tone: ${gameContext.tone || 'Epic'}.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
     model: getModelName('gemini-2.5-flash-image'), 
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

  if (!resultImage) throw new Error("Enhancement failed to produce an image. This can happen with highly complex scenes.");
  return `data:image/png;base64,${resultImage}`;
};

export const generateCardSuggestions = async (
  artPrompt: string,
  currentName: string
): Promise<{ names: string[]; effects: string[] }> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = buildCardSuggestionsPrompt(artPrompt, currentName);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-flash-preview'),
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
  // CRITICAL: Always create instance right before call as per Coding Guidelines
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
    model: getModelName('gemini-3-flash-preview'),
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
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = `Based on the character "${name}" (${subtitle}, ${gender}) in a game world with this context:
Setting: ${context.setting}
Tone: ${context.tone}
Constraints: ${context.visualConstraints}

Suggest a detailed physical description (visual traits) that can be used as a master AI prompt for consistent art generation. 
Focus on: hairstyle/color, eyes, armor/clothing style, signature items, and distinctive marks.
Respond with ONLY the description text, under 60 words.`;

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-flash-preview'),
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || "";
};

export const refinePrompt = async (currentPrompt: string): Promise<string> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = buildRefinementPrompt(currentPrompt);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-flash-preview'),
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || currentPrompt;
};

export const generateSpriteSheetPrompts = async (
  globalPrompt: string,
  frameCount: number,
  gameContext: GameContext
): Promise<{ poses: string[]; refinedGlobalPrompt: string }> => {
  const ai = getClient();
  const prompt = buildSpriteSheetPromptsPrompt(globalPrompt, frameCount, gameContext);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-flash-preview'),
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          poses: { type: Type.ARRAY, items: { type: Type.STRING } },
          refinedGlobalPrompt: { type: Type.STRING }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) return { poses: [], refinedGlobalPrompt: globalPrompt };
  return JSON.parse(text);
};

export const generateSpriteSheetAnimationPrompts = async (
  globalPrompt: string,
  animationGoal: string,
  frameCount: number,
  gameContext: GameContext
): Promise<{ poses: string[]; refinedGlobalPrompt: string }> => {
  const ai = getClient();
  const prompt = buildSpriteSheetAnimationPromptsPrompt(globalPrompt, animationGoal, frameCount, gameContext);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3-flash-preview'),
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          poses: { type: Type.ARRAY, items: { type: Type.STRING } },
          refinedGlobalPrompt: { type: Type.STRING }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) return { poses: [], refinedGlobalPrompt: globalPrompt };
  return JSON.parse(text);
};
