
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

export const GACHA_ASSET_PRESETS: { name: string; ratio: AspectRatio; suffix: string; icon: string; bgMode?: string }[] = [
  {
    name: 'Vassal Card',
    ratio: '3:4',
    icon: 'fa-id-card',
    suffix: 'Waist-up shot of a single anime character (no group), centered, direct gaze, stoic expression, high-quality polished cel-shaded game art, no background or minimal flat color, character only.',
    bgMode: 'transparent'
  },
  {
    name: 'Battle Sprite',
    ratio: '1:1',
    icon: 'fa-sword',
    suffix: 'Full-body sprite, standing, frontal view, vivid and clear costume or armor details, clean cel-shading, lively pose. Style is polished and visually appealing, designed for tactical RPG battle screens.',
    bgMode: 'transparent'
  },
  {
    name: 'Chibi Portrait',
    ratio: '3:4',
    icon: 'fa-child',
    suffix: 'Full-body and centered character portrait. compact and sturdy body, expressive face, vibrant and sharply defined costume or armor. Style is clean cel-shaded with crisp linework, suitable as a collectible portrait.',
    bgMode: 'transparent'
  },
  {
    name: 'Chambers CG',
    ratio: '16:9',
    icon: 'fa-couch',
    suffix: 'Full character depicted in a detailed anime bedroom or lounge environment, relaxed/at ease pose, soft evening or ambient light, cinematic depth, immersive setting, polished high-quality gacha game CG illustration.',
    bgMode: 'scene'
  },
  {
    name: 'Dialogue Portrait',
    ratio: '3:4',
    icon: 'fa-comments',
    suffix: 'Anime character close-up portrait, waist-up to shoulders, character faces 45° to viewer’s left, subtle facial emotions, natural posture, focus on face and upper body only, no background, no effects, clean transparent asset for dialogue UI.',
    bgMode: 'transparent'
  },
  {
    name: 'Splash Art',
    ratio: '16:9',
    icon: 'fa-fire',
    suffix: 'Epic dynamic splash illustration for gacha game, single character full-body, dramatic pose, vibrant action movement, centered composition, highly detailed background, masterpiece lighting, sense of scale, cinematic drama.',
    bgMode: 'scene'
  },
  {
    name: 'Full Portrait',
    ratio: '9:16',
    icon: 'fa-user',
    suffix: 'Full body character, fully visible from head to toe, standing, stylish RPG-style costume, detailed and expressive posture, clean polished cel-shading, high-quality illustration suitable for gacha summon view or collection screen.',
    bgMode: 'scene'
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
  bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: (p.bgMode as any) || 'none', removeHoles: true, healingPower: 100 }
}));

