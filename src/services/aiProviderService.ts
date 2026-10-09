// Unified AI Provider Service
import { AIProvider, AIConfig, AspectRatio, ImageSize, ReferenceAsset, BackgroundConfig, GameContext, UIMode, FrameElement, BackgroundPatternType, SafeZoneConfig, ClothesParams, ChibiProportion, ChibiConfig, PoseData, MapGridConfig } from '../types';
import { generateIllustration, checkApiKey as checkGeminiApiKey } from './geminiService';
import { generateOpenAIImage, getOpenAIApiKey } from './openAIService';
import { generateOpenCodeImage, getOpenCodeConfig } from './openCodeService';
import { generatePollinationsImage } from './pollinationsService';
import { trackApiCall, estimateModelCost } from './quotaTrackerService';

const PROVIDER_STORAGE_KEY = 'mythic_active_ai_provider';

export const getActiveAIProvider = (): AIProvider => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProvider;
    if (saved && ['google', 'openai', 'opencode', 'openrouter', 'pollinations', 'offline', 'custom'].includes(saved)) {
      return saved;
    }
  }
  return 'google';
};

export const setActiveAIProvider = (provider: AIProvider): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  }
};

export const isProviderReady = async (provider: AIProvider): Promise<boolean> => {
  switch (provider) {
    case 'google':
      return await checkGeminiApiKey();
    case 'openai':
      return Boolean(getOpenAIApiKey());
    case 'opencode':
      return Boolean(getOpenCodeConfig().baseUrl);
    case 'pollinations':
      return true; // No key required
    case 'offline':
      return true; // No API needed, copies prompt
    default:
      return false;
  }
};

export interface UnifiedGenerationParams {
  prompt: string;
  model: string;
  size: ImageSize;
  aspectRatio: AspectRatio;
  referenceAssets: ReferenceAsset[];
  bgConfig: BackgroundConfig;
  gameContext: GameContext;
  signal: AbortSignal;
  styleSnippet: string;
  mode: UIMode;
  frameElements: FrameElement[];
  bgPatternType: BackgroundPatternType;
  safeZone?: SafeZoneConfig;
  clothesParams?: ClothesParams;
  continuityFlags?: Record<string, boolean>;
  chibiProportion?: ChibiProportion;
  chibiConfig?: ChibiConfig;
  poseData?: PoseData;
  mapGridConfig?: MapGridConfig;
  viewpoint?: string;
  noCharacters?: boolean;
  framing?: 'full-body' | 'waist-up' | 'bust' | 'head-only';
  seed?: number | null;
}

export const generateWithActiveProvider = async (
  params: UnifiedGenerationParams,
  providerOverride?: AIProvider
): Promise<{ image: string; metadata: any }> => {
  const provider = providerOverride || getActiveAIProvider();
  const startTime = performance.now();
  const modelName = params.model || (provider === 'openai' ? 'dall-e-3' : provider === 'google' ? 'gemini-3.1-flash-image' : 'flux-schnell');

  try {
    let result: { image: string; metadata: any };

    switch (provider) {
      case 'openai': {
        const fullPrompt = `${params.prompt}${params.styleSnippet ? ', ' + params.styleSnippet : ''}`;
        const image = await generateOpenAIImage(fullPrompt, params.aspectRatio);
        result = {
          image,
          metadata: { fullPrompt, provider: 'openai' }
        };
        break;
      }

      case 'opencode': {
        const fullPrompt = `${params.prompt}${params.styleSnippet ? ', ' + params.styleSnippet : ''}`;
        const image = await generateOpenCodeImage(fullPrompt, params.aspectRatio);
        result = {
          image,
          metadata: { fullPrompt, provider: 'opencode' }
        };
        break;
      }

      case 'pollinations': {
        const fullPrompt = `${params.prompt}${params.styleSnippet ? ', ' + params.styleSnippet : ''}`;
        const image = await generatePollinationsImage(fullPrompt, params.aspectRatio, params.seed);
        result = {
          image,
          metadata: { fullPrompt, provider: 'pollinations' }
        };
        break;
      }

      case 'google':
      default: {
        result = await generateIllustration(
          params.prompt,
          params.model,
          params.size,
          params.aspectRatio,
          params.referenceAssets,
          params.bgConfig,
          params.gameContext,
          params.signal,
          params.styleSnippet,
          params.mode,
          params.frameElements,
          params.bgPatternType,
          params.safeZone,
          params.clothesParams,
          params.continuityFlags,
          params.chibiProportion,
          params.chibiConfig,
          params.poseData,
          params.mapGridConfig,
          params.viewpoint,
          params.noCharacters,
          params.framing,
          params.seed
        );
        break;
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const estimatedCost = estimateModelCost(provider, modelName);

    trackApiCall({
      provider,
      model: modelName,
      status: 'success',
      latencyMs,
      estimatedCost,
      promptSnippet: params.prompt.slice(0, 100)
    });

    return result;
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const isRateLimited = Boolean(
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota') ||
      error?.status === 429
    );

    trackApiCall({
      provider,
      model: modelName,
      status: isRateLimited ? 'rate_limited' : 'error',
      latencyMs,
      estimatedCost: 0,
      promptSnippet: params.prompt.slice(0, 100),
      errorMessage: error?.message || String(error)
    });

    throw error;
  }
};
