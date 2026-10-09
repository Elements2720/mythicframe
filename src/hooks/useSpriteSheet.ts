
import { WorkspaceTab, SpriteSheetFrame, SpriteSheetState, AspectRatio, BackgroundConfig } from '../types';
import { DEFAULT_BACKGROUND_CONFIG } from '../constants';

export const useSpriteSheet = (
  activeTab: WorkspaceTab,
  updateActiveTab: (updates: any) => void
) => {
  const spriteSheet = activeTab.spriteSheet;

  const setSpriteSheet = (val: Partial<SpriteSheetState> | ((p: SpriteSheetState) => Partial<SpriteSheetState>)) => {
    updateActiveTab((prev: WorkspaceTab) => ({
      spriteSheet: {
        ...prev.spriteSheet,
        ...(typeof val === 'function' ? val(prev.spriteSheet) : val)
      }
    }));
  };

  const setGlobalPrompt = (globalPrompt: string) => setSpriteSheet({ globalPrompt });
  const setAnimationGoal = (animationGoal: string) => setSpriteSheet({ animationGoal });
  const setSpriteAspectRatio = (aspectRatio: AspectRatio) => setSpriteSheet({ aspectRatio });
  const setGlobalBackground = (globalBackground: BackgroundConfig) => setSpriteSheet({ globalBackground });

  const setFrames = (val: SpriteSheetFrame[] | ((p: SpriteSheetFrame[]) => SpriteSheetFrame[])) => {
    setSpriteSheet(prev => ({
      frames: typeof val === 'function' ? val(prev.frames) : val
    }));
  };

  const addFrame = (prompt: string = 'New pose') => {
    const newFrame: SpriteSheetFrame = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      prompt,
      url: null,
      status: 'idle',
      bgConfig: { ...activeTab.spriteSheet.globalBackground },
      referenceUrl: null
    };
    setFrames(prev => [...prev, newFrame]);
  };

  const setFrameCount = (count: number) => {
    setFrames(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const newFrames = [...prev];
        for (let i = prev.length; i < count; i++) {
          newFrames.push({
            id: Date.now().toString() + i + Math.random().toString(36).substr(2, 9),
            prompt: `Frame ${i + 1}`,
            url: null,
            status: 'idle',
            bgConfig: { ...activeTab.spriteSheet.globalBackground },
            referenceUrl: null
          });
        }
        return newFrames;
      }
      return prev.slice(0, count);
    });
  };

  const removeFrame = (id: string) => {
    setFrames(prev => prev.filter(f => f.id !== id));
  };

  const updateFrame = (id: string, updates: Partial<SpriteSheetFrame>) => {
    setFrames(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const clearResults = () => {
    setFrames(prev => prev.map(f => ({ ...f, url: null, status: 'idle' })));
  };

  const clearAll = () => {
    updateActiveTab((prev: WorkspaceTab) => ({
      spriteSheet: {
        ...prev.spriteSheet,
        globalPrompt: '',
        animationGoal: '',
        frames: [
          { id: '1', prompt: 'Front view, idle', url: null, status: 'idle', bgConfig: { ...prev.spriteSheet.globalBackground }, referenceUrl: null },
          { id: '2', prompt: 'Side view, walking', url: null, status: 'idle', bgConfig: { ...prev.spriteSheet.globalBackground }, referenceUrl: null },
          { id: '3', prompt: 'Back view, idle', url: null, status: 'idle', bgConfig: { ...prev.spriteSheet.globalBackground }, referenceUrl: null }
        ]
      }
    }));
  };

  return {
    spriteSheet,
    setGlobalPrompt,
    setAnimationGoal,
    setSpriteAspectRatio,
    setGlobalBackground,
    setFrames,
    addFrame,
    removeFrame,
    updateFrame,
    setFrameCount,
    clearResults,
    clearAll
  };
};
