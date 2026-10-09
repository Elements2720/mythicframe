// src/mcp/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/constants/backgrounds.ts
var DEFAULT_BACKGROUND_CONFIG = {
  mode: "auto",
  color: "#ffffff",
  allowTransparency: false,
  promptFragment: "",
  patternType: "abstract",
  removeHoles: true,
  healingPower: 100,
  keyColor: "#ffffff",
  // Neo Defaults
  tolBg: 60,
  tolEdge: 75,
  softRadius: 3,
  decontamStrength: 85,
  preserveTrueMagenta: false,
  fxMode: false,
  // Neo v2 Defaults
  steamSafe: true,
  neutralizeStrength: 85,
  alphaBias: 10
};

// src/constants/gacha.ts
var CHIBI_STYLE_CONFIG = {
  standard: {
    label: "Standard",
    icon: "fa-person",
    suffix: "anatomically standard human proportions, head-to-body ratio 1:7, realistic silhouette, tall posture",
    desc: "Natural, realistic human scale."
  },
  deformed_4h: {
    label: "4-Head",
    icon: "fa-child",
    suffix: "semi-deformed proportions, 4-heads tall, head-to-body ratio 1:3, youthful cute silhouette, stylized limbs",
    desc: 'Youthful "Puchi" style proportions.'
  },
  chibi_3h: {
    label: "3-Head",
    icon: "fa-child-reaching",
    suffix: "classic chibi proportions, 3-heads tall, head-to-body ratio 1:2, large expressive head, short compact limbs, gacha sprite style",
    desc: "The gold standard for gacha sprites."
  },
  micro_2h: {
    label: "Micro (2-H)",
    icon: "fa-baby",
    suffix: "extreme chibi proportions, micro scale, 2-heads tall, head is 50% of total height, tiny body, nendoroid sticker style",
    desc: "Maximum cuteness. Tiny body, massive head."
  }
};
var GACHA_ASSET_PRESETS = [
  {
    name: "Vassal Card",
    ratio: "3:4",
    icon: "fa-id-card",
    suffix: "Waist-up shot of a single anime character (no group), centered, direct gaze, stoic expression, high-quality polished cel-shaded game art, no background or minimal flat color, character only.",
    bgMode: "solid",
    framing: "waist-up"
  },
  {
    name: "Battle Sprite",
    ratio: "1:1",
    icon: "fa-sword",
    suffix: "Full-body sprite, standing, frontal view, vivid and clear costume or armor details, clean cel-shading, lively pose. Style is polished and visually appealing, designed for tactical RPG battle screens. [STRICT NEGATIVE: no moe, no shining eyes, not overly cute, not generic anime style, no exaggerated expressions, no kawaii]",
    bgMode: "solid",
    chibi: true,
    framing: "full-body"
  },
  {
    name: "Avatar Icon",
    ratio: "1:1",
    icon: "fa-circle-user",
    suffix: "Headshot / Close-up of a single character, focus entirely on the head and face, centered, direct gaze, solid white background, clean polished game art style.",
    bgMode: "solid",
    framing: "head-only"
  },
  {
    name: "Chambers CG",
    ratio: "16:9",
    icon: "fa-couch",
    suffix: "Full character depicted in a highly detailed personal chamber or room tailored specifically to the character's race, class, and personality. The setting MUST be located within the dark and imposing Castle of the Demon Lord. For example, a Prime Titan might have a massive stone cavern with chains, while a noble vampire might have a gothic study. The room should perfectly reflect their nature. Relaxed/at ease pose, soft evening or ambient light, cinematic depth, immersive setting, polished high-quality gacha game CG illustration.",
    bgMode: "scene",
    framing: "full-body"
  },
  {
    name: "Dialogue Portrait",
    ratio: "3:4",
    icon: "fa-comments",
    suffix: "Anime character close-up portrait, waist-up to shoulders, character faces 45\xB0 to viewer\u2019s left, subtle facial emotions, natural posture, focus on face and upper body only, no background, no effects, clean transparent asset for dialogue UI.",
    bgMode: "solid",
    framing: "bust"
  },
  {
    name: "Splash Art",
    ratio: "16:9",
    icon: "fa-fire",
    suffix: "Epic dynamic splash illustration for gacha game, single character full-body, dramatic pose, vibrant action movement, centered composition, highly detailed background, masterpiece lighting, sense of scale, cinematic drama.",
    bgMode: "scene",
    framing: "full-body"
  },
  {
    name: "Full Portrait",
    ratio: "9:16",
    icon: "fa-user",
    suffix: "Full body character, fully visible from head to toe, standing, stylish RPG-style costume, detailed and expressive posture, clean polished cel-shading, high-quality illustration suitable for gacha summon view or collection screen.",
    bgMode: "scene",
    framing: "full-body"
  }
];
var DEFAULT_GACHA_ASSETS = GACHA_ASSET_PRESETS.map((p, idx) => ({
  id: `default-${idx}`,
  name: p.name,
  aspectRatio: p.ratio,
  size: "1K",
  promptSuffix: p.suffix,
  imageUrl: null,
  status: "pending",
  bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: p.bgMode || "auto", removeHoles: true, healingPower: 100 },
  chibiConfig: p.chibi ? {
    enabled: true,
    proportions: "simple",
    headStyle: "realistic",
    bodyStyle: "geometric",
    focus: p.name === "Battle Sprite" ? "detailed" : "kawaii",
    presetProportion: p.name === "Battle Sprite" ? "deformed_4h" : "chibi_3h",
    bodyRatio: p.name === "Battle Sprite" ? "1:4" : "1:2"
  } : { enabled: false, proportions: "simple", headStyle: "realistic", bodyStyle: "geometric", focus: "kawaii" },
  framing: p.framing || "full-body"
}));

