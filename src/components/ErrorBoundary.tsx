import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldCheck, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL: ErrorBoundary captured unhandled exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCacheAndReload = () => {
    try {
      // Clear local browser cached copies safely without touching cloud
      const keysToClear = [
        'tata_wms_packs_v4',
        'tata_wms_inwards_v4',
        'tata_wms_lots_v4',
        'tata_wms_daily_stock_v1',
        'tata_wms_users_v3',
        'tata_wms_offline_queue_v1',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
          {/* Header */}
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
                <img src="/tata-logo.png" alt="TATA Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white font-display">
                  TATA AUTOCOMP SYSTEMS LIMITED
                </h1>
                <p className="text-[11px] text-slate-400 font-mono-code">
                  Varale (B300 Plant) Warehouse Management System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Crash Guard Active</span>
            </div>
          </div>

          {/* Center Card */}
          <div className="max-w-lg mx-auto w-full py-8">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white font-display">
                  Portal Recovery & Session Restorer
                </h2>
                <p className="text-xs text-slate-400">
                  A transient browser error occurred. Your database on Supabase Cloud is completely safe and unaffected.
                </p>
              </div>

              {/* Error Detail */}
              <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-left font-mono-code text-[11px] text-rose-300 overflow-x-auto max-h-32">
                <p className="font-bold text-slate-400 mb-1">Details:</p>
                <p className="break-all">{errorMsg}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Application</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleResetCacheAndReload}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-600"
                >
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  <span>Clear Local Cache & Re-Sync from Cloud</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="max-w-4xl mx-auto w-full text-center py-2 text-[11px] text-slate-500 font-mono-code border-t border-slate-800 pt-3">
            © 2026 Tata AutoComp Systems Limited. All rights reserved. Varale Plant (B300).
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
