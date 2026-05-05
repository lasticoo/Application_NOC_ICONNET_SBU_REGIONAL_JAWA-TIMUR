import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, RotateCcw } from 'lucide-react';

// ── default form state — admin tinggal pilih vendor, preset auto-isi ──────
const EMPTY = {
  id: null,
  name: '', label: '', ipAddress: '',
  oltUser: '', oltPass: '',
  vendor: 'huawei', deviceType: 'OLT',
  verifyCommand: '', connectCommand: '',
  loginUserPrompts: '', loginPassPrompts: '',
  userModePrompts: '', enableModePrompts: '',
  enableCommand: '', enablePassword: '',
  disablePagingCommand: '', pagingTrigger: '', pagingResponse: '',
  preCommands: '',
  postConnectTrigger: '', postConnectResponse: '',
};

const VENDOR_LABELS = {
  huawei:    'Huawei MA5800 / SmartAX',
  raisecom:  'Raisecom ROAP / ISCOM',
  zte:       'ZTE C320 / C300',
  fiberhome: 'FiberHome AN5516',
  bdcom:     'BDCOM GP3600 / S2936F',
  nokia:     'Nokia ISAM 7360',
  mikrotik:  'MikroTik RouterOS',
  generic:   'Custom / Lainnya',
};

export default function DevicesPage() {
  const [devices,   setDevices]   = useState([]);
  const [presets,   setPresets]   = useState({});
  const [form,      setForm]      = useState(EMPTY);
  const [showForm,  setShowForm]  = useState(false);
  const [showAdv,   setShowAdv]   = useState(false);
  const [showInact, setShowInact] = useState(false);

  const load = useCallback(() => {
    api.get(`/devices?includeInactive=${showInact}`)
      .then(r => setDevices(r.data))
      .catch(() => {});
  }, [showInact]);

  useEffect(() => {
    api.get('/devices/presets').then(r => {
      const map = {};
      r.data.forEach(p => { map[p.vendor] = p; });
      setPresets(map);
    }).catch(() => {});
    load();
  }, [load]);

  const applyPreset = vendor => {
    const p = presets[vendor];
    if (!p) return;
    setForm(f => ({
      ...f, vendor,
      verifyCommand:        p.verifyCommand,
      connectCommand:       p.connectCommand,
      loginUserPrompts:     p.loginUserPrompts,
      loginPassPrompts:     p.loginPassPrompts,
      userModePrompts:      p.userModePrompts,
      enableModePrompts:    p.enableModePrompts,
      enableCommand:        p.enableCommand,
      disablePagingCommand: p.disablePagingCommand,
      pagingTrigger:        p.pagingTrigger,
      pagingResponse:       p.pagingResponse,
      preCommands:          p.preCommands,
      postConnectTrigger:   p.postConnectTrigger,
      postConnectResponse:  p.postConnectResponse,
    }));
  };

  const startNew = () => {
    setForm(EMPTY);
    setShowForm(true);
    setShowAdv(false);
    setTimeout(() => applyPreset('huawei'), 0);
  };

  const startEdit = d => {
    setForm({
      id: d.id,
      name: d.name, label: d.label, ipAddress: d.ipAddress,
      oltUser: d.oltUser ?? '', oltPass: '',  // password kosong = "biarkan"
      vendor: d.vendor, deviceType: d.deviceType,
      verifyCommand:        d.verifyCommand        ?? '',
      connectCommand:       d.connectCommand       ?? '',
      loginUserPrompts:     d.loginUserPrompts     ?? '',
      loginPassPrompts:     d.loginPassPrompts     ?? '',
      userModePrompts:      d.userModePrompts      ?? '',
      enableModePrompts:    d.enableModePrompts    ?? '',
      enableCommand:        d.enableCommand        ?? '',
      enablePassword:       '',
      disablePagingCommand: d.disablePagingCommand ?? '',
      pagingTrigger:        d.pagingTrigger        ?? '',
      pagingResponse:       d.pagingResponse       ?? '',
      preCommands:          d.preCommands          ?? '',
      postConnectTrigger:   d.postConnectTrigger   ?? '',
      postConnectResponse:  d.postConnectResponse  ?? '',
    });
    setShowForm(true);
    setShowAdv(true);
  };

  const submit = async e => {
    e.preventDefault();
    try {
      const payload = { ...form };
      delete payload.id;
      if (form.id) {
        await api.patch(`/devices/${form.id}`, payload);
        toast.success('Device berhasil di-update');
      } else {
        await api.post('/devices', payload);
        toast.success('Device berhasil ditambahkan');
      }
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  const del = async id => {
    if (!confirm('Nonaktifkan device ini?')) return;
    await api.delete(`/devices/${id}`);
    toast.success('Device dinonaktifkan'); load();
  };

  const reactivate = async id => {
    await api.patch(`/devices/${id}/activate`);
    toast.success('Device diaktifkan kembali'); load();
  };

  const fld = (key, label, opts = {}) => (
    <div className={opts.full ? 'col-span-2' : ''} key={key}>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      {opts.textarea ? (
        <textarea
          rows={opts.rows || 3}
          className="w-full border rounded-lg p-2.5 text-xs font-mono"
          placeholder={opts.placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type={opts.type || 'text'}
          className="w-full border rounded-lg p-2.5 text-sm"
          placeholder={opts.placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          required={opts.required}
          disabled={opts.disabled}
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Perangkat (OLT / FDT / FAT)</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600 flex items-center gap-1.5">
            <input type="checkbox" checked={showInact}
                   onChange={e => setShowInact(e.target.checked)} />
            Tampilkan nonaktif
          </label>
          <button onClick={startNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Tambah Device
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4">
          <h3 className="col-span-2 font-semibold text-gray-700 text-lg">
            {form.id ? `Edit Device #${form.id}` : 'Tambah Device Baru'}
          </h3>

          {fld('name', 'Nama Device Lengkap', {
            placeholder: 'JATIM-ULP.KEBON.AGUNG.OLT-RC-03',
            full: true, required: true, disabled: !!form.id,
          })}
          {fld('label', 'Label UI', { placeholder: 'Kebon Agung OLT-03', required: true })}
          {fld('ipAddress', 'IP Address', { placeholder: '172.x.x.x' })}
          {fld('oltUser', 'Username Login', { placeholder: 'moh.sindunata', required: true })}
          {fld('oltPass', 'Password Login', {
            type: 'password',
            placeholder: form.id ? '(kosongkan untuk tidak ubah)' : '',
            required: !form.id,
          })}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Vendor / Preset</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm"
              value={form.vendor}
              onChange={e => applyPreset(e.target.value)}
            >
              {Object.entries(VENDOR_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{presets[form.vendor]?.notes}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Tipe Perangkat</label>
            <select
              className="w-full border rounded-lg p-2.5 text-sm"
              value={form.deviceType}
              onChange={e => setForm(f => ({ ...f, deviceType: e.target.value }))}
            >
              <option value="OLT">OLT</option>
              <option value="FDT">FDT (Fiber Distribution Terminal)</option>
              <option value="FAT">FAT (Fiber Access Terminal)</option>
            </select>
          </div>

          {/* Advanced ─ CLI profile fields ─────────────────────────────── */}
          <div className="col-span-2 mt-2">
            <button
              type="button"
              onClick={() => setShowAdv(!showAdv)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {showAdv ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Profile CLI (otomatis dari preset, edit kalau perlu)
            </button>
          </div>

          {showAdv && (
            <>
              {fld('verifyCommand',  'Verify Command (jumphost)',
                  { placeholder: 'h {keyword} — kosongkan utk skip' })}
              {fld('connectCommand', 'Connect Command (jumphost)',
                  { placeholder: 't {name}' })}
              {fld('loginUserPrompts', 'Prompt Username (CSV)', {
                  placeholder: '>>User name:,Login:', full: true })}
              {fld('loginPassPrompts', 'Prompt Password Login (CSV)', {
                  placeholder: 'Password:', full: true })}
              {fld('userModePrompts',  'Prompt User-Mode (CSV)',
                  { placeholder: '>' })}
              {fld('enableModePrompts','Prompt Privileged-Mode (CSV)',
                  { placeholder: '#' })}
              {fld('enableCommand', 'Enable Command',
                  { placeholder: 'enable / ena / (kosong)' })}
              {fld('enablePassword','Enable Password (opsional)', {
                  type: 'password',
                  placeholder: form.id ? '(kosong = tidak ubah)' : '',
              })}
              {fld('disablePagingCommand','Disable-Paging Command',
                  { placeholder: 'scroll / terminal length 0' })}
              {fld('pagingTrigger','Paging Trigger (interaktif)',
                  { placeholder: '{ <cr> / --More--' })}
              {fld('pagingResponse','Paging Response',
                  { placeholder: '\\n atau spasi' })}
              {fld('postConnectTrigger', 'Post-Connect Trigger (banner)',
                  { placeholder: 'Press \'RETURN\'' })}
              {fld('postConnectResponse','Post-Connect Response',
                  { placeholder: '\\n' })}
              {fld('preCommands', 'Pre-Commands (1 command per baris)', {
                  full: true, textarea: true,
                  placeholder: 'terminal length 0\nconfigure terminal',
              })}
            </>
          )}

          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
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
              {['Label', 'Nama', 'IP', 'Vendor', 'Tipe', 'Status', 'Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {devices.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada device</td></tr>
            )}
            {devices.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.label}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={d.name}>{d.name}</td>
                <td className="px-4 py-3">{d.ipAddress}</td>
                <td className="px-4 py-3 capitalize">{d.vendor}</td>
                <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{d.deviceType}</span></td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {d.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <button onClick={() => startEdit(d)} title="Edit"
                          className="text-blue-500 hover:text-blue-700"><Pencil size={16} /></button>
                  {d.isActive ? (
                    <button onClick={() => del(d.id)} title="Nonaktifkan"
                            className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  ) : (
                    <button onClick={() => reactivate(d.id)} title="Aktifkan"
                            className="text-green-600 hover:text-green-800"><RotateCcw size={16} /></button>
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
