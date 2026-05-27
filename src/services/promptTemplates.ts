
// Templates for generating prompts for various features
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
  ChibiConfig,
  PoseData,
  MapGridConfig
} from "../types";
import { CHIBI_STYLE_CONFIG } from "../constants/gacha";

/**
 * Helper to detect if a prompt is likely describing a character
 */
const isCharacterPrompt = (prompt: string): boolean => {
  const characterKeywords = [
    'character', 'person', 'man', 'woman', 'girl', 'boy', 'knight', 'mage', 'warrior', 
    'hero', 'villain', 'creature', 'monster', 'human', 'elf', 'dwarf', 'orc', 'goblin',
    'portrait', 'full body', 'standing', 'pose', 'outfit', 'clothing', 'face', 'eyes',
    'hair', 'skin', 'body type', 'anatomy', 'npc', 'player', 'avatar', 'soldier',
    'paladin', 'rogue', 'thief', 'assassin', 'priest', 'cleric', 'druid', 'monk', 'bard',
    'warlock', 'sorcerer', 'necromancer', 'demon', 'angel', 'god', 'goddess', 'king', 'queen',
    'prince', 'princess', 'lord', 'lady', 'villager', 'merchant', 'blacksmith', 'guard'
  ];
  const p = prompt.toLowerCase();
  return characterKeywords.some(word => p.includes(word));
};

/**
 * Helper to detect if a prompt is likely describing a map or environment
 */
const isMapPrompt = (prompt: string): boolean => {
  const mapKeywords = [
    'map', 'isometric', '3d map', 'environment', 'landscape', 'terrain', 'forest', 'dungeon',
    'castle', 'city', 'town', 'village', 'room', 'interior', 'exterior', 'world map', 'region',
    'building', 'structure', 'architecture'
  ];
  const p = prompt.toLowerCase();
  return mapKeywords.some(word => p.includes(word));
};

/**
 * Helper to detect if a prompt is likely describing a magic circle or symbol
 */
