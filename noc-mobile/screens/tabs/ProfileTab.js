// ProfileTab — info user yg sedang login + tombol edit profile + logout.

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { restore as restoreBrightness } from '../../utils/brightness';
import { colors, radius, spacing } from '../../theme';

export default function ProfileTab({ navigation }) {
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setMe(data);
    } catch {
      const fullName = await AsyncStorage.getItem('fullName');
      const username = await AsyncStorage.getItem('username');
      setMe({ fullName, username, role: 'user' });
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener?.('focus', load);
    return unsub;
  }, [load, navigation]);

  const logout = async () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', style: 'destructive', onPress: async () => {
          await restoreBrightness();
          await AsyncStorage.clear();
          navigation.replace('Login');
        }},
    ]);
  };

  if (!me) return null;
  const initials = (me.fullName ?? me.username ?? '?')
    .split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{initials}</Text>
        </View>
        <Text style={s.name}>{me.fullName}</Text>
        <Text style={s.username}>@{me.username} · {me.role}</Text>
      </View>

      <View style={{ padding: spacing.lg }}>
        <InfoRow label="Username"      value={me.username} />
        <InfoRow label="Nama Lengkap"  value={me.fullName} />
        <InfoRow label="No. Telepon"   value={me.phoneNumber || '—'} />
        <InfoRow label="Role"          value={me.role} />
        <InfoRow label="Status"        value={me.isActive ? 'Aktif' : 'Nonaktif'} />

        <TouchableOpacity
          style={s.btn}
          onPress={() => navigation.navigate('EditProfile', { me })}
        >
          <Text style={s.btnTxt}>EDIT PROFIL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={logout}>
          <Text style={[s.btnTxt, { color: '#fff' }]}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLbl}>{label}</Text>
      <Text style={s.rowVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 32,
            alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  avatar: { width: 86, height: 86, borderRadius: 43,
            backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#fff' },
  avatarTxt:{ fontSize: 30, fontWeight: '900', color: colors.primaryDark },
  name:    { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12 },
  username:{ color: '#fde2eb', fontSize: 12, marginTop: 2 },

  row:     { flexDirection: 'row', justifyContent: 'space-between',
             padding: 14, borderBottomWidth: 1, borderColor: colors.border },
  rowLbl:  { color: colors.textMute, fontSize: 12 },
  rowVal:  { color: colors.text,    fontSize: 13, fontWeight: '600',
             maxWidth: '60%', textAlign: 'right' },

  btn:     { backgroundColor: colors.accent, padding: 14,
             borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
  btnTxt:  { color: colors.primaryDark, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  btnDanger:{ backgroundColor: colors.danger, marginTop: spacing.sm },
});
