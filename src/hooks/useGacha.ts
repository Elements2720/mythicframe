
import { WorkspaceTab, GachaAsset, AspectRatio, Rarity, ChibiProportion } from '../types';
import { GACHA_ASSET_PRESETS, DEFAULT_BACKGROUND_CONFIG } from '../constants';

export const useGacha = (
  activeTab: WorkspaceTab, 
  updateActiveTab: (updates: any) => void
) => {
  
  const setGachaAssets = (val: GachaAsset[] | ((p: GachaAsset[]) => GachaAsset[])) => 
    updateActiveTab((prev: WorkspaceTab) => ({ gachaAssets: typeof val === 'function' ? val(prev.gachaAssets) : val }));
  
  const setCharacterTraits = (val: string) => updateActiveTab({ characterTraits: val });
  const setCharacterName = (val: string) => updateActiveTab({ characterName: val });
  const setCharacterSubtitle = (val: string) => updateActiveTab({ characterSubtitle: val });
  const setCharacterRace = (val: string) => updateActiveTab({ characterRace: val });
  const setCharacterRarity = (val: Rarity) => updateActiveTab({ characterRarity: val });
  const setCharacterGender = (val: string) => updateActiveTab({ characterGender: val });
  const setChibiProportions = (val: ChibiProportion) => updateActiveTab({ chibiProportions: val });
  const setSelectedGachaAssetId = (val: string | null) => updateActiveTab({ selectedGachaAssetId: val });
  const setContinuityFlags = (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => 
    updateActiveTab((prev: WorkspaceTab) => ({ continuityFlags: typeof val === 'function' ? val(prev.continuityFlags) : val }));
  const setGachaShowRefs = (val: boolean) => updateActiveTab({ gachaShowRefs: val });

  const addGachaAsset = (name: string = 'New Asset') => {
    const newAsset: GachaAsset = {
      id: Date.now().toString(),
      name,
      aspectRatio: '1:1',
      size: '1K',
      promptSuffix: '',
      imageUrl: null,
      status: 'pending',
      bgConfig: { ...DEFAULT_BACKGROUND_CONFIG }
    };
    setGachaAssets(prev => [...prev, newAsset]);
  };

  const addGachaAssetFromPreset = (presetIndex: number) => {
    const preset = GACHA_ASSET_PRESETS[presetIndex];
    if (!preset) return;
    
    const newAsset: GachaAsset = {
      id: Date.now().toString(),
      name: preset.name,
      aspectRatio: preset.ratio,
      size: '1K',
      promptSuffix: preset.suffix,
      imageUrl: null,
      status: 'pending',
      bgConfig: { 
        ...DEFAULT_BACKGROUND_CONFIG, 
        mode: (preset.bgMode as any) || 'none'
      }
    };
    setGachaAssets(prev => [...prev, newAsset]);
  };

  const updateGachaAsset = (id: string, updates: Partial<GachaAsset>) => {
    setGachaAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeGachaAsset = (id: string) => {
    setGachaAssets(prev => prev.filter(a => a.id !== id));
    if (activeTab.selectedGachaAssetId === id) setSelectedGachaAssetId(null);
  };

  const addContinuityFlag = (name: string) => {
    setContinuityFlags(prev => ({ ...prev, [name]: true }));
  };

  const removeContinuityFlag = (name: string) => {
    setContinuityFlags(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const renameContinuityFlag = (oldName: string, newName: string) => {
    setContinuityFlags(prev => {
      const next = { ...prev };
      const val = next[oldName];
      delete next[oldName];
      next[newName] = val;
      return next;
    });
  };

  return {
    gachaAssets: activeTab.gachaAssets,
    characterTraits: activeTab.characterTraits,
    characterName: activeTab.characterName,
    characterSubtitle: activeTab.characterSubtitle,
    characterRace: activeTab.characterRace,
    characterRarity: activeTab.characterRarity,
    characterGender: activeTab.characterGender,
    chibiProportions: activeTab.chibiProportions,
    selectedGachaAssetId: activeTab.selectedGachaAssetId,
    continuityFlags: activeTab.continuityFlags || {},
    gachaShowRefs: activeTab.gachaShowRefs,
    setGachaAssets,
    setCharacterTraits,
    setCharacterName,
    setCharacterSubtitle,
    setCharacterRace,
    setCharacterRarity,
    setCharacterGender,
    setChibiProportions,
    setSelectedGachaAssetId,
    setContinuityFlags,
    addGachaAsset,
    addGachaAssetFromPreset,
    updateGachaAsset,
    removeGachaAsset,
    addContinuityFlag,
    removeContinuityFlag,
    renameContinuityFlag,
    setGachaShowRefs
  };
};