const isMagicCirclePrompt = (prompt: string): boolean => {
  const magicKeywords = [
    'magic circle', 'rune', 'sigil', 'pentagram', 'glyph', 'spell circle', 'summoning circle',
    'arcane circle', 'enchantment circle', 'symbol', 'icon', 'logo', 'crest', 'emblem'
  ];
  const p = prompt.toLowerCase();
  return magicKeywords.some(word => p.includes(word));
};

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
  uiMaterial?: string,
  lockPositions: boolean = false
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

  if (uiElements && uiElements.length > 0) {
    fullPrompt += `COMPONENTS TO PRIORITIZE: ${uiElements.join(', ')}.\n`;
  }

  fullPrompt += `CORE THEME: ${userPrompt || 'Professional game interface'}\n`;
  
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `NARRATIVE CONTEXT: ${gameContext.setting}. ${gameContext.tone}.\n`;
  }
  
  if (styleSnippet) {
    fullPrompt += `RENDER STYLE: ${styleSnippet}\n`;
  }

  if (lockPositions) {
    fullPrompt += `\n[STRICT LAYOUT LOCK]: RETAIN THE EXACT SPATIAL COORDINATES AND LAYOUT STRUCTURE of all existing UI components. Do NOT reposition buttons, health bars, or maps. Only reimagine their visual style and material.\n`;
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
      if (guidance.toLowerCase().includes('mannequin') || guidance.toLowerCase().includes('pose')) {
          guidance = `CRITICAL IDENTITY & POSE LOCK. Strictly replicate the facial structure, eye shape, body proportions, and skin color from Reference ${index + 1}. Do NOT change the subject. Treat this reference as an immutable wireframe.`;
      } else if (guidance.toLowerCase().includes('style')) {
          guidance = `STRICT AESTHETIC SYNC. Match the rendering technique, line weight, palette, and shading from Reference ${index + 1}. If the style is stylized/illustrative, do NOT use realistic shading or lighting.`;
      } else if (guidance.toLowerCase().includes('look') || guidance.toLowerCase().includes('appearance') || guidance.toLowerCase().includes('clothes')) {
          guidance = `IDENTITY ONLY. Use Reference ${index + 1} ONLY for character appearance, clothing, and features. Do NOT copy the pose, stance, or composition. Follow the main prompt for the pose.`;
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
    fullPrompt += `OBJECTIVE: Render high-quality game assets.\n`;
    fullPrompt += `[VISUAL INTEGRITY]: PRESERVE ALL CHARACTER FEATURES. Maintain skin color, facial structure, and hair identity exactly as seen in references.\n`;
  }
  
  fullPrompt += `[STRICT STYLE RULE]: Adhere strictly to the illustrative/game-art style provided.\n`;
  fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO TEXT. NO labels. NO watermarks. NO signatures. NO UI elements. NO speech bubbles.\n`;
  fullPrompt += `SUBJECT: ${prompt}\n`;

  if (prompt.toLowerCase().includes('undead') || prompt.toLowerCase().includes('skeleton') || prompt.toLowerCase().includes('skull')) {
    fullPrompt += `\n[CRITICAL UNDEAD ANATOMY]: If the character is undead or skeletal, you MUST keep the skull structurally sound with the LOWER JAW INTACT AND ATTACHED. Do not render missing lower jaws. Ensure the head is PROPORTIONATE to the body width, do not make the head excessively large.\n`;
  }
  
  if (clothesParams) {
    fullPrompt += `LAYOUT: ${clothesParams.layout === 'spread' ? 'Multi-view orthographic fashion sheet (Front/Back/Detail).' : 'Single, centered view.'}\n`;
    
    if (clothesParams.lockPose) {
      fullPrompt += `\n[STRICT POSE LOCK]: You MUST PRESERVE the exact body posture and stance shown in the main character reference. Do NOT alter the orientation.\n`;
    }

    if (clothesParams.framing) {
      switch (clothesParams.framing) {
        case 'waist-up':
          fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: WAIST-UP SHOT. Waist-up portrait: the frame MUST cut at the waist. The character is cropped at the hips. Legs, knees, and feet must NOT be visible under any circumstance. Waist-up character portrait for dialogue UI. STRICT framing rules: Crop exactly at the waist (hips level). No legs, knees, or feet visible. Upper body fills most of the frame (60-80%). Head and torso are the focus. Composition: Centered or slightly offset character. Clear silhouette for UI readability. DO NOT: Do not generate full body, Do not zoom out to include legs, Do not keep original full-body proportions.\n`;
          break;
        case 'bust':
          fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: BUST SHOT. You MUST crop the character from the chest up. Focus on the upper torso, shoulders, and head. It is acceptable if the top of the head or sides of the shoulders are cut off to ensure a true close-up. Do NOT zoom out to fit everything. This instruction supersedes any other framing instructions.\n`;
          break;
        case 'head-only':
          fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: HEAD ONLY. You MUST focus entirely on the head, face, and neck. The head should fill most of the frame. It is expected that the top of the hair or sides of the head might be cut off by the frame. Do NOT show the torso or arms. This instruction supersedes any other framing instructions.\n`;
          break;
        case 'full-body':
        default:
          fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: FULL BODY SHOT. You MUST show the entire character from head to toe. This instruction supersedes any other framing instructions.\n`;
          break;
      }
    }
  }

  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `WORLD CONTEXT: ${gameContext.setting}. ${gameContext.tone}.\n`;
  }

  if (styleSnippet) {
    fullPrompt += `[STYLE SNIPPET]: ${styleSnippet}\n`;
  }

  if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
    const key = bgConfig.mode === "transparent" ? "#FFFFFF" : (bgConfig.keyColor || "#FFFFFF");
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    fullPrompt += `\n[STRICT OVERRIDE - BACKGROUND]:\n`;
    fullPrompt += `- IGNORE all environment descriptions.\n`;
    fullPrompt += `- Render the subject on a SOLID ${colorName} (${key}) background.\n`;
    fullPrompt += `- The background MUST be perfectly flat with NO texture, NO shadows, and NO lighting gradients.\n`;
  } else if (bgConfig.mode === "solid") {
    fullPrompt += `\n[MANDATORY]: Render on a FLAT SOLID ${bgConfig.color} background.\n`;
  } else if (bgConfig.mode === "prompt_only") {
    fullPrompt += `\nBACKGROUND: ${bgConfig.promptFragment}\n`;
  } else if (bgConfig.mode === "none") {
    fullPrompt += `\nBACKGROUND: Entirely empty, minimalist, or pure white background with NO environmental detail.\n`;
  } else if (bgConfig.mode === "scene") {
    fullPrompt += `\nBACKGROUND: ${bgConfig.promptFragment || 'Detailed environmental scene'}.\n`;
  } else {
    fullPrompt += `\nBACKGROUND: Balanced environmental complexity.\n`;
  }

  if (safeZone?.enabled) {
    fullPrompt += `\nCOMPOSITION: Center the subject within the inner ${Math.round(safeZone.width)}% safe zone.\n`;
  }

  const referenceParts = processReferenceNotes(referenceAssets);

  return { textPrompt: fullPrompt, referenceParts };
};

const buildChibiFragment = (config: ChibiConfig): string => {
  if (!config.enabled) return "";
  
  let fragment = "[STRICT CHIBI AESTHETIC - SUPER DEFORMED STYLE]\n";
  fragment += "CRITICAL INSTRUCTION: Chibi (super-deformed style) is NOT just a big head on a standard body.\n";
  fragment += "It is a COMPLETE proportional and stylistic transformation of the whole character.\n";
  fragment += "DO NOT make the same body as the reference body with a big head. That is a failure.\n\n";
  
  // 1. Proportions
  fragment += "1. PROPORTIONS (Most Important):\n";
  if (config.bodyRatio) {
    const ratioParts = config.bodyRatio.split(':');
    const ratioVal = ratioParts.length === 2 ? parseFloat(ratioParts[1]) : 2;
    fragment += `- Head-to-body ratio is exactly 1:${ratioVal}. Head is exactly ${Math.round(100 / ratioVal)}% of total height.\n`;
  } else if (config.presetProportion && CHIBI_STYLE_CONFIG[config.presetProportion]) {
    fragment += `- ${CHIBI_STYLE_CONFIG[config.presetProportion].suffix}\n`;
  } else {
    fragment += "- Head-to-body ratio: 1:2 to 1:4 max. Head is 50% or more of total height.\n";
  }
  fragment += "- Entire body MUST BE scaled down and simplified to match the head.\n";
  fragment += "- Limbs are short and stubby, NOT realistic length.\n";

  // 2. Body Structure
  fragment += "\n2. BODY STRUCTURE:\n";
  fragment += "- Torso: very short, almost compressed.\n";
  if (config.bodyStyle === 'geometric') {
    fragment += "- Arms/legs: geometric limb simplification, cylindrical arms/legs.\n";
  } else {
    fragment += "- Arms/legs: simplified, rounded (stubby proportions).\n";
  }
  fragment += "- Hands/feet: small, minimal detail. Chunky.\n";
  fragment += "- NO realistic anatomy or muscle structure whatsoever. Reject adult body proportions entirely.\n";

  // 3. Detail Level
  fragment += "\n3. DETAIL LEVEL:\n";
  if (config.focus === 'kawaii') {
    fragment += "- Kawaii aesthetic focus, extremely cute, flat colors, bold expressive features.\n";
  } else {
    fragment += "- Semi-realistic detailed chibi, professional texturing and shading, but still structurally super-deformed.\n";
  }
  fragment += "- Clothing and armor MUST be simplified.\n";
  fragment += "- Remove small intricate details; use clean shapes instead of realism.\n";

  // 4. Face Style
  fragment += "\n4. FACE STYLE:\n";
  if (config.headStyle === 'moe') {
    fragment += "- Ultra-cute Moe face (if visible), huge expressive sparkly eyes.\n";
  } else {
    fragment += "- Large eyes, simplified features.\n";
  }
  fragment += "- Minimal nose/mouth.\n";
  fragment += "- Expression is simplified and can be exaggerated.\n";
  fragment += "- Respect facial visibility: If the character wears a closed helmet or mask in references, keep it closed and do not add visible eyes or an open face.\n";

  // accessories & Secondary Features
  fragment += "\n[CRITICAL - ACCESSORIES & FEATURES]: You MUST preserve all secondary character features from references, including wings, tails, horns, capes, quivers, weapons, and specialized equipment. Do NOT simplify these away. Render them in a scale-appropriate way for the chibi body, but ensure they are clearly visible and detailed. If the reference has wings, the chibi MUST have wings.\n\n";

  // Mounts & Companions
  fragment += "[CRITICAL - MOUNTS & COMPANIONS]: If the character is riding a mount (e.g., horse, wolf, dragon) or has an animal companion, the MOUNT/COMPANION MUST ALSO BE RENDERED IN CHIBI STYLE to match the rider. The mount must have a large head, short stubby body and legs, and simplified features (standard anime chibi, not overly cute/moe). DO NOT render a chibi character on a realistically proportioned mount. Both must be fully super-deformed.\n\n";

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
  chibiConfig?: ChibiConfig,
  viewpoint?: string,
  noCharacters?: boolean,
  framing?: 'full-body' | 'waist-up' | 'bust' | 'head-only'
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  let fullPrompt = "";

  if (gameContext.setting || gameContext.tone || gameContext.visualConstraints) {
    fullPrompt += `GAME CONTEXT:\n`;
    if (gameContext.setting) fullPrompt += `Setting: ${gameContext.setting}\n`;
    if (gameContext.tone) fullPrompt += `Tone: ${gameContext.tone}\n`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}\n`;
    }
    fullPrompt += `(Ensure the result strictly fits this setting and tone.)\n\n`;
  }

  fullPrompt += `SUBJECT: ${basePrompt}\n`;
  
  const characterLikely = noCharacters ? false : isCharacterPrompt(basePrompt);
  const mapLikely = isMapPrompt(basePrompt);
  const magicCircleLikely = isMagicCirclePrompt(basePrompt);

  if (noCharacters) {
    fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO CHARACTERS. NO PEOPLE. NO CREATURES. NO ANIMALS. NO HUMANOIDS. The image MUST strictly be an environment, prop, object, or scene without any living subjects.\n`;
  }

  if (viewpoint && viewpoint !== 'none') {
    fullPrompt += `VIEWPOINT: ${viewpoint.replace('-', ' ').toUpperCase()} perspective.\n`;
    if (viewpoint === 'top-down') fullPrompt += `- Camera is positioned directly above the subject looking straight down. Render as a 3D top-down perspective with visible depth and verticality.\n`;
    else if (viewpoint === 'high-angle') fullPrompt += `- Camera is positioned above the subject looking down at an angle.\n`;
    else if (viewpoint === 'low-angle') fullPrompt += `- Camera is positioned below the subject looking up, creating a sense of scale.\n`;
    else if (viewpoint === 'back') fullPrompt += `- Subject is seen from behind, facing away from the camera.\n`;
    else if (viewpoint === 'side') fullPrompt += `- Subject is seen from a side profile perspective.\n`;
    else if (viewpoint === 'three-quarter') fullPrompt += `- Subject is seen from a three-quarter angle.\n`;
    else if (viewpoint === 'isometric') fullPrompt += `- Subject is rendered in a 45-degree isometric perspective.\n`;
    else if (viewpoint === 'cinematic') fullPrompt += `- Use dramatic cinematic framing and wide-angle perspective.\n`;
  }

  if (framing && characterLikely) {
    switch (framing) {
      case 'waist-up':
        fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: WAIST-UP SHOT. Waist-up portrait: the frame MUST cut at the waist. The character is cropped at the hips. Legs, knees, and feet must NOT be visible under any circumstance. Waist-up character portrait for dialogue UI. STRICT framing rules: Crop exactly at the waist (hips level). No legs, knees, or feet visible. Upper body fills most of the frame (60-80%). Head and torso are the focus. Composition: Centered or slightly offset character. Clear silhouette for UI readability. DO NOT: Do not generate full body, Do not zoom out to include legs, Do not keep original full-body proportions.\n`;
        break;
      case 'bust':
        fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: BUST SHOT. You MUST crop the character from the chest up. Focus on the upper torso, shoulders, and head. It is acceptable if the top of the head or sides of the shoulders are cut off to ensure a true close-up. Do NOT zoom out to fit everything. This instruction supersedes any other framing instructions.\n`;
        break;
      case 'head-only':
        fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: HEADSHOT / CLOSE-UP. You MUST focus entirely on the character's head and face. The head should fill most of the frame. It is expected that the top of the hair or sides of the head might be cut off by the frame. Do NOT show the torso or lower body. This instruction supersedes any other framing instructions.\n`;
        break;
      case 'full-body':
      default:
        fullPrompt += `\n[CRITICAL OVERRIDE - FRAMING]: FULL-BODY SHOT. You MUST show the entire character from head to toe. This instruction supersedes any other framing instructions.\n`;
        break;
    }
  }

  fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO TEXT. NO labels. NO watermarks. NO signatures. NO UI elements. NO speech bubbles. The image MUST be pure artwork.\n`;
  
  if (referenceAssets.length > 0) {
    if (characterLikely) {
      fullPrompt += `[STRICT CONSTRAINT]: Maintain exact character features, skin color, and ALL accessories from references (wings, tails, horns, weapons, quivers, capes). If the character in the reference has a closed helmet, mask, or obscured face, you MUST maintain that obscured face. Do NOT force eyes or an open helmet if the reference shows a closed one.\n`;
    } else {
      fullPrompt += `[STRICT CONSTRAINT]: Maintain exact visual design, colors, and style from references.\n`;
    }
  }
  
  // Use granular config if available, otherwise fallback to simple proportion string
  if (characterLikely) {
    if (chibiConfig?.enabled) {
      fullPrompt += buildChibiFragment(chibiConfig) + "\n";
    } else if (chibiProportion && CHIBI_STYLE_CONFIG[chibiProportion]) {
      fullPrompt += `ANATOMY GUIDELINE: ${CHIBI_STYLE_CONFIG[chibiProportion].suffix}\n`;
    }
  }

  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
    fullPrompt += `(Ensure the style strictly matches the above snippet, do not revert to realism or generic defaults.)\n`;
  } else {
    fullPrompt += `STYLE: Clean, neutral, high-quality digital art without additional stylistic flourishes.\n`;
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
        else if (key === 'Viewpoint Continuity') fullPrompt += `- CRITICAL: Maintain exact eye-level camera perspective. Do NOT use high or low angles.\n`;
        else if (key === 'Background Isolation') fullPrompt += `- Ensure subject is clearly separated from background with distinct visual contrast.\n`;
        else if (key === 'Character Consistency' && characterLikely) fullPrompt += `- Adhere strictly to character design features across all requested formats.\n`;
        else if (key === 'Character Consistency' && !characterLikely) fullPrompt += `- Adhere strictly to the established visual design across all requested formats.\n`;
        else fullPrompt += `- ${key}\n`;
      });
    }
  }

  if (referenceAssets.length > 0) {
    fullPrompt += `\nREFERENCE VISUAL CONSISTENCY (CRITICAL):\n`;
    fullPrompt += `You have been provided with reference images. You MUST strictly adhere to the visual design shown in these references.\n`;
    if (characterLikely) {
      fullPrompt += `1. IDENTITY: Maintain the exact facial features, hair style, skin color, and body type.\n`;
      fullPrompt += `2. CLOTHING: Keep the character's outfit EXACTLY as seen in the references. Do not redesign, simplify, or change colors.\n`;
    } else {
      fullPrompt += `1. VISUAL IDENTITY: Maintain the exact design, features, and colors of the subject.\n`;
      fullPrompt += `2. DETAILS: Keep the subject's specific details EXACTLY as seen in the references. Do not redesign, simplify, or change colors.\n`;
    }
    fullPrompt += `3. STYLE: Use the art style from the references if specified.\n`;
    fullPrompt += `\nINSTRUCTION FOR POSE & COMPOSITION:\n`;
    if (characterLikely) {
      fullPrompt += `Use the references ONLY for character details. \n`;
    } else {
      fullPrompt += `Use the references ONLY for subject details. \n`;
    }
    fullPrompt += `DO NOT copy the composition, pose, or distance of the references.\n`;
    fullPrompt += `FOLLOW the SUBJECT description above for current pose and scene.\n`;
  }

  if (!characterLikely && (mapLikely || magicCircleLikely)) {
    fullPrompt += `\n[STRICT CONSTRAINT]: Focus ONLY on the ${basePrompt}. DO NOT generate any characters, people, or creatures in the scene.\n`;
  }

  if (basePrompt.toLowerCase().includes('undead') || basePrompt.toLowerCase().includes('skeleton') || basePrompt.toLowerCase().includes('skull')) {
    fullPrompt += `\n[CRITICAL UNDEAD ANATOMY]: If the character is undead or skeletal, you MUST keep the skull structurally sound with the LOWER JAW INTACT AND ATTACHED. Do not render missing lower jaws. Ensure the head is PROPORTIONATE to the body width, do not make the head excessively large.\n`;
  }

  if (safeZone && safeZone.enabled) {
    fullPrompt += `\nCOMPOSITION (IMPORTANT - ZOOM OUT): \n`;
    fullPrompt += `Compose the scene so that the MAIN SUBJECT is strictly contained within the CENTRAL ${Math.round(
      safeZone.width
    )}% width and ${Math.round(safeZone.height)}% height of the image.\n`;
    fullPrompt += `The outer areas must be EXTENDED BACKGROUND filler.\n`;
  }

  fullPrompt += `\nBACKGROUND:\n`;
  if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
    const key = bgConfig.mode === "transparent" ? "#FFFFFF" : (bgConfig.keyColor || "#FFFFFF");
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    fullPrompt += `[STRICT OVERRIDE]: IGNORE all other background descriptions. You MUST render the subject on a perfectly FLAT SOLID ${colorName} BACKGROUND (Hex ${key}).\n`;
    fullPrompt += `Absolutely NO texture, NO depth, and NO environmental details.\n`;
  } else if (bgConfig.mode === "solid") {
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
  } else if (bgConfig.mode === "pattern" && bgConfig.patternType) {
    const type = bgConfig.patternType;
    fullPrompt += `Background Style: ${type.toUpperCase()} PATTERN.\n`;
    if (bgConfig.promptFragment) {
       fullPrompt += `Pattern specifics: ${bgConfig.promptFragment}\n`;
    }
  } else if (bgConfig.mode === "scene" && bgConfig.promptFragment) {
    fullPrompt += `Background specifics: ${bgConfig.promptFragment}\n`;
  } else if (bgConfig.mode === "prompt_only") {
    fullPrompt += `[STRICT]: Only follow this specific background instruction: ${bgConfig.promptFragment || 'Empty minimalist background'}.\n`;
    fullPrompt += `Do NOT add environmental details not mentioned here.\n`;
  } else if (bgConfig.mode === "none") {
    fullPrompt += `Make the background entirely empty, minimalist, or non-existent. NO environmental detail. Focus purely on the subject.\n`;
  } else if (bgConfig.mode === "auto") {
    fullPrompt += `Background complexity: Balanced. Let AI decide based on prompt context.\n`;
  } else {
    fullPrompt += `Background complexity: Balanced.\n`;
  }

  if (!bgConfig.allowTransparency && bgConfig.mode !== 'transparent' && bgConfig.mode !== 'transparent_neo') {
    fullPrompt += `Ensure the background is fully opaque.\n`;
  }

  const referenceParts = processReferenceNotes(referenceAssets);

  return { textPrompt: fullPrompt, referenceParts };
};

