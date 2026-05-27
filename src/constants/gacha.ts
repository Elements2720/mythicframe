
import { GachaAsset, AspectRatio, RaceArchetype, ChibiProportion } from "../types";
import { DEFAULT_BACKGROUND_CONFIG } from "./backgrounds";

export const CHIBI_STYLE_CONFIG: Record<ChibiProportion, { label: string; icon: string; suffix: string; desc: string }> = {
  standard: {
    label: 'Standard',
    icon: 'fa-person',
    suffix: 'anatomically standard human proportions, head-to-body ratio 1:7, realistic silhouette, tall posture',
    desc: 'Natural, realistic human scale.'
  },
  deformed_4h: {
    label: '4-Head',
    icon: 'fa-child',
    suffix: 'semi-deformed proportions, 4-heads tall, head-to-body ratio 1:3, youthful cute silhouette, stylized limbs',
    desc: 'Youthful "Puchi" style proportions.'
  },
  chibi_3h: {
    label: '3-Head',
    icon: 'fa-child-reaching',
    suffix: 'classic chibi proportions, 3-heads tall, head-to-body ratio 1:2, large expressive head, short compact limbs, gacha sprite style',
    desc: 'The gold standard for gacha sprites.'
  },
  micro_2h: {
    label: 'Micro (2-H)',
    icon: 'fa-baby',
    suffix: 'extreme chibi proportions, micro scale, 2-heads tall, head is 50% of total height, tiny body, nendoroid sticker style',
    desc: 'Maximum cuteness. Tiny body, massive head.'
  }
};

export const GACHA_ASSET_PRESETS: { name: string; ratio: AspectRatio; suffix: string; icon: string; bgMode?: string; chibi?: boolean; framing?: 'full-body' | 'waist-up' | 'bust' | 'head-only' }[] = [
  {
    name: 'Vassal Card',
    ratio: '3:4',
    icon: 'fa-id-card',
    suffix: 'Waist-up shot of a single anime character (no group), centered, direct gaze, stoic expression, high-quality polished cel-shaded game art, no background or minimal flat color, character only.',
    bgMode: 'solid',
    framing: 'waist-up'
  },
  {
    name: 'Battle Sprite',
    ratio: '1:1',
    icon: 'fa-sword',
    suffix: 'Full-body sprite, standing, frontal view, vivid and clear costume or armor details, clean cel-shading, lively pose. Style is polished and visually appealing, designed for tactical RPG battle screens. [STRICT NEGATIVE: no moe, no shining eyes, not overly cute, not generic anime style, no exaggerated expressions, no kawaii]',
    bgMode: 'solid',
    chibi: true,
    framing: 'full-body'
  },
  {
    name: 'Avatar Icon',
    ratio: '1:1',
    icon: 'fa-circle-user',
    suffix: 'Headshot / Close-up of a single character, focus entirely on the head and face, centered, direct gaze, solid white background, clean polished game art style.',
    bgMode: 'solid',
    framing: 'head-only'
  },
  {
    name: 'Chambers CG',
    ratio: '16:9',
    icon: 'fa-couch',
    suffix: 'Full character depicted in a highly detailed personal chamber or room tailored specifically to the character\'s race, class, and personality. The setting MUST be located within the dark and imposing Castle of the Demon Lord. For example, a Prime Titan might have a massive stone cavern with chains, while a noble vampire might have a gothic study. The room should perfectly reflect their nature. Relaxed/at ease pose, soft evening or ambient light, cinematic depth, immersive setting, polished high-quality gacha game CG illustration.',
    bgMode: 'scene',
    framing: 'full-body'
  },
  {
    name: 'Dialogue Portrait',
    ratio: '3:4',
    icon: 'fa-comments',
    suffix: 'Anime character close-up portrait, waist-up to shoulders, character faces 45° to viewer’s left, subtle facial emotions, natural posture, focus on face and upper body only, no background, no effects, clean transparent asset for dialogue UI.',
    bgMode: 'solid',
    framing: 'bust'
  },
  {
    name: 'Splash Art',
    ratio: '16:9',
    icon: 'fa-fire',
    suffix: 'Epic dynamic splash illustration for gacha game, single character full-body, dramatic pose, vibrant action movement, centered composition, highly detailed background, masterpiece lighting, sense of scale, cinematic drama.',
    bgMode: 'scene',
    framing: 'full-body'
  },
  {
    name: 'Full Portrait',
    ratio: '9:16',
    icon: 'fa-user',
    suffix: 'Full body character, fully visible from head to toe, standing, stylish RPG-style costume, detailed and expressive posture, clean polished cel-shading, high-quality illustration suitable for gacha summon view or collection screen.',
    bgMode: 'scene',
    framing: 'full-body'
  }
];

