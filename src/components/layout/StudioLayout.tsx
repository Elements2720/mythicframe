import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import RightPanel from './RightPanel';
import UIReimaginePanel from './UIReimaginePanel';
import ClothesDesignerPanel from './ClothesDesignerPanel';
import PromptPanel from '../ui/PromptPanel';
import AnimationTimeline from '../ui/AnimationTimeline';
import ResizeBottomPanel from '../ui/ResizeBottomPanel';
import BgReplaceBottomPanel from '../ui/BgReplaceBottomPanel';
import PixelizeBottomPanel from '../ui/PixelizeBottomPanel';
import GachaBottomPanel from '../ui/GachaBottomPanel';
import IllustrationCanvas from '../canvas/IllustrationCanvas';
import ResizeCanvas from '../canvas/ResizeCanvas';
import BgReplaceCanvas from '../canvas/BgReplaceCanvas';
import PixelizeCanvas from '../canvas/PixelizeCanvas';
import GachaCanvas from '../canvas/GachaCanvas';
import HistoryPanel from '../ui/HistoryPanel';
import { WorkspaceTab, ReferenceAsset } from '../../types';

const TabBar = ({ tabs, activeTabId, onSelect, onAdd, onClose }: any) => {
  return (
    <div className="flex bg-slate-950 border-b border-slate-900 px-4 pt-2 gap-1 overflow-x-auto shrink-0 z-20">
       {tabs.map((tab: any) => (
         <div key={tab.id} onClick={() => onSelect(tab.id)} className={`group relative flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold cursor-pointer transition-all min-w-[120px] max-w-[200px] border-x border-t ${tab.id === activeTabId ? 'bg-slate-900 text-purple-400 border-slate-800 border-b-slate-900 -mb-px' : 'bg-slate-950 text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'}`}>
            <span className="truncate flex-1">{tab.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onClose(tab.id); }} className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${tab.id === activeTabId ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400'}`}><i className="fa-solid fa-times text-[10px]" /></button>
            {tab.id === activeTabId && <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-lg"></div>}
         </div>
       ))}
       <button onClick={onAdd} className="px-3 py-2 text-slate-500 hover:text-purple-400 transition-colors"><i className="fa-solid fa-plus" /></button>
    </div>
  );
};

export default function StudioLayout({ engine }: { engine: any }) {
  const [rightPanelWidth, setRightPanelWidth] = useState(() => parseInt(localStorage.getItem('mythic_right_width') || '320'));
  const [isResizingRight, setIsResizingRight] = useState(false);

  useEffect(() => { localStorage.setItem('mythic_right_width', String(rightPanelWidth)); }, [rightPanelWidth]);

  useEffect(() => {
     if (!isResizingRight) return;

     const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < 800) {
           setRightPanelWidth(newWidth);
        }
     };

     const handleMouseUp = () => {
        setIsResizingRight(false);
        document.body.style.cursor = '';
        document.body.classList.remove('select-none');
     };

     window.addEventListener('mousemove', handleMouseMove);
     window.addEventListener('mouseup', handleMouseUp);
     document.body.style.cursor = 'ew-resize';
     document.body.classList.add('select-none');
     
     return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.classList.remove('select-none');
     };
  }, [isResizingRight]);

  const renderCanvas = () => {
    if (engine.mode === 'resize') return <ResizeCanvas generatedImage={engine.generatedImage} resizeOriginalImage={engine.resizeOriginalImage} targetDimensions={engine.getTargetDimensions()} resizeZoom={engine.resizeZoom} setResizeZoom={engine.setResizeZoom} resizePan={engine.resizePan} setResizePan={engine.setResizePan} onAddFiles={engine.onAddResizeFiles} safeZone={engine.safeZone} setSafeZone={engine.setSafeZone} useCustomResBox={engine.useCustomResBox} customResBox={engine.customResBox} setCustomResBox={engine.setCustomResBox} isGenerating={engine.isGenerating} statusMessage={engine.statusMessage} />;
    if (engine.mode === 'bg-replace') return <BgReplaceCanvas generatedImage={engine.generatedImage} originalImage={engine.bgReplaceQueue.find((i: any) => i.id === engine.selectedBgReplaceId)?.url || null} onAddFiles={engine.onAddBgReplaceFiles} />;
    if (engine.mode === 'pixelize') return <PixelizeCanvas generatedImage={engine.generatedImage} originalImage={engine.pixelizeQueue.find((i: any) => i.id === engine.selectedPixelizeId)?.url || null} onAddFiles={engine.onAddPixelizeFiles} />;
    if (engine.mode === 'gacha') return <GachaCanvas assets={engine.gachaAssets} selectedAssetId={engine.selectedGachaAssetId} onSelectAsset={engine.setSelectedGachaAssetId} onGenerateAsset={engine.handleGenerate} onRegenerateBackground={engine.handleRegenerateBackground} onCancelGeneration={engine.handleCancel} traits={engine.characterTraits} onUpdateTraits={engine.setCharacterTraits} characterName={engine.characterName} onUpdateName={engine.setCharacterName} characterSubtitle={engine.characterSubtitle} onUpdateSubtitle={engine.setCharacterSubtitle} characterRarity={engine.characterRarity} onUpdateRarity={engine.setCharacterRarity} characterGender={engine.characterGender} onUpdateGender={engine.setCharacterGender} characterRace={engine.characterRace} onUpdateRace={engine.setCharacterRace} chibiProportions={engine.chibiProportions} onUpdateProportions={engine.onUpdateProportions} selectedStyleId={engine.selectedStyleId} onUpdateStyle={engine.setSelectedStyleId} onUpdateAsset={engine.updateGachaAsset} onRemoveAsset={engine.removeGachaAsset} onAddPreset={engine.addGachaAssetFromPreset} onAddSlot={engine.addGachaAsset} referenceAssets={engine.referenceAssets} setReferenceAssets={engine.setReferenceAssets} continuityFlags={engine.continuityFlags} onToggleContinuityFlag={(flag) => engine.setContinuityFlags((prev: any) => ({ ...prev, [flag]: !prev[flag] }))} onAddContinuityFlag={engine.addContinuityFlag} onRemoveContinuityFlag={engine.removeContinuityFlag} onRenameContinuityFlag={engine.renameContinuityFlag} onToggleReference={(url) => { const exists = engine.referenceAssets.find((r: any) => r.url === url); if (exists) engine.setReferenceAssets((p: any) => p.filter((r:any) => r.url !== url)); else engine.setReferenceAssets((p: any) => [{ id: Date.now().toString(), url, roleNote: 'Visual Master' }, ...p]); }} isGenerating={engine.isGenerating} isSuggesting={engine.isSuggesting} onSuggestTraits={engine.handleSuggestTraits} onAnalyzeStyle={engine.handleAnalyzeStyle} isAnalyzing={engine.isAnalyzing} onGenerateAll={engine.handleGenerateEntireSet} />;
    return <IllustrationCanvas generatedImage={engine.generatedImage} useCustomResBox={engine.useCustomResBox} customResBox={engine.customResBox} setCustomResBox={engine.setCustomResBox} isEditMode={engine.isEditMode} editRegion={engine.editRegion} setEditRegion={engine.setEditRegion} mode={engine.mode} aspectRatio={engine.selectedAspectRatio} customRes={engine.customRes} isPlaying={engine.isPlayingAnimation} currentFrameIndex={engine.animFrameIndex} totalFrames={engine.animConfig.frames.length} onionSkinImage={engine.showOnionSkin && engine.selectedFrameId && engine.mode === 'animation' && engine.animConfig.frames.findIndex((f:any) => f.id === engine.selectedFrameId) > 0 ? engine.animConfig.frames[engine.animConfig.frames.findIndex((f:any) => f.id === engine.selectedFrameId) - 1].imageUrl : null} safeZone={engine.safeZone} setSafeZone={engine.setSafeZone} onImageUpload={engine.handleImageUpload} onClearImage={engine.handleClearImage} sessionImages={engine.sessionImages} onSelectSessionImage={engine.setGeneratedImage} onGenerateMore={() => engine.handleGenerate(true)} onClearSession={engine.handleClearSession} onRemoveSessionImage={engine.handleRemoveSessionImage} isGenerating={engine.isGenerating} statusMessage={engine.statusMessage} characterTool={engine.characterTool} onCharacterLookClick={engine.handleCharacterLookClick} />;
  };

  const renderBottomPanel = () => {
    // Character Bible has all controls integrated into the Sheet Canvas, hide bottom bar.
    if (engine.mode === 'gacha') return null;
    
    if (engine.mode === 'animation') return <AnimationTimeline frames={engine.animConfig.frames} selectedFrameId={engine.selectedFrameId} onSelectFrame={engine.setSelectedFrameId} onAddFrame={engine.handleAddFrame} onUpdateFramePrompt={engine.handleUpdateFramePrompt} onDeleteFrame={engine.handleDeleteFrame} onDuplicateFrame={engine.handleDuplicateFrame} onGenerateFrame={engine.handleGenerateFrame} onGenerateAnimation={engine.handleGenerateAnimation} onClearFrames={engine.handleClearFrames} isGenerating={engine.isGenerating} onCancel={engine.handleCancel} isPlaying={engine.isPlayingAnimation} onTogglePlay={() => engine.setIsPlayingAnimation(!engine.isPlayingAnimation)} onUploadFrameImage={engine.handleFrameImageUpload} referenceAssets={engine.referenceAssets} setReferenceAssets={engine.setReferenceAssets} isAnalyzing={engine.isAnalyzing} onAnalyzeStyle={engine.handleAnalyzeStyle} handleCreateSpinAnimation={engine.handleCreateSpinAnimation} />;
    if (engine.mode === 'resize') return <ResizeBottomPanel queue={engine.resizeQueue} selectedId={engine.selectedResizeId} onSelect={engine.onSelectResizeItem} onRemove={engine.onRemoveResizeItem} onAddFiles={engine.onAddResizeFiles} onClearResult={engine.handleClearResizeResult} onRename={engine.handleResizeRename} prompt={engine.prompt} setPrompt={engine.setPrompt} isGenerating={engine.isGenerating} onGenerate={engine.handleGenerate} onGenerateAll={engine.handleGenerateAllResize} onExportAll={engine.handleExportAllResize} onCancel={engine.handleCancel} />;
    if (engine.mode === 'bg-replace') return <BgReplaceBottomPanel queue={engine.bgReplaceQueue} selectedId={engine.selectedBgReplaceId} onSelect={engine.onSelectBgReplaceItem} onRemove={engine.onRemoveBgReplaceItem} onAddFiles={engine.onAddBgReplaceFiles} onClearResult={engine.handleClearBgReplaceResult} onRename={engine.handleBgReplaceRename} prompt={engine.prompt} setPrompt={engine.setPrompt} isGenerating={engine.isGenerating} onGenerate={engine.handleGenerate} onGenerateAll={engine.handleGenerateAllBgReplace} onExportAll={engine.handleExportAllResize} onCancel={engine.handleCancel} />;
    if (engine.mode === 'pixelize') return <PixelizeBottomPanel queue={engine.pixelizeQueue} selectedId={engine.selectedPixelizeId} onSelect={engine.onSelectPixelizeItem} onRemove={engine.onRemovePixelizeItem} onAddFiles={engine.onAddPixelizeFiles} onClearResult={engine.handleClearPixelizeResult} onRename={engine.handlePixelizeRename} selectedStyle={engine.selectedPixelStyle} onSelectStyle={engine.setSelectedPixelStyle} isGenerating={engine.isGenerating} onGenerate={engine.handleGenerate} onGenerateAll={engine.handleGenerateAllPixelize} onExportAll={engine.handleExportAllResize} onCancel={engine.handleCancel} />;
    
    return <PromptPanel prompt={engine.prompt} setPrompt={engine.setPrompt} isGenerating={engine.isGenerating} onGenerate={engine.handleGenerate} onCancel={engine.handleCancel} gameContext={engine.gameContext} showInspiration={engine.showInspiration} setShowInspiration={engine.setShowInspiration} isSuggesting={engine.isSuggesting} referenceAssets={engine.referenceAssets} setReferenceAssets={engine.setReferenceAssets} onMatchReferenceSize={engine.handleMatchReferenceSize} isAnalyzing={engine.isAnalyzing} onAnalyzeStyle={engine.handleAnalyzeStyle} onRefinePrompt={engine.handleRefinePrompt} onUndoPrompt={engine.lastPrompt ? engine.handleUndoPrompt : undefined} mode={engine.mode} />;
  };

  const isGachaMode = engine.mode === 'gacha';
  const isUIReimagine = engine.mode === 'ui-reimagine';
  const isClothesDesigner = engine.mode === 'clothes';

  const renderRightPanel = () => {
    if (isUIReimagine) return <UIReimaginePanel {...engine} onOpenAssetPicker={() => engine.setShowAssetPicker(true)} onOpenCrop={() => engine.setShowCropModal(true)} />;
    if (isClothesDesigner) return <ClothesDesignerPanel {...engine} onOpenAssetPicker={() => engine.setShowAssetPicker(true)} onOpenCrop={() => engine.setShowCropModal(true)} />;
    return <RightPanel {...engine} onOpenAssetPicker={() => engine.setShowAssetPicker(true)} onOpenCrop={() => engine.setShowCropModal(true)} onClearResult={engine.handleClearResizeResult} onRegeneratePose={engine.handleRegeneratePose} />;
  };

  return (
    <>
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
         <AppHeader mode={engine.mode} title={engine.mode === 'resize' ? 'Magic Resizer' : engine.mode === 'clothes' ? 'Clothes Designer' : engine.mode === 'bg-replace' ? 'BG Replacer' : engine.mode === 'pixelize' ? 'Pixel Studio' : engine.mode} useProModel={engine.useProModel} apiKeyReady={engine.apiKeyReady} onConnect={engine.handleConnect} generatedImage={engine.generatedImage} onExport={() => engine.setShowExport(true)} onSaveToDrive={engine.handleSaveToDrive} isDriveConnected={engine.driveConnected} showConsole={engine.showConsole} setShowConsole={engine.setShowConsole} isSuggesting={engine.isSuggesting} />
         <TabBar tabs={engine.tabs} activeTabId={engine.activeTabId} onSelect={engine.handleSwitchTab} onAdd={engine.handleAddTab} onClose={engine.handleCloseTab} />
         <div className="flex-1 flex overflow-hidden relative bg-slate-900">
            {renderCanvas()}
         </div>
         <HistoryPanel isOpen={engine.showHistory} onClose={() => engine.setShowHistory(false)} history={engine.history} onRestore={engine.handleRestore} onRename={engine.handleRenameHistoryItem} onDelete={engine.handleDeleteHistoryItem} onClearAll={engine.handleClearHistory} />
         {renderBottomPanel()}
      </div>

      {!isGachaMode && !engine.isRightMinimized && (
         <div 
            onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }} 
            className="w-1.5 bg-slate-900 hover:bg-purple-600 cursor-ew-resize z-[510] transition-colors"
         />
      )}

      {!isGachaMode && (
         <div 
            className="transition-all duration-300 ease-in-out shrink-0 relative z-[500] overflow-visible" 
            style={{ width: engine.isRightMinimized ? '40px' : `${rightPanelWidth}px` }}
         >
            {renderRightPanel()}
         </div>
      )}
    </>
  );
}