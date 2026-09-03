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
import {
  BatteryPack,
  DispatchLot,
  InwardShipmentRecord,
  Invoice,
} from './types';
import {
  createInitialWarehousePacks,
  createInitialDispatchLots,
  createInitialInwardShipments,
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
} from './data/seedWarehouse';
import {
  getSupabase,
  fetchPacksFromCloud,
  syncPacksToCloud,
  syncLotToCloud,
  syncInwardToCloud,
  deletePackFromCloud,
  mapRowToPack,
} from './lib/supabaseClient';
import { useAuth } from './context/AuthContext';

// Route Helper Mappings
function getTabFromPath(path: string): string {
  const p = path.toLowerCase().trim();
  if (p === '/inward' || p === '/inward-scan') return 'INWARD';
  if (p === '/inward-register' || p === '/inward-log' || p === '/inwards') return 'INWARD_LOG';
  if (p === '/stock' || p === '/total-stock' || p === '/inventory') return 'TOTAL_STOCK';
  if (p === '/lines' || p === '/line-inspector' || p === '/storage') return 'LINE_INSPECTOR';
  if (p === '/dispatch' || p === '/dispatch-cart' || p === '/staging') return 'DISPATCH_CART';
  if (p === '/invoices' || p === '/gatepass' || p === '/invoice') return 'INVOICES';
  if (p === '/analytics' || p === '/reports' || p === '/dashboard') return 'ANALYTICS';
  return 'INWARD';
}

function getPathFromTab(tab: string): string {
  switch (tab) {
    case 'INWARD': return '/inward';
    case 'INWARD_LOG': return '/inward-register';
    case 'TOTAL_STOCK': return '/stock';
    case 'LINE_INSPECTOR': return '/lines';
    case 'DISPATCH_CART': return '/dispatch';
    case 'INVOICES': return '/invoices';
    case 'ANALYTICS': return '/analytics';
    default: return '/inward';
  }
}

