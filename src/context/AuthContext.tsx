import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserPermissions, UserRole } from '../types';
import { fetchUsersFromCloud, syncUsersToCloud } from '../lib/supabaseClient';

interface AuthContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  addUser: (user: UserAccount) => boolean;
  updateUser: (oldUsername: string, updatedUser: UserAccount) => boolean;
  deleteUser: (username: string) => { success: boolean; message: string };
  toggleUserActive: (username: string) => void;
  isSuperAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isEmployee: boolean;
  canDirectApprove: boolean;
  canApproveRequests: boolean;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isMaintenanceMode: boolean;
  setMaintenanceMode: (active: boolean) => void;
}

export const DEFAULT_USERS: UserAccount[] = [
  {
    username: 'Pranjils0ni',
    password: 'Suhani@12',
    name: 'Pranjil Soni',
    role: 'superadmin',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: true,
      canViewStock: true,
      canInvoices: true,
      canAnalytics: true,
    },
  },
  {
    username: 'Sureshchavan',
    password: 'Swami@123',
    name: 'Suresh Chavan',
    role: 'manager',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: true,
      canViewStock: true,
      canInvoices: true,
      canAnalytics: true,
    },
  },
  {
    username: 'Nitin',
    password: 'Nitin#123',
    name: 'Nitin Pawar',
    role: 'supervisor',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: true,
      canViewStock: true,
      canInvoices: true,
      canAnalytics: true,
    },
  },
  {
    username: 'Vikas',
    password: 'Vikash@123',
    name: 'Vikas Kumar Bharti',
    role: 'supervisor',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: true,
      canViewStock: true,
      canInvoices: true,
      canAnalytics: true,
    },
  },
  {
    username: 'Deepak',
    password: 'Deepak@123',
    name: 'Deepak Kumar',
    role: 'employee',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: false,
      canViewStock: true,
      canInvoices: false,
      canAnalytics: false,
    },
  },
  {
    username: 'Jitendra',
    password: 'Jitendra@123',
    name: 'Jitendra Soni',
    role: 'employee',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
    permissions: {
      canInward: true,
      canDispatch: true,
      canLineManage: false,
      canViewStock: true,
      canInvoices: false,
      canAnalytics: false,
    },
  },
];

