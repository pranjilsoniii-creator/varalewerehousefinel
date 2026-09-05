import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatteryPack, DispatchLot, InwardShipmentRecord } from '../types';

// Hardcoded verified Supabase credentials for Tata AutoComp Project
const DEFAULT_SUPABASE_URL = 'https://eovoqayzvspkpzwpxxic.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

const env = (import.meta as any).env || {};

function resolveEnvUrl(): string {
  const possible = env.VITE_SUPABASE_URL || env.VITESUPABASEURL || env.SUPABASE_URL;
  if (possible && typeof possible === 'string' && possible.startsWith('http')) {
    return possible.trim();
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveEnvKey(): string {
  const possible = env.VITE_SUPABASE_ANON_KEY || env.VITESUPABASEANONKEY || env.SUPABASE_ANON_KEY;
  if (possible && typeof possible === 'string' && possible.length > 20) {
    return possible.trim();
  }
  return DEFAULT_SUPABASE_KEY;
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
    const finalUrl = (savedUrl && savedUrl.startsWith('http')) ? savedUrl.trim() : resolveEnvUrl();
    const finalKey = (savedKey && savedKey.length > 20) ? savedKey.trim() : resolveEnvKey();
    return {
      url: finalUrl,
      anonKey: finalKey,
      connected: Boolean(finalUrl && finalKey),
    };
  } catch (e) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_KEY,
      connected: true,
    };
  }
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem('tata_wms_supabase_url', url.trim());
    localStorage.setItem('tata_wms_supabase_key', anonKey.trim());
    resetSupabaseClient();
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
    console.warn('Supabase initialization warning:', e);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

// ==========================================
// 1. BATTERY PACK MAPPINGS & CRUD
// ==========================================

export function mapRowToPack(row: any): BatteryPack {
  return {
    id: row.id,
    packNumber: String(row.pack_number || ''),
    packType: row.pack_type || 'Kanger1.0_AIO',
    status: row.status || 'INWARD_AREA',
    locationArea: row.location_area || 'Inward Area',
    currentLocation: row.current_location || row.location_area || 'Inward Area',
    inwardDate: row.inward_date || new Date().toISOString(),
    documentNo: row.document_no || '',
    dealershipName: row.dealership_name || '',
    receivedState: row.received_state || 'Maharashtra',
    transportName: row.transport_name || '',
    remark: row.remark || '',
    hasInwardStamp: Boolean(row.has_inward_stamp !== false),
    inwardBy: row.inward_by || '',
    inwardApprovedBy: row.inward_approved_by,
    inwardApprovedAt: row.inward_approved_at,
    lineId: row.line_id || undefined,
    rackNumber: row.rack_number != null ? Number(row.rack_number) : undefined,
    rackSlot: row.rack_slot != null ? Number(row.rack_slot) : undefined,
    dispatchedAt: row.dispatched_at || undefined,
    dispatchedBy: row.dispatched_by || undefined,
    dispatchLotId: row.dispatch_lot_id || undefined,
    dispatchDocNo: row.dispatch_doc_no || undefined,
    dispatchLrNo: row.dispatch_lr_no || undefined,
    dispatchVehicleNo: row.dispatch_vehicle_no || undefined,
    dispatchTransporter: row.dispatch_transporter || row.transport_name || undefined,
    sourceType: row.source_type || 'INWARD',
    isWithoutPlate: Boolean(row.is_without_plate),
    pendingInwardReconciliation: Boolean(row.pending_inward_reconciliation),
    reconciliationValidUntil: row.reconciliation_valid_until || undefined,
    reconciledAt: row.reconciled_at || undefined,
    dispatchToAddress: row.dispatch_to_address || undefined,
    dispatchToCustomer: row.dispatch_to_customer || undefined,
    notes: row.notes || undefined,
    movementHistory: Array.isArray(row.movement_history) ? row.movement_history : [],
  };
}

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
    received_state: p.receivedState || 'Maharashtra',
    transport_name: p.transportName || '',
    remark: p.remark || '',
    has_inward_stamp: Boolean(p.hasInwardStamp !== false),
    inward_by: p.inwardBy || '',
    inward_approved_by: p.inwardApprovedBy || null,
    inward_approved_at: p.inwardApprovedAt || null,
    line_id: p.lineId || null,
    rack_number: p.rackNumber != null ? p.rackNumber : null,
    rack_slot: p.rackSlot != null ? p.rackSlot : null,
    dispatched_at: p.dispatchedAt || null,
    dispatched_by: p.dispatchedBy || null,
    dispatch_lot_id: p.dispatchLotId || null,
    dispatch_doc_no: p.dispatchDocNo || null,
    dispatch_lr_no: p.dispatchLrNo || null,
    dispatch_vehicle_no: p.dispatchVehicleNo || null,
    dispatch_transporter: p.dispatchTransporter || null,
    source_type: p.sourceType || 'INWARD',
    is_without_plate: Boolean(p.isWithoutPlate),
    pending_inward_reconciliation: Boolean(p.pendingInwardReconciliation),
    reconciliation_valid_until: p.reconciliationValidUntil || null,
    reconciled_at: p.reconciledAt || null,
    dispatch_to_address: p.dispatchToAddress || null,
    dispatch_to_customer: p.dispatchToCustomer || null,
    notes: p.notes || null,
    movement_history: p.movementHistory || [],
    updated_at: new Date().toISOString(),
  };
}

