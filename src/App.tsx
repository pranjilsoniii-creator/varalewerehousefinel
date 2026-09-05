import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { InwardScanner } from './components/InwardScanner';
import { InwardRegisterView } from './components/InwardRegisterView';
import { TotalStockView } from './components/TotalStockView';
import { LineInspectorView } from './components/LineInspectorView';
import { DispatchCart } from './components/DispatchCart';
import { AnalyticsView } from './components/AnalyticsView';
import { PackDetailsModal } from './components/PackDetailsModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { AdminLineDataPopulator } from './components/AdminLineDataPopulator';
import { WelcomeHeader } from './components/WelcomeHeader';
import { SuperSearchModal } from './components/SuperSearchModal';
import {
  BatteryPack,
  DispatchLot,
  InwardShipmentRecord,
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
  fetchInwardsFromCloud,
  fetchLotsFromCloud,
  syncPacksToCloud,
  syncLotToCloud,
  syncInwardToCloud,
  deletePackFromCloud,
  mapRowToPack,
  mapRowToInward,
  mapRowToLot,
} from './lib/supabaseClient';
import { useAuth } from './context/AuthContext';
import { Wrench, ShieldAlert } from 'lucide-react';

// Route Helper Mappings (Without Invoices)
function getTabFromPath(path: string): string {
  const cleanPath = path.toLowerCase().replace(/^\/|\/$/g, '');
  if (cleanPath === 'inward') return 'INWARD';
  if (cleanPath === 'inward-register' || cleanPath === 'inward-log') return 'INWARD_LOG';
  if (cleanPath === 'stock' || cleanPath === 'total-stock') return 'TOTAL_STOCK';
  if (cleanPath === 'lines' || cleanPath === 'warehouse-lines') return 'LINE_INSPECTOR';
  if (cleanPath === 'dispatch' || cleanPath === 'dispatch-staging') return 'DISPATCH_CART';
  if (cleanPath === 'analytics' || cleanPath === 'reports') return 'ANALYTICS';
  return 'TOTAL_STOCK';
}

function getPathFromTab(tab: string): string {
  switch (tab) {
    case 'INWARD':
      return '/inward';
    case 'INWARD_LOG':
      return '/inward-register';
    case 'TOTAL_STOCK':
      return '/stock';
    case 'LINE_INSPECTOR':
      return '/lines';
    case 'DISPATCH_CART':
      return '/dispatch';
    case 'ANALYTICS':
      return '/analytics';
    default:
      return '/stock';
  }
}

