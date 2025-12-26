
import { BackgroundConfig } from "../types";

export const BACKGROUND_PATTERNS = [
  { id: 'abstract', name: 'Abstract Shapes', desc: 'Flowing energies and geometric overlays.' },
  { id: 'texture', name: 'Seamless Texture', desc: 'Wood, stone, or metallic surfaces.' },
  { id: 'ui_backdrop', name: 'UI Backdrop', desc: 'Dark, vignette style for readability.' },
  { id: 'muted', name: 'Muted Pastel', desc: 'Soft gradients and low detail.' },
  { id: 'scene', name: 'Detailed Scene', desc: 'Environment-focused background.' }
];

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  mode: 'none',
  color: '#ffffff',
  allowTransparency: false,
  promptFragment: '',
  patternType: 'abstract',
  removeHoles: true,
  healingPower: 100
};
