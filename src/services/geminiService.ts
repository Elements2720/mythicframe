
// Service for interacting with Gemini API
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GenerationModel, ImageSize, AspectRatio, ReferenceAsset, BackgroundConfig, GameContext, UIMode, FrameElement, BackgroundPatternType, SafeZoneConfig, ClothesParams, ChibiProportion, ChibiConfig, AIConfig, PoseData, MapGridConfig, AvailableModel, SpriteStripConfig } from "../types";
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
  buildSpriteSheetAnimationPromptsPrompt,
  buildAnimationStripPrompt,
  buildUIScenePrompt
} from "./promptTemplates";
import { optimizeBase64Image, blobUrlToBase64 } from "../utils/imageUtils";
import { DEFAULT_BACKGROUND_CONFIG } from "../constants";

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

export const getApiKeySource = (): 'local' | 'env' | 'placeholder' | 'none' => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('mythic_gemini_api_key');
    if (localKey && localKey.trim()) return 'local';
  }
  const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envKey && envKey !== 'PLACEHOLDER_API_KEY') return 'env';
  if (envKey === 'PLACEHOLDER_API_KEY') return 'placeholder';
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

export const isFatalQuotaOrBillingError = (err: any): { isFatal: boolean; message: string } => {
  if (!err) return { isFatal: false, message: '' };
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.statusCode || err.code;

  if (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('exceeded your current quota')
  ) {
    return {
      isFatal: true,
      message: 'Google Gemini API Quota Exhausted / $0 Balance (429 RESOURCE_EXHAUSTED): Your API key has no remaining quota or billing credits. Switch to BEI Mode in Settings to generate unlimited images directly through your browser session with 0 API cost!'
    };
  }

  if (
    status === 403 ||
    status === 401 ||
    msg.includes('permission_denied') ||
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('billing not enabled') ||
    msg.includes('billing is required')
  ) {
    return {
      isFatal: true,
      message: 'Google Gemini Authorization / Billing Error: The API key is invalid or lacks billing permissions. Switch to BEI Mode in Settings to generate free assets via your active browser session!'
    };
  }

  return { isFatal: false, message: '' };
};

// --- RETRY LOGIC ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const fatalCheck = isFatalQuotaOrBillingError(error);
    if (fatalCheck.isFatal) {
      throw new Error(fatalCheck.message);
    }

    const msg = error.message || '';
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

export const checkApiKey = async (): Promise<boolean> => {
  const key = getApiKey();
  return Boolean(key);
};

