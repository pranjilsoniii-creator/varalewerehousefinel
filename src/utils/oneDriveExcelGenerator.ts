import * as XLSX from 'xlsx';
import { BatteryPack, InwardShipmentRecord, DispatchLot, DailyStockRecord } from '../types';

export function generateOneDriveMasterExcel(
  packs: BatteryPack[],
  inwardShipments: InwardShipmentRecord[],
  dispatchLots: DispatchLot[],
  dailyStockRecords: DailyStockRecord[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Master Battery Inventory & Movement Ledger (Live Warehouse Data)
  const masterRows = (packs || []).map((pack, index) => {
    const recordDate = pack.inwardDate || pack.dispatchedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const lineStr = pack.lineId ? `${pack.lineId}` : 'Unassigned';
    const rackStr = pack.rackNumber ? `R-${pack.rackNumber} (L-${pack.rackSlot || 1})` : (pack.currentLocation || 'Staging Area');

    return {
      'S.No': index + 1,
      'Date (Tarikh)': recordDate,
      'Pack Number': pack.packNumber,
      'Battery Model': pack.packType,
      'Storage Line': lineStr,
      'Rack / Position': rackStr,
      'Status': pack.status,
      'Source Type': pack.sourceType || 'INWARD',
      'Inward Document / DC': pack.documentNo || '-',
      'Inward Date': pack.inwardDate || '-',
      'Inward Transporter': pack.transportName || '-',
      'Inward Vehicle': pack.vehicleNumber || '-',
      'Dispatch Lot ID': pack.dispatchLotId || '-',
      'Dispatch DC No': pack.dispatchDocNo || '-',
      'Dispatch LR No': pack.dispatchLrNo || '-',
      'Dispatch Date': pack.dispatchedAt || '-',
      'Consignee Customer': pack.dispatchToCustomer || '-',
      'Dispatch Vehicle': pack.dispatchVehicleNo || '-',
      'Pack Remark / QC Note': pack.remark || 'OK',
      'Inward Recorded By': pack.inwardBy || 'Vikas Kumar Bharti',
      'Dispatched By': pack.dispatchedBy || '-',
    };
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);

  wsMaster['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 26 },
    { wch: 20 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsMaster, 'Live_Warehouse_Inventory');

  // 2. Sheet 2: Daily Stock Maintenance Register
  const stockRows = (dailyStockRecords || []).map((rec, i) => ({
    'S.No': i + 1,
    'Date (Tarikh)': rec.date,
    'Total Opening Stock': rec.totalOpeningStock ?? 0,
    'Total Received Today': rec.totalReceivedToday ?? 0,
    'Total Dispatch Today': rec.totalDispatchToday ?? 0,
    'Total Closing Stock': rec.totalClosingStock ?? 0,
    'Maintained By': rec.createdByName || 'Vikas',
    'Record Status': rec.isLocked ? 'LOCKED (Manager Verified)' : 'ACTIVE',
    'Created At': rec.createdAt || '-',
    'Last Updated At': rec.updatedAt || '-',
  }));

  const wsStock = XLSX.utils.json_to_sheet(
    stockRows.length > 0
      ? stockRows
      : [
          {
            'S.No': 1,
            'Date (Tarikh)': new Date().toISOString().slice(0, 10),
            'Total Opening Stock': packs.filter((p) => p.status !== 'DISPATCHED').length,
            'Total Received Today': 0,
            'Total Dispatch Today': 0,
            'Total Closing Stock': packs.filter((p) => p.status !== 'DISPATCHED').length,
            'Maintained By': 'Vikas Kumar Bharti',
            'Record Status': 'ACTIVE',
            'Created At': new Date().toISOString(),
            'Last Updated At': new Date().toISOString(),
          },
        ]
  );

  wsStock['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, wsStock, 'Daily_Stock_Register');

  // 3. Sheet 3: Inward Shipments Log
  const inwardRows = (inwardShipments || []).map((inw, i) => ({
    'S.No': i + 1,
    'Inward Timestamp': inw.timestamp || '-',
    'Document / DC No': inw.documentNo || '-',
    'Source / Dealership': inw.dealershipName || '-',
    'Transporter': inw.transportName || '-',
    'Total Packs Received': inw.packCount || (inw.packNumbers ? inw.packNumbers.length : 0),
    'Pack Numbers': (inw.packNumbers || []).join(', '),
    'Status': inw.status || 'APPROVED',
    'Inward Category': inw.isCustomerReturn ? 'CUSTOMER_RETURN' : 'STANDARD_SUPPLY',
    'Return Reason': inw.returnReason || '-',
    'Inward By': inw.inwardBy || 'Vikas',
    'General Remark': inw.remark || '-',
  }));

  if (inwardRows.length > 0) {
    const wsInward = XLSX.utils.json_to_sheet(inwardRows);
    wsInward['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
      { wch: 22 },
      { wch: 20 },
      { wch: 36 },
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInward, 'Inward_Shipments_Log');
  }

  // 4. Sheet 4: Outward Dispatch Lots Log
  const dispatchRows = (dispatchLots || []).map((lot, i) => ({
    'S.No': i + 1,
    'Dispatch Timestamp': lot.timestamp || '-',
    'Lot Number': lot.lotNumber || '-',
    'Consignee / Customer': lot.consigneeName || '-',
    'Transporter': lot.transportName || '-',
    'Vehicle Number': lot.vehicleNumber || '-',
    'LR Number': lot.lrNumber || '-',
    'Transport Doc / DC': lot.transportDocNo || '-',
    'Total Packs Dispatched': lot.packCount || (lot.packs ? lot.packs.length : 0),
    'Status': lot.status || 'DISPATCHED',
    'Dispatched By': lot.dispatchedBy || 'Vikas',
    'Remarks': lot.notes || '-',
  }));

  if (dispatchRows.length > 0) {
    const wsDispatch = XLSX.utils.json_to_sheet(dispatchRows);
    wsDispatch['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 18 },
      { wch: 26 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDispatch, 'Outward_Dispatch_Log');
  }

  // 5. Sheet 5: OneDrive Realtime Sync Instructions
  const guideRows = [
    {
      'Step': 'STEP 1',
      'Action': 'Upload File to OneDrive',
      'Instructions': 'Drag & Drop this "Tata_AutoComp_WMS_Master_Live_Sync.xlsx" file into your Microsoft OneDrive or SharePoint folder.',
    },
    {
      'Step': 'STEP 2',
      'Action': 'Share View-Only Link with Team',
      'Instructions': 'Right-click file in OneDrive -> Share -> Choose "People in your org" or "Anyone with link" -> Select "Can view" -> Copy Link and send to Suresh Sir and Management.',
    },
    {
      'Step': 'STEP 3',
      'Action': 'Realtime Web Refresh (Zero Click)',
      'Instructions': 'In Excel, click "Data" tab -> "From Web" -> Paste the Live Feed URL from WMS App -> Data updates automatically every time sheet opens.',
    },
    {
      'Step': 'STEP 4',
      'Action': 'One-Click Push Button in App',
      'Instructions': 'Whenever Suresh Sir or Admin clicks "Push to OneDrive" in the WMS App, today\'s new records are automatically transmitted and appended.',
    },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'OneDrive_Sync_Instructions');

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tata_AutoComp_WMS_Master_Live_Sync_${dateStr}.xlsx`);
}
