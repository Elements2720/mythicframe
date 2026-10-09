import { HistoryEntry, WorkspaceTab } from "../types";
import { optimizeBase64Image } from "../utils/imageUtils";

const DB_NAME = 'MythicFrameDB';
const DB_VERSION = 3;
const STORE_NAME = 'history';
const EXPORT_STORE_NAME = 'exports';
const WORKSPACE_STORE_NAME = 'workspace';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Schema creation
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EXPORT_STORE_NAME)) {
        db.createObjectStore(EXPORT_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(WORKSPACE_STORE_NAME)) {
        db.createObjectStore(WORKSPACE_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
       const db = request.result;
       
       // Migration Check: If localStorage has data, move it to IDB
       const localDataRaw = localStorage.getItem('mythicframe_history');
       if (localDataRaw) {
           try {
               const localData = JSON.parse(localDataRaw);
               if (Array.isArray(localData) && localData.length > 0) {
                   console.log(`Migrating ${localData.length} items from LocalStorage to IndexedDB...`);
                   const tx = db.transaction(STORE_NAME, 'readwrite');
                   const store = tx.objectStore(STORE_NAME);
                   
                   for (const entry of localData) {
                       store.put(entry);
                   }
                   
                   // Wait for migration transaction
                   await new Promise<void>((resolveTx, rejectTx) => {
                       tx.oncomplete = () => resolveTx();
                       tx.onerror = () => rejectTx(tx.error);
                   });
                   console.log("Migration complete.");
               }
               // Clear old storage to free up quota
               localStorage.removeItem('mythicframe_history');
           } catch(e) {
               console.warn("History migration warning:", e);
           }
       }
       resolve(db);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const saveToHistory = async (entry: HistoryEntry): Promise<void> => {
  try {
    // Compress thumbnail if needed to save IDB space
    if (entry.thumbnailUrl && entry.thumbnailUrl.startsWith('data:image')) {
      try {
        entry.thumbnailUrl = await optimizeBase64Image(entry.thumbnailUrl, 1024, 0.7);
      } catch (e) {}
    }
    // Compress reference assets if needed
    if (entry.referenceAssets && entry.referenceAssets.length > 0) {
      try {
        entry.referenceAssets = await Promise.all(entry.referenceAssets.map(async (ref) => {
          if (ref.url && ref.url.startsWith('data:image')) {
            try {
              const opt = await optimizeBase64Image(ref.url, 1024, 0.7);
              return { ...ref, url: opt };
            } catch {
              return ref;
            }
          }
          return ref;
        }));
      } catch (e) {}
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(entry);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save to IDB", e);
  }
};

export const deleteHistoryEntry = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to delete from IDB", e);
  }
};

export const getHistory = async (): Promise<HistoryEntry[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const res = request.result as HistoryEntry[];
            // Sort Descending by timestamp (newest first)
            if (res && Array.isArray(res)) {
                res.sort((a, b) => b.timestamp - a.timestamp);
                resolve(res);
            } else {
                resolve([]);
            }
        };
        request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const clearHistory = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch(e) {
        console.error("Failed to clear history", e);
    }
};

// --- Export History ---

export const saveExportToHistory = async (entry: any): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(EXPORT_STORE_NAME, 'readwrite');
            const store = tx.objectStore(EXPORT_STORE_NAME);
            store.put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save export to IDB", e);
    }
};

export const getExportHistory = async (): Promise<any[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(EXPORT_STORE_NAME, 'readonly');
            const store = tx.objectStore(EXPORT_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const res = request.result;
                if (res && Array.isArray(res)) {
                    res.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(res);
                } else {
                    resolve([]);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load export history", e);
        return [];
    }
};

export const getExportEntry = async (id: string): Promise<any> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(EXPORT_STORE_NAME, 'readonly');
            const store = tx.objectStore(EXPORT_STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load export entry", e);
        return null;
    }
};

export const deleteExportEntry = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(EXPORT_STORE_NAME, 'readwrite');
            tx.objectStore(EXPORT_STORE_NAME).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to delete export from IDB", e);
    }
};

export const createHistoryEntry = (data: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry => {
  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...data
  };
};

// --- Workspace Tab Session Persistence ---

export interface SavedWorkspaceSession {
  id: string;
  tabs: WorkspaceTab[];
  activeTabId: string;
  savedAt: number;
}

export const saveWorkspaceSession = async (tabs: WorkspaceTab[], activeTabId: string): Promise<void> => {
  try {
    const db = await openDB();
    // Compress large tab images
    const optimizedTabs = await Promise.all(tabs.map(async (tab) => {
      let genImg = tab.generatedImage;
      if (genImg && genImg.startsWith('data:image')) {
        try {
          genImg = await optimizeBase64Image(genImg, 1024, 0.75);
        } catch {}
      }

      let refs = tab.referenceAssets;
      if (refs && refs.length > 0) {
        refs = await Promise.all(refs.map(async (ref) => {
          if (ref.url && ref.url.startsWith('data:image')) {
            try {
              const opt = await optimizeBase64Image(ref.url, 1024, 0.75);
              return { ...ref, url: opt };
            } catch {
              return ref;
            }
          }
          return ref;
        }));
      }

      let sessions = tab.sessionImages || [];
      if (sessions.length > 6) {
        sessions = sessions.slice(0, 6);
      }

      return {
        ...tab,
        generatedImage: genImg,
        referenceAssets: refs,
        sessionImages: sessions
      };
    }));

    const sessionData: SavedWorkspaceSession = {
      id: 'active_session',
      tabs: optimizedTabs,
      activeTabId,
      savedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKSPACE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORKSPACE_STORE_NAME);
      store.put(sessionData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Failed to save workspace session to IDB:", e);
  }
};

export const getWorkspaceSession = async (): Promise<SavedWorkspaceSession | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKSPACE_STORE_NAME, 'readonly');
      const store = tx.objectStore(WORKSPACE_STORE_NAME);
      const req = store.get('active_session');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Failed to load workspace session from IDB:", e);
    return null;
  }
};

export const clearWorkspaceSession = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKSPACE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(WORKSPACE_STORE_NAME);
      store.delete('active_session');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Failed to clear workspace session in IDB:", e);
  }
};