export const requestApiKey = async (): Promise<void> => {
  // Handled via Settings modal
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

export function extractImageFromInteraction(interaction: any): string {
  // 1. Direct output_image accessor on Interaction
  if (interaction?.output_image?.data) {
    const mime = interaction.output_image.mime_type || 'image/png';
    return `data:${mime};base64,${interaction.output_image.data}`;
  }

  // 2. Interaction steps traversal
  if (Array.isArray(interaction?.steps)) {
    for (const step of interaction.steps) {
      if (Array.isArray(step?.content)) {
        for (const item of step.content) {
          if (item?.type === 'image' && item?.data) {
            const mime = item.mime_type || 'image/png';
            return `data:${mime};base64,${item.data}`;
          }
        }
      }
    }
  }

  // 3. Fallback for legacy candidate parts
  if (Array.isArray(interaction?.candidates)) {
    for (const cand of interaction.candidates) {
      if (Array.isArray(cand?.content?.parts)) {
        for (const part of cand.content.parts) {
          if (part?.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return `data:${mime};base64,${part.inlineData.data}`;
          }
        }
      }
    }
  }

  return "";
}

export const analyzeImageStyle = async (base64Image: string): Promise<{ description: string; promptSnippet: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      description: "Stylized fantasy concept art with rich dynamic lighting, defined silhouette, and vibrant palette.",
      promptSnippet: "detailed digital painting, high fantasy game art, atmospheric volumetric lighting, masterwork composition"
    };
  }

  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = buildStyleAnalysisPrompt();
  
  const optimizedInput = await optimizeBase64Image(base64Image, 512, 0.7);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
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
  const apiKey = getApiKey();
  if (!apiKey) {
    const defaultSubject = "A majestic high-fantasy knight standing in a heroic pose, holding a glowing sword, detailed armor";
    const finalPrompt = `${subject || defaultSubject}, ${snippet}`;
    const { generateWithActiveProvider } = await import('./aiProviderService');
    const result = await generateWithActiveProvider({
      prompt: finalPrompt,
      model: '',
      size: '1K',
      aspectRatio: '1:1',
      referenceAssets: [],
      bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: 'solid', color: '#000000' },
      gameContext: { setting: '', tone: '', visualConstraints: '' },
      signal: new AbortController().signal,
      styleSnippet: snippet,
      mode: 'illustration',
      frameElements: [],
      bgPatternType: 'scene',
    });
    return result.image;
  }

  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const defaultSubject = "A majestic high-fantasy knight standing in a heroic pose, holding a glowing sword, detailed armor";
  const finalPrompt = `${subject || defaultSubject}${snippet}`;
  const activeModel = getModelName(GenerationModel.FLASH_3_1);

  // 1. Try standard models.generateContent with imageConfig first
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: activeModel,
      contents: [{ text: finalPrompt }],
      config: {
        systemInstruction: "You are a style showcase tool. Generate ONLY the image matching the style snippet provided.",
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
    }));
    const base64Image = extractImageFromInteraction(response);
    if (base64Image) return base64Image;
  } catch (err: any) {
    const fatal = isFatalQuotaOrBillingError(err);
    if (fatal.isFatal) {
      throw new Error(fatal.message);
    }
    console.warn("models.generateContent image attempt in generateStyleExample fell back to interactions:", err?.message || err);
  }

  // 2. Fallback to interactions.create
  const interaction = await callWithRetry(() => ai.interactions.create({
    model: activeModel,
    input: [{ type: 'text', text: finalPrompt }],
    system_instruction: "You are a style showcase tool. Generate ONLY the image matching the style snippet provided.",
    response_format: {
      type: 'image',
      aspect_ratio: '1:1'
    }
  }));

  const base64Image = extractImageFromInteraction(interaction);
  if (!base64Image) throw new Error("Style example generation failed.");
  return base64Image;
};

export const suggestAttackAction = async (charDesc: string, frameCount: number, base64Image?: string): Promise<{ action: string }> => {
  const ai = getClient();
  let parts: any[] = [];
  
  if (base64Image) {
     const optimizedInput = await optimizeBase64Image(base64Image, 512, 0.7);
     const cleanBase64 = base64ImageToBase64(optimizedInput);
     const mimeType = getMimeType(optimizedInput);
     parts.push({ inlineData: { mimeType: mimeType, data: cleanBase64 } });
  }

  const prompt = `Analyze the character description (and image if provided). Identify any weapons they might be holding or are described as having. Based on that weapon (or their hands/magic if unarmed), suggest a highly specific, logical attack animation prompt for a sprite sheet. 
Crucially, describe the progression of the animation step-by-step across EXACTLY ${frameCount} frames, moving from left to right (e.g., from idle windup, to strike, to follow-through).
DO NOT use the word "or" in your suggestions. Be absolute and definitive in EACH frame's description. You MUST describe exactly ${frameCount} consecutive frames (Frame 1 to Frame ${frameCount}).
Character Description: ${charDesc}
Examples for Sword (4 frames): "Animation sequence: Frame 1 idle stance, Frame 2 raising sword back for strike, Frame 3 swinging sword in intense downward arc, Frame 4 follow-through and recovering"
Example for Spear/Trident (4 frames): "Animation sequence: Frame 1 idle stance holding weapon, Frame 2 pulling weapon back to thrust, Frame 3 violently thrusting weapon forward, Frame 4 returning to idle stance"
Example for Bow (4 frames): "Animation sequence: Frame 1 holding bow down, Frame 2 knocking arrow, Frame 3 drawing bowstring fully back, Frame 4 releasing arrow"
Return only the action string in the JSON payload.`;

  parts.push({ text: prompt });

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING }
        }
      }
    }
  }));

  const text = response.text;
  if (!text) return { action: "attacking" };
  return JSON.parse(text);
};

