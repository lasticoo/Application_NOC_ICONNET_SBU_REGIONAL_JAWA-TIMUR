import { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, RotateCcw } from 'lucide-react';

const EMPTY = {
  id: null,
  deviceId: '', assignedToUserId: '',
  label: '', description: '',
  commandTemplate: '', parameterKeys: '',
  expiresInHours: 24, sortOrder: 0,
};

export default function ButtonsPage() {
  const [buttons,    setButtons]   = useState([]);
  const [users,      setUsers]     = useState([]);
  const [devices,    setDevices]   = useState([]);
  const [form,       setForm]      = useState(EMPTY);
  const [showForm,   setShowForm]  = useState(false);
  const [showInact,  setShowInact] = useState(false);

  const load = async () => {
    const [b, u, d] = await Promise.all([
      api.get(`/buttons?includeInactive=${showInact}`),
      api.get('/auth/users'),
      api.get('/devices'),
    ]);
    setButtons(b.data); setUsers(u.data); setDevices(d.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInact]);

  const startNew = () => { setForm(EMPTY); setShowForm(true); };

  const startEdit = b => {
    // recompute expiresInHours dari ExpiresAt - now (dibulatkan, min 1)
    const hoursLeft = Math.max(1, Math.ceil(
      (new Date(b.expiresAt) - new Date()) / 3_600_000
    ));
    setForm({
      id: b.id,
      deviceId:         String(b.deviceId),
      assignedToUserId: String(b.assignedToUserId),
      label:            b.label,
      description:      b.description ?? '',
      commandTemplate:  b.commandTemplate,
      parameterKeys:    b.parameterKeys ?? '',
      expiresInHours:   hoursLeft,
      sortOrder:        b.sortOrder,
    });
    setShowForm(true);
  };

  const submit = async e => {
    e.preventDefault();
    const payload = {
      deviceId:         parseInt(form.deviceId),
      assignedToUserId: parseInt(form.assignedToUserId),
      label:            form.label,
      description:      form.description || null,
      commandTemplate:  form.commandTemplate,
      parameterKeys:    form.parameterKeys,
      expiresInHours:   parseInt(form.expiresInHours),
      sortOrder:        parseInt(form.sortOrder) || 0,
    };
    try {
      if (form.id) {
        await api.patch(`/buttons/${form.id}`, payload);
        toast.success('Button di-update');
      } else {
        await api.post('/buttons', payload);
        toast.success('Button berhasil dibuat');
      }
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const del = async id => {
    if (!confirm('Nonaktifkan button ini?')) return;
    await api.delete(`/buttons/${id}`); toast.success('Button dinonaktifkan'); load();
  };
  const reactivate = async id => {
    await api.patch(`/buttons/${id}/activate`);
    toast.success('Button diaktifkan'); load();
  };

  const isExpired = b => new Date(b.expiresAt) < new Date();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kelola Button Teknisi</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600 flex items-center gap-1.5">
            <input type="checkbox" checked={showInact}
                   onChange={e => setShowInact(e.target.checked)} />
            Tampilkan nonaktif
          </label>
          <button onClick={startNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Buat Button
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow mb-6">
          <h3 className="font-semibold text-gray-700 text-lg mb-4">
            {form.id ? `Edit Button #${form.id}` : 'Button Baru'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Perangkat</label>
              <select className="w-full border rounded-lg p-2.5 text-sm" required
                      value={form.deviceId}
                      onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}>
                <option value="">Pilih perangkat...</option>
                {devices.filter(d => d.isActive).map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.deviceType}/{d.vendor}] {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Assign ke Teknisi</label>
              <select className="w-full border rounded-lg p-2.5 text-sm" required
                      value={form.assignedToUserId}
                      onChange={e => setForm(f => ({ ...f, assignedToUserId: e.target.value }))}>
                <option value="">Pilih teknisi...</option>
                {users.filter(u => u.role === 'user' && u.isActive).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Label Button</label>
              <input className="w-full border rounded-lg p-2.5 text-sm" required
                     placeholder="e.g. Cek ONT Port 0/1/7"
                     value={form.label}
                     onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Berlaku (jam, dari sekarang)</label>
              <input type="number" min={1} max={720}
                     className="w-full border rounded-lg p-2.5 text-sm"
                     value={form.expiresInHours}
                     onChange={e => setForm(f => ({ ...f, expiresInHours: e.target.value }))} />
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Command Template</label>
              <input className="w-full border rounded-lg p-2.5 text-sm font-mono" required
                     placeholder="display ont info summary {port}"
                     value={form.commandTemplate}
                     onChange={e => setForm(f => ({ ...f, commandTemplate: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">
                Pakai placeholder <code>{'{nama}'}</code> untuk parameter dinamis dari user.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Parameter Keys (CSV)</label>
              <input className="w-full border rounded-lg p-2.5 text-sm"
                     placeholder="port,onuId"
                     value={form.parameterKeys}
                     onChange={e => setForm(f => ({ ...f, parameterKeys: e.target.value }))} />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Sort Order</label>
              <input type="number"
                     className="w-full border rounded-lg p-2.5 text-sm"
                     value={form.sortOrder}
                     onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </div>

            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Deskripsi</label>
              <textarea rows={2}
                     className="w-full border rounded-lg p-2.5 text-sm"
                     placeholder="Catatan untuk teknisi..."
                     value={form.description}
                     onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              {form.id ? 'Update' : 'Simpan'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }}
                    className="px-6 py-2 border rounded-lg">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Label', 'Perangkat', 'Teknisi', 'Command', 'Expires', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {buttons.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada button</td></tr>
            )}
            {buttons.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{b.label}</td>
                <td className="px-4 py-3 text-xs">{b.deviceLabel}</td>
                <td className="px-4 py-3">{b.assignedToUserFullName}</td>
                <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" title={b.commandTemplate}>
                  {b.commandTemplate}
                </td>
                <td className="px-4 py-3 text-xs">
                  {new Date(b.expiresAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  {isExpired(b) && <span className="ml-2 text-red-500 font-semibold">EXPIRED</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {b.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(b)} title="Edit"
                            className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    {b.isActive ? (
                      <button onClick={() => del(b.id)} title="Nonaktifkan"
                              className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                    ) : (
                      <button onClick={() => reactivate(b.id)} title="Aktifkan"
                              className="text-green-600 hover:text-green-800"><RotateCcw size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
