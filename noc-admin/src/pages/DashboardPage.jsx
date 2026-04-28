import { useEffect, useState } from 'react';
import api from '../api/client';
import { Users, Server, Zap, CheckCircle2, Wifi } from 'lucide-react';

const tile = (Icon, color) => (
  <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
);

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [online,  setOnline]  = useState([]);
  const [logs,    setLogs]    = useState([]);

  const reload = () => {
    api.get('/stats/dashboard').then(r => setStats(r.data)).catch(() => {});
    api.get('/stats/online').then(r => setOnline(r.data)).catch(() => {});
    api.get('/logs/today').then(r => setLogs(r.data)).catch(() => {});
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 30_000);   // refresh tiap 30 detik
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card icon={tile(Users,        'bg-blue-100   text-blue-600')}
              label="Total User Aktif" value={stats?.totalUsers ?? '—'} />
        <Card icon={tile(Wifi,         'bg-emerald-100 text-emerald-600')}
              label="Sedang Online"    value={stats?.onlineUsers ?? '—'}
              hint={online.length > 0 ? online.slice(0, 3).map(o => o.fullName).join(', ') : null} />
        <Card icon={tile(Server,       'bg-indigo-100  text-indigo-600')}
              label="Total Perangkat"  value={stats?.totalDevices ?? '—'} />
        <Card icon={tile(Zap,          'bg-amber-100   text-amber-600')}
              label="Eksekusi Hari Ini" value={stats?.executionsToday ?? '—'} />
        <Card icon={tile(CheckCircle2, 'bg-green-100   text-green-600')}
              label="Success Rate"     value={stats ? `${stats.successRateToday}%` : '—'} />
      </div>

      {/* Online users widget */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          User Online (5 menit terakhir)
        </h3>
        {online.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada user yang aktif saat ini.</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {online.map(u => (
              <li key={u.id}
                  className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-emerald-900">{u.fullName}</div>
                  <div className="text-xs text-emerald-700 font-mono">@{u.username} · {u.role}</div>
                </div>
                <div className="text-xs text-emerald-600">
                  {new Date(u.lastSeenAt).toLocaleTimeString('id-ID')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Activity log hari ini */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Aktivitas Hari Ini</h3>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>{['Waktu', 'Teknisi', 'OLT', 'Command', 'Status', 'Durasi'].map(h => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                Belum ada aktivitas hari ini
              </td></tr>
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
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${l.status === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
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

function Card({ icon, label, value, hint }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      {icon}
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-800 leading-tight">{value}</div>
        {hint && <div className="text-[10px] text-gray-400 truncate">{hint}</div>}
      </div>
    </div>
  );
}
