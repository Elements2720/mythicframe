import { WorkspaceTab, AnimationProject } from '../types';

export const useAnimation = (
  activeTab: WorkspaceTab, 
  updateActiveTab: (updates: any) => void,
  setGeneratedImage: (url: string | null) => void
) => {
  
  const setAnimConfig = (val: AnimationProject | ((p:AnimationProject)=>AnimationProject)) => 
    updateActiveTab((prev: WorkspaceTab) => ({ animConfig: typeof val === 'function' ? val(prev.animConfig) : val }));
  
  const setSelectedFrameId = (val: string | null) => updateActiveTab({ selectedFrameId: val });

  const handleAddFrame = () => setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: [...prev.frames, { id: Date.now().toString(), prompt: '', imageUrl: null }] }));
  
  const handleUpdateFramePrompt = (id: string, p: string) => setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, prompt: p } : f) }));
  
  const handleDeleteFrame = (id: string) => {
     if (activeTab.animConfig.frames.length <= 1) return;
     setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: prev.frames.filter(f => f.id !== id) }));
     if (activeTab.selectedFrameId === id) setSelectedFrameId(activeTab.animConfig.frames[0].id);
  };
  
  const handleDuplicateFrame = (id: string) => {
     const frame = activeTab.animConfig.frames.find(f => f.id === id);
     if (!frame) return;
     const newFrame = { ...frame, id: Date.now().toString() };
     const idx = activeTab.animConfig.frames.findIndex(f => f.id === id);
     const newFrames = [...activeTab.animConfig.frames];
     newFrames.splice(idx + 1, 0, newFrame);
     setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: newFrames }));
  };
  
  const handleClearFrames = () => { setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: [{ id: Date.now().toString(), prompt: '', imageUrl: null }] })); };
  
  const handleFrameImageUpload = (id: string, file: File) => {
      if (!(file instanceof Blob)) return;
      const reader = new FileReader();
      reader.onload = async () => {
         try {
           const { optimizeBase64Image } = await import('../utils/imageUtils');
           const url = await optimizeBase64Image(reader.result as string, 1024, 0.7);
           setAnimConfig((prev: AnimationProject) => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, imageUrl: url } : f) }));
           if(activeTab.selectedFrameId === id) setGeneratedImage(url);
         } catch(e) {}
      };
      reader.readAsDataURL(file);
  };

  const handleAddMultipleFrames = (prompts: string[]) => {
    setAnimConfig((prev: AnimationProject) => {
      const newFrames = prompts.map((prompt, index) => ({
        id: Date.now().toString() + '-' + index,
        prompt: prompt.trim(),
        imageUrl: null
      }));
      
      const isInitialEmptyFrame = prev.frames.length === 1 && prev.frames[0].prompt.trim() === '' && !prev.frames[0].imageUrl;
      
      return { 
        ...prev, 
        frames: isInitialEmptyFrame ? newFrames : [...prev.frames, ...newFrames] 
      };
    });
  };

  return {
    animConfig: activeTab.animConfig,
    selectedFrameId: activeTab.selectedFrameId,
    setAnimConfig,
    setSelectedFrameId,
    handleAddFrame,
    handleAddMultipleFrames,
    handleUpdateFramePrompt,
    handleDeleteFrame,
    handleDuplicateFrame,
    handleClearFrames,
    handleFrameImageUpload
  };
};