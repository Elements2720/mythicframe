import { HistoryEntry } from "../types";

const DB_NAME = 'MythicFrameDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';

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

export const createHistoryEntry = (data: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry => {
  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...data
  };
};