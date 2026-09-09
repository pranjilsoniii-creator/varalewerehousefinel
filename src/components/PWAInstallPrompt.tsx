import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('tata_wms_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Capture standard PWA install prompt (Chrome Android / Edge / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('tata_wms_pwa_dismissed', 'true');
  };

  if (isInstalled || dismissed) {
    return null;
  }

  // Show if either standard install prompt is available or iOS device
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Floating Install Pill on Mobile / Desktop */}
      <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-bounce-short">
        <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-xs">
            <img src="/tata-logo.png" alt="TATA" className="w-8 h-8 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-white leading-tight font-display">
              Install Tata WMS App
            </p>
            <p className="text-[10px] text-slate-300 truncate">
              Fast floor barcode scanner & offline access
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-slate-900 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSPrompt(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Safari browser ke niche <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> <strong>Share</strong> button par tap karein.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Menu me niche scroll karke <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" /> <strong>"Add to Home Screen"</strong> select karein.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Top right me <strong>"Add"</strong> click karein — Tata WMS App aapke phone par install ho jayega!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              Samajh Gaya (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
