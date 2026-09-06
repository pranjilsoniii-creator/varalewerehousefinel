import React from 'react';
import { X, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { BatteryPackType } from '../types';

interface SamplePlatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSamplePlate: (imageBase64: string, sampleInfo: any) => void;
}

export function generateSampleInvoiceDataUrl(
  docNo: string,
  dealership: string,
  state: string,
  transport: string,
  packs: Array<{ packNo: string; modelType: BatteryPackType }>
): string {
  const rows = packs
    .slice(0, 7)
    .map(
      (p, i) => `
    <rect x="25" y="${195 + i * 26}" width="598" height="26" fill="${i % 2 === 0 ? '#ffffff' : '#f8fafc'}" stroke="#e2e8f0" stroke-width="1"/>
    <text x="35" y="${212 + i * 26}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#64748b">${i + 1}</text>
    <text x="80" y="${212 + i * 26}" font-family="Courier, monospace" font-size="12" font-weight="900" fill="#1e3a8a">${p.packNo}</text>
    <text x="240" y="${212 + i * 26}" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#0f172a">${p.modelType}</text>
    <text x="440" y="${212 + i * 26}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#334155">1</text>
    <text x="520" y="${212 + i * 26}" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#16a34a">VERIFIED</text>
  `
    )
    .join('');

  const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="650" height="480" viewBox="0 0 650 480">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
  </defs>

  <rect x="10" y="10" width="630" height="460" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="10" y="10" width="630" height="65" rx="8" fill="#0f172a"/>
  <text x="30" y="40" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#ffffff" letter-spacing="1.5">TATA AUTOCOMP SYSTEMS LIMITED</text>
  <text x="30" y="60" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#f97316" letter-spacing="0.5">LITHIUM BATTERY DIVISION • INWARD DELIVERY CHALLAN</text>

  <rect x="25" y="85" width="598" height="75" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
  <text x="35" y="105" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b">DOC / INVOICE NO:</text>
  <text x="160" y="105" font-family="Courier, monospace" font-size="12" font-weight="900" fill="#0f172a">${docNo}</text>
  <text x="350" y="105" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b">RECEIVED DATE:</text>
  <text x="450" y="105" font-family="Courier, monospace" font-size="11" font-weight="800" fill="#0f172a">${new Date().toISOString().slice(0, 10)}</text>

  <text x="35" y="128" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b">DEALERSHIP / SENDER:</text>
  <text x="160" y="128" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#0f172a">${dealership}</text>
  <text x="350" y="128" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b">STATE / DESTINATION:</text>
  <text x="480" y="128" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#0f172a">${state}</text>

  <text x="35" y="150" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b">TRANSPORTER:</text>
  <text x="160" y="150" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#1d4ed8">${transport}</text>

  <rect x="25" y="170" width="598" height="25" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
  <text x="35" y="186" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#334155">SR</text>
  <text x="80" y="186" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#334155">PACK NUMBER</text>
  <text x="240" y="186" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#334155">PRODUCT NAME / MODEL</text>
  <text x="440" y="186" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#334155">QTY</text>
  <text x="520" y="186" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#334155">QC STATUS</text>

  ${rows}

  <g transform="translate(460, 360) rotate(-10)">
    <circle cx="60" cy="45" r="42" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-dasharray="6,2"/>
    <circle cx="60" cy="45" r="36" fill="none" stroke="#dc2626" stroke-width="1.5"/>
    <text x="60" y="25" font-family="Arial, sans-serif" font-size="8.5" font-weight="900" fill="#dc2626" text-anchor="middle" letter-spacing="1">TATA AUTOCOMP</text>
    <text x="60" y="42" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#dc2626" text-anchor="middle" letter-spacing="1.5">INWARD</text>
    <text x="60" y="55" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#dc2626" text-anchor="middle">STAMP / OK</text>
    <text x="60" y="68" font-family="Courier, monospace" font-size="7.5" font-weight="800" fill="#dc2626" text-anchor="middle">VARALE CHAKAN</text>
  </g>

  <text x="35" y="410" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#64748b">TOTAL PACKS IN SHIPMENT: ${packs.length} UNITS</text>
  <text x="35" y="425" font-family="Arial, sans-serif" font-size="9" font-style="italic" fill="#94a3b8">* Stamped with official Tata Inward Seal. Ready for receiving in Inward Area.</text>
</svg>
`;

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
}

export const SamplePlatesModal: React.FC<SamplePlatesModalProps> = ({
  isOpen,
  onClose,
  onSelectSamplePlate,
}) => {
  if (!isOpen) return null;

  const samples = [
    {
      title: 'Sample 1: Single Pack Paper (1 Pack)',
      docNo: 'INV-TATA-2026-9011',
      dealership: 'Tata Motors Dealership Chakan Hub',
      state: 'Maharashtra',
      transport: 'OM Logistics supply chain',
      remark: 'Standard incoming batch test passed',
      packs: [{ packNo: '5284', modelType: 'Kanger1.0' as BatteryPackType }],
    },
    {
      title: 'Sample 2: Multi-Pack Paper (3 Packs)',
      docNo: 'INV-TATA-2026-9045',
      dealership: 'Tata Motors Sanand Logistics',
      state: 'Gujarat',
      transport: 'Aai Saheb freight line',
      remark: '3 Units Received with Tata Stamp',
      packs: [
        { packNo: '101', modelType: 'Kanger1.0' as BatteryPackType },
        { packNo: '102', modelType: 'Kanger2.0' as BatteryPackType },
        { packNo: '103', modelType: 'Tamor_ELR' as BatteryPackType },
      ],
    },
    {
      title: 'Sample 3: Multi-Pack Paper (5 Packs)',
      docNo: 'DOC-TATAPUNE-8821',
      dealership: 'Tata AutoComp Component Division',
      state: 'Maharashtra',
      transport: 'TCI express',
      remark: 'Batch 5 Units Inwarded',
      packs: [
        { packNo: '501', modelType: 'Nova_LRP' as BatteryPackType },
        { packNo: '502', modelType: 'Limber_Ais' as BatteryPackType },
        { packNo: '503', modelType: 'Limber_Ais' as BatteryPackType },
        { packNo: '504', modelType: 'Challenger_LR' as BatteryPackType },
        { packNo: '505', modelType: 'Challenger_MR' as BatteryPackType },
      ],
    },
    {
      title: 'Sample 4: Heavy Inward Batch (7 Packs)',
      docNo: 'DOC-TATA-2026-7732',
      dealership: 'Tata Passenger EV Pantnagar Hub',
      state: 'Uttarakhand',
      transport: 'Sahyadri Enterprises',
      remark: '7 Units heavy traction inward shipment',
      packs: [
        { packNo: '12', modelType: 'Kanger1.0' as BatteryPackType },
        { packNo: '13', modelType: 'Kanger2.0' as BatteryPackType },
        { packNo: '14', modelType: 'Kanger3.0' as BatteryPackType },
        { packNo: '15', modelType: 'Tamor_ELR' as BatteryPackType },
        { packNo: '16', modelType: 'Nova_LRP' as BatteryPackType },
        { packNo: '17', modelType: 'Limber_Ais' as BatteryPackType },
        { packNo: '18', modelType: 'Challenger_LR' as BatteryPackType },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Select Sample Tata Inward Paper</h3>
              <p className="text-xs text-slate-500">
                Click any realistic Tata Inward Document with official Tata Inward Stamp to test instant AI multi-pack extraction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of sample papers */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {samples.map((item) => {
            const dataUrl = generateSampleInvoiceDataUrl(
              item.docNo,
              item.dealership,
              item.state,
              item.transport,
              item.packs
            );

            return (
              <div
                key={item.docNo}
                onClick={() => {
                  onSelectSamplePlate(dataUrl, {
                    documentNo: item.docNo,
                    dealershipName: item.dealership,
                    receivedState: item.state,
                    transportName: item.transport,
                    remark: item.remark,
                    hasInwardStamp: true,
                    packs: item.packs.map((p) => ({
                      packNumber: p.packNo,
                      packType: p.modelType,
                    })),
                  });
                  onClose();
                }}
                className="group relative bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-3.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tata Stamp Verified
                  </span>
                </div>

                {/* Visual plate thumbnail */}
                <div className="w-full h-40 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative p-1 group-hover:border-blue-500">
                  <img
                    src={dataUrl}
                    alt={item.docNo}
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                  <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Scan This Inward Paper
                    </span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono-code pt-1 border-t border-slate-100">
                  <span className="text-blue-700 font-bold">{item.docNo}</span>
                  <span className="text-slate-700 font-bold">{item.packs.length} {item.packs.length === 1 ? 'Pack' : 'Packs'} Listed</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>AI Vision model: Gemini 3.7 Flash • Multi-Pack Document Extractor</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