// src/services/promptTemplates.ts
var isCharacterPrompt = (prompt) => {
  const characterKeywords = [
    "character",
    "person",
    "man",
    "woman",
    "girl",
    "boy",
    "knight",
    "mage",
    "warrior",
    "hero",
    "villain",
    "creature",
    "monster",
    "human",
    "elf",
    "dwarf",
    "orc",
    "goblin",
    "portrait",
    "full body",
    "standing",
    "pose",
    "outfit",
    "clothing",
    "face",
    "eyes",
    "hair",
    "skin",
    "body type",
    "anatomy",
    "npc",
    "player",
    "avatar",
    "soldier",
    "paladin",
    "rogue",
    "thief",
    "assassin",
    "priest",
    "cleric",
    "druid",
    "monk",
    "bard",
    "warlock",
    "sorcerer",
    "necromancer",
    "demon",
    "angel",
    "god",
    "goddess",
    "king",
    "queen",
    "prince",
    "princess",
    "lord",
    "lady",
    "villager",
    "merchant",
    "blacksmith",
    "guard"
  ];
  const p = prompt.toLowerCase();
  return characterKeywords.some((word) => p.includes(word));
};
var isMapPrompt = (prompt) => {
  const mapKeywords = [
    "map",
    "isometric",
    "3d map",
    "environment",
    "landscape",
    "terrain",
    "forest",
    "dungeon",
    "castle",
    "city",
    "town",
    "village",
    "room",
    "interior",
    "exterior",
    "world map",
    "region",
    "building",
    "structure",
    "architecture"
  ];
  const p = prompt.toLowerCase();
  return mapKeywords.some((word) => p.includes(word));
};
var isMagicCirclePrompt = (prompt) => {
  const magicKeywords = [
    "magic circle",
    "rune",
    "sigil",
    "pentagram",
    "glyph",
    "spell circle",
    "summoning circle",
    "arcane circle",
    "enchantment circle",
    "symbol",
    "icon",
    "logo",
    "crest",
    "emblem"
  ];
  const p = prompt.toLowerCase();
  return magicKeywords.some((word) => p.includes(word));
};
var buildUIReimaginePrompt = (userPrompt, gameContext, styleSnippet, changeBg, uiMood, uiElements, uiColors, uiArchetype, uiMaterial, lockPositions = false) => {
  let fullPrompt = `UI DESIGN & HUD OVERHAUL TASK.
`;
  fullPrompt += `OBJECTIVE: Create a professional, clear, and functional game interface layer.
`;
  if (uiArchetype) {
    fullPrompt += `INTERFACE ARCHETYPE: Use a ${uiArchetype.replace("-", " ")} structural framework.
`;
  }
  if (uiMaterial) {
    fullPrompt += `SURFACE MATERIAL: Apply a ${uiMaterial.replace("-", " ")} finish to all HUD elements.
`;
  }
  if (uiMood) {
    fullPrompt += `INTERFACE STYLE/MOOD: ${uiMood}
`;
  }
  if (uiColors) {
    fullPrompt += `COLOR THEME: Use Primary ${uiColors.primary} for accent/highlight and Secondary ${uiColors.secondary} for base elements. Ensure high contrast and legibility.
`;
  }
  if (uiElements && uiElements.length > 0) {
    fullPrompt += `COMPONENTS TO PRIORITIZE: ${uiElements.join(", ")}.
`;
  }
  fullPrompt += `CORE THEME: ${userPrompt || "Professional game interface"}
`;
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `NARRATIVE CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
`;
  }
  if (styleSnippet) {
    fullPrompt += `RENDER STYLE: ${styleSnippet}
`;
  }
  if (lockPositions) {
    fullPrompt += `
[STRICT LAYOUT LOCK]: RETAIN THE EXACT SPATIAL COORDINATES AND LAYOUT STRUCTURE of all existing UI components. Do NOT reposition buttons, health bars, or maps. Only reimagine their visual style and material.
`;
  }
  if (!changeBg) {
    fullPrompt += `
[STRICT CONSTRAINT]: PRESERVE ORIGINAL ART. Do NOT modify characters or the background environment. ONLY overlay the UI elements.
`;
  } else {
    fullPrompt += `
[PERMISSION]: REIMAGINE FULL SCENE. Adjust background art to seamlessly integrate with the new UI theme.
`;
  }
  fullPrompt += `
TECHNICAL QUALITY SPECS:
`;
  fullPrompt += `- NO GLOW/BLOOM ARTIFACTS: UI elements must be crisp and sharp.
`;
  fullPrompt += `- LEGIBILITY: HUD components must contrast strongly with the art behind them.
`;
  fullPrompt += `- CONSISTENCY: Ensure all elements share the same material and lighting source.`;
  return fullPrompt;
};
var processReferenceNotes = (referenceAssets) => {
  const referenceParts = [];
  referenceAssets.forEach((asset, index) => {
    let guidance = (asset.roleNote || "").trim();
    if (!guidance) {
      guidance = `PRIMARY CHARACTER/SUBJECT ANCHOR. Faithfully preserve the facial features, hairstyle, skin tone, clothing, and distinguishing aesthetic characteristics from Reference ${index + 1}.`;
    } else if (guidance.toLowerCase().includes("mannequin") || guidance.toLowerCase().includes("pose")) {
      guidance = `CRITICAL IDENTITY & POSE LOCK. Strictly replicate the facial structure, eye shape, body proportions, posture, and skin color from Reference ${index + 1}. Treat this reference as an immutable wireframe skeleton.`;
    } else if (guidance.toLowerCase().includes("style") || guidance.toLowerCase().includes("aesthetic")) {
      guidance = `STRICT AESTHETIC & STYLE SYNC. Match the exact rendering technique, line weight, color palette, lighting, and shading style from Reference ${index + 1}.`;
    } else if (guidance.toLowerCase().includes("look") || guidance.toLowerCase().includes("appearance") || guidance.toLowerCase().includes("clothes") || guidance.toLowerCase().includes("anchor") || guidance.toLowerCase().includes("identity")) {
      guidance = `IDENTITY & COSTUME ANCHOR. Use Reference ${index + 1} for character appearance, face, clothing, and features. Render the subject in the pose and composition described in the main prompt.`;
    }
    referenceParts.push({
      text: `Reference Image ${index + 1} Directives: ${guidance}`
    });
  });
  return referenceParts;
};
var buildClothesPrompt = (prompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, clothesParams) => {
  let fullPrompt = `CLOTHES DESIGN & ASSET SYNTHESIS.
`;
  if (clothesParams?.renderMode === "asset") {
    fullPrompt += `[STRICT NEGATIVE CONSTRAINT - MANDATORY]: ZERO BIOLOGICAL MATTER. Erase the character. NO face, NO eyes, NO skin, NO hair, NO hands, NO neck. The image MUST ONLY contain the clothing items.
`;
    fullPrompt += `OBJECTIVE: Render a HOLLOW GHOST OUTFIT as a 3D garment asset. The clothes must appear as if worn by an invisible void.
`;
  } else {
    fullPrompt += `OBJECTIVE: Render high-quality game assets.
`;
    fullPrompt += `[VISUAL INTEGRITY]: PRESERVE ALL CHARACTER FEATURES. Maintain skin color, facial structure, and hair identity exactly as seen in references.
`;
  }
  fullPrompt += `[STRICT STYLE RULE]: Adhere strictly to the illustrative/game-art style provided.
`;
  fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO TEXT. NO labels. NO watermarks. NO signatures. NO UI elements. NO speech bubbles.
`;
  fullPrompt += `SUBJECT: ${prompt}
`;
  if (prompt.toLowerCase().includes("undead") || prompt.toLowerCase().includes("skeleton") || prompt.toLowerCase().includes("skull")) {
    fullPrompt += `
[CRITICAL UNDEAD ANATOMY]: If the character is undead or skeletal, you MUST keep the skull structurally sound with the LOWER JAW INTACT AND ATTACHED. Do not render missing lower jaws. Ensure the head is PROPORTIONATE to the body width, do not make the head excessively large.
`;
  }
  if (clothesParams) {
    fullPrompt += `LAYOUT: ${clothesParams.layout === "spread" ? "Multi-view orthographic fashion sheet (Front/Back/Detail)." : "Single, centered view."}
`;
    if (clothesParams.lockPose) {
      fullPrompt += `
[STRICT POSE LOCK]: You MUST PRESERVE the exact body posture and stance shown in the main character reference. Do NOT alter the orientation.
`;
    }
    if (clothesParams.framing) {
      switch (clothesParams.framing) {
        case "waist-up":
          fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: WAIST-UP SHOT. Waist-up portrait: the frame MUST cut at the waist. The character is cropped at the hips. Legs, knees, and feet must NOT be visible under any circumstance. Waist-up character portrait for dialogue UI. STRICT framing rules: Crop exactly at the waist (hips level). No legs, knees, or feet visible. Upper body fills most of the frame (60-80%). Head and torso are the focus. Composition: Centered or slightly offset character. Clear silhouette for UI readability. DO NOT: Do not generate full body, Do not zoom out to include legs, Do not keep original full-body proportions.
`;
          break;
        case "bust":
          fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: BUST SHOT. You MUST crop the character from the chest up. Focus on the upper torso, shoulders, and head. It is acceptable if the top of the head or sides of the shoulders are cut off to ensure a true close-up. Do NOT zoom out to fit everything. This instruction supersedes any other framing instructions.
`;
          break;
        case "head-only":
          fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: HEAD ONLY. You MUST focus entirely on the head, face, and neck. The head should fill most of the frame. It is expected that the top of the hair or sides of the head might be cut off by the frame. Do NOT show the torso or arms. This instruction supersedes any other framing instructions.
`;
          break;
        case "full-body":
        default:
          fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: FULL BODY SHOT. You MUST show the entire character from head to toe. This instruction supersedes any other framing instructions.
`;
          break;
      }
    }
  }
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `WORLD CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
`;
  }
  if (styleSnippet) {
    fullPrompt += `[STYLE SNIPPET]: ${styleSnippet}
`;
  }
  if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
    const key = bgConfig.mode === "transparent" ? "#FFFFFF" : bgConfig.keyColor || "#FFFFFF";
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    fullPrompt += `
[STRICT OVERRIDE - BACKGROUND]:
`;
    fullPrompt += `- IGNORE all environment descriptions.
`;
    fullPrompt += `- Render the subject on a SOLID ${colorName} (${key}) background.
`;
    fullPrompt += `- The background MUST be perfectly flat with NO texture, NO shadows, and NO lighting gradients.
`;
  } else if (bgConfig.mode === "solid") {
    fullPrompt += `
[MANDATORY]: Render on a FLAT SOLID ${bgConfig.color} background.
`;
  } else if (bgConfig.mode === "prompt_only") {
    fullPrompt += `
BACKGROUND: ${bgConfig.promptFragment}
`;
  } else if (bgConfig.mode === "none") {
    fullPrompt += `
BACKGROUND: Entirely empty, minimalist, or pure white background with NO environmental detail.
`;
  } else if (bgConfig.mode === "scene") {
    fullPrompt += `
BACKGROUND: ${bgConfig.promptFragment || "Detailed environmental scene"}.
`;
  } else {
    fullPrompt += `
BACKGROUND: Balanced environmental complexity.
`;
  }
  if (safeZone?.enabled) {
    fullPrompt += `
COMPOSITION: Center the subject within the inner ${Math.round(safeZone.width)}% safe zone.
`;
  }
  const referenceParts = processReferenceNotes(referenceAssets);
  return { textPrompt: fullPrompt, referenceParts };
};
var buildChibiFragment = (config) => {
  if (!config.enabled) return "";
  let fragment = "[STRICT CHIBI AESTHETIC - SUPER DEFORMED STYLE]\n";
  fragment += "CRITICAL INSTRUCTION: Chibi (super-deformed style) is NOT just a big head on a standard body.\n";
  fragment += "It is a COMPLETE proportional and stylistic transformation of the whole character.\n";
  fragment += "DO NOT make the same body as the reference body with a big head. That is a failure.\n\n";
  fragment += "1. PROPORTIONS (Most Important):\n";
  if (config.bodyRatio) {
    const ratioParts = config.bodyRatio.split(":");
    const ratioVal = ratioParts.length === 2 ? parseFloat(ratioParts[1]) : 2;
    fragment += `- Head-to-body ratio is exactly 1:${ratioVal}. Head is exactly ${Math.round(100 / ratioVal)}% of total height.
`;
  } else if (config.presetProportion && CHIBI_STYLE_CONFIG[config.presetProportion]) {
    fragment += `- ${CHIBI_STYLE_CONFIG[config.presetProportion].suffix}
`;
  } else {
    fragment += "- Head-to-body ratio: 1:2 to 1:4 max. Head is 50% or more of total height.\n";
  }
  fragment += "- Entire body MUST BE scaled down and simplified to match the head.\n";
  fragment += "- Limbs are short and stubby, NOT realistic length.\n";
  fragment += "\n2. BODY STRUCTURE:\n";
  fragment += "- Torso: very short, almost compressed.\n";
  if (config.bodyStyle === "geometric") {
    fragment += "- Arms/legs: geometric limb simplification, cylindrical arms/legs.\n";
  } else {
    fragment += "- Arms/legs: simplified, rounded (stubby proportions).\n";
  }
  fragment += "- Hands/feet: small, minimal detail. Chunky.\n";
  fragment += "- NO realistic anatomy or muscle structure whatsoever. Reject adult body proportions entirely.\n";
  fragment += "\n3. DETAIL LEVEL:\n";
  if (config.focus === "kawaii") {
    fragment += "- Kawaii aesthetic focus, extremely cute, flat colors, bold expressive features.\n";
  } else {
    fragment += "- Semi-realistic detailed chibi, professional texturing and shading, but still structurally super-deformed.\n";
  }
  fragment += "- Clothing and armor MUST be simplified.\n";
  fragment += "- Remove small intricate details; use clean shapes instead of realism.\n";
  fragment += "\n4. FACE STYLE:\n";
  if (config.headStyle === "moe") {
    fragment += "- Ultra-cute Moe face (if visible), huge expressive sparkly eyes.\n";
  } else {
    fragment += "- Large eyes, simplified features.\n";
  }
  fragment += "- Minimal nose/mouth.\n";
  fragment += "- Expression is simplified and can be exaggerated.\n";
  fragment += "- Respect facial visibility: If the character wears a closed helmet or mask in references, keep it closed and do not add visible eyes or an open face.\n";
  fragment += "\n[CRITICAL - ACCESSORIES & FEATURES]: You MUST preserve all secondary character features from references, including wings, tails, horns, capes, quivers, weapons, and specialized equipment. Do NOT simplify these away. Render them in a scale-appropriate way for the chibi body, but ensure they are clearly visible and detailed. If the reference has wings, the chibi MUST have wings.\n\n";
  fragment += "[CRITICAL - MOUNTS & COMPANIONS]: If the character is riding a mount (e.g., horse, wolf, dragon) or has an animal companion, the MOUNT/COMPANION MUST ALSO BE RENDERED IN CHIBI STYLE to match the rider. The mount must have a large head, short stubby body and legs, and simplified features (standard anime chibi, not overly cute/moe). DO NOT render a chibi character on a realistically proportioned mount. Both must be fully super-deformed.\n\n";
  return fragment;
};
var buildIllustrationPrompt = (basePrompt, gameContext, styleSnippet, bgConfig, referenceAssets, safeZone, continuityFlags, chibiProportion, chibiConfig, viewpoint, noCharacters, framing) => {
  let fullPrompt = "";
  if (gameContext.setting || gameContext.tone || gameContext.visualConstraints) {
    fullPrompt += `GAME CONTEXT:
`;
    if (gameContext.setting) fullPrompt += `Setting: ${gameContext.setting}
`;
    if (gameContext.tone) fullPrompt += `Tone: ${gameContext.tone}
`;
    if (gameContext.visualConstraints) {
      fullPrompt += `Constraints: ${gameContext.visualConstraints}
`;
    }
    fullPrompt += `(Ensure the result strictly fits this setting and tone.)

`;
  }
  fullPrompt += `SUBJECT: ${basePrompt}
`;
  const characterLikely = noCharacters ? false : isCharacterPrompt(basePrompt);
  const mapLikely = isMapPrompt(basePrompt);
  const magicCircleLikely = isMagicCirclePrompt(basePrompt);
  if (noCharacters) {
    fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO CHARACTERS. NO PEOPLE. NO CREATURES. NO ANIMALS. NO HUMANOIDS. The image MUST strictly be an environment, prop, object, or scene without any living subjects.
`;
  }
  if (viewpoint && viewpoint !== "none") {
    fullPrompt += `VIEWPOINT: ${viewpoint.replace("-", " ").toUpperCase()} perspective.
`;
    if (viewpoint === "top-down") fullPrompt += `- Camera is positioned directly above the subject looking straight down. Render as a 3D top-down perspective with visible depth and verticality.
`;
    else if (viewpoint === "high-angle") fullPrompt += `- Camera is positioned above the subject looking down at an angle.
`;
    else if (viewpoint === "low-angle") fullPrompt += `- Camera is positioned below the subject looking up, creating a sense of scale.
`;
    else if (viewpoint === "back") fullPrompt += `- Subject is seen from behind, facing away from the camera.
`;
    else if (viewpoint === "side") fullPrompt += `- Subject is seen from a side profile perspective.
`;
    else if (viewpoint === "three-quarter") fullPrompt += `- Subject is seen from a three-quarter angle.
`;
    else if (viewpoint === "isometric") fullPrompt += `- Subject is rendered in a 45-degree isometric perspective.
`;
    else if (viewpoint === "cinematic") fullPrompt += `- Use dramatic cinematic framing and wide-angle perspective.
`;
  }
  if (framing && characterLikely) {
    switch (framing) {
      case "waist-up":
        fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: WAIST-UP SHOT. Waist-up portrait: the frame MUST cut at the waist. The character is cropped at the hips. Legs, knees, and feet must NOT be visible under any circumstance. Waist-up character portrait for dialogue UI. STRICT framing rules: Crop exactly at the waist (hips level). No legs, knees, or feet visible. Upper body fills most of the frame (60-80%). Head and torso are the focus. Composition: Centered or slightly offset character. Clear silhouette for UI readability. DO NOT: Do not generate full body, Do not zoom out to include legs, Do not keep original full-body proportions.
`;
        break;
      case "bust":
        fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: BUST SHOT. You MUST crop the character from the chest up. Focus on the upper torso, shoulders, and head. It is acceptable if the top of the head or sides of the shoulders are cut off to ensure a true close-up. Do NOT zoom out to fit everything. This instruction supersedes any other framing instructions.
`;
        break;
      case "head-only":
        fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: HEADSHOT / CLOSE-UP. You MUST focus entirely on the character's head and face. The head should fill most of the frame. It is expected that the top of the hair or sides of the head might be cut off by the frame. Do NOT show the torso or lower body. This instruction supersedes any other framing instructions.
`;
        break;
      case "full-body":
      default:
        fullPrompt += `
[CRITICAL OVERRIDE - FRAMING]: FULL-BODY SHOT. You MUST show the entire character from head to toe. This instruction supersedes any other framing instructions.
`;
        break;
    }
  }
  fullPrompt += `[STRICT NEGATIVE CONSTRAINT]: NO TEXT. NO labels. NO watermarks. NO signatures. NO UI elements. NO speech bubbles. The image MUST be pure artwork.
`;
  if (referenceAssets.length > 0) {
    if (characterLikely) {
      fullPrompt += `[STRICT CONSTRAINT]: Maintain exact character features, skin color, and ALL accessories from references (wings, tails, horns, weapons, quivers, capes). If the character in the reference has a closed helmet, mask, or obscured face, you MUST maintain that obscured face. Do NOT force eyes or an open helmet if the reference shows a closed one.
`;
    } else {
      fullPrompt += `[STRICT CONSTRAINT]: Maintain exact visual design, colors, and style from references.
`;
    }
  }
  if (characterLikely) {
    if (chibiConfig?.enabled) {
      fullPrompt += buildChibiFragment(chibiConfig) + "\n";
    } else if (chibiProportion && CHIBI_STYLE_CONFIG[chibiProportion]) {
      fullPrompt += `ANATOMY GUIDELINE: ${CHIBI_STYLE_CONFIG[chibiProportion].suffix}
`;
    }
  }
  if (styleSnippet) {
    fullPrompt += `STYLE: ${styleSnippet}
`;
    fullPrompt += `(Ensure the style strictly matches the above snippet, do not revert to realism or generic defaults.)
`;
  } else {
    fullPrompt += `STYLE: Clean, neutral, high-quality digital art without additional stylistic flourishes.
`;
  }
  if (continuityFlags) {
    const activeFlags = Object.entries(continuityFlags).filter(([_, active]) => active);
    if (activeFlags.length > 0) {
      fullPrompt += `
STYLE CONTINUITY DIRECTIVES:
`;
      activeFlags.forEach(([key]) => {
        if (key === "Sharp Black Outlines") fullPrompt += `- Use bold, sharp black outlines for all subject edges.
`;
        else if (key === "Clean Cel-Shading") fullPrompt += `- Use clean, professional cel-shading with clear highlight/shadow separation.
`;
        else if (key === "Metallic Texture Sync") fullPrompt += `- Render all metallic surfaces with consistent high-reflectivity sheen.
`;
        else if (key === "Ambient Lighting Lock") fullPrompt += `- Maintain consistent ambient lighting from the top-right across all related assets.
`;
        else if (key === "Palette Adherence") fullPrompt += `- Strictly stick to the established character palette. No stray colors.
`;
        else if (key === "Viewpoint Continuity") fullPrompt += `- CRITICAL: Maintain exact eye-level camera perspective. Do NOT use high or low angles.
`;
        else if (key === "Background Isolation") fullPrompt += `- Ensure subject is clearly separated from background with distinct visual contrast.
`;
        else if (key === "Character Consistency" && characterLikely) fullPrompt += `- Adhere strictly to character design features across all requested formats.
`;
        else if (key === "Character Consistency" && !characterLikely) fullPrompt += `- Adhere strictly to the established visual design across all requested formats.
`;
        else fullPrompt += `- ${key}
`;
      });
    }
  }
  if (referenceAssets.length > 0) {
    fullPrompt += `
REFERENCE VISUAL CONSISTENCY (CRITICAL):
`;
    fullPrompt += `You have been provided with reference images. You MUST strictly adhere to the visual design shown in these references.
`;
    if (characterLikely) {
      fullPrompt += `1. IDENTITY: Maintain the exact facial features, hair style, skin color, and body type.
`;
      fullPrompt += `2. CLOTHING: Keep the character's outfit EXACTLY as seen in the references. Do not redesign, simplify, or change colors.
`;
    } else {
      fullPrompt += `1. VISUAL IDENTITY: Maintain the exact design, features, and colors of the subject.
`;
      fullPrompt += `2. DETAILS: Keep the subject's specific details EXACTLY as seen in the references. Do not redesign, simplify, or change colors.
`;
    }
    fullPrompt += `3. STYLE: Use the art style from the references if specified.
`;
    fullPrompt += `
INSTRUCTION FOR POSE & COMPOSITION:
`;
    if (characterLikely) {
      fullPrompt += `Use the references ONLY for character details. 
`;
    } else {
      fullPrompt += `Use the references ONLY for subject details. 
`;
    }
    fullPrompt += `DO NOT copy the composition, pose, or distance of the references.
`;
    fullPrompt += `FOLLOW the SUBJECT description above for current pose and scene.
`;
  }
  if (!characterLikely && (mapLikely || magicCircleLikely)) {
    fullPrompt += `
[STRICT CONSTRAINT]: Focus ONLY on the ${basePrompt}. DO NOT generate any characters, people, or creatures in the scene.
`;
  }
  if (basePrompt.toLowerCase().includes("undead") || basePrompt.toLowerCase().includes("skeleton") || basePrompt.toLowerCase().includes("skull")) {
    fullPrompt += `
[CRITICAL UNDEAD ANATOMY]: If the character is undead or skeletal, you MUST keep the skull structurally sound with the LOWER JAW INTACT AND ATTACHED. Do not render missing lower jaws. Ensure the head is PROPORTIONATE to the body width, do not make the head excessively large.
`;
  }
  if (safeZone && safeZone.enabled) {
    fullPrompt += `
COMPOSITION (IMPORTANT - ZOOM OUT): 
`;
    fullPrompt += `Compose the scene so that the MAIN SUBJECT is strictly contained within the CENTRAL ${Math.round(
      safeZone.width
    )}% width and ${Math.round(safeZone.height)}% height of the image.
`;
    fullPrompt += `The outer areas must be EXTENDED BACKGROUND filler.
`;
  }
  fullPrompt += `
BACKGROUND:
`;
  if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
    const key = bgConfig.mode === "transparent" ? "#FFFFFF" : bgConfig.keyColor || "#FFFFFF";
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    fullPrompt += `[STRICT OVERRIDE]: IGNORE all other background descriptions. You MUST render the subject on a perfectly FLAT SOLID ${colorName} BACKGROUND (Hex ${key}).
`;
    fullPrompt += `Absolutely NO texture, NO depth, and NO environmental details.
`;
  } else if (bgConfig.mode === "solid") {
    if (bgConfig.gradientType === "linear") {
      fullPrompt += `Use a smooth linear gradient background: ${bgConfig.color} to ${bgConfig.secondaryColor || "#000000"}.
`;
    } else if (bgConfig.gradientType === "radial") {
      fullPrompt += `Use a smooth radial gradient background: radiating from ${bgConfig.color} at the center to ${bgConfig.secondaryColor || "#000000"} at the edges.
`;
    } else {
      fullPrompt += `Use a flat, solid background color: ${bgConfig.color}. No detailed scene, no gradients.
`;
    }
    if (bgConfig.promptFragment) {
      fullPrompt += `Background atmosphere hints: ${bgConfig.promptFragment}
`;
    }
  } else if (bgConfig.mode === "pattern" && bgConfig.patternType) {
    const type = bgConfig.patternType;
    fullPrompt += `Background Style: ${type.toUpperCase()} PATTERN.
`;
    if (bgConfig.promptFragment) {
      fullPrompt += `Pattern specifics: ${bgConfig.promptFragment}
`;
    }
  } else if (bgConfig.mode === "scene" && bgConfig.promptFragment) {
    fullPrompt += `Background specifics: ${bgConfig.promptFragment}
`;
  } else if (bgConfig.mode === "prompt_only") {
    fullPrompt += `[STRICT]: Only follow this specific background instruction: ${bgConfig.promptFragment || "Empty minimalist background"}.
`;
    fullPrompt += `Do NOT add environmental details not mentioned here.
`;
  } else if (bgConfig.mode === "none") {
    fullPrompt += `Make the background entirely empty, minimalist, or non-existent. NO environmental detail. Focus purely on the subject.
`;
  } else if (bgConfig.mode === "auto") {
    fullPrompt += `Background complexity: Balanced. Let AI decide based on prompt context.
`;
  } else {
    fullPrompt += `Background complexity: Balanced.
`;
  }
  if (!bgConfig.allowTransparency && bgConfig.mode !== "transparent" && bgConfig.mode !== "transparent_neo") {
    fullPrompt += `Ensure the background is fully opaque.
`;
  }
  const referenceParts = processReferenceNotes(referenceAssets);
  return { textPrompt: fullPrompt, referenceParts };
};
var buildExtractClothesPrompt = (gameContext, bgConfig) => {
  let bgInstruction = "";
  if (bgConfig.mode === "transparent" || bgConfig.mode === "transparent_neo") {
    const key = bgConfig.mode === "transparent" ? "#FFFFFF" : bgConfig.keyColor || "#FFFFFF";
    const colorName = key === "#000000" ? "BLACK" : key === "#FFFFFF" ? "WHITE" : key === "#00FF00" ? "GREEN" : "MAGENTA";
    bgInstruction = `[MANDATORY]: Render the result on a perfectly FLAT SOLID ${colorName} BACKGROUND (${key}) ONLY. No environmental detail.`;
  } else if (bgConfig.mode === "solid") {
    bgInstruction = `Render the result on a FLAT SOLID BACKGROUND of color ${bgConfig.color}.`;
  } else {
    bgInstruction = `Render the background as: ${bgConfig.promptFragment || "A clean, minimalist studio background"}.`;
  }
  return `[EXTRACTION TASK]: TOTAL ANATOMY REMOVAL.
1. ACTION (MANDATORY): Erase the entire character. Remove all skin, remove all hair, remove face, remove eyes, remove hands, remove biological features. 
2. PRESERVE (CRITICAL): ALL CLOTHING PIECES. You MUST keep the shirt, pants, boots, and armor as a complete OUTFIT SET. Do NOT leave just one item; keep the entire layered ensemble exactly as seen.
3. STRUCTURE: The clothes should retain their 3D shape and volume as if worn by an INVISIBLE GHOST MANNEQUIN.
4. BACKGROUND: ${bgInstruction}
Context: ${gameContext.setting || "High-end gaming asset"}.`;
};
var buildFramePrompt = (prompt, gameContext, styleSnippet, frameElements) => {
  return `TASK: Generate a card frame or UI border.
SUBJECT: ${prompt}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
STYLE: ${styleSnippet}
ELEMENTS TO INCLUDE: ${frameElements.join(", ")}.`;
};
var buildBackgroundAssetPrompt = (prompt, gameContext, styleSnippet, bgPatternType) => {
  return `TASK: Generate a background asset.
SUBJECT: ${prompt}
PATTERN TYPE: ${bgPatternType}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
STYLE: ${styleSnippet}`;
};
var buildCardSuggestionsPrompt = (artPrompt, currentName) => {
  return `Based on this artwork description: "${artPrompt}" and current card name: "${currentName}", suggest 5 unique fantasy card names and 3 ability descriptions.
Return JSON format: { "names": ["...", "..."], "effects": ["...", "..."] }`;
};
var buildSpriteSheetPromptsPrompt = (globalPrompt, frameCount, gameContext) => {
  return `TASK: Suggest a sequence of ${frameCount} distinct character poses or variations for a sprite sheet.
CHARACTER DESCRIPTION: ${globalPrompt}
GAME CONTEXT: ${gameContext.setting}. ${gameContext.tone}.

Return a JSON object with:
- "poses": An array of ${frameCount} strings, each being a short, descriptive prompt for a single frame (e.g. "Standing idle, front view", "Swinging a sword, side view").
- "refinedGlobalPrompt": A slightly improved version of the character description for better AI consistency.`;
};
var buildPoseDescription = (poseData) => {
  if (!poseData.joints || poseData.joints.length === 0) return "";
  let description = "CRITICAL: SKELETAL POSE GUIDE (Normalized 0-100 Canvas Coordinates):\n";
  description += "The character's anatomy MUST be built exactly upon these spatial anchors. Do NOT deviate from these coordinates.\n";
  poseData.joints.forEach((j) => {
    description += `- ${j.name.toUpperCase()}: [X:${Math.round(j.x)}, Y:${Math.round(j.y)}]
`;
  });
  description += "\n[ANATOMICAL CONSTRAINTS]:\n";
  description += "- The character's head must be centered at the HEAD coordinate.\n";
  description += "- Limbs must connect logically (Shoulder -> Elbow -> Wrist) following the provided points.\n";
  description += "- The overall silhouette and posture MUST match the skeletal structure defined by these points.\n";
  description += "- This is a spatial requirement, not just a suggestion. Treat these points as a hard wireframe.";
  return description;
};
var buildPoseStudioPrompt = (basePrompt, gameContext, styleSnippet, bgConfig, referenceAssets, poseData, safeZone) => {
  const { textPrompt, referenceParts } = buildIllustrationPrompt(
    basePrompt,
    gameContext,
    styleSnippet,
    bgConfig,
    referenceAssets,
    safeZone
  );
  let fullPrompt = `POSE-DRIVEN CHARACTER GENERATION.
`;
  fullPrompt += buildPoseDescription(poseData) + "\n\n";
  fullPrompt += textPrompt;
  return { textPrompt: fullPrompt, referenceParts };
};
var buildMapGridPrompt = (userPrompt, gameContext, styleSnippet, config) => {
  let fullPrompt = `MAP GRID GENERATION TASK.
`;
  fullPrompt += `OBJECTIVE: Generate a clean 2D game map image. NO characters. NO UI. NO HUD. NO text. NO borders.
`;
  fullPrompt += `VIEW MODE: ${config.viewMode === "top-down" ? "Top-Down (Orthographic 2D)" : "Isometric (2.5D angled view)"}.
`;
  if (config.viewMode === "top-down") {
    fullPrompt += `- Flat orthographic projection.
`;
    fullPrompt += `- Consistent lighting.
`;
    fullPrompt += `- Shadow only under walls/decor.
`;
    fullPrompt += `- Tile-aligned decorations.
`;
  } else {
    fullPrompt += `- 45-degree diamond grid.
`;
    fullPrompt += `- Proper depth layering.
`;
    fullPrompt += `- Wall height extrusion.
`;
    fullPrompt += `- Soft directional shadow.
`;
    fullPrompt += `- Height-based occlusion.
`;
  }
  fullPrompt += `GRID CONFIGURATION: ${config.gridWidth}x${config.gridHeight} cells. Cell size: ${config.cellSize}px.
`;
  if (config.preset !== "custom") {
    const presetName = config.preset.replace("_", " ");
    fullPrompt += `ENVIRONMENT PRESET: ${presetName}.
`;
  }
  fullPrompt += `STYLE CONTROLS:
`;
  fullPrompt += `- Primary Floor Color: ${config.primaryColor}
`;
  fullPrompt += `- Secondary Accent Color: ${config.accentColor}
`;
  fullPrompt += `- Shadow Intensity: ${config.shadowIntensity}%
`;
  fullPrompt += `- Light Direction: ${config.lightDirection.replace("-", " ")}
`;
  fullPrompt += `- Detail Density: ${config.detailDensity}
`;
  fullPrompt += `- Decoration Level: ${config.decorationLevel}
`;
  fullPrompt += `
CORE DESCRIPTION: ${userPrompt || "A detailed game map"}
`;
  if (gameContext.setting || gameContext.tone) {
    fullPrompt += `NARRATIVE CONTEXT: ${gameContext.setting}. ${gameContext.tone}.
`;
  }
  if (styleSnippet) {
    fullPrompt += `RENDER STYLE: ${styleSnippet}
`;
  }
  if (config.transparentBackground) {
    fullPrompt += `
[STRICT CONSTRAINT]: Render with a TRANSPARENT background where applicable (e.g. outside the map boundaries).
`;
  }
  fullPrompt += `
[FINAL REMINDER]: ONLY generate environment and decorations. ABSOLUTELY NO CHARACTERS OR UI ELEMENTS.`;
  return fullPrompt;
};

// src/mcp/index.ts
import fs2 from "fs";
import path2 from "path";

// src/mcp/beiClient.ts
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
var BRIDGE_PORT = 58925;
var WEB_PORT = 3488;
var PROJECT_ROOT = "d:\\GeminiWeb\\mythicframe";
async function checkMythicStatus() {
  let bridgeRunning = false;
  let beiConnected = false;
  let tabs = [];
  let accounts = [];
  let activeJobsCount = 0;
  let serverRunning = false;
  try {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/status`, {
      signal: AbortSignal.timeout(2e3)
    });
    if (res.ok) {
      bridgeRunning = true;
      const data = await res.json();
      beiConnected = !!data.connected;
      tabs = data.tabs || [];
      accounts = data.accounts || [];
      activeJobsCount = data.activeJobsCount || 0;
    }
  } catch {
  }
  try {
    const res = await fetch(`http://localhost:${WEB_PORT}/api/bei/status`, {
      signal: AbortSignal.timeout(2e3)
    });
    if (res.ok) {
      serverRunning = true;
    }
  } catch {
  }
  let hasGeminiApiKey = false;
  try {
    const envLocal = path.join(PROJECT_ROOT, ".env.local");
    const envFile = path.join(PROJECT_ROOT, ".env");
    if (fs.existsSync(envLocal)) {
      const txt = fs.readFileSync(envLocal, "utf8");
      if (/GEMINI_API_KEY=\S+/.test(txt)) hasGeminiApiKey = true;
    }
    if (!hasGeminiApiKey && fs.existsSync(envFile)) {
      const txt = fs.readFileSync(envFile, "utf8");
      if (/GEMINI_API_KEY=\S+/.test(txt)) hasGeminiApiKey = true;
    }
    if (!hasGeminiApiKey && process.env.GEMINI_API_KEY) {
      hasGeminiApiKey = true;
    }
  } catch {
  }
  const availableEngines = ["prompt-only"];
  if (beiConnected && tabs.some((t) => t.target === "gemini" || t.target === "chatgpt")) {
    availableEngines.unshift("bei");
  }
  if (hasGeminiApiKey) {
    availableEngines.push("gemini-api");
  }
  const statusParts = [];
  if (serverRunning || bridgeRunning) {
    statusParts.push(`Server: Running on http://localhost:${WEB_PORT} (Bridge Port ${BRIDGE_PORT})`);
  } else {
    statusParts.push(`Server: OFFLINE (use mythic_launch_server or npm run dev)`);
  }
  if (beiConnected) {
    const activeTab = tabs.find((t) => t.target === "gemini" || t.target === "chatgpt");
    const accountStr = activeTab?.email ? ` (${activeTab.email})` : "";
    statusParts.push(`BEI Extension: Connected with ${tabs.length} tab(s)${accountStr}`);
  } else {
    statusParts.push(`BEI Extension: Not connected (ensure Chrome extension is installed & Chrome tab open)`);
  }
  if (hasGeminiApiKey) {
    statusParts.push(`Gemini API Key: Configured in environment`);
  } else {
    statusParts.push(`Gemini API Key: Not configured (optional if using BEI)`);
  }
  return {
    serverRunning: serverRunning || bridgeRunning,
    serverUrl: `http://localhost:${WEB_PORT}`,
    bridgeRunning,
    bridgePort: BRIDGE_PORT,
    beiConnected,
    tabs,
    accounts,
    activeJobsCount,
    hasGeminiApiKey,
    availableEngines,
    summary: statusParts.join(" | ")
  };
}
async function launchMythicServer() {
  const current = await checkMythicStatus();
  if (current.serverRunning) {
    return { success: true, message: `MythicFrame server is already running (${current.summary})` };
  }
  try {
    const devServer = spawn("cmd.exe", ["/c", "start", "/MIN", "npm.cmd", "run", "dev"], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: { ...process.env, NODE_ENV: "development" }
    });
    devServer.unref();
    const start = Date.now();
    while (Date.now() - start < 8e3) {
      await new Promise((r) => setTimeout(r, 1e3));
      const checked = await checkMythicStatus();
      if (checked.serverRunning) {
        return {
          success: true,
          message: `Successfully launched MythicFrame server on http://localhost:${WEB_PORT} (Bridge Port: ${BRIDGE_PORT})`
        };
      }
    }
    return {
      success: true,
      message: `Launched server start command; please allow a few seconds for initialization on http://localhost:${WEB_PORT}.`
    };
  } catch (err) {
    return { success: false, message: `Failed to launch server: ${err.message}` };
  }
}
async function openBEITab(target = "gemini", accountSlot = 0) {
  try {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/open-tab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, accountSlot, bringTabToFront: true })
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Failed to open tab: ${errText}` };
    }
    const data = await res.json();
    return { success: true, message: `Opened/focused ${target} tab in Chrome (Account slot ${accountSlot})` };
  } catch (err) {
    return { success: false, message: `Could not reach BEI Bridge: ${err.message}` };
  }
}
async function generateWithBEI(options) {
  const {
    prompt,
    aspectRatio = "1:1",
    target = "gemini",
    accountSlot = 0,
    images = [],
    timeoutSeconds = 900,
    tabMode = "current",
    bringTabToFront = false
  } = options;
  const processedImages = [];
  for (const img of images) {
    if (img.startsWith("data:image/")) {
      processedImages.push(img);
    } else if (fs.existsSync(img)) {
      const ext = path.extname(img).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const b64 = fs.readFileSync(img).toString("base64");
      processedImages.push(`data:${mime};base64,${b64}`);
    }
  }
  const payload = {
    prompt,
    fullPrompt: prompt,
    aspectRatio,
    target,
    accountSlot,
    images: processedImages,
    timeoutSeconds,
    tabMode,
    bringTabToFront
  };
  const response = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/bei/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `BEI generation failed with status ${response.status}`);
  }
  const result = await response.json();
  if (!result.success || !result.image) {
    throw new Error(result.error || "BEI bridge did not return a valid image.");
  }
  const outDir = path.join(PROJECT_ROOT, "outputs", "bei");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const base64Data = result.image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const isPng = result.image.startsWith("data:image/png");
  const extension = isPng ? "png" : "jpg";
  const fileName = `bei_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${extension}`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    success: true,
    filePath,
    imageBase64: result.image,
    jobId: result.jobId,
    metadata: result.metadata
  };
}

// src/mcp/index.ts
var server = new Server(
  {
    name: "mythic-advanced-mcp",
    version: "2.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
var executeImageGeneration = async (promptStr, aspectRatio = "1:1", toolName, apiKey) => {
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    const status = await checkMythicStatus();
    if (status.beiConnected && status.tabs.some((t) => t.target === "gemini" || t.target === "chatgpt")) {
      const beiRes = await generateWithBEI({
        prompt: promptStr,
        aspectRatio,
        target: "gemini"
      });
      const formattedPath = beiRes.filePath.replace(/\\/g, "/");
      return `IMAGE GENERATED SUCCESSFULLY VIA BEI!

