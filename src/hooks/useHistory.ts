
import { useState, useEffect } from 'react';
import { HistoryEntry, UIMode } from '../types';
import { getHistory, saveToHistory, deleteHistoryEntry, clearHistory, createHistoryEntry } from '../services/historyService';

export const useHistory = (
  setMode: (mode: UIMode) => void,
  updateActiveTab: (updates: any) => void
) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryEntry, setCurrentHistoryEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const addHistoryEntry = async (data: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const entry = createHistoryEntry(data);
    await saveToHistory(entry);
    setHistory(prev => [entry, ...prev]);
    setCurrentHistoryEntry(entry);
  };

  const handleRestore = (entry: HistoryEntry) => {
     setMode(entry.mode);
     // Reconstruct tab state from history
     updateActiveTab((prev: any) => {
        const updates: any = {
           prompt: entry.userPrompt,
           generatedImage: entry.thumbnailUrl,
           bgConfig: entry.bgConfig,
           selectedStyleId: entry.styleId,
           referenceAssets: entry.referenceAssets,
           selectedSize: entry.size,
           selectedAspectRatio: entry.aspectRatio,
           frameElements: entry.frameElements || [],
           bgPatternType: entry.bgPatternType || 'scene',
           safeZone: entry.safeZone || { enabled: false, x: 20, y: 20, width: 60, height: 60, aspectRatioLock: false },
           sessionImages: prev.sessionImages.includes(entry.thumbnailUrl) 
              ? prev.sessionImages 
              : [entry.thumbnailUrl, ...prev.sessionImages]
        };

        // Gacha specific restoration
        if (entry.mode === 'gacha') {
           updates.gachaAssets = entry.gachaAssets || [];
           updates.characterTraits = entry.characterTraits || '';
           updates.characterName = entry.characterName || '';
           updates.characterSubtitle = entry.characterSubtitle || '';
           updates.characterRarity = entry.rarity || 'SSR';
           updates.characterGender = entry.gender || '';
        }

        return updates;
     });
  };

  const handleClearHistory = async () => { await clearHistory(); setHistory([]); };
  const handleDeleteHistoryItem = async (id: string) => { await deleteHistoryEntry(id); setHistory(prev => prev.filter(h => h.id !== id)); };
  
  const handleRenameHistoryItem = async (entry: HistoryEntry, name: string) => { 
     const updated = { ...entry, customName: name };
     await saveToHistory(updated);
     setHistory(prev => prev.map(h => h.id === entry.id ? updated : h));
  };

  return {
    history,
    setHistory,
    currentHistoryEntry,
    setCurrentHistoryEntry,
    addHistoryEntry,
    handleRestore,
    handleClearHistory,
    handleDeleteHistoryItem,
    handleRenameHistoryItem,
    createHistoryEntry 
  };
};
