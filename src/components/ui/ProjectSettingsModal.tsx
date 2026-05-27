
import React from 'react';
import { GameContext, ArtStyle } from '../../types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameContext: GameContext;
  setGameContext: React.Dispatch<React.SetStateAction<GameContext>>;
  allArtStyles: ArtStyle[];
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, gameContext, setGameContext, allArtStyles }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
       <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-[500px] shadow-2xl overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100">
             <i className="fa-solid fa-book-open" /> Game Context (Narrative)
          </h2>
          <p className="text-sm text-slate-400 mb-4">Define your game world once, and MythicFrame will keep all art consistent with it.</p>
          
          <div className="space-y-4">
             <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Setting / World</label>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm h-20 text-slate-200 focus:border-purple-500 outline-none"
                  placeholder="e.g. A cozy alchemy shop in a medieval village. Wooden shelves, warm candlelight, bubbling potions."
                  value={gameContext.setting}
                  onChange={e => setGameContext(p => ({...p, setting: e.target.value}))}
                />
             </div>
             <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Tone / Mood</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none"
                  placeholder="e.g. Whimsical, warm, inviting, low-stakes."
                  value={gameContext.tone}
                  onChange={e => setGameContext(p => ({...p, tone: e.target.value}))}
                />
             </div>
             <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Visual Constraints</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none"
                  placeholder="e.g. No modern technology, no neon colors, hand-painted textures."
                  value={gameContext.visualConstraints}
                  onChange={e => setGameContext(p => ({...p, visualConstraints: e.target.value}))}
                />
             </div>
             <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Default Global Art Style</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none"
                  value={gameContext.defaultStyleId || 'none'}
                  onChange={e => setGameContext(p => ({...p, defaultStyleId: e.target.value}))}
                >
                  <option value="none">None (User Choice)</option>
                  {allArtStyles.map(style => (
                    <option key={style.id} value={style.id}>{style.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">New tabs will start with this style selected.</p>
             </div>
          </div>

          <div className="flex justify-end mt-6">
             <button onClick={onClose} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold text-sm">
                Save Context
             </button>
          </div>
       </div>
    </div>
  );
};

export default ProjectSettingsModal;
