
import { MapGridConfig } from '../types';

export const DEFAULT_MAP_GRID_CONFIG: MapGridConfig = {
  viewMode: 'top-down',
  gridWidth: 40,
  gridHeight: 40,
  cellSize: 64,
  showGrid: true,
  snapToGrid: true,
  tileDiamondRatio: 0.5,
  verticalHeightMultiplier: 1.0,
  preset: 'dungeon',
  primaryColor: '#5C4B3B',
  accentColor: '#C9A227',
  shadowIntensity: 50,
  lightDirection: 'top-left',
  detailDensity: 'medium',
  decorationLevel: 'light',
  transparentBackground: false,
  exportTileSize: 64
};

export const MAP_ENVIRONMENT_PRESETS = [
  { id: 'tomb', name: 'Tomb', primary: '#5C4B3B', accent: '#C9A227' },
  { id: 'dungeon', name: 'Dungeon', primary: '#2D2D2D', accent: '#4A4A4A' },
  { id: 'castle', name: 'Castle', primary: '#7D7D7D', accent: '#A0A0A0' },
  { id: 'forest_ruins', name: 'Forest Ruins', primary: '#3B4B3B', accent: '#5C6B5C' },
  { id: 'custom', name: 'Custom (Prompt-Based)', primary: '#000000', accent: '#FFFFFF' }
];
