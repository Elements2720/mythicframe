
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, RefreshCw, Download, Image as ImageIcon, Wand2, Settings2 } from 'lucide-react';
import { SpriteSheetFrame } from '../../types';

interface SpriteSheetGridProps {
  engine: any;
}

export const SpriteSheetGrid: React.FC<SpriteSheetGridProps> = ({ engine }) => {
  const { 
    spriteSheet, 
    updateFrame, 
    removeFrame, 
    addFrame,
    handleGenerateSpriteSheet,
    isGenerating
  } = engine;

  const frames = spriteSheet.frames;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence mode="popLayout">
        {frames.map((frame: SpriteSheetFrame, index: number) => (
          <motion.div
            key={frame.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-purple-500/50 transition-colors"
          >
            {/* Image Area */}
            <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
              {frame.url ? (
                <img 
                  src={frame.url} 
                  alt={frame.prompt}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-slate-600">
                  <ImageIcon size={48} strokeWidth={1} />
                  <button
                    onClick={() => handleGenerateSpriteSheet(frame.id)}
                    disabled={isGenerating || frame.status === 'processing'}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Wand2 size={14} />
                    Generate Frame
                  </button>
                </div>
              )}

              {/* Status Overlay */}
              {frame.status === 'processing' && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                    <span className="text-xs font-medium text-purple-400">Generating...</span>
                  </div>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeFrame(frame.id)}
                  className="p-2 bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 hover:border-red-500/50 shadow-xl transition-all"
                  title="Remove Frame"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => handleGenerateSpriteSheet(frame.id)}
                  disabled={isGenerating || frame.status === 'processing'}
                  className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-xl transition-all disabled:opacity-50"
                  title="Regenerate Frame"
                >
                  <RefreshCw size={16} className={frame.status === 'processing' ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frame {index + 1}</span>
                <div className="flex items-center gap-2">
                   {frame.url && (
                     <a 
                       href={frame.url} 
                       download={`sprite-frame-${index+1}.png`}
                       className="p-1.5 text-slate-400 hover:text-white transition-colors"
                     >
                       <Download size={14} />
                     </a>
                   )}
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={frame.prompt}
                  onChange={(e) => updateFrame(frame.id, { prompt: e.target.value })}
                  placeholder="Pose or variation prompt..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none h-20 custom-scrollbar"
                />

                <div className="flex items-center gap-2">
                  <select
                    value={frame.bgConfig.mode}
                    onChange={(e) => updateFrame(frame.id, { bgConfig: { ...frame.bgConfig, mode: e.target.value as any } })}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none"
                  >
                    <option value="transparent">Transparent</option>
                    <option value="transparent_neo">Transparent (Neo)</option>
                    <option value="scene">Scene</option>
                    <option value="solid">Solid</option>
                  </select>
                  {frame.bgConfig.mode === 'scene' && (
                    <input
                      type="text"
                      value={frame.bgConfig.promptFragment || ''}
                      onChange={(e) => updateFrame(frame.id, { bgConfig: { ...frame.bgConfig, promptFragment: e.target.value } })}
                      placeholder="BG details..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-purple-500/50"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Frame Button */}
        <motion.button
          layout
          onClick={() => addFrame()}
          className="flex flex-col items-center justify-center gap-4 aspect-square bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
        >
          <div className="p-4 bg-slate-800 rounded-full group-hover:bg-purple-500/20 transition-colors">
            <Plus size={32} />
          </div>
          <span className="text-sm font-medium">Add New Frame</span>
        </motion.button>
      </AnimatePresence>
    </div>
  );
};
