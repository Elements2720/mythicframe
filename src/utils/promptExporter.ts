import { WorkspaceTab, GameContext, ArtStyle, AspectRatio } from '../types';
import { 
  buildIllustrationPrompt, 
  buildFramePrompt, 
  buildBackgroundAssetPrompt, 
  buildClothesPrompt, 
  buildPoseStudioPrompt, 
  buildMapGridPrompt, 
  buildUIReimaginePrompt 
} from '../services/promptTemplates';
import { AETHELGARD_RACES, ART_STYLES } from '../constants';

export interface PromptExportBundle {
  rawPrompt: string;
  assembledPrompt: string;
  styleName: string;
  aspectRatio: string;
  resolution: string;
  framing?: string;
  viewpoint?: string;
  seed?: number | null;
  midjourney: string;
  chatgpt: string;
  stableDiffusion: {
    positive: string;
    negative: string;
    parameters: {
      steps: number;
      cfgScale: number;
      sampler: string;
      resolution: string;
      seed: number | string;
    };
  };
  pollinations: {
    url: string;
    markdown: string;
  };
  json: string;
}

const ASPECT_RATIO_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 896, height: 1152 },
  '4:3': { width: 1152, height: 896 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
  '21:9': { width: 1536, height: 640 },
  '2:3': { width: 832, height: 1216 },
  '3:2': { width: 1216, height: 832 },
  'custom': { width: 1024, height: 1024 }
};

export function getResolutionForAspectRatio(ratio: AspectRatio): { width: number; height: number } {
  return ASPECT_RATIO_RESOLUTIONS[ratio] || { width: 1024, height: 1024 };
}

