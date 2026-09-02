-- ==============================================================================
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
ALTER PUBLICATION supabase_realtime ADD TABLE saved_addresses;
