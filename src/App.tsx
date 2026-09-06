import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InwardScanner } from './components/InwardScanner';
import { InwardRegisterView } from './components/InwardRegisterView';
import { TotalStockView } from './components/TotalStockView';
import { LineInspectorView } from './components/LineInspectorView';
import { DispatchCart } from './components/DispatchCart';
import { AnalyticsView } from './components/AnalyticsView';
import { DailyStockMaintenanceView } from './components/DailyStockMaintenanceView';
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
  DailyStockRecord,
} from './types';
import {
  createInitialWarehousePacks,
  createInitialDispatchLots,
  createInitialInwardShipments,
  createInitialDailyStockRecords,
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
} from './data/seedWarehouse';
import {
  getSupabase,
  fetchPacksFromCloud,
  fetchInwardsFromCloud,
  fetchLotsFromCloud,
  fetchDailyStockFromCloud,
  syncPacksToCloud,
  syncLotToCloud,
  syncInwardToCloud,
  syncDailyStockToCloud,
  deletePackFromCloud,
  deleteDailyStockFromCloud,
  mapRowToPack,
  mapRowToInward,
  mapRowToLot,
  mapRowToDailyStock,
  mapLotToDailyStock,
} from './lib/supabaseClient';
import { useAuth } from './context/AuthContext';
import { Wrench, ShieldAlert } from 'lucide-react';

// Route Helper Mappings
function getTabFromPath(path: string): string {
  const cleanPath = path.toLowerCase().replace(/^\/|\/$/g, '');
  if (cleanPath === 'dashboard' || cleanPath === '' || cleanPath === 'home') return 'DASHBOARD';
  if (cleanPath === 'inward') return 'INWARD';
  if (cleanPath === 'inward-register' || cleanPath === 'inward-log') return 'INWARD_LOG';
  if (cleanPath === 'stock' || cleanPath === 'total-stock') return 'TOTAL_STOCK';
  if (cleanPath === 'lines' || cleanPath === 'warehouse-lines') return 'LINE_INSPECTOR';
  if (cleanPath === 'dispatch' || cleanPath === 'dispatch-staging') return 'DISPATCH_CART';
  if (cleanPath === 'analytics' || cleanPath === 'reports') return 'ANALYTICS';
  if (cleanPath === 'daily-stock' || cleanPath === 'daily-stock-maintenance' || cleanPath === 'stock-maintenance') return 'DAILY_STOCK';
  return 'DASHBOARD';
}

