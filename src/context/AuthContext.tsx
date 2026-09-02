import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types';

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
}

const DEFAULT_USERS: UserAccount[] = [
  {
    username: 'Pranjils0ni',
    password: 'Suhani@12',
    name: 'Pranjil Soni',
    role: 'superadmin',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
  {
    username: 'Sureshchavan',
    password: 'Swami@123',
    name: 'Suresh Chavan',
    role: 'manager',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
  {
    username: 'Nitin',
    password: 'Nitin#123',
    name: 'Nitin Pawar',
    role: 'supervisor',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
  {
    username: 'Vikash',
    password: 'Vikash@123',
    name: 'Vikash Kumar Bharti',
    role: 'supervisor',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
  {
    username: 'Deepak',
    password: 'Deepak@123',
    name: 'Deepak Kumar',
    role: 'employee',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
  {
    username: 'Jitendra',
    password: 'Jitendra@123',
    name: 'Jitendra Soni',
    role: 'employee',
    plant: 'Tata AutoComp Systems Limited - Varale / Chakan',
    active: true,
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('tata_wms_users_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    return DEFAULT_USERS;
  });

  // MANDATORY LOGIN WALL: Always start as null so nobody can access without entering credentials!
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    // Clear old legacy auto-login keys from browser
    try {
      localStorage.removeItem('tata_wms_curr_user_v3');
      localStorage.removeItem('tata_wms_curr_user');
      sessionStorage.removeItem('tata_wms_curr_user_v3');
    } catch (e) {}

    const saved = sessionStorage.getItem('tata_wms_session_user_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current user', e);
      }
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem('tata_wms_users_v4', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('tata_wms_session_user_v4', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('tata_wms_session_user_v4');
      localStorage.removeItem('tata_wms_curr_user_v3');
      localStorage.removeItem('tata_wms_curr_user');
    }
  }, [currentUser]);

  const login = (username: string, password?: string): boolean => {
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.active &&
        (!password || !u.password || u.password === password.trim())
    );

    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('tata_wms_session_user_v4');
    localStorage.removeItem('tata_wms_curr_user_v3');
    localStorage.removeItem('tata_wms_curr_user');
  };

  const addUser = (newUser: UserAccount): boolean => {
    if (users.some((u) => u.username.toLowerCase() === newUser.username.trim().toLowerCase())) {
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

  const role = currentUser?.role;
  const isSuperAdmin = role === 'superadmin';
  const isManager = role === 'manager' || isSuperAdmin;
  const isSupervisor = role === 'supervisor' || isManager || isSuperAdmin;
  const isEmployee = role === 'employee';

  const canDirectApprove = isManager || isSuperAdmin;
  const canApproveRequests = isSupervisor || isManager || isSuperAdmin;

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
