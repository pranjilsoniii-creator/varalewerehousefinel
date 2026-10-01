import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://eovoqayzvspkpzwpxxic.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Tata_Live_Inward_Register.csv"');

    const { data: packs, error } = await supabase
      .from('battery_packs')
      .select('*')
      .order('inward_date', { ascending: false });

    const header = 'Sr. No,Inward Date,Pack Number,Model,Document No,Dealership / Supplier,Received State,Transporter,Vehicle No,Status,Remark,Inward By\n';
    let csvContent = '\uFEFF' + header;

    if (packs && packs.length > 0) {
      packs.forEach((p: any, idx: number) => {
        const row = [
          idx + 1,
          `"${p.inward_date || ''}"`,
          `"${p.pack_number || ''}"`,
          `"${p.pack_type || ''}"`,
          `"${p.document_no || ''}"`,
          `"${p.dealership_name || ''}"`,
          `"${p.received_state || 'Maharashtra'}"`,
          `"${p.transport_name || ''}"`,
          `"${p.vehicle_number || ''}"`,
          `"${p.status || ''}"`,
          `"${(p.remark || 'OK').replace(/"/g, '""')}"`,
          `"${p.inward_by || 'Vikas'}"`,
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}
