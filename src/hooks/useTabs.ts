
import { useState, useEffect } from 'react';
import { WorkspaceTab, UIMode } from '../types';
import { createNewTab, getHashMode } from '../utils/tabFactory';

export const useTabs = () => {
  const initialMode = getHashMode();
  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize'].includes(initialMode);
  
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
     createNewTab('1', 'Project 1', isStudioMode ? initialMode : 'illustration')
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [routeMode, setRouteMode] = useState<UIMode>(initialMode);

  // Derived Active Tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Helper to update active tab state
  const updateActiveTab = (updates: Partial<WorkspaceTab> | ((prev: WorkspaceTab) => Partial<WorkspaceTab>)) => {
    setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
            const newValues = typeof updates === 'function' ? updates(t) : updates;
            return { ...t, ...newValues };
        }
        return t;
    }));
  };

  // Sync Hash to Route Mode
  useEffect(() => {
    const handleHashChange = () => {
      const newMode = getHashMode();
      setRouteMode(newMode);
      
      const isStudio = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize'].includes(newMode);
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
      
      const isNavMode = ['dashboard', 'library', 'settings', 'tutorials'].includes(newMode);
      if (!isNavMode) {
          updateActiveTab({ mode: newMode });
      }
  };

  const handleAddTab = () => {
      const newId = Date.now().toString();
      const newTab = createNewTab(newId, `Project ${tabs.length + 1}`, 'illustration');
      setTabs([...tabs, newTab]);
      setActiveTabId(newId);
  };

  const handleCloseTab = (id: string) => {
      if (tabs.length === 1) {
          if(confirm("Reset this project?")) {
             setTabs([createNewTab(id, 'Project 1', 'illustration')]);
          }
          return;
      }
      const newTabs = tabs.filter(t => t.id !== id);
      setTabs(newTabs);
      if (activeTabId === id) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
      }
  };

  const handleSwitchTab = (id: string) => {
      setActiveTabId(id);
  };

  const handleRenameTab = (id: string, name: string) => {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  };

  const effectiveMode = ['dashboard', 'library', 'settings', 'tutorials'].includes(routeMode) 
      ? routeMode 
      : activeTab.mode;

  return {
    tabs,
    activeTabId,
    activeTab,
    routeMode,
    effectiveMode,
    setMode,
    updateActiveTab,
    handleAddTab,
    handleCloseTab,
    handleSwitchTab,
    handleRenameTab
  };
};