export async function fetchPacksFromCloud(): Promise<BatteryPack[] | null> {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('battery_packs').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetch packs warning:', error.message);
      return null;
    }
    return (data || []).map(mapRowToPack);
  } catch (e) {
    console.warn('Supabase fetch packs exception:', e);
    return null;
  }
}

export async function syncPacksToCloud(packs: BatteryPack[]): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb || packs.length === 0) return false;
    const rows = packs.map(mapPackToRow);
    const { error } = await sb.from('battery_packs').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase sync packs error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sync packs exception:', e);
    return false;
  }
}

export async function deletePackFromCloud(packId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb || !packId) return false;
    const { error } = await sb.from('battery_packs').delete().eq('id', packId);
    if (error) {
      console.warn('Supabase delete pack error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete pack exception:', e);
    return false;
  }
}

// ==========================================
// 2. INWARD SHIPMENTS MAPPINGS & CRUD
// ==========================================

export function mapRowToInward(row: any): InwardShipmentRecord {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    documentNo: row.document_no || '',
    dealershipName: row.dealership_name || '',
    receivedState: row.received_state || 'Maharashtra',
    transportName: row.transport_name || '',
    packCount: Number(row.pack_count || (row.pack_numbers ? row.pack_numbers.length : 0)),
    packNumbers: Array.isArray(row.pack_numbers) ? row.pack_numbers : [],
    packTypeSummary: (row.pack_type_summary && typeof row.pack_type_summary === 'object') ? row.pack_type_summary : {},
    inwardBy: row.inward_by || '',
    approvedBy: row.approved_by || undefined,
    hasInwardStamp: Boolean(row.has_inward_stamp !== false),
    status: row.status || 'APPROVED',
    remark: row.remark || '',
  };
}

export function mapInwardToRow(inward: InwardShipmentRecord): any {
  return {
    id: inward.id,
    timestamp: inward.timestamp || new Date().toISOString(),
    document_no: inward.documentNo,
    dealership_name: inward.dealershipName,
    received_state: inward.receivedState || 'Maharashtra',
    transport_name: inward.transportName || '',
    pack_count: inward.packCount,
    pack_numbers: inward.packNumbers || [],
    pack_type_summary: inward.packTypeSummary || {},
    inward_by: inward.inwardBy || '',
    approved_by: inward.approvedBy || null,
    has_inward_stamp: Boolean(inward.hasInwardStamp !== false),
    status: inward.status || 'APPROVED',
    remark: inward.remark || '',
  };
}

