
import { useState, useEffect } from 'react';
import { WorkspaceTab, UIMode } from '../types';
import { createNewTab, getHashMode } from '../utils/tabFactory';

export const useTabs = (defaultStyleId: string = 'none') => {
  const initialMode = getHashMode();
  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine', 'pose-studio', 'map-grid', 'sprite-sheet', 'batch'].includes(initialMode);
  
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
     createNewTab('1', 'Project 1', isStudioMode ? initialMode : 'illustration', defaultStyleId)
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [routeMode, setRouteMode] = useState<UIMode>(initialMode);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Sync all tabs when global style changes in settings
  useEffect(() => {
    if (defaultStyleId && defaultStyleId !== 'none') {
      setTabs(prev => prev.map(t => ({ ...t, selectedStyleId: defaultStyleId })));
    }
  }, [defaultStyleId]);

  const updateTabById = (id: string, updates: Partial<WorkspaceTab> | ((prev: WorkspaceTab) => Partial<WorkspaceTab>)) => {
    setTabs(prev => prev.map(t => {
        if (t.id === id) {
            const newValues = typeof updates === 'function' ? updates(t) : updates;
            return { ...t, ...newValues };
        }
        return t;
    }));
  };

  const updateActiveTab = (updates: Partial<WorkspaceTab> | ((prev: WorkspaceTab) => Partial<WorkspaceTab>)) => {
    updateTabById(activeTabId, updates);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const newMode = getHashMode();
      setRouteMode(newMode);
      const isStudio = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine', 'pose-studio', 'map-grid', 'sprite-sheet', 'batch'].includes(newMode);
      if (isStudio) {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, mode: newMode } : t));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTabId]);

  const setMode = (newMode: UIMode) => {
      window.location.hash = `/${newMode}`;
      setRouteMode(newMode);
      if (!['dashboard', 'library', 'downloads', 'style-library', 'settings', 'tutorials'].includes(newMode)) {
          updateActiveTab({ mode: newMode });
      }
  };

  const handleAddTab = (mode?: UIMode) => {
      const newId = Date.now().toString();
      const targetMode = (typeof mode === 'string') ? mode : activeTab.mode;
      const newTab = createNewTab(newId, `Character ${tabs.length + 1}`, targetMode, defaultStyleId);
      setTabs([...tabs, newTab]);
      setActiveTabId(newId);
  };

  const handleCloseTab = (id: string) => {
      if (tabs.length === 1) {
          if(confirm("Reset this project?")) {
             setTabs([createNewTab(id, 'Character 1', activeTab.mode, defaultStyleId)]);
          }
          return;
      }
      const newTabs = tabs.filter(t => t.id !== id);
      setTabs(newTabs);
      if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
  };

  const handleSwitchTab = (id: string) => setActiveTabId(id);
  const handleRenameTab = (id: string, name: string) => setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t));

  const effectiveMode = ['dashboard', 'library', 'downloads', 'style-library', 'settings', 'tutorials'].includes(routeMode) 
      ? routeMode 
      : activeTab.mode;

  return {
    tabs, activeTabId, activeTab, routeMode, effectiveMode, setMode,
    updateActiveTab, updateTabById, handleAddTab, handleCloseTab, handleSwitchTab, handleRenameTab
  };
};
