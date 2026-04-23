import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ActivityPage() {
  const [logs, setLogs]   = useState([]);
  const [users, setUsers] = useState([]);
  const [uid, setUid]     = useState('');

  const load = () => {
    const params = uid ? `?userId=${uid}` : '';
    api.get(`/logs${params}`).then(r => setLogs(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
    load();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Log Aktivitas</h2>
        <div className="flex gap-2">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={uid}
            onChange={e => setUid(e.target.value)}
          >
            <option value="">Semua Teknisi</option>
            {users.filter(u => u.role === 'user').map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Waktu', 'Teknisi', 'OLT', 'Command', 'Status', 'Durasi', 'Error'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada log</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(l.executedAt).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 font-medium">{l.userFullName}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{l.deviceName}</td>
                <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{l.command}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${l.status === 'success'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{l.durationMs}ms</td>
                <td className="px-4 py-3 text-xs text-red-400 max-w-xs truncate">
                  {l.errorMsg || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
