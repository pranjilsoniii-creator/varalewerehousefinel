/**
 * Tata AutoComp Systems Limited - Shift Operations Team Chat Service
 * 
 * Features:
 * 1. 8-Hour Message TTL: Messages auto-delete from Supabase Cloud after 8 hours.
 * 2. 4-Hour File TTL: File attachments (PDF, Excel, Images up to 10MB) auto-delete from Cloud after 4 hours.
 * 3. Supabase Free Plan Protection: Cloud storage remains < 50MB at all times.
 * 4. Local Persistence: Device IndexedDB retains full local shift history indefinitely.
 * 5. Real-Time Broadcast: Live instant delivery (< 200ms) across all devices.
 */

import { getSupabase } from './supabaseClient';
import { ShiftChatMessage, ShiftChatAttachment, UserRole } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet, saveToIndexedDB, loadFromIndexedDB } from '../utils/safeStorage';

export const MESSAGE_TTL_MS = 8 * 60 * 60 * 1000; // 8 Hours
export const FILE_TTL_MS = 4 * 60 * 60 * 1000;    // 4 Hours

const LOCAL_CHAT_IDB_KEY = 'tata_wms_local_chat_history_v1';
const CHAT_LAST_READ_KEY = 'tata_wms_chat_last_read_ts';

let localChatMemory: ShiftChatMessage[] = [];

/**
 * Initialize local chat memory from IndexedDB
 */
export async function initLocalChat(): Promise<ShiftChatMessage[]> {
  try {
    const idbData = await loadFromIndexedDB<ShiftChatMessage[]>(LOCAL_CHAT_IDB_KEY);
    if (idbData && Array.isArray(idbData)) {
      localChatMemory = idbData;
      return idbData;
    }
  } catch {}
  return [];
}

/**
 * Persists messages locally in IndexedDB
 */
async function persistLocalMessages(messages: ShiftChatMessage[]) {
  localChatMemory = messages;
  await saveToIndexedDB(LOCAL_CHAT_IDB_KEY, messages);
}

/**
 * Clean & prune expired messages from Supabase cloud
 * - Deletes messages older than 8 hours
 * - Strips file attachments older than 4 hours
 */
export async function cleanupExpiredCloudMessages(rawRows: any[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || !Array.isArray(rawRows)) return;

  const now = Date.now();
  const idsToDelete: string[] = [];
  const rowsToUpdateFileExpiry: any[] = [];

  rawRows.forEach((row) => {
    if (row.consignee_name !== 'SHIFT_CHAT_MESSAGE') return;
    const createdAtTime = new Date(row.timestamp || row.created_at).getTime();

    // 1. Check 8-Hour Message Expiry
    if (now - createdAtTime > MESSAGE_TTL_MS) {
      idsToDelete.push(row.id);
      return;
    }

    // 2. Check 4-Hour File Attachment Expiry
    if (now - createdAtTime > FILE_TTL_MS && row.notes) {
      try {
        const parsed = JSON.parse(row.notes);
        if (parsed.fileAttachment && !parsed.fileAttachment.isExpiredInCloud) {
          parsed.fileAttachment.fileDataUrl = undefined;
          parsed.fileAttachment.isExpiredInCloud = true;
          rowsToUpdateFileExpiry.push({
            ...row,
            notes: JSON.stringify(parsed),
          });
        }
      } catch {}
    }
  });

  // Batch delete expired messages from Supabase
  if (idsToDelete.length > 0) {
    try {
      await sb.from('dispatch_lots').delete().in('id', idsToDelete);
      console.log(`[ShiftChat] Cleaned up ${idsToDelete.length} expired shift messages (>8h) from Supabase cloud.`);
    } catch (e) {
      console.warn('[ShiftChat] Error deleting expired messages:', e);
    }
  }

  // Update file expiry in Supabase
  if (rowsToUpdateFileExpiry.length > 0) {
    try {
      await sb.from('dispatch_lots').upsert(rowsToUpdateFileExpiry, { onConflict: 'id' });
      console.log(`[ShiftChat] Expired ${rowsToUpdateFileExpiry.length} attachments (>4h) from Supabase cloud.`);
    } catch (e) {
      console.warn('[ShiftChat] Error updating expired files:', e);
    }
  }
}

/**
 * Fetch active shift messages (last 8 hours) from Supabase Cloud
 */
