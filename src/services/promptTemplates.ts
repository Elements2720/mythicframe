import {
  GameContext,
  BackgroundConfig,
  ReferenceAsset,
  FrameElement,
  BackgroundPatternType,
  SafeZoneConfig,
  ClothesParams,
  PixelStyle,
  ChibiProportion,
  ChibiConfig
} from "../types";
import { CHIBI_STYLE_CONFIG } from "../constants/gacha";

/**
 * Build prompt for UI Reimagine feature
 */
export const buildUIReimaginePrompt = (
  userPrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  changeBg: boolean,
  uiMood?: string,
  uiElements?: string[],
  uiColors?: { primary: string, secondary: string },
  uiArchetype?: string,
  uiMaterial?: string
): string => {
  let fullPrompt = `UI DESIGN & HUD OVERHAUL TASK.\n`;
  fullPrompt += `OBJECTIVE: Create a professional, clear, and functional game interface layer.\n`;
  
  if (uiArchetype) {
    fullPrompt += `INTERFACE ARCHETYPE: Use a ${uiArchetype.replace('-', ' ')} structural framework.\n`;
  }

  if (uiMaterial) {
    fullPrompt += `SURFACE MATERIAL: Apply a ${uiMaterial.replace('-', ' ')} finish to all HUD elements.\n`;
  }

  if (uiMood) {
    fullPrompt += `INTERFACE STYLE/MOOD: ${uiMood}\n`;
  }
  
  if (uiColors) {
    fullPrompt += `COLOR THEME: Use Primary ${uiColors.primary} for accent/highlight and Secondary ${uiColors.secondary} for base elements. Ensure high contrast and legibility.\n`;
  }

  fullPrompt += `CORE THEME: ${userPrompt || 'Professional game interface'}\n`;
  
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `NARRATIVE CONTEXT: ${gameContext.setting}. ${gameContext.tone}.\n`;
  }
  
  if (styleSnippet) {
    fullPrompt += `RENDER STYLE: ${styleSnippet}\n`;
  }

  if (!changeBg) {
    fullPrompt += `\n[STRICT CONSTRAINT]: PRESERVE ORIGINAL ART. Do NOT modify characters or the background environment. ONLY overlay the UI elements.\n`;
  } else {
    fullPrompt += `\n[PERMISSION]: REIMAGINE FULL SCENE. Adjust background art to seamlessly integrate with the new UI theme.\n`;
  }

  fullPrompt += `\nTECHNICAL QUALITY SPECS:\n`;
  fullPrompt += `- NO GLOW/BLOOM ARTIFACTS: UI elements must be crisp and sharp.\n`;
  fullPrompt += `- LEGIBILITY: HUD components must contrast strongly with the art behind them.\n`;
  fullPrompt += `- CONSISTENCY: Ensure all elements share the same material and lighting source.`;
  
  return fullPrompt;
};

const processReferenceNotes = (referenceAssets: ReferenceAsset[]) => {
  const referenceParts: { text?: string }[] = [];
  referenceAssets.forEach((asset, index) => {
    if (asset.roleNote) {
      let guidance = asset.roleNote;
      if (guidance.toLowerCase().includes('mannequin')) {
          guidance = `CRITICAL IDENTITY & POSE LOCK. Strictly replicate the facial structure, eye shape, body proportions, and skin color from Reference ${index + 1}. Do NOT change the subject. Treat this reference as an immutable wireframe.`;
      } else if (guidance.toLowerCase().includes('style')) {
          guidance = `STRICT AESTHETIC SYNC. Match the rendering technique, line weight, palette, and shading from Reference ${index + 1}. If the style is stylized/illustrative, do NOT use realistic shading or lighting.`;
      }
      referenceParts.push({
        text: `Reference Image ${index + 1} Directives: ${guidance}`,
      });
    }
  });
  return referenceParts;
};

/**
 * Build prompt for Clothes Designer feature
 */
