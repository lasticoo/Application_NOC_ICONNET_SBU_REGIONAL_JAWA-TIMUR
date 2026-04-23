import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Alert, Modal,
  ActivityIndicator, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function HomeScreen({ navigation }) {
  const [buttons,   setButtons]   = useState([]);
  const [fullName,  setFullName]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [execModal, setExecModal] = useState(null);
  const [params,    setParams]    = useState({});
  const [executing, setExecuting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resp, name] = await Promise.all([
        api.get('/buttons/my'),
        AsyncStorage.getItem('fullName'),
      ]);
      setButtons(Array.isArray(resp.data) ? resp.data : []);
      setFullName(name || 'Teknisi');
    } catch {
      Alert.alert('Gagal', 'Tidak bisa memuat data. Cek koneksi dan backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openExec = item => {
    const keys = item.button.parameterKeys
      ? item.button.parameterKeys.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const init = {};
    keys.forEach(k => { init[k] = ''; });
    setParams(init);
    setExecModal(item);
  };

  const execute = async () => {
    if (!execModal) return;
    setExecuting(true);
    try {
      const { data } = await api.post('/execute', {
        buttonId:   execModal.button.id,
        parameters: params,
      });
      setExecModal(null);
      navigation.navigate('Result', {
        output:   data.output,
        command:  data.command,
        duration: data.durationMs,
        device:   execModal.button.deviceName,
      });
      load();
    } catch (err) {
      Alert.alert('Eksekusi Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setExecuting(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  const isExpired = expiresAt => new Date(expiresAt) < new Date();

  const renderItem = ({ item }) => {
    const expired = isExpired(item.button.expiresAt);
    const done    = item.done_today === true;

    return (
      <TouchableOpacity
        style={[s.card, expired && s.cardExpired, done && s.cardDone]}
        onPress={() => { if (!expired) openExec(item); }}
        activeOpacity={0.7}
      >
        <View style={s.badgeRow}>
          <View style={[s.badge,
            { backgroundColor: done ? '#d4edda' : expired ? '#f0f0f0' : '#fff3cd' }
          ]}>
            <Text style={[s.badgeTxt,
              { color: done ? '#155724' : expired ? '#999' : '#856404' }
            ]}>
              {done ? '✓ Selesai' : expired ? 'Expired' : 'Belum'}
            </Text>
          </View>
        </View>
        <Text style={s.cardLabel}>{item.button.label}</Text>
        <Text style={s.cardDevice}>{item.button.deviceLabel}</Text>
        {item.button.description
          ? <Text style={s.cardDesc}>{item.button.description}</Text>
          : null
        }
        <Text style={s.cardCmd}>{item.button.commandTemplate}</Text>
      </TouchableOpacity>
    );
  };

  const total    = buttons.length;
  const selesai  = buttons.filter(b => b.done_today === true).length;
  const belum    = buttons.filter(b => b.done_today !== true && !isExpired(b.button.expiresAt)).length;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Halo, {fullName} 👋</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={s.logoutTxt}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Statistik */}
      <View style={s.statsRow}>
        {[
          { num: total,   label: 'Total',   color: '#fff' },
          { num: selesai, label: 'Selesai', color: '#28a745' },
          { num: belum,   label: 'Belum',   color: '#ffc107' },
        ].map((item, i) => (
          <View key={i} style={s.statBox}>
            <Text style={[s.statNum, { color: item.color }]}>{item.num}</Text>
            <Text style={s.statLbl}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>Tugas Hari Ini</Text>

      <FlatList
        data={buttons}
        keyExtractor={i => String(i.button.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            colors={['#1e3a5f']}
          />
        }
        ListEmptyComponent={
          !loading
            ? <Text style={s.empty}>Belum ada tugas hari ini</Text>
            : <ActivityIndicator style={{ marginTop: 40 }} color="#1e3a5f" />
        }
      />

      {/* Modal eksekusi */}
      <Modal
        visible={execModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setExecModal(null)}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{execModal?.button.label}</Text>
            <Text style={s.modalDevice}>{execModal?.button.deviceLabel}</Text>
            <Text style={s.modalCmd}>{execModal?.button.commandTemplate}</Text>

            {Object.keys(params).length > 0 && (
              <View style={s.paramBox}>
                <Text style={s.paramTitle}>Isi Parameter</Text>
                {Object.keys(params).map(k => (
                  <View key={k} style={s.paramItem}>
                    <Text style={s.paramLabel}>{k}</Text>
                    <TextInput
                      style={s.paramInput}
                      placeholder={`Masukkan ${k}...`}
                      value={params[k]}
                      onChangeText={v => setParams(p => ({ ...p, [k]: v }))}
                      autoCapitalize="none"
                    />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.execBtn, executing && { opacity: 0.6 }]}
              onPress={execute}
              disabled={executing}
            >
              {executing
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.execBtnTxt}>Eksekusi Command</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setExecModal(null)}
              disabled={executing}
            >
              <Text style={s.cancelTxt}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f0f4f8' },
  header:      { backgroundColor: '#1e3a5f',
                 paddingTop: Platform.OS === 'ios' ? 56 : 48,
                 padding: 20, flexDirection: 'row',
                 justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting:    { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  date:        { color: '#a0c4e8', fontSize: 12, marginTop: 2 },
  logoutTxt:   { color: '#f0a500', fontSize: 13 },
  statsRow:    { backgroundColor: '#1e3a5f', flexDirection: 'row',
                 paddingBottom: 16, paddingHorizontal: 16 },
  statBox:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
                 borderRadius: 10, padding: 12, alignItems: 'center', margin: 4 },
  statNum:     { fontSize: 22, fontWeight: 'bold' },
  statLbl:     { color: '#a0c4e8', fontSize: 11, marginTop: 2 },
  sectionTitle:{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
                 color: '#555', fontWeight: '600', fontSize: 13 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16,
                 elevation: 2, shadowColor: '#000',
                 shadowOffset: { width: 0, height: 1 },
                 shadowOpacity: 0.1, shadowRadius: 4,
                 borderLeftWidth: 4, borderLeftColor: '#1e3a5f' },
  cardExpired: { opacity: 0.5, borderLeftColor: '#ccc' },
  cardDone:    { borderLeftColor: '#28a745' },
  badgeRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  badge:       { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:    { fontSize: 11, fontWeight: '600' },
  cardLabel:   { fontSize: 16, fontWeight: '700', color: '#1e3a5f', marginBottom: 2 },
  cardDevice:  { fontSize: 12, color: '#888', marginBottom: 4 },
  cardDesc:    { fontSize: 13, color: '#555', marginBottom: 4 },
  cardCmd:     { fontSize: 11, color: '#0066cc', backgroundColor: '#f0f7ff',
                 padding: 6, borderRadius: 6,
                 fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  empty:       { textAlign: 'center', color: '#aaa', paddingTop: 60, fontSize: 15 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: '#fff', borderTopLeftRadius: 24,
                 borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:  { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 4 },
  modalDevice: { color: '#888', fontSize: 12, marginBottom: 8 },
  modalCmd:    { color: '#0066cc', backgroundColor: '#f0f7ff',
                 padding: 8, borderRadius: 8, fontSize: 12, marginBottom: 16,
                 fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  paramBox:    { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 16 },
  paramTitle:  { fontWeight: '600', color: '#333', marginBottom: 10, fontSize: 13 },
  paramItem:   { marginBottom: 10 },
  paramLabel:  { fontSize: 12, color: '#666', marginBottom: 4 },
  paramInput:  { borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
                 padding: 10, fontSize: 14, backgroundColor: '#fff' },
  execBtn:     { backgroundColor: '#1e3a5f', borderRadius: 12,
                 padding: 16, alignItems: 'center', marginBottom: 10 },
  execBtnTxt:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn:   { alignItems: 'center', padding: 12 },
  cancelTxt:   { color: '#888', fontSize: 15 },
});
