/**
 * Tata AutoComp WMS - Enterprise Offline-First Engine & Cloud Queue Synchronizer
 * 
 * Features:
 * 1. Instant local-first writes (0ms latency, zero failure when offline).
 * 2. Persistent queued offline actions stored in localStorage / IndexedDB.
 * 3. Automatic background replay and synchronization when network is restored.
 * 4. Real-time online/offline network listeners with toast event dispatching.
 */

import {
  syncPacksToCloud,
  syncInwardToCloud,
  syncLotToCloud,
  syncDailyStockToCloud,
  deletePackFromCloud,
  deleteDailyStockFromCloud,
  syncUsersToCloud,
  getSupabase,
} from '../lib/supabaseClient';

export type OfflineActionType =
  | 'SYNC_PACKS'
  | 'DELETE_PACK'
  | 'SYNC_INWARD'
  | 'SYNC_LOT'
  | 'SYNC_DAILY_STOCK'
  | 'DELETE_DAILY_STOCK'
  | 'SYNC_USERS';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: string;
  retries: number;
}

const STORAGE_KEY = 'tata_wms_offline_queue_v1';

// Read all queued offline actions
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// Save queue to localStorage
function saveOfflineQueue(queue: OfflineAction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange();
  } catch (e) {}
}

// Add an action to the offline queue
export function enqueueOfflineAction(type: OfflineActionType, payload: any) {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0,
  };

  queue.push(newAction);
  saveOfflineQueue(queue);

  // If online right now, trigger background process
  if (navigator.onLine) {
    processOfflineQueue();
  }
}

// Dispatches a custom window event whenever queue count changes
function notifyQueueChange() {
  const count = getOfflineQueue().length;
  window.dispatchEvent(new CustomEvent('tata-wms-queue-change', { detail: { count } }));
}

let isProcessingQueue = false;

// Process and replay all queued actions sequentially to Supabase cloud
export async function processOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (isProcessingQueue) return { syncedCount: 0, remainingCount: getOfflineQueue().length };
  if (!navigator.onLine) return { syncedCount: 0, remainingCount: getOfflineQueue().length };

  const sb = getSupabase();
  if (!sb) return { syncedCount: 0, remainingCount: getOfflineQueue().length };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

  isProcessingQueue = true;
  const remainingQueue: OfflineAction[] = [];
  let syncedCount = 0;

  for (const action of queue) {
    try {
      let success = false;

      switch (action.type) {
        case 'SYNC_PACKS':
          success = await syncPacksToCloud(Array.isArray(action.payload) ? action.payload : [action.payload]);
          break;
        case 'DELETE_PACK':
          success = await deletePackFromCloud(String(action.payload));
          break;
        case 'SYNC_INWARD':
          success = await syncInwardToCloud(action.payload);
          break;
        case 'SYNC_LOT':
          success = await syncLotToCloud(action.payload);
          break;
        case 'SYNC_DAILY_STOCK':
          success = await syncDailyStockToCloud(action.payload);
          break;
        case 'DELETE_DAILY_STOCK':
          success = await deleteDailyStockFromCloud(String(action.payload));
          break;
        case 'SYNC_USERS':
          success = await syncUsersToCloud(action.payload);
          break;
        default:
          success = true;
          break;
      }

      if (success) {
        syncedCount++;
      } else {
        action.retries = (action.retries || 0) + 1;
        if (action.retries < 5) {
          remainingQueue.push(action);
        }
      }
    } catch (err) {
      console.warn('Offline queue process error on action:', action.type, err);
      action.retries = (action.retries || 0) + 1;
      if (action.retries < 5) {
        remainingQueue.push(action);
      }
    }
  }

  saveOfflineQueue(remainingQueue);
  isProcessingQueue = false;

  if (syncedCount > 0) {
    window.dispatchEvent(
      new CustomEvent('tata-wms-sync-completed', {
        detail: { syncedCount, remaining: remainingQueue.length },
      })
    );
  }

  return { syncedCount, remainingCount: remainingQueue.length };
}

// Background Network Watcher Hook
export function initOfflineSyncEngine(onSyncComplete?: (count: number) => void) {
  const handleOnline = () => {
    console.log('Network status: ONLINE. Processing offline sync queue...');
    processOfflineQueue().then(({ syncedCount }) => {
      if (syncedCount > 0 && onSyncComplete) {
        onSyncComplete(syncedCount);
      }
    });
  };

  window.addEventListener('online', handleOnline);

  // Periodic heartbeat queue process (every 15 seconds if queue has pending items)
  const intervalId = setInterval(() => {
    if (navigator.onLine && getOfflineQueue().length > 0) {
      processOfflineQueue().then(({ syncedCount }) => {
        if (syncedCount > 0 && onSyncComplete) {
          onSyncComplete(syncedCount);
        }
      });
    }
  }, 15000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}
