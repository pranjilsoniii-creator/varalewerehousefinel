import * as XLSX from 'xlsx';
import { BatteryPack, DispatchLot, InwardShipmentRecord, InvoiceData } from '../types';
import { BATTERY_MODELS, getShortPackTypeName } from '../data/batteryCatalog';

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
    const statusLabel = p.status === 'DISPATCHED'
      ? `Dispatched (${p.dispatchToCustomer || 'EV Plant'})`
      : p.status === 'PENDING_APPROVAL'
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
      'Location Area': p.status === 'DISPATCHED'
        ? `Dispatched (${p.dispatchToCustomer || 'EV Plant'})`
        : p.status === 'IN_STORAGE'
        ? `Line ${p.lineId} (R-${p.rackNumber || 1}, Slot ${p.rackSlot || 1})`
        : (p.locationArea || 'Inward Area'),
      'Dispatched Date': p.dispatchedAt ? new Date(p.dispatchedAt).toLocaleString('en-IN') : '—',
      'Dispatched Customer': p.dispatchToCustomer || '—',
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
 * High-Precision Excel Export for Line Storage Sheet (Exact OpenPyXL Plant Form Architecture)
 * Matches the user's official Python openpyxl template:
 * - 4 Groups of (Rack No., Battery pack No., Description) = 12 columns
 * - Each Rack = 4 individual rows for Slots 1-4 with merged Rack No. & Description
 * - Row 1: TATA AUTOCOMP SYSTEM LIMITED + Crate / Box No.
 * - Row 2: TOTAL BATTERY PACKS NO. + TOTAL ROWS + LINE NO. + DATE
 * - Row 3: Table Column Headers
 * - Rows 4-43: 40 Grid Rows (10 Racks x 4 Slots)
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

  // Calculate maximum occupied rack (e.g. 38)
  let maxRack = 0;
  Object.entries(rackMap).forEach(([rStr, pList]) => {
    if (pList && pList.length > 0) {
      const rNum = parseInt(rStr, 10);
      if (rNum > maxRack) maxRack = rNum;
    }
  });
  if (maxRack === 0) maxRack = 38;

  const GROUPS = 4;
  const RACKS_PER_GROUP = 10;
  const todayStr = new Date().toLocaleDateString('en-GB');

  // Build 2D Array (AOA)
  const aoa: any[][] = [];

  // Row 1 (Excel Row 1): Title Banner
  aoa.push([
    'TATA AUTOCOMP SYSTEM LIMITED', '', '', '', '', '', '', '', '', '',
    'Crate / Box No.', `Line ${lineId}`
  ]);

  // Row 2 (Excel Row 2): Totals, Line No, Date
  aoa.push([
    'TOTAL BATTERY PACKS NO.', '', linePacks.length,
    'TOTAL ROWS -', '', maxRack,
    'LINE NO.', lineId, '',
    'DATE', todayStr, ''
  ]);

  // Row 3 (Excel Row 3): Column Headers (12 columns)
  const headerRow: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    headerRow.push('Rack No.', 'Battery pack No.', 'Description');
  }
  aoa.push(headerRow);

  // Rows 4 to 43 (Excel Rows 4 to 43): 10 Racks x 4 Slots = 40 rows
  const merges: any[] = [
    // Row 1: A1:J1 for Title
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    // Row 2: A2:B2 for TOTAL BATTERY PACKS NO.
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    // Row 2: D2:E2 for TOTAL ROWS -
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
    // Row 2: H2:I2 for LINE NO.
    { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },
    // Row 2: K2:L2 for DATE
    { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } },
  ];

  // Populate 40 body rows
  for (let k = 0; k < RACKS_PER_GROUP; k++) {
    for (let slot = 0; slot < 4; slot++) {
      const rowCells: any[] = [];

      for (let g = 0; g < GROUPS; g++) {
        const rackNum = g * RACKS_PER_GROUP + k + 1;
        const rPacks = rackMap[rackNum] || [];
        const packInSlot = rPacks.find((p) => p.rackSlot === slot + 1);

        // Rack No (Only put value in first slot row of the rack)
        if (slot === 0) {
          rowCells.push(rackNum <= maxRack ? rackNum : (rackNum <= 40 ? rackNum : ''));
        } else {
          rowCells.push('');
        }

        // Battery Pack No in this slot
        if (packInSlot) {
          let str = packInSlot.packNumber;
          if (packInSlot.secondaryStickerNumber) str += ` (${packInSlot.secondaryStickerNumber})`;
          const shortType = getShortPackTypeName(packInSlot.packType);
          str += ` ${shortType}`;
          if (packInSlot.remark) str += ` [${packInSlot.remark}]`;
          rowCells.push(str);
        } else {
          rowCells.push(rackNum <= maxRack && rPacks.length > 0 ? '—' : '');
        }

        // Description (Model)
        if (slot === 0) {
          const modelName = rPacks.length > 0
            ? (BATTERY_MODELS[rPacks[0].packType]?.shortCode || BATTERY_MODELS[rPacks[0].packType]?.name || rPacks[0].packType || 'Kanger1.0')
            : (rackNum <= maxRack ? 'Kanger1.0' : '');
          rowCells.push(modelName);
        } else {
          rowCells.push('');
        }
      }

      aoa.push(rowCells);
    }

    // Add 4-row vertical merges for Rack No. and Description for each rack
    const r0 = 3 + k * 4; // 0-indexed row (Row 4 in Excel is index 3)
    for (let g = 0; g < GROUPS; g++) {
      const c0 = g * 3;
      // Merge Rack No column over 4 rows
      merges.push({ s: { r: r0, c: c0 }, e: { r: r0 + 3, c: c0 } });
      // Merge Description column over 4 rows
      merges.push({ s: { r: r0, c: c0 + 2 }, e: { r: r0 + 3, c: c0 + 2 } });
    }
  }

  // Row 44 (Excel Footer): Prepared by Jitendra Soni & Plant Verification
  const footerRowIdx = aoa.length;
  aoa.push([
    'PREPARED BY: JITENDRA SONI', '', '',
    'VERIFIED BY: PLANT QUALITY INCHARGE', '', '',
    'TATA AUTOCOMP SYSTEMS LTD • VARALE B300 PLANT', '', '',
    'PRINTED DATE:', todayStr, ''
  ]);

  merges.push(
    { s: { r: footerRowIdx, c: 0 }, e: { r: footerRowIdx, c: 2 } },
    { s: { r: footerRowIdx, c: 3 }, e: { r: footerRowIdx, c: 5 } },
    { s: { r: footerRowIdx, c: 6 }, e: { r: footerRowIdx, c: 8 } },
    { s: { r: footerRowIdx, c: 10 }, e: { r: footerRowIdx, c: 11 } }
  );

  const wb = XLSX.utils.book_new();
  const wsSheet = XLSX.utils.aoa_to_sheet(aoa);

  wsSheet['!merges'] = merges;

  // 12 Column dimensions matching Python: [10, 17, 17] x 4
  wsSheet['!cols'] = [
    { wch: 10 }, { wch: 18 }, { wch: 18 },
    { wch: 10 }, { wch: 18 }, { wch: 18 },
    { wch: 10 }, { wch: 18 }, { wch: 18 },
    { wch: 10 }, { wch: 18 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSheet, 'Battery Pack Form');

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