export const analyzeCharacterDesign = async (base64Image: string): Promise<{ charDesc: string, weapon: string, action: string }> => {
  const ai = getClient();
  const prompt = `Analyze this character reference image. Extract three things for an animation prompt:
1. charDesc: A short, concise visual description of the character's physical appearance and clothing (e.g. "red-haired knight in silver armor"). Keep it simple.
2. weapon: Any weapon or prop they are holding. If none, write "none".
3. action: A plausible action they could be performing based on the image (e.g. "running cycle", "attacking with sword", "idle breathing").`;
  
  const optimizedInput = await optimizeBase64Image(base64Image, 512, 0.7);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
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
          charDesc: { type: Type.STRING },
          weapon: { type: Type.STRING },
          action: { type: Type.STRING }
        },
        required: ["charDesc", "weapon", "action"]
      }
    }
  }));

  const responseText = response.text;
  if (!responseText) throw new Error("No analysis returned");
  return JSON.parse(responseText);
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
  seed?: number | null,
  spriteStripConfig?: SpriteStripConfig
): Promise<{ image: string; metadata: any }> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const activeModel = getModelName(model || GenerationModel.FLASH_3_1);
  
  let finalPrompt = "";
  let referenceParts: { text?: string }[] = [];

  if (mode === 'frame') {
     finalPrompt = buildFramePrompt(prompt, gameContext, styleSnippet, frameElements);
  } else if (mode === 'background') {
     finalPrompt = buildBackgroundAssetPrompt(prompt, gameContext, styleSnippet, bgPatternType);
  } else if (mode === 'clothes') {
     const built = buildClothesPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, clothesParams);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
  } else if (mode === 'pose-studio' && poseData) {
     const built = buildPoseStudioPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, poseData, safeZone);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
  } else if (mode === 'ui-scene') {
     const built = buildUIScenePrompt(prompt, gameContext, styleSnippet, referenceAssets);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
  } else if (mode === 'map-grid' && mapGridConfig) {
     finalPrompt = buildMapGridPrompt(prompt, gameContext, styleSnippet, mapGridConfig);
  } else if (mode === 'sprite-strip' && spriteStripConfig) {
     const built = buildAnimationStripPrompt(prompt, gameContext, styleSnippet, bgConfig, spriteStripConfig, referenceAssets, chibiProportion, chibiConfig);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
  } else {
     const built = buildIllustrationPrompt(prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, continuityFlags, chibiProportion, chibiConfig, viewpoint, noCharacters, framing);
     finalPrompt = built.textPrompt;
     referenceParts = built.referenceParts;
  }

  // Detect if user is requesting photorealism to override cartoon bias
  const isPhotorealistic = finalPrompt.toLowerCase().includes('photorealistic') || finalPrompt.toLowerCase().includes('raw photo') || finalPrompt.toLowerCase().includes('lifelike');

  // CRITICAL: Clean up newline characters and multi-spaces from the final prompt
  const sanitizedPrompt = finalPrompt.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

  const inputParts: any[] = [];
  inputParts.push({ type: 'text', text: sanitizedPrompt });

  if (referenceParts.length > 0) {
    for (const refPart of referenceParts) {
      if (refPart.text) {
        inputParts.push({ type: 'text', text: refPart.text });
      }
    }
  }

  if (referenceAssets.length > 0) {
    for (const ref of referenceAssets) {
      try {
        const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
        inputParts.push({ 
          type: 'image',
          mime_type: getMimeType(optimizedUrl),
          data: base64ImageToBase64(optimizedUrl)
        });
      } catch (e) {
        inputParts.push({ 
          type: 'image',
          mime_type: getMimeType(ref.url),
          data: base64ImageToBase64(ref.url)
        });
      }
    }
  }

  let validAspectRatio = aspectRatio;
  const supportedRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
  if (aspectRatio === 'custom' || !supportedRatios.includes(aspectRatio)) {
     validAspectRatio = '16:9';
  }

  const responseFormat: any = {
     type: 'image',
     aspect_ratio: validAspectRatio
  };

  if ((activeModel.includes('pro') || activeModel === GenerationModel.PRO_3) && size) {
     responseFormat.image_size = size;
  }

  const systemInstruction = `You are a specialized game asset generator. 
[STRICT RULES]:
1. NEVER respond with text, conversation, or helpful introductions.
2. ONLY output image data.
3. ABSOLUTELY NO TEXT INSIDE THE IMAGE. No labels, no names, no watermarks, no signatures, no UI elements.
4. If a reference is provided, you MUST PRESERVE character identity, including facial structure and skin color.
5. If a "Structural Template" or "Mannequin" role is assigned, do NOT change the pose or body proportions.
6. If a "Style Lock" is assigned, IGNORE default realistic textures. Use only the provided art style.
7. If in "POSE-DRIVEN" mode, you MUST treat the provided coordinates as absolute spatial anchors. The character's joints MUST be placed at those exact pixels.
8. If in "MAP-GRID" mode, you MUST NEVER add characters, UI, HUD, or perspective beyond the selected view. Align strictly to the grid and environment directives.
${isPhotorealistic ? '9. [PHOTOREALISM OVERRIDE]: You MUST produce a lifelike photograph. NO 2D art, NO anime, NO drawing, NO digital painting textures. Use RAW camera characteristics.' : '9. Strictly follow the user\'s SUBJECT. If the subject is an object, monster, or landscape, do NOT add human characters.'}`;

  let base64Image = "";
  let interactionId: string | undefined = undefined;

  // 1. Primary path: models.generateContent with imageConfig (Canonical, resilient to Interactions schema breaking changes)
  try {
    const contents: any[] = [];
    contents.push({ text: sanitizedPrompt });
    if (referenceParts.length > 0) {
      for (const refPart of referenceParts) {
        if (refPart.text) contents.push({ text: refPart.text });
      }
    }
    if (referenceAssets.length > 0) {
      for (const ref of referenceAssets) {
        try {
          const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
          contents.push({
            inlineData: {
              mimeType: getMimeType(optimizedUrl),
              data: base64ImageToBase64(optimizedUrl)
            }
          });
        } catch (e) {
          contents.push({
            inlineData: {
              mimeType: getMimeType(ref.url),
              data: base64ImageToBase64(ref.url)
            }
          });
        }
      }
    }

    const config: any = {
      systemInstruction,
      imageConfig: {
        aspectRatio: validAspectRatio,
        ...(size ? { imageSize: size } : {})
      }
    };
    if (seed !== undefined && seed !== null) {
      config.seed = seed;
    }

    const response = await callWithRetry<any>(async () => {
      return await ai.models.generateContent({
        model: activeModel,
        contents,
        config
      });
    });

    base64Image = extractImageFromInteraction(response);
  } catch (genContentErr: any) {
    const fatal = isFatalQuotaOrBillingError(genContentErr);
    if (fatal.isFatal) {
      throw new Error(fatal.message);
    }
    console.warn("models.generateContent image attempt in generateIllustration encountered issue, attempting interactions fallback:", genContentErr?.message || genContentErr);
  }

  // 2. Fallback path: interactions.create
  if (!base64Image) {
    const requestParams: any = {
      model: activeModel,
      input: inputParts,
      system_instruction: systemInstruction,
      response_format: responseFormat,
    };

    if (seed !== undefined && seed !== null) {
      requestParams.generation_config = { seed };
    }

    const interaction = await callWithRetry<any>(async () => {
      return await ai.interactions.create(requestParams);
    });

    base64Image = extractImageFromInteraction(interaction);
    interactionId = interaction?.id;

    if (!base64Image) {
      const errorText = interaction?.errors?.[0]?.message || interaction?.output_text || "No image generated.";
      throw new Error(errorText);
    }
  }

  return {
    image: base64Image,
    metadata: { fullPrompt: finalPrompt, interactionId }
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
  const activeModel = getModelName(GenerationModel.FLASH_3_1);
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
  const isPhotorealistic = finalPrompt.toLowerCase().includes('photorealistic') || finalPrompt.toLowerCase().includes('raw photo') || finalPrompt.toLowerCase().includes('lifelike');

  const inputParts: any[] = [
    {
      type: 'image',
      mime_type: mimeType,
      data: cleanBase64
    },
    {
      type: 'text',
      text: sanitizedPrompt
    }
  ];

  if (referenceAssets.length > 0) {
    for (const ref of referenceAssets) {
      try {
        const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
        inputParts.push({
          type: 'image',
          mime_type: getMimeType(optimizedUrl),
          data: base64ImageToBase64(optimizedUrl)
        });
      } catch (e) {
        inputParts.push({
          type: 'image',
          mime_type: getMimeType(ref.url),
          data: base64ImageToBase64(ref.url)
        });
      }
    }
  }

  let resultImage = "";

  // 1. Try models.generateContent with image input
  try {
    const contents: any[] = [];
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64
      }
    });
    contents.push({ text: sanitizedPrompt });

    if (referenceAssets.length > 0) {
      for (const ref of referenceAssets) {
        try {
          const optimizedUrl = await optimizeBase64Image(ref.url, 1024, 0.8);
          contents.push({
            inlineData: {
              mimeType: getMimeType(optimizedUrl),
              data: base64ImageToBase64(optimizedUrl)
            }
          });
        } catch (e) {
          contents.push({
            inlineData: {
              mimeType: getMimeType(ref.url),
              data: base64ImageToBase64(ref.url)
            }
          });
        }
      }
    }

    const response = await callWithRetry<any>(() => ai.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction: `You are an image editing tool. NEVER respond with text. ONLY return image data. Adhere strictly to the requested style and structure. PRESERVE character skin color and features. ${isPhotorealistic ? '[MANDATORY]: Use extreme photorealism. No drawing/painting artifacts.' : ''}`,
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
    }));

    resultImage = extractImageFromInteraction(response);
  } catch (e: any) {
    const fatal = isFatalQuotaOrBillingError(e);
    if (fatal.isFatal) {
      throw new Error(fatal.message);
    }
    console.warn("models.generateContent in editImage fell back to interactions:", e?.message || e);
  }

  // 2. Fallback to interactions.create
  if (!resultImage) {
    const interaction = await callWithRetry<any>(() => ai.interactions.create({
      model: activeModel,
      input: inputParts,
      system_instruction: `You are an image editing tool. NEVER respond with text. ONLY return image data. Adhere strictly to the requested style and structure. PRESERVE character skin color and features. ${isPhotorealistic ? '[MANDATORY]: Use extreme photorealism. No drawing/painting artifacts.' : ''}`,
      response_format: { type: 'image' }
    }));

    resultImage = extractImageFromInteraction(interaction);
    if (!resultImage) {
      const errorText = interaction?.errors?.[0]?.message || interaction?.output_text || "Image editing failed.";
      throw new Error(errorText);
    }
  }

  return resultImage;
};