export const buildClothesPrompt = (
  prompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgConfig: BackgroundConfig,
  referenceAssets: ReferenceAsset[],
  safeZone?: SafeZoneConfig,
  clothesParams?: ClothesParams
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  let fullPrompt = `CLOTHES DESIGN & ASSET SYNTHESIS.\n`;
  
  if (clothesParams?.renderMode === 'asset') {
    fullPrompt += `[STRICT NEGATIVE CONSTRAINT - MANDATORY]: ZERO BIOLOGICAL MATTER. Erase the character. NO face, NO eyes, NO skin, NO hair, NO hands, NO neck. The image MUST ONLY contain the clothing items.\n`;
    fullPrompt += `OBJECTIVE: Render a HOLLOW GHOST OUTFIT as a 3D garment asset. The clothes must appear as if worn by an invisible void.\n`;
  } else {
    fullPrompt += `OBJECTIVE: Render high-quality game assets. Render ONLY one single character/subject.\n`;
    fullPrompt += `[VISUAL INTEGRITY]: PRESERVE ALL CHARACTER FEATURES. Maintain skin color, facial structure, and hair identity exactly as seen in references.\n`;
  }
  
  fullPrompt += `[STRICT STYLE RULE]: IGNORE REALISM. Adhere strictly to the illustrative/game-art style provided.\n`;
  fullPrompt += `SUBJECT: ${prompt}\n`;
  
  if (clothesParams) {
    fullPrompt += `LAYOUT: ${clothesParams.layout === 'spread' ? 'Multi-view orthographic fashion sheet (Front/Back/Detail).' : 'Single, centered view.'}\n`;
    
    if (clothesParams.lockPose) {
      fullPrompt += `\n[STRICT POSE LOCK]: You MUST PRESERVE the exact body posture and stance shown in the main character reference. Do NOT alter the orientation.\n`;
    }
  }

  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `WORLD CONTEXT: ${gameContext.setting}. ${gameContext.tone}.\n`;
  }

  if (styleSnippet) {
    fullPrompt += `[STYLE SNIPPET]: ${styleSnippet}\n`;
  }

  if (bgConfig.mode === "transparent") {
    fullPrompt += `\n[MANDATORY]: Render on a SOLID MAGENTA (#FF00FF) background for chroma keying.\n`;
  } else if (bgConfig.mode === "solid") {
    fullPrompt += `\n[MANDATORY]: Render on a FLAT SOLID ${bgConfig.color} background.\n`;
  }

  if (safeZone?.enabled) {
    fullPrompt += `\nCOMPOSITION: Center the subject within the inner ${Math.round(safeZone.width)}% safe zone.\n`;
  }

  const referenceParts = processReferenceNotes(referenceAssets);

  return { textPrompt: fullPrompt, referenceParts };
};

const buildChibiFragment = (config: ChibiConfig): string => {
  if (!config.enabled) return "";
  
  let fragment = "ANATOMICAL STYLE: ";
  
  // Proportions
  if (config.proportions === 'simple') {
    fragment += "Standard 2-heads tall chibi scale, large head and tiny compact body. ";
  } else {
    fragment += "Semi-proportional scale, 2.5 to 3 heads tall, defined limbs, ribcage and hips visible but cute. ";
  }

  // Head
  if (config.headStyle === 'moe') {
    fragment += "Ultra-cute Moe face, perfectly round head, flat chin, huge expressive sparkly eyes, simple eyebrows. ";
  } else {
    fragment += "More realistic chibi head, defined chin and cheeks, subtle facial structure for balance. ";
  }

  // Body
  if (config.bodyStyle === 'geometric') {
    fragment += "Geometric limb simplification, cylindrical arms and legs, rectangular torso, ignored joints for simplicity. ";
  } else {
    fragment += "Defined chunky anatomy, visible joint shapes, chunky hands and feet, dynamic simplified silhouette. ";
  }

  // Focus
  if (config.focus === 'kawaii') {
    fragment += "Kawaii aesthetic focus, extremely cute, simple flat colors, bold expressive features. ";
  } else {
    fragment += "Semi-realistic detailed chibi, professional texturing and shading, detailed anatomical elements within small scale. ";
  }

  return fragment;
};

