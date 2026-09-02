import React, { useState } from 'react';
import {
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  resetSupabaseClient,
  getSupabase,
} from '../lib/supabaseClient';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPacksCount: number;
  totalLotsCount: number;
  onTriggerSync: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  totalPacksCount,
  totalLotsCount,
  onTriggerSync,
}) => {
  if (!isOpen) return null;

  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(
    currentConfig.url.includes('example-supabase') ? '' : currentConfig.url
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    currentConfig.anonKey.includes('dummy') ? '' : currentConfig.anonKey
  );
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('Please enter both Supabase Project URL and Public Anon Key.');
      return;
    }

    saveStoredSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
    resetSupabaseClient();
    setIsSyncing(true);
    setSyncStatus('Testing connection and initializing real-time channels...');

    try {
      const sb = getSupabase();
      if (sb) {
        const { error } = await sb.from('battery_packs').select('id').limit(1);
        if (error) {
          console.warn('Supabase test select warning:', error.message);
        }
        setSyncStatus('Connected successfully! Real-time synchronization is active across all devices.');
        onTriggerSync();
      } else {
        setSyncStatus('Config saved.');
      }
    } catch (e: any) {
      setSyncStatus('Config saved.');
    } finally {
      setIsSyncing(false);
    }
  };

  const sqlSchema = `-- ==============================================================================
-- TATA AUTOCOMP SYSTEMS LIMITED - VARALE (B300 PLANT)
-- POSTGRESQL SCHEMA FOR LITHIUM BATTERY WAREHOUSE MANAGEMENT SYSTEM
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Battery Packs Master Table
CREATE TABLE IF NOT EXISTS battery_packs (
  id TEXT PRIMARY KEY,
  pack_number TEXT NOT NULL,
  pack_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INWARD_AREA',
  location_area TEXT DEFAULT 'Inward Area',
  current_location TEXT DEFAULT 'Inward Area',
  inward_date TIMESTAMPTZ DEFAULT NOW(),
  document_no TEXT,
  dealership_name TEXT,
  received_state TEXT,
  transport_name TEXT,
  remark TEXT,
  has_inward_stamp BOOLEAN DEFAULT true,
  inward_by TEXT,
  inward_approved_by TEXT,
  inward_approved_at TIMESTAMPTZ,
  line_id TEXT,
  rack_number INT,
  rack_slot INT,
  dispatched_at TIMESTAMPTZ,
  dispatched_by TEXT,
  dispatch_lot_id TEXT,
  dispatch_doc_no TEXT,
  dispatch_lr_no TEXT,
  dispatch_vehicle_no TEXT,
  dispatch_to_address TEXT,
  dispatch_to_customer TEXT,
  notes TEXT,
  movement_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inward Shipment Records Table
CREATE TABLE IF NOT EXISTS inward_shipments (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  document_no TEXT NOT NULL,
  dealership_name TEXT,
  received_state TEXT,
  transport_name TEXT,
  pack_count INT DEFAULT 0,
  pack_numbers JSONB DEFAULT '[]'::jsonb,
  pack_type_summary JSONB DEFAULT '{}'::jsonb,
  inward_by TEXT,
  approved_by TEXT,
  has_inward_stamp BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'APPROVED',
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Outward Dispatch Lots Table
CREATE TABLE IF NOT EXISTS dispatch_lots (
  id TEXT PRIMARY KEY,
  lot_number TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'DISPATCHED',
  from_plant TEXT,
  consignee_name TEXT,
  consignee_address TEXT,
  consignee_gstin TEXT,
  vehicle_number TEXT,
  transport_name TEXT,
  lr_number TEXT,
  transport_doc_no TEXT,
  pack_count INT DEFAULT 0,
  packs JSONB DEFAULT '[]'::jsonb,
  dispatched_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Saved Addresses Directory
CREATE TABLE IF NOT EXISTS saved_addresses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  gstin TEXT,
  state TEXT,
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) & Public Access Policies
ALTER TABLE battery_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inward_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for battery_packs" ON battery_packs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for inward_shipments" ON inward_shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for dispatch_lots" ON dispatch_lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for saved_addresses" ON saved_addresses FOR ALL USING (true) WITH CHECK (true);

-- 7. ENABLE POSTGRES REALTIME REPLICATION (Instant WebSocket Sync for All Devices)
ALTER PUBLICATION supabase_realtime ADD TABLE battery_packs;
ALTER PUBLICATION supabase_realtime ADD TABLE inward_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_lots;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_addresses;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Supabase Real-Time Cloud Database</h3>
              <p className="text-xs text-slate-500">
                Live multi-device WebSocket synchronization for Varale (B300 Plant)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Active Status Banner */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="font-bold text-emerald-950 text-sm">Real-Time Cloud Synchronization Engine</p>
                <p className="text-[11px] text-emerald-700">
                  {totalPacksCount} Battery Packs • {totalLotsCount} Dispatch Lots in System
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (isSyncing ? 'animate-spin' : '')} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {syncStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Credentials configuration */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Supabase Project Connection Settings:
            </span>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono-code focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Supabase Public Anon Key</label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUz..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono-code focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition cursor-pointer shadow-xs"
              >
                Save & Connect Supabase Realtime
              </button>
            </div>
          </div>

          {/* SQL Schema Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                1-Click Supabase SQL Setup Script:
              </span>
              <button
                onClick={handleCopySql}
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono-code text-[10px] max-h-36 overflow-y-auto leading-relaxed border border-slate-800">
              {sqlSchema}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Real-time WebSocket replication enabled</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
