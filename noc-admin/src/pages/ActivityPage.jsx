import { useEffect, useState } from 'react';
import api from '../api/client';
import { Eye, X } from 'lucide-react';

export default function ActivityPage() {
  const [logs,   setLogs]   = useState([]);
  const [users,  setUsers]  = useState([]);
  const [uid,    setUid]    = useState('');
  const [detail, setDetail] = useState(null);    // log yg di-klik untuk lihat output

  const load = () => {
    const params = uid ? `?userId=${uid}` : '';
    api.get(`/logs${params}`).then(r => setLogs(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
    load();
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Log Aktivitas</h2>
        <div className="flex gap-2">
          <select className="border rounded-lg px-3 py-2 text-sm"
                  value={uid} onChange={e => setUid(e.target.value)}>
            <option value="">Semua Teknisi</option>
            {users.filter(u => u.role === 'user').map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <button onClick={load}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Waktu', 'Teknisi', 'OLT', 'Command', 'Status', 'Durasi', 'Error', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada log</td></tr>
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
                <td className="px-4 py-3">
                  <button onClick={() => setDetail(l)} title="Lihat output"
                          className="text-blue-500 hover:text-blue-700"><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal detail (READ-ONLY — log tidak boleh diedit per spek) */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-800">Detail Log #{detail.id}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(detail.executedAt).toLocaleString('id-ID')} ·
                  {' '}{detail.userFullName} · {detail.deviceName}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="px-4 pt-3">
              <span className="text-xs text-gray-400 uppercase">Command</span>
              <pre className="bg-gray-50 border rounded-lg p-2 text-xs font-mono mt-1
                              overflow-x-auto whitespace-pre">{detail.command}</pre>
            </div>
            <div className="px-4 py-3 flex-1 overflow-hidden flex flex-col">
              <span className="text-xs text-gray-400 uppercase">Output Terminal</span>
              <pre className="bg-gray-900 text-gray-100 text-xs font-mono mt-1 p-3 rounded-lg
                              flex-1 overflow-auto whitespace-pre">
{detail.rawOutput || '(tidak ada output tersimpan)'}
              </pre>
              {detail.errorMsg && (
                <>
                  <span className="text-xs text-red-400 uppercase mt-3">Error</span>
                  <pre className="bg-red-50 border border-red-200 text-red-600 text-xs p-2 rounded-lg mt-1
                                  whitespace-pre-wrap">{detail.errorMsg}</pre>
                </>
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 italic">
              Catatan: log aktivitas bersifat read-only sebagai jejak audit dan tidak dapat diedit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
