
import {
  GameContext,
  BackgroundConfig,
  ReferenceAsset,
  FrameElement,
  BackgroundPatternType,
  SafeZoneConfig,
  ClothesParams,
} from "../types";

/**
 * SOURCE OF TRUTH: docs/ai-prompts/illustration-generation.md
 */
export const buildIllustrationPrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgConfig: BackgroundConfig,
  referenceAssets: ReferenceAsset[],
  safeZone?: SafeZoneConfig
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  let fullPrompt = "";

  // 1. Game Context
  if (gameContext.setting || gameContext.tone || gameContext.visualConstraints) {
    fullPrompt += `GAME CONTEXT:\n`;
    if (gameContext.setting) fullPrompt += `Setting: ${gameContext.setting}\n`;
    if (gameContext.tone) fullPrompt += `Tone: ${gameContext.tone}\n`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}\n`;
    }
    fullPrompt += `(Ensure the illustration fits this setting and tone strictly.)\n\n`;
  }

  // 2. Subject & Style
  fullPrompt += `SUBJECT: ${basePrompt}\n`;
  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
  }

  // 3. Strict Reference Adherence (CRITICAL for consistency)
  if (referenceAssets.length > 0) {
    fullPrompt += `\nREFERENCE VISUAL CONSISTENCY (CRITICAL):\n`;
    fullPrompt += `You have been provided with reference images. You MUST strictly adhere to the visual design shown in these references.\n`;
    fullPrompt += `1. CLOTHING: Keep the character's outfit EXACTLY as seen in the references. Do not redesign, simplify, or change colors of the clothes.\n`;
    fullPrompt += `2. IDENTITY: Maintain the exact facial features, hair style, and body type.\n`;
    fullPrompt += `3. STYLE: Use the art style from the references if specified.\n`;
    fullPrompt += `Do not invent new costume elements unless the prompt explicitly asks for a costume change.\n`;
  }

  // 4. Safe Zone / Zoom-Out Composition
  if (safeZone && safeZone.enabled) {
    fullPrompt += `\nCOMPOSITION (IMPORTANT - ZOOM OUT): \n`;
    fullPrompt += `Compose the scene so that the MAIN SUBJECT and all KEY DETAILS are strictly contained within the CENTRAL ${Math.round(
      safeZone.width
    )}% width and ${Math.round(safeZone.height)}% height of the image.\n`;
    fullPrompt += `The outer areas (top, bottom, sides) must be treated as EXTENDED BACKGROUND or ATMOSPHERE (filler) that can be safely cropped away.\n`;
    fullPrompt += `Do NOT place important objects near the edges. Keep the focus tight in the safe zone.\n`;
  }

  // 5. Background Config
  fullPrompt += `\nBACKGROUND:\n`;
  if (bgConfig.mode === "solid") {
    fullPrompt += `Use a flat, solid background color: ${bgConfig.color}. No detailed scene, no gradients.\n`;
  } else if (bgConfig.mode === "transparent") {
    // Prompt for easy-to-remove background
    fullPrompt += `ISOLATION: The subject must be completely isolated on a PURE SOLID WHITE background.\n`;
    fullPrompt += `No shadows, no gradients, no floor, no horizon. Clean silhouette for easy background removal.\n`;
  } else if (bgConfig.mode === "scene" && bgConfig.promptFragment) {
    fullPrompt += `Background specifics: ${bgConfig.promptFragment}\n`;
  } else if (bgConfig.mode === "pattern" && bgConfig.patternType) {
    const type = bgConfig.patternType;
    fullPrompt += `Background Style: ${type.toUpperCase()} PATTERN.\n`;
    if (type === 'texture') fullPrompt += "Background should be a seamless-style texture (wood, stone, metal, fabric).\n";
    else if (type === 'abstract') fullPrompt += "Background should be an abstract design with shapes, energy flows, or gradients. No distinct scenery.\n";
    else if (type === 'ui_backdrop') fullPrompt += "Background should be a dark, subtle UI backdrop. Low contrast, vignette edges.\n";
    else if (type === 'muted') fullPrompt += "Background should be soft, muted, and desaturated. Pastel tones, smooth gradients, no harsh details. High readability.\n";
    else if (type === 'scene') fullPrompt += "Background should be a detailed environmental scene.\n";
    
    if (bgConfig.promptFragment) {
       fullPrompt += `Pattern specifics: ${bgConfig.promptFragment}\n`;
    }
  } else {
    fullPrompt += `Background complexity: ${
      bgConfig.mode === "none" ? "Balanced" : "Complex"
    }\n`;
  }

  if (!bgConfig.allowTransparency && bgConfig.mode !== 'transparent') {
    fullPrompt += `Ensure the background is fully filled with no transparency.\n`;
  }

  // 6. Reference Asset Roles (Text parts)
  const referenceParts: { text?: string }[] = [];
  referenceAssets.forEach((asset, index) => {
    if (asset.roleNote) {
      referenceParts.push({
        text: `Reference Image ${index + 1} Guidance: ${asset.roleNote}`,
      });
    }
  });

  return { textPrompt: fullPrompt, referenceParts };
};