export const buildIllustrationPrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgConfig: BackgroundConfig,
  referenceAssets: ReferenceAsset[],
  safeZone?: SafeZoneConfig,
  continuityFlags?: Record<string, boolean>,
  chibiProportion?: ChibiProportion,
  chibiConfig?: ChibiConfig
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  let fullPrompt = "";

  if (gameContext.setting || gameContext.tone || gameContext.visualConstraints) {
    fullPrompt += `GAME CONTEXT:\n`;
    if (gameContext.setting) fullPrompt += `Setting: ${gameContext.setting}\n`;
    if (gameContext.tone) fullPrompt += `Tone: ${gameContext.tone}\n`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}\n`;
    }
    fullPrompt += `(Ensure the illustration fits this setting and tone strictly.)\n\n`;
  }

  fullPrompt += `SUBJECT: ${basePrompt}\n`;
  fullPrompt += `[STRICT CONSTRAINT]: Render ONLY one single character. Maintain exact character features and skin color if references are provided.\n`;
  
  // Use granular config if available, otherwise fallback to simple proportion string
  if (chibiConfig?.enabled) {
    fullPrompt += buildChibiFragment(chibiConfig) + "\n";
  } else if (chibiProportion && CHIBI_STYLE_CONFIG[chibiProportion]) {
    fullPrompt += `ANATOMY GUIDELINE: ${CHIBI_STYLE_CONFIG[chibiProportion].suffix}\n`;
  }

  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
    fullPrompt += `(Ensure the style strictly matches the above snippet, do not revert to realism unless the snippet is realistic.)\n`;
  }

  if (continuityFlags) {
    const activeFlags = Object.entries(continuityFlags).filter(([_, active]) => active);
    if (activeFlags.length > 0) {
      fullPrompt += `\nSTYLE CONTINUITY DIRECTIVES:\n`;
      activeFlags.forEach(([key]) => {
        if (key === 'Sharp Black Outlines') fullPrompt += `- Use bold, sharp black outlines for all subject edges.\n`;
        else if (key === 'Clean Cel-Shading') fullPrompt += `- Use clean, professional cel-shading with clear highlight/shadow separation.\n`;
        else if (key === 'Metallic Texture Sync') fullPrompt += `- Render all metallic surfaces with consistent high-reflectivity sheen.\n`;
        else if (key === 'Ambient Lighting Lock') fullPrompt += `- Maintain consistent ambient lighting from the top-right across all related assets.\n`;
        else if (key === 'Palette Adherence') fullPrompt += `- Strictly stick to the established character palette. No stray colors.\n`;
        else if (key === 'Viewpoint Continuity') fullPrompt += `- CRITICAL: Maintain exact eye-level camera perspective. Do not use high or low angles.\n`;
        else if (key === 'Background Isolation') fullPrompt += `- Ensure subject is clearly separated from background with distinct visual contrast.\n`;
        else if (key === 'Character Consistency') fullPrompt += `- Adhere strictly to character design features across all requested formats.\n`;
        else fullPrompt += `- ${key}\n`;
      });
    }
  }

  if (referenceAssets.length > 0) {
    fullPrompt += `\nREFERENCE VISUAL CONSISTENCY (CRITICAL):\n`;
    fullPrompt += `You have been provided with reference images. You MUST strictly adhere to the visual design shown in these references.\n`;
    fullPrompt += `1. IDENTITY: Maintain the exact facial features, hair style, skin color, and body type.\n`;
    fullPrompt += `2. CLOTHING: Keep the character's outfit EXACTLY as seen in the references. Do not redesign, simplify, or change colors of the clothes.\n`;
    fullPrompt += `3. STYLE: Use the art style from the references if specified.\n`;
    fullPrompt += `\nINSTRUCTION FOR POSE & COMPOSITION:\n`;
    fullPrompt += `Use the references ONLY for the character's appearance and design. \n`;
    fullPrompt += `DO NOT copy the composition, pose, camera distance, or framing of the reference images.\n`;
    fullPrompt += `INSTEAD, you MUST strictly follow the new scene description provided in the SUBJECT section above. \n`;
    fullPrompt += `Ensure high contrast between character edges and background.\n`;
  }

  if (safeZone && safeZone.enabled) {
    fullPrompt += `\nCOMPOSITION (IMPORTANT - ZOOM OUT): \n`;
    fullPrompt += `Compose the scene so that the MAIN SUBJECT and all KEY DETAILS are strictly contained within the CENTRAL ${Math.round(
      safeZone.width
    )}% width and ${Math.round(safeZone.height)}% height of the image.\n`;
    fullPrompt += `The outer areas must be treated as EXTENDED BACKGROUND filler.\n`;
  }

  fullPrompt += `\nBACKGROUND:\n`;
  if (bgConfig.mode === "solid") {
    if (bgConfig.gradientType === 'linear') {
      fullPrompt += `Use a smooth linear gradient background: ${bgConfig.color} to ${bgConfig.secondaryColor || '#000000'}.\n`;
    } else if (bgConfig.gradientType === 'radial') {
      fullPrompt += `Use a smooth radial gradient background: radiating from ${bgConfig.color} at the center to ${bgConfig.secondaryColor || '#000000'} at the edges.\n`;
    } else {
      fullPrompt += `Use a flat, solid background color: ${bgConfig.color}. No detailed scene, no gradients.\n`;
    }
    if (bgConfig.promptFragment) {
       fullPrompt += `Background atmosphere hints: ${bgConfig.promptFragment}\n`;
    }
  } else if (bgConfig.mode === "transparent") {
    fullPrompt += `IMPORTANT: Generate the asset on a SOLID MAGENTA BACKGROUND (Hex #FF00FF).\n`;
    fullPrompt += `The background will be removed programmatically, so ensure high contrast at edges.\n`;
  } else if (bgConfig.mode === "pattern" && bgConfig.patternType) {
    const type = bgConfig.patternType;
    fullPrompt += `Background Style: ${type.toUpperCase()} PATTERN.\n`;
    if (bgConfig.promptFragment) {
       fullPrompt += `Pattern specifics: ${bgConfig.promptFragment}\n`;
    }
  } else if (bgConfig.mode === "scene" && bgConfig.promptFragment) {
    fullPrompt += `Background specifics: ${bgConfig.promptFragment}\n`;
  } else {
    fullPrompt += `Background complexity: ${bgConfig.mode === "none" ? "Balanced" : "Complex"}\n`;
  }

  if (!bgConfig.allowTransparency && bgConfig.mode !== 'transparent') {
    fullPrompt += `Ensure the background is fully filled with no transparency.\n`;
  }

  const referenceParts = processReferenceNotes(referenceAssets);

  return { textPrompt: fullPrompt, referenceParts };
};

