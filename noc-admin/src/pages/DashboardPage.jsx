import { useEffect, useState } from 'react';
import api from '../api/client';

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/logs/today').then(r => setLogs(r.data)).catch(() => {});
  }, []);

  const statusColor = s =>
    s === 'success'
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Aktivitas Hari Ini</h2>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Waktu', 'Teknisi', 'OLT', 'Command', 'Status', 'Durasi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Belum ada aktivitas hari ini
                </td>
              </tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(l.executedAt).toLocaleTimeString('id-ID')}
                </td>
                <td className="px-4 py-3 font-medium">{l.userFullName}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{l.deviceName}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.command}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(l.status)}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{l.durationMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
