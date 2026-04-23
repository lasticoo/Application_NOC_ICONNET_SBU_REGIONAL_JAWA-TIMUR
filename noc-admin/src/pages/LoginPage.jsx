import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm]     = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login }   = useAuth();
  const nav         = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.role !== 'admin') {
        toast.error('Hanya admin yang bisa akses web ini');
        return;
      }
      login(data);
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Username atau password salah');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={submit} className="bg-white rounded-2xl p-8 w-96 shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">NOC Admin Panel</h1>
        <p className="text-gray-500 text-sm mb-6">Login sebagai administrator</p>

        <input
          className="w-full border rounded-lg p-3 mb-3 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Username"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          required
        />
        <input
          type="password"
          className="w-full border rounded-lg p-3 mb-6 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Masuk...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
