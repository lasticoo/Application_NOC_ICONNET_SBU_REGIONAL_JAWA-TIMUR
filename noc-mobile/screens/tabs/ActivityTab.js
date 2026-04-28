// ActivityTab — daftar history eksekusi command oleh user (mine).

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import api from '../../api/client';
import { colors, radius, spacing } from '../../theme';

export default function ActivityTab({ navigation }) {
  const [logs,   setLogs]   = useState([]);
  const [loading,setLoading]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/logs/my');
      setLogs(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = log => {
    navigation.navigate('Result', {
      output:   log.rawOutput ?? '(tidak ada output tersimpan)',
      command:  log.command,
      duration: log.durationMs,
      device:   log.deviceName,
      success:  log.status === 'success',
      historical: true,
    });
  };

  const fmt = d => new Date(d).toLocaleString('id-ID',
    { dateStyle: 'short', timeStyle: 'short' });

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.brand}>Aktivitas</Text>
        <Text style={s.brandSub}>Riwayat eksekusi command Anda</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={l => String(l.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading
          ? <Text style={s.empty}>Belum ada aktivitas tercatat.</Text>
          : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => open(item)}>
            <View style={s.row}>
              <Text style={s.label}>{item.buttonLabel ?? item.command}</Text>
              <View style={[s.pill,
                { backgroundColor: item.status === 'success' ? '#ddf3df' : '#fbe1e1' }]}>
                <Text style={[s.pillTxt,
                  { color: item.status === 'success' ? colors.success : colors.danger }]}>
                  {item.status === 'success' ? 'Sukses' : 'Gagal'}
                </Text>
              </View>
            </View>
            <Text style={s.dev} numberOfLines={1}>{item.deviceName}</Text>
            <Text style={s.cmd} numberOfLines={1}>{item.command}</Text>
            <Text style={s.meta}>{fmt(item.executedAt)} · {item.durationMs}ms</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header:   { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 20,
              paddingHorizontal: spacing.lg, borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32 },
  brand:    { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  brandSub: { color: '#fde2eb', fontSize: 12, marginTop: 2 },
  empty:    { color: colors.textMute, textAlign: 'center', marginTop: 64,
              fontStyle: 'italic' },
  card:     { backgroundColor: colors.card, padding: spacing.md,
              borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
              elevation: 1 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { flex: 1, fontWeight: '700', color: colors.text, fontSize: 14, paddingRight: 8 },
  dev:      { color: colors.textMute, fontSize: 11, marginTop: 4 },
  cmd:      { fontFamily: 'monospace', color: colors.primaryDark,
              fontSize: 12, marginTop: 4 },
  meta:     { color: colors.textMute, fontSize: 11, marginTop: 6 },
  pill:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  pillTxt:  { fontSize: 11, fontWeight: '700' },
});
