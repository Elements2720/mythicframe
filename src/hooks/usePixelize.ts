
import { WorkspaceTab, PixelizeItem, PixelStyle } from '../types';

export const usePixelize = (
  activeTab: WorkspaceTab, 
  updateActiveTab: (updates: any) => void,
  setGeneratedImage: (url: string | null) => void,
  syncGlobalState: (style: PixelStyle) => void
) => {
  
  const setPixelizeQueue = (val: PixelizeItem[] | ((p: PixelizeItem[]) => PixelizeItem[])) => 
    updateActiveTab((prev: WorkspaceTab) => ({ pixelizeQueue: typeof val === 'function' ? val(prev.pixelizeQueue) : val }));
  
  const setSelectedPixelizeId = (val: string | null) => updateActiveTab({ selectedPixelizeId: val });

  const onAddPixelizeFiles = (files: FileList) => {
     const newItems: PixelizeItem[] = Array.from(files).map(f => ({
        id: Date.now().toString() + Math.random(),
        url: URL.createObjectURL(f),
        name: f.name,
        status: 'pending',
        pixelStyle: activeTab.selectedPixelStyle || '16bit'
     }));
     setPixelizeQueue((prev) => [...prev, ...newItems]);
     
     // Auto-select first if none selected
     if (!activeTab.selectedPixelizeId && newItems.length > 0) {
         selectItem(newItems[0].id, newItems[0]);
     }
  };

  const selectItem = (id: string, item?: PixelizeItem) => {
     setSelectedPixelizeId(id);
     const target = item || activeTab.pixelizeQueue.find(i => i.id === id);
     if (target) {
        setGeneratedImage(target.resultUrl || target.url);
        // Sync global controls to this item's settings
        syncGlobalState(target.pixelStyle);
     }
  };

  const onSelectPixelizeItem = (id: string) => selectItem(id);

  const onRemovePixelizeItem = (id: string) => {
     setPixelizeQueue((prev) => prev.filter(i => i.id !== id));
     if (activeTab.selectedPixelizeId === id) {
         setSelectedPixelizeId(null);
         setGeneratedImage(null);
     }
  };

  const handleClearPixelizeResult = (id: string) => {
     setPixelizeQueue((prev) => prev.map(i => i.id === id ? { ...i, status: 'pending', resultUrl: undefined } : i));
     if (activeTab.selectedPixelizeId === id) {
         const item = activeTab.pixelizeQueue.find(i => i.id === id);
         if(item) setGeneratedImage(item.url);
     }
  };

  const handlePixelizeRename = (id: string, name: string) => {
     setPixelizeQueue((prev) => prev.map(i => i.id === id ? { ...i, name } : i));
  };

  // Update item when global controls change
  const updateSelectedItem = (updates: Partial<PixelizeItem>) => {
      if (!activeTab.selectedPixelizeId) return;
      setPixelizeQueue(prev => prev.map(item => 
          item.id === activeTab.selectedPixelizeId ? { ...item, ...updates } : item
      ));
  };

  return {
    pixelizeQueue: activeTab.pixelizeQueue,
    selectedPixelizeId: activeTab.selectedPixelizeId,
    setPixelizeQueue,
    onAddPixelizeFiles,
    onSelectPixelizeItem,
    onRemovePixelizeItem,
    handleClearPixelizeResult,
    handlePixelizeRename,
    updateSelectedItem
  };
};