Agent, the image has been generated using Browser Extension Interface (BEI) with active Google Gemini session and saved here: ${beiRes.filePath}

Please embed this image for the user, AND provide a clickable markdown link [${path2.basename(beiRes.filePath)}](file:///${formattedPath}) so they can easily open it!`;
    }
    throw new Error(
      "Missing geminiApiKey and no active BEI browser session connected.\nOptions to generate:\n1. Pass 'geminiApiKey' or set GEMINI_API_KEY in .env.local (link: https://ai.google.dev/gemini-api/docs/api-key).\n2. Ensure MythicFrame is running (use 'mythic_launch_server') and open Google Gemini in Chrome with the BEI extension."
    );
  }
  let aspectForGemini = "1:1";
  const ratio = aspectRatio.split(" ")[0];
  if (ratio === "16:9") {
    aspectForGemini = "16:9";
  }
  if (ratio === "9:16") {
    aspectForGemini = "9:16";
  }
  if (ratio === "3:4") {
    aspectForGemini = "3:4";
  }
  if (ratio === "4:3") {
    aspectForGemini = "4:3";
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${effectiveKey}`;
  const body = {
    instances: [{ prompt: promptStr }],
    parameters: { sampleCount: 1, aspectRatio: aspectForGemini }
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }
    const data = await response.json();
    const base64Data = data.predictions[0].bytesBase64Encoded;
    const arrayBuffer = Buffer.from(base64Data, "base64");
    const projectRoot = "d:\\\\GeminiWeb\\\\mythicframe";
    const outDir = path2.join(projectRoot, "outputs");
    if (!fs2.existsSync(outDir)) fs2.mkdirSync(outDir, { recursive: true });
    const fileName = `${toolName}_${Date.now()}.jpg`;
    const filePath = path2.join(outDir, fileName);
    fs2.writeFileSync(filePath, arrayBuffer);
    return `IMAGE GENERATED SUCCESSFULLY!

Agent, the image has been generated using Gemini Imagen 3 and saved here: ${filePath}

Please embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${filePath.replace(/\\\\/g, "/")}) so they can easily open it!`;
  } catch (e) {
    throw new Error(`Failed to generate Gemini image: ${e.message}`);
  }
};
var formatTextInstruction = (promptStr) => {
  return `PROMPT OPTIMIZED SUCCESSFULLY!

