import React, { useState, useEffect } from 'react';
import { UIMode } from '../../types';
import { MODE_CONFIG } from '../../constants';
import { useLanguage } from '../../i18n/LanguageContext';

interface AppSidebarProps {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  setShowHistory: (show: boolean) => void;
  showHistory: boolean;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => <i className={`fa-solid ${name} ${className}`}></i>;

const AppSidebar: React.FC<AppSidebarProps> = ({
  mode, setMode, setShowHistory, showHistory
}) => {
  const { t } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(() => localStorage.getItem('mythic_sidebar_minimized') === 'true');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    project: true,
    character: true,
    world: true,
    production: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    localStorage.setItem('mythic_sidebar_minimized', String(isMinimized));
  }, [isMinimized]);
  
  const NavButton = ({ targetMode }: { targetMode: UIMode }) => (
    <button
      onClick={() => setMode(targetMode)}
      title={isMinimized ? t(targetMode as any) : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all mb-1 ${
        mode === targetMode 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      } ${isMinimized ? 'justify-center px-0' : ''}`}
    >
      <div className={`w-6 flex justify-center ${mode === targetMode ? 'text-white' : 'text-slate-50'}`}>
         <Icon name={MODE_CONFIG[targetMode].icon} />
      </div>
      {!isMinimized && <div className="font-medium text-sm truncate">{t(targetMode as any)}</div>}
    </button>
  );

  const CategoryHeader = ({ label, section, icon }: { label: string, section: string, icon: string }) => {
    if (isMinimized) return <div className="h-px bg-slate-800 my-4 mx-2 opacity-30" />;
    
    const isExpanded = expandedSections[section];
    
    return (
      <button 
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between px-3 py-2 mb-2 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/50 rounded-lg transition-all group"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-400 group-hover:text-purple-400 transition-colors">
            <Icon name={icon} className="text-[10px]" />
          </div>
          <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.15em]">{label}</span>
        </div>
        <Icon 
          name={isExpanded ? "fa-chevron-down" : "fa-chevron-right"} 
          className={`text-[8px] text-slate-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} 
        />
      </button>
    );
  };

  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine', 'pose-studio', 'map-grid', 'sprite-sheet', 'batch'].includes(mode);

  return (
    <div className={`${isMinimized ? 'w-16' : 'w-64'} bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 transition-all duration-300 overflow-y-auto custom-scrollbar z-50`}>
      <div className={`p-6 ${isMinimized ? 'px-0 flex justify-center' : ''}`}>
        {!isMinimized ? (
          <>
            <h1 className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              MYTHIC<span className="text-white">FRAME</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">AI Game Asset Studio</p>
          </>
        ) : (
          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-xs">M</div>
        )}
      </div>

      <div className={`${isMinimized ? 'px-2' : 'px-4'} mb-4`}>
         <CategoryHeader label="Project" section="project" icon="fa-folder-tree" />
         {(expandedSections.project || isMinimized) && (
           <div className="space-y-0.5">
             <NavButton targetMode="dashboard" />
             <NavButton targetMode="library" />
             <NavButton targetMode="style-library" />
             <NavButton targetMode="downloads" />
             <NavButton targetMode="quota" />
             <NavButton targetMode="settings" />
             <NavButton targetMode="tutorials" />
           </div>
         )}
      </div>

      <div className={`${isMinimized ? 'px-2' : 'px-4'} mb-4`}>
         <CategoryHeader label="Character Studio" section="character" icon="fa-user-gear" />
         {(expandedSections.character || isMinimized) && (
           <div className="space-y-0.5">
             <NavButton targetMode="illustration" />
             <NavButton targetMode="sprite-sheet" />
             <NavButton targetMode="pose-studio" />
             <NavButton targetMode="gacha" />
             <NavButton targetMode="clothes" />
           </div>
         )}
      </div>

      <div className={`${isMinimized ? 'px-2' : 'px-4'} mb-4`}>
         <CategoryHeader label="World & UI" section="world" icon="fa-earth-americas" />
         {(expandedSections.world || isMinimized) && (
           <div className="space-y-0.5">
             <NavButton targetMode="background" />
             <NavButton targetMode="bg-replace" />
             <NavButton targetMode="frame" />
             <NavButton targetMode="ui-reimagine" />
             <NavButton targetMode="map-grid" />
           </div>
         )}
      </div>

      <div className={`${isMinimized ? 'px-2' : 'px-4'} mb-6`}>
         <CategoryHeader label="Production" section="production" icon="fa-wand-magic-sparkles" />
         {(expandedSections.production || isMinimized) && (
           <div className="space-y-0.5">
             <NavButton targetMode="pixelize" />
             <NavButton targetMode="resize" />
             <NavButton targetMode="animation" />
             <NavButton targetMode="batch" />
           </div>
         )}
      </div>

      <div className="mt-auto p-4 border-t border-slate-900 space-y-2 bg-slate-900/30">
         {isStudioMode && mode !== 'tutorials' && (
           <button 
             onClick={() => setShowHistory(!showHistory)} 
             className={`w-full text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 py-2 rounded text-xs flex items-center justify-center gap-2 ${showHistory ? 'bg-slate-800 text-purple-400 border-purple-500/30' : 'bg-transparent'} ${isMinimized ? 'px-0' : ''}`}
             title={t('recent_work')}
           >
              <Icon name="fa-clock-rotate-left" /> {!isMinimized && t('recent_work')}
           </button>
         )}
         <button 
           onClick={() => setIsMinimized(!isMinimized)}
           className="w-full text-slate-500 hover:text-white py-2 flex items-center justify-center transition-colors"
           title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
         >
           <i className={`fa-solid fa-chevron-${isMinimized ? 'right' : 'left'}`} />
         </button>
      </div>
    </div>
  );
};

export default AppSidebar;