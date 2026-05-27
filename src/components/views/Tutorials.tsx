
import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`} />;

const TutorialSection = ({ title, icon, children }: { title: string; icon: string; children?: React.ReactNode }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-10 shadow-2xl overflow-hidden relative">
    <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-6">
      <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-900/20">
        <i className={`fa-solid ${icon} text-2xl`} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">{title}</h2>
        <div className="h-1 w-12 bg-purple-500 rounded-full mt-1" />
      </div>
    </div>
    <div className="text-slate-300 space-y-6 leading-relaxed">
      {children}
    </div>
  </div>
);

const Step = ({ num, title, text }: { num: number; title: string; text: string }) => (
  <div className="flex gap-5 items-start group">
    <div className="w-8 h-8 rounded-xl bg-slate-950 text-purple-400 flex items-center justify-center text-sm font-black shrink-0 mt-1 border border-slate-800 shadow-xl group-hover:border-purple-500/50 transition-colors">
      {num}
    </div>
    <div className="space-y-1">
      <h4 className="font-black text-slate-100 text-sm uppercase tracking-widest">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
    </div>
  </div>
);

const MockButton = ({ label, icon, color = 'purple' }: any) => {
   const colors: any = {
     purple: 'bg-purple-600 border-purple-500',
     blue: 'bg-blue-600 border-blue-500',
     green: 'bg-green-600 border-green-500',
     slate: 'bg-slate-800 border-slate-700'
   };
   return (
     <div className={`px-3 py-1.5 rounded-lg ${colors[color]} text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-lg border border-white/10`}>
        {icon && <i className={`fa-solid ${icon}`} />} {label}
     </div>
   );
};

const Tutorials: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('getting_started');

  const tabs = [
    { id: 'getting_started', label: "Quick Start", icon: 'fa-rocket' },
    { id: 'essentials', label: "Studio Essentials", icon: 'fa-layer-group' },
    { id: 'illustration', label: "Illustration & Neo", icon: 'fa-paintbrush' },
    { id: 'gacha', label: "Character Bible", icon: 'fa-book-open' },
    { id: 'clothes', label: "Clothes Designer", icon: 'fa-shirt' },
    { id: 'resize', label: "Magic Resizer", icon: 'fa-expand' },
    { id: 'ui_reimagine', label: "UI Reimagine", icon: 'fa-window-restore' },
    { id: 'batch', label: "Batch Studio", icon: 'fa-boxes-stacked' },
    { id: 'animation', label: "Animation Studio", icon: 'fa-film' },
  ];

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-20">
        <div className="p-8 pb-4">
          <h1 className="text-xl font-black text-white flex items-center gap-3">
            <i className="fa-solid fa-graduation-cap text-purple-500" /> UNIVERSITY
          </h1>
          <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-[0.3em] opacity-50">MythicFrame v0.9.5</p>
        </div>
        <div className="p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-5 py-4 rounded-xl flex items-center gap-4 text-sm transition-all duration-300 ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-2xl shadow-purple-900/40 translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <i className={`fa-solid ${tab.icon} w-5 text-center text-base`} />
              <span className="font-bold tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Enforced solid background for flicker-free transitions */}
      <div className="flex-1 overflow-y-auto p-16 custom-scrollbar bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] relative">
        <div 
          key={activeTab} 
          className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-both"
        >
          
          {activeTab === 'getting_started' && (
            <TutorialSection title="System Initialization" icon="fa-rocket">
              <p>Welcome to MythicFrame. Our workstation allows you to synthesize production-ready game assets using the power of Google Gemini. Every generation is contextualized by your project's unique lore.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                 <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl border-l-4 border-l-amber-500">
                    <h3 className="font-black text-amber-500 mb-3 flex items-center gap-2 uppercase text-xs tracking-widest"><i className="fa-solid fa-key" /> Step 1: API Setup</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">Go to <b>Settings</b> and authorize your Gemini API Key. Use the <b>Pro Model</b> toggle in the sidebar for high-resolution 4K synthesis.</p>
                 </div>
                 <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl border-l-4 border-l-blue-500">
                    <h3 className="font-black text-blue-500 mb-3 flex items-center gap-2 uppercase text-xs tracking-widest"><i className="fa-solid fa-book" /> Step 2: Game Context</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">Enter your world's "Lore" in Settings. This context is automatically injected into every prompt to ensure visual consistency across the whole project.</p>
                 </div>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-black text-white mb-4 text-xs uppercase tracking-widest">Precision Input Controls</h3>
                  <p className="text-sm text-slate-300 mb-4">MythicFrame uses <b>Unity-style Input Sliders</b> for fine-tuning. Click and drag the label of any slider to change values.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                       <span className="text-[10px] font-black text-blue-400 uppercase block mb-1">Shift + Drag</span>
                       <span className="text-[11px] text-slate-400">Fast movement (10x speed).</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                       <span className="text-[10px] font-black text-purple-400 uppercase block mb-1">Alt + Drag</span>
                       <span className="text-[11px] text-slate-400">Precision tuning (0.1x speed).</span>
                    </div>
                  </div>
              </div>
            </TutorialSection>
          )}

          {activeTab === 'essentials' && (
            <TutorialSection title="Common Studio Systems" icon="fa-layer-group">
              <p>These features are shared across modes like Illustration, Gacha, and Clothes Designer. Mastering them ensures project-wide cohesion.</p>

              <div className="space-y-10 mt-8">
                 {/* References */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-3"><Icon name="fa-images text-purple-500" /> Reference Intelligence</h3>
                    <p className="text-sm text-slate-300">Upload images to guide the AI. Every reference can be assigned a specific <b>Role</b>:</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 shadow-lg">
                          <MockButton label="Mannequin" color="blue" icon="fa-user-check" />
                          <p className="text-[11px] text-slate-300 mt-3 italic leading-relaxed">Strictly locks facial structure, body type, and pose. The AI treats this as an immutable blueprint for the generation.</p>
                       </div>
                       <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 shadow-lg">
                          <MockButton label="Style Source" color="purple" icon="fa-palette" />
                          <p className="text-[11px] text-slate-300 mt-3 italic leading-relaxed">Extracts the brushwork, palette, and "vibe". Use this to replicate a specific artist's technique or color theory.</p>
                       </div>
                    </div>
                 </div>

                 {/* Backgrounds */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-3"><Icon name="fa-image text-green-500" /> Background Engine</h3>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center shadow-lg group hover:border-blue-500/50 transition-colors">
                          <span className="text-[11px] font-black uppercase text-blue-400 tracking-widest block mb-2">Scene</span>
                          <p className="text-[10px] text-slate-100 leading-relaxed font-bold">Full environmental depth, perspective, and lighting.</p>
                       </div>
                       <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center shadow-lg group hover:border-purple-500/50 transition-colors">
                          <span className="text-[11px] font-black uppercase text-purple-400 tracking-widest block mb-2">Pattern</span>
                          <p className="text-[10px] text-slate-100 leading-relaxed font-bold">Seamless UI textures, materials, and tileable motifs.</p>
                       </div>
                       <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center shadow-lg group hover:border-green-500/50 transition-colors">
                          <span className="text-[11px] font-black uppercase text-green-400 tracking-widest block mb-2">Neo Transparent</span>
                          <p className="text-[10px] text-slate-100 leading-relaxed font-bold">AI background removal with professional matting.</p>
                       </div>
                    </div>
                    <div className="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl shadow-inner mt-4">
                       <p className="text-xs text-indigo-100 font-bold italic leading-relaxed">
                          <i className="fa-solid fa-circle-info mr-2 text-indigo-400" />
                          Note: Neo Transparent mode generates the subject on a Chroma Key color (e.g. Magenta) and automatically cleans it up to ensure fonts and edges blend naturally with your game engine's backdrop.
                       </p>
                    </div>
                 </div>
              </div>
            </TutorialSection>
          )}

          {activeTab === 'illustration' && (
            <TutorialSection title="Illustration & Neo v2" icon="fa-paintbrush">
              <p>The primary art synthesis mode. Features advanced background removal and safe-zone composition.</p>
              
              <div className="space-y-6 my-8">
                 <Step num={1} title="Define Subject" text="Describe your character's gear, pose, and lighting in the bottom logic panel." />
                 <Step num={2} title="Style & Size" text="Select an Art Style from the Right Inspector and choose 1K, 2K, or 4K resolution." />
                 <Step num={3} title="Transparency (Optional)" text="To generate a character sprite, select 'Transparent Neo' in the Background settings." />
                 <Step num={4} title="Synthesis" text="Click 'Generate Illustration'. Results will appear in the session gallery at the top." />
              </div>

              <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-6 opacity-10"><Icon name="fa-wind text-7xl" /></div>
                 <h4 className="font-black text-purple-400 mb-4 text-[10px] uppercase tracking-widest">Neo v2: SteamSafe Cleanup</h4>
                 <p className="text-sm text-slate-400 leading-relaxed mb-6">Standard removal destroys translucent regions. **SteamSafe** washes out chroma bleed from semi-transparent regions like hair, smoke, and magical steam, allowing them to blend perfectly with any game background.</p>
                 <div className="flex gap-4">
                    <MockButton label="Enabled: SteamSafe" color="purple" icon="fa-check-circle" />
                    <div className="flex-1 h-2 bg-slate-800 rounded-full mt-3 overflow-hidden"><div className="h-full bg-purple-500 w-[85%]" /></div>
                 </div>
              </div>
            </TutorialSection>
          )}

          {activeTab === 'gacha' && (
             <TutorialSection title="The Character Bible" icon="fa-book-open">
                <p>Manage the visual consistency of a single character across multiple asset types (Splash Art, Dialogue Sprites, Chibi, etc.).</p>
                
                <div className="space-y-8 my-8">
                   <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl relative">
                      <h3 className="font-black text-white mb-3 text-xs uppercase tracking-widest flex items-center gap-2"><Icon name="fa-fingerprint text-blue-500" /> Physical Constants</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">The <b>Constants</b> field defines traits that NEVER change (Hair color, eye shape, armor materials). This logic is automatically injected into every slot in the bible.</p>
                   </div>

                   <div className="space-y-4">
                      <Step num={1} title="Identify Unit" text="Enter Name, Subtitle, Race, and Gender in the top bar. This metadata is saved with exports." />
                      <Step num={2} title="Populate Manifest" text="Click 'Add Preset' to create slots for Battle Sprites, Splash Art, or Dialogue poses." />
                      <Step num={3} title="Batch Generation" text="Click 'Sync Bible' to generate all assets simultaneously using the shared Physical Constants." />
                      <Step num={4} title="Visual Master" text="Found a perfect render? Click 'Set as Visual Master' to use it as a reference for all other slots." />
                   </div>
                </div>
             </TutorialSection>
          )}

          {activeTab === 'clothes' && (
            <TutorialSection title="Clothes Designer Studio" icon="fa-shirt">
              <p>Specialized workflow for generating garment assets or fitting outfits onto character mannequins.</p>
              
              <div className="grid grid-cols-2 gap-8 my-8">
                 <div className="space-y-4">
                    <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl">
                       <h4 className="font-black text-indigo-400 text-[10px] uppercase tracking-widest mb-1">Render: On Model</h4>
                       <p className="text-[10px] text-slate-300">Generates the outfit worn by a character. Use this to design the final look of your units.</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                       <h4 className="font-black text-slate-300 text-[10px] uppercase tracking-widest mb-1">Render: Ghost Asset</h4>
                       <p className="text-[10px] text-slate-400">Removes biological matter. Generates the clothing as if worn by an invisible void.</p>
                    </div>
                 </div>
                 <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
                    <Icon name="fa-scissors text-3xl text-indigo-500 mb-3" />
                    <h3 className="text-xs font-black uppercase text-white">Manual Extraction</h3>
                    <p className="text-[9px] text-slate-400 mt-2">Upload a portrait and use <b>Extract Garment</b> to programmatically remove the person inside.</p>
                 </div>
              </div>

              <div className="space-y-3">
                 <Step num={1} title="Select Layout" text="Choose 'Assembled' for a single view or 'Spread Sheet' for front/back/detail views." />
                 <Step num={2} title="Lock Pose" text="Use a mannequin reference and enable 'Lock Pose' to change outfits while keeping the stance identical." />
              </div>
            </TutorialSection>
          )}

          {activeTab === 'resize' && (
            <TutorialSection title="Magic Resizer (Outpainting)" icon="fa-expand">
              <p>Expand your artwork beyond its original borders. Magic Resizer turns a Portrait character into a Cinematic scene.</p>
              
              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative my-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Composition Logic</h4>
                       <Step num={1} title="Import" text="Add images to the Batch Queue." />
                       <Step num={2} title="Transform" text="Drag the image on the canvas to Pan. Scroll or use the slider to Zoom." />
                       <Step num={3} title="Synthesize" text="Click 'Generate Outpaint'. Gemini will fill the empty areas with matching art." />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center border-dashed">
                       <div className="flex flex-col items-center gap-4 opacity-40 scale-75">
                          <div className="w-32 h-32 border-2 border-blue-500 relative flex items-center justify-center">
                             <div className="w-16 h-16 bg-slate-700 rounded shadow-2xl" />
                             <Icon name="fa-up-down-left-right absolute -top-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Drag to Pan Source</span>
                       </div>
                    </div>
                 </div>
              </div>
            </TutorialSection>
          )}

          {activeTab === 'ui_reimagine' && (
             <TutorialSection title="UI Reimagine & HUD Layout" icon="fa-window-restore">
                <p>Overlay functional game interfaces on top of your artwork. Ideal for designing inventory screens or combat HUDs.</p>
                
                <div className="space-y-4 my-8">
                   <Step num={1} title="Choose Archetype" text="Select a framework like 'Classic RPG', 'Sci-Fi Terminal', or 'Mobile HUD'." />
                   <Step num={2} title="Set Material" text="Define the surface finish (e.g. Polished Metal, Glowing Hologram, Ornate Gold)." />
                   <Step num={3} title="Color Accent" text="Use the Color Mixer to set your game's Primary and Secondary UI colors." />
                </div>

                <div className="p-6 bg-purple-900/10 border border-purple-500/20 rounded-2xl border-l-4 border-l-purple-500">
                    <h3 className="font-black text-purple-400 text-[10px] uppercase tracking-widest mb-2">Advanced: Blend Artwork</h3>
                    <p className="text-xs text-slate-200 leading-relaxed italic font-medium">"If enabled, the AI will modify the underlying art style (lighting/colors) to perfectly match the interface's material and theme."</p>
                </div>
             </TutorialSection>
          )}

        </div>
      </div>
    </div>
  );
};

export default Tutorials;