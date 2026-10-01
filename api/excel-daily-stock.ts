import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://eovoqayzvspkpzwpxxic.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9xYXl6dnNwa3B6d3B4eGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg3NDEsImV4cCI6MjEwMzkyNDc0MX0.WNVR3U12BN4aFQDb8E3nyoWlS_Vuo3NqLr_Wyg0SDek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Tata_Live_Daily_Stock.csv"');

    const { data: records, error } = await supabase
      .from('daily_stock_records')
      .select('*')
      .order('date', { ascending: false });

    const header = 'Date,Sr,Pack Name,Opening Stock,Receive Qty,Total Available,Dispatch Qty,Closing Stock,Maintained By\n';
    let csvContent = '\uFEFF' + header;

    if (records && records.length > 0) {
      records.forEach((rec: any) => {
        const rows = rec.rows || [];
        rows.forEach((r: any, rIdx: number) => {
          const row = [
            `"${rec.date || ''}"`,
            r.sr || rIdx + 1,
            `"${r.packName || ''}"`,
            r.openingStock || 0,
            r.receiveQty || 0,
            r.totalAvailable || 0,
            r.dispatchQty || 0,
            r.closingStock || 0,
            `"${r.maintainedBy || rec.created_by_name || 'Vikas'}"`,
          ];
          csvContent += row.join(',') + '\n';
        });
      });
    }

    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}
