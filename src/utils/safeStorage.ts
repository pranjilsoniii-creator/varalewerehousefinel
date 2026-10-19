/**
 * Tata AutoComp Systems Limited - Enterprise Safe Storage Engine
 * 
 * Provides:
 * 1. Safe localStorage read/write with QuotaExceededError protection (never crashes React).
 * 2. High-capacity IndexedDB persistence for warehouse packs (> 500 MB capacity vs 5 MB localStorage).
 * 3. Automatic pruning of obsolete legacy storage keys.
 */

const DB_NAME = 'tata_wms_offline_idb_v1';
const STORE_NAME = 'warehouse_store';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save data to IndexedDB (virtually unlimited quota for large warehouse catalogs)
 */
export async function saveToIndexedDB<T>(key: string, data: T): Promise<boolean> {
  try {
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(data, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Load data from IndexedDB
 */
export async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Remove data from IndexedDB
 */
export async function removeFromIndexedDB(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Safely writes to localStorage without ever throwing QuotaExceededError or crashing React.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] localStorage quota reached on "${key}". Pruning obsolete keys and falling back.`);
    
    // Attempt cleanup of obsolete old versions
    try {
      pruneObsoleteStorageKeys();
      localStorage.setItem(key, value);
      return true;
    } catch {
      // If still fails, catch safely so React never crashes
      return false;
    }
  }
}

/**
 * Safely reads from localStorage without throwing
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely removes item from localStorage
 */
export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Prunes old obsolete cache versions to free up browser storage space
 */
export function pruneObsoleteStorageKeys(): void {
  try {
    const obsoletePrefixes = [
      'tata_wms_packs_v1',
      'tata_wms_packs_v2',
      'tata_wms_packs_v3',
      'tata_wms_inwards_v1',
      'tata_wms_inwards_v2',
      'tata_wms_inwards_v3',
      'tata_wms_lots_v1',
      'tata_wms_lots_v2',
      'tata_wms_lots_v3',
      'tata_wms_current_user_v1',
      'tata_wms_current_user_v2',
      'tata_wms_current_user_v3',
    ];

    obsoletePrefixes.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

// Automatically prune obsolete keys on module initialization
if (typeof window !== 'undefined') {
  pruneObsoleteStorageKeys();
}