export const AETHELGARD_RACES: RaceArchetype[] = [
  { 
    id: 'human', 
    name: 'Human', 
    trueName: 'Terran',
    desc: 'Versatile and ambitious. They often wear empire-style tactical gear or traditional medieval armor.', 
    traitPromptMale: 'male human features, versatile empire tactical gear, tactical armor, standard proportions, determined gaze',
    traitPromptFemale: 'female human features, versatile empire tactical gear, tactical armor, standard proportions, determined gaze'
  },
  { 
    id: 'cursed_automaton', 
    name: 'Cursed Automaton', 
    trueName: 'Chronos-Frame',
    desc: 'Sentient machines bound by ancient spells. Characterized by porcelain skin, brass machinery, and steam vents.', 
    traitPromptMale: 'sentient machine, male porcelain skin, brass clockwork machinery, steam vents, glowing blue core, clockwork limbs',
    traitPromptFemale: 'sentient machine, female porcelain skin, brass clockwork machinery, steam vents, glowing blue core, clockwork limbs'
  },
  { 
    id: 'true_demon', 
    name: 'True Demon', 
    trueName: 'Arch-Abyssal',
    desc: 'High-tier nobility of the demon realm. Characterized by regal posture, obsidian horns, and ancient silks.', 
    traitPromptMale: 'regal male demon nobility, majestic posture, obsidian horns, ancient silk robes, vertical pupils, dark energy',
    traitPromptFemale: 'regal female demon nobility, majestic posture, obsidian horns, ancient silk robes, vertical pupils, dark energy'
  },
  { 
    id: 'undead_knight', 
    name: 'Undead Knight', 
    trueName: 'Wightlord',
    desc: 'Resurrected warriors bound in heavy, jagged black armor. Usually featuring glowing eyes and thorn motifs.', 
    traitPromptMale: 'undead warrior, heavy jagged black plate armor, glowing spectral eyes, thorn motifs, tattered cape, skeletal accents, helmet with glowing eyes (never fully obscured)',
    traitPromptFemale: 'female undead warrior, heavy jagged black plate armor with some exposed sections subtly revealing pallid or ghostly skin, glowing spectral eyes, thorn motifs, tattered cape, skeletal accents. Helmet partially open or designed so part of the face and eyes are visible, never fully obscured'
  },
  { 
    id: 'bear_shifter', 
    name: 'Bear Shifter', 
    trueName: 'Beorn',
    desc: 'Humans who can transform into bears. Usually muscular with bear ears and tribal fur clothing.', 
    traitPromptMale: 'muscular male build, bear ears, tribal fur clothing, wild hair, primal strength, beast-like gaze',
    traitPromptFemale: 'muscular female build, bear ears, tribal fur clothing, wild hair, primal strength, beast-like gaze'
  },
  { 
    id: 'gargoyle_shifter', 
    name: 'Gargoyle Shifter', 
    trueName: 'Lithos',
    desc: 'Stone-skinned creatures with wings. They appear sculptural with marble-textured skin.', 
    traitPromptMale: 'stone-skinned male humanoid, marble-textured skin, large stone wings, sculptural features, glowing cracks',
    traitPromptFemale: 'stone-skinned female humanoid, marble-textured skin, large stone wings, sculptural features, glowing cracks'
  },
  { 
    id: 'demon_warrior', 
    name: 'Demon Warrior', 
    trueName: 'Hellion',
    desc: 'Standard demonic combatants. Often tall with black horns and heavy silver or obsidian plate.', 
    traitPromptMale: 'male demonic combatant, black horns, heavy silver plate armor, obsidian weapons, aggressive stance',
    traitPromptFemale: 'female demonic combatant, black horns, heavy silver plate armor, obsidian weapons, aggressive stance'
  },
  { 
    id: 'dragonoid', 
    name: 'Dragonoid', 
    trueName: 'Drake-born',
    desc: 'Descendants of ancient dragons. Featuring reptilian eyes, spiky hair, small horns, and dragon wings.', 
    traitPromptMale: 'male reptilian eyes, small draconic horns, dragon wings, scaly skin patches, spiky hair, draconic tail',
    traitPromptFemale: 'female reptilian eyes, small draconic horns, dragon wings, scaly skin patches, spiky hair, draconic tail'
  },
  { 
    id: 'wolf_kin', 
    name: 'Wolf-kin', 
    trueName: 'Fenris',
    desc: 'Wild warriors with lupine traits. Characterized by wolf ears, fur armor, and messy hair.', 
    traitPromptMale: 'male wolf ears, fur-trimmed armor, messy hair, predatory gaze, lupine features, sharp claws',
    traitPromptFemale: 'female wolf ears, fur-trimmed armor, messy hair, predatory gaze, lupine features, sharp claws'
  },
  { 
    id: 'half_demon', 
    name: 'Half-Demon', 
    trueName: 'Cambion',
    desc: 'Hybrids born of two worlds. Usually featuring a single large horn and obsidian blade-like skin.', 
    traitPromptMale: 'male hybrid humanoid, single large horn, obsidian blade-like skin patches, asymmetrical demonic traits',
    traitPromptFemale: 'female hybrid humanoid, single large horn, obsidian blade-like skin patches, asymmetrical demonic traits'
  },
  { 
    id: 'lion_shifter', 
    name: 'Lion Shifter', 
    trueName: 'Leonin',
    desc: 'Regal warriors with mane-like hair and lion ears. Associated with sun-fire magic and golden armor.', 
    traitPromptMale: 'regal male lion ears, mane-like voluminous hair, golden armor, lion-like facial traits, sun-fire glow',
    traitPromptFemale: 'regal female lion ears, mane-like voluminous hair, golden armor, lion-like facial traits, sun-fire glow'
  },
  { 
    id: 'lizard_kin', 
    name: 'Lizard-kin', 
    trueName: 'Saurian',
    desc: 'Scaled survivalists with lizard-like features. Characterized by green scales, slit eyes, and mud-stained gear.', 
    traitPromptMale: 'male green scaled skin, lizard slit eyes, mud-stained survivalist gear, reptile snout, primitive accessories',
    traitPromptFemale: 'female green scaled skin, lizard slit eyes, mud-stained survivalist gear, reptile snout, primitive accessories'
  },
  { 
    id: 'spectre', 
    name: 'Spectre / Ghost', 
    trueName: 'Wraith',
    desc: 'Ethereal beings with translucent skin and spectral fire hair. Melancholy and glowing.', 
    traitPromptMale: 'ethereal male ghost, translucent skin, spectral fire hair, glowing semi-transparent body, melancholic expression',
    traitPromptFemale: 'ethereal female ghost, translucent skin, spectral fire hair, glowing semi-transparent body, melancholic expression'
  },
  { 
    id: 'fallen_angel', 
    name: 'Fallen Angel', 
    trueName: 'Castaway',
    desc: 'Divine beings cast out from heaven. Featuring black wings, silver hair, and divine tattered robes.', 
    traitPromptMale: 'male black feathered wings, silver hair, tattered divine silk robes, melancholic beauty, broken halo',
    traitPromptFemale: 'female black feathered wings, silver hair, tattered divine silk robes, melancholic beauty, broken halo'
  },
  { 
    id: 'origami_spirit', 
    name: 'Origami Spirit', 
    trueName: 'Kami-gami',
    desc: 'Spirits inhabiting paper forms. Their bodies appear flat with paper-like textures and paper charms.', 
    traitPromptMale: 'male paper-texture body, flat angular paper form, paper charms, ink-drawn features, delicate folding creases',
    traitPromptFemale: 'female paper-texture body, flat angular paper form, paper charms, ink-drawn features, delicate folding creases'
  },
  { 
    id: 'avian_demon', 
    name: 'Avian Demon / Harpy', 
    trueName: 'Siren-kin',
    desc: 'Bird-like humanoids. Characterized by bird eyes, taloned feet, and massive feathered wings.', 
    traitPromptMale: 'male bird-like eyes, massive feathered wings, taloned feet and hands, bird feathers in hair, sharp features',
    traitPromptFemale: 'female bird-like eyes, massive feathered wings, taloned feet and hands, bird feathers in hair, sharp features'
  },
  { 
    id: 'naga_gorgon', 
    name: 'Naga / Gorgon', 
    trueName: 'Medusan',
    desc: 'Snake-like humanoids with snake eyes and scales. Gorgons specifically feature hair made of vipers.', 
    traitPromptMale: 'male snake eyes, scaly patches, serpentine lower body or features, hair made of living vipers',
    traitPromptFemale: 'female snake eyes, scaly patches, serpentine lower body or features, hair made of living vipers'
  },
  { 
    id: 'cosmic_horror', 
    name: 'Cosmic Spirit', 
    trueName: 'Star-Eater',
    desc: 'Entities made of starlight and ink. Silhouette often filled with nebula stars and moving galaxies.', 
    traitPromptMale: 'male entity made of starlight and ink, silhouette filled with nebulae, ethereal form, cosmic glow, galaxy skin',
    traitPromptFemale: 'female entity made of starlight and ink, silhouette filled with nebulae, ethereal form, cosmic glow, galaxy skin'
  },
  { 
    id: 'demon_ranger', 
    name: 'Demon Ranger', 
    trueName: 'Shadow-Bow',
    desc: 'Skilled archers of the demon forests. Characterized by messy hair, green eyes, and tactical archer gear.', 
    traitPromptMale: 'male demon forest archer, messy hair, emerald green eyes, dark tactical archery gear, nimble build',
    traitPromptFemale: 'female demon forest archer, messy hair, emerald green eyes, dark tactical archery gear, nimble build'
  },
  { 
    id: 'succubus', 
    name: 'Succubus Royalty', 
    trueName: 'Lilim',
    desc: 'Masters of charm and manipulation. Featuring purple eyes, obsidian horns, and luxurious silks.', 
    traitPromptMale: 'luxurious male demon silks, purple glowing eyes, obsidian horns, seductive posture, heart motifs',
    traitPromptFemale: 'luxurious female demon silks, purple glowing eyes, obsidian horns, seductive posture, heart motifs'
  },
  { 
    id: 'vampire', 
    name: 'Vampire', 
    trueName: 'Night-Lord',
    desc: 'Blood-drinking nobles. Characterized by crimson eyes, silver hair buns, and gothic attire.', 
    traitPromptMale: 'crimson eyes, pale male skin, silver hair, ornate gothic vampire attire, fangs, aristocratic aura',
    traitPromptFemale: 'crimson eyes, pale female skin, silver hair in a bun, ornate gothic vampire attire, fangs, aristocratic aura'
  },
  { 
    id: 'dryad', 
    name: 'Dryad', 
    trueName: 'Silvan',
    desc: 'Forest spirits with wooden skin, leaf ears, and green vine hair.', 
    traitPromptMale: 'wooden-textured male skin, pointed leaf ears, green vine hair, flower crown, earthen tones, plant-like features',
    traitPromptFemale: 'wooden-textured female skin, pointed leaf ears, green vine hair, flower crown, earthen tones, plant-like features'
  },
  { 
    id: 'angel_traitor', 
    name: 'Angel Traitor', 
    trueName: 'Oath-Breaker',
    desc: 'Angels who abandoned heaven. Featuring broken white wings and golden liquid tears.', 
    traitPromptMale: 'male broken white wings, golden liquid tears, tattered holy robes, tragic expression, cracked halo',
    traitPromptFemale: 'female broken white wings, golden liquid tears, tattered holy robes, tragic expression, cracked halo'
  },
  { 
    id: 'deep_sea_demon', 
    name: 'Deep Sea Demon / Mermaid', 
    trueName: 'Abysso-mar',
    desc: 'Bioluminescent hunters of the abyss. Characterized by teal hair, gills, and scale jewelry.', 
    traitPromptMale: 'male teal hair, neck gills, bioluminescent skin markings, scale-textured jewelry, webbed features',
    traitPromptFemale: 'female teal hair, neck gills, bioluminescent skin markings, scale-textured jewelry, webbed features'
  },
  { 
    id: 'technomage', 
    name: 'Technomage / Machine', 
    trueName: 'Cyber-Aether',
    desc: 'Fusion of mana and machinery. Featuring circuitry skin, glowing veins, and brass mechanical hearts.', 
    traitPromptMale: 'male circuitry-patterned skin, glowing mana veins, exposed brass mechanical heart, magitech tools, glowing eyes',
    traitPromptFemale: 'female circuitry-patterned skin, glowing mana veins, exposed brass mechanical heart, magitech tools, glowing eyes'
  }
];
