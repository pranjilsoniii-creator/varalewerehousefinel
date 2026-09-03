import React, { useState } from 'react';
import { Shield, UserPlus, X, Check, Lock, UserCheck, AlertCircle, Building, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount, UserPermissions, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, addUser, toggleUserActive, currentUser, isSuperAdmin, isManager } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newPlant, setNewPlant] = useState('Tata AutoComp Systems Limited - Varale / Chakan');

  // Granular Section Permissions
  const [canInward, setCanInward] = useState(true);
  const [canDispatch, setCanDispatch] = useState(true);
  const [canLineManage, setCanLineManage] = useState(false);
  const [canViewStock, setCanViewStock] = useState(true);
  const [canInvoices, setCanInvoices] = useState(false);
  const [canAnalytics, setCanAnalytics] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setMessage({ type: 'error', text: 'All fields are required to create a new user.' });
      return;
    }

    const newUser: UserAccount = {
      username: newUsername.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
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
      setMessage({ type: 'success', text: 'User ' + newName + ' (@' + newUsername + ') created with permissions successfully!' });
      setNewUsername('');
      setNewPassword('');
      setNewName('');
    } else {
      setMessage({ type: 'error', text: 'Username "' + newUsername + '" already exists in the system.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Staff & User Management</h3>
              <p className="text-xs text-slate-500">
                Super Admin & Manager control for staff roles and granular section permissions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {message && (
            <div className={'p-3 rounded-xl flex items-center gap-2 ' +
              (message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200')}>
              {message.type === 'success' ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span className="font-bold">{message.text}</span>
            </div>
          )}

          {/* Create User Form */}
          {(isSuperAdmin || isManager) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>Add New Warehouse Staff / Operator</span>
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
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter login password..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
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
                  <label className="block font-bold text-slate-800">Section-wise Permissions Access:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canInward}
                        onChange={(e) => setCanInward(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Inward Receiving</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canDispatch}
                        onChange={(e) => setCanDispatch(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Outward Dispatch</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canViewStock}
                        onChange={(e) => setCanViewStock(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">View Total Stock</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canLineManage}
                        onChange={(e) => setCanLineManage(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Line Populator</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canInvoices}
                        onChange={(e) => setCanInvoices(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800">Gate Pass & Invoice</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
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
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User & Set Permissions</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Users Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Registered Plant Accounts ({users.length})</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Login Username</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.username} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{u.name}</td>
                      <td className="p-3">
                        <span className={'px-2 py-0.5 rounded text-[10px] font-bold uppercase ' +
                          (u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                           u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                           u.role === 'supervisor' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono-code text-slate-600 font-bold">@{u.username}</td>
                      <td className="p-3">
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                          (u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.username !== currentUser?.username && isSuperAdmin && (
                          <button
                            onClick={() => toggleUserActive(u.username)}
                            className={'px-2.5 py-1 rounded text-[11px] font-bold ' +
                              (u.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50')}
                          >
                            {u.active ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
