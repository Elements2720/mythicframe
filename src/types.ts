export type UIMode = 'dashboard' | 'library' | 'settings' | 'tutorials' | 'illustration' | 'animation' | 'resize' | 'clothes' | 'bg-replace' | 'pixelize' | 'frame' | 'background' | 'fullcard' | 'gacha' | 'ui-reimagine';

export type FrameElement = 'name_banner' | 'mana_cost' | 'description_box' | 'power_toughness';

export type Rarity = 'R' | 'SR' | 'SSR' | 'UR';

export type BackgroundPatternType = 'texture' | 'abstract' | 'ui_backdrop' | 'muted' | 'scene';

export type ChibiProportion = 'standard' | 'deformed_4h' | 'chibi_3h' | 'micro_2h';

export interface ChibiConfig {
  enabled: boolean;
  proportions: 'simple' | 'semi'; // 2h vs 3h
  headStyle: 'moe' | 'realistic'; // Ultra-cute vs Defined
  bodyStyle: 'geometric' | 'defined'; // Cylinders vs Defined anatomy
  focus: 'kawaii' | 'detailed'; // Simple vs Textured
}

export interface GameContext {
  setting: string;
  tone: string;
  visualConstraints: string;
}

export interface RaceArchetype {
  id: string;
  name: string;
  trueName: string;
  desc: string;
  traitPromptMale: string;
  traitPromptFemale: string;
}

export interface GachaAsset {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  promptSuffix: string;
  imageUrl: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  bgConfig?: BackgroundConfig;
  locked?: boolean;
  chibiProportions?: ChibiProportion;
  chibiConfig?: ChibiConfig;
}

export interface BackgroundConfig {
  mode: 'solid' | 'scene' | 'none' | 'pattern' | 'transparent';
  color: string;
  secondaryColor?: string;
  gradientType?: 'none' | 'linear' | 'radial';
  allowTransparency: boolean;
  promptFragment: string;
  patternType?: BackgroundPatternType;
  removeHoles?: boolean;
  healingPower?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  mode: UIMode;
  thumbnailUrl: string;
  fullPrompt: string;
  userPrompt: string;
  gameContext: GameContext;
  styleId: string;
  bgConfig: BackgroundConfig;
  referenceAssets: ReferenceAsset[];
  size: ImageSize;
  aspectRatio: AspectRatio;
  gachaAssets?: GachaAsset[];
  characterTraits?: string;
  characterName?: string;
  characterSubtitle?: string;
  characterRace?: string;
  rarity?: Rarity;
  gender?: string;
  chibiProportions?: ChibiProportion;
  customName?: string;
  frameElements?: FrameElement[];
  bgPatternType?: BackgroundPatternType;
  safeZone?: SafeZoneConfig;
  continuityFlags?: Record<string, boolean>;
}

export interface ExportConfig {
  includeImage: boolean;
  includePrompts: boolean;
  includeProjectContext: boolean;
  selectedTabIds: string[];
  format: 'png' | 'zip' | 'txt';
}

export interface ReferenceAsset {
  id: string;
  url: string;
  roleNote: string;
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

export interface LayoutElement {
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  zIndex?: 'behind' | 'front' | number;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  visible?: boolean;
  locked?: boolean;
  fontFamily?: string;
  textShadow?: string;
}

export interface CardLayout {
  art: LayoutElement;
  name: LayoutElement;
  description: LayoutElement;
  mana: LayoutElement;
  type: LayoutElement;
}

export interface ClothesParams {
  renderMode: 'model' | 'asset';
  layout?: 'assembled' | 'spread';
  lockPose?: boolean;
}

export interface ArtStyle {
  id: string;
  name: string;
  promptSnippet: string;
  description?: string;
}

export interface CsvCardData {
  [key: string]: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

export interface WorkspaceTab {
  id: string;
  name: string;
  mode: UIMode;
  
  prompt: string;
  generatedImage: string | null;
  sessionImages: string[];
  referenceAssets: ReferenceAsset[];
  selectedStyleId: string;
  selectedSize: ImageSize;
  selectedAspectRatio: AspectRatio;
  bgConfig: BackgroundConfig;
  bgPatternType: BackgroundPatternType;
  
  animConfig: AnimationProject;
  selectedFrameId: string | null;

  safeZone: SafeZoneConfig;
  characterTool: CharacterToolState;
  clothesParams: ClothesParams;

  resizeQueue: ResizeItem[];
  selectedResizeId: string | null;
  resizeOriginalImage: string | null;
  resizeZoom: number;
  resizePan: { x: number; y: number };

  bgReplaceQueue: BgReplaceItem[];
  selectedBgReplaceId: string | null;

  pixelizeQueue: PixelizeItem[];
  selectedPixelizeId: string | null;
  selectedPixelStyle: PixelStyle;

  gachaAssets: GachaAsset[];
  characterTraits: string;
  characterName: string;
  characterSubtitle: string;
  characterRace: string;
  characterRarity: Rarity;
  characterGender: string;
  chibiProportions: ChibiProportion;
  selectedGachaAssetId: string | null;
  continuityFlags: Record<string, boolean>;
  gachaShowRefs: boolean;

  isEditMode: boolean;
  editRegion: { x: number; y: number; width: number; height: number };
  customRes: PixelDimensions;
  useCustomResBox: boolean;
  customResBox: { x: number; y: number; width: number; height: number };
  
  lastPrompt: string | null;

  frameElements: FrameElement[];
  cardName: string;
  cardMana: string;
  cardEffects: string;
  cardType: string;
  cardLayout: CardLayout;
  templateImage: string | null;
  selectedTemplateId: string;
  selectedLayoutElement: keyof CardLayout | null;

  // UI Reimagine feature
  uiReimagineChangeBg: boolean;
  uiThemeMood: string;
  uiElements: string[];
  uiMoodEnabled: boolean;
  uiElementsEnabled: boolean;
  uiColorsEnabled: boolean;
  uiArchetype: string;
  uiMaterial: string;
}