export const buildClothesPrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  bgConfig: BackgroundConfig,
  referenceAssets: ReferenceAsset[],
  safeZone?: SafeZoneConfig,
  clothesParams?: ClothesParams
): { textPrompt: string; referenceParts: { text?: string }[] } => {
  let fullPrompt = "FASHION DESIGN TASK / CLOTHING ASSET GENERATION\n";

  // 1. Context
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `CONTEXT: ${gameContext.setting}. ${gameContext.tone}\n`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}\n`;
    }
  }

  // 2. Render Mode (Model vs Asset)
  const isAssetMode = clothesParams?.renderMode === 'asset';

  if (isAssetMode) {
    fullPrompt += `\nMODE: GHOST MANNEQUIN / 3D ASSET\n`;
    fullPrompt += `Generate the clothing item as a standalone 3D asset in 'Ghost Mannequin' style.\n`;
    fullPrompt += `The clothing must appear filled/volumetric as if worn, but the body itself must be INVISIBLE.\n`;
    fullPrompt += `CRITICAL: NO HUMAN SKIN, NO HEAD, NO HANDS, NO FEET. Just the hollow fabric shell.\n`;
  } else {
    fullPrompt += `\nMODE: ON MODEL / CHARACTER\n`;
    fullPrompt += `Generate the outfit worn by a character/mannequin.\n`;
  }

  // 3. Subject (The Outfit)
  fullPrompt += `\nDESIGN TARGET: ${basePrompt}\n`;
  fullPrompt += "Focus on high-fidelity material rendering (fabric texture, metal shine, leather grain).\n";

  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
  }

  // 4. Smart Reference Logic (Mannequin vs Style)
  const styles = referenceAssets.filter(r => r.roleNote && /style|texture|palette|color/i.test(r.roleNote));
  const mannequins = referenceAssets.filter(r => !r.roleNote || !/style|texture|palette|color/i.test(r.roleNote));

  // Mannequin Logic
  if (mannequins.length > 0) {
    fullPrompt += `\nFIT TO REFERENCE ANATOMY (CRITICAL):\n`;
    if (isAssetMode) {
        fullPrompt += `Use the provided reference image(s) (marked as Mannequin/Base) ONLY for size, scale, and pose data.\n`;
        fullPrompt += `MOLD the ghost clothing to fit the EXACT body proportions and pose of this reference.\n`;
        fullPrompt += `DO NOT render the character from the reference. Only the clothes fitting that invisible body.\n`;
    } else {
        fullPrompt += `Use the provided reference image(s) (marked as Mannequin/Base) as the BODY BASE.\n`;
        fullPrompt += `1. POSE & ANATOMY: Strictly maintain the pose, body shape, and proportions of the character in the reference.\n`;
        fullPrompt += `2. OUTFIT REPLACEMENT: Replace the character's existing clothes with the new design described above.\n`;
        fullPrompt += `3. FACE/HEAD: Keep the face and head consistent with the reference if visible, or treat as a mannequin if generic.\n`;
    }
  } else {
    if (isAssetMode) {
       fullPrompt += `\nPRESENTATION:\n`;
       fullPrompt += `Display the hollow clothing in a standard upright fashion pose.\n`;
    } else {
       fullPrompt += `\nPRESENTATION:\n`;
       fullPrompt += `Display the clothing on a neutral mannequin or model in a standard A-pose or fashion pose.\n`;
    }
  }

  // Style Logic
  if (styles.length > 0) {
    fullPrompt += `\nSTYLE REFERENCES:\n`;
    fullPrompt += `Use the additional reference images (marked as Style/Texture) to inform the rendering style, fabric texture, or color palette.\n`;
  }

  // 5. Safe Zone
  if (safeZone && safeZone.enabled) {
    fullPrompt += `\nCOMPOSITION (IMPORTANT):\n`;
    fullPrompt += `Keep the entire subject strictly strictly contained within the CENTRAL ${Math.round(safeZone.width)}% area of the canvas.\n`;
    fullPrompt += `Leave the outer edges empty or filled with background extension.\n`;
  }

  // 6. Background (Critical for assets)
  fullPrompt += `\nBACKGROUND:\n`;
  if (bgConfig.mode === "transparent") {
    fullPrompt += `ISOLATION: The subject must be completely isolated on a PURE SOLID WHITE background.\n`;
    fullPrompt += `CRITICAL: Do not cast shadows on the floor. Do not render a floor. Floating isolation.\n`;
    fullPrompt += `Clean, sharp silhouette for easy background removal.\n`;
  } else if (bgConfig.mode === "solid") {
    fullPrompt += `Use a flat, solid background color: ${bgConfig.color}. No details.\n`;
  } else if (bgConfig.mode === 'pattern') {
     fullPrompt += `Background: ${bgConfig.patternType} pattern. ${bgConfig.promptFragment}\n`;
  } else {
    fullPrompt += `Background: Simple, neutral studio backdrop.\n`;
  }

  const referenceParts: { text?: string }[] = [];
  referenceAssets.forEach((asset, index) => {
    const isStyle = styles.some(s => s.id === asset.id);
    const label = isStyle ? "Style/Texture Ref" : "Mannequin/Base";
    referenceParts.push({
      text: `Reference ${index + 1} (${label}): ${asset.roleNote || (isStyle ? 'Use for style' : 'Use pose and body shape.')}`,
    });
  });

  return { textPrompt: fullPrompt, referenceParts };
};

