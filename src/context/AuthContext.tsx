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

const DEFAULT_USERS: UserAccount[] = [
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
    const saved = localStorage.getItem('tata_wms_users_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse users', e);
      }
    }
    return DEFAULT_USERS;
  });

  // Strict Login Wall: Default to null if no valid saved session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('tata_wms_current_user_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          return parsed;
        }
      } catch (e) {}
    }
    return null; // Strict Login Screen
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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tata_wms_current_user_v3', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tata_wms_current_user_v3');
    }
  }, [currentUser]);

  const login = (username: string, password?: string): boolean => {
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.active
    );
    if (!user) return false;

    if (password && user.password && user.password !== password.trim()) {
      return false;
    }

    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
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
      prev.map((u) => (u.username === username ? { ...u, active: !u.active } : u))
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