export function App() {
  const { currentUser, isSuperAdmin, isManager, isSupervisor, hasPermission, isMaintenanceMode, setMaintenanceMode } = useAuth();

  // Navigation Tab State initialized from URL
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getTabFromPath(window.location.pathname);
  });

  // Modal States
  const [inspectingPack, setInspectingPack] = useState<BatteryPack | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [isAdminPopulatorOpen, setIsAdminPopulatorOpen] = useState<boolean>(false);
  const [isSuperSearchOpen, setIsSuperSearchOpen] = useState<boolean>(false);

  // Core Warehouse State initialized with clean local cache
  const [packs, setPacks] = useState<BatteryPack[]>(() => {
    const saved = localStorage.getItem('tata_wms_packs_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return createInitialWarehousePacks();
  });

  const [inwardShipments, setInwardShipments] = useState<InwardShipmentRecord[]>(() => {
    const saved = localStorage.getItem('tata_wms_inwards_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return createInitialInwardShipments();
  });

  const [dispatchLots, setDispatchLots] = useState<DispatchLot[]>(() => {
    const saved = localStorage.getItem('tata_wms_lots_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return createInitialDispatchLots();
  });

  const [warehouseLines, setWarehouseLines] = useState<string[]>(() => {
    return getStoredWarehouseLines();
  });

  // Realtime Cloud Connection State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Handle URL changes & browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const targetPath = getPathFromTab(newTab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Synchronize LocalStorage as offline fallback
  useEffect(() => {
    localStorage.setItem('tata_wms_packs_v4', JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    localStorage.setItem('tata_wms_inwards_v4', JSON.stringify(inwardShipments));
  }, [inwardShipments]);

  useEffect(() => {
    localStorage.setItem('tata_wms_lots_v4', JSON.stringify(dispatchLots));
  }, [dispatchLots]);

  useEffect(() => {
    saveStoredWarehouseLines(warehouseLines);
  }, [warehouseLines]);

  // Master Cloud Refresh (Pulls source of truth directly from Supabase Cloud)
  const refreshFromCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    try {
      const [cloudPacks, cloudInwards, cloudLots] = await Promise.all([
        fetchPacksFromCloud(),
        fetchInwardsFromCloud(),
        fetchLotsFromCloud(),
      ]);

      if (cloudPacks !== null) {
        setPacks(cloudPacks);
      }
      if (cloudInwards !== null) {
        setInwardShipments(cloudInwards);
      }
      if (cloudLots !== null) {
        setDispatchLots(cloudLots);
      }
      setLastSyncTime(new Date());
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Manual cloud sync failed:', err);
      setIsCloudConnected(false);
    } finally {
      setIsCloudSyncing(false);
    }
  }, []);

  // Initial Cloud Load on Component Mount
  useEffect(() => {
    refreshFromCloud();
  }, [refreshFromCloud]);

  // Supabase Real-time Cloud Subscriptions across all three core tables
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel('warehouse-realtime-master')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battery_packs' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newPack = mapRowToPack(payload.new);
            setPacks((prev) => {
              if (prev.some((p) => p.id === newPack.id)) {
                return prev.map((p) => (p.id === newPack.id ? newPack : p));
              }
              return [newPack, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPack = mapRowToPack(payload.new);
            setPacks((prev) =>
              prev.map((p) => (p.id === updatedPack.id ? updatedPack : p))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id || payload.new?.id;
            if (deletedId) {
              setPacks((prev) => prev.filter((p) => p.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inward_shipments' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newInward = mapRowToInward(payload.new);
            setInwardShipments((prev) => {
              if (prev.some((i) => i.id === newInward.id)) {
                return prev.map((i) => (i.id === newInward.id ? newInward : i));
              }
              return [newInward, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInward = mapRowToInward(payload.new);
            setInwardShipments((prev) =>
              prev.map((i) => (i.id === updatedInward.id ? updatedInward : i))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id || payload.new?.id;
            if (deletedId) {
              setInwardShipments((prev) => prev.filter((i) => i.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_lots' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newLot = mapRowToLot(payload.new);
            setDispatchLots((prev) => {
              if (prev.some((l) => l.id === newLot.id)) {
                return prev.map((l) => (l.id === newLot.id ? newLot : l));
              }
              return [newLot, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLot = mapRowToLot(payload.new);
            setDispatchLots((prev) =>
              prev.map((l) => (l.id === updatedLot.id ? updatedLot : l))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id || payload.new?.id;
            if (deletedId) {
              setDispatchLots((prev) => prev.filter((l) => l.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        setIsCloudConnected(status === 'SUBSCRIBED');
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Handler: Add Inward Packs
  const handleAddInwardPacks = async (
    newPacks: BatteryPack[],
    shipmentRecord: InwardShipmentRecord
  ) => {
    // Optimistic UI Update
    setPacks((prev) => [...newPacks, ...prev]);
    setInwardShipments((prev) => [shipmentRecord, ...prev]);

    try {
      await Promise.all([
        syncPacksToCloud(newPacks),
        syncInwardToCloud(shipmentRecord),
      ]);
    } catch (err) {
      console.warn('Cloud sync on inward:', err);
    }
  };

  // Handler: Approve Inward Pack
  const handleApproveInwardPack = async (packId: string) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Supervisor';
    const nowIso = new Date().toISOString();

    const updatedPacks = packs.map((p) => {
      if (p.id === packId) {
        return {
          ...p,
          status: 'INWARD_AREA' as const,
          inwardApprovedBy: operatorName,
          inwardApprovedAt: nowIso,
          movementHistory: [
            ...p.movementHistory,
            {
              id: `mov-${Date.now()}`,
              timestamp: nowIso,
              fromLocation: 'Inward Dock',
              toLocation: 'Inward Area (Approved)',
              movedBy: operatorName,
              reason: 'Supervisor Approval',
            },
          ],
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    const approvedPack = updatedPacks.find((p) => p.id === packId);
    if (approvedPack) {
      try {
        await syncPacksToCloud([approvedPack]);
      } catch (err) {
        console.warn('Cloud sync on approve:', err);
      }
    }
  };

  // Handler: Save Historical Line Matrix Packs
  const handleSaveAdminLinePacks = async (newPacks: BatteryPack[]) => {
    setPacks((prev) => {
      const lineMap = new Map<string, BatteryPack>();
      prev.forEach((p) => lineMap.set(p.id, p));
      newPacks.forEach((np) => lineMap.set(np.id, np));
      return Array.from(lineMap.values());
    });

    try {
      await syncPacksToCloud(newPacks);
    } catch (err) {
      console.warn('Cloud sync on line populator:', err);
    }
  };

  // Handler: Permanent Delete Pack
  const handleDeletePack = async (packId: string) => {
    setPacks((prev) => prev.filter((p) => p.id !== packId));
    try {
      await deletePackFromCloud(packId);
    } catch (err) {
      console.warn('Cloud sync on delete pack:', err);
    }
  };

  // Handler: Edit Pack
  const handleEditPack = async (updatedPack: BatteryPack) => {
    setPacks((prev) =>
      prev.map((p) => (p.id === updatedPack.id ? updatedPack : p))
    );
    try {
      await syncPacksToCloud([updatedPack]);
    } catch (err) {
      console.warn('Cloud sync on edit pack:', err);
    }
  };

  // Handler: Add New Warehouse Line
  const handleAddNewWarehouseLine = (newLine: string) => {
    if (!warehouseLines.includes(newLine)) {
      setWarehouseLines((prev) => [...prev, newLine]);
    }
  };

  // Handler: Move Pack to Dispatch Staging
  const handleSendToDispatch = async (pack: BatteryPack) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    const nowIso = new Date().toISOString();

    const updatedPacks = packs.map((p) => {
      if (p.id === pack.id) {
        return {
          ...p,
          status: 'IN_DISPATCH_AREA' as const,
          locationArea: 'Dispatch Staging Bay',
          currentLocation: 'Dispatch Bay',
          movementHistory: [
            ...p.movementHistory,
            {
              id: `mov-${Date.now()}`,
              timestamp: nowIso,
              fromLocation: p.currentLocation || 'Warehouse Storage',
              toLocation: 'Dispatch Staging Bay',
              movedBy: operatorName,
              reason: 'Staged for Outward Dispatch',
            },
          ],
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    const updated = updatedPacks.find((p) => p.id === pack.id);
    if (updated) {
      try {
        await syncPacksToCloud([updated]);
      } catch (err) {
        console.warn('Cloud sync on dispatch staging:', err);
      }
    }
  };

  // Handler: Remove from Dispatch Cart
  const handleRemoveFromCart = async (packId: string) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    const nowIso = new Date().toISOString();

    const updatedPacks = packs.map((p) => {
      if (p.id === packId) {
        return {
          ...p,
          status: 'IN_STORAGE' as const,
          locationArea: p.lineId ? `Line ${p.lineId}` : 'Storage Rack',
          currentLocation: p.lineId && p.rackNumber ? `${p.lineId}-R${p.rackNumber}` : 'Warehouse Storage',
          movementHistory: [
            ...p.movementHistory,
            {
              id: `mov-${Date.now()}`,
              timestamp: nowIso,
              fromLocation: 'Dispatch Bay',
              toLocation: p.lineId ? `Line ${p.lineId}` : 'Warehouse Storage',
              movedBy: operatorName,
              reason: 'Returned to storage rack from dispatch cart',
            },
          ],
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    const updated = updatedPacks.find((p) => p.id === packId);
    if (updated) {
      try {
        await syncPacksToCloud([updated]);
      } catch (err) {
        console.warn('Cloud sync on return to storage:', err);
      }
    }
  };

  // Handler: Add Multiple Packs to Dispatch Cart
  const handleAddMultipleToCart = async (packsToAdd: BatteryPack[]) => {
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    const nowIso = new Date().toISOString();
    const idsToAdd = new Set(packsToAdd.map((p) => p.id));

    const updatedPacks = packs.map((p) => {
      if (idsToAdd.has(p.id)) {
        return {
          ...p,
          status: 'IN_DISPATCH_AREA' as const,
          locationArea: 'Dispatch Staging Bay',
          currentLocation: 'Dispatch Bay',
          movementHistory: [
            ...p.movementHistory,
            {
              id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: nowIso,
              fromLocation: p.currentLocation || 'Warehouse Storage',
              toLocation: 'Dispatch Staging Bay',
              movedBy: operatorName,
              reason: 'Bulk staged for Outward Dispatch',
            },
          ],
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    const updatedList = updatedPacks.filter((p) => idsToAdd.has(p.id));
    try {
      await syncPacksToCloud(updatedList);
    } catch (err) {
      console.warn('Cloud sync on bulk dispatch staging:', err);
    }
  };

  // Handler: Approve Outward Dispatch Lot
  const handleApproveDispatchLot = async (lot: DispatchLot) => {
    setDispatchLots((prev) => [lot, ...prev]);

    const lotPackIds = new Set(lot.packs.map((p) => p.id));
    const updatedPacks = packs.map((p) => {
      if (lotPackIds.has(p.id)) {
        return {
          ...p,
          status: 'DISPATCHED' as const,
          currentLocation: `Dispatched to ${lot.consigneeName}`,
          locationArea: 'Dispatched to EV Plant',
          dispatchLotId: lot.id,
          dispatchedAt: lot.timestamp,
          dispatchDocNo: lot.transportDocNo || lot.lotNumber,
          dispatchLrNo: lot.lrNumber || '',
          dispatchVehicleNo: lot.vehicleNumber || '',
          dispatchTransporter: lot.transportName || 'Sahyadri Enterprises',
          dispatchToCustomer: lot.consigneeName || 'TATA AUTOCOMP',
          dispatchToAddress: lot.consigneeAddress || 'Pune / Maharashtra',
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    try {
      await syncLotToCloud(lot);
      const dispatchedList = updatedPacks.filter((p) => lotPackIds.has(p.id));
      await syncPacksToCloud(dispatchedList);
    } catch (err) {
      console.warn('Cloud sync on lot dispatch:', err);
    }
  };

  // Derived state subsets
  const totalActiveStorage = packs.filter((p) => p.status === 'IN_STORAGE').length;
  const stagedCartPacks = packs.filter((p) => p.status === 'IN_DISPATCH_AREA');
  const activeStoragePacks = packs.filter((p) => p.status === 'IN_STORAGE' || p.status === 'INWARD_AREA');

  // STRICT LOGIN WALL: If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // SUPER ADMIN MAINTENANCE LOCKDOWN SCREEN FOR NON-ADMIN STAFF
  if (isMaintenanceMode && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-xs font-sans">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl text-center">
          <div className="h-16 w-16 mx-auto bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/tata-logo.png" alt="TATA Logo" className="h-12 w-12 object-contain" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <Wrench className="w-3.5 h-3.5" /> Maintenance Mode Active
            </div>
            <h2 className="text-xl font-bold text-white font-display">System Maintenance In Progress</h2>
            <p className="text-slate-300 text-xs">
              Tata AutoComp Systems Limited (Varale B300 Plant)
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-2xl text-left space-y-2 text-slate-400 font-mono-code text-[11px]">
            <p className="text-amber-300 font-bold">Portal Temporarily Locked for Upgrades</p>
            <p>
              Database optimization and new feature enhancements are currently being applied by Super Admin.
              Normal warehouse operations will resume shortly.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Check Status & Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Executive White Header Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        inwardPacksCount={packs.filter((p) => p.sourceType !== 'LINE_POPULATE' && p.status !== 'DISPATCHED').length}
        totalStockCount={packs.filter((p) => p.status !== 'DISPATCHED').length}
        cartPacksCount={stagedCartPacks.length}
        dispatchedLotsCount={dispatchLots.length}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onOpenLinePopulatorModal={() => setIsAdminPopulatorOpen(true)}
      />

      {/* Dynamic Personalized Greeting & Live Realtime Cloud Sync Banner */}
      <WelcomeHeader
        onOpenSuperSearch={() => setIsSuperSearchOpen(true)}
        isCloudConnected={isCloudConnected}
        isCloudSyncing={isCloudSyncing}
        lastSyncTime={lastSyncTime}
        onRefreshCloud={refreshFromCloud}
      />

      {/* Main Body View Rendering */}
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
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onAllocatePackToRack={(pack) => handleTabChange('LINE_INSPECTOR')}
            onDeletePack={handleDeletePack}
            onEditPack={handleEditPack}
          />
        )}

        {activeTab === 'TOTAL_STOCK' && hasPermission('canViewStock') && (
          <TotalStockView
            packs={packs}
            dispatchLots={dispatchLots}
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
            onAllocatePackSlot={async (updatedPack) => {
              setPacks((prev) =>
                prev.map((p) => (p.id === updatedPack.id ? updatedPack : p))
              );
              try {
                await syncPacksToCloud([updatedPack]);
              } catch (err) {
                console.warn('Cloud sync on rack slot allocation:', err);
              }
            }}
            onClearSlot={async (packId) => {
              const packToClear = packs.find((p) => p.id === packId);
              if (!packToClear) return;
              const clearedPack: BatteryPack = {
                ...packToClear,
                status: 'INWARD_AREA',
                locationArea: 'Inward Area',
                currentLocation: 'Inward Area',
                lineId: undefined,
                rackNumber: undefined,
                level: undefined,
                slotPosition: undefined,
              };
              setPacks((prev) =>
                prev.map((p) => (p.id === packId ? clearedPack : p))
              );
              try {
                await syncPacksToCloud([clearedPack]);
              } catch (err) {
                console.warn('Cloud sync on clear slot:', err);
              }
            }}
            onOpenPopulatorModal={() => setIsAdminPopulatorOpen(true)}
          />
        )}

        {activeTab === 'DISPATCH_CART' && hasPermission('canDispatch') && (
          <DispatchCart
            stagedPacks={stagedCartPacks}
            availableStoragePacks={activeStoragePacks}
            onRemoveFromCart={handleRemoveFromCart}
            onAddMultipleToCart={handleAddMultipleToCart}
            onApproveDispatchLot={handleApproveDispatchLot}
          />
        )}

        {activeTab === 'ANALYTICS' && hasPermission('canAnalytics') && (
          <AnalyticsView
            packs={packs}
            dispatchLots={dispatchLots}
            inwardShipments={inwardShipments}
            warehouseLines={warehouseLines}
            onResetToDemoData={() => {
              if (confirm('Reset warehouse inventory and lots to fresh demo state?')) {
                localStorage.removeItem('tata_wms_packs_v4');
                localStorage.removeItem('tata_wms_lots_v4');
                localStorage.removeItem('tata_wms_inwards_v4');
                window.location.reload();
              }
            }}
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

      {/* MODAL 0: Universal Super Search ("Janamkundli") */}
      <SuperSearchModal
        isOpen={isSuperSearchOpen}
        onClose={() => setIsSuperSearchOpen(false)}
        packs={packs}
        dispatchLots={dispatchLots}
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
