// HomeTab — landing utama: greeting + grid kartu kota (auto-derived dari
// device.name, format `JATIM-{KOTA}.{...}`). Tap kota -> tampil daftar
// button yg di-assign teknisi utk device kota tsb.

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, Alert, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { colors, radius, spacing } from '../../theme';

const DEFAULT_CITIES = ['SURABAYA', 'MALANG', 'JEMBER', 'MADIUN', 'KEDIRI', 'BANYUWANGI', 'SIDOARJO', 'PASURUAN'];

function cityFromDeviceName(name) {
  // contoh: "JATIM-SIDOARJO.ODC.KREMBUNG-HW.MA5800X2-OLT-01"
  // ambil segmen pertama, hilangkan prefix "JATIM-" & "ULP."
  const seg = name.split('.')[0]?.replace(/^JATIM-/, '').replace(/^ULP-?/, '') ?? '';
  // ambil token pertama yg alfabet
  const m = seg.match(/[A-Za-z]+/);
  return (m?.[0] ?? 'LAINNYA').toUpperCase();
}

export default function HomeTab({ navigation }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [name,     setName]     = useState('Teknisi');
  const [city,     setCity]     = useState(null);
  const [exec,     setExec]     = useState(null);
  const [params,   setParams]   = useState({});
  const [executing,setExecuting]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, n] = await Promise.all([
        api.get('/buttons/my'),
        AsyncStorage.getItem('fullName'),
      ]);
      setItems(Array.isArray(data) ? data : []);
      setName(n || 'Teknisi');
    } catch {
      Alert.alert('Gagal', 'Tidak bisa memuat tugas. Periksa koneksi.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // group by city
  const byCity = {};
  items.forEach(it => {
    const c = cityFromDeviceName(it.button.deviceName);
    (byCity[c] = byCity[c] || []).push(it);
  });
  const cities = [
    ...DEFAULT_CITIES.filter(c => byCity[c]),
    ...Object.keys(byCity).filter(c => !DEFAULT_CITIES.includes(c)),
  ];

  const openExec = it => {
    const keys = it.button.parameterKeys
      ? it.button.parameterKeys.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const init = {}; keys.forEach(k => init[k] = '');
    setParams(init); setExec(it);
  };

  const runExec = async () => {
    if (!exec) return;
    setExecuting(true);
    try {
      const { data } = await api.post('/execute', {
        buttonId:   exec.button.id,
        parameters: params,
      });
      setExec(null);
      navigation.navigate('Result', {
        output:   data.output,
        command:  data.command,
        duration: data.durationMs,
        device:   exec.button.deviceName,
      });
      load();
    } catch (err) {
      Alert.alert('Eksekusi Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setExecuting(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Pink header */}
      <View style={s.header}>
        <Text style={s.brand}>ICON+</Text>
        <Text style={s.brandSub}>NOC ICONNET · Jawa Timur</Text>
        <Text style={s.greet}>Halo, <Text style={{ fontWeight: '900' }}>{name}</Text> 👋</Text>
        <Text style={s.date}>{new Date().toLocaleDateString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {city == null ? (
          <>
            <Text style={s.section}>Pilih Kota / Lokasi</Text>
            {cities.length === 0 && !loading && (
              <Text style={s.empty}>Belum ada tugas yang di-assign untukmu.</Text>
            )}
            <View style={s.grid}>
              {cities.map(c => (
                <TouchableOpacity key={c} style={s.cityCard} onPress={() => setCity(c)}>
                  <Text style={s.cityIcon}>📍</Text>
                  <Text style={s.cityName}>{c}</Text>
                  <View style={s.cityBadge}>
                    <Text style={s.cityBadgeTxt}>{byCity[c].length} tugas</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={s.crumbs}>
              <TouchableOpacity onPress={() => setCity(null)}>
                <Text style={s.back}>← Pilih kota lain</Text>
              </TouchableOpacity>
              <Text style={s.crumbCity}>{city}</Text>
            </View>

            {(byCity[city] || []).map(it => {
              const expired = new Date(it.button.expiresAt) < new Date();
              const done    = it.done_today === true;
              return (
                <TouchableOpacity
                  key={it.button.id}
                  style={[s.task, expired && { opacity: 0.5 }, done && s.taskDone]}
                  disabled={expired}
                  onPress={() => openExec(it)}
                >
                  <View style={s.taskHead}>
                    <Text style={s.taskLabel}>{it.button.label}</Text>
                    <View style={[s.pill,
                      { backgroundColor: done ? '#ddf3df' : expired ? '#eee' : colors.accent }]}>
                      <Text style={[s.pillTxt,
                        { color: done ? colors.success : expired ? '#999' : colors.primaryDark }]}>
                        {done ? 'Selesai' : expired ? 'Expired' : 'Belum'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.taskDevice} numberOfLines={1}>{it.button.deviceLabel}</Text>
                  {!!it.button.description && (
                    <Text style={s.taskDesc}>{it.button.description}</Text>
                  )}
                  <Text style={s.taskCmd}>{it.button.commandTemplate}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Modal eksekusi parameter */}
      <Modal visible={!!exec} transparent animationType="slide" onRequestClose={() => setExec(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Jalankan Command</Text>
            <Text style={s.modalSub}>{exec?.button.label}</Text>
            <Text style={s.modalCmd}>{exec?.button.commandTemplate}</Text>

            {Object.keys(params).map(k => (
              <View key={k} style={{ marginTop: spacing.md }}>
                <Text style={s.modalLabel}>{k}</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder={`Masukkan ${k}`}
                  placeholderTextColor="#bbb"
                  value={params[k]}
                  onChangeText={v => setParams(p => ({ ...p, [k]: v }))}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[s.modalBtn, executing && { opacity: 0.6 }]}
              onPress={runExec} disabled={executing}
            >
              {executing
                ? <ActivityIndicator color={colors.primaryDark} />
                : <Text style={s.modalBtnTxt}>JALANKAN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setExec(null)}>
              <Text style={s.modalCancel}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 24,
            paddingHorizontal: spacing.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  brand:  { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  brandSub:{ color: '#fde2eb', fontSize: 11, marginBottom: spacing.md, letterSpacing: 1 },
  greet:  { color: '#fff', fontSize: 18 },
  date:   { color: '#fde2eb', fontSize: 12, marginTop: 2 },

  section:{ fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginBottom: spacing.md },
  empty:  { color: colors.textMute, textAlign: 'center', marginTop: 48, fontStyle: 'italic' },

  grid:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cityCard:{ width: '48%', backgroundColor: colors.card, padding: spacing.md,
             borderRadius: radius.lg, marginBottom: spacing.md, alignItems: 'center',
             borderWidth: 1, borderColor: colors.border, elevation: 2 },
  cityIcon:{ fontSize: 36, marginBottom: 6 },
  cityName:{ fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  cityBadge:{ marginTop: 6, backgroundColor: colors.accent,
              paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill },
  cityBadgeTxt:{ fontSize: 10, fontWeight: '700', color: colors.primaryDark },

  crumbs: { flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: spacing.md },
  back:   { color: colors.primary, fontWeight: '600' },
  crumbCity: { color: colors.primaryDark, fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  task:   { backgroundColor: colors.card, padding: spacing.md,
            borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
            marginBottom: spacing.sm, elevation: 1 },
  taskDone:{ borderColor: colors.success, backgroundColor: '#f4fbf5' },
  taskHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskLabel:{ flex: 1, fontWeight: '700', color: colors.text, fontSize: 14, paddingRight: 8 },
  taskDevice:{ color: colors.textMute, fontSize: 11, marginTop: 4 },
  taskDesc: { color: '#666', fontSize: 12, marginTop: 6, lineHeight: 16 },
  taskCmd:  { fontFamily: 'monospace', backgroundColor: '#f6efe9',
              padding: 8, borderRadius: radius.sm, marginTop: 8,
              fontSize: 11, color: colors.primaryDark },
  pill:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  pillTxt:  { fontSize: 10, fontWeight: '700' },

  modalBg:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'flex-end' },
  modalCard:{ backgroundColor: '#fff', padding: spacing.lg,
              borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle:{ fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  modalSub: { color: '#666', marginTop: 2, fontSize: 13 },
  modalCmd: { fontFamily: 'monospace', backgroundColor: colors.bg,
              padding: 10, borderRadius: 8, marginTop: 12, fontSize: 12,
              color: colors.primaryDark },
  modalLabel:{ fontWeight: '600', fontSize: 13, color: colors.text, marginBottom: 4 },
  modalInput:{ borderWidth: 1, borderColor: colors.border, borderRadius: 8,
               padding: 12, fontSize: 14, backgroundColor: colors.bg },
  modalBtn:  { backgroundColor: colors.accent, padding: 14,
               borderRadius: radius.md, alignItems: 'center', marginTop: 20 },
  modalBtnTxt:{ color: colors.primaryDark, fontWeight: '900',
                fontSize: 15, letterSpacing: 2 },
  modalCancel:{ color: colors.textMute, textAlign: 'center', marginTop: 12, fontSize: 13 },
});