function getPathFromTab(tab: string): string {
  switch (tab) {
    case 'DASHBOARD':
      return '/dashboard';
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
    case 'DAILY_STOCK':
      return '/daily-stock';
    default:
      return '/dashboard';
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

  const [dailyStockRecords, setDailyStockRecords] = useState<DailyStockRecord[]>(() => {
    const saved = localStorage.getItem('tata_wms_daily_stock_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return createInitialDailyStockRecords();
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
    localStorage.setItem('tata_wms_daily_stock_v1', JSON.stringify(dailyStockRecords));
  }, [dailyStockRecords]);

  useEffect(() => {
    saveStoredWarehouseLines(warehouseLines);
  }, [warehouseLines]);

  // Master Cloud Refresh (Pulls source of truth directly from Supabase Cloud)
  const refreshFromCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    try {
      const [cloudPacks, cloudInwards, cloudLots, cloudDailyStock] = await Promise.all([
        fetchPacksFromCloud(),
        fetchInwardsFromCloud(),
        fetchLotsFromCloud(),
        fetchDailyStockFromCloud(),
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
      if (cloudDailyStock !== null && cloudDailyStock.length > 0) {
        setDailyStockRecords(cloudDailyStock);
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
          // Check if this payload is an internal Daily Stock Maintenance ledger row
          const isDailyStockRow =
            payload.new?.consignee_name === 'DAILY_STOCK_MAINTENANCE' ||
            payload.old?.consignee_name === 'DAILY_STOCK_MAINTENANCE' ||
            payload.new?.id?.startsWith('daily-stock-') ||
            payload.old?.id?.startsWith('daily-stock-');

          if (isDailyStockRow) {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newDaily = mapLotToDailyStock(payload.new);
              setDailyStockRecords((prev) => {
                const idx = prev.findIndex((r) => r.id === newDaily.id || r.date === newDaily.date);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = newDaily;
                  return copy;
                }
                return [newDaily, ...prev];
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id || payload.new?.id;
              if (deletedId) {
                setDailyStockRecords((prev) => prev.filter((r) => r.id !== deletedId && !deletedId.endsWith(r.date)));
              }
            }
            return;
          }

          // Normal Dispatch Lot
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_stock_records' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newRec = mapRowToDailyStock(payload.new);
            setDailyStockRecords((prev) => {
              if (prev.some((r) => r.id === newRec.id || r.date === newRec.date)) {
                return prev.map((r) => (r.id === newRec.id || r.date === newRec.date ? newRec : r));
              }
              return [newRec, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRec = mapRowToDailyStock(payload.new);
            setDailyStockRecords((prev) =>
              prev.map((r) => (r.id === updatedRec.id || r.date === updatedRec.date ? updatedRec : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id || payload.new?.id;
            if (deletedId) {
              setDailyStockRecords((prev) => prev.filter((r) => r.id !== deletedId));
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

  // Handler: Add Inward Packs (with 30-Day Auto Reconciliation for Direct Dispatches)
  const handleAddInwardPacks = async (
    newPacks: BatteryPack[],
    shipmentRecord: InwardShipmentRecord
  ) => {
    let reconciledCount = 0;
    const packsMap = new Map<string, BatteryPack>();
    packs.forEach((p) => packsMap.set(p.id, p));

    const packsToSync: BatteryPack[] = [];

    newPacks.forEach((newP) => {
      // Find matching dispatched pack by packNumber that was waiting for inward reconciliation
      const pendingMatch = Array.from(packsMap.values()).find(
        (p) =>
          p.status === 'DISPATCHED' &&
          p.packNumber === newP.packNumber &&
          (p.pendingInwardReconciliation || p.sourceType === 'DIRECT_DISPATCH' || !p.inwardDate)
      );

      if (pendingMatch) {
        // Link inward data to the previously dispatched pack
        const reconciledPack: BatteryPack = {
          ...pendingMatch,
          inwardDate: shipmentRecord.timestamp || new Date().toISOString(),
          documentNo: shipmentRecord.documentNo,
          dealershipName: shipmentRecord.dealershipName,
          receivedState: shipmentRecord.receivedState,
          transportName: shipmentRecord.transportName,
          hasInwardStamp: shipmentRecord.hasInwardStamp,
          inwardBy: shipmentRecord.inwardBy,
          pendingInwardReconciliation: false,
          reconciledAt: new Date().toISOString(),
          notes: `${pendingMatch.notes || ''} [Auto-Reconciled with Inward DC #${shipmentRecord.documentNo} on ${new Date().toLocaleDateString('en-IN')}]`.trim(),
        };
        packsMap.set(pendingMatch.id, reconciledPack);
        packsToSync.push(reconciledPack);
        reconciledCount++;
      } else {
        packsMap.set(newP.id, newP);
        packsToSync.push(newP);
      }
    });

    const finalPacks = Array.from(packsMap.values());
    setPacks(finalPacks);
    setInwardShipments((prev) => [shipmentRecord, ...prev]);

    try {
      await Promise.all([
        syncPacksToCloud(packsToSync),
        syncInwardToCloud(shipmentRecord),
      ]);
    } catch (err) {
      console.warn('Cloud sync on inward:', err);
    }

    if (reconciledCount > 0) {
      alert(`⚡ 30-Day Auto-Reconciliation Complete: ${reconciledCount} inward pack(s) were automatically matched & linked with previously dispatched records!`);
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

  // Handler: Save Historical Line Matrix Packs (with 30-Day Auto Reconciliation)
  const handleSaveAdminLinePacks = async (newPacks: BatteryPack[]) => {
    const packsMap = new Map<string, BatteryPack>();
    packs.forEach((p) => packsMap.set(p.id, p));

    const packsToSync: BatteryPack[] = [];

    newPacks.forEach((newP) => {
      const pendingMatch = Array.from(packsMap.values()).find(
        (p) =>
          p.status === 'DISPATCHED' &&
          p.packNumber === newP.packNumber &&
          (p.pendingInwardReconciliation || p.sourceType === 'DIRECT_DISPATCH' || !p.inwardDate)
      );

      if (pendingMatch) {
        const reconciledPack: BatteryPack = {
          ...pendingMatch,
          lineId: newP.lineId,
          rackNumber: newP.rackNumber,
          rackSlot: newP.rackSlot,
          pendingInwardReconciliation: false,
          reconciledAt: new Date().toISOString(),
          notes: `${pendingMatch.notes || ''} [Matrix Line Pos: Line ${newP.lineId} Rack ${newP.rackNumber}]`.trim(),
        };
        packsMap.set(pendingMatch.id, reconciledPack);
        packsToSync.push(reconciledPack);
      } else {
        packsMap.set(newP.id, newP);
        packsToSync.push(newP);
      }
    });

    const finalPacks = Array.from(packsMap.values());
    setPacks(finalPacks);

    try {
      await syncPacksToCloud(packsToSync);
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

  // Handler: Approve Outward Dispatch Lot (supports both Staged Packs & Direct Fast Bulk Dispatch Packs)
  const handleApproveDispatchLot = async (lot: DispatchLot) => {
    setDispatchLots((prev) => [lot, ...prev]);

    const existingPackMap = new Map<string, BatteryPack>();
    packs.forEach((p) => existingPackMap.set(p.id, p));

    // Also index existing by packNumber
    const existingNumberMap = new Map<string, BatteryPack>();
    packs.forEach((p) => existingNumberMap.set(p.packNumber, p));

    const dispatchedPacksToSync: BatteryPack[] = [];

    lot.packs.forEach((lotPack) => {
      const existing = existingPackMap.get(lotPack.id) || existingNumberMap.get(lotPack.packNumber);
      if (existing) {
        const updated: BatteryPack = {
          ...existing,
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
        existingPackMap.set(existing.id, updated);
        dispatchedPacksToSync.push(updated);
      } else {
        // Brand new direct dispatched pack (Pre-inward direct dispatch)
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const newDirectPack: BatteryPack = {
          ...lotPack,
          id: lotPack.id || `pack-direct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          status: 'DISPATCHED' as const,
          sourceType: 'DIRECT_DISPATCH' as const,
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
          pendingInwardReconciliation: true,
          reconciliationValidUntil: validUntil,
          inwardDate: '',
          documentNo: 'DIRECT-DISPATCH',
          dealershipName: 'Direct Plant Dispatch',
          receivedState: 'Maharashtra',
          transportName: lot.transportName || 'Sahyadri Enterprises',
          hasInwardStamp: false,
          inwardBy: lot.dispatchedBy || 'Dispatcher',
          movementHistory: [
            {
              id: `mov-${Date.now()}`,
              timestamp: lot.timestamp,
              fromLocation: 'High-Load Direct Dispatch',
              toLocation: `Dispatched to ${lot.consigneeName}`,
              movedBy: lot.dispatchedBy || 'Dispatcher',
              reason: 'Direct Bulk Dispatch (30-Day Auto-Reconciliation Window)',
            },
          ],
        };
        existingPackMap.set(newDirectPack.id, newDirectPack);
        dispatchedPacksToSync.push(newDirectPack);
      }
    });

    const finalPacks = Array.from(existingPackMap.values());
    setPacks(finalPacks);

    try {
      await syncLotToCloud(lot);
      await syncPacksToCloud(dispatchedPacksToSync);
    } catch (err) {
      console.warn('Cloud sync on lot dispatch:', err);
    }
  };

  // Handler: Save Daily Stock Maintenance Record
  const handleSaveDailyStockRecord = async (record: DailyStockRecord) => {
    setDailyStockRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id || r.date === record.date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });

    try {
      await syncDailyStockToCloud(record);
    } catch (err) {
      console.warn('Cloud sync on daily stock record:', err);
    }
  };

  // Handler: Delete Daily Stock Maintenance Record
  const handleDeleteDailyStockRecord = async (recordId: string) => {
    setDailyStockRecords((prev) => prev.filter((r) => r.id !== recordId));
    try {
      await deleteDailyStockFromCloud(recordId);
    } catch (err) {
      console.warn('Cloud sync on delete daily stock record:', err);
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
        inwardPacksCount={packs.filter((p) => p.sourceType !== 'LINE_POPULATE' && p.sourceType !== 'DIRECT_DISPATCH' && p.documentNo !== 'DIRECT-DISPATCH').length}
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
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            packs={packs}
            dispatchLots={dispatchLots}
            inwardShipments={inwardShipments}
            onOpenPackDetails={(pack) => setInspectingPack(pack)}
            onNavigateToTab={(tab) => handleTabChange(tab)}
          />
        )}

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
            onEditPack={handleEditPack}
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
            onEditPack={handleEditPack}
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

        {activeTab === 'DAILY_STOCK' && hasPermission('canViewStock') && (
          <DailyStockMaintenanceView
            dailyStockRecords={dailyStockRecords}
            onSaveDailyStockRecord={handleSaveDailyStockRecord}
            onDeleteDailyStockRecord={handleDeleteDailyStockRecord}
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
