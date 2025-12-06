
export type UIMode = 'frame' | 'illustration' | 'background' | 'fullcard';

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
  mode: 'solid' | 'scene' | 'none'; // 'none' = let AI decide
  color: string; // Hex
  allowTransparency: boolean;
  promptFragment: string; // "muted blue background", "stormy sky"
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

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";

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
  description: LayoutElement;
  mana: LayoutElement;
}

export interface CardTemplate {
  id: string;
  name: string;
  imageUrl: string | null;
  defaultLayout: CardLayout;
}