export function buildFullPromptBundle(
  tab: WorkspaceTab, 
  gameContext: GameContext, 
  artStyles: ArtStyle[] = ART_STYLES
): PromptExportBundle {
  // 1. Resolve style snippet
  let styleSnippet = '';
  let styleName = 'None';
  if (tab.selectedStyleId && tab.selectedStyleId !== 'none') {
    const found = artStyles.find(s => s.id === tab.selectedStyleId) || ART_STYLES.find(s => s.id === tab.selectedStyleId);
    if (found) {
      styleSnippet = found.promptSnippet;
      styleName = found.name;
    }
  }

  // Handle pixel bit size override
  if (tab.pixelBitSize && (tab.selectedStyleId === 'pixel_art' || tab.selectedStyleId === 'retro_8bit_micro')) {
    styleSnippet = styleSnippet.replace(/16-bit/g, tab.pixelBitSize).replace(/8-bit/g, tab.pixelBitSize);
    if (!styleSnippet.includes(tab.pixelBitSize)) {
      styleSnippet += `, ${tab.pixelBitSize}`;
    }
  }

  // 2. Assemble main prompt according to active mode
  let assembledPrompt = '';
  const mode = tab.mode;

  if (mode === 'frame') {
    assembledPrompt = buildFramePrompt(tab.prompt, gameContext, styleSnippet, tab.frameElements || []);
  } else if (mode === 'background') {
    assembledPrompt = buildBackgroundAssetPrompt(tab.prompt, gameContext, styleSnippet, tab.bgPatternType || 'scene');
  } else if (mode === 'clothes') {
    const built = buildClothesPrompt(tab.prompt, gameContext, styleSnippet, tab.bgConfig, tab.referenceAssets, tab.safeZone, tab.clothesParams);
    assembledPrompt = built.textPrompt;
  } else if (mode === 'pose-studio' && tab.poseData) {
    const built = buildPoseStudioPrompt(tab.prompt, gameContext, styleSnippet, tab.bgConfig, tab.referenceAssets, tab.poseData, tab.safeZone);
    assembledPrompt = built.textPrompt;
  } else if (mode === 'map-grid' && tab.mapGridConfig) {
    assembledPrompt = buildMapGridPrompt(tab.prompt, gameContext, styleSnippet, tab.mapGridConfig);
  } else if (mode === 'ui-reimagine') {
    assembledPrompt = buildUIReimaginePrompt(
      tab.prompt, 
      gameContext, 
      styleSnippet, 
      tab.uiReimagineChangeBg,
      tab.uiMoodEnabled ? tab.uiThemeMood : undefined,
      tab.uiElementsEnabled ? tab.uiElements : undefined,
      tab.uiColorsEnabled ? { primary: tab.bgConfig?.color || '#3b82f6', secondary: tab.bgConfig?.secondaryColor || '#000000' } : undefined,
      tab.uiElementsEnabled ? tab.uiArchetype : undefined,
      tab.uiMaterialEnabled ? tab.uiMaterial : undefined,
      tab.uiPositionsLocked
    );
  } else if (mode === 'gacha' && tab.selectedGachaAssetId) {
    const asset = tab.gachaAssets.find(a => a.id === tab.selectedGachaAssetId);
    const race = AETHELGARD_RACES.find(r => r.id === tab.characterRace);
    const racePrompt = (tab.characterGender === 'Female' ? race?.traitPromptFemale : race?.traitPromptMale) || '';
    const traits = `${racePrompt ? racePrompt + ', ' : ''}${tab.characterTraits || ''}${asset?.promptSuffix ? ', ' + asset.promptSuffix : ''}`;
    const built = buildIllustrationPrompt(
      traits, 
      gameContext, 
      styleSnippet, 
      asset?.bgConfig || tab.bgConfig, 
      tab.referenceAssets, 
      tab.safeZone, 
      tab.continuityFlags, 
      asset?.chibiProportions || tab.chibiProportions, 
      asset?.chibiConfig || tab.chibiConfig,
      tab.viewpoint,
      tab.noCharacters,
      asset?.framing || tab.framing
    );
    assembledPrompt = built.textPrompt;
  } else {
    const built = buildIllustrationPrompt(
      tab.prompt, 
      gameContext, 
      styleSnippet, 
      tab.bgConfig, 
      tab.referenceAssets, 
      tab.safeZone, 
      tab.continuityFlags, 
      tab.chibiProportions, 
      tab.chibiConfig,
      tab.viewpoint,
      tab.noCharacters,
      tab.framing,
      tab.characterTool
    );
    assembledPrompt = built.textPrompt;
  }

  // 3. Clean up prompt
  const cleanPrompt = assembledPrompt.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  const res = getResolutionForAspectRatio(tab.selectedAspectRatio);
  const ratioTag = tab.selectedAspectRatio === 'custom' ? '16:9' : tab.selectedAspectRatio;

  // 4. Midjourney format
  const mjSubject = (tab.prompt || 'Game asset concept art').trim();
  const mjStyle = styleSnippet ? `, ${styleSnippet}` : '';
  const mjSetting = gameContext.setting ? `, ${gameContext.setting} theme` : '';
  const mjFraming = tab.framing && tab.framing !== 'full-body' ? `, ${tab.framing} view` : '';
  const mjViewpoint = tab.viewpoint && tab.viewpoint !== 'none' ? `, ${tab.viewpoint} angle` : '';
  const midjourney = `${mjSubject}${mjStyle}${mjSetting}${mjFraming}${mjViewpoint} --ar ${ratioTag} --v 6.1 --stylize 250 --no text, labels, watermark, username, signature, ui, borders`;

  // 5. ChatGPT / DALL-E 3 format
  const chatgpt = [
    `Create a high-fidelity digital illustration: ${mjSubject}.`,
    styleName !== 'None' ? `Art Style: ${styleSnippet}.` : '',
    gameContext.setting ? `Theme & Setting: ${gameContext.setting} (${gameContext.tone || 'Epic'}).` : '',
    tab.framing ? `Framing: ${tab.framing} composition.` : '',
    tab.viewpoint && tab.viewpoint !== 'none' ? `Camera Angle: ${tab.viewpoint}.` : '',
    `Composition: Aspect ratio ${ratioTag}. The artwork should be centered, clean, and professional.`,
    `Strict constraints: Absolutely pure artwork with NO overlaid text, NO watermarks, NO interface controls, NO logos, and NO border decorations.`
  ].filter(Boolean).join('\n');

  // 6. Stable Diffusion format
  const sdPositive = [
    mjSubject,
    styleSnippet,
    tab.framing ? `${tab.framing} composition` : '',
    tab.viewpoint && tab.viewpoint !== 'none' ? `${tab.viewpoint} view` : '',
    gameContext.setting,
    'masterpiece, best quality, highly detailed game asset, professional artwork, 8k resolution'
  ].filter(Boolean).join(', ');

  const sdNegative = 'text, watermark, signature, logo, username, ui, hud, interface, blurry, cropped, worst quality, low quality, normal quality, artifacts, jpeg artifacts, bad anatomy, bad hands, missing fingers, extra limbs, border, frame';

  const seedValue = tab.seed !== undefined && tab.seed !== null ? tab.seed : Math.floor(Math.random() * 1000000000);

  // 7. Pollinations format
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${res.width}&height=${res.height}&seed=${seedValue}&nologo=true&enhance=false`;
  const pollinationsMarkdown = `![Generated Artwork](${pollinationsUrl})`;

  // 8. Structured JSON format
  const jsonObject = {
    source: "MythicFrame Studio",
    mode: tab.mode,
    subject: tab.prompt,
    artStyle: {
      id: tab.selectedStyleId,
      name: styleName,
      snippet: styleSnippet,
      pixelBitSize: tab.pixelBitSize
    },
    gameContext: {
      setting: gameContext.setting,
      tone: gameContext.tone,
      visualConstraints: gameContext.visualConstraints
    },
    composition: {
      aspectRatio: tab.selectedAspectRatio,
      resolution: `${res.width}x${res.height}`,
      framing: tab.framing || 'full-body',
      viewpoint: tab.viewpoint || 'none',
      safeZone: tab.safeZone?.enabled ? tab.safeZone : null
    },
    background: tab.bgConfig,
    seed: tab.seed ?? null,
    assembledPrompt: cleanPrompt,
    negativeDirectives: sdNegative
  };

  return {
    rawPrompt: tab.prompt,
    assembledPrompt: cleanPrompt,
    styleName,
    aspectRatio: tab.selectedAspectRatio,
    resolution: `${res.width}x${res.height}`,
    framing: tab.framing,
    viewpoint: tab.viewpoint,
    seed: tab.seed,
    midjourney,
    chatgpt,
    stableDiffusion: {
      positive: sdPositive,
      negative: sdNegative,
      parameters: {
        steps: 30,
        cfgScale: 7.0,
        sampler: 'DPM++ 2M Karras',
        resolution: `${res.width}x${res.height}`,
        seed: tab.seed ?? 'Random'
      }
    },
    pollinations: {
      url: pollinationsUrl,
      markdown: pollinationsMarkdown
    },
    json: JSON.stringify(jsonObject, null, 2)
  };
}
