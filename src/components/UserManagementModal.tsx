import React, { useState } from 'react';
import { Shield, UserPlus, X, Check, Lock, UserCheck, AlertCircle, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, addUser, toggleUserActive, currentUser } = useAuth();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newPlant, setNewPlant] = useState('Tata AutoComp Systems Limited - Varale');
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
    };

    const ok = addUser(newUser);
    if (ok) {
      setMessage({ type: 'success', text: 'User ' + newName + ' (@' + newUsername + ') added successfully!' });
      setNewUsername('');
      setNewPassword('');
      setNewName('');
    } else {
      setMessage({ type: 'error', text: 'Username "' + newUsername + '" already exists in the system.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Super Admin User Management</h3>
              <p className="text-xs text-slate-500">
                Authorized Personnel Access Control • Tata AutoComp Systems Limited
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {message && (
            <div
              className={'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ' +
                (message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200')}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Add New User Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Add New Staff Member
              </h4>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. rameshk"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">System Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="employee">Employee (Operator / Data Entry)</option>
                  <option value="supervisor">Supervisor (Inward Approver)</option>
                  <option value="manager">Manager (Direct Dispatch Authority)</option>
                  <option value="superadmin">Super Admin (Master Admin)</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* Current Staff List Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Registered Warehouse Staff ({users.length} Users)
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Login ID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Plant</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.username} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{user.name}</td>
                      <td className="p-3 font-mono-code text-slate-600">@{user.username}</td>
                      <td className="p-3">
                        <span
                          className={'px-2 py-0.5 rounded text-[10px] font-bold uppercase ' +
                            (user.role === 'superadmin'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'supervisor'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800')}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{user.plant}</td>
                      <td className="p-3">
                        <span
                          className={'px-2 py-0.5 rounded text-[10px] font-bold ' +
                            (user.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')}
                        >
                          {user.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {user.username !== 'Pranjils0ni' && (
                          <button
                            type="button"
                            onClick={() => toggleUserActive(user.username)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                          >
                            {user.active ? 'Deactivate' : 'Activate'}
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold border border-slate-200 text-xs cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