AGENT INSTRUCTION: Now, use your internal LLM reasoning to directly answer the user using the following prompt.

---START PROMPT---
${promptStr}
---END PROMPT---`;
};
var defaultGameContext = { setting: "High Fantasy", tone: "Epic" };
var defaultBgConfig = { mode: "transparent" };
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "prepare_illustration_prompt",
        description: "Prepares a highly optimized illustration or character prompt using MythicFrame rules.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            aspectRatio: { type: "string" },
            style: { type: "string" },
            viewpoint: { type: "string" },
            framing: { type: "string" },
            backgroundMode: { type: "string", description: "'solid', 'transparent', 'scene', 'pattern', 'none', 'prompt-only', or 'AI Decides'" },
            backgroundColor: { type: "string", description: "Hex color if solid, e.g. '#FFFFFF'" },
            chibiMode: { type: "boolean" },
            chibiRatio: { type: "string", description: "'1:1' (micro_2h), '1:2' (chibi_3h), or '1:4' (deformed_4h)" },
            noCharacters: { type: "boolean" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "prepare_ui_reimagine_prompt",
        description: "Prepares a prompt for UI/HUD Reimagine feature.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            uiMood: { type: "string" },
            uiArchetype: { type: "string" },
            uiMaterial: { type: "string" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "prepare_clothes_prompt",
        description: "Prepares a prompt for the Clothes Designer.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "prepare_map_grid_prompt",
        description: "Prepares a prompt for the Map Grid generator.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            viewMode: { type: "string", description: "'top-down' or 'isometric'" },
            primaryColor: { type: "string" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "prepare_pose_studio_prompt",
        description: "Prepares a Pose Studio prompt forcing strict skeletal adherence.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "prepare_sprite_sheet_prompts",
        description: "Prepares a text-generation prompt asking for a list of sprite sheet poses.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            frameCount: { type: "number" }
          },
          required: ["prompt", "frameCount"]
        }
      },
      {
        name: "prepare_frame_prompt",
        description: "Prepares an image prompt for generating UI frames or borders.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            elements: { type: "array", items: { type: "string" } }
          },
          required: ["prompt", "elements"]
        }
      },
      {
        name: "prepare_background_asset_prompt",
        description: "Prepares an image prompt for generating a background asset.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            patternType: { type: "string" }
          },
          required: ["prompt", "patternType"]
        }
      },
      {
        name: "prepare_extract_clothes_prompt",
        description: "Prepares an image prompt for ghosting out biological parts and keeping clothes.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            backgroundMode: { type: "string", description: "'transparent' or 'solid'" }
          },
          required: []
        }
      },
      {
        name: "prepare_card_suggestions_prompt",
        description: "Prepares a text prompt for generating TCG card name and effect suggestions based on art.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            artPrompt: { type: "string" },
            currentName: { type: "string" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "batch_studio_generate",
        description: "Generates a batch of images for multiple subjects and variations using the free API.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            subjects: { type: "array", items: { type: "string" }, description: "Array of character prompts" },
            variations: { type: "array", items: { type: "string" }, description: "Array of variations, e.g. ['full-body', 'waist-up', 'chibi']" },
            aspectRatio: { type: "string" },
            style: { type: "string" },
            backgroundMode: { type: "string" },
            backgroundColor: { type: "string" },
            chibiRatio: { type: "string", description: "'1:1', '1:2', or '1:4'" }
          },
          required: ["subjects", "variations"]
        }
      },
      {
        name: "mythic_status",
        description: "Checks whether MythicFrame web server (localhost:3488) and BEI browser bridge (port 58925) are running, and returns active browser tabs, logged-in Google/ChatGPT accounts, and available image engines.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "mythic_launch_server",
        description: "Auto-launches the MythicFrame server (web UI & BEI bridge on port 3488 and 58925) if it is currently offline.",
        inputSchema: {
          type: "object",
          properties: {
            port: { type: "number", description: "Port number (default 3488)" }
          },
          required: []
        }
      },
      {
        name: "mythic_open_tab",
        description: "Opens or focuses a Google Gemini or ChatGPT tab in Chrome via BEI so the user can log in with their browser account.",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", enum: ["gemini", "chatgpt"], description: "Browser target (default 'gemini')" },
            accountSlot: { type: "number", description: "Account slot (default 0)" }
          },
          required: []
        }
      },
      {
        name: "mythic_bei_generate",
        description: "Generates an image via the Browser Extension Interface (BEI) using active Google Gemini or ChatGPT browser sessions with ZERO API key required.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Image generation prompt" },
            aspectRatio: { type: "string", description: "'1:1', '16:9', '9:16', '3:4', or '4:3' (default '1:1')" },
            target: { type: "string", enum: ["gemini", "chatgpt"], description: "AI service target (default 'gemini')" },
            accountSlot: { type: "number", description: "Account slot index (default 0)" },
            images: { type: "array", items: { type: "string" }, description: "Array of reference image paths or base64 data URIs" },
            style: { type: "string", description: "Optional art style snippet" },
            timeoutSeconds: { type: "number", description: "Timeout in seconds (default 120)" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "mythic_smart_generate",
        description: "Unified generator for MythicFrame that intelligently discovers and routes to the best available engine (BEI browser extension or Gemini API key).",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Image generation prompt" },
            engine: { type: "string", enum: ["auto", "bei", "gemini-api", "prompt-only"], description: "Engine route (default 'auto')" },
            geminiApiKey: { type: "string", description: "Optional Gemini API key if using gemini-api route" },
            aspectRatio: { type: "string", description: "'1:1', '16:9', '9:16', '3:4', '4:3'" },
            style: { type: "string", description: "Art style snippet" },
            images: { type: "array", items: { type: "string" }, description: "Optional reference images" },
            target: { type: "string", enum: ["gemini", "chatgpt"] },
            accountSlot: { type: "number" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "launch_web_ui",
        description: "Manually launches the MythicFrame web UI on localhost port 3488 if the auto-launch failed.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ]
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments;
    const name = request.params.name;
    let result = "";
    let isImageGen = true;
    let aspectRatio = "1:1";
    if (name === "prepare_illustration_prompt") {
      let bgMode = args.backgroundMode || "transparent";
      if (bgMode === "AI Decides" || bgMode === "scene") bgMode = "scene";
      const bgConfig = {
        mode: bgMode,
        color: args.backgroundColor
      };
      const chibiConfig = args.chibiMode ? { headSize: 2, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false } : void 0;
      let mappedChibiProportion = void 0;
      if (args.chibiMode && args.chibiRatio) {
        if (args.chibiRatio === "1:1") mappedChibiProportion = "micro_2h";
        if (args.chibiRatio === "1:2") mappedChibiProportion = "chibi_3h";
        if (args.chibiRatio === "1:4") mappedChibiProportion = "deformed_4h";
      } else if (args.chibiMode) {
        mappedChibiProportion = "chibi_3h";
      }
      const built = buildIllustrationPrompt(
        args.prompt,
        defaultGameContext,
        args.style || "",
        bgConfig,
        [],
        void 0,
        void 0,
        mappedChibiProportion,
        chibiConfig,
        args.viewpoint,
        args.noCharacters,
        args.framing
      );
      result = built.textPrompt;
      aspectRatio = args.aspectRatio || "1:1";
    } else if (name === "batch_studio_generate") {
      const subjects = args.subjects || [];
      const variations = args.variations || [];
      let bgMode = args.backgroundMode || "transparent";
      if (bgMode === "AI Decides" || bgMode === "scene") bgMode = "scene";
      const bgConfig = {
        mode: bgMode,
        color: args.backgroundColor
      };
      const outDir = path2.join(process.cwd(), "outputs", "batch");
      if (!fs2.existsSync(outDir)) fs2.mkdirSync(outDir, { recursive: true });
      let resultsLog = `BATCH GENERATION COMPLETE!

