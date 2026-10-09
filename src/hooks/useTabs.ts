import { useState, useEffect, useRef } from 'react';
import { WorkspaceTab, UIMode } from '../types';
import { createNewTab, getHashMode } from '../utils/tabFactory';
import { saveWorkspaceSession, getWorkspaceSession } from '../services/historyService';

const WORKSPACE_STORAGE_KEY = 'mythic_workspace_tabs_light';

export const useTabs = (defaultStyleId: string = 'none') => {
  const initialMode = getHashMode();
  const isStudioMode = ['illustration', 'frame', 'background', 'fullcard', 'animation', 'resize', 'clothes', 'bg-replace', 'pixelize', 'gacha', 'ui-reimagine', 'pose-studio', 'map-grid', 'sprite-sheet', 'batch'].includes(initialMode);
  
  // Fast initial hydration from localStorage cache
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            return parsed.tabs.map((t: any) => ({
              ...createNewTab(t.id, t.name, t.mode || (isStudioMode ? initialMode : 'illustration'), defaultStyleId),
              ...t
            }));
          }
        }
      } catch (e) {}
    }
    return [createNewTab('1', 'Project 1', isStudioMode ? initialMode : 'illustration', defaultStyleId)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.activeTabId) return parsed.activeTabId;
        }
      } catch (e) {}
    }
    return '1';
  });

  const [routeMode, setRouteMode] = useState<UIMode>(initialMode);
  const [isHydrated, setIsHydrated] = useState(false);
  const isFirstRender = useRef(true);

  // Full hydration from IndexedDB (with full images & reference assets)
  useEffect(() => {
    let cancelled = false;
    getWorkspaceSession().then((session) => {
      if (cancelled) return;
      if (session && Array.isArray(session.tabs) && session.tabs.length > 0) {
        const hydrated = session.tabs.map(st => ({
          ...createNewTab(st.id, st.name, st.mode, defaultStyleId),
          ...st
        }));
        setTabs(hydrated);
        if (session.activeTabId && hydrated.some(t => t.id === session.activeTabId)) {
          setActiveTabId(session.activeTabId);
        }
      }
      setIsHydrated(true);
    }).catch(() => {
      if (!cancelled) setIsHydrated(true);
    });

    return () => { cancelled = true; };
  }, [defaultStyleId]);

  // Debounced Auto-Save to IndexedDB & localStorage
  useEffect(() => {
    if (!isHydrated) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveWorkspaceSession(tabs, activeTabId);

      // Light cache in localStorage for fast next startup
      try {
        const lightTabs = tabs.map(t => ({
          ...t,
          generatedImage: (t.generatedImage && t.generatedImage.length < 300000) ? t.generatedImage : null,
          sessionImages: [],
          referenceAssets: t.referenceAssets?.slice(0, 4) || [],
        }));
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ tabs: lightTabs, activeTabId }));
      } catch (e) {}
    }, 600);

    return () => clearTimeout(timer);
  }, [tabs, activeTabId, isHydrated]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || createNewTab('1', 'Project 1', 'illustration', defaultStyleId);

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
      if (!['dashboard', 'library', 'downloads', 'style-library', 'settings', 'tutorials', 'quota'].includes(newMode)) {
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

  const effectiveMode = ['dashboard', 'library', 'downloads', 'style-library', 'settings', 'tutorials', 'quota'].includes(routeMode) 
      ? routeMode 
      : activeTab.mode;

  return {
    tabs, activeTabId, activeTab, routeMode, effectiveMode, setMode,
    updateActiveTab, updateTabById, handleAddTab, handleCloseTab, handleSwitchTab, handleRenameTab
  };
};
