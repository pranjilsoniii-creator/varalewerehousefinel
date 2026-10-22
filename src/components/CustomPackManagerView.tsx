import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Battery,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { CustomBatteryModel } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ALL_PACK_TYPES,
  BATTERY_MODELS,
  getCustomBatteryModels,
  saveCustomBatteryModel,
  deleteCustomBatteryModel,
  fetchCustomModelsFromCloud,
} from '../data/batteryCatalog';

interface CustomPackManagerViewProps {
  onModelsUpdated?: () => void;
}

export const CustomPackManagerView: React.FC<CustomPackManagerViewProps> = ({ onModelsUpdated }) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor } = useAuth();

  const [customModels, setCustomModels] = useState<CustomBatteryModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [category, setCategory] = useState('Kanger Series');
  const [colorTheme, setColorTheme] = useState('blue');
  const [description, setDescription] = useState('');
  const [energyKwh, setEnergyKwh] = useState('');
  const [hsnCode, setHSNCode] = useState('85076000');

  // Load custom models
  useEffect(() => {
    setCustomModels(getCustomBatteryModels());
    fetchCustomModelsFromCloud().then((cloudList) => {
      setCustomModels(cloudList);
    });
  }, []);

  const colorPresets: Record<
    string,
    { label: string; color: string; badgeBg: string; borderColor: string }
  > = {
    blue: {
      label: 'Ocean Blue',
      color: '#2563eb',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      borderColor: 'border-blue-500',
    },
    purple: {
      label: 'Royal Violet',
      color: '#7c3aed',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
      borderColor: 'border-purple-500',
    },
    emerald: {
      label: 'Eco Green',
      color: '#059669',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderColor: 'border-emerald-500',
    },
    amber: {
      label: 'Industrial Amber',
      color: '#d97706',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-amber-500',
    },
    rose: {
      label: 'Crimson Rose',
      color: '#e11d48',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      borderColor: 'border-rose-500',
    },
    cyan: {
      label: 'Cyan Frost',
      color: '#0891b2',
      badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      borderColor: 'border-cyan-500',
    },
  };

  const handleCreatePackType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanName = name.trim();
    const cleanCode = (shortCode.trim() || cleanName.slice(0, 4)).toUpperCase();
    const cleanId = cleanName.replace(/[\s\W]+/g, '_');
    const selectedTheme = colorPresets[colorTheme] || colorPresets.blue;

    const newModel: CustomBatteryModel = {
      id: cleanId,
      name: cleanName,
      shortCode: cleanCode,
      category: category.trim() || 'Custom Series',
      color: selectedTheme.color,
      badgeBg: selectedTheme.badgeBg,
      borderColor: selectedTheme.borderColor,
      description: description.trim() || undefined,
      energyKwh: energyKwh.trim() || undefined,
      hsnCode: hsnCode.trim() || '85076000',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || currentUser?.username || 'Supervisor',
    };

    const updated = saveCustomBatteryModel(newModel);
    setCustomModels(updated);
    setIsModalOpen(false);

    // Reset form
    setName('');
    setShortCode('');
    setDescription('');
    setEnergyKwh('');
    setSuccessMsg(`Pack type "${cleanName}" registered successfully! It is now live in Inward & Registers.`);
    setTimeout(() => setSuccessMsg(null), 5000);

    if (onModelsUpdated) onModelsUpdated();
  };

  const handleDeleteModel = (id: string, modelName: string) => {
    if (!window.confirm(`Are you sure you want to remove custom pack type "${modelName}"?`)) {
      return;
    }
    const updated = deleteCustomBatteryModel(id);
    setCustomModels(updated);
    setSuccessMsg(`Custom pack type "${modelName}" deleted.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    if (onModelsUpdated) onModelsUpdated();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
            <Tag className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                Custom Pack Types & Catalog Registry
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-300">
                Dynamic Matrix
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Register new custom battery pack models & codes. Automatically synchronizes across Inward, Line racks, and Dispatch.
            </p>
          </div>
        </div>

        {/* Action Button */}
        {(isSuperAdmin || isManager || isSupervisor) && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Pack Type</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Model Types</p>
          <p className="text-xl font-black font-mono-code text-slate-900 mt-1">
            {ALL_PACK_TYPES.length + customModels.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Standard Tata Models</p>
          <p className="text-xl font-black font-mono-code text-blue-600 mt-1">
            {ALL_PACK_TYPES.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Custom Registered</p>
          <p className="text-xl font-black font-mono-code text-indigo-600 mt-1">
            {customModels.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cloud Sync State</p>
          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Synchronized
          </p>
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            All Battery Pack Models Catalog
          </h3>
          <span className="text-xs text-slate-500 font-mono-code">
            {ALL_PACK_TYPES.length + customModels.length} registered models
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">#</th>
                <th className="p-3.5">Model Name</th>
                <th className="p-3.5">Short Code</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Badge Style</th>
                <th className="p-3.5">Origin Type</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Custom Models First */}
              {customModels.map((cm, idx) => (
                <tr key={cm.id} className="hover:bg-indigo-50/30 transition bg-indigo-50/10">
                  <td className="p-3.5 font-mono-code text-indigo-600 font-bold">C-{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900">
                    <div>{cm.name}</div>
                    {cm.description && <div className="text-[10px] text-slate-400 font-normal">{cm.description}</div>}
                  </td>
                  <td className="p-3.5 font-mono-code font-extrabold text-indigo-700">{cm.shortCode}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{cm.category}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cm.badgeBg}`}>
                      {cm.shortCode}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold">
                      Custom Registered
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {(isSuperAdmin || isManager || isSupervisor) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModel(cm.id, cm.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete custom pack type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Standard Tata Models */}
              {ALL_PACK_TYPES.map((pt, idx) => {
                const m = BATTERY_MODELS[pt];
                return (
                  <tr key={pt} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono-code text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{m?.name || pt}</td>
                    <td className="p-3.5 font-mono-code font-bold text-slate-700">{m?.shortCode || pt}</td>
                    <td className="p-3.5 text-slate-600">{m?.category || 'Kanger Series'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m?.badgeBg || 'bg-slate-100 text-slate-800'}`}>
                        {m?.shortCode || pt}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                        Official Plant Model
                      </span>
                    </td>
                    <td className="p-3.5 text-right text-slate-400 text-[11px] italic font-mono-code">
                      Standard
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Pack Type Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Register New Custom Pack Type
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackType} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pack Model Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kanger 4.0 AIS, Tata Ace EV Pack, Custom 48V..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Short Code <span className="text-slate-400 text-[10px]">(for matrix & print)</span>
                  </label>
                  <input
                    type="text"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                    placeholder="e.g. K4, ACE-EV, C-48V"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category Series</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
                  >
                    <option value="Kanger Series">Kanger Series</option>
                    <option value="Tamor">Tamor Series</option>
                    <option value="Nova">Nova Series</option>
                    <option value="Limber">Limber Series</option>
                    <option value="Challenger">Challenger Series</option>
                    <option value="Commercial EV">Commercial EV Series</option>
                    <option value="Custom Series">Custom Series</option>
                  </select>
                </div>
              </div>

              {/* Badge Color Theme */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Color Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(colorPresets).map(([key, item]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setColorTheme(key)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        colorTheme === key
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy & HSN Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Energy Rating (kWh)</label>
                  <input
                    type="text"
                    value={energyKwh}
                    onChange={(e) => setEnergyKwh(e.target.value)}
                    placeholder="e.g. 24.5 kWh"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono-code focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHSNCode(e.target.value)}
                    placeholder="85076000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono-code focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Internal Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes regarding vehicle platform, cell chemistry, or voltage..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold text-[11px]">Badge Preview:</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${(colorPresets[colorTheme] || colorPresets.blue).badgeBg}`}>
                  {(shortCode.trim() || name.slice(0, 4) || 'PREVIEW').toUpperCase()}
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register Pack Type</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
