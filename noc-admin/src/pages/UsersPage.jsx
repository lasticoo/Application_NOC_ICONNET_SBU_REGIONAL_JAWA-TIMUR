import { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ username: '', fullName: '', password: '', role: 'user' });

  const load = () => api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/auth/users', form);
      toast.success('User berhasil dibuat');
      setForm({ username: '', fullName: '', password: '', role: 'user' });
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const deactivate = async id => {
    if (!confirm('Nonaktifkan user ini?')) return;
    await api.patch(`/auth/users/${id}/deactivate`);
    toast.success('User dinonaktifkan'); load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-lg text-gray-700">User Baru</h3>

          {[['username', 'Username'], ['fullName', 'Nama Lengkap'], ['password', 'Password']].map(([k, l]) => (
            <div key={k}>
              <label className="text-sm text-gray-600 mb-1 block">{l}</label>
              <input
                type={k === 'password' ? 'password' : 'text'}
                className="w-full border rounded-lg p-2.5 text-sm"
                value={form[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                required
              />
            </div>
          ))}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Role</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="user">Teknisi (user)</option>
              <option value="admin">Admin / NOC</option>
            </select>
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
              {['Username', 'Nama Lengkap', 'Role', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs
                    ${u.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive && u.role !== 'admin' && (
                    <button
                      onClick={() => deactivate(u.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Nonaktifkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
