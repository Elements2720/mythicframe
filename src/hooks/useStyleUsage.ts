import { useState, useEffect, useCallback } from 'react';

export const useStyleUsage = () => {
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = localStorage.getItem('ais_style_usage');
    if (stored) {
      try {
        setUsageMap(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse style usage", e);
      }
    }
  }, []);

  const recordStyleUsage = useCallback((styleId: string) => {
    if (!styleId || styleId === 'none') return;
    setUsageMap(prev => {
      const newMap = { ...prev, [styleId]: (prev[styleId] || 0) + 1 };
      localStorage.setItem('ais_style_usage', JSON.stringify(newMap));
      return newMap;
    });
  }, []);

  return { usageMap, recordStyleUsage };
};
