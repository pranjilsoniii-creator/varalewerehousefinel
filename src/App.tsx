import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InwardScanner } from './components/InwardScanner';
import { InwardRegisterView } from './components/InwardRegisterView';
import { TotalStockView } from './components/TotalStockView';
import { DispatchCart } from './components/DispatchCart';
import { InvoiceGenerator } from './components/InvoiceGenerator';
import { AnalyticsView } from './components/AnalyticsView';
import { PackDetailsModal } from './components/PackDetailsModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BatteryPack, DispatchLot, InwardShipmentRecord, Invoice } from './types';
import {
  createInitialWarehousePacks,
  createInitialDispatchLots,
  createInitialInwardShipments,
  WAREHOUSE_LINES,
} from './data/seedWarehouse';

const MainAppContent: React.FC = () => {
  const { currentUser } = useAuth();

  // Navigation active tab: 'INWARD' | 'INWARD_LOG' | 'TOTAL_STOCK' | 'DISPATCH_CART' | 'INVOICES' | 'ANALYTICS'
  const [activeTab, setActiveTab] = useState<string>('INWARD');

  // Core Warehouse State with LocalStorage persistence
  const [packs, setPacks] = useState<BatteryPack[]>(() => {
    const saved = localStorage.getItem('tata_wms_packs_v3');
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
    const saved = localStorage.getItem('tata_wms_lots_v3');
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
    const saved = localStorage.getItem('tata_wms_inwards_v3');
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
    const saved = localStorage.getItem('tata_wms_invoices_v3');
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
  const [activeLotForInvoice, setActiveLotForInvoice] = useState<DispatchLot | null>(null);

  // Sync to LocalStorage on state changes
  useEffect(() => {
    localStorage.setItem('tata_wms_packs_v3', JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    localStorage.setItem('tata_wms_lots_v3', JSON.stringify(dispatchLots));
  }, [dispatchLots]);

  useEffect(() => {
    localStorage.setItem('tata_wms_inwards_v3', JSON.stringify(inwardShipments));
  }, [inwardShipments]);

  useEffect(() => {
    localStorage.setItem('tata_wms_invoices_v3', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

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
  };

  // Supervisor Approval for Single Inward Pack
  const handleApproveInwardPack = (packId: string) => {
    const approverName = currentUser?.name || currentUser?.username || 'Supervisor';
    const nowIso = new Date().toISOString();

    setPacks((prev) =>
      prev.map((p) =>
        p.id === packId
          ? {
              ...p,
              status: 'INWARD_AREA',
              inwardApprovedBy: approverName,
              inwardApprovedAt: nowIso,
            }
          : p
      )
    );
  };

  // Supervisor Batch Approval for Multiple Inward Packs
  const handleApproveMultipleInwardPacks = (packIds: string[]) => {
    const idSet = new Set(packIds);
    const approverName = currentUser?.name || currentUser?.username || 'Supervisor';
    const nowIso = new Date().toISOString();

    setPacks((prev) =>
      prev.map((p) =>
        idSet.has(p.id)
          ? {
              ...p,
              status: 'INWARD_AREA',
              inwardApprovedBy: approverName,
              inwardApprovedAt: nowIso,
            }
          : p
      )
    );
  };

  // Move Pack from Inward Area to Line & Rack
  const handleMovePackToLocation = (
    packId: string,
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    const nowIso = new Date().toISOString();
    const locationStr = location.lineId + ', R-' + String(location.rackNumber).padStart(2, '0') + ', L-' + String(location.rackSlot).padStart(2, '0');

    setPacks((prev) =>
      prev.map((p) => {
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
            status: 'IN_STORAGE',
            locationArea: 'Warehouse Storage',
            currentLocation: locationStr,
            lineId: location.lineId,
            rackNumber: location.rackNumber,
            rackSlot: location.rackSlot,
            movementHistory: updatedHistory,
          };
        }
        return p;
      })
    );
  };

  const handleMoveMultiplePacksToLocation = (
    packIds: string[],
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    const idSet = new Set(packIds);
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    const nowIso = new Date().toISOString();
    const locationStr = location.lineId + ', R-' + String(location.rackNumber).padStart(2, '0') + ', L-' + String(location.rackSlot).padStart(2, '0');

    setPacks((prev) =>
      prev.map((p) => {
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
            status: 'IN_STORAGE',
            locationArea: 'Warehouse Storage',
            currentLocation: locationStr,
            lineId: location.lineId,
            rackNumber: location.rackNumber,
            rackSlot: location.rackSlot,
            movementHistory: updatedHistory,
          };
        }
        return p;
      })
    );
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

  // Final Dispatch Approval: Updates pack status to DISPATCHED (Red Flag in Inward Log)
  const handleApproveDispatchLot = (newLot: DispatchLot, dispatchedPackIds: string[]) => {
    const idSet = new Set(dispatchedPackIds);
    setDispatchLots((prev) => [newLot, ...prev]);

    const operatorName = currentUser?.name || currentUser?.username || 'Dispatch Lead';
    const nowIso = new Date().toISOString();

    // Mark packs as DISPATCHED in state
    setPacks((prev) =>
      prev.map((p) => {
        if (idSet.has(p.id)) {
          return {
            ...p,
            status: 'DISPATCHED',
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
                toLocation: 'Consignee: ' + newLot.consigneeName + ' (Vehicle ' + newLot.vehicleNumber + ')',
                movedBy: operatorName,
                reason: 'Dispatched under Lot #' + newLot.lotNumber + ' (Doc #' + newLot.transportDocNo + ')',
              },
              ...(p.movementHistory || []),
            ],
          };
        }
        return p;
      })
    );
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
      localStorage.setItem('tata_wms_packs_v3', JSON.stringify([]));
      localStorage.setItem('tata_wms_lots_v3', JSON.stringify([]));
      localStorage.setItem('tata_wms_inwards_v3', JSON.stringify([]));
      localStorage.setItem('tata_wms_invoices_v3', JSON.stringify([]));
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
            warehouseLines={WAREHOUSE_LINES}
            onResetToDemoData={handleResetToCleanSlate}
          />
        )}
      </main>

      {/* Professional Polish Standard System Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium uppercase tracking-wider gap-2 py-2 sm:py-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System: <strong className="text-slate-700">Tata AutoComp WMS PRO</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">Plant: Varale / Chakan</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-blue-700 font-bold">Gemini AI OCR: Active</span>
        </div>
        <div className="text-slate-400 normal-case sm:uppercase text-[10px]">
          &copy; {new Date().getFullYear()} Tata AutoComp Systems Limited • Lithium Battery Warehouse Management
        </div>
      </footer>

      {/* Pack Details Modal */}
      <PackDetailsModal
        pack={inspectingPack}
        onClose={() => setInspectingPack(null)}
        onSelectForMove={() => {}}
        onAddToDispatch={handleAddPackToDispatch}
        onNavigateToLine={() => setActiveTab('TOTAL_STOCK')}
      />

      {/* Supabase Cloud Connection Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        totalPacksCount={packs.length}
        totalLotsCount={dispatchLots.length}
        onTriggerSync={() => {}}
      />

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
