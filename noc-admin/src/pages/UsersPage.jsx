import { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { UserPlus, Eye, KeyRound, Pencil, RotateCcw, Power, Circle } from 'lucide-react';

const EMPTY = { username: '', fullName: '', phoneNumber: '', password: '', role: 'user' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  const [createForm, setCreateForm]   = useState(EMPTY);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm]       = useState(null);

  const [pwModal, setPwModal] = useState(null);   // { user, mode: 'view'|'change' }
  const [pwAdmin, setPwAdmin] = useState('');
  const [pwNew,   setPwNew]   = useState('');
  const [pwShown, setPwShown] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  const submitCreate = async e => {
    e.preventDefault();
    try {
      await api.post('/auth/users', createForm);
      toast.success('User berhasil dibuat');
      setCreateForm(EMPTY); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const submitEdit = async e => {
    e.preventDefault();
    try {
      await api.patch(`/auth/users/${editingUser.id}`, {
        fullName:    editForm.fullName,
        role:        editForm.role,
        phoneNumber: editForm.phoneNumber || null,
      });
      toast.success('Profile user di-update');
      setEditingUser(null); setEditForm(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const deactivate = async u => {
    if (!confirm(`Nonaktifkan user "${u.username}"?`)) return;
    await api.patch(`/auth/users/${u.id}/deactivate`);
    toast.success('User dinonaktifkan'); load();
  };
  const activate = async u => {
    await api.patch(`/auth/users/${u.id}/activate`);
    toast.success('User diaktifkan kembali'); load();
  };

  const submitPw = async e => {
    e.preventDefault();
    try {
      if (pwModal.mode === 'view') {
        const r = await api.post(`/auth/users/${pwModal.user.id}/password/view`,
                                 { adminPassword: pwAdmin });
        setPwShown(r.data.password);
      } else {
        await api.post(`/auth/users/${pwModal.user.id}/password/change`,
                       { adminPassword: pwAdmin, newPassword: pwNew });
        toast.success('Password user berhasil diubah');
        closePwModal();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal verifikasi'); }
  };

  const closePwModal = () => {
    setPwModal(null); setPwAdmin(''); setPwNew(''); setPwShown(null);
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

      {/* Form CREATE */}
      {showForm && (
        <form onSubmit={submitCreate}
              className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-lg text-gray-700">User Baru</h3>
          {[
            ['username',    'Username',    'text'],
            ['fullName',    'Nama Lengkap','text'],
            ['phoneNumber', 'No. Telepon (opsional)', 'text'],
            ['password',    'Password',    'password'],
          ].map(([k, l, t]) => (
            <div key={k}>
              <label className="text-sm text-gray-600 mb-1 block">{l}</label>
              <input
                type={t}
                className="w-full border rounded-lg p-2.5 text-sm"
                value={createForm[k]}
                onChange={e => setCreateForm(f => ({ ...f, [k]: e.target.value }))}
                required={t !== 'text' || k !== 'phoneNumber'}
              />
            </div>
          ))}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Role</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm"
              value={createForm.role}
              onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="user">Teknisi (user)</option>
              <option value="admin">Admin / NOC</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Simpan</button>
            <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-2 border rounded-lg">Batal</button>
          </div>
        </form>
      )}

      {/* Form EDIT */}
      {editingUser && editForm && (
        <form onSubmit={submitEdit}
              className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4 border-l-4 border-amber-400">
          <h3 className="col-span-2 font-semibold text-lg text-gray-700">
            Edit User <span className="font-mono">@{editingUser.username}</span>
          </h3>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nama Lengkap</label>
            <input className="w-full border rounded-lg p-2.5 text-sm"
                   value={editForm.fullName}
                   onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                   required />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">No. Telepon</label>
            <input className="w-full border rounded-lg p-2.5 text-sm"
                   value={editForm.phoneNumber || ''}
                   onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Role</label>
            <select className="w-full border rounded-lg p-2.5 text-sm"
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">Teknisi (user)</option>
              <option value="admin">Admin / NOC</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit"
                    className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600">Update</button>
            <button type="button" onClick={() => { setEditingUser(null); setEditForm(null); }}
                    className="px-6 py-2 border rounded-lg">Batal</button>
          </div>
        </form>
      )}

      {/* Tabel users */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['', 'Username', 'Nama Lengkap', 'No. Telp', 'Role', 'Status', 'Last Seen', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Circle size={10}
                    className={u.isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}
                    aria-label={u.isOnline ? 'Online' : 'Offline'} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{u.phoneNumber || '—'}</td>
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
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('id-ID') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button title="Edit profile"
                            onClick={() => { setEditingUser(u); setEditForm({
                                fullName: u.fullName, role: u.role,
                                phoneNumber: u.phoneNumber }); }}
                            className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    <button title="Lihat password"
                            onClick={() => setPwModal({ user: u, mode: 'view' })}
                            className="text-gray-600 hover:text-gray-900"><Eye size={15} /></button>
                    <button title="Ganti password"
                            onClick={() => setPwModal({ user: u, mode: 'change' })}
                            className="text-amber-600 hover:text-amber-800"><KeyRound size={15} /></button>
                    {u.isActive ? (
                      <button title="Nonaktifkan" onClick={() => deactivate(u)}
                              className="text-red-500 hover:text-red-700"><Power size={15} /></button>
                    ) : (
                      <button title="Aktifkan" onClick={() => activate(u)}
                              className="text-green-600 hover:text-green-800"><RotateCcw size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal password */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={submitPw} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">
              {pwModal.mode === 'view' ? 'Lihat Password' : 'Ganti Password'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              User: <strong>@{pwModal.user.username}</strong>
            </p>

            {pwShown ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-green-700 mb-1">Password tersimpan:</p>
                <code className="text-lg font-mono text-green-900 break-all">{pwShown}</code>
              </div>
            ) : (
              <>
                <label className="text-sm text-gray-600 mb-1 block">Password Admin Anda (verifikasi)</label>
                <input type="password" autoFocus required
                       className="w-full border rounded-lg p-2.5 text-sm mb-4"
                       value={pwAdmin}
                       onChange={e => setPwAdmin(e.target.value)} />

                {pwModal.mode === 'change' && (
                  <>
                    <label className="text-sm text-gray-600 mb-1 block">Password Baru (min 6 karakter)</label>
                    <input type="password" required minLength={6}
                           className="w-full border rounded-lg p-2.5 text-sm mb-4"
                           value={pwNew}
                           onChange={e => setPwNew(e.target.value)} />
                  </>
                )}
              </>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={closePwModal}
                      className="px-4 py-2 border rounded-lg">Tutup</button>
              {!pwShown && (
                <button type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  {pwModal.mode === 'view' ? 'Verifikasi & Lihat' : 'Verifikasi & Simpan'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