export const enhanceImage = async (
  base64Image: string,
  gameContext: GameContext
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const { editWithActiveProvider } = await import('./aiProviderService');
    const enhancePrompt = `Masterpiece remaster of this image: enhance sharpness, crystal clear details, immaculate shading, beautiful cinematic lighting, 8k resolution, maintain the original composition and subject exactly. Setting: ${gameContext.setting || 'High Fantasy'}.`;
    return await editWithActiveProvider({
      base64Image,
      prompt: enhancePrompt,
      gameContext
    });
  }

  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const activeModel = getModelName(GenerationModel.FLASH_3_1);
  const optimizedInput = await optimizeBase64Image(base64Image, 1024, 1.0);
  const cleanBase64 = base64ImageToBase64(optimizedInput);
  const mimeType = getMimeType(optimizedInput);

  const prompt = `ENHANCE AND REFINE THIS IMAGE. 1. QUALITY: Sharpen all lines, improve visual fidelity, and add high-end professional textures. 2. DETAILS: Refine small details like jewelry, eyes, fabric folds, and lighting effects. 3. CONSISTENCY (MANDATORY): DO NOT change the subject, pose, composition, hair color, eye color, or overall character design. 4. FINISH: Make this look like a 4K resolution finished game asset. Setting Context: ${gameContext.setting || 'High Fantasy'}. Tone: ${gameContext.tone || 'Epic'}.`;

  let resultImage = "";

  // 1. Try models.generateContent first
  try {
    const response = await callWithRetry<any>(() => ai.models.generateContent({
      model: activeModel,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        systemInstruction: "You are an image enhancement engine. NEVER speak. ONLY return enhanced image data.",
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
    }));
    resultImage = extractImageFromInteraction(response);
  } catch (e: any) {
    const fatal = isFatalQuotaOrBillingError(e);
    if (fatal.isFatal) {
      throw new Error(fatal.message);
    }
    console.warn("models.generateContent in enhanceImage fell back to interactions:", e?.message || e);
  }

  // 2. Fallback to interactions.create
  if (!resultImage) {
    const interaction = await callWithRetry<any>(() => ai.interactions.create({
      model: activeModel,
      input: [
        {
          type: 'image',
          mime_type: mimeType,
          data: cleanBase64
        },
        {
          type: 'text',
          text: prompt
        }
      ],
      system_instruction: "You are an image enhancement engine. NEVER speak. ONLY return enhanced image data.",
      response_format: { type: 'image' }
    }));

    resultImage = extractImageFromInteraction(interaction);
    if (!resultImage) {
      const errorText = interaction?.errors?.[0]?.message || interaction?.output_text || "Enhancement failed to produce an image.";
      throw new Error(errorText);
    }
  }

  return resultImage;
};

