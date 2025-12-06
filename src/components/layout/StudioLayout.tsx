
import React from 'react';
import AppHeader from './AppHeader';
import RightPanel from './RightPanel';
import PromptPanel from '../ui/PromptPanel';
import AnimationTimeline from '../ui/AnimationTimeline';
import ResizeBottomPanel from '../ui/ResizeBottomPanel';
import BgReplaceBottomPanel from '../ui/BgReplaceBottomPanel';
import IllustrationCanvas from '../canvas/IllustrationCanvas';
import FullCardCanvas from '../canvas/FullCardCanvas';
import ResizeCanvas from '../canvas/ResizeCanvas';
import BgReplaceCanvas from '../canvas/BgReplaceCanvas';
import HistoryPanel from '../ui/HistoryPanel';
import { WorkspaceTab } from '../../types';

// Tab Bar Component
const TabBar = ({ 
  tabs, 
  activeTabId, 
  onSelect, 
  onAdd, 
  onClose 
}: { 
  tabs: WorkspaceTab[], 
  activeTabId: string, 
  onSelect: (id: string) => void, 
  onAdd: () => void, 
  onClose: (id: string) => void 
}) => {
  return (
    <div className="flex bg-slate-950 border-b border-slate-900 px-4 pt-2 gap-1 overflow-x-auto shrink-0 z-20">
       {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div 
               key={tab.id} 
               onClick={() => onSelect(tab.id)}
               className={`
                  group relative flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold cursor-pointer transition-all min-w-[120px] max-w-[200px] border-x border-t
                  ${isActive 
                     ? 'bg-slate-900 text-purple-400 border-slate-800 border-b-slate-900 -mb-px' 
                     : 'bg-slate-950 text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'}
               `}
            >
               <span className="truncate flex-1">{tab.name}</span>
               <button 
                  onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                  className={`
                     w-4 h-4 rounded-full flex items-center justify-center transition-colors 
                     ${isActive ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400'}
                  `}
               >
                  <i className="fa-solid fa-times text-[10px]" />
               </button>
               {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-lg"></div>}
            </div>
          );
       })}
       <button 
          onClick={onAdd}
          className="px-3 py-2 text-slate-500 hover:text-purple-400 transition-colors"
          title="New Tab"
       >
          <i className="fa-solid fa-plus" />
       </button>
    </div>
  );
};

