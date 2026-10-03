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

  // Calculate highest occupied rack number or standard 38-40 rows
  const maxOccupiedRack = useMemo(() => {
    let max = 38; // Default standard from photo
    Object.entries(rackMap).forEach(([rackStr, pList]) => {
      const list = pList as BatteryPack[];
      if (list && list.length > 0) {
        const rNum = parseInt(rackStr, 10);
        if (rNum > max) max = rNum;
      }
    });
    return Math.min(max, RACKS_PER_LINE);
  }, [rackMap]);

  // Generate 4-column groupings matching the Tata physical photo (38 to 40 rows per column group)
  // Photo shows 4 main columns: Col 1: Racks 1-10, Col 2: Racks 11-20, Col 3: Racks 21-30, Col 4: Racks 31-38/40
  const columnGroups = useMemo(() => {
    const totalRacksToShow = Math.max(38, maxOccupiedRack);
    const racksPerCol = Math.ceil(totalRacksToShow / 4); // ~10 racks per col

    const cols: Array<Array<{ rackNumber: number; packs: BatteryPack[] }>> = [[], [], [], []];
    for (let i = 1; i <= totalRacksToShow; i++) {
      const colIdx = Math.min(Math.floor((i - 1) / racksPerCol), 3);
      cols[colIdx].push({
        rackNumber: i,
        packs: rackMap[i] || [],
      });
    }
    return cols;
  }, [rackMap, maxOccupiedRack]);

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
    window.print();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* Dynamic Print Styles for Exact 1-Page Output */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'A4_PORTRAIT' ? 'portrait' : paperSize === 'A3_LANDSCAPE' ? 'A3 landscape' : 'A4 landscape'};
            margin: 3mm !important;
          }
          html, body {
            height: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #tata-line-printable-sheet, #tata-line-printable-sheet * {
            visibility: visible !important;
          }
          #tata-line-printable-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            margin: 0 !important;
            padding: 1.5mm !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-fadeIn">
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
                Official Plant Rack Sheet • 1-Page Print Fit & High-Res QR Code
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
              title="Download Line Stock Matrix and Detailed Pack Inventory in Excel (.xlsx)"
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100 flex justify-center">
          {/* Paper Sheet Preview (Matches Exact Physical Tata Wooden Crate Sheet Layout & Guarantees 1-Page Fit) */}
          <div
            id="tata-line-printable-sheet"
            className={`bg-white shadow-lg border border-slate-300 p-3 sm:p-4 text-black font-sans transition-all flex flex-col justify-between ${
              paperSize === 'A4_LANDSCAPE' || paperSize === 'A3_LANDSCAPE'
                ? 'w-full max-w-[1050px]'
                : 'w-full max-w-[750px]'
            }`}
          >
            {/* 1. MASTER HEADER: TATA AUTOCOMP SYSTEM PVT LTD + LINE BADGE */}
            <div className="border-2 border-black rounded-xs overflow-hidden mb-1.5 flex-shrink-0">
              <div className="flex items-center justify-between border-b-2 border-black px-3 py-1 bg-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-white p-0.5 rounded border border-black flex items-center justify-center">
                    <img src="/tata-logo.png" alt="TATA" className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-wider text-black uppercase font-display leading-tight">
                      TATA AUTOCOMP SYSTEM PVT LTD
                    </h1>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider leading-none">
                      Varale (B300 Plant) Lithium Battery Warehouse • Storage Matrix
                    </p>
                  </div>
                </div>

                {/* Line Identification Badge (e.g. A-10) */}
                <div className="bg-black text-white px-4 py-1 rounded-xs border border-black font-black text-xl tracking-widest uppercase">
                  {currentLine}
                </div>
              </div>

              {/* 2. SUB-HEADER: TOTAL BATTERY PACKS NO. + TOTAL ROWS + MODEL */}
              <div className="grid grid-cols-3 divide-x-2 divide-black text-center text-[10px] font-bold bg-white">
                <div className="py-1 px-2 flex items-center justify-center gap-1.5">
                  <span className="text-slate-700 uppercase text-[9px]">TOTAL BATTERY PACKS:</span>
                  <span className="text-sm font-black text-black">{linePacks.length}</span>
                </div>
                <div className="py-1 px-2 flex items-center justify-center gap-1.5">
                  <span className="text-slate-700 uppercase text-[9px]">TOTAL ROWS / RACKS:</span>
                  <span className="text-sm font-black text-black">{maxOccupiedRack}</span>
                </div>
                <div className="py-1 px-2 flex items-center justify-center gap-1.5 bg-slate-50">
                  <span className="text-slate-700 uppercase text-[9px]">PRIMARY MODEL:</span>
                  <span className="text-[10px] font-black text-blue-900 uppercase">{primaryModelName}</span>
                </div>
              </div>
            </div>

            {/* 3. 4-COLUMN TABLE GRID (Forced 4-columns in screen preview & print for 1-page fit) */}
            <div className="grid grid-cols-4 gap-1 border-2 border-black p-0.5 bg-white flex-1 overflow-hidden">
              {columnGroups.map((colGroup, colIdx) => (
                <div key={colIdx} className="border border-black overflow-hidden flex flex-col">
                  <table className="w-full text-[8px] text-left border-collapse leading-tight">
                    <thead>
                      <tr className="bg-slate-200 text-black border-b border-black font-bold text-[7.5px] uppercase">
                        <th className="p-0.5 border-r border-black text-center w-7">
                          {colIdx === 0 ? 'Rack' : 'Sr.'}
                        </th>
                        <th className="p-0.5 border-r border-black">Battery Pack No.</th>
                        <th className="p-0.5 text-center w-12">Model</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {colGroup.map((item) => {
                        const rackPacks = item.packs;
                        // Sort by slot 1,2,3,4
                        const sortedPacks = [1, 2, 3, 4].map((s) => rackPacks.find((p) => p.rackSlot === s));
                        const hasAnyPack = rackPacks.length > 0;

                        return (
                          <tr key={item.rackNumber} className="hover:bg-slate-50">
                            {/* Rack Number */}
                            <td className="p-0.5 border-r border-black text-center font-bold align-middle bg-slate-50 text-[8px]">
                              {item.rackNumber}
                            </td>

                            {/* 4 Stacked Battery Pack Numbers */}
                            <td className="p-0.5 border-r border-black font-mono font-bold align-middle">
                              {hasAnyPack ? (
                                <div className="space-y-[1px]">
                                  {sortedPacks.map((pack, sIdx) => {
                                    if (!pack) {
                                      return (
                                        <div key={sIdx} className="text-slate-300 text-[7px] font-normal leading-tight">
                                          —
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={pack.id || sIdx} className="flex items-center justify-between gap-0.5 leading-tight">
                                        <span className="text-black text-[8px] font-extrabold tracking-tight">
                                          {pack.packNumber}
                                          {pack.secondaryStickerNumber && (
                                            <span className="text-[6.5px] text-slate-500 font-normal ml-0.5">
                                              ({pack.secondaryStickerNumber})
                                            </span>
                                          )}
                                        </span>
                                        {pack.remark && (
                                          <span className="text-[6px] px-0.5 py-0 rounded bg-rose-100 text-rose-800 font-sans border border-rose-200 uppercase font-bold leading-none">
                                            {pack.remark.slice(0, 10)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[7.5px] italic leading-tight">Empty</span>
                              )}
                            </td>

                            {/* Description / Model */}
                            <td className="p-0.5 text-center font-semibold align-middle text-[7px] text-slate-700 leading-tight">
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

            {/* 4. FOOTER WITH QR CODE FOR DIGITAL SCANNING & VERIFICATION */}
            <div className="mt-1.5 pt-1 border-t-2 border-black flex items-center justify-between gap-2 text-[8px] text-slate-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 p-0.5 bg-white border border-black flex items-center justify-center shadow-2xs flex-shrink-0">
                  <img src={qrDataUrl} alt={`QR Code for Line ${currentLine}`} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-black uppercase text-[8.5px] leading-tight">Instant Mobile Scan QR Code</p>
                  <p className="text-[7.5px] text-slate-600 leading-tight">Scan with any phone camera to view real-time live stock of Line {currentLine} without login</p>
                  <p className="text-[7px] font-mono text-slate-500 mt-0.5 leading-none">{publicUrl}</p>
                </div>
              </div>

              <div className="text-right leading-tight">
                <p className="font-bold text-black text-[8.5px]">Tata AutoComp Systems Limited</p>
                <p className="text-[7.5px] text-slate-600">Varale B300 Plant • Quality Approved</p>
                <p className="text-[7px] text-slate-400 mt-0.5">Printed: {new Date().toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

