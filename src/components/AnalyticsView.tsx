import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  Truck,
  TrendingUp,
  Box,
  CheckCircle2,
  RefreshCw,
  Table,
} from 'lucide-react';
import { BatteryPack, DispatchLot, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';
import { exportInventoryToExcel, exportDispatchLotsToExcel } from '../utils/excelExport';
import { OutwardDispatchRegister } from './OutwardDispatchRegister';

interface AnalyticsViewProps {
  packs?: BatteryPack[];
  dispatchLots?: DispatchLot[];
  inwardShipments?: InwardShipmentRecord[];
  warehouseLines?: string[];
  onResetToDemoData?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  packs = [],
  dispatchLots = [],
  inwardShipments = [],
  warehouseLines = [],
  onResetToDemoData,
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS_DASHBOARD' | 'DISPATCH_LEDGER'>('ANALYTICS_DASHBOARD');

  const activeStoragePacks = packs.filter((p) => p.status === 'IN_STORAGE');
  const dispatchedPacks = packs.filter((p) => p.status === 'DISPATCHED');

  // Total warehouse line capacity (40 racks * 4 packs = 160 packs per line)
  const totalLineCapacity = warehouseLines.length * 160;
  const utilizationPercent = totalLineCapacity > 0
    ? Math.round((activeStoragePacks.length / totalLineCapacity) * 100)
    : 0;

  // Distribution by model
  const modelStats = ALL_PACK_TYPES.map((typeKey) => {
    const count = activeStoragePacks.filter((p) => p.packType === typeKey).length;
    const model = BATTERY_MODELS[typeKey];
    return {
      type: typeKey,
      count,
      color: model?.color || '#2563eb',
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Warehouse Intelligence & Data Export
              </span>
              <span className="text-xs text-slate-500 font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Warehouse Analytics & Outward Manifest
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time plant telemetry, capacity heatmaps, and complete outward dispatch register.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('ANALYTICS_DASHBOARD')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ANALYTICS_DASHBOARD'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('DISPATCH_LEDGER')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DISPATCH_LEDGER'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Dispatch Sheet ({dispatchedPacks.length})
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DASHBOARD & HEATMAPS */}
      {activeTab === 'ANALYTICS_DASHBOARD' && (
        <div className="space-y-6">
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Active Storage Units</span>
                <Box className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-slate-900">
                {activeStoragePacks.length.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500">
                Across {warehouseLines.length} Lines (40 Racks each, 160 packs/line)
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Warehouse Utilization</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-indigo-700">
                {utilizationPercent}%
              </div>
              <p className="text-xs text-slate-500">
                {activeStoragePacks.length} / {totalLineCapacity} total plant slot capacity
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Dispatched to EV Plants</span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-emerald-700">
                {dispatchedPacks.length.toLocaleString()} <span className="text-sm text-slate-500 font-sans">Packs</span>
              </div>
              <p className="text-xs text-slate-500">
                Organized into {dispatchLots.length} Outward Lots
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Inward Shipments</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-blue-700">
                {inwardShipments.length.toLocaleString()} <span className="text-sm text-slate-500 font-sans">Shipments</span>
              </div>
              <p className="text-xs text-slate-500">
                AI OCR Stamp verification logged
              </p>
            </div>
          </div>

          {/* Model Breakdown Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
              <Layers className="w-5 h-5 text-blue-600" />
              Inventory Distribution by Tata Battery Model
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {modelStats.map((item) => {
                const percent = activeStoragePacks.length > 0
                  ? Math.round((item.count / activeStoragePacks.length) * 100)
                  : 0;

                return (
                  <div
                    key={item.type}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{item.type}</span>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-slate-900">{item.count}</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono-code">
                      <span>{percent}% of total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warehouse Lines Capacity Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Warehouse Line Occupancy Heatmap (Racks 1 to 40 per Line)
              </h3>
              <span className="text-xs text-slate-500 font-mono-code">Total capacity: 160 packs per line (4 packs/rack)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
              {warehouseLines.slice(0, 30).map((line) => {
                const count = activeStoragePacks.filter((p) => p.lineId === line).length;
                const percent = Math.round((count / 160) * 100);

                return (
                  <div
                    key={line}
                    className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center space-y-1 hover:border-blue-400 transition"
                  >
                    <div className="text-xs font-mono-code font-bold text-slate-800">Line {line}</div>
                    <div className="text-xs font-mono-code font-bold text-blue-700">{count} packs</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono-code">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OUTWARD DISPATCH REGISTER (EXACT SPREADSHEET VIEW FROM USER PHOTO) */}
      {activeTab === 'DISPATCH_LEDGER' && (
        <OutwardDispatchRegister packs={packs} dispatchLots={dispatchLots} />
      )}
    </div>
  );
};
