import { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

const EMPTY_FORM = {
  deviceId: '', assignedToUserId: '', label: '', description: '',
  commandTemplate: '', parameterKeys: '', extraStepsJson: '', expiresInHours: 24, sortOrder: 0
};

export default function ButtonsPage() {
  const [buttons, setButtons]     = useState([]);
  const [users, setUsers]         = useState([]);
  const [devices, setDevices]     = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const load = async () => {
    const [b, u, d] = await Promise.all([
      api.get('/buttons'),
      api.get('/auth/users'),
      api.get('/devices'),
    ]);
    setButtons(b.data); setUsers(u.data); setDevices(d.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/buttons', {
        ...form,
        deviceId:         parseInt(form.deviceId),
        assignedToUserId: parseInt(form.assignedToUserId),
        expiresInHours:   parseInt(form.expiresInHours),
        sortOrder:        parseInt(form.sortOrder),
        extraStepsJson:   form.extraStepsJson || null,
      });
      toast.success('Button berhasil dibuat');
      setForm(EMPTY_FORM); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const del = async id => {
    if (!confirm('Hapus button ini?')) return;
    await api.delete(`/buttons/${id}`);
    toast.success('Button dihapus'); load();
  };

  const isExpired = b => new Date(b.expiresAt) < new Date();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kelola Button Teknisi</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Buat Button Baru
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow mb-6">
          <h3 className="font-semibold text-gray-700 text-lg mb-4">Button Baru</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Perangkat OLT</label>
              <select
                className="w-full border rounded-lg p-2.5 text-sm"
                value={form.deviceId}
                onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}
                required
              >
                <option value="">Pilih OLT...</option>
                {devices.filter(d => d.isActive).map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Assign ke Teknisi</label>
              <select
                className="w-full border rounded-lg p-2.5 text-sm"
                value={form.assignedToUserId}
                onChange={e => setForm(f => ({ ...f, assignedToUserId: e.target.value }))}
                required
              >
                <option value="">Pilih Teknisi...</option>
                {users.filter(u => u.role === 'user' && u.isActive).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Label Button</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm"
                placeholder="e.g. Cek ONT Port 0/1/7"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Berlaku (jam, maks 24)</label>
              <input
                type="number" min={1} max={24}
                className="w-full border rounded-lg p-2.5 text-sm"
                value={form.expiresInHours}
                onChange={e => setForm(f => ({ ...f, expiresInHours: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Command Template</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm font-mono"
                placeholder="display ont info summary {port}"
                value={form.commandTemplate}
                onChange={e => setForm(f => ({ ...f, commandTemplate: e.target.value }))}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Gunakan &#123;param&#125; untuk parameter dinamis.
              </p>
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Parameter Keys (jika ada)</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm"
                placeholder="port,onu_id"
                value={form.parameterKeys}
                onChange={e => setForm(f => ({ ...f, parameterKeys: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Deskripsi (opsional)</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm"
                placeholder="Keterangan singkat"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="col-span-2 border rounded-lg p-4 bg-amber-50">
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center gap-1 text-sm text-amber-700 font-semibold"
              >
                <ChevronDown size={14} />
                Extra Steps (jika command butuh input tambahan)
              </button>
              {showExtra && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Contoh: <code>[&#123;"trigger":"Are you sure?","response":"y"&#125;]</code>
                  </p>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg p-2.5 text-xs font-mono bg-white"
                    placeholder='[{"trigger":"Password:","response":"pass123"}]'
                    value={form.extraStepsJson}
                    onChange={e => setForm(f => ({ ...f, extraStepsJson: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Buat Button
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border rounded-lg">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {buttons.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Belum ada button. Buat button baru untuk teknisi.
          </div>
        )}
        {buttons.map(b => (
          <div
            key={b.id}
            className={`bg-white rounded-xl shadow p-4 border-l-4
              ${isExpired(b) ? 'border-gray-300 opacity-60' : 'border-blue-500'}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{b.label}</span>
                  {isExpired(b)
                    ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Expired</span>
                    : <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>
                  }
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Untuk: <strong>{b.assignedToUserFullName}</strong> |
                  OLT: <span className="font-mono text-xs">{b.deviceLabel}</span>
                </p>
                <p className="text-xs font-mono text-blue-600 mt-1">{b.commandTemplate}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Expired: {new Date(b.expiresAt).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => del(b.id)} className="text-red-400 hover:text-red-600 ml-4">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