export const buildFramePrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  elements: FrameElement[] = []
): string => {
  let fullPrompt =
    "Create a high-quality GUI Card Frame/Border for a digital trading card game.\n";

  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}\n`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}\n`;
    }
  }

  fullPrompt += `THEME/DESIGN: ${basePrompt}\n`;
  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
  }

  fullPrompt += `
REQUIREMENTS:
1. The image must be a BORDER/FRAME with a blank/transparent center.
2. High contrast, production-ready asset.
3. Do NOT generate a character or scene inside the frame. Keep the center clean.
`;

  if (elements.length > 0) {
    fullPrompt += "\nINCLUDE THE FOLLOWING ELEMENTS IN THE FRAME DESIGN:\n";
    if (elements.includes("name_banner")) {
      fullPrompt += "- A distinct banner or header area at the TOP for the card Name.\n";
    }
    if (elements.includes("mana_cost")) {
      fullPrompt += "- A socket or circle (gem holder) in one of the TOP CORNERS for a Cost value.\n";
    }
    if (elements.includes("description_box")) {
      fullPrompt += "- A semi-transparent or solid text box area at the BOTTOM for card description.\n";
    }
    if (elements.includes("power_toughness")) {
      fullPrompt += "- A badge or shield emblem in the BOTTOM-RIGHT corner for stats.\n";
    }
  } else {
    fullPrompt +=
      "Ensure there is a clear area at the top for a Title and at the bottom for Text.\n";
  }

  return fullPrompt;
};