export const generateCardSuggestions = async (
  artPrompt: string,
  currentName: string
): Promise<{ names: string[]; effects: string[] }> => {
  // CRITICAL: Always create instance right before call as per Coding Guidelines
  const ai = getClient();
  const prompt = buildCardSuggestionsPrompt(artPrompt, currentName);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
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
  const apiKey = getApiKey();
  if (!apiKey) {
    const names = ["Aeloria", "Valerius", "Kaelen", "Lyanna", "Thalor", "Seraphina", "Dravok", "Morrigan"];
    const titles = ["Blade of the Dawn", "Shadow Weaver", "Storm Warden", "Keeper of the Grove", "Arcane Vanguard", "Sunstrider"];
    const genders = ["Female", "Male"];
    const pickName = names[Math.floor(Math.random() * names.length)];
    const pickTitle = titles[Math.floor(Math.random() * titles.length)];
    const pickGender = genders[Math.floor(Math.random() * genders.length)];
    return {
      name: pickName,
      subtitle: pickTitle,
      gender: pickGender,
      traits: `${pickName} the ${pickTitle}, ${pickGender}. Wielding glowing elemental energy, ornate armor with ancient engravings, intense focused gaze, dramatic cape.`
    };
  }

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
    model: getModelName('gemini-3.8-flash'),
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
  const apiKey = getApiKey();
  if (!apiKey) {
    const archetypes = [
      "resolute gaze, ornate weathered armor, arcane runes etched into gauntlets, glowing aura, flowing cape",
      "swift and agile stance, twin daggers with mystic engravings, flowing hooded cloak, sharp observant eyes",
      "ancient staff wrapped in verdant vines, robes of deep azure, whispering elementals hovering nearby",
      "commanding presence, regal crest, battle-hardened expression, intricate heraldic sash, gleaming blade"
    ];
    const pick = archetypes[Math.floor(Math.random() * archetypes.length)];
    return `${name}, ${subtitle || 'Champion'}, ${gender}. ${pick}, set in ${context.setting || 'Aethelgard'}`;
  }

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
    model: getModelName('gemini-3.8-flash'),
    contents: { parts: [{ text: prompt }] }
  }));

  return response.text || "";
};