export async function fetchInwardsFromCloud(): Promise<InwardShipmentRecord[] | null> {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('inward_shipments').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetch inwards warning:', error.message);
      return null;
    }
    return (data || []).map(mapRowToInward);
  } catch (e) {
    console.warn('Supabase fetch inwards exception:', e);
    return null;
  }
}

export async function syncInwardToCloud(inward: InwardShipmentRecord): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb) return false;
    const row = mapInwardToRow(inward);
    const { error } = await sb.from('inward_shipments').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase inward sync error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase inward sync exception:', e);
    return false;
  }
}

export async function deleteInwardFromCloud(inwardId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb || !inwardId) return false;
    const { error } = await sb.from('inward_shipments').delete().eq('id', inwardId);
    if (error) {
      console.warn('Supabase delete inward error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete inward exception:', e);
    return false;
  }
}

// ==========================================
// 3. DISPATCH LOTS MAPPINGS & CRUD
// ==========================================

export function mapRowToLot(row: any): DispatchLot {
  return {
    id: row.id,
    lotNumber: row.lot_number || '',
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    status: row.status || 'DISPATCHED',
    fromPlant: row.from_plant || 'Tata AutoComp Systems Limited - Varale / Chakan',
    consigneeName: row.consignee_name || '',
    consigneeAddress: row.consignee_address || '',
    consigneeGstin: row.consignee_gstin || undefined,
    vehicleNumber: row.vehicle_number || '',
    driverName: row.driver_name || undefined,
    driverMobile: row.driver_mobile || undefined,
    transportName: row.transport_name || '',
    lrNumber: row.lr_number || '',
    transportDocNo: row.transport_doc_no || '',
    packCount: Number(row.pack_count || 0),
    packs: Array.isArray(row.packs) ? row.packs : [],
    dispatchedBy: row.dispatched_by || '',
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    notes: row.notes || undefined,
  };
}

export function mapLotToRow(lot: DispatchLot): any {
  return {
    id: lot.id,
    lot_number: lot.lotNumber,
    timestamp: lot.timestamp || new Date().toISOString(),
    status: lot.status || 'DISPATCHED',
    from_plant: lot.fromPlant || 'Tata AutoComp Systems Limited - Varale / Chakan',
    consignee_name: lot.consigneeName,
    consignee_address: lot.consigneeAddress,
    consignee_gstin: lot.consigneeGstin || null,
    vehicle_number: lot.vehicleNumber,
    driver_name: lot.driverName || null,
    driver_mobile: lot.driverMobile || null,
    transport_name: lot.transportName,
    lr_number: lot.lrNumber,
    transport_doc_no: lot.transportDocNo,
    pack_count: lot.packCount,
    packs: lot.packs || [],
    dispatched_by: lot.dispatchedBy,
    approved_by: lot.approvedBy || null,
    approved_at: lot.approvedAt || null,
    notes: lot.notes || null,
  };
}

export async function fetchLotsFromCloud(): Promise<DispatchLot[] | null> {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.from('dispatch_lots').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetch lots warning:', error.message);
      return null;
    }
    return (data || []).map(mapRowToLot);
  } catch (e) {
    console.warn('Supabase fetch lots exception:', e);
    return null;
  }
}

export async function syncLotToCloud(lot: DispatchLot): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb) return false;
    const row = mapLotToRow(lot);
    const { error } = await sb.from('dispatch_lots').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase lot sync error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase lot sync exception:', e);
    return false;
  }
}

export async function deleteLotFromCloud(lotId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb || !lotId) return false;
    const { error } = await sb.from('dispatch_lots').delete().eq('id', lotId);
    if (error) {
      console.warn('Supabase delete lot error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete lot exception:', e);
    return false;
  }
}