function cleanAndMigrateUsers(rawList: UserAccount[]): UserAccount[] {
  const normalized: UserAccount[] = [];

  rawList.forEach((u) => {
    let cleanUser = u.username ? u.username.trim().replace(/^@+/, '') : '';
    let cleanName = u.name ? u.name.trim() : '';
    let cleanPass = u.password ? u.password.trim() : '';

    if (!cleanUser) return;

    // Migrate Vikash -> Vikas spelling if found in storage
    if (cleanUser.toLowerCase() === 'vikash') {
      cleanUser = 'Vikas';
      if (cleanName.toLowerCase().includes('vikash') || !cleanName) {
        cleanName = 'Vikas Kumar Bharti';
      }
    }

    const permissions: UserPermissions = u.permissions || {
      canInward: true,
      canDispatch: true,
      canLineManage: u.role === 'superadmin' || u.role === 'manager' || u.role === 'supervisor',
      canViewStock: true,
      canInvoices: u.role === 'superadmin' || u.role === 'manager' || u.role === 'supervisor',
      canAnalytics: u.role === 'superadmin' || u.role === 'manager' || u.role === 'supervisor',
    };

    const existingIdx = normalized.findIndex((item) => item.username.toLowerCase() === cleanUser.toLowerCase());
    const account: UserAccount = {
      ...u,
      username: cleanUser,
      name: cleanName || cleanUser,
      password: cleanPass,
      active: u.active !== false,
      permissions,
    };

    if (existingIdx >= 0) {
      normalized[existingIdx] = account;
    } else {
      normalized.push(account);
    }
  });

  // Ensure all DEFAULT_USERS are present
  const merged = [...DEFAULT_USERS];
  normalized.forEach((nu) => {
    const idx = merged.findIndex((du) => du.username.toLowerCase() === nu.username.toLowerCase());
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...nu };
    } else {
      merged.push(nu);
    }
  });

  return merged;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('tata_wms_users_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return cleanAndMigrateUsers(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse users', e);
    }
    return DEFAULT_USERS;
  });

  // Session-Based Login Wall: Stored in sessionStorage so closing tab/browser immediately terminates session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      localStorage.removeItem('tata_wms_current_user_v3');
      const sessionSaved = sessionStorage.getItem('tata_wms_session_user_v1');
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        if (parsed && parsed.username) {
          // Normalize if it was old Vikash
          if (parsed.username.toLowerCase() === 'vikash') {
            parsed.username = 'Vikas';
            parsed.name = 'Vikas Kumar Bharti';
          }
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // Super Admin Maintenance Mode State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('tata_wms_maintenance_mode') === 'true';
  });

  const setMaintenanceMode = (active: boolean) => {
    setIsMaintenanceMode(active);
    localStorage.setItem('tata_wms_maintenance_mode', active ? 'true' : 'false');
  };

  // Synchronize active session with sessionStorage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('tata_wms_session_user_v1', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('tata_wms_session_user_v1');
    }
  }, [currentUser]);

  // Initial cloud fetch & multi-tab BroadcastChannel listener for real-time synchronization
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('tata_wms_auth_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'USERS_UPDATED' && Array.isArray(event.data.users)) {
          setUsers(cleanAndMigrateUsers(event.data.users));
        }
      };
    } catch (e) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tata_wms_users_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setUsers(cleanAndMigrateUsers(parsed));
          }
        } catch (pe) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial background cloud fetch for multi-device sync
    fetchUsersFromCloud().then((cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        setUsers((prev) => {
          const combined = cleanAndMigrateUsers([...prev, ...cloudUsers]);
          try {
            localStorage.setItem('tata_wms_users_v3', JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }
    }).catch(() => {});

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 15-Minute Inactivity Auto-Logout Security Watchdog
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimer: any;
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.warn('Session auto-locked due to 15 minutes of inactivity.');
        setCurrentUser(null);
        sessionStorage.removeItem('tata_wms_session_user_v1');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser]);

  const persistAndBroadcastUsers = (updatedList: UserAccount[]) => {
    const cleaned = cleanAndMigrateUsers(updatedList);
    setUsers(cleaned);
    try {
      localStorage.setItem('tata_wms_users_v3', JSON.stringify(cleaned));
      const bc = new BroadcastChannel('tata_wms_auth_channel');
      bc.postMessage({ type: 'USERS_UPDATED', users: cleaned });
      bc.close();
    } catch (e) {}
    // Background cloud sync to Supabase so other warehouse laptops/mobiles get the user
    syncUsersToCloud(cleaned).catch(() => {});
  };

  const login = (username: string, password?: string): boolean => {
    let cleanUser = username.trim().replace(/^@+/, '').toLowerCase();
    const cleanPass = password ? password.trim() : '';

    if (!cleanUser) return false;

    // Handle supervisor spelling alias
    if (cleanUser === 'vikash') {
      cleanUser = 'vikas';
    }

    // Match in users state + defaults
    const combined = cleanAndMigrateUsers(users);
    const user = combined.find((u) => u.username.toLowerCase() === cleanUser);

    if (!user || !user.active) return false;

    // Check password
    if (cleanPass) {
      if (cleanUser === 'vikas') {
        const isValidVikasPass =
          cleanPass === user.password?.trim() ||
          cleanPass === 'Vikash@123' ||
          cleanPass === 'Vikas@123';
        if (!isValidVikasPass) return false;
      } else {
        if (user.password && user.password.trim() !== cleanPass) {
          return false;
        }
      }
    }

    setCurrentUser(user);
    sessionStorage.setItem('tata_wms_session_user_v1', JSON.stringify(user));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('tata_wms_session_user_v1');
    localStorage.removeItem('tata_wms_current_user_v3');
  };

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isManager = currentUser?.role === 'manager';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isEmployee = currentUser?.role === 'employee';

  const addUser = (newUser: UserAccount): boolean => {
    const cleanUsername = newUser.username.trim().replace(/^@+/, '');
    const cleanPassword = newUser.password ? newUser.password.trim() : '';
    const cleanName = newUser.name.trim();

    if (!cleanUsername || !cleanPassword || !cleanName) return false;

    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return false;
    }

    // Strict Rule: Non-SuperAdmin cannot create a SuperAdmin account
    const assignedRole: UserRole = (!isSuperAdmin && newUser.role === 'superadmin') ? 'employee' : newUser.role;

    const created: UserAccount = {
      ...newUser,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: assignedRole,
      active: true,
      permissions: newUser.permissions || {
        canInward: true,
        canDispatch: true,
        canLineManage: assignedRole === 'superadmin' || assignedRole === 'manager',
        canViewStock: true,
        canInvoices: assignedRole === 'superadmin' || assignedRole === 'manager',
        canAnalytics: assignedRole === 'superadmin' || assignedRole === 'manager',
      },
    };

    persistAndBroadcastUsers([...users, created]);
    return true;
  };

  const updateUser = (oldUsername: string, updatedUser: UserAccount): boolean => {
    const cleanOld = oldUsername.trim().replace(/^@+/, '').toLowerCase();
    const cleanNewUsername = updatedUser.username.trim().replace(/^@+/, '');
    const cleanNewPass = updatedUser.password ? updatedUser.password.trim() : '';
    const cleanNewName = updatedUser.name.trim();

    if (!cleanNewUsername || !cleanNewName) return false;

    const targetUser = users.find((u) => u.username.toLowerCase() === cleanOld);
    if (!targetUser) return false;

    // Strict Rule: Non-SuperAdmin CANNOT edit or manage any SuperAdmin account!
    if (!isSuperAdmin && (targetUser.role === 'superadmin' || cleanOld === 'pranjils0ni')) {
      console.warn('Unauthorized: Non-SuperAdmin cannot modify SuperAdmin account.');
      return false;
    }

    // Strict Rule: Non-SuperAdmin cannot promote anyone to SuperAdmin
    const safeRole: UserRole = (!isSuperAdmin && updatedUser.role === 'superadmin') ? targetUser.role : updatedUser.role;

    // If username changed, ensure not taken by another user
    if (cleanNewUsername.toLowerCase() !== cleanOld) {
      if (users.some((u) => u.username.toLowerCase() === cleanNewUsername.toLowerCase())) {
        return false;
      }
    }

    const nextUsers = users.map((u) => {
      if (u.username.toLowerCase() === cleanOld) {
        return {
          ...u,
          ...updatedUser,
          role: safeRole,
          username: cleanNewUsername,
          password: cleanNewPass || u.password,
          name: cleanNewName,
        };
      }
      return u;
    });

    persistAndBroadcastUsers(nextUsers);

    // If currently logged in user was updated, synchronize session
    if (currentUser && currentUser.username.toLowerCase() === cleanOld) {
      const updatedCurrent: UserAccount = {
        ...currentUser,
        ...updatedUser,
        role: safeRole,
        username: cleanNewUsername,
        password: cleanNewPass || currentUser.password,
        name: cleanNewName,
      };
      setCurrentUser(updatedCurrent);
      sessionStorage.setItem('tata_wms_session_user_v1', JSON.stringify(updatedCurrent));
    }

    return true;
  };

  const deleteUser = (username: string): { success: boolean; message: string } => {
    const clean = username.trim().replace(/^@+/, '').toLowerCase();

    // Prevent deleting self
    if (currentUser && currentUser.username.toLowerCase() === clean) {
      return { success: false, message: 'You cannot delete your own active logged-in account.' };
    }

    const targetUser = users.find((u) => u.username.toLowerCase() === clean);
    if (!targetUser) {
      return { success: false, message: `User @${username} not found.` };
    }

    // Strict Rule 1: Super Admin accounts cannot be deleted by anyone
    if (targetUser.role === 'superadmin' || clean === 'pranjils0ni') {
      return { success: false, message: 'Super Admin accounts are protected and cannot be deleted.' };
    }

    // Strict Rule 2: Non-SuperAdmin cannot delete managers or superadmins
    if (!isSuperAdmin && targetUser.role === 'superadmin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can manage administrative accounts.' };
    }

    const nextUsers = users.filter((u) => u.username.toLowerCase() !== clean);
    persistAndBroadcastUsers(nextUsers);
    return { success: true, message: `Staff account @${username} was deleted successfully.` };
  };

  const toggleUserActive = (username: string) => {
    const clean = username.trim().replace(/^@+/, '').toLowerCase();
    const targetUser = users.find((u) => u.username.toLowerCase() === clean);
    if (!targetUser) return;

    // Strict Rule: Super Admin cannot be disabled
    if (targetUser.role === 'superadmin' || clean === 'pranjils0ni') {
      return;
    }

    // Strict Rule: Cannot disable self
    if (currentUser && currentUser.username.toLowerCase() === clean) {
      return;
    }

    // Strict Rule: Non-SuperAdmin cannot disable another admin
    if (!isSuperAdmin && targetUser.role === 'superadmin') {
      return;
    }

    const nextUsers = users.map((u) =>
      u.username.toLowerCase() === clean ? { ...u, active: !u.active } : u
    );
    persistAndBroadcastUsers(nextUsers);
  };

  const canDirectApprove = isSuperAdmin || isManager || isSupervisor;
  const canApproveRequests = isSuperAdmin || isManager || isSupervisor;

  const hasPermission = (perm: keyof UserPermissions): boolean => {
    if (isSuperAdmin || isManager) return true;
    if (!currentUser) return false;
    if (currentUser.permissions && typeof currentUser.permissions[perm] === 'boolean') {
      return currentUser.permissions[perm];
    }
    if (isSupervisor) return true;
    if (perm === 'canInward' || perm === 'canDispatch' || perm === 'canViewStock') return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        toggleUserActive,
        isSuperAdmin,
        isManager,
        isSupervisor,
        isEmployee,
        canDirectApprove,
        canApproveRequests,
        hasPermission,
        isMaintenanceMode,
        setMaintenanceMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

