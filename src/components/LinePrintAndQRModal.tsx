import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  X,
  Layers,
  FileText,
  Share2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { BatteryPack } from '../types';
import { generateQrDataUrl, generateQrSvg, generateQrPngDataUrl } from '../utils/qrCodeGenerator';
import { getProductNameAndType } from '../data/batteryCatalog';
import { MAX_PACKS_PER_RACK, RACKS_PER_LINE } from '../data/seedWarehouse';

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
  // Photo shows 4 main columns: Col 1: Racks 1-10, Col 2: Racks 11-20, Col 3: Racks 21-30, Col 4: Racks 31-38
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
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
                Official Plant Rack Sheet & Instant Public Scan QR Code
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
              <span>Print Sheet</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {/* Paper Sheet Preview (Matches Exact Physical Tata Wooden Crate Sheet Layout) */}
          <div
            className={`bg-white shadow-lg border border-slate-300 print:shadow-none print:border-none p-4 sm:p-6 text-black font-sans transition-all ${
              paperSize === 'A4_LANDSCAPE' || paperSize === 'A3_LANDSCAPE'
                ? 'w-full max-w-[1050px]'
                : 'w-full max-w-[750px]'
            }`}
          >
            {/* 1. MASTER HEADER: TATA AUTOCOMP SYSTEM PVT LTD + LINE BADGE */}
            <div className="border-2 border-black rounded-xs overflow-hidden mb-3">
              <div className="flex items-center justify-between border-b-2 border-black px-4 py-2 bg-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-white p-1 rounded border border-black flex items-center justify-center">
                    <img src="/tata-logo.png" alt="TATA" className="h-7 w-7 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-wider text-black uppercase font-display">
                      TATA AUTOCOMP SYSTEM PVT LTD
                    </h1>
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Varale (B300 Plant) Lithium Battery Warehouse • Storage Matrix
                    </p>
                  </div>
                </div>

                {/* Line Identification Badge (e.g. A-10) */}
                <div className="bg-black text-white px-5 py-2 rounded-xs border border-black font-black text-2xl tracking-widest uppercase">
                  {currentLine}
                </div>
              </div>

              {/* 2. SUB-HEADER: TOTAL BATTERY PACKS NO. + TOTAL ROWS + MODEL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x-2 divide-black text-center text-xs font-bold bg-white">
                <div className="py-1.5 px-3 flex items-center justify-center gap-2">
                  <span className="text-slate-700 uppercase text-[11px]">TOTAL BATTERY PACKS NO.:</span>
                  <span className="text-base font-black text-black">{linePacks.length}</span>
                </div>
                <div className="py-1.5 px-3 flex items-center justify-center gap-2">
                  <span className="text-slate-700 uppercase text-[11px]">TOTAL ROWS / RACKS:</span>
                  <span className="text-base font-black text-black">{maxOccupiedRack}</span>
                </div>
                <div className="py-1.5 px-3 flex items-center justify-center gap-2 bg-slate-50">
                  <span className="text-slate-700 uppercase text-[11px]">PRIMARY MODEL:</span>
                  <span className="text-xs font-black text-blue-900 uppercase">{primaryModelName}</span>
                </div>
              </div>
            </div>

            {/* 3. 4-COLUMN TABLE GRID (Matching Exact Layout in Physical Photo) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-2 border-black p-1 bg-white">
              {columnGroups.map((colGroup, colIdx) => (
                <div key={colIdx} className="border border-black overflow-hidden">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-black border-b border-black font-bold text-[9px] uppercase">
                        <th className="p-1 border-r border-black text-center w-10">
                          {colIdx === 0 ? 'Rack No.' : 'Sr.No.'}
                        </th>
                        <th className="p-1 border-r border-black">Battery Pack No.</th>
                        <th className="p-1 text-center w-16">Discription</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {colGroup.map((item) => {
                        const rackPacks = item.packs;
                        // Sort by slot
                        const sortedPacks = [1, 2, 3, 4].map((s) => rackPacks.find((p) => p.rackSlot === s));
                        const hasAnyPack = rackPacks.length > 0;

                        return (
                          <tr key={item.rackNumber} className="hover:bg-slate-50">
                            {/* Rack Number */}
                            <td className="p-1 border-r border-black text-center font-bold align-middle bg-slate-50 text-[10px]">
                              {item.rackNumber}
                            </td>

                            {/* 4 Stacked Battery Pack Numbers */}
                            <td className="p-1 border-r border-black font-mono font-bold align-middle leading-tight">
                              {hasAnyPack ? (
                                <div className="space-y-0.5">
                                  {sortedPacks.map((pack, sIdx) => {
                                    if (!pack) {
                                      return (
                                        <div key={sIdx} className="text-slate-300 text-[9px] font-normal">
                                          —
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={pack.id || sIdx} className="flex items-center justify-between gap-1">
                                        <span className="text-black text-[10px] font-extrabold tracking-tight">
                                          {pack.packNumber}
                                          {pack.secondaryStickerNumber && (
                                            <span className="text-[8px] text-slate-500 font-normal ml-0.5">
                                              ({pack.secondaryStickerNumber})
                                            </span>
                                          )}
                                        </span>
                                        {pack.remark && (
                                          <span className="text-[7.5px] px-1 py-0 rounded bg-rose-100 text-rose-800 font-sans border border-rose-200 uppercase font-semibold">
                                            {pack.remark.slice(0, 12)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[9px] italic">Empty Rack</span>
                              )}
                            </td>

                            {/* Description / Model */}
                            <td className="p-1 text-center font-semibold align-middle text-[9px] text-slate-700">
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
            <div className="mt-3 pt-2 border-t-2 border-black flex items-center justify-between gap-4 text-[10px] text-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 p-0.5 bg-white border border-black flex items-center justify-center shadow-2xs">
                  <img src={qrDataUrl} alt={`QR Code for Line ${currentLine}`} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-black uppercase">Instant Mobile Scan QR Code</p>
                  <p className="text-[9px] text-slate-600">Scan with any phone camera to view real-time live stock of Line {currentLine}</p>
                  <p className="text-[8px] font-mono text-slate-500 mt-0.5">{publicUrl}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-black">Tata AutoComp Systems Limited</p>
                <p className="text-[9px] text-slate-600">Varale B300 Plant • Quality Approved</p>
                <p className="text-[8px] text-slate-400 mt-0.5">Printed on: {new Date().toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
