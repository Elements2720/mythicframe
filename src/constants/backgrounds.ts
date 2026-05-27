
import { BackgroundConfig } from "../types";

export const BACKGROUND_PATTERNS = [
  { id: 'abstract', name: 'Abstract Shapes', desc: 'Flowing energies and geometric overlays.' },
  { id: 'texture', name: 'Seamless Texture', desc: 'Wood, stone, or metallic surfaces.' },
  { id: 'ui_backdrop', name: 'UI Backdrop', desc: 'Dark, vignette style for readability.' },
  { id: 'muted', name: 'Muted Pastel', desc: 'Soft gradients and low detail.' },
  { id: 'scene', name: 'Detailed Scene', desc: 'Environment-focused background.' }
];

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  mode: 'auto',
  color: '#ffffff',
  allowTransparency: false,
  promptFragment: '',
  patternType: 'abstract',
  removeHoles: true,
  healingPower: 100,
  keyColor: '#ffffff',
  
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
