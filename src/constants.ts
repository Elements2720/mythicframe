
import { CardLayout, ArtStyle, BackgroundConfig } from "./types";

export const APP_NAME = "MythicFrame";
export const APP_VERSION = "0.4.2-beta";

export const PLACEHOLDER_FRAME = "https://picsum.photos/300/400"; // Just a placeholder for the frame UI

export const MODE_CONFIG = {
  dashboard: {
    title: "Dashboard",
    icon: "fa-chart-pie",
    description: "Project overview and stats."
  },
  library: {
    title: "Asset Library",
    icon: "fa-images",
    description: "View all generated assets."
  },
  settings: {
    title: "Project Settings",
    icon: "fa-gear",
    description: "Configure game context and API."
  },
  tutorials: {
    title: "Tutorials",
    icon: "fa-circle-question",
    description: "Learn how to use MythicFrame."
  },
  frame: {
    title: "Frame Mode",
    icon: "fa-border-all",
    description: "Design card frames and borders."
  },
  illustration: {
    title: "Illustration Mode",
    icon: "fa-paintbrush",
    description: "Generate character and scene art."
  },
  background: {
    title: "Background Mode",
    icon: "fa-image",
    description: "Generate background textures and scenes."
  },
  animation: {
    title: "Animation Studio",
    icon: "fa-film",
    description: "Create frame-by-frame animations."
  },
  fullcard: {
    title: "Design Layout",
    icon: "fa-pen-ruler",
    description: "Compose text, frame, and art."
  },
  resize: {
    title: "Magic Resizer",
    icon: "fa-expand",
    description: "Expand art to new aspect ratios."
  },
  clothes: {
    title: "Clothes Designer",
    icon: "fa-shirt",
    description: "Generate outfits and clothing assets."
  },
  "bg-replace": {
    title: "BG Replacer",
    icon: "fa-panorama",
    description: "Batch replace backgrounds for multiple assets."
  },
  pixelize: {
    title: "Pixel Studio",
    icon: "fa-gamepad",
    description: "Transform art into retro pixel style."
  }
};

export const PIXEL_STYLES = [
  { id: '8bit', label: '8-Bit (NES/GB)', desc: 'Limited palette, blocky, retro console style.' },
  { id: '16bit', label: '16-Bit (SNES)', desc: 'Vibrant, detailed sprites, classic RPG style.' },
  { id: '32bit', label: '32-Bit (PS1)', desc: 'High color depth, dithering, detailed textures.' },
  { id: 'modern', label: 'Modern Indie', desc: 'High-res pixel art, fluid, detailed lighting.' },
];

export const BACKGROUND_PATTERNS = [
  { id: 'scene', label: 'Environmental Scene', description: 'A full scene with depth (e.g., Forest, Dungeon)' },
  { id: 'texture', label: 'Material / Texture', description: 'Stone, Wood, Metal, Fabric surface' },
  { id: 'abstract', label: 'Abstract / Magic', description: 'Energy swirls, gradients, geometric patterns' },
  { id: 'ui_backdrop', label: 'UI Backdrop', description: 'Clean, dark, unobtrusive background for menus' },
  { id: 'muted', label: 'Muted / Pastel', description: 'Soft, desaturated colors suitable for text readability' },
];

export const FRAME_ELEMENTS = [
  { id: 'name_banner', label: 'Name Banner (Top)' },
  { id: 'mana_cost', label: 'Mana/Cost Socket' },
  { id: 'description_box', label: 'Description Box (Bottom)' },
  { id: 'power_toughness', label: 'Stats/Power Badge' },
];

export const DEFAULT_CARD_LAYOUT: CardLayout = {
  art: {
    x: 50,
    y: 35,
    width: 80,
    height: 40,
    zIndex: 'behind',
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0
  },
  name: {
    x: 50,
    y: 12,
    width: 80,
    fontSize: 18,
    textAlign: 'center',
    color: '#ffffff'
  },
  type: {
    x: 50,
    y: 56,
    width: 80,
    fontSize: 12,
    textAlign: 'center',
    color: '#e2e8f0',
    fontFamily: 'Inter, sans-serif'
  },
  description: {
    x: 50,
    y: 65,
    width: 70,
    fontSize: 14,
    textAlign: 'center',
    color: '#e2e8f0'
  },
  mana: {
    x: 10,
    y: 10,
    width: 20,
    fontSize: 24,
    textAlign: 'center',
    color: '#3b82f6'
  }
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  mode: 'none',
  color: '#ffffff',
  allowTransparency: false,
  promptFragment: '',
  patternType: 'abstract'
};

export const ART_STYLES: ArtStyle[] = [
  { id: 'none', name: 'No Style', promptSnippet: '' },
  { id: 'fantasy_oil', name: 'Fantasy Oil Painting', promptSnippet: ', oil painting style, detailed brushstrokes, fantasy art, rich colors, masterpiece' },
  { id: 'anime', name: 'Anime / Manga', promptSnippet: ', anime style, cel shaded, vibrant colors, studio ghibli inspired, high quality' },
  { id: 'cyberpunk', name: 'Cyberpunk', promptSnippet: ', cyberpunk style, neon lights, futuristic, high tech, low life, detailed sci-fi' },
  { id: 'watercolor', name: 'Watercolor', promptSnippet: ', watercolor style, soft edges, artistic, flowing colors, paper texture, dreamy' },
  { id: 'dark_souls', name: 'Dark Fantasy', promptSnippet: ', dark fantasy style, grim, gritty, eldritch, detailed textures, dramatic lighting, souls-like' },
  { id: 'pixel_art', name: 'Pixel Art', promptSnippet: ', pixel art style, 16-bit, retro game asset, dithering, vibrant' },
  { id: 'vector', name: 'Flat Vector', promptSnippet: ', flat vector art, clean lines, minimalist, modern ui style, scalable graphics' },
];

export const INSPIRATION_CATEGORIES = {
  "Lighting": [
    "Cinematic lighting", "Bioluminescent glow", "Golden hour", "Dramatic shadows", "Volumetric fog", "Neon rim light", "Studio lighting"
  ],
  "Camera": [
    "Wide angle", "Macro lens", "Fish eye", "Top-down view", "Isometric view", "Dutch angle", "Depth of field"
  ],
  "Vibe": [
    "Ethereal", "Gritty", "Whimsical", "Apocalyptic", "Serene", "Chaotic", "Majestic"
  ],
  "Materials": [
    "Metallic", "Obsidian", "Crystal", "Rusted metal", "Glowing runes", "Velvet", "Liquid chrome"
  ]
};

export const CARD_FONTS = [
  { name: 'Inter', family: 'Inter, sans-serif', type: 'Sans' },
  { name: 'Cinzel', family: '"Cinzel", serif', type: 'Fantasy' },
  { name: 'Playfair', family: '"Playfair Display", serif', type: 'Serif' },
  { name: 'Roboto Mono', family: '"Roboto Mono", monospace', type: 'Mono' },
];

export const CARD_TEMPLATES = [
  { id: 'custom', name: 'Custom Upload', imageUrl: null, defaultLayout: DEFAULT_CARD_LAYOUT },
];
