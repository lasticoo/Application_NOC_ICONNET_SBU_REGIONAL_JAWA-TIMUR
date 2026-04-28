// EditProfileScreen — user bisa edit FullName & PhoneNumber sendiri.
// (Password TIDAK boleh diubah dari mobile — user minta admin reset.)

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { colors, radius, spacing } from '../theme';

export default function EditProfileScreen({ navigation, route }) {
  const me = route.params?.me ?? {};
  const [fullName,    setFullName]    = useState(me.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(me.phoneNumber ?? '');
  const [saving,      setSaving]      = useState(false);

  const save = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Nama tidak boleh kosong'); return; }
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', {
        fullName: fullName.trim(),
        role:     me.role ?? 'user',
        phoneNumber: phoneNumber.trim() || null,
      });
      await AsyncStorage.setItem('fullName', data.fullName);
      Alert.alert('Berhasil', 'Profil tersimpan');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Tidak bisa menyimpan');
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={s.title}>Edit Profil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={s.label}>Username</Text>
        <TextInput style={[s.input, { opacity: 0.6 }]}
                   value={me.username ?? ''} editable={false} />

        <Text style={s.label}>Nama Lengkap</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                   placeholder="Mis. Moh. Sindunata" placeholderTextColor="#bbb" />

        <Text style={s.label}>No. Telepon</Text>
        <TextInput style={s.input} value={phoneNumber} onChangeText={setPhoneNumber}
                   keyboardType="phone-pad" placeholder="08xx-xxxx-xxxx" placeholderTextColor="#bbb" />

        <View style={s.note}>
          <Text style={s.noteTxt}>
            Untuk mengubah password, hubungi admin NOC.
          </Text>
        </View>

        <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]}
                          onPress={save} disabled={saving}>
          <Text style={s.btnTxt}>{saving ? 'MENYIMPAN…' : 'SIMPAN'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 20,
            paddingHorizontal: spacing.lg },
  back:   { color: '#fff', fontSize: 14, marginBottom: 8 },
  title:  { color: '#fff', fontSize: 22, fontWeight: '900' },
  label:  { fontSize: 12, fontWeight: '700', color: colors.text,
            marginTop: spacing.md, marginBottom: 4 },
  input:  { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
            padding: 14, fontSize: 14, backgroundColor: colors.card },
  note:   { backgroundColor: '#fff7e0', padding: 12, borderRadius: radius.sm,
            marginTop: spacing.lg, borderWidth: 1, borderColor: '#f0e0a0' },
  noteTxt:{ color: '#7a5a10', fontSize: 12 },
  btn:    { backgroundColor: colors.accent, padding: 14, borderRadius: radius.md,
            alignItems: 'center', marginTop: spacing.xl },
  btnTxt: { color: colors.primaryDark, fontWeight: '900', letterSpacing: 2 },
});
