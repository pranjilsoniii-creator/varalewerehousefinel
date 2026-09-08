import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  X,
  Check,
  Lock,
  UserCheck,
  AlertCircle,
  Building,
  Key,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Search,
  CheckCircle2,
  Save,
  Users,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount, UserPermissions, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    currentUser,
    isSuperAdmin,
    isManager,
  } = useAuth();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Create User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newPlant, setNewPlant] = useState('Tata AutoComp Systems Limited - Varale / Chakan');

  // Create User Granular Permissions
  const [canInward, setCanInward] = useState(true);
  const [canDispatch, setCanDispatch] = useState(true);
  const [canLineManage, setCanLineManage] = useState(false);
  const [canViewStock, setCanViewStock] = useState(true);
  const [canInvoices, setCanInvoices] = useState(false);
  const [canAnalytics, setCanAnalytics] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editOldUsername, setEditOldUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editPlant, setEditPlant] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    canInward: true,
    canDispatch: true,
    canLineManage: false,
    canViewStock: true,
    canInvoices: false,
    canAnalytics: false,
  });

  // Password visibility map for table rows
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Feedback Notification
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const canManage = isSuperAdmin || isManager;

  const togglePasswordReveal = (username: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [username]: !prev[username] }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: `${label} copied to clipboard!` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanUser = newUsername.trim().replace(/^@+/, '');
    const cleanPass = newPassword.trim();
    const cleanName = newName.trim();

    if (!cleanUser || !cleanPass || !cleanName) {
      setMessage({ type: 'error', text: 'All fields (Full Name, Username, Password) are required.' });
      return;
    }

    const newUser: UserAccount = {
      username: cleanUser,
      password: cleanPass,
      name: cleanName,
      role: newRole,
      plant: newPlant.trim(),
      active: true,
      permissions: {
        canInward,
        canDispatch,
        canLineManage: newRole === 'superadmin' || newRole === 'manager' || canLineManage,
        canViewStock,
        canInvoices: newRole === 'superadmin' || newRole === 'manager' || canInvoices,
        canAnalytics: newRole === 'superadmin' || newRole === 'manager' || canAnalytics,
      },
    };

    const ok = addUser(newUser);
    if (ok) {
      setMessage({
        type: 'success',
        text: `Staff Account "${cleanName}" (@${cleanUser}) created with Password "${cleanPass}" successfully!`,
      });
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: 'error', text: `Username "@${cleanUser}" is already taken. Please choose another.` });
    }
  };

  const startEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setEditOldUsername(user.username);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditPlant(user.plant || 'Tata AutoComp Systems Limited - Varale / Chakan');
    setEditActive(user.active !== false);
    setEditPermissions(
      user.permissions || {
        canInward: true,
        canDispatch: true,
        canLineManage: user.role === 'superadmin' || user.role === 'manager',
        canViewStock: true,
        canInvoices: user.role === 'superadmin' || user.role === 'manager',
        canAnalytics: user.role === 'superadmin' || user.role === 'manager',
      }
    );
    setShowEditPassword(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanUser = editUsername.trim().replace(/^@+/, '');
    const cleanPass = editPassword.trim();
    const cleanName = editName.trim();

    if (!cleanUser || !cleanName) {
      setMessage({ type: 'error', text: 'Full Name and Username cannot be empty.' });
      return;
    }

    const updatedAccount: UserAccount = {
      username: cleanUser,
      password: cleanPass || editingUser.password,
      name: cleanName,
      role: editRole,
      plant: editPlant.trim(),
      active: editActive,
      permissions: {
        canInward: editPermissions.canInward,
        canDispatch: editPermissions.canDispatch,
        canLineManage: editRole === 'superadmin' || editRole === 'manager' || editPermissions.canLineManage,
        canViewStock: editPermissions.canViewStock,
        canInvoices: editRole === 'superadmin' || editRole === 'manager' || editPermissions.canInvoices,
        canAnalytics: editRole === 'superadmin' || editRole === 'manager' || editPermissions.canAnalytics,
      },
    };

    const success = updateUser(editOldUsername, updatedAccount);
    if (success) {
      setMessage({
        type: 'success',
        text: `User @${cleanUser} (${cleanName}) updated successfully in real-time!`,
      });
      setEditingUser(null);
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({
        type: 'error',
        text: `Failed to update user. Username "@${cleanUser}" may already be in use.`,
      });
    }
  };

  const handleDelete = (u: UserAccount) => {
    if (u.username.toLowerCase() === currentUser?.username.toLowerCase()) {
      setMessage({ type: 'error', text: 'You cannot delete your own active logged-in account.' });
      return;
    }

    if (u.username.toLowerCase() === 'pranjils0ni') {
      setMessage({ type: 'error', text: 'Super Admin Pranjil Soni account is protected and cannot be deleted.' });
      return;
    }

    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETE CONFIRMATION:\n\nAre you sure you want to remove staff member "${u.name}" (@${u.username}) from the warehouse system?`
    );

    if (confirmed) {
      const result = deleteUser(u.username);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.plant && u.plant.toLowerCase().includes(q))
    );
  });

  const operatorCount = users.filter((u) => u.role === 'employee').length;
  const supervisorCount = users.filter((u) => u.role === 'supervisor').length;
  const managerCount = users.filter((u) => u.role === 'manager' || u.role === 'superadmin').length;
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Staff & User Access Management
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {currentUser?.role === 'superadmin' ? 'Super Admin Portal' : 'Warehouse Manager Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authorized for Suresh Chavan & Pranjil Soni • Real-time Account, Password & Role Control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-100/70 border-b border-slate-200 text-center font-mono-code">
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 text-[10px] block">Total Staff</span>
            <span className="text-sm font-extrabold text-slate-900">{users.length} ({activeCount} Active)</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 text-[10px] block">Operators / Staff</span>
            <span className="text-sm font-extrabold text-blue-600">{operatorCount}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 text-[10px] block">Plant Supervisors</span>
            <span className="text-sm font-extrabold text-amber-600">{supervisorCount}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 text-[10px] block">Managers / Admins</span>
            <span className="text-sm font-extrabold text-purple-600">{managerCount}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {message && (
            <div
              className={`p-3 rounded-xl flex items-center justify-between gap-2 shadow-xs transition ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Edit User Modal / Panel */}
          {editingUser && (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 space-y-4 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-700" />
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Edit Account Details: {editingUser.name} (@{editOldUsername})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Vikas Kumar Bharti"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Username / Login ID
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-400">@</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.replace(/^@+/, ''))}
                        placeholder="Vikas"
                        className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Password (Direct Edit / Reset)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter new password..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 pr-9 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="employee">Operator / Employee</option>
                      <option value="supervisor">Plant Supervisor</option>
                      <option value="manager">Warehouse Manager</option>
                      {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                    </select>
                  </div>
                </div>

                {/* Section Permissions Toggles for Edit */}
                <div className="pt-2 border-t border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">
                      Granular Section Access Permissions:
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Account Active & Enabled</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canInward}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canInward: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Inward Receiving</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canDispatch}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canDispatch: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Outward Dispatch</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canViewStock}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canViewStock: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">View Total Stock</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canLineManage}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canLineManage: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Line Populator</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canInvoices}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canInvoices: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Invoices & Gate Pass</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAnalytics}
                        onChange={(e) =>
                          setEditPermissions((p) => ({ ...p, canAnalytics: e.target.checked }))
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Analytics & Reports</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes & Sync</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create User Form */}
          {canManage && !editingUser && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>Add New Warehouse Staff / Operator Account</span>
              </h4>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username (Login ID)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-400">@</span>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.replace(/^@+/, ''))}
                        placeholder="Ramesh"
                        className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Login Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter account password..."
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 pr-9 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="employee">Operator / Employee</option>
                      <option value="supervisor">Plant Supervisor</option>
                      <option value="manager">Warehouse Manager</option>
                      {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                    </select>
                  </div>
                </div>

                {/* Section Permissions Toggles */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800">
                    Section Permissions Granted:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canInward}
                        onChange={(e) => setCanInward(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Inward Receiving</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canDispatch}
                        onChange={(e) => setCanDispatch(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Outward Dispatch</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canViewStock}
                        onChange={(e) => setCanViewStock(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">View Total Stock</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canLineManage}
                        onChange={(e) => setCanLineManage(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Line Populator</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canInvoices}
                        onChange={(e) => setCanInvoices(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Invoices & Gate Pass</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={canAnalytics}
                        onChange={(e) => setCanAnalytics(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Analytics & Reports</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Staff Account & Save</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Users Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Registered Plant Accounts ({filteredUsers.length})
              </h4>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff name, role, username..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Password Credentials</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.username.toLowerCase() === currentUser?.username.toLowerCase();
                    const isRevealed = revealedPasswords[u.username];
                    const isPranjil = u.username.toLowerCase() === 'pranjils0ni';

                    return (
                      <tr key={u.username} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{u.plant || 'Varale Plant'}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ' +
                              (u.role === 'superadmin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : u.role === 'manager'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : u.role === 'supervisor'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200')
                            }
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleCopy(u.username, 'Username')}
                            className="font-mono-code font-bold text-slate-700 hover:text-purple-600 flex items-center gap-1 cursor-pointer"
                            title="Click to copy username"
                          >
                            <span>@{u.username}</span>
                            <Copy className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          </button>
                        </td>
                        <td className="p-3">
                          {u.password ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-code font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {isRevealed ? u.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(u.username)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(u.password || '', 'Password')}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No password set</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              'px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ' +
                              (u.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800')
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.active ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            ></span>
                            <span>{u.active ? 'Active' : 'Disabled'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => startEditUser(u)}
                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition cursor-pointer flex items-center gap-1"
                                title="Edit Username, Password, Role & Permissions"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline font-bold text-[11px]">Edit</span>
                              </button>
                            )}

                            {/* Disable / Enable Toggle */}
                            {canManage && !isSelf && (
                              <button
                                type="button"
                                onClick={() => toggleUserActive(u.username)}
                                className={
                                  'px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ' +
                                  (u.active
                                    ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                    : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200')
                                }
                                title={u.active ? 'Disable Account' : 'Enable Account'}
                              >
                                {u.active ? 'Disable' : 'Enable'}
                              </button>
                            )}

                            {/* Delete Button */}
                            {canManage && !isSelf && !isPranjil && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

