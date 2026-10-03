import * as XLSX from 'xlsx';
import { BatteryPack, DispatchLot, InwardShipmentRecord, InvoiceData } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

export function exportInventoryToExcel(packs: BatteryPack[], filename = 'Tata_Battery_Warehouse_Inventory.xlsx') {
  const data = packs.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    return {
      'Sr No': index + 1,
      'Pack Number': p.packNumber,
      'Model / Pack Type': model?.name || p.packType,
      'Category': model?.category || 'Tata Lithium',
      'Remark': p.remark || '—',
      'Location Line': p.status === 'IN_STORAGE' ? p.lineId : (p.status === 'IN_DISPATCH_AREA' ? 'Dispatch Bay' : p.locationArea || 'Inward Area'),
      'Rack No': p.status === 'IN_STORAGE' ? 'R-' + (p.rackNumber || 1) : '-',
      'Slot (Level 1-4)': p.status === 'IN_STORAGE' ? 'Level ' + (p.rackSlot || 1) : '-',
      'Status': p.status,
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '-',
      'Document / Challan No': p.documentNo || '-',
      'Dealership / Source': p.dealershipName || '-',
      'Transport Company': p.transportName || '-',
      'Tata Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Inwarded By': p.inwardBy || '-',
      'Approved By': p.inwardApprovedBy || '-',
      'Dispatched Date': p.dispatchedAt ? new Date(p.dispatchedAt).toLocaleString('en-IN') : '-',
      'Destination Consignee': p.dispatchToCustomer || p.dispatchToAddress || '-',
      'Vehicle Number': p.dispatchVehicleNo || '-',
      'LR Number': p.dispatchLrNo || '-',
      'Document Number': p.dispatchDocNo || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Warehouse Inventory');
  XLSX.writeFile(wb, filename);
}

export function exportInwardShipmentsToExcel(shipments: InwardShipmentRecord[], filename = 'Tata_Inward_Shipment_Log.xlsx') {
  const data = shipments.map((s, index) => ({
    'Sr No': index + 1,
    'Inward Date & Time': new Date(s.timestamp).toLocaleString('en-IN'),
    'Document / Invoice No': s.documentNo,
    'Dealership / Source': s.dealershipName,
    'Received State': s.receivedState,
    'Transport Name': s.transportName,
    'Packs Received': s.packCount,
    'Pack Numbers': Array.isArray(s.packNumbers) ? s.packNumbers.join(', ') : '',
    'Received / Inwarded By': s.inwardBy,
    'Approved By': s.approvedBy || '-',
    'Tata Stamp Verified': s.hasInwardStamp ? 'YES' : 'NO',
    'Status': s.status,
    'Remark / Notes': s.remark || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inward Shipments');
  XLSX.writeFile(wb, filename);
}

export function exportInwardRegisterPacksToExcel(packs: BatteryPack[], filename = 'Tata_Inward_Packs_Ledger.xlsx') {
  const data = packs.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    const modelName = p.packType === 'Limber_Non_Ais' || p.packType === 'Limber_Ais' 
      ? 'Limber_Ais' 
      : (model?.name || p.packType);
    const statusLabel = p.status === 'PENDING_APPROVAL'
      ? 'Pending Approval'
      : p.status === 'IN_STORAGE'
      ? `Allocated (Line ${p.lineId || 1})`
      : 'Inward Area';

    return {
      'Sr No': index + 1,
      'Pack Number': p.packNumber,
      'Model': modelName,
      'Remark': p.remark || '—',
      'Document / Challan No': p.documentNo || '—',
      'Dealership / Source Supplier': p.dealershipName || '—',
      'Received State & City': p.receivedState || 'Maharashtra',
      'Transporter Carrier': p.transportName || '—',
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '—',
      'Tata Inward Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Current Status': statusLabel,
      'Location Area': p.status === 'IN_STORAGE'
        ? `Line ${p.lineId} (R-${p.rackNumber || 1}, Slot ${p.rackSlot || 1})`
        : (p.locationArea || 'Inward Area'),
      'Inwarded By': p.inwardBy || '—',
      'Approved By': p.inwardApprovedBy || '—',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inward Packs Ledger');
  XLSX.writeFile(wb, filename);
}

export function exportDispatchLotsToExcel(lots: DispatchLot[], filename = 'Tata_Battery_Dispatch_Lots.xlsx') {
  const rows: any[] = [];
  
  lots.forEach((lot) => {
    (lot.packs || []).forEach((pack) => {
      const model = BATTERY_MODELS[pack.packType];
      rows.push({
        'Lot Number': lot.lotNumber,
        'Dispatch Date': new Date(lot.timestamp).toLocaleString('en-IN'),
        'Consignee Name': lot.consigneeName,
        'Destination Address': lot.consigneeAddress,
        'Consignee GSTIN': lot.consigneeGstin || '-',
        'Vehicle Number': lot.vehicleNumber,
        'Transport Carrier': lot.transportName,
        'LR / Bilty No': lot.lrNumber,
        'Document Number': lot.transportDocNo,
        'Pack Number': pack.packNumber,
        'Model Type': model?.name || pack.packType,
        'Remark': pack.remark || '-',
        'Dispatched By': lot.dispatchedBy || '-',
        'Approved By': lot.approvedBy || '-',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Lots');
  XLSX.writeFile(wb, filename);
}

export function exportInvoiceToExcel(invoice: InvoiceData, filename?: string) {
  const itemsData = (invoice.items || []).map((it, idx) => ({
    'S.No': idx + 1,
    'Description of Goods': it.description,
    'HSN/SAC': it.hsnCode,
    'Quantity': it.quantity,
    'Unit': 'NOS',
    'Rate (INR)': it.unitPrice || it.ratePerUnit || 0,
    'Taxable Amount (INR)': it.taxableAmount || it.amount || 0,
    'Total Amount': (it.quantity || 1) * (it.unitPrice || it.ratePerUnit || 0),
  }));

  const ws = XLSX.utils.json_to_sheet(itemsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tax Invoice');
  XLSX.writeFile(wb, filename || 'Tata_Invoice_' + invoice.invoiceNumber + '.xlsx');
}

/**
 * High-Precision Excel Export for Line Storage Sheet (Exact 4-Column Plant Crate Sheet + Detailed Inventory)
 * 100% matches the physical wooden crate sheet at Tata AutoComp plant
 */
export function exportLineSheetToExcel(
  lineId: string,
  packs: BatteryPack[],
  filename?: string
) {
  const linePacks = packs.filter(
    (p) => p.status !== 'DISPATCHED' && p.lineId === lineId
  );

  // Group packs by Rack Number (1 to 40)
  const rackMap: Record<number, BatteryPack[]> = {};
  for (let r = 1; r <= 40; r++) {
    rackMap[r] = [];
  }
  linePacks.forEach((p) => {
    if (p.rackNumber) {
      if (!rackMap[p.rackNumber]) rackMap[p.rackNumber] = [];
      rackMap[p.rackNumber].push(p);
    }
  });

  // Calculate maximum occupied rack (e.g. 38 if packs up to 38)
  let maxRack = 0;
  Object.entries(rackMap).forEach(([rStr, pList]) => {
    if (pList && pList.length > 0) {
      const rNum = parseInt(rStr, 10);
      if (rNum > maxRack) maxRack = rNum;
    }
  });
  if (maxRack === 0) maxRack = 38;

  // 1. Sheet 1: 4-Column Plant Crate Matrix Sheet
  const aoa: any[][] = [];

  // Row 1: Header - TATA AUTOCOMP SYSTEM PVT LTD | Line {lineId}
  aoa.push([
    'TATA AUTOCOMP SYSTEM PVT LTD', '', '',
    '', '', '',
    '', '', '',
    `Line ${lineId}`, '', ''
  ]);

  // Row 2: Sub-Header - TOTAL BATTERY PACKS NO. | {count} | TOTAL ROWS - {maxRack}
  aoa.push([
    'TOTAL BATTERY PACKS NO.', '', '',
    '', '', linePacks.length,
    `TOTAL ROWS - ${maxRack}`, '', '',
    '', '', ''
  ]);

  // Row 3: 4 Column Group Headers
  aoa.push([
    'Rack No.', 'Battery pack No.', 'Discription',
    'Sr.No.', 'Battery pack No.', 'Discription',
    'Sr.No.', 'Battery pack No.', 'Discription',
    'Sr.No.', 'Battery pack No.', 'Discription'
  ]);

  // Rows 4 to 13: 10 rows (Col 1: Racks 1-10, Col 2: Racks 11-20, Col 3: Racks 21-30, Col 4: Racks 31-40)
  const rowsPerCol = 10;
  for (let r = 0; r < rowsPerCol; r++) {
    const rowCells: any[] = [];
    for (let col = 0; col < 4; col++) {
      const rackNum = col * rowsPerCol + r + 1;
      const rPacks = rackMap[rackNum] || [];

      // Rack / Sr No
      rowCells.push(rackNum <= maxRack ? rackNum : (rackNum <= 40 ? rackNum : ''));

      // 4 Stacked Pack Numbers separated by newline
      const packStrings = [1, 2, 3, 4]
        .map((slot) => {
          const p = rPacks.find((x) => x.rackSlot === slot);
          if (!p) return '';
          let str = p.packNumber;
          if (p.secondaryStickerNumber) str += ` (${p.secondaryStickerNumber})`;
          if (p.remark) str += ` [${p.remark}]`;
          return str;
        })
        .filter(Boolean);

      rowCells.push(packStrings.length > 0 ? packStrings.join('\r\n') : (rackNum <= maxRack ? '—' : ''));

      // Description (Model name, e.g. Kanger1.0)
      const desc = rPacks.length > 0
        ? (BATTERY_MODELS[rPacks[0].packType]?.shortCode || BATTERY_MODELS[rPacks[0].packType]?.name || rPacks[0].packType || 'Kanger1.0')
        : (rackNum <= maxRack ? 'Kanger1.0' : '');
      rowCells.push(rPacks.length > 0 ? desc : (rackNum <= maxRack ? '—' : ''));
    }
    aoa.push(rowCells);
  }

  const wb = XLSX.utils.book_new();

  const wsSheet = XLSX.utils.aoa_to_sheet(aoa);

  // Merges for headers
  wsSheet['!merges'] = [
    // Row 1: A1:I1 for TATA title, J1:L1 for Line badge
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 0, c: 9 }, e: { r: 0, c: 11 } },
    // Row 2: A2:E2 for TOTAL BATTERY PACKS, F2 for count, G2:L2 for TOTAL ROWS
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 5 } },
    { s: { r: 1, c: 6 }, e: { r: 1, c: 11 } },
  ];

  // Column widths
  wsSheet['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 15 },
    { wch: 10 }, { wch: 22 }, { wch: 15 },
    { wch: 10 }, { wch: 22 }, { wch: 15 },
    { wch: 10 }, { wch: 22 }, { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSheet, `Line ${lineId} Sheet`);

  // 2. Sheet 2: Detailed Line Inventory (Every individual battery pack)
  const detailRows = linePacks.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    return {
      'Sr No': index + 1,
      'Line ID': `Line ${lineId}`,
      'Rack Number': p.rackNumber ? `R-${String(p.rackNumber).padStart(2, '0')}` : '—',
      'Slot Level': p.rackSlot ? `Level ${p.rackSlot}` : '—',
      'Battery Pack No': p.packNumber,
      '2nd Sticker / Barcode': p.secondaryStickerNumber || '—',
      'Model Name': model?.name || p.packType,
      'Category': model?.category || 'Tata Lithium',
      'Quality / Inward Remark': p.remark || '—',
      'Location Code': `${lineId}-R${p.rackNumber || 1}-L${p.rackSlot || 1}`,
      'Status': p.status,
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '—',
      'Tata Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Inwarded By': p.inwardBy || '—',
      'Approved By': p.inwardApprovedBy || '—',
    };
  });

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, `Line ${lineId} Inventory`);

  const safeFilename = filename || `Tata_WMS_Line_${lineId}_Storage_Sheet_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

