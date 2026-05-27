
import { useCallback } from 'react';
import { useTabs } from './useTabs';
import { MapGridConfig } from '../types';
import { DEFAULT_MAP_GRID_CONFIG } from '../constants/mapGrid';

export const useMapGrid = () => {
  const { activeTab, updateActiveTab } = useTabs();

  const config = activeTab?.mapGridConfig || DEFAULT_MAP_GRID_CONFIG;

  const updateConfig = useCallback((updates: Partial<MapGridConfig>) => {
    if (!activeTab) return;
    updateActiveTab({
      mapGridConfig: {
        ...config,
        ...updates,
      },
    });
  }, [activeTab, config, updateActiveTab]);

  return {
    config,
    updateConfig,
  };
};
