import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Copy,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { BatteryPack } from '../types';
import { generateQrDataUrl, generateQrSvg, generateQrPngDataUrl } from '../utils/qrCodeGenerator';
import { getProductNameAndType, getShortPackTypeName } from '../data/batteryCatalog';
import { RACKS_PER_LINE } from '../data/seedWarehouse';
import { exportLineSheetToExcel } from '../utils/excelExport';

interface LinePrintAndQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLine: string;
  packs: BatteryPack[];
  warehouseLines: string[];
  onSelectLine?: (line: string) => void;
}

export type PaperSize = 'A4_LANDSCAPE' | 'A4_PORTRAIT' | 'A3_LANDSCAPE';

export const LinePrintAndQRModal: React.FC<LinePrintAndQRModalProps> = ({
  isOpen,
  onClose,
  selectedLine,
  packs,
  warehouseLines,
  onSelectLine,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4_LANDSCAPE');
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentLine, setCurrentLine] = useState(selectedLine || 'A-01');

  // Keep synced if prop changes
  React.useEffect(() => {
    if (selectedLine) setCurrentLine(selectedLine);
  }, [selectedLine]);

  // Packs in current line
  const linePacks = useMemo(() => {
    return packs.filter((p) => p.status !== 'DISPATCHED' && p.lineId === currentLine);
  }, [packs, currentLine]);

  // Primary model summary for the top banner
  const primaryModelName = useMemo(() => {
    if (linePacks.length === 0) return 'Kanger 1.0 (AIO)';
    const modelCounts: Record<string, number> = {};
    linePacks.forEach((p) => {
      const { productName } = getProductNameAndType(p.packType);
      modelCounts[productName] = (modelCounts[productName] || 0) + 1;
    });
    let topModel = 'Kanger 1.0 (AIO)';
    let maxCount = 0;
    Object.entries(modelCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topModel = name;
      }
    });
    return topModel;
  }, [linePacks]);

  // Map of active packs by Rack Number (1 to 40 or 1 to RACKS_PER_LINE)
  const rackMap = useMemo(() => {
    const map: Record<number, BatteryPack[]> = {};
    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      map[r] = [];
    }
    linePacks.forEach((p) => {
      if (p.rackNumber) {
        if (!map[p.rackNumber]) map[p.rackNumber] = [];
        map[p.rackNumber].push(p);
      }
    });
    return map;
  }, [linePacks]);

  // Calculate highest occupied rack number (e.g. 38 if packs up to 38, or 14 if up to 14)
  const maxOccupiedRack = useMemo(() => {
    let max = 0;
    Object.entries(rackMap).forEach(([rackStr, pList]) => {
      const list = pList as BatteryPack[];
      if (list && list.length > 0) {
        const rNum = parseInt(rackStr, 10);
        if (rNum > max) max = rNum;
      }
    });
    return max > 0 ? Math.min(max, RACKS_PER_LINE) : 38;
  }, [rackMap]);

  // Number of columns adapted to paper size and density
  const numColumns = useMemo(() => {
    if (paperSize === 'A4_PORTRAIT') {
      return maxOccupiedRack <= 18 ? 2 : 3;
    }
    // A4_LANDSCAPE or A3_LANDSCAPE
    return 4;
  }, [paperSize, maxOccupiedRack]);

  // Racks per column to perfectly distribute all racks
  const racksPerCol = useMemo(() => {
    return Math.max(1, Math.ceil(maxOccupiedRack / numColumns));
  }, [maxOccupiedRack, numColumns]);

  // Dynamic typography and spacing density
  const density = useMemo<'spacious' | 'balanced' | 'compact'>(() => {
    if (racksPerCol <= 5) return 'spacious';
    if (racksPerCol <= 8) return 'balanced';
    return 'compact';
  }, [racksPerCol]);

  // Generate column groupings matching occupied racks and fill any short column to ensure exact alignment
  const columnGroups = useMemo(() => {
    const totalRacksToShow = maxOccupiedRack;
    const cols: Array<Array<{ rackNumber: number; packs: BatteryPack[]; isEmptyPlaceholder?: boolean }>> = [];

    for (let c = 0; c < numColumns; c++) {
      cols.push([]);
    }

    for (let i = 1; i <= totalRacksToShow; i++) {
      const colIdx = Math.min(Math.floor((i - 1) / racksPerCol), numColumns - 1);
      cols[colIdx].push({
        rackNumber: i,
        packs: rackMap[i] || [],
      });
    }

    // Pad any shorter columns with placeholder rows up to racksPerCol so all columns have exact identical height & bottom alignment
    cols.forEach((col) => {
      while (col.length < racksPerCol) {
        col.push({
          rackNumber: 0,
          packs: [],
          isEmptyPlaceholder: true,
        });
      }
    });

    return cols;
  }, [rackMap, maxOccupiedRack, numColumns, racksPerCol]);

  // Public URL for QR Code (Direct public access without login)
  const publicUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/?line=${encodeURIComponent(currentLine)}`;
  }, [currentLine]);

  // QR Code Data URL (Standard crisp SVG)
  const qrDataUrl = useMemo(() => {
    return generateQrDataUrl(publicUrl, 260);
  }, [publicUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printSheet = document.getElementById('tata-line-printable-sheet');
    if (!printSheet) {
      window.print();
      return;
    }

    // Remove any previous print iframe
    const existingIframe = document.getElementById('tata-line-print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    // Create a dedicated off-screen iframe for guaranteed 100% clean 1-page printing
    const iframe = document.createElement('iframe');
    iframe.id = 'tata-line-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = paperSize === 'A4_PORTRAIT' ? '850px' : '1150px';
    iframe.style.height = paperSize === 'A4_PORTRAIT' ? '1150px' : '850px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Collect all loaded stylesheets and style tags
    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      stylesHtml += el.outerHTML;
    });

    const pageOrientationRule =
      paperSize === 'A4_PORTRAIT'
        ? '@page { size: portrait; margin: 3.5mm !important; }'
        : paperSize === 'A3_LANDSCAPE'
        ? '@page { size: 420mm 297mm; margin: 4mm !important; }'
        : '@page { size: landscape; margin: 3.5mm !important; }';

    const headerHeightPx = density === 'spacious' ? '24px' : density === 'balanced' ? '20px' : '17px';

    const customPrintCss = `
      <style>
        ${pageOrientationRule}
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
          font-variant-numeric: normal !important;
          font-feature-settings: "zero" 0 !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          font-family: 'Alatsi', 'Arial', 'Segoe UI', 'Inter', -apple-system, sans-serif !important;
          font-variant-numeric: normal !important;
          font-feature-settings: "zero" 0 !important;
        }
        #tata-line-printable-sheet {
          width: 100% !important;
          max-width: 100% !important;
          height: 98.5vh !important;
          max-height: 98.5vh !important;
          margin: 0 auto !important;
          padding: 2mm !important;
          box-sizing: border-box !important;
          border: 2px solid #000 !important;
          box-shadow: none !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: #ffffff !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          font-family: 'Alatsi', 'Arial', 'Segoe UI', 'Inter', -apple-system, sans-serif !important;
          font-variant-numeric: normal !important;
          font-feature-settings: "zero" 0 !important;
        }
        .grid-stretch-container {
          display: grid !important;
          grid-template-columns: repeat(${numColumns}, minmax(0, 1fr)) !important;
          gap: 3px !important;
          flex: 1 1 0% !important;
          height: 100% !important;
          min-height: 0 !important;
        }
        .col-stretch-box {
          border: 1.5px solid #000 !important;
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          background: #ffffff !important;
        }
        table.sheet-table {
          border-collapse: collapse !important;
          width: 100% !important;
          height: 100% !important;
          table-layout: fixed !important;
        }
        table.sheet-table thead {
          height: ${headerHeightPx} !important;
        }
        table.sheet-table tbody {
          height: calc(100% - ${headerHeightPx}) !important;
        }
        table.sheet-table tbody tr {
          height: calc(100% / ${racksPerCol}) !important;
        }
        th, td {
          border-color: #000000 !important;
        }
      </style>
    `;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Tata AutoComp Line ${currentLine} Stock Matrix</title>
          ${stylesHtml}
          ${customPrintCss}
        </head>
        <body style="background: #ffffff; margin: 0; padding: 0;">
          ${printSheet.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Trigger print after iframe renders
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error, fallback to window.print', err);
        window.print();
      }
    }, 300);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadQrSvg = () => {
    const svgStr = generateQrSvg(publicUrl, 500);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;utf8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tata-WMS-Line-${currentLine}-QR.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadQrPng = async () => {
    const pngUrl = await generateQrPngDataUrl(publicUrl, 600);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `Tata-WMS-Line-${currentLine}-QR.png`;
    a.click();
  };

  const handleDownloadExcel = () => {
    exportLineSheetToExcel(currentLine, packs);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:static print:inset-auto print:bg-transparent print:p-0 print:m-0 print:overflow-visible">
      {/* High-Precision Print Styles for Guaranteed 1-Page Output Across Chrome & Mobile */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'A4_PORTRAIT' ? 'portrait' : paperSize === 'A3_LANDSCAPE' ? '420mm 297mm' : 'landscape'};
            margin: 3.5mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, nav, footer, button {
            display: none !important;
          }
          #tata-line-printable-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 98.5vh !important;
            max-height: 98.5vh !important;
            margin: 0 auto !important;
            padding: 1.5mm !important;
            box-sizing: border-box !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
          }
          .grid-stretch-container {
            display: grid !important;
            grid-template-columns: repeat(${numColumns}, minmax(0, 1fr)) !important;
            gap: 3px !important;
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
          }
          .col-stretch-box {
            border: 1.5px solid #000 !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            min-height: 0 !important;
          }
          table.sheet-table {
            border-collapse: collapse !important;
            width: 100% !important;
            height: 100% !important;
            table-layout: fixed !important;
          }
          table.sheet-table thead {
            height: ${density === 'spacious' ? '24px' : density === 'balanced' ? '20px' : '17px'} !important;
          }
          table.sheet-table tbody {
            height: calc(100% - ${density === 'spacious' ? '24px' : density === 'balanced' ? '20px' : '17px'}) !important;
          }
          table.sheet-table tbody tr {
            height: calc(100% / ${racksPerCol}) !important;
          }
        }
      `}</style>

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-fadeIn print:shadow-none print:border-none print:max-h-none print:overflow-visible print:w-full">
        {/* Modal Header Controls (Hidden during print) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Tata AutoComp Line Print & QR Hub
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                  Line {currentLine}
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold">
                  {numColumns} Cols × {racksPerCol} Racks • Auto-Stretch Fill
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Official Plant Rack Sheet • 1-Page Fit ({maxOccupiedRack} Rows, {linePacks.length} Packs)
              </p>
            </div>
          </div>

          {/* Line Switcher */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Line:</label>
            <select
              value={currentLine}
              onChange={(e) => {
                setCurrentLine(e.target.value);
                if (onSelectLine) onSelectLine(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {warehouseLines.map((line) => (
                <option key={line} value={line}>
                  Line {line} ({packs.filter((p) => p.status !== 'DISPATCHED' && p.lineId === line).length} packs)
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size Selector & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPaperSize('A4_LANDSCAPE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  paperSize === 'A4_LANDSCAPE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Landscape (4 Col)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A4_PORTRAIT')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  paperSize === 'A4_PORTRAIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Portrait ({numColumns === 2 ? '2 Col' : '3 Col'})
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A3_LANDSCAPE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  paperSize === 'A3_LANDSCAPE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A3 Master
              </button>
            </div>

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Line Stock Matrix with OpenPyXL Architecture in Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Copy Public Read-Only URL"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'Copied' : 'URL'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="px-2.5 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Download High-Res QR PNG Image"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>QR PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet (1-Page)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Sheet Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-100 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          {/* Paper Sheet Preview (Matches Exact Physical Tata Wooden Crate Sheet Layout & Guarantees 1-Page Fit) */}
          <div
            id="tata-line-printable-sheet"
            className={`bg-white shadow-lg border-2 border-black p-2 sm:p-3 text-black font-sans transition-all flex flex-col justify-between print:shadow-none print:p-2 ${
              paperSize === 'A4_PORTRAIT'
                ? 'w-full max-w-[760px] min-h-[750px]'
                : paperSize === 'A3_LANDSCAPE'
                ? 'w-full max-w-[1150px] min-h-[650px]'
                : 'w-full max-w-[1050px] min-h-[620px]'
            }`}
          >
            {/* 1. MASTER HEADER: TATA AUTOCOMP SYSTEM PVT LTD + LINE BADGE */}
            <div className="border-2 border-black rounded-xs overflow-hidden mb-1.5 flex-shrink-0">
              <div className="flex items-center justify-between border-b-2 border-black px-2.5 py-1 bg-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-white p-0.5 rounded border border-black flex items-center justify-center flex-shrink-0">
                    <img src="/tata-logo.png" alt="TATA" className="h-5 w-5 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-sm sm:text-base font-black tracking-wider text-black uppercase font-display leading-tight">
                      TATA AUTOCOMP SYSTEM PVT LTD
                    </h1>
                    <p className="text-[8px] font-bold text-slate-700 uppercase tracking-wider leading-none">
                      Varale (B300 Plant) Lithium Battery Warehouse • Storage Matrix
                    </p>
                  </div>
                </div>

                {/* Line Identification Badge (e.g. A-10) */}
                <div className="bg-black text-white px-3.5 py-0.5 rounded-xs border border-black font-black text-lg sm:text-xl tracking-widest uppercase">
                  {currentLine}
                </div>
              </div>

              {/* 2. SUB-HEADER: TOTAL BATTERY PACKS NO. + TOTAL ROWS + MODEL */}
              <div className="grid grid-cols-3 divide-x-2 divide-black text-center text-[9px] font-bold bg-white">
                <div className="py-0.5 px-1.5 flex items-center justify-center gap-1">
                  <span className="text-slate-700 uppercase text-[8px]">TOTAL BATTERY PACKS:</span>
                  <span className="text-xs font-black text-black">{linePacks.length}</span>
                </div>
                <div className="py-0.5 px-1.5 flex items-center justify-center gap-1">
                  <span className="text-slate-700 uppercase text-[8px]">TOTAL ROWS / RACKS:</span>
                  <span className="text-xs font-black text-black">{maxOccupiedRack}</span>
                </div>
                <div className="py-0.5 px-1.5 flex items-center justify-center gap-1 bg-slate-50">
                  <span className="text-slate-700 uppercase text-[8px]">PRIMARY MODEL:</span>
                  <span className="text-[9px] font-black text-blue-900 uppercase truncate">{primaryModelName}</span>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC STRETCH TABLE GRID (Height 100% stretched with crisp Excel grid lining) */}
            <div
              className="grid-stretch-container border-2 border-black p-0.5 bg-white flex-1 overflow-hidden"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
                gap: '3px',
                height: '100%',
              }}
            >
              {columnGroups.map((colGroup, colIdx) => (
                <div key={colIdx} className="col-stretch-box border-2 border-black flex flex-col h-full bg-white">
                  <table className="sheet-table w-full text-left border-collapse leading-none h-full" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className={`bg-slate-200 text-black border-b-2 border-black font-black uppercase ${
                        density === 'spacious' ? 'text-[10px] h-6' : density === 'balanced' ? 'text-[9px] h-5' : 'text-[8px] h-4'
                      }`}>
                        <th className="p-0.5 border-r-2 border-black text-center w-8 sm:w-10">
                          {colIdx === 0 ? 'Rack' : 'Sr.'}
                        </th>
                        <th className="p-0.5 border-r-2 border-black text-center">Battery pack No.</th>
                        <th className="p-0.5 text-center w-14 sm:w-16">Model</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black h-full">
                      {colGroup.map((item, rowIdx) => {
                        if (item.isEmptyPlaceholder) {
                          return (
                            <tr key={`empty-${rowIdx}`} className="bg-slate-50/30" style={{ height: `calc(100% / ${racksPerCol})` }}>
                              <td className="p-0 border-r-2 border-black text-center font-bold align-middle bg-slate-100 text-slate-300 w-8 sm:w-10">
                                —
                              </td>
                              <td className="p-0 border-r-2 border-black align-middle text-center">
                                <div className="h-full flex flex-col justify-around divide-y divide-slate-200">
                                  {[1, 2, 3, 4].map((s) => (
                                    <div key={s} className="h-1/4 flex items-center justify-center text-slate-300 text-[8px] italic">
                                      Empty Level {s}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-0 text-center align-middle text-slate-300 text-[8px] w-14 sm:w-16">
                                —
                              </td>
                            </tr>
                          );
                        }

                        const rackPacks = item.packs;
                        // Sort by slot 1,2,3,4
                        const sortedPacks = [1, 2, 3, 4].map((s) => rackPacks.find((p) => p.rackSlot === s));
                        const hasAnyPack = rackPacks.length > 0;

                        return (
                          <tr
                            key={item.rackNumber}
                            className="hover:bg-slate-50"
                            style={{ height: `calc(100% / ${racksPerCol})` }}
                          >
                            {/* 1. Rack Number Cell (Prominent & Lined) */}
                            <td className={`p-0.5 border-r-2 border-black text-center font-black align-middle bg-slate-100 text-black w-8 sm:w-10 ${
                              density === 'spacious'
                                ? 'text-base sm:text-lg'
                                : density === 'balanced'
                                ? 'text-sm sm:text-base'
                                : 'text-xs sm:text-sm'
                            }`}>
                              {item.rackNumber}
                            </td>

                            {/* 2. 4 Distinct Excel-Style Lined Slot Rows (Levels 1 to 4) */}
                            <td className="p-0 border-r-2 border-black align-middle font-sans h-full">
                              <div className="h-full flex flex-col justify-stretch divide-y divide-black/80">
                                {sortedPacks.map((pack, sIdx) => {
                                  if (!pack) {
                                    return (
                                      <div
                                        key={sIdx}
                                        className="flex-1 flex items-center justify-between px-1.5 bg-slate-50/20 text-slate-300"
                                        style={{ minHeight: '0' }}
                                      >
                                        <span className="text-[7.5px] italic text-slate-400 font-sans">L{sIdx + 1}: Empty</span>
                                        <span className="text-[7px] text-slate-300 font-sans">—</span>
                                      </div>
                                    );
                                  }
                                  const shortType = getShortPackTypeName(pack.packType);
                                  return (
                                    <div
                                      key={pack.id || sIdx}
                                      className="flex-1 flex items-center justify-between px-1.5 sm:px-2 gap-1 leading-none bg-white"
                                      style={{ minHeight: '0' }}
                                    >
                                      {/* Pack Serial Number (Large, Bold, Sharp Font) */}
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className={`text-black font-black tracking-tight font-sans ${
                                          density === 'spacious'
                                            ? 'text-sm sm:text-base'
                                            : density === 'balanced'
                                            ? 'text-xs sm:text-[13px]'
                                            : 'text-[10px] sm:text-[11px]'
                                        }`}>
                                          {pack.packNumber}
                                        </span>
                                        {pack.secondaryStickerNumber && (
                                          <span className="text-[7.5px] text-slate-600 font-normal font-sans">
                                            ({pack.secondaryStickerNumber})
                                          </span>
                                        )}
                                      </div>

                                      {/* Pack Name Badge (CKD, FBU, AIO, GEN3, etc. - Solid Black Badge) */}
                                      <span className={`font-black uppercase tracking-wider font-sans px-1.5 py-0.5 rounded border border-black bg-black text-white flex-shrink-0 ${
                                        density === 'spacious'
                                          ? 'text-[10px]'
                                          : density === 'balanced'
                                          ? 'text-[8.5px]'
                                          : 'text-[7.5px]'
                                      }`}>
                                        {shortType}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            {/* 3. Description / Model Cell */}
                            <td className={`p-0.5 text-center font-black align-middle text-slate-900 uppercase leading-tight w-14 sm:w-16 bg-slate-50/40 ${
                              density === 'spacious'
                                ? 'text-[11px]'
                                : density === 'balanced'
                                ? 'text-[9.5px]'
                                : 'text-[8px]'
                            }`}>
                              {hasAnyPack ? (
                                <span>{getProductNameAndType(rackPacks[0].packType).productType || 'Kanger1.0'}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* 4. FOOTER WITH QR CODE + PLANT INFO & SUBTLE PREPARED BY */}
            <div className="mt-1.5 pt-1 border-t-2 border-black flex items-center justify-between gap-2 text-slate-800 flex-shrink-0">
              {/* Left: QR Code */}
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 p-0.5 bg-white border border-black flex items-center justify-center shadow-2xs flex-shrink-0">
                  <img src={qrDataUrl} alt={`QR Code for Line ${currentLine}`} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-black uppercase text-[8px] leading-tight">Instant Mobile Scan QR Code</p>
                  <p className="text-[7px] text-slate-600 leading-tight">Scan with phone camera to view live stock of Line {currentLine}</p>
                  <p className="text-[6.5px] font-sans text-slate-500 leading-none">{publicUrl}</p>
                </div>
              </div>

              {/* Right: Plant Information & Subtle Prepared By */}
              <div className="text-right leading-tight">
                <p className="font-bold text-black text-[8.5px] uppercase">Tata AutoComp Systems Limited</p>
                <p className="text-[7px] text-slate-600">Varale (B300 Plant) • Lithium Battery Division</p>
                <p className="text-[6.5px] text-slate-500 mt-0.5">
                  Prepared By: <span className="font-bold text-black">Jitendra Soni</span> • Printed: {new Date().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