export const refinePrompt = async (currentPrompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const currentProvider = (typeof window !== 'undefined' ? localStorage.getItem('mythic_active_ai_provider') : null) || 'google';

  const refinementDirective = `You are an expert game concept artist and prompt engineer for AI image generators. Refine and enhance the following prompt with vivid art details, lighting, cinematic atmosphere, materials, and high visual fidelity: "${currentPrompt}". Keep the core character/scene concept intact. Respond with ONLY the refined prompt text, under 60 words. No intro, remarks, or quotes.`;

  // 1. BEI Mode: Execute text generation directly via authenticated browser session (Zero API key needed)
  if (currentProvider === 'bei') {
    try {
      const { generateBEIText } = await import('./beiService');
      const textResult = await generateBEIText(refinementDirective);
      if (textResult && textResult.length > 10) {
        return textResult.replace(/^["']|["']$/g, '').trim();
      }
    } catch (err) {
      console.warn('[Refine Prompt] BEI text generation notice, falling back:', err);
    }
  }

  // 2. Official Gemini API path when API key is provided
  if (apiKey) {
    try {
      const ai = getClient();
      const prompt = buildRefinementPrompt(currentPrompt);
      const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: getModelName('gemini-3.8-flash'),
        contents: { parts: [{ text: prompt }] }
      }));
      if (response.text) {
        return response.text.replace(/^["']|["']$/g, '').trim();
      }
    } catch (apiErr) {
      console.warn('[Refine Prompt] Gemini API text notice, falling back:', apiErr);
    }
  }

  // 3. Fallback to Pollinations AI text
  try {
    const { generateAIText } = await import('./pollinationsService');
    const aiResult = await generateAIText(currentPrompt, refinementDirective);
    if (aiResult && aiResult.length > 10) {
      return aiResult.replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) {}

  // 4. Clean enhancement fallback
  const enhancements = [
    "volumetric lighting and cinematic composition",
    "sharp focus, intricate high-detail textures",
    "masterpiece game art, vibrant atmospheric colors"
  ];
  const base = currentPrompt.trim();
  if (!base) return "high fantasy champion artwork, cinematic lighting, ultra-detailed masterpiece";
  const missing = enhancements.filter(e => !base.toLowerCase().includes(e.split(' ')[0]));
  return `${base}, ${missing.slice(0, 2).join(', ')}`;
};

export const generateInspirationPrompt = async (
  mode: string = 'illustration',
  styleName: string = 'Anime / Manga',
  gameContext?: GameContext
): Promise<string> => {
  const apiKey = getApiKey();
  const currentProvider = (typeof window !== 'undefined' ? localStorage.getItem('mythic_active_ai_provider') : null) || 'google';

  const theme = gameContext?.setting || 'Fantasy';
  const tone = gameContext?.tone || 'Epic';

  const directive = `Create a single, highly creative, visually stunning AI image generation prompt for a ${theme} game asset in "${styleName}" style (Tone: ${tone}, Mode: ${mode}). 
Describe the character or scene with vivid colors, distinctive outfit/props, dramatic lighting, and intricate composition. 
Respond with ONLY the prompt text, under 50 words. No quotes, no intro.`;

  // 1. BEI Mode: Execute text prompt directly via authenticated browser session
  if (currentProvider === 'bei') {
    try {
      const { generateBEIText } = await import('./beiService');
      const textResult = await generateBEIText(directive);
      if (textResult && textResult.length > 15) {
        return textResult.replace(/^["']|["']$/g, '').trim();
      }
    } catch (err) {
      console.warn('[Inspire Prompt] BEI text generation notice, falling back:', err);
    }
  }

  // 2. Official Gemini API path when API key is provided
  if (apiKey) {
    try {
      const ai = getClient();
      const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: getModelName('gemini-3.8-flash'),
        contents: { parts: [{ text: directive }] }
      }));
      if (response.text) return response.text.replace(/^["']|["']$/g, '').trim();
    } catch (e) {
      console.warn('[Inspire Prompt] Gemini API error:', e);
    }
  }

  // 3. Fallback to Pollinations AI text
  try {
    const { generateAIText } = await import('./pollinationsService');
    const aiResult = await generateAIText(directive);
    if (aiResult && aiResult.length > 15) {
      return aiResult.replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) {}

  // 4. Default game inspirations
  const fallbacks = [
    `A mythical celestial kitsune warrior wielding a glowing starlight katana, cherry blossom petals swirling in storm winds, ${styleName} style, 8k resolution`,
    `An ancient arcane rune guardian hovering over crystalline ruins at twilight, glowing mystic sigils, dramatic volumetric lighting, ${styleName} style`,
    `A cyberpunk rogue with neon holographic dual daggers standing on a rain-slicked neo-tokyo rooftop, reflective puddles, ${styleName} style`
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

export const generateSpriteSheetPrompts = async (
  globalPrompt: string,
  frameCount: number,
  gameContext: GameContext
): Promise<{ poses: string[]; refinedGlobalPrompt: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const defaultPoses = [
      "Idle stance, front view, ready posture",
      "Anticipation pose, shifting weight back",
      "Active forward thrust / dynamic strike motion",
      "Follow-through recovery, stance settling",
      "Defensive parry, weapon raised",
      "Victorious celebration pose"
    ];
    const poses = Array.from({ length: frameCount }, (_, i) => 
      `${globalPrompt}, Frame ${i + 1}: ${defaultPoses[i % defaultPoses.length]}`
    );
    return { poses, refinedGlobalPrompt: globalPrompt };
  }

  const ai = getClient();
  const prompt = buildSpriteSheetPromptsPrompt(globalPrompt, frameCount, gameContext);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
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
  const apiKey = getApiKey();
  if (!apiKey) {
    const poses = Array.from({ length: frameCount }, (_, i) => 
      `${globalPrompt}, ${animationGoal} phase ${i + 1} of ${frameCount}, dynamic keyframe animation`
    );
    return { poses, refinedGlobalPrompt: `${globalPrompt}, animated ${animationGoal}` };
  }

  const ai = getClient();
  const prompt = buildSpriteSheetAnimationPromptsPrompt(globalPrompt, animationGoal, frameCount, gameContext);
  
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: getModelName('gemini-3.8-flash'),
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
