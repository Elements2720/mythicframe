
import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const TutorialSection = ({ title, icon, children }: { title: string; icon: string; children?: React.ReactNode }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8 animate-in fade-in slide-in-from-bottom-2">
    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-purple-400">
        <i className={`fa-solid ${icon} text-xl`} />
      </div>
      <h2 className="text-xl font-bold text-slate-200">{title}</h2>
    </div>
    <div className="text-slate-300 space-y-4 leading-relaxed">
      {children}
    </div>
  </div>
);

const Step = ({ num, text }: { num: number; text: string }) => (
  <div className="flex gap-4 items-start">
    <div className="w-6 h-6 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-purple-500/30">
      {num}
    </div>
    <p>{text}</p>
  </div>
);

// --- CSS UI SIMULATIONS (Mockups) ---

const MockButton = ({ label, icon, color='purple' }: any) => (
   <div className={`px-2 py-1 rounded bg-${color}-600 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-sm`}>
      {icon && <i className={`fa-solid ${icon}`} />} {label}
   </div>
);

const MockCanvas = ({ label }: any) => (
   <div className="bg-black rounded-lg border border-slate-800 aspect-video flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
      <div className="text-slate-600 text-xs font-mono">{label}</div>
   </div>
);

const Tutorials: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('getting_started');

  const tabs = [
    { id: 'getting_started', label: t('tut_getting_started'), icon: 'fa-rocket' },
    { id: 'illustration', label: t('tut_illustration'), icon: 'fa-paintbrush' },
    { id: 'gacha', label: t('tut_gacha'), icon: 'fa-person-rays' },
    { id: 'frame', label: t('tut_frame'), icon: 'fa-border-all' },
    { id: 'background', label: t('tut_background'), icon: 'fa-image' },
    { id: 'animation', label: t('tut_animation'), icon: 'fa-film' },
    { id: 'fullcard', label: t('tut_fullcard'), icon: 'fa-pen-ruler' },
    { id: 'resize', label: t('tut_resize'), icon: 'fa-expand' },
  ];

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-6 pb-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-graduation-cap text-purple-500" /> {t('tutorials')}
          </h1>
          <p className="text-xs text-slate-500 mt-2">Master the MythicFrame workflow.</p>
        </div>
        <div className="p-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm transition-colors ${activeTab === tab.id ? 'bg-purple-900/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <i className={`fa-solid ${tab.icon} w-5 text-center`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          {activeTab === 'getting_started' && (
            <TutorialSection title={t('tut_getting_started')} icon="fa-rocket">
              <div className="p-6 bg-slate-950 rounded border border-slate-800 mb-6">
                 <h3 className="font-bold text-white mb-2">1. Connect API</h3>
                 <p className="text-sm text-slate-400 mb-4">Go to Settings to connect. Green indicates you are ready.</p>
                 <div className="flex gap-4">
                     <div className="px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 border bg-green-900/20 text-green-400 border-green-500/30">
                        <i className="fa-solid fa-check-circle" /> Connected
                     </div>
                     <div className="px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 border bg-red-900/20 text-red-400 border-red-500/30 opacity-50">
                        <i className="fa-solid fa-times-circle" /> Not Connected
                     </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-950 rounded border border-slate-800 mb-6">
                 <h3 className="font-bold text-white mb-2">2. Define Game Context</h3>
                 <p className="text-sm text-slate-400 mb-4">
                    In Settings, the "Game Context" is your global style guide.
                    <br/>Example: <em>"A dark fantasy world overrun by crystals."</em>
                 </p>
                 <div className="bg-slate-900 p-3 rounded border border-slate-700 text-xs font-mono text-blue-300">
                    SETTING: Dark Fantasy World...<br/>
                    TONE: Gritty, Dangerous...<br/>
                    CONSTRAINTS: No sci-fi tech...
                 </div>
              </div>
            </TutorialSection>
          )}

          {activeTab === 'illustration' && (
             <TutorialSection title={t('tut_illustration')} icon="fa-paintbrush">
                <p>Generate characters, items, and scenes. This is the core art creation tool.</p>
                
                <div className="grid grid-cols-2 gap-4 my-6">
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="font-bold text-purple-400 mb-3 text-sm uppercase">Bottom Panel: Prompting</h4>
                      <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-400 italic mb-2">
                         "A heroic knight standing in a shop..."
                      </div>
                      <div className="flex justify-end">
                         <MockButton label="Generate" icon="fa-wand-magic-sparkles" />
                      </div>
                   </div>
                   
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="font-bold text-blue-400 mb-3 text-sm uppercase">Reference Images</h4>
                      <div className="flex gap-2 mb-2">
                         <div className="w-10 h-10 bg-slate-800 rounded border border-slate-700"></div>
                         <div className="w-10 h-10 bg-slate-800 rounded border border-slate-700"></div>
                         <div className="w-10 h-10 border border-dashed border-slate-600 rounded flex items-center justify-center text-slate-600"><i className="fa-solid fa-plus"/></div>
                      </div>
                      <p className="text-[10px] text-slate-500">Upload images here to guide the style.</p>
                   </div>
                </div>

                <div className="bg-slate-950 p-4 rounded border border-slate-800 mb-6">
                    <h3 className="font-bold text-white mb-2">Safe Zone Tool</h3>
                    <p className="text-sm text-slate-400 mb-4">Toggle "Safe Zone" in the right panel to see a green box overlay. This ensures your subject stays centered for card cropping.</p>
                    <div className="relative h-32 bg-black rounded border border-slate-700 overflow-hidden w-64 mx-auto">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-16 h-16 rounded-full bg-slate-800"></div>
                        </div>
                        <div className="absolute top-2 left-2 right-2 bottom-2 border-2 border-green-500/50 flex items-start p-1">
                           <span className="text-[8px] bg-green-500 text-white px-1 rounded">SAFE ZONE</span>
                        </div>
                    </div>
                </div>
             </TutorialSection>
          )}

          {activeTab === 'gacha' && (
             <TutorialSection title={t('tut_gacha')} icon="fa-person-rays">
                <p>The **Character Bible** allows you to build a cohesive set of assets for one character while maintaining visual consistency.</p>
                
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 my-6">
                   <h3 className="font-bold text-blue-400 mb-2 uppercase tracking-widest text-sm">Visual Continuity Workflow</h3>
                   <div className="space-y-4 mt-4">
                      <Step num={1} text="Define the constant Visual Traits in the bottom panel (e.g., hair color, armor style)." />
                      <Step num={2} text="Add 'Asset Slots' for each specific art type you need (Card Art, Battle Sprite, etc)." />
                      <Step num={3} text="Customize the resolution and prompt suffix for each slot." />
                      <Step num={4} text="Use 'Generate Entire Set' to batch render the whole character bible." />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <h4 className="font-bold text-white text-sm mb-2"><i className="fa-solid fa-id-badge text-blue-500 mr-2"/> Metadata</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Set the character's Name, Rarity, and Gender. These are used to label your exports and help organize your project library.</p>
                   </div>
                   <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <h4 className="font-bold text-white text-sm mb-2"><i className="fa-solid fa-wand-magic-sparkles text-blue-500 mr-2"/> Sync Style</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Upload style references in the bottom panel. Click 'Sync Style' to ensure all generated assets share the same rendering technique.</p>
                   </div>
                </div>
             </TutorialSection>
          )}

          {activeTab === 'frame' && (
             <TutorialSection title={t('tut_frame')} icon="fa-border-all">
                <p>Create UI borders and card frames. The center is kept blank for your artwork.</p>
                
                <div className="bg-slate-950 p-6 rounded border border-slate-800 my-6 flex gap-6 items-center">
                   <div className="flex-1">
                      <h3 className="font-bold text-white mb-2">Batch Generation</h3>
                      <p className="text-sm text-slate-400 mb-3">Use the slider in the right panel to generate up to 4 variations at once.</p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-700 w-full">
                          <div className="text-[10px] text-slate-500 mb-1">BATCH COUNT: 4</div>
                          <div className="h-1 bg-purple-600 w-full rounded"></div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <div className="w-12 h-16 border-2 border-purple-500 bg-slate-900 rounded"></div>
                      <div className="w-12 h-16 border border-slate-700 bg-slate-900 rounded opacity-50"></div>
                      <div className="w-12 h-16 border border-slate-700 bg-slate-900 rounded opacity-50"></div>
                   </div>
                </div>
             </TutorialSection>
          )}

          {activeTab === 'animation' && (
             <TutorialSection title={t('tut_animation')} icon="fa-film">
                <p>Create frame-by-frame animations for sprites or moving backgrounds.</p>
                
                <div className="bg-slate-950 p-4 rounded border border-slate-800 my-6">
                   <h3 className="font-bold text-white mb-4">The Timeline</h3>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                       <div className="w-20 h-16 bg-slate-900 border-2 border-purple-500 rounded relative">
                          <div className="absolute bottom-0 left-0 bg-purple-600 text-[8px] text-white px-1">1</div>
                       </div>
                       <div className="w-20 h-16 bg-slate-900 border border-slate-700 rounded relative">
                          <div className="absolute bottom-0 left-0 bg-slate-700 text-[8px] text-white px-1">2</div>
                       </div>
                       <div className="w-20 h-16 border-2 border-dashed border-slate-700 rounded flex items-center justify-center text-slate-600">
                          <i className="fa-solid fa-plus" />
                       </div>
                   </div>
                   <p className="text-xs text-slate-400 mt-2">Click frames to edit prompts. Use "Generate All" to render the sequence.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="font-bold text-white text-sm mb-2"><i className="fa-solid fa-layer-group text-slate-500 mr-2"/> Onion Skin</h4>
                      <p className="text-xs text-slate-400">Toggle "Onion Skin" in the right panel to see a ghost of the previous frame overlaid on the canvas.</p>
                   </div>
                   <div className="bg-slate-950 p-4 rounded border border-slate-800">
                      <h4 className="font-bold text-white text-sm mb-2"><i className="fa-solid fa-images text-slate-500 mr-2"/> Consistency</h4>
                      <p className="text-xs text-slate-400">Open the "References" panel above the timeline. Add your character sheet here so every frame looks like the same character.</p>
                   </div>
                </div>
             </TutorialSection>
          )}

          {activeTab === 'resize' && (
             <TutorialSection title={t('tut_resize')} icon="fa-expand">
                <p>Change the aspect ratio of an existing image without cropping it. The AI "paints" the missing areas.</p>
                
                <div className="relative bg-black p-8 rounded-lg border border-slate-800 my-6 flex items-center justify-center overflow-hidden">
                    {/* Simulated Workspace */}
                    <div className="relative w-64 h-48 bg-slate-900 border border-slate-700">
                       <div className="absolute inset-0 flex items-center justify-center">
                          {/* Inner Image */}
                          <div className="w-32 h-32 bg-slate-700 border border-slate-500"></div>
                       </div>
                       <div className="absolute inset-0 border-2 border-dashed border-purple-500/50"></div>
                       <div className="absolute top-2 left-2 bg-purple-600 text-white text-[8px] px-1 rounded">OUTPUT AREA</div>
                    </div>
                </div>

                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                   <h3 className="font-bold text-white mb-2">Workflow</h3>
                   <Step num={1} text="Upload an image to the Queue on the left." />
                   <Step num={2} text="Select a Target Ratio (e.g. 16:9) in the bottom panel." />
                   <Step num={3} text="Zoom/Pan your image to fit inside the new frame." />
                   <Step num={4} text="Click Generate to fill the empty space." />
                </div>
             </TutorialSection>
          )}

        </div>
      </div>
    </div>
  );
};

export default Tutorials;
