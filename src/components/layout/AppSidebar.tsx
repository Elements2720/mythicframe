
import React from 'react';
import { UIMode } from '../../types';
import { MODE_CONFIG, CARD_TEMPLATES } from '../../constants';
import { useLanguage } from '../../i18n/LanguageContext';

interface AppSidebarProps {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  setShowHistory: (show: boolean) => void;
  showHistory: boolean;
  selectedTemplateId?: string;
  onTemplateSelect?: (id: string) => void;
  templateImage?: string | null;
  onTemplateUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`}></i>;

const AppSidebar: React.FC<AppSidebarProps> = ({
  mode, setMode, setShowHistory, showHistory,
  selectedTemplateId, onTemplateSelect, templateImage, onTemplateUpload
}) => {
  const { t } = useLanguage();
  
  const NavButton = ({ targetMode }: { targetMode: UIMode }) => (
    <button
      onClick={() => setMode(targetMode)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all mb-1 ${
        mode === targetMode 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <div className={`w-6 flex justify-center ${mode === targetMode ? 'text-white' : 'text-slate-500'}`}>
         <Icon name={MODE_CONFIG[targetMode].icon} />
      </div>
      <div className="font-medium text-sm">{t(targetMode as any)}</div>
    </button>
  );

  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'tutorials', 'clothes', 'bg-replace', 'pixelize'].includes(mode);

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-50">
      <div className="p-6">
        <h1 className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
          MYTHIC<span className="text-white">FRAME</span>
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">AI Game Asset Studio</p>
      </div>

      <div className="px-4 mb-6">
         <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-2">Project</div>
         <NavButton targetMode="dashboard" />
         <NavButton targetMode="library" />
         <NavButton targetMode="settings" />
         <NavButton targetMode="tutorials" />
      </div>

      <div className="px-4 mb-6">
         <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-2">Studio Tools</div>
         <NavButton targetMode="illustration" />
         <NavButton targetMode="clothes" />
         <NavButton targetMode="bg-replace" />
         <NavButton targetMode="pixelize" />
         <NavButton targetMode="resize" />
         <NavButton targetMode="background" />
         <NavButton targetMode="frame" />
         <NavButton targetMode="animation" />
         <NavButton targetMode="fullcard" />
      </div>

      {/* Sidebar Widgets (Only in Studio Modes) */}
      {isStudioMode && mode !== 'tutorials' && (
        <div className="mt-auto p-4 border-t border-slate-900 space-y-4 bg-slate-900/30">
           <button onClick={() => setShowHistory(!showHistory)} className={`w-full text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 py-2 rounded text-xs flex items-center justify-center gap-2 ${showHistory ? 'bg-slate-800 text-purple-400 border-purple-500/30' : 'bg-transparent'}`}>
              <Icon name="fa-clock-rotate-left" /> {t('recent_work')}
           </button>

          {mode === 'fullcard' && onTemplateSelect && (
             <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card Template</h3>
                <select 
                  value={selectedTemplateId} 
                  onChange={(e) => onTemplateSelect(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-purple-500"
                >
                   <option value="custom">Custom Upload</option>
                   {CARD_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                {selectedTemplateId === 'custom' && onTemplateUpload && (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-800 rounded-lg cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50 transition-colors bg-slate-900/50">
                    {templateImage ? (
                      <img src={templateImage} alt="Template" className="w-full h-full object-contain rounded-lg p-1" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <Icon name="fa-upload" />
                        <p className="text-[10px] mt-2 font-medium">Upload Image</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={onTemplateUpload} />
                  </label>
                )}
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppSidebar;
