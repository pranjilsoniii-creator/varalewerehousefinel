import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://eovoqayzvspkpzwpxxic.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Tata_Live_Dispatch_Register.csv"');

    const { data: lots, error } = await supabase
      .from('dispatch_lots')
      .select('*')
      .order('timestamp', { ascending: false });

    const header = 'Sr. No,Dispatch Date,Delivery Challan (DC No),LR Number,Lot Number,Consignee / Customer,Transporter,Vehicle Number,Packs Count,Supervisor,Remarks\n';
    let csvContent = '\uFEFF' + header;

    if (lots && lots.length > 0) {
      lots.forEach((lot: any, idx: number) => {
        const row = [
          idx + 1,
          `"${lot.timestamp ? lot.timestamp.slice(0, 10) : ''}"`,
          `"${lot.transport_doc_no || lot.document_no || ''}"`,
          `"${lot.lr_number || ''}"`,
          `"${lot.lot_number || ''}"`,
          `"${lot.consignee_name || ''}"`,
          `"${lot.transport_name || ''}"`,
          `"${lot.vehicle_number || ''}"`,
          lot.pack_count || 0,
          `"${lot.dispatched_by || 'Vikas'}"`,
          `"${(lot.notes || '').replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}
