import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InwardScanner } from './components/InwardScanner';
import { InwardRegisterView } from './components/InwardRegisterView';
import { TotalStockView } from './components/TotalStockView';
import { LineInspectorView } from './components/LineInspectorView';
import { DispatchCart } from './components/DispatchCart';
import { InvoiceGenerator } from './components/InvoiceGenerator';
import { AnalyticsView } from './components/AnalyticsView';
import { PackDetailsModal } from './components/PackDetailsModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { AdminLineDataPopulator } from './components/AdminLineDataPopulator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BatteryPack, DispatchLot, InwardShipmentRecord, Invoice } from './types';
import {
  createInitialWarehousePacks,
  createInitialDispatchLots,
  createInitialInwardShipments,
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
  DEFAULT_WAREHOUSE_LINES,
} from './data/seedWarehouse';
import {
  getSupabase,
  fetchPacksFromCloud,
  syncPacksToCloud,
  syncLotToCloud,
  syncInwardToCloud,
  mapRowToPack,
} from './lib/supabaseClient';

const MainAppContent: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();

  // Navigation active tab: 'INWARD' | 'INWARD_LOG' | 'TOTAL_STOCK' | 'LINE_INSPECTOR' | 'DISPATCH_CART' | 'INVOICES' | 'ANALYTICS'
  const [activeTab, setActiveTab] = useState<string>('INWARD');

  // Dynamic Warehouse Lines State (Line A-01..A-25, B-01..B-25, and any custom lines)
  const [warehouseLines, setWarehouseLines] = useState<string[]>(() => {
    return getStoredWarehouseLines();
  });

  // Core Warehouse State with LocalStorage persistence
  const [packs, setPacks] = useState<BatteryPack[]>(() => {
    const saved = localStorage.getItem('tata_wms_packs_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved packs', e);
      }
    }
    return createInitialWarehousePacks();
  });

  const [dispatchLots, setDispatchLots] = useState<DispatchLot[]>(() => {
    const saved = localStorage.getItem('tata_wms_lots_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved lots', e);
      }
    }
    return createInitialDispatchLots();
  });

  const [inwardShipments, setInwardShipments] = useState<InwardShipmentRecord[]>(() => {
    const saved = localStorage.getItem('tata_wms_inwards_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved inwards', e);
      }
    }
    return createInitialInwardShipments();
  });

  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('tata_wms_invoices_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved invoices', e);
      }
    }
    return [];
  });

  // Modal States
  const [inspectingPack, setInspectingPack] = useState<BatteryPack | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [isAdminPopulatorOpen, setIsAdminPopulatorOpen] = useState<boolean>(false);
  const [activeLotForInvoice, setActiveLotForInvoice] = useState<DispatchLot | null>(null);

  // Sync to LocalStorage on state changes
  useEffect(() => {
    localStorage.setItem('tata_wms_packs_v4', JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    localStorage.setItem('tata_wms_lots_v4', JSON.stringify(dispatchLots));
  }, [dispatchLots]);

  useEffect(() => {
    localStorage.setItem('tata_wms_inwards_v4', JSON.stringify(inwardShipments));
  }, [inwardShipments]);

  useEffect(() => {
    localStorage.setItem('tata_wms_invoices_v4', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  // Add new dynamic warehouse line
  const handleAddNewWarehouseLine = (newLine: string) => {
    if (!warehouseLines.includes(newLine)) {
      const nextLines = [...warehouseLines, newLine];
      setWarehouseLines(nextLines);
      saveStoredWarehouseLines(nextLines);
    }
  };

  // SUPABASE REALTIME MULTI-USER CLOUD SYNC
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    // 1. Fetch initial remote cloud state
    fetchPacksFromCloud().then((remotePacks) => {
      if (remotePacks && remotePacks.length > 0) {
        setPacks(remotePacks);
      }
    });

    // 2. Subscribe to Real-Time Postgres Changes (Instant WebSocket Broadcast across all devices)
    const channel = sb
      .channel('wms-live-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battery_packs' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedPack = mapRowToPack(payload.new);
            setPacks((prev) => {
              const existingIndex = prev.findIndex((p) => p.id === updatedPack.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = updatedPack;
                return next;
              } else {
                return [updatedPack, ...prev];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setPacks((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_lots' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLot = payload.new as DispatchLot;
            setDispatchLots((prev) => {
              if (prev.some((l) => l.id === newLot.id)) return prev;
              return [newLot, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // If user is not authenticated, lock down portal and display full-screen Login Wall
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Derived filtered collections
  const activeStoragePacks = packs.filter((p) => p.status !== 'DISPATCHED' && p.status !== 'IN_DISPATCH_AREA');
  const stagedCartPacks = packs.filter((p) => p.status === 'IN_DISPATCH_AREA');

  // Inward Action: Add new packs to system
  const handleAddInwardPacks = (
    newPacks: BatteryPack[],
    shipmentRecord: InwardShipmentRecord
  ) => {
    setPacks((prev) => [...newPacks, ...prev]);
    setInwardShipments((prev) => [shipmentRecord, ...prev]);

    // Cloud Sync
    syncPacksToCloud(newPacks);
    syncInwardToCloud(shipmentRecord);
  };

  // Super Admin Historical Line Populator Save Action
  const handleSaveAdminLinePacks = (newPacks: BatteryPack[]) => {
    setPacks((prev) => [...newPacks, ...prev]);
    syncPacksToCloud(newPacks);
  };

  // Supervisor Approval for Single Inward Pack
  const handleApproveInwardPack = (packId: string) => {
    const approverName = currentUser?.name || currentUser?.username || 'Supervisor';
    const nowIso = new Date().toISOString();

    setPacks((prev) => {
      const updated = prev.map((p) =>
        p.id === packId
          ? {
              ...p,
              status: 'INWARD_AREA' as any,
              inwardApprovedBy: approverName,
              inwardApprovedAt: nowIso,
            }
          : p
      );
      syncPacksToCloud(updated.filter((p) => p.id === packId));
      return updated;
    });
  };

  // Supervisor Batch Approval for Multiple Inward Packs
  const handleApproveMultipleInwardPacks = (packIds: string[]) => {
    const idSet = new Set(packIds);
    const approverName = currentUser?.name || currentUser?.username || 'Supervisor';
    const nowIso = new Date().toISOString();

    setPacks((prev) => {
      const updated = prev.map((p) =>
        idSet.has(p.id)
          ? {
              ...p,
              status: 'INWARD_AREA' as any,
              inwardApprovedBy: approverName,
              inwardApprovedAt: nowIso,
            }
          : p
      );
      syncPacksToCloud(updated.filter((p) => idSet.has(p.id)));
      return updated;
    });
  };

  // Move Pack from Inward Area to Line & Rack
  const handleMovePackToLocation = (
    packId: string,
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Staff Operator';
    const nowIso = new Date().toISOString();
    const locationStr = location.lineId + ', R-' + String(location.rackNumber).padStart(2, '0') + ', L-' + String(location.rackSlot).padStart(2, '0');

    setPacks((prev) => {
      const updated = prev.map((p) => {
        if (p.id === packId) {
          const updatedHistory = [
            {
              id: 'mov-' + Date.now(),
              timestamp: nowIso,
              fromLocation: p.currentLocation || p.locationArea || 'Inward Area',
              toLocation: locationStr,
              movedBy: operatorName,
              reason: 'Rack Placement / Warehouse Allocation',
            },
            ...(p.movementHistory || []),
          ];

          return {
            ...p,
            status: 'IN_STORAGE' as any,
            locationArea: 'Warehouse Storage',
            currentLocation: locationStr,
            lineId: location.lineId,
            rackNumber: location.rackNumber,
            rackSlot: location.rackSlot,
            movementHistory: updatedHistory,
          };
        }
        return p;
      });
      syncPacksToCloud(updated.filter((p) => p.id === packId));
      return updated;
    });
  };

  const handleMoveMultiplePacksToLocation = (
    packIds: string[],
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    const idSet = new Set(packIds);
    const operatorName = currentUser?.name || currentUser?.username || 'Staff Operator';
    const nowIso = new Date().toISOString();
    const locationStr = location.lineId + ', R-' + String(location.rackNumber).padStart(2, '0') + ', L-' + String(location.rackSlot).padStart(2, '0');

    setPacks((prev) => {
      const updated = prev.map((p) => {
        if (idSet.has(p.id)) {
          const updatedHistory = [
            {
              id: 'mov-' + Date.now() + '-' + p.id,
              timestamp: nowIso,
              fromLocation: p.currentLocation || p.locationArea || 'Inward Area',
              toLocation: locationStr,
              movedBy: operatorName,
              reason: 'Batch Line Allocation',
            },
            ...(p.movementHistory || []),
          ];

          return {
            ...p,
            status: 'IN_STORAGE' as any,
            locationArea: 'Warehouse Storage',
            currentLocation: locationStr,
            lineId: location.lineId,
            rackNumber: location.rackNumber,
            rackSlot: location.rackSlot,
            movementHistory: updatedHistory,
          };
        }
        return p;
      });
      syncPacksToCloud(updated.filter((p) => idSet.has(p.id)));
      return updated;
    });
  };

  // Stage a pack into Dispatch Cart
  const handleAddPackToDispatch = (pack: BatteryPack) => {
    if (pack.status === 'DISPATCHED') {
      alert('Pack #' + pack.packNumber + ' has already been dispatched.');
      return;
    }
    if (pack.status === 'PENDING_APPROVAL') {
      alert('Pack #' + pack.packNumber + ' is still pending inward approval.');
      return;
    }

    setPacks((prev) =>
      prev.map((p) => (p.id === pack.id ? { ...p, status: 'IN_DISPATCH_AREA' } : p))
    );
    setActiveTab('DISPATCH_CART');
  };

  // Stage multiple packs into Dispatch Cart
  const handleAddMultipleToDispatch = (packIds: string[]) => {
    const idSet = new Set(packIds);
    setPacks((prev) =>
      prev.map((p) => (idSet.has(p.id) ? { ...p, status: 'IN_DISPATCH_AREA' } : p))
    );
    setActiveTab('DISPATCH_CART');
  };

  // Remove pack from Dispatch Cart (returns to previous location or Inward Area)
  const handleRemoveFromDispatchCart = (packId: string) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          return {
            ...p,
            status: p.lineId ? 'IN_STORAGE' : 'INWARD_AREA',
          };
        }
        return p;
      })
    );
  };

  // Final Dispatch Approval: Updates pack status to DISPATCHED
  const handleApproveDispatchLot = (newLot: DispatchLot, dispatchedPackIds: string[]) => {
    const idSet = new Set(dispatchedPackIds);
    setDispatchLots((prev) => [newLot, ...prev]);
    syncLotToCloud(newLot);

    const operatorName = currentUser?.name || currentUser?.username || 'Dispatch Lead';
    const nowIso = new Date().toISOString();

    setPacks((prev) => {
      const updated = prev.map((p) => {
        if (idSet.has(p.id)) {
          return {
            ...p,
            status: 'DISPATCHED' as any,
            dispatchedBy: operatorName,
            dispatchedAt: nowIso,
            dispatchToAddress: newLot.consigneeAddress,
            dispatchVehicleNo: newLot.vehicleNumber,
            dispatchLrNo: newLot.lrNumber,
            movementHistory: [
              {
                id: 'mov-' + Date.now() + '-' + p.id,
                timestamp: nowIso,
                fromLocation: p.currentLocation || 'Inward Area',
                toLocation: 'Consignee: ' + newLot.consigneeName + ' (' + newLot.vehicleNumber + ')',
                movedBy: operatorName,
                reason: 'Dispatched under Lot #' + newLot.lotNumber + ' (Doc #' + newLot.transportDocNo + ')',
              },
              ...(p.movementHistory || []),
            ],
          };
        }
        return p;
      });
      syncPacksToCloud(updated.filter((p) => idSet.has(p.id)));
      return updated;
    });
  };

  // Navigate directly from Lot to Invoice Generator
  const handleGenerateInvoiceForLot = (lot: DispatchLot) => {
    setActiveLotForInvoice(lot);
    setActiveTab('INVOICES');
  };

  // Save Generated Invoice
  const handleSaveInvoice = (invoice: Invoice) => {
    setSavedInvoices((prev) => [invoice, ...prev]);
  };

  // Clean Slate reset helper
  const handleResetToCleanSlate = () => {
    if (confirm('Reset warehouse back to clean slate (0 packs) for clean presentation?')) {
      setPacks([]);
      setDispatchLots([]);
      setInwardShipments([]);
      setSavedInvoices([]);
      localStorage.setItem('tata_wms_packs_v4', JSON.stringify([]));
      localStorage.setItem('tata_wms_lots_v4', JSON.stringify([]));
      localStorage.setItem('tata_wms_inwards_v4', JSON.stringify([]));
      localStorage.setItem('tata_wms_invoices_v4', JSON.stringify([]));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalActivePacks={packs.length}
        cartPacksCount={stagedCartPacks.length}
        dispatchedLotsCount={dispatchLots.length}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onOpenLinePopulatorModal={() => setIsAdminPopulatorOpen(true)}
        onQuickSearch={(query) => {
          setActiveTab('TOTAL_STOCK');
        }}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 pb-12">
        {activeTab === 'INWARD' && (
          <InwardScanner
            existingPacks={packs}
            onAddPacks={handleAddInwardPacks}
            onNavigateToInwardLog={() => setActiveTab('INWARD_LOG')}
          />
        )}

        {activeTab === 'INWARD_LOG' && (
          <InwardRegisterView
            packs={packs}
            onApproveInwardPack={handleApproveInwardPack}
            onApproveMultipleInwardPacks={handleApproveMultipleInwardPacks}
            onSendToDispatch={handleAddPackToDispatch}
            onSendMultipleToDispatch={handleAddMultipleToDispatch}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onMovePackToLocation={handleMovePackToLocation}
            onMoveMultiplePacksToLocation={handleMoveMultiplePacksToLocation}
          />
        )}

        {activeTab === 'TOTAL_STOCK' && (
          <TotalStockView
            packs={packs}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onSendToDispatch={handleAddPackToDispatch}
          />
        )}

        {activeTab === 'LINE_INSPECTOR' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <LineInspectorView
              packs={packs}
              warehouseLines={warehouseLines}
              onAddNewLine={handleAddNewWarehouseLine}
              onOpenPackDetails={(pack) => setInspectingPack(pack)}
              onSendToDispatch={handleAddPackToDispatch}
              onOpenRackLoader={(line, rack) => {
                setIsAdminPopulatorOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'DISPATCH_CART' && (
          <DispatchCart
            stagedPacks={stagedCartPacks}
            availableStoragePacks={activeStoragePacks}
            onRemoveFromCart={handleRemoveFromDispatchCart}
            onAddMultipleToCart={handleAddMultipleToDispatch}
            onApproveDispatchLot={handleApproveDispatchLot}
            onGenerateInvoiceForLot={handleGenerateInvoiceForLot}
          />
        )}

        {activeTab === 'INVOICES' && (
          <InvoiceGenerator
            initialLot={activeLotForInvoice}
            savedInvoices={savedInvoices}
            onSaveInvoice={handleSaveInvoice}
            onBackToDispatch={() => setActiveTab('DISPATCH_CART')}
          />
        )}

        {activeTab === 'ANALYTICS' && (
          <AnalyticsView
            packs={packs}
            dispatchLots={dispatchLots}
            inwardShipments={inwardShipments}
            warehouseLines={warehouseLines}
            onResetToDemoData={handleResetToCleanSlate}
          />
        )}
      </main>

      {/* Professional System Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium uppercase tracking-wider gap-2 py-2 sm:py-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System: <strong className="text-slate-700">Tata AutoComp WMS PRO</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">Plant: Varale (B300 Plant)</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-blue-700 font-bold">Supabase Realtime Cloud Sync: Active</span>
        </div>
        <div className="text-slate-400 normal-case sm:uppercase text-[10px]">
          &copy; {new Date().getFullYear()} Tata AutoComp Systems Limited • Varale (B300 Plant) Management System
        </div>
      </footer>

      {/* Pack Details Modal */}
      <PackDetailsModal
        pack={inspectingPack}
        onClose={() => setInspectingPack(null)}
        onSelectForMove={() => {}}
        onAddToDispatch={handleAddPackToDispatch}
        onNavigateToLine={() => setActiveTab('LINE_INSPECTOR')}
      />

      {/* Supabase Cloud Connection Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        totalPacksCount={packs.length}
        totalLotsCount={dispatchLots.length}
        onTriggerSync={() => {
          fetchPacksFromCloud().then((p) => {
            if (p) setPacks(p);
          });
        }}
      />

      {/* Super Admin Historical Line Populator Modal */}
      {isAdminPopulatorOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <AdminLineDataPopulator
              existingPacks={packs}
              warehouseLines={warehouseLines}
              onAddNewLine={handleAddNewWarehouseLine}
              onSaveLinePacks={handleSaveAdminLinePacks}
              onClose={() => setIsAdminPopulatorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Login & User Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Super Admin User Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
};

export default App;
