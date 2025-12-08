
export type UIMode = 'dashboard' | 'library' | 'settings' | 'tutorials' | 'frame' | 'illustration' | 'background' | 'fullcard' | 'animation' | 'resize' | 'clothes' | 'bg-replace' | 'pixelize';

export interface GameContext {
  setting: string; // "Cozy alchemy shop"
  tone: string; // "Whimsical, warm"
  visualConstraints: string; // "No sci-fi, no modern tech"
}

export interface StyleProfile {
  id: string;
  name: string;
  description: string;
  promptSnippet: string;
  thumbnailUrl?: string;
}

export interface ArtStyle {
  id: string;
  name: string;
  promptSnippet: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  createdAt: number;
}

export interface ReferenceAsset {
  id: string;
  url: string;
  roleNote: string; // "Use this character", "Use this palette", etc.
}

export interface BackgroundConfig {
  mode: 'solid' | 'scene' | 'none' | 'pattern' | 'transparent'; // 'none' = let AI decide
  color: string; // Hex
  allowTransparency: boolean;
  promptFragment: string; // "muted blue background", "stormy sky"
  patternType?: BackgroundPatternType;
}

export type BackgroundPatternType = 'scene' | 'texture' | 'abstract' | 'ui_backdrop' | 'muted';

export interface ClothesParams {
  renderMode: 'model' | 'asset'; // 'model' = on character, 'asset' = ghost mannequin
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  mode: UIMode;
  thumbnailUrl: string; // Base64 or URL
  fullPrompt: string;
  userPrompt: string;
  gameContext: GameContext;
  styleId: string;
  bgConfig: BackgroundConfig;
  referenceAssets: ReferenceAsset[];
  size: ImageSize;
  aspectRatio: AspectRatio;
  frameElements?: FrameElement[];
  bgPatternType?: BackgroundPatternType;
  animationData?: AnimationProject;
  cardData?: any; // For full card mode
  customName?: string;
  safeZone?: SafeZoneConfig;
  clothesParams?: ClothesParams;
  pixelStyle?: PixelStyle;
}

export interface ExportConfig {
  includeImage: boolean;
  includePrompts: boolean;
  includeProjectContext: boolean;
  format: 'png' | 'zip' | 'txt';
}

export interface AppState {
  mode: UIMode;
  projectTitle: string;
  gameContext: GameContext;
  generatedImages: GeneratedImage[];
  currentImage: GeneratedImage | null;
  styleProfile: StyleProfile | null;
  isGenerating: boolean;
  isAnalyzing: boolean;
  apiKeySet: boolean;
}

// Global declaration for the AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

export enum GenerationModel {
  FLASH_2_5 = 'gemini-2.5-flash-image',
  PRO_3 = 'gemini-3-pro-image-preview',
}

export const IMAGE_SIZES = {
  '1K': '1024x1024',
  '2K': '2048x2048',
  '4K': '4096x4096',
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9" | "custom";

export interface PixelDimensions {
  width: number;
  height: number;
}

export interface LayoutElement {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height?: number; // Percentage 0-100 (optional for text)
  fontSize?: number; // px
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  zIndex?: 'behind' | 'front' | number; // Specific for art
  // New: Inner content manipulation for Art
  imageScale?: number; // 1.0 = fit/cover default
  imageOffsetX?: number; // Percentage offset within the box
  imageOffsetY?: number; // Percentage offset within the box
  visible?: boolean;
  locked?: boolean;
  fontFamily?: string;
  textShadow?: string;
}

export interface CardLayout {
  art: LayoutElement;
  name: LayoutElement;
  type: LayoutElement;
  description: LayoutElement;
  mana: LayoutElement;
}

export interface CardTemplate {
  id: string;
  name: string;
  imageUrl: string | null;
  defaultLayout: CardLayout;
}

export type FrameElement = 'name_banner' | 'mana_cost' | 'description_box' | 'power_toughness';

export interface CsvCardData {
  [key: string]: string;
}

export interface AnimationFrame {
  id: string;
  imageUrl: string | null;
  prompt: string;
}

export interface AnimationProject {
  frames: AnimationFrame[];
  fps: number;
  type: 'illustration' | 'background';
}

export interface SafeZoneConfig {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatioLock: boolean;
}

export interface ResizeItem {
  id: string;
  url: string;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  resultUrl?: string;
}

export interface BgReplaceItem extends ResizeItem {
  prompt: string;
  bgConfig: BackgroundConfig;
}

export type PixelStyle = '8bit' | '16bit' | '32bit' | 'modern';

export interface PixelizeItem extends ResizeItem {
  pixelStyle: PixelStyle;
}

export interface CharacterToolState {
  enabled: boolean;
  poseDescription: string;
  lookTarget: { x: number; y: number } | null;
  isSettingLookTarget: boolean;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  mode: UIMode;
  
  // Prompt & Generation
  prompt: string;
  generatedImage: string | null;
  sessionImages: string[];
  referenceAssets: ReferenceAsset[];
  selectedStyleId: string;
  selectedSize: ImageSize;
  selectedAspectRatio: AspectRatio;
  bgConfig: BackgroundConfig;
  frameElements: FrameElement[];
  bgPatternType: BackgroundPatternType;
  
  // Animation
  animConfig: AnimationProject;
  selectedFrameId: string | null;

  // Full Card
  cardName: string;
  cardMana: string;
  cardEffects: string;
  cardType: string;
  cardLayout: CardLayout;
  templateImage: string | null;
  selectedTemplateId: string;
  selectedLayoutElement: keyof CardLayout | null;

  // Tools
  safeZone: SafeZoneConfig;
  characterTool: CharacterToolState;
  clothesParams: ClothesParams;

  // Resize
  resizeQueue: ResizeItem[];
  selectedResizeId: string | null;
  resizeOriginalImage: string | null;
  resizeZoom: number;
  resizePan: { x: number; y: number };

  // Bg Replace
  bgReplaceQueue: BgReplaceItem[];
  selectedBgReplaceId: string | null;

  // Pixelize
  pixelizeQueue: PixelizeItem[];
  selectedPixelizeId: string | null;
  selectedPixelStyle: PixelStyle;

  // Editor
  isEditMode: boolean;
  editRegion: { x: number; y: number; width: number; height: number };
  customRes: PixelDimensions;
  useCustomResBox: boolean;
  customResBox: { x: number; y: number; width: number; height: number };
  
  lastPrompt: string | null;
}