export const buildExtractClothesPrompt = (
  gameContext: GameContext,
  bgConfig: BackgroundConfig
): string => {
  let bgInstruction = "";
  if (bgConfig.mode === 'transparent') {
    bgInstruction = "Render the result on a FLAT SOLID MAGENTA BACKGROUND (#FF00FF) ONLY.";
  } else if (bgConfig.mode === 'solid') {
    bgInstruction = `Render the result on a FLAT SOLID BACKGROUND of color ${bgConfig.color}.`;
  } else {
    bgInstruction = `Render the background as: ${bgConfig.promptFragment || 'A clean, minimalist studio background'}.`;
  }

  return `[EXTRACTION TASK]: TOTAL ANATOMY REMOVAL.
1. ACTION (MANDATORY): Erase the entire character. Remove all skin, remove all hair, remove face, remove eyes, remove hands, remove biological features. 
2. PRESERVE (CRITICAL): ALL CLOTHING PIECES. You MUST keep the shirt, pants, boots, and armor as a complete OUTFIT SET. Do NOT leave just one item; keep the entire layered ensemble exactly as seen.
3. STRUCTURE: The clothes should retain their 3D shape and volume as if worn by an INVISIBLE GHOST MANNEQUIN.
4. BACKGROUND: ${bgInstruction}
Context: ${gameContext.setting || 'High-end gaming asset'}.`;
};

