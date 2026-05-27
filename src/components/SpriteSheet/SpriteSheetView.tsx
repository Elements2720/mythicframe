
import React from 'react';
import { SpriteSheetGrid } from './SpriteSheetGrid';
import { SpriteSheetControls } from './SpriteSheetControls';

interface SpriteSheetViewProps {
  engine: any;
}

export const SpriteSheetView: React.FC<SpriteSheetViewProps> = ({ engine }) => {
  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">Sprite Sheet Studio</h1>
              <p className="text-slate-400 max-w-2xl">
                Generate character poses and variations in a consistent grid. Define a global character prompt and customize each frame.
              </p>
            </header>

            <SpriteSheetGrid engine={engine} />
          </div>
        </div>
      </div>

      {/* Right Sidebar Controls */}
      <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
        <SpriteSheetControls engine={engine} />
      </div>
    </div>
  );
};
