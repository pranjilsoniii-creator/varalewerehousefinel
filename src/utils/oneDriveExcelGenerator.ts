import * as XLSX from 'xlsx';
import { BatteryPack, InwardShipmentRecord, DispatchLot, DailyStockRecord } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

// 1. DEDICATED INWARD REGISTER EXCEL FILE
export function generateOneDriveInwardExcel(packs: BatteryPack[], inwardShipments?: InwardShipmentRecord[]): void {
  const wb = XLSX.utils.book_new();

  // Filter packs to Inward Received only
  const inwardPacks = (packs || []).filter(
    (p) => p.sourceType !== 'LINE_POPULATE' && p.sourceType !== 'DIRECT_DISPATCH' && p.documentNo !== 'DIRECT-DISPATCH'
  );

  const inwardRows = inwardPacks.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    const modelName = model?.name || p.packType;
    const locationStr = p.status === 'IN_STORAGE' 
      ? `Line ${p.lineId || '01'} (R-${p.rackNumber || 1}, Slot ${p.rackSlot || 1})`
      : (p.currentLocation || p.locationArea || 'Inward Receiving Area');

    const statusStr = p.status === 'PENDING_APPROVAL' 
      ? 'Pending Approval' 
      : p.status === 'IN_STORAGE' 
      ? 'Allocated in Rack' 
      : p.status === 'DISPATCHED'
      ? 'Dispatched'
      : 'Inward Area';

    return {
      'Sr. No': index + 1,
      'Inward Date': p.inwardDate || '-',
      'Pack Number': p.packNumber,
      'Battery Model': modelName,
      'Document / DC No': p.documentNo || '-',
      'Dealership / Source Supplier': p.dealershipName || '-',
      'Received State': p.receivedState || 'Maharashtra',
      'Transporter Carrier': p.transportName || '-',
      'Vehicle Number': p.vehicleNumber || '-',
      'Location / Physical Rack': locationStr,
      'Status': statusStr,
      'Tata Stamp Verified': p.hasInwardStamp ? 'YES (Verified)' : 'NO',
      'Pack Remark / Quality Note': p.remark || 'OK',
      'Recorded By': p.inwardBy || 'Vikas Kumar Bharti',
    };
  });

  const ws = XLSX.utils.json_to_sheet(inwardRows);
  ws['!cols'] = [
    { wch: 8 },  // Sr
    { wch: 14 }, // Date
    { wch: 16 }, // Pack No
    { wch: 22 }, // Model
    { wch: 22 }, // DC No
    { wch: 26 }, // Dealership
    { wch: 16 }, // State
    { wch: 22 }, // Transporter
    { wch: 16 }, // Vehicle
    { wch: 26 }, // Location
    { wch: 18 }, // Status
    { wch: 18 }, // Stamp
    { wch: 26 }, // Remark
    { wch: 22 }, // Recorded By
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Inward_Register_Log');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tata_AutoComp_Inward_Register_${dateStr}.xlsx`);
}