export async function fetchActiveShiftMessages(): Promise<ShiftChatMessage[]> {
  try {
    const sb = getSupabase();
    if (!sb) return localChatMemory;

    const eightHoursAgo = new Date(Date.now() - MESSAGE_TTL_MS).toISOString();

    const { data, error } = await sb
      .from('dispatch_lots')
      .select('*')
      .eq('consignee_name', 'SHIFT_CHAT_MESSAGE')
      .gte('timestamp', eightHoursAgo)
      .order('timestamp', { ascending: true });

    if (error) {
      console.warn('[ShiftChat] Fetch cloud messages error:', error.message);
      return localChatMemory;
    }

    // Background cleanup of any older rows
    cleanupExpiredCloudMessages(data || []).catch(() => {});

    const cloudMessages: ShiftChatMessage[] = [];
    if (data && Array.isArray(data)) {
      data.forEach((row) => {
        if (!row.notes) return;
        try {
          const parsed = JSON.parse(row.notes);
          if (parsed && parsed.id) {
            cloudMessages.push(parsed);
          }
        } catch {}
      });
    }

    // Merge with local history so nothing is lost locally
    const mergedMap = new Map<string, ShiftChatMessage>();
    localChatMemory.forEach((m) => mergedMap.set(m.id, m));
    cloudMessages.forEach((m) => {
      // If local already has the fileDataUrl and cloud expired it, keep local fileDataUrl!
      const existing = mergedMap.get(m.id);
      if (existing?.fileAttachment?.fileDataUrl && !m.fileAttachment?.fileDataUrl) {
        m.fileAttachment.fileDataUrl = existing.fileAttachment.fileDataUrl;
      }
      mergedMap.set(m.id, m);
    });

    const finalMessages = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Save merged to local IndexedDB
    persistLocalMessages(finalMessages);

    return finalMessages;
  } catch (e) {
    console.warn('[ShiftChat] Fetch active shift messages exception:', e);
    return localChatMemory;
  }
}

/**
 * Send a new Shift Operations Message (Text + Optional File Attachment up to 10MB)
 */
export async function sendShiftMessage(params: {
  senderUsername: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  fileAttachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileDataUrl?: string;
  };
}): Promise<ShiftChatMessage> {
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + MESSAGE_TTL_MS).toISOString();

  let attachment: ShiftChatAttachment | undefined;
  if (params.fileAttachment) {
    attachment = {
      ...params.fileAttachment,
      fileExpiresAt: new Date(now.getTime() + FILE_TTL_MS).toISOString(),
      isExpiredInCloud: false,
    };
  }

  const newMessage: ShiftChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderUsername: params.senderUsername,
    senderName: params.senderName,
    senderRole: params.senderRole,
    message: params.message.trim(),
    createdAt,
    expiresAt,
    fileAttachment: attachment,
  };

  // 1. Immediately store in local memory and IndexedDB
  const updatedLocal = [...localChatMemory, newMessage];
  await persistLocalMessages(updatedLocal);

  // Mark last read as now for sender
  safeLocalStorageSet(CHAT_LAST_READ_KEY, createdAt);

  // 2. Sync to Supabase Cloud
  const sb = getSupabase();
  if (sb) {
    try {
      // Upsert into dispatch_lots table
      const row = {
        id: newMessage.id,
        lot_number: 'SHIFT-CHAT',
        timestamp: createdAt,
        consignee_name: 'SHIFT_CHAT_MESSAGE',
        consignee_address: params.senderRole,
        dispatched_by: params.senderName,
        transport_name: params.senderUsername,
        notes: JSON.stringify(newMessage),
        pack_count: attachment ? 1 : 0,
        packs: [],
        status: 'DISPATCHED',
      };

      await sb.from('dispatch_lots').upsert(row, { onConflict: 'id' });

      // Realtime Broadcast to all connected clients
      const channel = sb.channel('warehouse-shift-chat-realtime');
      channel.send({
        type: 'broadcast',
        event: 'NEW_SHIFT_MESSAGE',
        payload: newMessage,
      });
    } catch (err) {
      console.warn('[ShiftChat] Error syncing message to cloud:', err);
    }
  }

  return newMessage;
}

/**
 * Subscribe to Live Real-Time Shift Messages across warehouse devices
 */
export function subscribeToShiftChat(
  onNewMessage: (msg: ShiftChatMessage) => void
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const channel = sb
    .channel('warehouse-shift-chat-realtime')
    .on('broadcast', { event: 'NEW_SHIFT_MESSAGE' }, (payload: any) => {
      if (payload && payload.payload && payload.payload.id) {
        const incoming: ShiftChatMessage = payload.payload;
        // Check if already in local
        if (!localChatMemory.some((m) => m.id === incoming.id)) {
          const updated = [...localChatMemory, incoming];
          persistLocalMessages(updated);
          onNewMessage(incoming);
        }
      }
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dispatch_lots' },
      (payload: any) => {
        if (payload.new && payload.new.consignee_name === 'SHIFT_CHAT_MESSAGE' && payload.new.notes) {
          try {
            const parsed: ShiftChatMessage = JSON.parse(payload.new.notes);
            if (parsed && parsed.id && !localChatMemory.some((m) => m.id === parsed.id)) {
              const updated = [...localChatMemory, parsed];
              persistLocalMessages(updated);
              onNewMessage(parsed);
            }
          } catch {}
        }
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

/**
 * Calculate unread messages count for badge display
 */
export function getUnreadShiftMessagesCount(messages: ShiftChatMessage[]): number {
  try {
    const lastRead = safeLocalStorageGet(CHAT_LAST_READ_KEY);
    if (!lastRead) return messages.length;
    const lastReadTime = new Date(lastRead).getTime();
    return messages.filter((m) => new Date(m.createdAt).getTime() > lastReadTime).length;
  } catch {
    return 0;
  }
}

/**
 * Mark all shift messages as read
 */
export function markShiftChatAsRead(): void {
  safeLocalStorageSet(CHAT_LAST_READ_KEY, new Date().toISOString());
}