export const buildBackgroundPrompt = (
  basePrompt: string,
  gameContext: GameContext,
  styleSnippet: string,
  patternType: BackgroundPatternType = "scene"
): string => {
  let fullPrompt = "Create a high-quality background image for a game.\n";

  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `CONTEXT: ${gameContext.setting}. ${gameContext.tone}\n`;
  }

  fullPrompt += `TYPE: ${patternType.toUpperCase()}\n`;

  if (patternType === "texture") {
    fullPrompt +=
      "Create a seamless or near-seamless texture. Focus on surface details (wood, stone, metal, cloth). Flat lighting, high texture fidelity.\n";
  } else if (patternType === "abstract") {
    fullPrompt +=
      "Create an abstract design. Focus on shapes, gradients, energy flows, or magical effects. No distinct objects or figures.\n";
  } else if (patternType === "ui_backdrop") {
    fullPrompt +=
      "Create a dark, subtle background suitable for UI screens. Low contrast, vignette edges, non-distracting patterns.\n";
  } else if (patternType === "muted") {
    fullPrompt +=
      "Create a soft, muted background with desaturated colors. Pastel tones, very low contrast, smooth gradients, no harsh details. High readability for text overlay.\n";
  } else {
    // Scene
    fullPrompt +=
      "Create an environmental scene. Atmospheric perspective, depth, mood. NO central characters or foreground subjects.\n";
  }

  fullPrompt += `THEME/PROMPT: ${basePrompt}\n`;

  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}\n`;
  }

  return fullPrompt;
};

/**
 * SOURCE OF TRUTH: docs/ai-prompts/background-regeneration.md
 */
export const buildBackgroundRegenPrompt = (
  gameContext: GameContext,
  bgConfig: BackgroundConfig
): string => {
  let prompt =
    "Keep the main subject/foreground exactly as is. Replace the background completely.\n";

  if (gameContext.setting || gameContext.tone) {
    prompt += `Context: ${gameContext.setting}, ${gameContext.tone}.\n`;
  }

  prompt += "New Background instructions:\n";

  if (bgConfig.mode === "solid") {
    prompt += `Make the background a flat, solid color: ${bgConfig.color}. No gradients, no details.\n`;
  } else if (bgConfig.mode === "transparent") {
    prompt += `Make the background PURE SOLID WHITE. Completely isolate the subject. No shadows, no floor.\n`;
  } else if (bgConfig.mode === "scene" && bgConfig.promptFragment) {
    prompt += `${bgConfig.promptFragment}\n`;
  } else if (bgConfig.mode === "pattern" && bgConfig.patternType) {
    const type = bgConfig.patternType;
    prompt += `Background Style: ${type.toUpperCase()} PATTERN.\n`;
    if (type === 'texture') prompt += "Seamless-style texture (wood, stone, metal, fabric). Flat lighting.\n";
    else if (type === 'abstract') prompt += "Abstract design with shapes, energy flows, or gradients. No scenery.\n";
    else if (type === 'ui_backdrop') prompt += "Dark, subtle UI backdrop. Low contrast, vignette edges.\n";
    else if (type === 'muted') prompt += "Soft, muted, and desaturated colors. Pastel tones, smooth gradients. High readability.\n";
    else if (type === 'scene') prompt += "Detailed environmental scene.\n";
    
    if (bgConfig.promptFragment) {
       prompt += `Pattern specifics: ${bgConfig.promptFragment}\n`;
    }
  } else {
    prompt += `Create a fitting background for the subject.\n`;
  }

  if (!bgConfig.allowTransparency && bgConfig.mode !== 'transparent') {
    prompt += `Ensure the background is fully filled with no transparency.\n`;
  }

  return prompt;
};

export const buildStyleAnalysisPrompt = (): string => {
  return `
    Analyze this reference image for visual style. 
    Respond with a JSON object containing:
    - "description": a human-readable summary (2-4 sentences)
    - "promptSnippet": a concise prompt tail describing rendering style, palette, and mood.
  `;
};

export const buildPromptSuggestionsPrompt = (currentPrompt: string): string => {
  return `
    Based on the user's current art prompt: "${currentPrompt}", 
    suggest 3 creative, short additions or refinements to make the image more interesting or detailed for a card game.
    If the prompt is empty, suggest 3 diverse cool fantasy/sci-fi concepts.
    Keep suggestions concise (under 10 words each).
    Return a JSON array of strings.
  `;
};

export const buildCardSuggestionsPrompt = (
  artPrompt: string,
  currentName: string
): string => {
  return `
    Based on the art prompt: "${artPrompt}" and current card name: "${currentName}",
    suggest 5 fantasy card names and 3 short card effects (game mechanics or flavor text).
    Return a JSON object with keys "names" (array of strings) and "effects" (array of strings).
  `;
};

export const buildRefinementPrompt = (currentPrompt: string): string => {
  return `
    You are a prompt editing engine. Your ONLY task is to correct grammar, flow, and clarity of the input prompt.
    
    Rules:
    1. Do NOT add conversational text (like "Here is the refined prompt").
    2. Do NOT add options or variations.
    3. Do NOT change the core meaning or subject.
    4. Output ONLY the refined prompt string.
    
    Input Prompt: "${currentPrompt}"
  `;
};

// Magic Resizer / Outpainting prompt with strict content-aware rules
export const buildOutpaintPrompt = (
  userInstructions: string,
  gameContext: GameContext,
  styleSnippet: string
): string => {
  let prompt = "";

  prompt += "Image Editing Task: Magic Resizer / Outpainting / Uncropping.\n";
  prompt +=
    "GOAL: Resize or change the aspect ratio by extending ONLY the existing background and surfaces.\n";
  prompt +=
    "The final image must look like a natural, uncropped version of the original.\n";

  // Generic input description (works for many compositions)
  prompt += "\nINPUT DESCRIPTION:\n";
  prompt +=
    "- The image contains a central main subject (character or key object) and supporting elements.\n";
  prompt +=
    "- There is existing background and one or more surfaces (such as ground, floor, table, wall, sky, or environment) around the subject.\n";
  prompt +=
    "- These existing elements define the style, lighting, shading, and perspective that MUST be preserved.\n";

  // Strict constraints for outpainting
  prompt += "\nSTRICT RULES (VERY IMPORTANT):\n";
  prompt += "1. DO NOT MODIFY THE EXISTING MAIN SUBJECT OR OBJECTS.\n";
  prompt +=
    "   - Keep all existing characters, poses, expressions, props, and effects exactly the same.\n";
  prompt +=
    "   - The original region should remain pixel-perfect; only extend beyond it.\n";
  prompt += "2. CONTENT-AWARE EXTENSION ONLY.\n";
  prompt +=
    "   - Extend ONLY the existing background and existing surfaces into the new areas.\n";
  prompt +=
    "   - Use the same colors, materials, textures, lighting, and perspective as in the original.\n";
  prompt += "3. NO NEW OBJECTS OR STRUCTURES.\n";
  prompt +=
    "   - Do NOT add new items, props, characters, creatures, furniture, windows, doors, buildings, trees, decorations, or text.\n";
  prompt +=
    "   - Do NOT introduce new types of surfaces (no extra floors, walls, platforms, etc.).\n";
  prompt +=
    "   - The scene layout must remain identical; only continue what is already there.\n";
  prompt += "4. NO REMOVAL OR REPOSITIONING.\n";
  prompt +=
    "   - Do NOT move, scale, rotate, crop, or remove any existing elements.\n";
  prompt +=
    "   - Preserve the composition and framing of the original content.\n";
  prompt += "5. SEAMLESS, SHARP BLENDING (NO UNINTENDED BLUR OR BANDS).\n";
  prompt +=
    "   - The transition between original pixels and outpainted pixels must be invisible.\n";
  prompt +=
    "   - Match the exact lighting direction, intensity, shading, line work, texture noise, and rendering style.\n";
  prompt +=
    "   - Do NOT add blur, smearing, soft-focus, or gradient bands at the top or bottom unless the user explicitly requests blur.\n";
  prompt +=
    "   - The extended areas must clearly continue the same textured background (for example, the same painted wall or sky) with consistent color and value, not a flat solid bar.\n";
  prompt += "6. KEEP STYLE AND MOOD CONSISTENT.\n";
  prompt +=
    "   - The extended areas must look like they were always part of the original illustration.\n";
  prompt +=
    "   - Do not shift the art style, palette, or rendering technique.\n";
  prompt += "7. NO TEXT OR UI ELEMENTS.\n";
  prompt +=
    "   - Do NOT add labels, signs, logos, borders, or interface elements.\n";

  // Aspect ratio / resizing guidance (e.g. 1088x960 -> 1024x1024)
  prompt += "\nRESIZE / ASPECT RATIO BEHAVIOR:\n";
  prompt +=
    "- When changing from a non-square to a 1:1 aspect ratio (for example, 1088x960 to 1024x1024),\n";
  prompt +=
    "  fill any new or uncovered areas by CONTINUING the existing background and surfaces.\n";
  prompt +=
    "- Do NOT fill new areas with flat solid colors or simple vertical gradients.\n";
  prompt +=
    "- The color, texture, and shading of the extended regions must match the original background exactly (no darker or lighter stripes at the top or bottom).\n";
  prompt +=
    "- Keep all important content (main subject and key objects) fully visible and unchanged.\n";
  prompt +=
    "- Do NOT crop out any part of the main subject; extend surrounding regions instead.\n";

  // Game context is used only for subtle atmosphere/lighting
  if (gameContext.setting || gameContext.tone) {
    const contextStr = [gameContext.setting, gameContext.tone]
      .filter(Boolean)
      .join(". ");
    prompt += `\nSETTING / ATMOSPHERE (for lighting & mood only, NOT for adding new objects): ${contextStr}.\n`;
    prompt +=
      "Use this only to match mood and lighting, not to introduce new props or scenery.\n";
  }

  if (styleSnippet) {
    prompt += `\nSTYLE GUIDANCE:\n- Match this style exactly: ${styleSnippet}\n`;
    prompt +=
      "- Keep line art, coloring, shading, and texture perfectly consistent with the original image.\n";
  }

  // User instructions: only allowed to influence how existing areas are extended
  if (userInstructions && userInstructions.trim()) {
    prompt +=
      "\nUSER INSTRUCTIONS (APPLY ONLY TO EXTENDING EXISTING BACKGROUND/SURFACES):\n";
    prompt += `${userInstructions}\n`;
    prompt +=
      "Do NOT interpret these instructions as permission to add new objects, structures, surfaces, or blur unless the instructions explicitly mention blur.\n";
  } else {
    prompt += "\nDEFAULT INSTRUCTION:\n";
    prompt +=
      "Extend the current background and any existing surfaces so they naturally fill the new canvas size, with no additional objects, no flat color bands, and no added blur.\n";
  }

  return prompt;
};
