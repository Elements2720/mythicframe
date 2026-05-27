
import { WorkspaceTab, UIMode } from '../types';
import { DEFAULT_CARD_LAYOUT, DEFAULT_BACKGROUND_CONFIG, DEFAULT_GACHA_ASSETS, DEFAULT_POSE_DATA } from '../constants';
import { DEFAULT_MAP_GRID_CONFIG } from '../constants/mapGrid';

export const createNewTab = (id: string, name: string, mode: UIMode = 'illustration', defaultStyleId: string = 'none'): WorkspaceTab => ({
  id,
  name,
  mode,
  prompt: '',
  generatedImage: null,
  sessionImages: [],
  referenceAssets: [],
  selectedStyleId: defaultStyleId,
  selectedSize: '1K',
  selectedAspectRatio: '1:1',
  bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, removeHoles: true, healingPower: 100 },
  frameElements: ['name_banner', 'description_box'],
  bgPatternType: 'scene',
  viewpoint: 'none',
  seed: null,
  pixelBitSize: '16-bit',
  
  animConfig: { frames: [{ id: '1', prompt: '', imageUrl: null }], fps: 4, type: 'illustration' },
  selectedFrameId: '1',
  
  cardName: '',
  cardMana: '3',
  cardEffects: '',
  cardType: 'Creature',
  cardLayout: { ...DEFAULT_CARD_LAYOUT },
  templateImage: null,
  selectedTemplateId: 'custom',
  selectedLayoutElement: null,
  
  safeZone: { enabled: false, x: 20, y: 20, width: 60, height: 60, aspectRatioLock: false },
  characterTool: { enabled: false, poseDescription: '', lookTarget: null, isSettingLookTarget: false },
  clothesParams: { renderMode: 'model', layout: 'assembled', lockPose: false, framing: 'full-body' },
  chibiConfig: { enabled: false, proportions: 'simple', headStyle: 'realistic', bodyStyle: 'geometric', focus: 'kawaii' },
  noCharacters: false,
  framing: 'full-body',
  
  resizeQueue: [],
  selectedResizeId: null,
  resizeOriginalImage: null,
  resizeZoom: 1.0,
  resizePan: { x: 0, y: 0 },

  bgReplaceQueue: [],
  selectedBgReplaceId: null,

  pixelizeQueue: [],
  selectedPixelizeId: null,
  selectedPixelStyle: '16bit',

  gachaAssets: [...DEFAULT_GACHA_ASSETS].map(a => ({
    ...a,
    bgConfig: { ...a.bgConfig, removeHoles: true, healingPower: 100 }
  })),
  characterTraits: '',
  characterName: 'New Character',
  characterSubtitle: 'Character Subtitle',
  characterRace: 'human',
  characterRarity: 'SSR',
  characterGender: 'Female',
  chibiProportions: 'standard',
  selectedGachaAssetId: null,
  continuityFlags: {
    'Character Consistency': true,
    'Sharp Black Outlines': true,
    'Clean Cel-Shading': true,
    'Metallic Texture Sync': true,
    'Ambient Lighting Lock': false,
    'Background Isolation': true,
    'Palette Adherence': true,
    'Viewpoint Continuity': false
  },
  gachaShowRefs: true,
  
  isEditMode: false,
  editRegion: { x: 25, y: 25, width: 50, height: 50 },
  customRes: { width: 1024, height: 1024 },
  useCustomResBox: false,
  customResBox: { x: 10, y: 10, width: 80, height: 80 },
  
  lastPrompt: null,

  uiReimagineChangeBg: false,
  uiPositionsLocked: false,
  uiThemeMood: 'Clean Minimalist',
  uiElements: ['Health Bars', 'Skill Buttons'],
  uiMoodEnabled: true,
  uiElementsEnabled: true,
  uiColorsEnabled: true,
  uiMaterialEnabled: true,
  uiArchetype: 'classic-rpg',
  uiMaterial: 'polished-metal',
  
  poseData: { ...DEFAULT_POSE_DATA },
  mapGridConfig: { ...DEFAULT_MAP_GRID_CONFIG },
  spriteSheet: {
    frames: [
      { id: '1', prompt: 'Front view, idle', url: null, status: 'idle', bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: 'solid' }, referenceUrl: null },
      { id: '2', prompt: 'Side view, walking', url: null, status: 'idle', bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: 'solid' }, referenceUrl: null },
      { id: '3', prompt: 'Back view, idle', url: null, status: 'idle', bgConfig: { ...DEFAULT_BACKGROUND_CONFIG, mode: 'solid' }, referenceUrl: null }
    ],
    globalPrompt: '',
    animationGoal: '',
    aspectRatio: '1:1',
    globalBackground: { ...DEFAULT_BACKGROUND_CONFIG, mode: 'solid' }
  },
  batchQueue: [],
  selectedBatchId: null,
  batchGenerationMode: 'standard',
  batchVariations: ['chibi']
});

export const getHashMode = (): UIMode => {
    if (typeof window === 'undefined') return 'dashboard';
    try {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const validModes: UIMode[] = ['dashboard', 'library', 'settings', 'frame', 'illustration', 'background', 'fullcard', 'animation', 'resize', 'tutorials', 'clothes', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine', 'style-library', 'pose-studio', 'map-grid', 'sprite-sheet', 'batch', 'downloads'];
      return validModes.includes(hash as UIMode) ? (hash as UIMode) : 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
};
