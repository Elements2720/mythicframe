
import { WorkspaceTab, ResizeItem, PixelDimensions, UIMode } from '../types';

export const useResize = (
  activeTab: WorkspaceTab, 
  updateActiveTab: (updates: any) => void,
  setGeneratedImage: (url: string | null) => void
) => {
  
  // Helpers to safely update nested tab state
  const setResizeQueue = (val: ResizeItem[] | ((p: ResizeItem[]) => ResizeItem[])) => 
    updateActiveTab((prev: WorkspaceTab) => ({ resizeQueue: typeof val === 'function' ? val(prev.resizeQueue) : val }));
  
  const setSelectedResizeId = (val: string | null) => updateActiveTab({ selectedResizeId: val });
  const setResizeOriginalImage = (val: string | null) => updateActiveTab({ resizeOriginalImage: val });
  const setResizeZoom = (val: number) => updateActiveTab({ resizeZoom: val });
  const setResizePan = (val: { x: number, y: number } | ((p:{x:number,y:number})=>{x:number,y:number})) => 
    updateActiveTab((prev: WorkspaceTab) => ({ resizePan: typeof val === 'function' ? val(prev.resizePan) : val }));

  const onAddResizeFiles = (files: FileList) => {
     const newItems = Array.from(files).map(f => ({
        id: Date.now().toString() + Math.random(),
        url: URL.createObjectURL(f),
        name: f.name,
        status: 'pending' as const
     }));
     setResizeQueue((prev: ResizeItem[]) => [...prev, ...newItems]);
     if (!activeTab.selectedResizeId && newItems.length > 0) {
         setSelectedResizeId(newItems[0].id);
         setResizeOriginalImage(newItems[0].url);
         setGeneratedImage(newItems[0].url);
     }
  };

  const onSelectResizeItem = (id: string) => {
     setSelectedResizeId(id);
     const item = activeTab.resizeQueue.find(i => i.id === id);
     if (item) {
        setResizeOriginalImage(item.url);
        setGeneratedImage(item.resultUrl || item.url);
     }
  };

  const onRemoveResizeItem = (id: string) => {
     setResizeQueue((prev: ResizeItem[]) => prev.filter(i => i.id !== id));
     if (activeTab.selectedResizeId === id) {
         setSelectedResizeId(null);
         setGeneratedImage(null);
         setResizeOriginalImage(null);
     }
  };

  const handleClearResizeResult = (id: string) => {
     setResizeQueue((prev: ResizeItem[]) => prev.map(i => i.id === id ? { ...i, status: 'pending', resultUrl: undefined } : i));
     if (activeTab.selectedResizeId === id) {
         const item = activeTab.resizeQueue.find(i => i.id === id);
         if(item) setGeneratedImage(item.url);
     }
  };

  const handleResizeRename = (id: string, name: string) => {
     setResizeQueue((prev: ResizeItem[]) => prev.map(i => i.id === id ? { ...i, name } : i));
  };

  return {
    resizeQueue: activeTab.resizeQueue,
    selectedResizeId: activeTab.selectedResizeId,
    resizeOriginalImage: activeTab.resizeOriginalImage,
    resizeZoom: activeTab.resizeZoom,
    resizePan: activeTab.resizePan,
    setResizeZoom,
    setResizePan,
    onAddResizeFiles,
    onSelectResizeItem,
    onRemoveResizeItem,
    handleClearResizeResult,
    handleResizeRename,
    setResizeQueue
  };
};
