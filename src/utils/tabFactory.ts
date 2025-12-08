
import { WorkspaceTab, UIMode } from '../types';
import { DEFAULT_CARD_LAYOUT, DEFAULT_BACKGROUND_CONFIG } from '../constants';

export const createNewTab = (id: string, name: string, mode: UIMode = 'illustration'): WorkspaceTab => ({
  id,
  name,
  mode,
  prompt: '',
  generatedImage: null,
  sessionImages: [],
  referenceAssets: [],
  selectedStyleId: 'none',
  selectedSize: '1K',
  selectedAspectRatio: '1:1',
  bgConfig: { ...DEFAULT_BACKGROUND_CONFIG },
  frameElements: ['name_banner', 'description_box'],
  bgPatternType: 'scene',
  
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
  clothesParams: { renderMode: 'model' },
  
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
  
  isEditMode: false,
  editRegion: { x: 25, y: 25, width: 50, height: 50 },
  customRes: { width: 1024, height: 1024 },
  useCustomResBox: false,
  customResBox: { x: 10, y: 10, width: 80, height: 80 },
  
  lastPrompt: null
});

export const getHashMode = (): UIMode => {
    if (typeof window === 'undefined') return 'dashboard';
    try {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const validModes: UIMode[] = ['dashboard', 'library', 'settings', 'frame', 'illustration', 'background', 'fullcard', 'animation', 'resize', 'tutorials', 'clothes', 'bg-replace', 'pixelize'];
      return validModes.includes(hash as UIMode) ? (hash as UIMode) : 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
};