export const buildFramePrompt = (
  prompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  frameElements: FrameElement[]
): string => {
    return `TASK: Generate a card frame or UI border.
SUBJECT: ${prompt}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
STYLE: ${styleSnippet}
ELEMENTS TO INCLUDE: ${frameElements.join(', ')}.`;
};

export const buildBackgroundPrompt = (
  prompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgPatternType: BackgroundPatternType
): string => {
    return `TASK: Generate a background asset.
SUBJECT: ${prompt}
PATTERN TYPE: ${bgPatternType}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
STYLE: ${styleSnippet}`;
};

export const buildBackgroundRegenPrompt = (
  gameContext: GameContext,
  bgConfig: BackgroundConfig
): string => {
    let p = `TASK: Replace the background of this image. Keep the foreground subjects exactly as they are.
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
NEW BACKGROUND: `;
    if (bgConfig.mode === "solid") {
      if (bgConfig.gradientType === 'linear') p += `linear gradient ${bgConfig.color} to ${bgConfig.secondaryColor || '#000000'}.`;
      else if (bgConfig.gradientType === 'radial') p += `radial gradient from ${bgConfig.color} to ${bgConfig.secondaryColor || '#000000'}.`;
      else p += `solid color ${bgConfig.color}.`;
    } else if (bgConfig.mode === "transparent") {
      p += `SOLID MAGENTA (#FF00FF).`;
    } else {
      p += `${bgConfig.promptFragment || 'A new suitable background'}.`;
    }
    return p;
};

export const buildStyleAnalysisPrompt = (): string => {
    return `Analyze the artistic style of this image. Provide a brief description and a "prompt snippet" that can be used to replicate this style in an AI image generator.
Return JSON format: { "description": "...", "promptSnippet": "..." }`;
};

export const buildPromptSuggestionsPrompt = (prompt: string): string => {
    return `Given the user's initial prompt: "${prompt}", suggest 3 creative variations or improvements.`;
};

export const buildCardSuggestionsPrompt = (artPrompt: string, currentName: string): string => {
    return `Based on this artwork description: "${artPrompt}" and current card name: "${currentName}", suggest 5 unique fantasy card names and 3 ability descriptions.
Return JSON format: { "names": ["...", "..."], "effects": ["...", "..."] }`;
};

export const buildRefinementPrompt = (currentPrompt: string): string => {
    return `Refine and improve the following AI image generation prompt for better results. Fix grammar, add descriptive keywords, and optimize for high quality: "${currentPrompt}".
Respond with ONLY the refined prompt text.`;
};

export const buildOutpaintPrompt = (prompt: string, gameContext: GameContext, styleSnippet: string): string => {
    return `TASK: Outpaint / Extend the existing image into a new aspect ratio.
SUBJECT: ${prompt || 'Continue the existing scene'}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
STYLE: ${styleSnippet}`;
};

export const buildPixelizePrompt = (style: PixelStyle, customPrompt: string): string => {
    return `TASK: Transform the image into retro pixel art.
PIXEL STYLE: ${style}
EXTRA DETAILS: ${customPrompt}`;
};