export const buildExtractClothesPrompt = (
  gameContext: GameContext,
  bgConfig: BackgroundConfig
): string => {
  let bgInstruction = "";
  if (bgConfig.mode === 'transparent' || bgConfig.mode === 'transparent_neo') {
    const key = bgConfig.mode === 'transparent' ? '#FFFFFF' : (bgConfig.keyColor || "#FFFFFF");
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    bgInstruction = `[MANDATORY]: Render the result on a perfectly FLAT SOLID ${colorName} BACKGROUND (${key}) ONLY. No environmental detail.`;
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

export const buildBackgroundAssetPrompt = (
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

export const buildBackgroundPrompt = buildBackgroundAssetPrompt;

export const buildBackgroundRegenPrompt = (
  gameContext: GameContext,
  bgConfig: BackgroundConfig
): string => {
    let p = `TASK: Replace the background of this image. Keep the foreground subjects exactly as they are.
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
NEW BACKGROUND: `;
    if (bgConfig.mode === "solid") {
      if (bgConfig.gradientType === 'linear') p += `linear gradient ${bgConfig.color} to ${bgConfig.secondaryColor || '#000000'}.`;
      else if (bgConfig.gradientType === 'radial') p += `radial gradient from ${bgConfig.color} to ${bgConfig.secondaryColor || '#000000'} at the edges.`;
      else p += `solid color ${bgConfig.color}.`;
    } else if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
      const key = bgConfig.mode === "transparent" ? "#FFFFFF" : (bgConfig.keyColor || "#FFFFFF");
      const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
      p += `[MANDATORY] SOLID ${colorName} (${key}) with ZERO texture.`;
    } else if (bgConfig.mode === "none") {
      p += `Empty minimalist or pure white background with NO detail.`;
    } else if (bgConfig.mode === "auto") {
      p += `Balanced background based on prompt content.`;
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

/**
 * Build prompt for suggesting sprite sheet poses
 */
export const buildSpriteSheetPromptsPrompt = (
  globalPrompt: string,
  frameCount: number,
  gameContext: GameContext
): string => {
  return `TASK: Suggest a sequence of ${frameCount} distinct character poses or variations for a sprite sheet.
CHARACTER DESCRIPTION: ${globalPrompt}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.

Return a JSON object with:
- "poses": An array of ${frameCount} strings, each being a short, descriptive prompt for a single frame (e.g. "Standing idle, front view", "Swinging a sword, side view").
- "refinedGlobalPrompt": A slightly improved version of the character description for better AI consistency.`;
};

/**
 * Build prompt for suggesting sprite sheet animation frames
 */
export const buildSpriteSheetAnimationPromptsPrompt = (
  globalPrompt: string,
  animationGoal: string,
  frameCount: number,
  gameContext: GameContext
): string => {
  return `TASK: Suggest a sequence of ${frameCount} animation frames for a sprite sheet.
ANIMATION GOAL: ${animationGoal}
CHARACTER DESCRIPTION: ${globalPrompt}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.

Return a JSON object with:
- "poses": An array of ${frameCount} strings, each being a prompt for a single frame in the animation sequence (e.g. "Frame 1: Starting the jump", "Frame 2: Mid-air peak").
- "refinedGlobalPrompt": A slightly improved version of the character description.`;
};

export const buildPoseDescription = (poseData: PoseData): string => {
  if (!poseData.joints || poseData.joints.length === 0) return "";
  
  let description = "CRITICAL: SKELETAL POSE GUIDE (Normalized 0-100 Canvas Coordinates):\n";
  description += "The character's anatomy MUST be built exactly upon these spatial anchors. Do NOT deviate from these coordinates.\n";
  
  poseData.joints.forEach(j => {
    description += `- ${j.name.toUpperCase()}: [X:${Math.round(j.x)}, Y:${Math.round(j.y)}]\n`;
  });
  
  description += "\n[ANATOMICAL CONSTRAINTS]:\n";
  description += "- The character's head must be centered at the HEAD coordinate.\n";
  description += "- Limbs must connect logically (Shoulder -> Elbow -> Wrist) following the provided points.\n";
  description += "- The overall silhouette and posture MUST match the skeletal structure defined by these points.\n";
  description += "- This is a spatial requirement, not just a suggestion. Treat these points as a hard wireframe.";
  
  return description;
};

export const buildPoseStudioPrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgConfig: BackgroundConfig,
  referenceAssets: ReferenceAsset[],
  poseData: PoseData,
  safeZone?: SafeZoneConfig
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  const { textPrompt, referenceParts } = buildIllustrationPrompt(
    basePrompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone
  );
  
  let fullPrompt = `POSE-DRIVEN CHARACTER GENERATION.\n`;
  fullPrompt += buildPoseDescription(poseData) + "\n\n";
  fullPrompt += textPrompt;
  
  return { textPrompt: fullPrompt, referenceParts };
};

/**
 * Build prompt for Map Grid Generator feature
 */
export const buildMapGridPrompt = (
  userPrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  config: MapGridConfig
): string => {
  let fullPrompt = `MAP GRID GENERATION TASK.\n`;
  fullPrompt += `OBJECTIVE: Generate a clean 2D game map image. NO characters. NO UI. NO HUD. NO text. NO borders.\n`;
  
  fullPrompt += `VIEW MODE: ${config.viewMode === 'top-down' ? 'Top-Down (Orthographic 2D)' : 'Isometric (2.5D angled view)'}.\n`;
  
  if (config.viewMode === 'top-down') {
    fullPrompt += `- Flat orthographic projection.\n`;
    fullPrompt += `- Consistent lighting.\n`;
    fullPrompt += `- Shadow only under walls/decor.\n`;
    fullPrompt += `- Tile-aligned decorations.\n`;
  } else {
    fullPrompt += `- 45-degree diamond grid.\n`;
    fullPrompt += `- Proper depth layering.\n`;
    fullPrompt += `- Wall height extrusion.\n`;
    fullPrompt += `- Soft directional shadow.\n`;
    fullPrompt += `- Height-based occlusion.\n`;
  }

  fullPrompt += `GRID CONFIGURATION: ${config.gridWidth}x${config.gridHeight} cells. Cell size: ${config.cellSize}px.\n`;
  
  if (config.preset !== 'custom') {
    const presetName = config.preset.replace('_', ' ');
    fullPrompt += `ENVIRONMENT PRESET: ${presetName}.\n`;
  }

  fullPrompt += `STYLE CONTROLS:\n`;
  fullPrompt += `- Primary Floor Color: ${config.primaryColor}\n`;
  fullPrompt += `- Secondary Accent Color: ${config.accentColor}\n`;
  fullPrompt += `- Shadow Intensity: ${config.shadowIntensity}%\n`;
  fullPrompt += `- Light Direction: ${config.lightDirection.replace('-', ' ')}\n`;
  fullPrompt += `- Detail Density: ${config.detailDensity}\n`;
  fullPrompt += `- Decoration Level: ${config.decorationLevel}\n`;

  fullPrompt += `\nCORE DESCRIPTION: ${userPrompt || 'A detailed game map'}\n`;
  
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `NARRATIVE CONTEXT: ${gameContext.setting}. ${gameContext.tone}.\n`;
  }
  
  if (styleSnippet) {
    fullPrompt += `RENDER STYLE: ${styleSnippet}\n`;
  }

  if (config.transparentBackground) {
    fullPrompt += `\n[STRICT CONSTRAINT]: Render with a TRANSPARENT background where applicable (e.g. outside the map boundaries).\n`;
  }

  fullPrompt += `\n[FINAL REMINDER]: ONLY generate environment and decorations. ABSOLUTELY NO CHARACTERS OR UI ELEMENTS.`;
  
  return fullPrompt;
};
