import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserPermissions, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  addUser: (user: UserAccount) => boolean;
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
    username: 'Vikash',
    password: 'Vikash@123',
    name: 'Vikash Kumar Bharti',
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('tata_wms_users_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults with saved users so no default user is ever missing
          const merged = [...DEFAULT_USERS];
          parsed.forEach((pu: UserAccount) => {
            const idx = merged.findIndex((du) => du.username.toLowerCase() === pu.username.toLowerCase());
            if (idx >= 0) {
              merged[idx] = pu;
            } else {
              merged.push(pu);
            }
          });
          return merged;
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
      // Clear legacy permanent localStorage login for strict security
      localStorage.removeItem('tata_wms_current_user_v3');
      
      const sessionSaved = sessionStorage.getItem('tata_wms_session_user_v1');
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        if (parsed && parsed.username) {
          return parsed;
        }
      }
    } catch (e) {}
    return null; // Strict Login Screen on browser open
  });

  // Super Admin Maintenance Mode State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('tata_wms_maintenance_mode') === 'true';
  });

  const setMaintenanceMode = (active: boolean) => {
    setIsMaintenanceMode(active);
    localStorage.setItem('tata_wms_maintenance_mode', active ? 'true' : 'false');
  };

  useEffect(() => {
    localStorage.setItem('tata_wms_users_v3', JSON.stringify(users));
  }, [users]);

  // Synchronize active session with sessionStorage only (destroys on tab close)
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('tata_wms_session_user_v1', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('tata_wms_session_user_v1');
    }
  }, [currentUser]);

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

    resetTimer(); // initialize timer

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser]);

  const login = (username: string, password?: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password ? password.trim() : '';

    // Search in current users state + defaults
    const combined = [...users];
    DEFAULT_USERS.forEach((du) => {
      if (!combined.some((u) => u.username.toLowerCase() === du.username.toLowerCase())) {
        combined.push(du);
      }
    });

    const user = combined.find(
      (u) => u.username.toLowerCase() === cleanUser && u.active
    );
    if (!user) return false;

    if (cleanPass && user.password && user.password !== cleanPass) {
      return false;
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

  const addUser = (newUser: UserAccount): boolean => {
    if (users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      return false;
    }
    setUsers((prev) => [...prev, newUser]);
    return true;
  };

  const toggleUserActive = (username: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.username.toLowerCase() === username.toLowerCase() ? { ...u, active: !u.active } : u))
    );
  };

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isManager = currentUser?.role === 'manager';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isEmployee = currentUser?.role === 'employee';

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