// 2. DEDICATED OUTWARD DISPATCH REGISTER EXCEL FILE
export function generateOneDriveDispatchExcel(dispatchLots: DispatchLot[], packs?: BatteryPack[]): void {
  const wb = XLSX.utils.book_new();

  const dispatchRows = (dispatchLots || []).map((lot, index) => {
    const packNumbersList = lot.packs && lot.packs.length > 0 
      ? lot.packs.map(p => p.packNumber).join(', ')
      : (lot.notes || '-');

    return {
      'Sr. No': index + 1,
      'Dispatch Date': lot.timestamp ? lot.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
      'Delivery Challan (DC No)': lot.transportDocNo || '-',
      'LR Number': lot.lrNumber || '-',
      'Lot Number': lot.lotNumber || '-',
      'Consignee / Destination': lot.consigneeName || '-',
      'Transporter Company': lot.transportName || '-',
      'Vehicle Number': lot.vehicleNumber || '-',
      'Total Packs Count': lot.packCount || (lot.packs ? lot.packs.length : 0),
      'Dispatched Battery Pack Numbers': packNumbersList,
      'Dispatch Status': lot.status || 'DISPATCHED',
      'Supervisor / Dispatched By': lot.dispatchedBy || 'Vikas',
      'Dispatch Remarks': lot.notes || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(dispatchRows.length > 0 ? dispatchRows : [
    {
      'Sr. No': 1,
      'Dispatch Date': new Date().toISOString().slice(0, 10),
      'Delivery Challan (DC No)': 'DCVRL/26-27-0001',
      'LR Number': 'LR-89410',
      'Lot Number': 'LOT-2026-001',
      'Consignee / Destination': 'Tata Motors Plant - Sanand / Pune',
      'Transporter Company': 'OM Logistics supply chain',
      'Vehicle Number': 'MH-14-GH-4821',
      'Total Packs Count': 0,
      'Dispatched Battery Pack Numbers': 'No lots dispatched today',
      'Dispatch Status': 'DISPATCHED',
      'Supervisor / Dispatched By': 'Vikas',
      'Dispatch Remarks': 'Standard Dispatch',
    }
  ]);

  ws['!cols'] = [
    { wch: 8 },  // Sr
    { wch: 14 }, // Date
    { wch: 24 }, // DC No
    { wch: 18 }, // LR No
    { wch: 18 }, // Lot No
    { wch: 28 }, // Consignee
    { wch: 24 }, // Transporter
    { wch: 18 }, // Vehicle
    { wch: 16 }, // Count
    { wch: 40 }, // Pack Numbers
    { wch: 16 }, // Status
    { wch: 22 }, // Supervisor
    { wch: 26 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Outward_Dispatch_Register');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tata_AutoComp_Dispatch_Register_${dateStr}.xlsx`);
}

// 3. DEDICATED DAILY STOCK MAINTENANCE EXCEL FILE
export function generateOneDriveDailyStockExcel(dailyStockRecords: DailyStockRecord[]): void {
  const wb = XLSX.utils.book_new();

  const stockRows: any[] = [];
  (dailyStockRecords || []).forEach((rec) => {
    (rec.rows || []).forEach((row, rowIdx) => {
      stockRows.push({
        'Date': rec.date,
        'Sr': row.sr || rowIdx + 1,
        'Pack Name': row.packName,
        'Opening Stock': row.openingStock ?? 0,
        'Receive Qty (Inward)': row.receiveQty ?? 0,
        'Total Available': row.totalAvailable ?? (Number(row.openingStock || 0) + Number(row.receiveQty || 0)),
        'Dispatch Qty (Outward)': row.dispatchQty ?? 0,
        'Closing Stock': row.closingStock ?? 0,
        'Maintained By': row.maintainedBy || rec.createdByName || 'Vikas',
        'Record Status': rec.isLocked ? 'LOCKED (Manager Verified)' : 'ACTIVE',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(stockRows.length > 0 ? stockRows : [
    {
      'Date': new Date().toISOString().slice(0, 10),
      'Sr': 1,
      'Pack Name': 'Kanger 1.0 AIO',
      'Opening Stock': 0,
      'Receive Qty (Inward)': 0,
      'Total Available': 0,
      'Dispatch Qty (Outward)': 0,
      'Closing Stock': 0,
      'Maintained By': 'Vikas',
      'Record Status': 'ACTIVE',
    }
  ]);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 6 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Daily_Stock_Maintenance');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tata_AutoComp_Daily_Stock_${dateStr}.xlsx`);
}

// 4. CONSOLIDATED ALL-IN-ONE MASTER EXCEL WORKBOOK (For OneDrive)
export function generateOneDriveMasterExcel(
  packs: BatteryPack[],
  inwardShipments: InwardShipmentRecord[],
  dispatchLots: DispatchLot[],
  dailyStockRecords: DailyStockRecord[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Inward Register
  const inwardPacks = (packs || []).filter(
    (p) => p.sourceType !== 'LINE_POPULATE' && p.sourceType !== 'DIRECT_DISPATCH' && p.documentNo !== 'DIRECT-DISPATCH'
  );
  const inwardRows = inwardPacks.map((p, index) => ({
    'Sr. No': index + 1,
    'Inward Date': p.inwardDate || '-',
    'Pack Number': p.packNumber,
    'Battery Model': BATTERY_MODELS[p.packType]?.name || p.packType,
    'Document / DC No': p.documentNo || '-',
    'Dealership / Source Supplier': p.dealershipName || '-',
    'Received State': p.receivedState || 'Maharashtra',
    'Transporter Carrier': p.transportName || '-',
    'Vehicle Number': p.vehicleNumber || '-',
    'Rack / Position': p.currentLocation || 'Inward Area',
    'Status': p.status,
    'Pack Remark / Quality Note': p.remark || 'OK',
    'Recorded By': p.inwardBy || 'Vikas',
  }));
  const wsInward = XLSX.utils.json_to_sheet(inwardRows);
  wsInward['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsInward, 'Inward_Register');

  // Sheet 2: Outward Dispatch Register
  const dispatchRows = (dispatchLots || []).map((lot, index) => ({
    'Sr. No': index + 1,
    'Dispatch Date': lot.timestamp ? lot.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
    'Delivery Challan (DC No)': lot.transportDocNo || '-',
    'LR Number': lot.lrNumber || '-',
    'Lot Number': lot.lotNumber || '-',
    'Consignee Customer': lot.consigneeName || '-',
    'Transporter': lot.transportName || '-',
    'Vehicle Number': lot.vehicleNumber || '-',
    'Packs Count': lot.packCount || (lot.packs ? lot.packs.length : 0),
    'Dispatched Pack Serials': lot.packs ? lot.packs.map(p => p.packNumber).join(', ') : '-',
    'Dispatched By': lot.dispatchedBy || 'Vikas',
    'Remarks': lot.notes || '-',
  }));
  const wsDispatch = XLSX.utils.json_to_sheet(dispatchRows);
  wsDispatch['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 36 }, { wch: 20 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsDispatch, 'Outward_Dispatch_Register');

  // Sheet 3: Daily Stock Register
  const stockRows: any[] = [];
  (dailyStockRecords || []).forEach((rec) => {
    (rec.rows || []).forEach((row, rowIdx) => {
      stockRows.push({
        'Date': rec.date,
        'Sr': row.sr || rowIdx + 1,
        'Pack Name': row.packName,
        'Opening Stock': row.openingStock ?? 0,
        'Receive Qty': row.receiveQty ?? 0,
        'Total Available': row.totalAvailable ?? 0,
        'Dispatch Qty': row.dispatchQty ?? 0,
        'Closing Stock': row.closingStock ?? 0,
        'Maintained By': row.maintainedBy || rec.createdByName || 'Vikas',
      });
    });
  });
  const wsStock = XLSX.utils.json_to_sheet(stockRows);
  wsStock['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsStock, 'Daily_Stock_Register');

  // Sheet 4: Complete Warehouse Master Inventory
  const masterRows = (packs || []).map((p, index) => ({
    'Sr. No': index + 1,
    'Pack Number': p.packNumber,
    'Model': BATTERY_MODELS[p.packType]?.name || p.packType,
    'Location': p.currentLocation || 'Inward Area',
    'Status': p.status,
    'Inward Date': p.inwardDate || '-',
    'Inward DC': p.documentNo || '-',
    'Dispatch Date': p.dispatchedAt || '-',
    'Dispatch DC': p.dispatchDocNo || '-',
    'Consignee': p.dispatchToCustomer || '-',
    'Remark': p.remark || 'OK',
  }));
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wsMaster['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All_Warehouse_Packs');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tata_AutoComp_WMS_All_In_One_Master_${dateStr}.xlsx`);
}
