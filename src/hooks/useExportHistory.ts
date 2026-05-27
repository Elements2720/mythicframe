
import { useState, useEffect, useCallback } from 'react';
import { ExportHistoryEntry } from '../types';
import { getExportHistory, saveExportToHistory, deleteExportEntry, getExportEntry } from '../services/historyService';

export const useExportHistory = () => {
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>([]);

  useEffect(() => {
    getExportHistory().then(entries => {
      // Strip blob from React state to prevent DataCloneError out of memory when profiling/rendering
      setExportHistory(entries.map(e => ({ ...e, hasBlob: !!e.blob, blob: undefined })));
    });
  }, []);

  const addExportEntry = async (data: Omit<ExportHistoryEntry, 'id' | 'timestamp'>) => {
    const entry: ExportHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...data
    };
    await saveExportToHistory(entry);
    setExportHistory(prev => [{ ...entry, hasBlob: !!entry.blob, blob: undefined }, ...prev]);
  };

  const handleDeleteExport = async (id: string) => {
    await deleteExportEntry(id);
    setExportHistory(prev => prev.filter(e => e.id !== id));
  };
  
  const handleDownloadAgain = useCallback(async (id: string, name: string) => {
    const entry = await getExportEntry(id);
    if (entry && entry.blob) {
      const url = URL.createObjectURL(entry.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  return {
    exportHistory,
    addExportEntry,
    handleDeleteExport,
    handleDownloadAgain
  };
};