export const StudioLayout = ({ engine }: { engine: any }) => {
  
  // Helper to decide which canvas to render
  const renderCanvas = () => {
    if (engine.mode === 'fullcard') {
      return (
         <FullCardCanvas 
            ref={engine.fullCardRef}
            cardLayout={engine.cardLayout} 
            updateLayout={engine.updateLayout}
            selectedLayoutElement={engine.selectedLayoutElement}
            setSelectedLayoutElement={engine.setSelectedLayoutElement}
            generatedImage={engine.generatedImage}
            templateImage={engine.templateImage}
            cardName={engine.cardName}
            cardMana={engine.cardMana}
            cardEffects={engine.cardEffects}
            cardType={engine.cardType}
         />
      );
    } else if (engine.mode === 'resize') {
      return (
         <ResizeCanvas
            generatedImage={engine.generatedImage}
            resizeOriginalImage={engine.resizeOriginalImage}
            targetDimensions={engine.getTargetDimensions()}
            resizeZoom={engine.resizeZoom}
            setResizeZoom={engine.setResizeZoom}
            resizePan={engine.resizePan}
            setResizePan={engine.setResizePan}
            onAddFiles={engine.onAddResizeFiles}
            safeZone={engine.safeZone}
            setSafeZone={engine.setSafeZone}
            useCustomResBox={engine.useCustomResBox}
            customResBox={engine.customResBox}
            setCustomResBox={engine.setCustomResBox}
         />
      );
    } else if (engine.mode === 'bg-replace') {
      return (
         <BgReplaceCanvas
            generatedImage={engine.generatedImage}
            originalImage={engine.bgReplaceQueue.find((i: any) => i.id === engine.selectedBgReplaceId)?.url || null}
            onAddFiles={engine.onAddBgReplaceFiles}
         />
      );
    } else {
      return (
         <IllustrationCanvas 
            generatedImage={engine.generatedImage}
            showOverlays={engine.showOverlays}
            cardName={engine.cardName}
            cardEffects={engine.cardEffects}
            useCustomResBox={engine.useCustomResBox}
            customResBox={engine.customResBox}
            setCustomResBox={engine.setCustomResBox}
            isEditMode={engine.isEditMode}
            editRegion={engine.editRegion}
            setEditRegion={engine.setEditRegion}
            mode={engine.mode}
            aspectRatio={engine.selectedAspectRatio}
            customRes={engine.customRes}
            isPlaying={engine.isPlayingAnimation}
            currentFrameIndex={engine.animFrameIndex}
            totalFrames={engine.animConfig.frames.length}
            onionSkinImage={engine.showOnionSkin && engine.selectedFrameId && engine.mode === 'animation' && engine.animConfig.frames.findIndex((f:any) => f.id === engine.selectedFrameId) > 0 ? engine.animConfig.frames[engine.animConfig.frames.findIndex((f:any) => f.id === engine.selectedFrameId) - 1].imageUrl : null}
            safeZone={engine.safeZone}
            setSafeZone={engine.setSafeZone}
            onImageUpload={engine.handleImageUpload}
            onClearImage={engine.handleClearImage}
            sessionImages={engine.sessionImages}
            onSelectSessionImage={engine.setGeneratedImage}
            onGenerateMore={() => engine.handleGenerate(true)} // Pass true for append
            onClearSession={engine.handleClearSession}
            onRemoveSessionImage={engine.handleRemoveSessionImage}
            isGenerating={engine.isGenerating}
            characterTool={engine.characterTool}
            onCharacterLookClick={engine.handleCharacterLookClick}
         />
      );
    }
  };

  const renderBottomPanel = () => {
    if (engine.mode === 'animation') {
      return (
        <AnimationTimeline 
           frames={engine.animConfig.frames}
           selectedFrameId={engine.selectedFrameId}
           onSelectFrame={engine.setSelectedFrameId}
           onAddFrame={engine.handleAddFrame}
           onUpdateFramePrompt={engine.handleUpdateFramePrompt}
           onDeleteFrame={engine.handleDeleteFrame}
           onDuplicateFrame={engine.handleDuplicateFrame}
           onGenerateFrame={engine.handleGenerateFrame}
           onGenerateAnimation={engine.handleGenerateAnimation}
           onClearFrames={engine.handleClearFrames}
           isGenerating={engine.isGenerating}
           onCancel={engine.handleCancel}
           isPlaying={engine.isPlayingAnimation}
           onTogglePlay={() => engine.setIsPlayingAnimation(!engine.isPlayingAnimation)}
           onUploadFrameImage={engine.handleFrameImageUpload}
           referenceAssets={engine.referenceAssets}
           setReferenceAssets={engine.setReferenceAssets}
           isAnalyzing={engine.isAnalyzing}
           onAnalyzeStyle={engine.handleAnalyzeStyle}
           handleCreateSpinAnimation={engine.handleCreateSpinAnimation}
        />
      );
    } else if (engine.mode === 'resize') {
       return (
          <ResizeBottomPanel 
             queue={engine.resizeQueue}
             selectedId={engine.selectedResizeId}
             onSelect={engine.onSelectResizeItem}
             onRemove={engine.onRemoveResizeItem}
             onAddFiles={engine.onAddResizeFiles}
             onClearResult={engine.handleClearResizeResult}
             onRename={engine.handleResizeRename}
             prompt={engine.prompt}
             setPrompt={engine.setPrompt}
             isGenerating={engine.isGenerating}
             onGenerate={engine.handleGenerate}
             onGenerateAll={engine.handleGenerateAll}
             onExportAll={engine.handleExportAllResize}
             onCancel={engine.handleCancel}
          />
       );
    } else if (engine.mode === 'bg-replace') {
       return (
          <BgReplaceBottomPanel
             queue={engine.bgReplaceQueue}
             selectedId={engine.selectedBgReplaceId}
             onSelect={engine.onSelectBgReplaceItem}
             onRemove={engine.onRemoveBgReplaceItem}
             onAddFiles={engine.onAddBgReplaceFiles}
             onClearResult={engine.handleClearBgReplaceResult}
             onRename={engine.handleBgReplaceRename}
             prompt={engine.prompt} // Global prompt synced to selected item
             setPrompt={(val) => { 
                 engine.setPrompt(val); 
                 // Since setPrompt updates main state, the hook effect will sync it to the item
             }}
             isGenerating={engine.isGenerating}
             onGenerate={engine.handleGenerate}
             onGenerateAll={engine.handleGenerateAllBgReplace}
             onExportAll={engine.handleExportAllResize} // Reusing export logic (same struct)
             onCancel={engine.handleCancel}
          />
       );
    } else {
      return (
        <PromptPanel 
           prompt={engine.prompt} 
           setPrompt={engine.setPrompt} 
           isGenerating={engine.isGenerating} 
           onGenerate={engine.handleGenerate}
           onCancel={engine.handleCancel}
           gameContext={engine.gameContext}
           showInspiration={engine.showInspiration}
           setShowInspiration={engine.setShowInspiration}
           isSuggesting={engine.isSuggesting}
           referenceAssets={engine.referenceAssets}
           setReferenceAssets={engine.setReferenceAssets}
           onMatchReferenceSize={engine.handleMatchReferenceSize}
           isAnalyzing={engine.isAnalyzing}
           onAnalyzeStyle={engine.handleAnalyzeStyle}
           onRefinePrompt={engine.handleRefinePrompt}
           onUndoPrompt={engine.lastPrompt ? engine.handleUndoPrompt : undefined}
           mode={engine.mode}
        />
      );
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
         <AppHeader 
             mode={engine.mode}
             title={engine.mode === 'resize' ? 'Magic Resizer' : engine.mode === 'clothes' ? 'Clothes Designer' : engine.mode === 'bg-replace' ? 'BG Replacer' : engine.mode} 
             useProModel={engine.useProModel}
             apiKeyReady={engine.apiKeyReady}
             onConnect={engine.handleConnect}
             generatedImage={engine.generatedImage}
             onExport={() => engine.setShowExport(true)}
             onSaveToDrive={engine.handleSaveToDrive}
             isDriveConnected={engine.driveConnected}
             showConsole={engine.showConsole}
             setShowConsole={engine.setShowConsole}
             isSuggesting={engine.isSuggesting}
             onSuggest={engine.handleCardSuggestions}
             onCompositeExport={engine.handleCompositeExport}
             onSetTemplate={engine.handleSetAsTemplate}
             onUseInLayout={engine.handleUseInLayout}
             onSaveCard={engine.handleSaveCard}
         />

         {/* Workspace Tabs */}
         <TabBar 
            tabs={engine.tabs} 
            activeTabId={engine.activeTabId} 
            onSelect={engine.handleSwitchTab} 
            onAdd={engine.handleAddTab} 
            onClose={engine.handleCloseTab} 
         />

         {/* Canvas Area */}
         {/* Increased padding-bottom to ensure canvas scrollability above the floating panel */}
         <div className="flex-1 flex overflow-hidden pb-[400px] relative bg-slate-900">
            {renderCanvas()}
         </div>

         <HistoryPanel 
            isOpen={engine.showHistory} 
            onClose={() => engine.setShowHistory(false)} 
            history={engine.history} 
            onRestore={engine.handleRestore}
            onRename={engine.handleRenameHistoryItem}
            onDelete={engine.handleDeleteHistoryItem}
            onClearAll={engine.handleClearHistory}
         />

         {renderBottomPanel()}
      </div>

      <RightPanel 
         {...engine}
         onOpenAssetPicker={() => engine.setShowAssetPicker(true)}
         onOpenCrop={() => engine.setShowCropModal(true)}
         onClearResult={engine.handleClearResizeResult}
         onRegeneratePose={engine.handleRegeneratePose}
      />
    </>
  );
};