export function App() {
  const { currentUser, isSuperAdmin, isManager, isSupervisor, hasPermission } = useAuth();

  // Active Tab State with browser URL sync
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getTabFromPath(window.location.pathname);
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newPath = getPathFromTab(tab);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  // Dynamic Warehouse Lines List
  const [warehouseLines, setWarehouseLines] = useState<string[]>(() => {
    return getStoredWarehouseLines();
  });

  // Master State: Battery Packs
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

  // SUPABASE REALTIME MULTI-USER CLOUD SYNC (Zero-Crash Safe Architecture)
  useEffect(() => {
    try {
      const sb = getSupabase();
      if (!sb) return;

      // 1. Fetch initial remote cloud state safely
      fetchPacksFromCloud()
        .then((remotePacks) => {
          if (remotePacks && remotePacks.length > 0) {
            setPacks(remotePacks);
          }
        })
        .catch((e) => {
          console.warn('Initial cloud fetch notice (Local data active):', e);
        });

      // 2. Subscribe to Real-Time Postgres Changes
      const channel = sb
        .channel('wms-live-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'battery_packs' },
          (payload) => {
            try {
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
            } catch (err) {
              console.warn('Realtime pack sync note:', err);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dispatch_lots' },
          (payload) => {
            try {
              if (payload.eventType === 'INSERT') {
                const newLot = payload.new as DispatchLot;
                setDispatchLots((prev) => {
                  if (prev.some((l) => l.id === newLot.id)) return prev;
                  return [newLot, ...prev];
                });
              }
            } catch (err) {
              console.warn('Realtime lot sync note:', err);
            }
          }
        )
        .subscribe();

      return () => {
        try {
          sb.removeChannel(channel);
        } catch (e) {}
      };
    } catch (err) {
      console.warn('Supabase Realtime startup note:', err);
    }
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

  // Line Populator Save Action
  const handleSaveAdminLinePacks = (newPacks: BatteryPack[]) => {
    setPacks((prev) => [...newPacks, ...prev]);
    syncPacksToCloud(newPacks);
  };

  // Delete / Remove Pack Action (Super Admin & Manager)
  const handleDeletePack = (packId: string) => {
    setPacks((prev) => prev.filter((p) => p.id !== packId));
    deletePackFromCloud(packId);
  };

  // Edit Pack Action
  const handleEditPack = (updatedPack: BatteryPack) => {
    setPacks((prev) =>
      prev.map((p) => (p.id === updatedPack.id ? updatedPack : p))
    );
    syncPacksToCloud([updatedPack]);
  };

  // Inward Approval Handler (Supervisor/Manager)
  const handleApproveInwardPack = (packId: string) => {
    const nowIso = new Date().toISOString();
    const approverName = currentUser?.name || currentUser?.username || 'Supervisor';

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          const updated: BatteryPack = {
            ...p,
            status: 'INWARD_AREA',
            inwardApprovedBy: approverName,
            inwardApprovedAt: nowIso,
            movementHistory: [
              ...(p.movementHistory || []),
              {
                id: 'mov-' + Date.now(),
                timestamp: nowIso,
                fromLocation: 'Receiving Dock',
                toLocation: 'Inward Area',
                movedBy: approverName,
                reason: 'Inward Approved by ' + approverName,
              },
            ],
          };
          syncPacksToCloud([updated]);
          return updated;
        }
        return p;
      })
    );
  };

  const handleApproveMultipleInwardPacks = (packIds: string[]) => {
    packIds.forEach((id) => handleApproveInwardPack(id));
  };

  // Relocate Pack to Line Rack Coordinates
  const handleMovePackToLocation = (
    packId: string,
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    const locStr = location.lineId + ', R-' + String(location.rackNumber).padStart(2, '0') + ', L-0' + location.rackSlot;
    const nowIso = new Date().toISOString();
    const moverName = currentUser?.name || currentUser?.username || 'Operator';

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          const updated: BatteryPack = {
            ...p,
            status: 'IN_STORAGE',
            locationArea: 'Warehouse Storage',
            currentLocation: locStr,
            lineId: location.lineId,
            rackNumber: location.rackNumber,
            rackSlot: location.rackSlot,
            movementHistory: [
              ...(p.movementHistory || []),
              {
                id: 'mov-' + Date.now(),
                timestamp: nowIso,
                fromLocation: p.currentLocation || p.locationArea || 'Inward Area',
                toLocation: locStr,
                movedBy: moverName,
                reason: 'Allocated to ' + locStr,
              },
            ],
          };
          syncPacksToCloud([updated]);
          return updated;
        }
        return p;
      })
    );
  };

  const handleMoveMultiplePacksToLocation = (
    packIds: string[],
    location: { lineId: string; rackNumber: number; rackSlot: number }
  ) => {
    packIds.forEach((id, idx) => {
      // Auto-increment rack/slot if moving multiple
      const targetSlot = ((location.rackSlot - 1 + idx) % 4) + 1;
      const targetRack = location.rackNumber + Math.floor((location.rackSlot - 1 + idx) / 4);
      handleMovePackToLocation(id, {
        lineId: location.lineId,
        rackNumber: targetRack,
        rackSlot: targetSlot,
      });
    });
  };

  // Send Pack to Dispatch Cart
  const handleSendToDispatch = (pack: BatteryPack) => {
    const nowIso = new Date().toISOString();
    const moverName = currentUser?.name || currentUser?.username || 'Staff';

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === pack.id) {
          const updated: BatteryPack = {
            ...p,
            status: 'IN_DISPATCH_AREA',
            locationArea: 'Dispatch Staging Bay',
            currentLocation: 'Dispatch Bay (Staged)',
            movementHistory: [
              ...(p.movementHistory || []),
              {
                id: 'mov-' + Date.now(),
                timestamp: nowIso,
                fromLocation: p.currentLocation || 'Inward Area',
                toLocation: 'Dispatch Staging Bay',
                movedBy: moverName,
                reason: 'Staged for Outward Dispatch',
              },
            ],
          };
          syncPacksToCloud([updated]);
          return updated;
        }
        return p;
      })
    );
  };

  const handleSendMultipleToDispatch = (packIds: string[]) => {
    packIds.forEach((id) => {
      const found = packs.find((p) => p.id === id);
      if (found) handleSendToDispatch(found);
    });
  };

  // Remove Pack from Dispatch Cart back to previous location
  const handleRemoveFromCart = (packId: string) => {
    const nowIso = new Date().toISOString();
    const moverName = currentUser?.name || currentUser?.username || 'Staff';

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id === packId) {
          const prevLocation = p.lineId ? p.lineId + ', R-' + p.rackNumber + ', L-0' + p.rackSlot : 'Inward Area';
          const updated: BatteryPack = {
            ...p,
            status: p.lineId ? 'IN_STORAGE' : 'INWARD_AREA',
            locationArea: p.lineId ? 'Warehouse Storage' : 'Inward Area',
            currentLocation: prevLocation,
            movementHistory: [
              ...(p.movementHistory || []),
              {
                id: 'mov-' + Date.now(),
                timestamp: nowIso,
                fromLocation: 'Dispatch Staging Bay',
                toLocation: prevLocation,
                movedBy: moverName,
                reason: 'Removed from Dispatch Staging Cart',
              },
            ],
          };
          syncPacksToCloud([updated]);
          return updated;
        }
        return p;
      })
    );
  };

  const handleAddMultipleToCart = (packIds: string[]) => {
    packIds.forEach((id) => {
      const found = packs.find((p) => p.id === id);
      if (found) handleSendToDispatch(found);
    });
  };

  // Complete Outward Dispatch Lot Execution
  const handleApproveDispatchLot = (lot: DispatchLot, dispatchedPackIds: string[]) => {
    setDispatchLots((prev) => [lot, ...prev]);
    syncLotToCloud(lot);

    const nowIso = new Date().toISOString();
    const operatorName = currentUser?.name || currentUser?.username || 'Dispatch Lead';

    setPacks((prev) =>
      prev.map((p) => {
        if (dispatchedPackIds.includes(p.id)) {
          const updated: BatteryPack = {
            ...p,
            status: 'DISPATCHED',
            locationArea: 'Dispatched / In Transit',
            currentLocation: 'Dispatched to ' + lot.consigneeName,
            dispatchedAt: nowIso,
            dispatchedBy: operatorName,
            dispatchLotId: lot.id,
            dispatchDocNo: lot.transportDocNo,
            dispatchLrNo: lot.lrNumber,
            dispatchVehicleNo: lot.vehicleNumber,
            dispatchToAddress: lot.consigneeAddress,
            dispatchToCustomer: lot.consigneeName,
            movementHistory: [
              ...(p.movementHistory || []),
              {
                id: 'mov-' + Date.now(),
                timestamp: nowIso,
                fromLocation: 'Dispatch Staging Bay',
                toLocation: 'Dispatched (Vehicle ' + lot.vehicleNumber + ')',
                movedBy: operatorName,
                reason: 'Dispatched under Lot #' + lot.lotNumber + ' (LR: ' + lot.lrNumber + ')',
              },
            ],
          };
          syncPacksToCloud([updated]);
          return updated;
        }
        return p;
      })
    );
  };

  // Open Invoice Generation for a Dispatch Lot
  const handleGenerateInvoiceForLot = (lot: DispatchLot) => {
    setActiveLotForInvoice(lot);
    handleTabChange('INVOICES');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Top Professional Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalActivePacks={packs.filter((p) => p.sourceType !== 'LINE_POPULATE').length}
        cartPacksCount={stagedCartPacks.length}
        dispatchedLotsCount={dispatchLots.length}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onOpenLinePopulatorModal={() => setIsAdminPopulatorOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 pb-16">
        {activeTab === 'INWARD' && hasPermission('canInward') && (
          <InwardScanner
            existingPacks={packs}
            onAddPacks={handleAddInwardPacks}
            onNavigateToInwardLog={() => handleTabChange('INWARD_LOG')}
          />
        )}

        {activeTab === 'INWARD_LOG' && hasPermission('canInward') && (
          <InwardRegisterView
            packs={packs}
            onApproveInwardPack={handleApproveInwardPack}
            onApproveMultipleInwardPacks={handleApproveMultipleInwardPacks}
            onSendToDispatch={handleSendToDispatch}
            onSendMultipleToDispatch={handleSendMultipleToDispatch}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onMovePackToLocation={handleMovePackToLocation}
            onMoveMultiplePacksToLocation={handleMoveMultiplePacksToLocation}
            onEditPack={handleEditPack}
            onDeletePack={handleDeletePack}
          />
        )}

        {activeTab === 'TOTAL_STOCK' && hasPermission('canViewStock') && (
          <TotalStockView
            packs={packs}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onSendToDispatch={handleSendToDispatch}
            onDeletePack={handleDeletePack}
          />
        )}

        {activeTab === 'LINE_INSPECTOR' && hasPermission('canLineManage') && (
          <LineInspectorView
            packs={packs}
            warehouseLines={warehouseLines}
            onAddNewLine={handleAddNewWarehouseLine}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onSendToDispatch={handleSendToDispatch}
            onOpenRackLoader={(line, rack) => {
              setIsAdminPopulatorOpen(true);
            }}
            onDeletePack={handleDeletePack}
          />
        )}

        {activeTab === 'DISPATCH_CART' && hasPermission('canDispatch') && (
          <DispatchCart
            stagedPacks={stagedCartPacks}
            availableStoragePacks={activeStoragePacks}
            onRemoveFromCart={handleRemoveFromCart}
            onAddMultipleToCart={handleAddMultipleToCart}
            onApproveDispatchLot={handleApproveDispatchLot}
            onGenerateInvoiceForLot={handleGenerateInvoiceForLot}
          />
        )}

        {activeTab === 'INVOICES' && hasPermission('canInvoices') && (
          <InvoiceGenerator
            initialLot={activeLotForInvoice}
            savedInvoices={savedInvoices}
            onSaveInvoice={(newInvoice) => {
              setSavedInvoices((prev) => [newInvoice, ...prev]);
            }}
          />
        )}

        {activeTab === 'ANALYTICS' && hasPermission('canAnalytics') && (
          <AnalyticsView
            packs={packs}
            dispatchLots={dispatchLots}
            inwardShipments={inwardShipments}
          />
        )}
      </main>

      {/* MODAL 1: Individual Pack Pedigree & History */}
      {inspectingPack && (
        <PackDetailsModal
          pack={inspectingPack}
          onClose={() => setInspectingPack(null)}
          onSendToDispatch={(p) => {
            handleSendToDispatch(p);
            setInspectingPack(null);
          }}
        />
      )}

      {/* MODAL 2: Supabase Cloud Database Config */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* MODAL 3: Switch User Login Dialog */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* MODAL 4: User & Staff Management Modal (Super Admin & Manager) */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

      {/* MODAL 5: Historical Line & Rack Data Populator Modal */}
      {isAdminPopulatorOpen && (isSuperAdmin || isManager) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-5xl my-8">
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
    </div>
  );
}

export default App;
