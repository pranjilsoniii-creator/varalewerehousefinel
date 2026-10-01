import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  Download,
  Send,
  Link,
  Copy,
  Check,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  RefreshCw,
  Users,
  ShieldCheck,
  Truck,
  Inbox,
  ArrowDownToLine,
} from 'lucide-react';
import { BatteryPack, InwardShipmentRecord, DispatchLot, DailyStockRecord } from '../types';
import {
  generateOneDriveMasterExcel,
  generateOneDriveInwardExcel,
  generateOneDriveDispatchExcel,
  generateOneDriveDailyStockExcel,
} from '../utils/oneDriveExcelGenerator';
import { useAuth } from '../context/AuthContext';

interface OneDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  packs: BatteryPack[];
  inwardShipments: InwardShipmentRecord[];
  dispatchLots: DispatchLot[];
  dailyStockRecords: DailyStockRecord[];
}

export const OneDriveSyncModal: React.FC<OneDriveSyncModalProps> = ({
  isOpen,
  onClose,
  packs,
  inwardShipments,
  dispatchLots,
  dailyStockRecords,
}) => {
  const { currentUser, isSuperAdmin, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<'download' | 'push' | 'livefeed' | 'guide'>('download');
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('tata_onedrive_webhook_url') || '';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pushMessage, setPushMessage] = useState<string>('');
  const [copiedFeedUrl, setCopiedFeedUrl] = useState<boolean>(false);
  const [copiedShareGuide, setCopiedShareGuide] = useState<boolean>(false);

  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem('tata_onedrive_webhook_url', webhookUrl);
    }
  }, [webhookUrl]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const liveFeedUrl = `${currentHost}/api/onedrive/live-feed`;

  // Filter packs by date if push tab active
  const todayPacks = packs.filter((p) => {
    const packDate = p.inwardDate || p.updatedAt?.slice(0, 10);
    return packDate === selectedDate;
  });

  const handleDownloadMasterExcel = () => {
    generateOneDriveMasterExcel(packs, inwardShipments, dispatchLots, dailyStockRecords);
  };

  const handleDownloadInwardExcel = () => {
    generateOneDriveInwardExcel(packs, inwardShipments);
  };

  const handleDownloadDispatchExcel = () => {
    generateOneDriveDispatchExcel(dispatchLots, packs);
  };

  const handleDownloadDailyStockExcel = () => {
    generateOneDriveDailyStockExcel(dailyStockRecords);
  };

  const handlePushToOneDrive = async () => {
    if (!webhookUrl.trim()) {
      setPushStatus('error');
      setPushMessage('Kripya apna Microsoft Power Automate ya OneDrive Webhook URL dalein.');
      return;
    }

    setPushStatus('loading');
    setPushMessage('');

    try {
      const payload = {
        date: selectedDate,
        pushedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Suresh Chavan (Manager)',
        timestamp: new Date().toISOString(),
        summary: {
          totalWarehouseStock: packs.filter((p) => p.status !== 'DISPATCHED').length,
          dateSpecificPacksCount: todayPacks.length,
          totalInwardsRecorded: inwardShipments.length,
          totalDispatchedLots: dispatchLots.length,
        },
        records: {
          packs: todayPacks.length > 0 ? todayPacks : packs,
          dailyStock: dailyStockRecords.filter((d) => d.recordDate === selectedDate),
          inwards: inwardShipments.filter((i) => i.receivedDate === selectedDate),
          dispatches: dispatchLots.filter((d) => d.dispatchDate === selectedDate),
        },
      };

      // Call our backend dispatcher
      const response = await fetch('/api/onedrive/push-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          payload,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPushStatus('success');
        setPushMessage(`Realtime data (${selectedDate}) successfully pushed to OneDrive!`);
      } else {
        // Fallback: Direct browser POST if backend proxy not available
        const directRes = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (directRes.ok) {
          setPushStatus('success');
          setPushMessage(`Realtime data (${selectedDate}) successfully pushed directly to OneDrive!`);
        } else {
          setPushStatus('error');
          setPushMessage(result.error || 'OneDrive endpoint returned status error. Check Webhook URL.');
        }
      }
    } catch (err: any) {
      setPushStatus('error');
      setPushMessage(`Push failed: ${err.message}. Ensure the Power Automate flow is enabled.`);
    }
  };

  const handleCopyFeedUrl = () => {
    navigator.clipboard.writeText(liveFeedUrl);
    setCopiedFeedUrl(true);
    setTimeout(() => setCopiedFeedUrl(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn text-xs text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Microsoft OneDrive Live Excel Synchronizer
                </h3>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 font-bold text-[10px] rounded-full">
                  Realtime Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tata AutoComp Lithium Battery Warehouse ➔ OneDrive Multi-User Live Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connected File Banner: Varale B300.xlsx */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-sky-900 via-blue-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-sky-800 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">Connected Target File:</span>
            <span className="font-extrabold text-white font-mono-code bg-sky-800/80 px-2 py-0.5 rounded-lg border border-sky-600">
              Varale B300.xlsx
            </span>
            <span className="text-[10px] text-sky-300 hidden sm:inline">(Plant: Varale B300)</span>
          </div>

          <a
            href="https://1drv.ms/x/c/85a2cda20cb7e1ba/IQBVSHdzUcnlQpIk23qRiHXdAT0UsRn5E-gRwErAL2VFVHU?e=Mvgub7"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-lg flex items-center gap-1.5 transition cursor-pointer text-[10px] shadow-xs"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open Varale B300.xlsx on OneDrive</span>
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 font-bold">
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'download'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Master Excel File</span>
          </button>

          <button
            onClick={() => setActiveTab('push')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'push'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>1-Click Push Button</span>
          </button>

          <button
            onClick={() => setActiveTab('livefeed')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'livefeed'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Live Web Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Share with Team</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: MASTER EXCEL FILE DOWNLOAD */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sky-950 text-sm">
                    Ready-to-Upload OneDrive Master Excel Sheet
                  </h4>
                  <p className="text-[11px] text-sky-800 mt-1">
                    Niche diye gaye button par click karke poori warehouse inventory, daily stock, inward aur dispatch data ke sath pre-formatted <strong>.xlsx</strong> file download karein aur use apne OneDrive me save karein.
                  </p>
                </div>
              </div>

              {/* Live Inventory Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total Packs</p>
                  <p className="text-lg font-black text-slate-900">{packs.length}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">In Stock (Warehouse)</p>
                  <p className="text-lg font-black text-emerald-600">
                    {packs.filter((p) => p.status !== 'DISPATCHED').length}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Dispatched Out</p>
                  <p className="text-lg font-black text-blue-600">
                    {packs.filter((p) => p.status === 'DISPATCHED').length}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Daily Stock Records</p>
                  <p className="text-lg font-black text-purple-600">{dailyStockRecords.length}</p>
                </div>
              </div>

              {/* Section-Wise Dedicated Excel Downloads */}
              <div className="space-y-2">
                <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" />
                  <span>Alag-Alag Section Wise Excel Files Download Karein:</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Inward Register Download */}
                  <button
                    onClick={handleDownloadInwardExcel}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Inbox className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs leading-tight">1. Inward Register Excel</p>
                        <p className="text-[10px] text-emerald-700 font-medium">Inward DC, Vendor, Vehicles & QC</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-600 group-hover:translate-y-0.5 transition" />
                  </button>

                  {/* 2. Outward Dispatch Register Download */}
                  <button
                    onClick={handleDownloadDispatchExcel}
                    className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs leading-tight">2. Outward Dispatch Excel</p>
                        <p className="text-[10px] text-blue-700 font-medium">Dispatch Lots, DC, LR & Transporter</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-blue-600 group-hover:translate-y-0.5 transition" />
                  </button>

                  {/* 3. Daily Stock Maintenance Download */}
                  <button
                    onClick={handleDownloadDailyStockExcel}
                    className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs leading-tight">3. Daily Stock Maintenance</p>
                        <p className="text-[10px] text-purple-700 font-medium">Opening, Inward, Outward & Closing</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-purple-600 group-hover:translate-y-0.5 transition" />
                  </button>

                  {/* 4. Complete All-In-One Master Workbook */}
                  <button
                    onClick={handleDownloadMasterExcel}
                    className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white border border-slate-700 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs leading-tight">4. All-In-One Master (.xlsx)</p>
                        <p className="text-[10px] text-slate-300 font-medium">All 4 Sheets in 1 Workbook</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400 group-hover:translate-y-0.5 transition" />
                  </button>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Is file ko OneDrive me kaise dalein:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                  <li>Upar diye gaye blue button se <strong>Excel File download</strong> karein.</li>
                  <li>Apne <strong>OneDrive / SharePoint</strong> folder me is file ko Drag & Drop (upload) karein.</li>
                  <li>File par right-click karke <strong>Share</strong> ➔ <strong>"Anyone with link - View Only"</strong> karein aur link Suresh Sir ya team ko bhej dein.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK PUSH BUTTON */}
          {activeTab === 'push' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
                <Send className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-indigo-950 text-sm">
                    1-Click Realtime Push to OneDrive
                  </h4>
                  <p className="text-[11px] text-indigo-800 mt-1">
                    Jab bhi Suresh Sir ya SuperAdmin data bharenge (jaise 16, 17, 18 tarikh ka), yeh button dabate hi Supabase ka realtime data OneDrive ki Excel sheet me automatically append ho jayega.
                  </p>
                </div>
              </div>

              {/* Date Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Data Date (Kis Tarikh Ka Data Push Karna Hai):
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono-code font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matching Packs for {selectedDate}:
                  </label>
                  <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 flex items-center justify-between">
                    <span>{todayPacks.length} Battery Packs</span>
                    <span className="text-[10px] text-slate-500">
                      ({packs.length} Total Inventory)
                    </span>
                  </div>
                </div>
              </div>

              {/* Webhook URL Configuration */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Microsoft Power Automate / OneDrive Webhook URL:
                </label>
                <input
                  type="url"
                  placeholder="https://prod-xx.westus.logic.azure.com:443/workflows/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono-code text-[11px] text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Agar aapne Microsoft Power Automate me Flow banaya hai toh uska HTTP Webhook URL yahan dalein (1 baar save karne ke baad hamesha saved rahega).
                </p>
              </div>

              {/* Push Action Button */}
              <button
                onClick={handlePushToOneDrive}
                disabled={pushStatus === 'loading'}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer text-sm"
              >
                {pushStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pushing Data to OneDrive...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>📤 Push Realtime Data ({selectedDate}) to OneDrive Excel</span>
                  </>
                )}
              </button>

              {/* Status feedback */}
              {pushStatus === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{pushMessage}</span>
                </div>
              )}

              {pushStatus === 'error' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{pushMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE REALTIME WEB & SUPABASE DATABASE FEED */}
          {activeTab === 'livefeed' && (
            <div className="space-y-4">
              {/* Card 1: Direct PostgreSQL Database Connection in Excel */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border border-emerald-700 shadow-md space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                    🐘
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      Direct Supabase Database (PostgreSQL) in Excel
                    </h4>
                    <p className="text-[10px] text-emerald-300">
                      Excel ke andar direct database table connect karne ke verified parameters
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-3 rounded-xl border border-emerald-800/60 font-mono-code text-[11px]">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-sans">Host / Server</p>
                    <p className="text-emerald-300 font-bold truncate">db.eovoqayzvspkpzwpxxic.supabase.co</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-sans">Port</p>
                    <p className="text-emerald-300 font-bold">5432</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-sans">Database</p>
                    <p className="text-emerald-300 font-bold">postgres</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-sans">User</p>
                    <p className="text-emerald-300 font-bold">postgres</p>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-[10px] text-emerald-200">
                  <p>
                    <strong>Password:</strong> <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white font-bold font-mono-code">Jitendra#321</code>
                  </p>
                </div>
              </div>

              {/* 3 Step Visual Guide for Excel */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-extrabold text-slate-800 text-xs">
                  ⚡ Excel Me Direct Database Connect Kaise Karein (30 Seconds):
                </p>
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      1
                    </span>
                    <p>Excel kholein ➔ <strong>Data</strong> tab ➔ <strong>Get Data</strong> ➔ <strong>From Database</strong> ➔ <strong>From PostgreSQL Database</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      2
                    </span>
                    <p>Server me <code className="bg-slate-200 px-1 rounded font-bold font-mono-code">db.eovoqayzvspkpzwpxxic.supabase.co:5432</code> aur Database me <code className="bg-slate-200 px-1 rounded font-bold font-mono-code">postgres</code> dalein.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      3
                    </span>
                    <p>User me <code className="bg-slate-200 px-1 rounded font-bold font-mono-code">postgres</code> aur Password me <code className="bg-slate-200 px-1 rounded font-bold font-mono-code">Jitendra#321</code> dalein ➔ <strong>Connect</strong> dabayein.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      4
                    </span>
                    <p>Table select karein (<code className="font-mono-code text-blue-600">battery_packs</code>, <code className="font-mono-code text-blue-600">inward_shipments</code>, <code className="font-mono-code text-blue-600">dispatch_lots</code>, <code className="font-mono-code text-blue-600">daily_stock_records</code>) ➔ <strong>Load</strong> dabayein!</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Live CSV Web Feed Links */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <p className="font-bold text-blue-900 text-xs">
                  🌐 Alternate: Live Direct Web Feed URLs (Excel Data ➔ From Web):
                </p>
                <div className="space-y-1.5 font-mono-code text-[10px]">
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-700 truncate">{currentHost}/api/excel/inward-live.csv</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Inward CSV</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-700 truncate">{currentHost}/api/excel/dispatch-live.csv</span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Dispatch CSV</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-700 truncate">{currentHost}/api/excel/daily-stock-live.csv</span>
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Daily Stock CSV</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHARE WITH TEAM GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3">
                <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-purple-950 text-sm">
                    Multi-User Realtime Access Sharing (Suresh Sir & Plant Management)
                  </h4>
                  <p className="text-[11px] text-purple-800 mt-1">
                    Aap OneDrive ki iss Excel sheet ka link jisko bhi denge, wo sabhi log apne mobile ya laptop par live data bina kisi software install kiye dekh sakenge.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Recommended Sharing Permissions:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800 text-xs">👀 View Only Access (Recommended)</p>
                    <p className="text-[11px] text-slate-500">
                      Management, Officers, aur Tata Clients ke liye. Isse koi galti se formula ya data delete nahi kar sakega.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800 text-xs">✏️ Can Edit Access</p>
                    <p className="text-[11px] text-slate-500">
                      Sirf SuperAdmin aur Suresh Chavan (Manager) ke liye, jisse zaroorat padne par corrections kiye ja sakein.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Pro Tip:</strong> OneDrive sheet mobile ke <em>Microsoft Excel App</em> ya <em>Chrome Browser</em> dono me direct open hoti hai. Officers bina login ke bhi phone par 1 click me daily stock check kar sakte hain.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Current Operator: <strong>{currentUser?.name || 'Authorized Staff'}</strong> ({currentUser?.role || 'Manager'})
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
