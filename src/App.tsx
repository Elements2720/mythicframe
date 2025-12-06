
import React from 'react';
import { useAppEngine } from './hooks/useAppEngine';

// Modular Components
import AppSidebar from './components/layout/AppSidebar';
import { StudioLayout } from './components/layout/StudioLayout';
import ExportDialog from './components/ui/ExportDialog';
import ConsolePanel from './components/ui/ConsolePanel';
import AssetPicker from './components/ui/AssetPicker';
import CropModal from './components/ui/CropModal';
import FolderPickerModal from './components/ui/FolderPickerModal';

// Views
import Dashboard from './components/views/Dashboard';
import Library from './components/views/Library';
import Settings from './components/views/Settings';
import Tutorials from './components/views/Tutorials';

export default function App() {
  const engine = useAppEngine();

  // Resize is now part of the unified Studio Layout
  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace'].includes(engine.mode);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      
      <ExportDialog 
        isOpen={engine.showExport} 
        onClose={() => engine.setShowExport(false)} 
        currentEntry={engine.currentHistoryEntry}
        currentImage={engine.generatedImage}
        sessionImages={engine.sessionImages}
        mode={engine.mode}
      />

      <ConsolePanel
        isOpen={engine.showConsole}
        onClose={() => engine.setShowConsole(false)}
        logs={engine.consoleLogs}
      />

      <AssetPicker 
        isOpen={engine.showAssetPicker}
        onClose={() => engine.setShowAssetPicker(false)}
        history={engine.history}
        onSelect={engine.handleAssetSelect}
      />

      {engine.showFolderPicker && (
         <FolderPickerModal
             isOpen={engine.showFolderPicker}
             onClose={() => engine.setShowFolderPicker(false)}
             onSelect={engine.handleFolderSelect}
         />
      )}

      {engine.generatedImage && (
         <CropModal
            isOpen={engine.showCropModal}
            onClose={() => engine.setShowCropModal(false)}
            imageUrl={engine.generatedImage}
            targetSize={engine.customRes}
            onApply={engine.handleApplyCrop}
            initialCrop={engine.safeZone.enabled ? { x: engine.safeZone.x, y: engine.safeZone.y, width: engine.safeZone.width, height: engine.safeZone.height } : undefined}
         />
      )}

      <AppSidebar 
        mode={engine.mode}
        setMode={engine.setMode}
        showHistory={engine.showHistory}
        setShowHistory={engine.setShowHistory}
        selectedTemplateId={engine.selectedTemplateId}
        onTemplateSelect={engine.handleTemplateSelect}
        templateImage={engine.templateImage}
        onTemplateUpload={(e) => {
           const f = e.target.files?.[0];
           if(f) { const r = new FileReader(); r.onload = () => engine.setTemplateImage(r.result as string); r.readAsDataURL(f); }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {isStudioMode ? (
           <div className="flex h-full w-full">
               <StudioLayout engine={engine} />
           </div>
        ) : (
          /* PROJECT VIEWS */
          <>
             {engine.mode === 'dashboard' && <Dashboard history={engine.history} onNavigate={engine.setMode} />}
             {engine.mode === 'library' && <Library history={engine.history} onRestore={engine.handleRestore} />}
             {engine.mode === 'tutorials' && <Tutorials />}
             {engine.mode === 'settings' && (
               <Settings 
                  gameContext={engine.gameContext} 
                  setGameContext={engine.setGameContext} 
                  apiKeyReady={engine.apiKeyReady} 
                  onConnect={engine.handleConnect} 
                  onRefreshKey={engine.handleRefreshKey}
                  driveFolderId={engine.driveFolderId}
                  setDriveFolderId={engine.setDriveFolderId}
                  driveFolderName={engine.driveFolderName}
                  setDriveFolderName={engine.setDriveFolderName}
                  onOpenFolderPicker={() => engine.setShowFolderPicker(true)}
               />
             )}
          </>
        )}
      </div>

    </div>
  );
}
