import { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY = {
  name: '', label: '', ipAddress: '',
  oltUser: '', oltPass: '', vendor: 'huawei', extraStepsJson: ''
};

export default function DevicesPage() {
  const [devices, setDevices]   = useState([]);
  const [form, setForm]         = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const load = () => api.get('/devices').then(r => setDevices(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/devices', form);
      toast.success('Device berhasil ditambahkan');
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan device'); }
  };

  const del = async id => {
    if (!confirm('Hapus device ini?')) return;
    await api.delete(`/devices/${id}`);
    toast.success('Device dihapus'); load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Perangkat OLT</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Tambah Device
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-gray-700 text-lg">Tambah OLT Baru</h3>

          {[
            ['name',      'Nama OLT Lengkap', 'e.g. JATIM-GSK.ODC.ROYAL.EMRAN-HW.MA5801-OLT-01', true],
            ['label',     'Label UI',         'e.g. Royal Emran OLT-01', false],
            ['ipAddress', 'IP Address',        '172.x.x.x', false],
            ['oltUser',   'Username OLT',      'moh.sindunata', false],
          ].map(([key, label, ph, full]) => (
            <div key={key} className={full ? 'col-span-2' : ''}>
              <label className="text-sm text-gray-600 mb-1 block">{label}</label>
              <input
                className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={ph}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required
              />
            </div>
          ))}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Password OLT</label>
            <input
              type="password"
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.oltPass}
              onChange={e => setForm(f => ({ ...f, oltPass: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Vendor</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm"
              value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
            >
              <option value="huawei">Huawei</option>
              <option value="zte">ZTE</option>
              <option value="fiberhome">FiberHome</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setShowExtra(!showExtra)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {showExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Extra Steps (opsional — untuk device yang butuh autentikasi tambahan)
            </button>
            {showExtra && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">
                  Format JSON: <code>[&#123;"trigger":"Password:","response":"secret"&#125;]</code>
                </p>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg p-2.5 text-xs font-mono"
                  placeholder='[{"trigger":"Password:","response":"yourpass"}]'
                  value={form.extraStepsJson}
                  onChange={e => setForm(f => ({ ...f, extraStepsJson: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Simpan
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border rounded-lg">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Label', 'Nama OLT', 'IP', 'Vendor', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {devices.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada device</td></tr>
            )}
            {devices.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.label}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{d.name}</td>
                <td className="px-4 py-3">{d.ipAddress}</td>
                <td className="px-4 py-3 capitalize">{d.vendor}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {d.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => del(d.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
