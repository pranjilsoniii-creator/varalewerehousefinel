import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatteryPack, DispatchLot, InwardShipmentRecord, SavedAddress } from '../types';

// Default Supabase Config (Can be overridden dynamically via UI or .env)
const DEFAULT_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://eovoqayzvspkpzwpxxic.supabase.co';
const DEFAULT_SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const savedUrl = localStorage.getItem('tata_wms_supabase_url');
  const savedKey = localStorage.getItem('tata_wms_supabase_key');
  return {
    url: savedUrl || DEFAULT_SUPABASE_URL,
    anonKey: savedKey || DEFAULT_SUPABASE_KEY,
    connected: Boolean(savedUrl && savedKey && !savedUrl.includes('example-supabase')),
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem('tata_wms_supabase_url', url.trim());
  localStorage.setItem('tata_wms_supabase_key', anonKey.trim());
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || config.url.includes('example-supabase')) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client', e);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

// Helper: Map Database Row to Frontend BatteryPack
export function mapRowToPack(row: any): BatteryPack {
  return {
    id: row.id,
    packNumber: row.pack_number,
    packType: row.pack_type,
    status: row.status,
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
    location_area: p.locationArea,
    current_location: p.currentLocation || p.locationArea || 'Inward Area',
    inward_date: p.inwardDate,
    document_no: p.documentNo,
    dealership_name: p.dealershipName,
    received_state: p.receivedState,
    transport_name: p.transportName,
    remark: p.remark,
    has_inward_stamp: p.hasInwardStamp,
    inward_by: p.inwardBy,
    inward_approved_by: p.inwardApprovedBy,
    inward_approved_at: p.inwardApprovedAt,
    line_id: p.lineId,
    rack_number: p.rackNumber,
    rack_slot: p.rackSlot,
    dispatched_at: p.dispatchedAt,
    dispatched_by: p.dispatchedBy,
    dispatch_lot_id: p.dispatchLotId,
    dispatch_doc_no: p.dispatchDocNo,
    dispatch_lr_no: p.dispatchLrNo,
    dispatch_vehicle_no: p.dispatchVehicleNo,
    dispatch_to_address: p.dispatchToAddress,
    dispatch_to_customer: p.dispatchToCustomer,
    notes: p.notes,
    movement_history: p.movementHistory || [],
    updated_at: new Date().toISOString(),
  };
}

// Cloud Database CRUD & Realtime Handlers
export async function syncPacksToCloud(packs: BatteryPack[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const rows = packs.map(mapPackToRow);
    const { error } = await sb.from('battery_packs').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase packs upsert error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync exception:', e);
    return false;
  }
}

export async function fetchPacksFromCloud(): Promise<BatteryPack[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('battery_packs').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      console.error('Supabase fetch error:', error);
      return null;
    }
    return data.map(mapRowToPack);
  } catch (e) {
    console.error('Supabase fetch exception:', e);
    return null;
  }
}

export async function syncLotToCloud(lot: DispatchLot): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
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
      packs: lot.packs,
      dispatched_by: lot.dispatchedBy,
      approved_by: lot.approvedBy,
      approved_at: lot.approvedAt,
      notes: lot.notes,
    };
    const { error } = await sb.from('dispatch_lots').upsert([row], { onConflict: 'id' });
    return !error;
  } catch (e) {
    console.error('Supabase sync lot exception:', e);
    return false;
  }
}

export async function syncInwardToCloud(record: InwardShipmentRecord): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const row = {
      id: record.id,
      timestamp: record.timestamp,
      document_no: record.documentNo,
      dealership_name: record.dealershipName,
      received_state: record.receivedState,
      transport_name: record.transportName,
      pack_count: record.packCount,
      pack_numbers: record.packNumbers,
      pack_type_summary: record.packTypeSummary,
      inward_by: record.inwardBy,
      approved_by: record.approvedBy,
      has_inward_stamp: record.hasInwardStamp,
      status: record.status,
      remark: record.remark,
    };
    const { error } = await sb.from('inward_shipments').upsert([row], { onConflict: 'id' });
    return !error;
  } catch (e) {
    console.error('Supabase sync inward exception:', e);
    return false;
  }
}
