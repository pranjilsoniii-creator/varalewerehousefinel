import React, { useState } from 'react';
import {
  Smartphone,
  X,
  Download,
  QrCode,
  Share2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Layers,
  Copy,
  Check,
  ArrowRight,
  Package,
} from 'lucide-react';

interface DownloadOnPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadOnPhoneModal: React.FC<DownloadOnPhoneModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'qr' | 'pwa'>('apk');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://tata-wms.local';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(currentUrl)}`;
  const directApkUrl = 'https://github.com/pranjilsoniii-creator/varalewerehousefinel/releases/download/v1.0.0-apk/Tata-AutoComp-WMS-v1.0.apk';
  const githubReleasesUrl = 'https://github.com/pranjilsoniii-creator/varalewerehousefinel/releases';
  const githubActionsUrl = 'https://github.com/pranjilsoniii-creator/varalewerehousefinel/actions';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-xs text-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                Download & Install on Phone / Scanner
              </h3>
              <p className="text-[11px] text-slate-500">
                Tata AutoComp Lithium Battery Warehouse Management System
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 font-bold">
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Android APK (.apk)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instant PWA Install</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: APK DOWNLOAD */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-blue-900 text-sm">
                    Tata AutoComp Native Android App (.apk)
                  </h4>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Native Android build for floor barcode scanning, camera recognition, and offline storage.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <a
                  href={directApkUrl}
                  download="Tata-AutoComp-WMS-v1.0.apk"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Direct APK (Tata-AutoComp-WMS-v1.0.apk)</span>
                </a>

                <a
                  href={githubReleasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-2xl flex items-center justify-center gap-2 border border-blue-200 transition cursor-pointer text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Open GitHub Releases Page</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800">📱 Installation Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Download the <strong>.apk</strong> file onto your phone or PDA scanner.</li>
                  <li>Tap the file and click <strong>"Install"</strong>.</li>
                  <li>Login with your Supervisor or Employee credentials to start scanning.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: QR CODE SCAN */}
          {activeTab === 'qr' && (
            <div className="text-center space-y-4">
              <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl inline-block shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Scan with Phone Camera
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Point your smartphone camera or barcode gun at this QR code to open the Tata WMS portal instantly.
                </p>
              </div>

              <div className="flex items-center gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono-code text-slate-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PWA 1-CLICK INSTALL */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-900 text-sm">
                    No-Download Instant App (PWA)
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Instantly install Tata WMS directly onto your Home Screen with full native app features.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-[11px] text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 mb-1">On Android (Chrome / Edge):</p>
                  <p>1. Open this website in Chrome.</p>
                  <p>2. Tap the <strong>"Install Tata WMS App"</strong> popup or click <strong>⋮ (Menu) ➡️ Install App</strong>.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 mb-1">On iPhone / iPad (Safari):</p>
                  <p>1. Tap the <strong>Share</strong> button 📤 at the bottom of Safari.</p>
                  <p>2. Select <strong>"Add to Home Screen"</strong> ➕ and tap <strong>Add</strong>.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tata AutoComp Systems Limited</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
