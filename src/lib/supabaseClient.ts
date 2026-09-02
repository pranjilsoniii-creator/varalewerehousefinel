import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatteryPack, DispatchLot, InwardShipmentRecord, SavedAddress } from '../types';

// Multi-fallback Supabase Config (Checks all possible Vercel env variable spellings)
const env = (import.meta as any).env || {};
const FALLBACK_URL = 'https://eovoqayzvspkpzwpxxic.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

function resolveEnvUrl(): string {
  const possible = env.VITE_SUPABASE_URL || env.VITESUPABASEURL || env.SUPABASE_URL;
  if (possible && typeof possible === 'string' && possible.startsWith('http')) {
    return possible.trim();
  }
  return FALLBACK_URL;
}

function resolveEnvKey(): string {
  const possible = env.VITE_SUPABASE_ANON_KEY || env.VITESUPABASEANONKEY || env.SUPABASE_ANON_KEY || env.sb_publishable_mUNoyLLfuF5eG4p2XIFQcQ_eUaJxAu3;
  if (possible && typeof possible === 'string' && possible.length > 20) {
    return possible.trim();
  }
  return FALLBACK_KEY;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const savedUrl = localStorage.getItem('tata_wms_supabase_url');
    const savedKey = localStorage.getItem('tata_wms_supabase_key');
    const finalUrl = savedUrl || resolveEnvUrl();
    const finalKey = savedKey || resolveEnvKey();
    return {
      url: finalUrl,
      anonKey: finalKey,
      connected: Boolean(finalUrl && finalKey),
    };
  } catch (e) {
    return {
      url: FALLBACK_URL,
      anonKey: FALLBACK_KEY,
      connected: true,
    };
  }
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem('tata_wms_supabase_url', url.trim());
    localStorage.setItem('tata_wms_supabase_key', anonKey.trim());
  } catch (e) {}
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  try {
    const config = getStoredSupabaseConfig();
    if (!config.url || !config.anonKey) {
      return null;
    }
    if (!supabaseInstance) {
      supabaseInstance = createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return supabaseInstance;
  } catch (e) {
    console.warn('Supabase initialization failed, running in resilient local mode', e);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

// Helper: Map Database Row to Frontend BatteryPack
export function mapRowToPack(row: any): BatteryPack {
  return {
    id: row.id,
    packNumber: String(row.pack_number || ''),
    packType: row.pack_type || 'Kanger1.0_AIO',
    status: row.status || 'INWARD_AREA',
    locationArea: row.location_area || 'Inward Area',
    currentLocation: row.current_location || row.location_area || 'Inward Area',
    inwardDate: row.inward_date,
    documentNo: row.document_no || '',
    dealershipName: row.dealership_name || '',
    receivedState: row.received_state || '',
    transportName: row.transport_name || '',
    remark: row.remark || '',
    hasInwardStamp: Boolean(row.has_inward_stamp),
    inwardBy: row.inward_by || '',
    inwardApprovedBy: row.inward_approved_by,
    inwardApprovedAt: row.inward_approved_at,
    lineId: row.line_id,
    rackNumber: row.rack_number,
    rackSlot: row.rack_slot,
    dispatchedAt: row.dispatched_at,
    dispatchedBy: row.dispatched_by,
    dispatchLotId: row.dispatch_lot_id,
    dispatchDocNo: row.dispatch_doc_no,
    dispatchLrNo: row.dispatch_lr_no,
    dispatchVehicleNo: row.dispatch_vehicle_no,
    dispatchToAddress: row.dispatch_to_address,
    dispatchToCustomer: row.dispatch_to_customer,
    notes: row.notes,
    movementHistory: row.movement_history || [],
  };
}

// Helper: Map Frontend BatteryPack to Database Row
export function mapPackToRow(p: BatteryPack): any {
  return {
    id: p.id,
    pack_number: p.packNumber,
    pack_type: p.packType,
    status: p.status,
    location_area: p.locationArea || 'Inward Area',
    current_location: p.currentLocation || p.locationArea || 'Inward Area',
    inward_date: p.inwardDate || new Date().toISOString(),
    document_no: p.documentNo || '',
    dealership_name: p.dealershipName || '',
    received_state: p.receivedState || '',
    transport_name: p.transportName || '',
    remark: p.remark || '',
    has_inward_stamp: Boolean(p.hasInwardStamp),
    inward_by: p.inwardBy || '',
    inward_approved_by: p.inwardApprovedBy || null,
    inward_approved_at: p.inwardApprovedAt || null,
    line_id: p.lineId || null,
    rack_number: p.rackNumber || null,
    rack_slot: p.rackSlot || null,
    dispatched_at: p.dispatchedAt || null,
    dispatched_by: p.dispatchedBy || null,
    dispatch_lot_id: p.dispatchLotId || null,
    dispatch_doc_no: p.dispatchDocNo || null,
    dispatch_lr_no: p.dispatchLrNo || null,
    dispatch_vehicle_no: p.dispatchVehicleNo || null,
    dispatch_to_address: p.dispatchToAddress || null,
    dispatch_to_customer: p.dispatchToCustomer || null,
    notes: p.notes || null,
    movement_history: p.movementHistory || [],
    updated_at: new Date().toISOString(),
  };
}

// Cloud Database CRUD & Realtime Handlers with Zero-Crash Guarantees
export async function syncPacksToCloud(packs: BatteryPack[]): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb || packs.length === 0) return false;
    const rows = packs.map(mapPackToRow);
    const { error } = await sb.from('battery_packs').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase sync warning (Ensure SQL schema is run in Supabase):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sync network exception (Local fallback active)', e);
    return false;
  }
}

export async function fetchPacksFromCloud(): Promise<BatteryPack[] | null> {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('battery_packs').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      console.warn('Supabase fetch note (Local storage active):', error?.message);
      return null;
    }
    return data.map(mapRowToPack);
  } catch (e) {
    console.warn('Supabase fetch network exception (Local storage active)', e);
    return null;
  }
}

export async function syncLotToCloud(lot: DispatchLot): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb) return false;
    const row = {
      id: lot.id,
      lot_number: lot.lotNumber,
      timestamp: lot.timestamp,
      status: lot.status,
      from_plant: lot.fromPlant,
      consignee_name: lot.consigneeName,
      consignee_address: lot.consigneeAddress,
      consignee_gstin: lot.consigneeGstin,
      vehicle_number: lot.vehicleNumber,
      transport_name: lot.transportName,
      lr_number: lot.lrNumber,
      transport_doc_no: lot.transportDocNo,
      pack_count: lot.packCount,
      packs: lot.packs || [],
      dispatched_by: lot.dispatchedBy,
      approved_by: lot.approvedBy,
      approved_at: lot.approvedAt,
      notes: lot.notes,
    };
    const { error } = await sb.from('dispatch_lots').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase lot upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase lot sync exception:', e);
    return false;
  }
}

export async function syncInwardToCloud(inward: InwardShipmentRecord): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb) return false;
    const row = {
      id: inward.id,
      timestamp: inward.timestamp,
      document_no: inward.documentNo,
      dealership_name: inward.dealershipName,
      received_state: inward.receivedState,
      transport_name: inward.transportName,
      pack_count: inward.packCount,
      pack_numbers: inward.packNumbers || [],
      pack_type_summary: inward.packTypeSummary || {},
      inward_by: inward.inwardBy,
      approved_by: inward.approvedBy,
      has_inward_stamp: inward.hasInwardStamp,
      status: inward.status,
      remark: inward.remark,
    };
    const { error } = await sb.from('inward_shipments').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase inward upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase inward sync exception:', e);
    return false;
  }
}