export const DEFAULT_GACHA_ASSETS: GachaAsset[] = GACHA_ASSET_PRESETS.map((p, idx) => ({
  id: `default-${idx}`,
  name: p.name,
  aspectRatio: p.ratio,
  size: '1K',
  promptSuffix: p.suffix,
  imageUrl: null,
  status: 'pending',
  bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: (p.bgMode as any) || 'auto', removeHoles: true, healingPower: 100 },
  chibiConfig: p.chibi 
    ? { 
        enabled: true, 
        proportions: 'simple', 
        headStyle: 'realistic', 
        bodyStyle: 'geometric', 
        focus: p.name === 'Battle Sprite' ? 'detailed' : 'kawaii', 
        presetProportion: p.name === 'Battle Sprite' ? 'deformed_4h' : 'chibi_3h', 
        bodyRatio: p.name === 'Battle Sprite' ? '1:4' : '1:2' 
      } 
    : { enabled: false, proportions: 'simple', headStyle: 'realistic', bodyStyle: 'geometric', focus: 'kawaii' },
  framing: p.framing || 'full-body'
}));

export const AETHELGARD_RACES: RaceArchetype[] = [
  { 
    id: 'construct', 
    name: 'Construct', 
    trueName: 'Golem',
    desc: 'Mechanical or golem-like entities forged in the deep forges of Drakmora. Tireless, emotionless engines of war.', 
    traitPromptMale: 'male construct, blocky massive frame, made of stone and metal, glowing runic lines, glowing core, emitting steam, mecha golem, mechanical parts, fantasy',
    traitPromptFemale: 'female construct, blocky massive frame, made of stone and metal, glowing runic lines, glowing core, emitting steam, mecha golem, mechanical parts, fantasy'
  },
  { 
    id: 'dwarf', 
    name: 'Dwarf', 
    trueName: 'Khazad',
    desc: 'Stout subterranean dwellers who bring masterful engineering to the dark forces. Heavily muscled and bearded.', 
    traitPromptMale: 'male dwarf, stout, heavily muscular, intricate braided beard, soot-stained, glowing forge-runes, heavy metal armor, massive hammer, fantasy',
    traitPromptFemale: 'female dwarf, stout, muscular, soot-stained, glowing forge-runes, heavy metal armor, massive hammer, fantasy'
  },
  { 
    id: 'familiar', 
    name: 'Familiar', 
    trueName: 'Abyssal',
    desc: 'Summoned beasts, abyssal creatures, and magical constructs of flesh and blood serving as assassins or shields.', 
    traitPromptMale: 'male creature, monster, glowing arcane markings, unnatural proportions, multiple eyes or limbs, fantasy beast, dark fantasy setting',
    traitPromptFemale: 'female creature, monster, glowing arcane markings, unnatural proportions, multiple eyes or limbs, fantasy beast, dark fantasy setting'
  },
  { 
    id: 'goblin', 
    name: 'Goblin', 
    trueName: 'Gremlin',
    desc: 'Small, green or grey-skinned scavengers functioning as stealth units or engineers.', 
    traitPromptMale: 'male goblin, green skin, pointed ears, small stature, ragged clothing, cunning expression',
    traitPromptFemale: 'female goblin, green skin, pointed ears, small stature, ragged clothing, cunning expression'
  },
  { 
    id: 'harpy', 
    name: 'Harpy', 
    trueName: 'Siren-kin',
    desc: 'Winged humanoids with talons and feathers replacing arms/legs.', 
    traitPromptMale: 'male harpy, bird wings, feathered, talons, wild hair, avian features',
    traitPromptFemale: 'female harpy, bird wings, feathered, talons, wild hair, avian features'
  },
  { 
    id: 'human', 
    name: 'Human', 
    trueName: 'Demon Apostle',
    desc: 'Mortal race. Demon Apostles are Humans who have defected from Sanctus to serve Drakmora.', 
    traitPromptMale: 'male human, scars, corrupted holy symbols, detailed fantasy clothing, corrupted knight armor, practical weaponry, dark fantasy setting',
    traitPromptFemale: 'female human, scars, corrupted holy symbols, detailed fantasy clothing, corrupted knight armor, practical weaponry, dark fantasy setting'
  },
  { 
    id: 'interloper', 
    name: 'Interloper', 
    trueName: 'Terra Prime',
    desc: 'Warriors pulled through spatial rifts from other worlds, favoring sci-fi or modern tactical aesthetics.', 
    traitPromptMale: 'male sci-fi techwear, modern soldier in fantasy, VR goggles, tactical gear, firearms, urban aesthetic, interloper',
    traitPromptFemale: 'female sci-fi techwear, modern soldier in fantasy, VR goggles, tactical gear, firearms, urban aesthetic, interloper'
  },
  { 
    id: 'minotaur', 
    name: 'Minotaur', 
    trueName: 'Asterion',
    desc: 'Towering half-bull powerhouses wielding immense, crude weapons.', 
    traitPromptMale: 'male minotaur, bull head, muscular, towering, horned, hooves, crude massive weapon',
    traitPromptFemale: 'female minotaur, bull head, muscular, towering, horned, hooves, crude massive weapon'
  },
  { 
    id: 'hybrid', 
    name: 'Mythological Hybrid', 
    trueName: 'Dragonoid',
    desc: 'Rare legendary entities born from the union of apex predator species like dragons and true demons.', 
    traitPromptMale: 'male dragonoid, half-dragon, scales on arms and neck, slitted reptilian eyes, draconic horns, imposing wings, thick tail, fantasy, imposing',
    traitPromptFemale: 'female dragonoid, half-dragon, scales on arms and neck, slitted reptilian eyes, draconic horns, imposing wings, thick tail, fantasy, imposing'
  },
  { 
    id: 'shifter', 
    name: 'Shifter', 
    trueName: 'Therian',
    desc: 'Tribal warriors from the untamed edges who harness the power of beasts.', 
    traitPromptMale: 'male animal ears, tail, fangs, bestial features, feral expression, thick fur, rugged tribal leather armor, war paint, tribal adornments, fantasy',
    traitPromptFemale: 'female animal ears, tail, fangs, bestial features, feral expression, thick fur, rugged tribal leather armor, war paint, tribal adornments, fantasy'
  },
  { 
    id: 'slime', 
    name: 'Slime', 
    trueName: 'Ooze',
    desc: 'Gelatinous creatures capable of absorbing impacts and dissolving matter.', 
    traitPromptMale: 'male slime creature, gelatinous, translucent body, monster, glowing inside, amorphous features',
    traitPromptFemale: 'female slime creature, gelatinous, translucent body, monster, glowing inside, amorphous features'
  },
  { 
    id: 'spirit', 
    name: 'Spirit', 
    trueName: 'Cosmic',
    desc: 'Ethereal beings unbound by flesh, representing raw elemental or cosmic forces.', 
    traitPromptMale: 'male ethereal spirit, translucent glowing body, made of starlight and nebula, floating, swirling elemental effects, cosmic entity, glowing magic',
    traitPromptFemale: 'female ethereal spirit, translucent glowing body, made of starlight and nebula, floating, swirling elemental effects, cosmic entity, glowing magic'
  },
  { 
    id: 'fallen', 
    name: 'The Fallen', 
    trueName: 'Castaway',
    desc: 'Once beings of pure light, now cast out or voluntarily corrupted by the Abyss.', 
    traitPromptMale: 'male fallen angel, black feathered wings, shattered corrupted halo, dark elegant robes, weeping black tears, corrupted holy fire, majestic but sinister, fantasy',
    traitPromptFemale: 'female fallen angel, black feathered wings, shattered corrupted halo, dark elegant robes, weeping black tears, corrupted holy fire, majestic but sinister, fantasy'
  },
  { 
    id: 'demon', 
    name: 'Trueborn Demon', 
    trueName: 'Arch-Abyssal',
    desc: 'Original denizens of the dark realms, core nobility and raw magical powerhouse of the Maou\'s forces.', 
    traitPromptMale: 'male trueborn demon, demonic horns, pointed ears, sharp features, fantasy armor, glowing red eyes, digitigrade legs, tail, dark fantasy setting',
    traitPromptFemale: 'female trueborn demon, demonic horns, pointed ears, sharp features, fantasy armor, glowing red eyes, digitigrade legs, tail, dark fantasy setting'
  },
  { 
    id: 'undead', 
    name: 'Undead', 
    trueName: 'Wightlord',
    desc: 'Reanimated by powerful necromancy or lingering grudges, ranging from foot soldiers to Liches.', 
    traitPromptMale: 'male undead, gaunt pale skin, intact skull with attached lower jaw, proportionate head, glowing ethereal eyes, tattered clothing, decaying armor, ominous, dark fantasy',
    traitPromptFemale: 'female undead, gaunt pale skin, intact skull with attached lower jaw, proportionate head, glowing ethereal eyes, tattered clothing, decaying armor, ominous, dark fantasy'
  },
  { 
    id: 'other', 
    name: 'Other', 
    trueName: 'Unknown',
    desc: 'Anomalous entities or unclassified species.', 
    traitPromptMale: 'male, unique features, fantasy',
    traitPromptFemale: 'female, unique features, fantasy'
  }
];