`;
      for (const subject of subjects) {
        for (const variation of variations) {
          const isChibi = variation.toLowerCase() === "chibi";
          let mappedChibiProportion = void 0;
          let chibiConfig = void 0;
          if (isChibi) {
            chibiConfig = { headSize: 2, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false };
            if (args.chibiRatio === "1:1") mappedChibiProportion = "micro_2h";
            else if (args.chibiRatio === "1:4") mappedChibiProportion = "deformed_4h";
            else mappedChibiProportion = "chibi_3h";
          }
          let framing = void 0;
          if (variation.toLowerCase() === "full-body" || variation.toLowerCase() === "full body") framing = "full-body";
          if (variation.toLowerCase() === "waist-up" || variation.toLowerCase() === "waist up") framing = "waist-up";
          const built = buildIllustrationPrompt(
            subject,
            defaultGameContext,
            args.style || "",
            bgConfig,
            [],
            void 0,
            void 0,
            mappedChibiProportion,
            chibiConfig,
            void 0,
            false,
            framing
          );
          const promptStr = built.textPrompt;
          const ratio = args.aspectRatio || "1:1";
          let width = 1024;
          let height = 1024;
          if (ratio === "16:9") {
            height = 576;
          }
          if (ratio === "9:16") {
            width = 576;
          }
          if (ratio === "3:4") {
            width = 768;
            height = 1024;
          }
          if (ratio === "4:3") {
            width = 1024;
            height = 768;
          }
          const encodedPrompt = encodeURIComponent(promptStr);
          const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=false`;
          const cleanSubject = subject.replace(/[^a-z0-9]/gi, "_").substring(0, 20);
          const fileName = `batch_${cleanSubject}_${variation}_${Date.now()}.jpg`;
          const filePath = path2.join(outDir, fileName);
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            fs2.writeFileSync(filePath, Buffer.from(arrayBuffer));
            resultsLog += `[SUCCESS] ${subject} (${variation}) -> [link](file:///${filePath.replace(/\\/g, "/")})
`;
          } catch (e) {
            resultsLog += `[FAILED] ${subject} (${variation}) -> ${e.message}
`;
          }
        }
      }
      return { content: [{ type: "text", text: resultsLog }] };
    } else if (name === "mythic_status") {
      const status = await checkMythicStatus();
      const accountsList = status.accounts && status.accounts.length > 0 ? status.accounts.map((a) => `\u2022 Slot ${a.slot}: ${a.email || "Google Account"}`).join("\n") : "\u2022 No accounts discovered yet in Chrome";
      const tabsList = status.tabs && status.tabs.length > 0 ? status.tabs.map((t) => `\u2022 Tab #${t.tabId} (${t.target}): ${t.title || t.url} [${t.email || "Active"}]`).join("\n") : "\u2022 No active Gemini/ChatGPT tabs open in Chrome";
      const responseText = `\u26A1 MYTHICFRAME ENGINE STATUS

Web Server: ${status.serverRunning ? `ONLINE (http://localhost:3488)` : `OFFLINE (use 'mythic_launch_server')`}
BEI Extension Bridge: ${status.bridgeRunning ? `ONLINE (Port ${status.bridgePort})` : `OFFLINE`}
BEI Extension Client: ${status.beiConnected ? `CONNECTED` : `NOT CONNECTED (open Chrome tab with extension)`}
Gemini API Key: ${status.hasGeminiApiKey ? `CONFIGURED` : `NOT CONFIGURED (optional with BEI)`}
Available Generation Engines: ${status.availableEngines.join(", ")}

Discovered Accounts:
${accountsList}

Discovered Tabs:
${tabsList}

Summary: ${status.summary}`;
      return { content: [{ type: "text", text: responseText }] };
    } else if (name === "mythic_launch_server") {
      const res = await launchMythicServer();
      return { content: [{ type: "text", text: res.message }] };
    } else if (name === "mythic_open_tab") {
      const target = args.target || "gemini";
      const slot = args.accountSlot ?? 0;
      const res = await openBEITab(target, slot);
      return { content: [{ type: "text", text: res.message }] };
    } else if (name === "mythic_bei_generate") {
      let promptToSend = args.prompt;
      if (args.style) {
        const built = buildIllustrationPrompt(args.prompt, defaultGameContext, args.style, defaultBgConfig, []);
        promptToSend = built.textPrompt;
      }
      const beiRes = await generateWithBEI({
        prompt: promptToSend,
        aspectRatio: args.aspectRatio || "1:1",
        target: args.target || "gemini",
        accountSlot: args.accountSlot ?? 0,
        images: args.images || [],
        timeoutSeconds: args.timeoutSeconds || 900
      });
      const formattedPath = beiRes.filePath.replace(/\\/g, "/");
      const fileName = path2.basename(beiRes.filePath);
      return {
        content: [{
          type: "text",
          text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!

Image saved to: ${beiRes.filePath}
Job ID: ${beiRes.jobId}

Please embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
        }]
      };
    } else if (name === "mythic_smart_generate") {
      const engineChoice = args.engine || "auto";
      let promptToSend = args.prompt;
      if (args.style) {
        const built = buildIllustrationPrompt(args.prompt, defaultGameContext, args.style, defaultBgConfig, []);
        promptToSend = built.textPrompt;
      }
      if (engineChoice === "prompt-only") {
        return { content: [{ type: "text", text: formatTextInstruction(promptToSend) }] };
      }
      if (engineChoice === "bei") {
        const beiRes = await generateWithBEI({
          prompt: promptToSend,
          aspectRatio: args.aspectRatio || "1:1",
          target: args.target || "gemini",
          accountSlot: args.accountSlot ?? 0,
          images: args.images || []
        });
        const formattedPath = beiRes.filePath.replace(/\\/g, "/");
        const fileName = path2.basename(beiRes.filePath);
        return {
          content: [{
            type: "text",
            text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!

Image saved to: ${beiRes.filePath}

Please embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
          }]
        };
      }
      if (engineChoice === "gemini-api") {
        const resText = await executeImageGeneration(promptToSend, args.aspectRatio || "1:1", "mythic_smart", args.geminiApiKey);
        return { content: [{ type: "text", text: resText }] };
      }
      const status = await checkMythicStatus();
      if (status.beiConnected && status.tabs.some((t) => t.target === "gemini" || t.target === "chatgpt")) {
        const beiRes = await generateWithBEI({
          prompt: promptToSend,
          aspectRatio: args.aspectRatio || "1:1",
          target: args.target || "gemini",
          accountSlot: args.accountSlot ?? 0,
          images: args.images || []
        });
        const formattedPath = beiRes.filePath.replace(/\\/g, "/");
        const fileName = path2.basename(beiRes.filePath);
        return {
          content: [{
            type: "text",
            text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!

Image saved to: ${beiRes.filePath}

Please embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
          }]
        };
      }
      if (args.geminiApiKey || status.hasGeminiApiKey) {
        const resText = await executeImageGeneration(promptToSend, args.aspectRatio || "1:1", "mythic_smart", args.geminiApiKey);
        return { content: [{ type: "text", text: resText }] };
      }
      return {
        content: [{
          type: "text",
          text: `CANNOT GENERATE: NO ENGINE READY

Status summary:
${status.summary}

Options to proceed:
1. Zero-Key BEI Route: Run 'mythic_launch_server', then open Chrome and log in at gemini.google.com.
2. Gemini API Route: Provide 'geminiApiKey' or set it in .env.local.
3. Prompt-only: Pass engine: 'prompt-only' to view the optimized generation prompt.`
        }],
        isError: true
      };
    } else if (name === "launch_web_ui") {
      const res = await launchMythicServer();
      return { content: [{ type: "text", text: res.message }] };
    } else if (name === "prepare_ui_reimagine_prompt") {
      result = buildUIReimaginePrompt(args.prompt, defaultGameContext, args.styleSnippet || "", true, args.uiMood, void 0, void 0, args.uiArchetype, args.uiMaterial, false);
      aspectRatio = args.aspectRatio || "16:9";
    } else if (name === "prepare_clothes_prompt") {
      const built = buildClothesPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", defaultBgConfig, []);
      result = built.textPrompt;
    } else if (name === "prepare_map_grid_prompt") {
      const mapConfig = {
        enabled: true,
        viewMode: args.viewMode || "isometric",
        preset: "custom",
        gridWidth: 10,
        gridHeight: 10,
        cellSize: 64,
        primaryColor: args.primaryColor || "#4CAF50",
        accentColor: "#388E3C",
        shadowIntensity: 50,
        lightDirection: "top-left",
        detailDensity: "medium",
        decorationLevel: "medium",
        transparentBackground: true
      };
      result = buildMapGridPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", mapConfig);
      aspectRatio = "16:9";
    } else if (name === "prepare_pose_studio_prompt") {
      const mockPose = { joints: [{ name: "head", x: 50, y: 20 }, { name: "chest", x: 50, y: 40 }] };
      const built = buildPoseStudioPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", defaultBgConfig, [], mockPose);
      result = built.textPrompt;
    } else if (name === "prepare_sprite_sheet_prompts") {
      result = buildSpriteSheetPromptsPrompt(args.prompt, args.frameCount, defaultGameContext);
      isImageGen = false;
    } else if (name === "prepare_frame_prompt") {
      result = buildFramePrompt(args.prompt, defaultGameContext, args.styleSnippet || "", args.elements);
    } else if (name === "prepare_background_asset_prompt") {
      result = buildBackgroundAssetPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", args.patternType);
      aspectRatio = "16:9";
    } else if (name === "prepare_extract_clothes_prompt") {
      const bg = { mode: args.backgroundMode || "transparent" };
      result = buildExtractClothesPrompt(defaultGameContext, bg);
    } else if (name === "prepare_card_suggestions_prompt") {
      result = buildCardSuggestionsPrompt(args.artPrompt, args.currentName || "New Card");
      isImageGen = false;
    } else {
      throw new Error(`Tool not found: ${name}`);
    }
    if (isImageGen) {
      const resultText = await executeImageGeneration(result, aspectRatio, name, args.geminiApiKey);
      return { content: [{ type: "text", text: resultText }] };
    } else {
      return { content: [{ type: "text", text: formatTextInstruction(result) }] };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error processing prompt: ${error.message}` }],
      isError: true
    };
  }
});
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mythic Advanced MCP server running on stdio");
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
