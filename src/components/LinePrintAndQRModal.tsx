import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  X,
  Layers,
  FileSpreadsheet,
  Share2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { BatteryPack } from '../types';
import { generateQrDataUrl, generateQrSvg, generateQrPngDataUrl } from '../utils/qrCodeGenerator';
import { getProductNameAndType } from '../data/batteryCatalog';
import { MAX_PACKS_PER_RACK, RACKS_PER_LINE } from '../data/seedWarehouse';
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
    // If line has packs, show up to highest occupied rack (at least 4 for 1 per col), otherwise default 38
    return max > 0 ? Math.min(max, RACKS_PER_LINE) : 38;
  }, [rackMap]);

  // Generate 4-column groupings matching the exact 4-column physical crate sheet (10 rows per col)
  const columnGroups = useMemo(() => {
    const rowsPerCol = 10;
    const cols: Array<Array<{ rackNumber: number; packs: BatteryPack[] }>> = [[], [], [], []];
    for (let col = 0; col < 4; col++) {
      for (let r = 0; r < rowsPerCol; r++) {
        const rackNum = col * rowsPerCol + r + 1;
        cols[col].push({
          rackNumber: rackNum,
          packs: rackMap[rackNum] || [],
        });
      }
    }
    return cols;
  }, [rackMap]);

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
    const printableElement = document.getElementById('tata-line-printable-sheet');
    if (!printableElement) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe so ONLY the sheet is printed and ZERO background website content is included
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const isPortrait = paperSize === 'A4_PORTRAIT';
    const isA3 = paperSize === 'A3_LANDSCAPE';
    const pageCss = isA3 ? 'A3 landscape' : isPortrait ? 'A4 portrait' : 'A4 landscape';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TATA AUTOCOMP SYSTEM LIMITED - Line ${currentLine}</title>
          <style>
            @page {
              size: ${pageCss};
              margin: 3mm !important;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
            }
            .sheet-isolated {
              width: 100% !important;
              height: 98vh !important;
              max-height: 98vh !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              border: 2px solid #000 !important;
              padding: 1.5mm !important;
              background: #ffffff !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border-color: #000000 !important;
            }
          </style>
        </head>
        <body>
          <div class="sheet-isolated">
            ${printableElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Wait for images (QR code, logo) to settle in iframe then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print error', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
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

  const todayStr = new Date().toLocaleDateString('en-GB');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:static print:inset-auto print:bg-transparent print:p-0 print:m-0 print:overflow-visible">
      {/* High-Precision Print Styles for Fallback Native Print */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'A4_PORTRAIT' ? 'portrait' : paperSize === 'A3_LANDSCAPE' ? 'A3 landscape' : 'A4 landscape'};
            margin: 3mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: auto !important;
            max-height: 100vh !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, nav, footer, button, #root > :not(.fixed) {
            display: none !important;
          }
          #tata-line-printable-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 98vh !important;
            max-height: 98vh !important;
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
        }
      `}</style>

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden animate-fadeIn print:shadow-none print:border-none print:max-h-none print:overflow-visible print:w-full">
        {/* Modal Header Controls (Hidden during print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Tata AutoComp Line Print & QR Hub
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                  Line {currentLine}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official Plant Rack Sheet • 1-Page Isolated Print ({maxOccupiedRack} Rows, {linePacks.length} Packs)
              </p>
            </div>
          </div>

          {/* Line Switcher */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Switch Line:</label>
            <select
              value={currentLine}
              onChange={(e) => {
                setCurrentLine(e.target.value);
                if (onSelectLine) onSelectLine(e.target.value);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                A4 Landscape
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
              <button
                type="button"
                onClick={() => setPaperSize('A4_PORTRAIT')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  paperSize === 'A4_PORTRAIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Portrait
              </button>
            </div>

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Line Stock Matrix with OpenPyXL Formula Layout in Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Copy Public Read-Only URL"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Public URL'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Download High-Res QR PNG Image"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>Download PNG QR</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQrSvg}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Download Scalable Vector QR SVG"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>SVG QR</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet (Isolated 1-Page)</span>
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
              paperSize === 'A4_LANDSCAPE' || paperSize === 'A3_LANDSCAPE'
                ? 'w-full max-w-[1050px]'
                : 'w-full max-w-[750px]'
            }`}
          >
            {/* 1. MASTER HEADER: TATA AUTOCOMP SYSTEM LIMITED + CRATE / BOX NO */}
            <div className="border-2 border-black overflow-hidden mb-1 flex-shrink-0">
              <div className="flex items-center justify-between border-b-2 border-black px-3 py-1 bg-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 bg-white p-0.5 rounded border border-black flex items-center justify-center flex-shrink-0">
                    <img src="/tata-logo.png" alt="TATA" className="h-5 w-5 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-wider text-black uppercase font-display leading-tight">
                      TATA AUTOCOMP SYSTEM LIMITED
                    </h1>
                  </div>
                </div>

                {/* Crate / Box No Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-700 uppercase">Crate / Box No.</span>
                  <div className="bg-black text-white px-3 py-0.5 rounded-xs border border-black font-black text-base sm:text-lg tracking-widest uppercase">
                    {currentLine}
                  </div>
                </div>
              </div>

              {/* 2. SUB-HEADER: TOTAL BATTERY PACKS NO. + TOTAL ROWS + LINE NO + DATE */}
              <div className="grid grid-cols-12 divide-x-2 divide-black text-center text-[8.5px] sm:text-[9.5px] font-bold bg-white border-collapse">
                <div className="col-span-3 py-1 px-1 flex items-center justify-center font-black uppercase text-slate-800">
                  TOTAL BATTERY PACKS NO.
                </div>
                <div className="col-span-1 py-1 px-1 flex items-center justify-center font-black text-xs sm:text-sm text-black bg-slate-50 border-r-2 border-black">
                  {linePacks.length}
                </div>
                <div className="col-span-2 py-1 px-1 flex items-center justify-center font-black uppercase text-slate-800">
                  TOTAL ROWS -
                </div>
                <div className="col-span-1 py-1 px-1 flex items-center justify-center font-black text-xs sm:text-sm text-black bg-slate-50 border-r-2 border-black">
                  {maxOccupiedRack}
                </div>
                <div className="col-span-1 py-1 px-1 flex items-center justify-center font-black uppercase text-slate-800">
                  LINE NO.
                </div>
                <div className="col-span-2 py-1 px-1 flex items-center justify-center font-black text-xs sm:text-sm text-blue-900 bg-slate-50 border-r-2 border-black">
                  {currentLine}
                </div>
                <div className="col-span-1 py-1 px-1 flex items-center justify-center font-black uppercase text-slate-800">
                  DATE
                </div>
                <div className="col-span-1 py-1 px-1 flex items-center justify-center font-mono font-bold text-[8.5px] text-black bg-slate-50">
                  {todayStr}
                </div>
              </div>
            </div>

            {/* 3. 4-COLUMN TABLE GRID (Exact OpenPyXL Structure: 4 Rows per Rack with Hairline Dividers) */}
            <div className="grid grid-cols-4 border-2 border-black bg-white flex-1 overflow-hidden">
              {columnGroups.map((colGroup, colIdx) => (
                <div key={colIdx} className={`flex flex-col ${colIdx < 3 ? 'border-r-2 border-black' : ''}`}>
                  <table className="w-full text-left border-collapse leading-none">
                    <thead>
                      <tr className="bg-slate-900 text-white border-b-2 border-black font-bold text-[7.5px] uppercase">
                        <th className="py-1 px-0.5 border-r border-black text-center w-7">
                          Rack No.
                        </th>
                        <th className="py-1 px-0.5 border-r border-black text-center">
                          Battery pack No.
                        </th>
                        <th className="py-1 px-0.5 text-center w-14">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black">
                      {colGroup.map((item) => {
                        const rackPacks = item.packs;
                        const sortedPacks = [1, 2, 3, 4].map((s) => rackPacks.find((p) => p.rackSlot === s));
                        const hasAnyPack = rackPacks.length > 0;
                        const isWithinOccupied = item.rackNumber <= maxOccupiedRack;

                        return (
                          <tr key={item.rackNumber} className="border-b-2 border-black hover:bg-slate-50">
                            {/* Rack Number (Vertically Centered across the rack) */}
                            <td className="p-0.5 border-r-2 border-black text-center font-black align-middle bg-slate-50 text-[8.5px] w-7">
                              {isWithinOccupied ? item.rackNumber : ''}
                            </td>

                            {/* 4 Stacked Slot Rows (Separated by hairline dividers) */}
                            <td className="p-0 border-r border-black font-mono font-bold align-middle text-center">
                              {isWithinOccupied ? (
                                <div className="divide-y divide-slate-300">
                                  {sortedPacks.map((pack, sIdx) => {
                                    if (!pack) {
                                      return (
                                        <div key={sIdx} className="text-slate-300 text-[6.5px] font-normal py-[1px] leading-tight">
                                          —
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={pack.id || sIdx} className="flex items-center justify-center gap-0.5 py-[1px] leading-tight">
                                        <span className="text-black font-black text-[8px] tracking-tight">
                                          {pack.packNumber}
                                          {pack.secondaryStickerNumber && (
                                            <span className="text-[6px] text-slate-500 font-normal ml-0.5">
                                              ({pack.secondaryStickerNumber})
                                            </span>
                                          )}
                                        </span>
                                        {pack.remark && (
                                          <span className="text-[5.5px] px-0.5 py-0 rounded bg-rose-100 text-rose-800 font-sans border border-rose-200 uppercase font-bold leading-none">
                                            {pack.remark.slice(0, 8)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-200">
                                  <div className="h-3">&nbsp;</div>
                                  <div className="h-3">&nbsp;</div>
                                  <div className="h-3">&nbsp;</div>
                                  <div className="h-3">&nbsp;</div>
                                </div>
                              )}
                            </td>

                            {/* Description / Model (Vertically Centered across the rack) */}
                            <td className="p-0.5 text-center font-bold align-middle text-[7px] text-slate-900 leading-tight w-14">
                              {hasAnyPack ? (
                                <span>{getProductNameAndType(rackPacks[0].packType).productType || 'Kanger1.0'}</span>
                              ) : isWithinOccupied ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span>&nbsp;</span>
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

            {/* 4. FOOTER WITH QR CODE FOR DIGITAL SCANNING & VERIFICATION */}
            <div className="mt-1 pt-1 border-t-2 border-black flex items-center justify-between gap-2 text-[7.5px] text-slate-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 p-0.5 bg-white border border-black flex items-center justify-center shadow-2xs flex-shrink-0">
                  <img src={qrDataUrl} alt={`QR Code for Line ${currentLine}`} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-black uppercase text-[8px] leading-tight">Instant Mobile Scan QR Code</p>
                  <p className="text-[7px] text-slate-600 leading-tight">Scan with phone camera to view real-time live stock of Line {currentLine}</p>
                  <p className="text-[6.5px] font-mono text-slate-500 leading-none">{publicUrl}</p>
                </div>
              </div>

              <div className="text-right leading-tight">
                <p className="font-bold text-black text-[8px]">Tata AutoComp Systems Limited</p>
                <p className="text-[7px] text-slate-600">Varale B300 Plant • Quality Approved</p>
                <p className="text-[6.5px] text-slate-400 mt-0.5">Printed: {new Date().toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

