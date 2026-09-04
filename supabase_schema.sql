-- ==============================================================================
-- TATA AUTOCOMP SYSTEMS LIMITED (VARALE B300 PLANT)
-- LITHIUM BATTERY WAREHOUSE MANAGEMENT SYSTEM (WMS)
-- SUPABASE POSTGRESQL COMPLETE DATABASE SCHEMA & REALTIME SETUP
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: battery_packs (Master Battery Inventory & Traceability)
CREATE TABLE IF NOT EXISTS public.battery_packs (
    id TEXT PRIMARY KEY,
    pack_number TEXT NOT NULL,
    pack_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'INWARD_AREA',
    source_type TEXT DEFAULT 'INWARD', -- 'INWARD' (Delivery Challan) vs 'LINE_POPULATE' (Direct Line Matrix)
    is_without_plate BOOLEAN DEFAULT false,
    location_area TEXT DEFAULT 'Inward Area',
    current_location TEXT DEFAULT 'Inward Area',
    
    -- Inward Details
    inward_date TIMESTAMPTZ DEFAULT NOW(),
    document_no TEXT DEFAULT '',
    dealership_name TEXT DEFAULT '',
    received_state TEXT DEFAULT 'Maharashtra',
    transport_name TEXT DEFAULT '',
    remark TEXT DEFAULT '',
    has_inward_stamp BOOLEAN DEFAULT true,
    inward_by TEXT DEFAULT '',
    inward_approved_by TEXT,
    inward_approved_at TIMESTAMPTZ,
    
    -- Physical Storage Coordinates (Line & Rack)
    line_id TEXT,
    rack_number INTEGER,
    rack_slot INTEGER,
    
    -- Dispatch Ledger Details (Matching Tata Excel Sheet)
    dispatched_at TIMESTAMPTZ,
    dispatched_by TEXT,
    dispatch_lot_id TEXT,
    dispatch_doc_no TEXT,
    dispatch_lr_no TEXT,
    dispatch_vehicle_no TEXT,
    dispatch_transporter TEXT,
    dispatch_to_customer TEXT,
    dispatch_to_address TEXT,
    
    notes TEXT,
    movement_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: inward_shipments (Inward Delivery Challans & Origin Logs)
CREATE TABLE IF NOT EXISTS public.inward_shipments (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    document_no TEXT NOT NULL,
    dealership_name TEXT NOT NULL,
    received_state TEXT DEFAULT 'Maharashtra',
    transport_name TEXT DEFAULT '',
    pack_count INTEGER DEFAULT 0,
    pack_numbers TEXT[] DEFAULT '{}',
    pack_type_summary JSONB DEFAULT '{}'::jsonb,
    inward_by TEXT DEFAULT '',
    approved_by TEXT,
    has_inward_stamp BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'APPROVED',
    remark TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: dispatch_lots (Outward Vehicle Lots & Gate Passes)
CREATE TABLE IF NOT EXISTS public.dispatch_lots (
    id TEXT PRIMARY KEY,
    lot_number TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'DISPATCHED',
    from_plant TEXT DEFAULT 'Tata AutoComp Systems Limited - Varale / Chakan',
    consignee_name TEXT NOT NULL,
    consignee_address TEXT NOT NULL,
    consignee_gstin TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_mobile TEXT,
    transport_name TEXT,
    lr_number TEXT,
    transport_doc_no TEXT,
    pack_count INTEGER DEFAULT 0,
    packs JSONB DEFAULT '[]'::jsonb,
    dispatched_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: warehouse_users (Staff Authentication & Granular Permissions)
CREATE TABLE IF NOT EXISTS public.warehouse_users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    plant TEXT DEFAULT 'Tata AutoComp Systems Limited - Varale / Chakan',
    active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"canInward": true, "canDispatch": true, "canLineManage": false, "canViewStock": true, "canInvoices": false, "canAnalytics": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: system_config (Maintenance Mode & Warehouse Settings)
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_battery_packs_pack_num ON public.battery_packs (pack_number);
CREATE INDEX IF NOT EXISTS idx_battery_packs_status ON public.battery_packs (status);
CREATE INDEX IF NOT EXISTS idx_battery_packs_source_type ON public.battery_packs (source_type);
CREATE INDEX IF NOT EXISTS idx_battery_packs_line_rack ON public.battery_packs (line_id, rack_number);
CREATE INDEX IF NOT EXISTS idx_battery_packs_doc_no ON public.battery_packs (document_no);
CREATE INDEX IF NOT EXISTS idx_battery_packs_dispatched_at ON public.battery_packs (dispatched_at);
CREATE INDEX IF NOT EXISTS idx_inward_shipments_doc_no ON public.inward_shipments (document_no);
CREATE INDEX IF NOT EXISTS idx_dispatch_lots_lot_num ON public.dispatch_lots (lot_number);

-- 8. ROW LEVEL SECURITY (Enable Open Access for Anon Key)
ALTER TABLE public.battery_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inward_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access Battery Packs" ON public.battery_packs;
CREATE POLICY "Public Full Access Battery Packs" ON public.battery_packs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Inward Shipments" ON public.inward_shipments;
CREATE POLICY "Public Full Access Inward Shipments" ON public.inward_shipments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Dispatch Lots" ON public.dispatch_lots;
CREATE POLICY "Public Full Access Dispatch Lots" ON public.dispatch_lots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Users" ON public.warehouse_users;
CREATE POLICY "Public Full Access Users" ON public.warehouse_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Config" ON public.system_config;
CREATE POLICY "Public Full Access Config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- 9. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'battery_packs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.battery_packs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inward_shipments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inward_shipments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_lots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_lots;
    END IF;
END $$;

-- 10. INSERT DEFAULT USERS
INSERT INTO public.warehouse_users (username, password, name, role, plant, active, permissions)
VALUES
    ('Pranjils0ni', 'Suhani@12', 'Pranjil Soni', 'superadmin', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": true, "canViewStock": true, "canInvoices": true, "canAnalytics": true}'),
    ('Sureshchavan', 'Swami@123', 'Suresh Chavan', 'manager', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": true, "canViewStock": true, "canInvoices": true, "canAnalytics": true}'),
    ('Nitin', 'Nitin#123', 'Nitin Pawar', 'supervisor', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": true, "canViewStock": true, "canInvoices": true, "canAnalytics": true}'),
    ('Vikash', 'Vikash@123', 'Vikash Kumar Bharti', 'supervisor', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": true, "canViewStock": true, "canInvoices": true, "canAnalytics": true}'),
    ('Deepak', 'Deepak@123', 'Deepak Kumar', 'employee', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": false, "canViewStock": true, "canInvoices": false, "canAnalytics": false}'),
    ('Jitendra', 'Jitendra@123', 'Jitendra Soni', 'employee', 'Tata AutoComp Systems Limited - Varale / Chakan', true, '{"canInward": true, "canDispatch": true, "canLineManage": false, "canViewStock": true, "canInvoices": false, "canAnalytics": false}')
ON CONFLICT (username) DO NOTHING;
