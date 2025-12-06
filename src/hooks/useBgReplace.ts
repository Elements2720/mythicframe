
import { WorkspaceTab, BgReplaceItem, BackgroundConfig } from '../types';
import { DEFAULT_BACKGROUND_CONFIG } from '../constants';

export const useBgReplace = (
  activeTab: WorkspaceTab, 
  updateActiveTab: (updates: any) => void,
  setGeneratedImage: (url: string | null) => void,
  // Function to sync global state with selected item state
  syncGlobalState: (prompt: string, bgConfig: BackgroundConfig) => void
) => {
  
  const setBgReplaceQueue = (val: BgReplaceItem[] | ((p: BgReplaceItem[]) => BgReplaceItem[])) => 
    updateActiveTab((prev: WorkspaceTab) => ({ bgReplaceQueue: typeof val === 'function' ? val(prev.bgReplaceQueue) : val }));
  
  const setSelectedBgReplaceId = (val: string | null) => updateActiveTab({ selectedBgReplaceId: val });

  const onAddBgReplaceFiles = (files: FileList) => {
     const newItems: BgReplaceItem[] = Array.from(files).map(f => ({
        id: Date.now().toString() + Math.random(),
        url: URL.createObjectURL(f),
        name: f.name,
        status: 'pending',
        prompt: '',
        bgConfig: { ...DEFAULT_BACKGROUND_CONFIG }
     }));
     setBgReplaceQueue((prev) => [...prev, ...newItems]);
     
     // Auto-select first if none selected
     if (!activeTab.selectedBgReplaceId && newItems.length > 0) {
         selectItem(newItems[0].id, newItems[0]);
     }
  };

  const selectItem = (id: string, item?: BgReplaceItem) => {
     setSelectedBgReplaceId(id);
     const target = item || activeTab.bgReplaceQueue.find(i => i.id === id);
     if (target) {
        setGeneratedImage(target.resultUrl || target.url);
        // Sync global controls to this item's settings
        syncGlobalState(target.prompt, target.bgConfig);
     }
  };

  const onSelectBgReplaceItem = (id: string) => selectItem(id);

  const onRemoveBgReplaceItem = (id: string) => {
     setBgReplaceQueue((prev) => prev.filter(i => i.id !== id));
     if (activeTab.selectedBgReplaceId === id) {
         setSelectedBgReplaceId(null);
         setGeneratedImage(null);
         syncGlobalState('', DEFAULT_BACKGROUND_CONFIG);
     }
  };

  const handleClearBgReplaceResult = (id: string) => {
     setBgReplaceQueue((prev) => prev.map(i => i.id === id ? { ...i, status: 'pending', resultUrl: undefined } : i));
     if (activeTab.selectedBgReplaceId === id) {
         const item = activeTab.bgReplaceQueue.find(i => i.id === id);
         if(item) setGeneratedImage(item.url);
     }
  };

  const handleBgReplaceRename = (id: string, name: string) => {
     setBgReplaceQueue((prev) => prev.map(i => i.id === id ? { ...i, name } : i));
  };

  // Update item when global controls change
  const updateSelectedItem = (updates: Partial<BgReplaceItem>) => {
      if (!activeTab.selectedBgReplaceId) return;
      setBgReplaceQueue(prev => prev.map(item => 
          item.id === activeTab.selectedBgReplaceId ? { ...item, ...updates } : item
      ));
  };

  return {
    bgReplaceQueue: activeTab.bgReplaceQueue,
    selectedBgReplaceId: activeTab.selectedBgReplaceId,
    setBgReplaceQueue,
    onAddBgReplaceFiles,
    onSelectBgReplaceItem,
    onRemoveBgReplaceItem,
    handleClearBgReplaceResult,
    handleBgReplaceRename,
    updateSelectedItem
  };
};
