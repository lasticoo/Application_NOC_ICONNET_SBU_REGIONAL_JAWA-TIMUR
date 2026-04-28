import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const login = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Isi username dan password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });
      await AsyncStorage.multiSet([
        ['token',    data.token],
        ['userId',   String(data.userId)],
        ['fullName', data.fullName],
        ['username', username.trim()],
        ['role',     data.role],
      ]);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert(
        'Login Gagal',
        err.response?.data?.message || err.message || 'Periksa koneksi jaringan'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brandBox}>
          <Text style={s.iconText}>ICON+</Text>
          <Text style={s.brandSub}>NOC ICONNET · Jawa Timur</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Login</Text>
          <Text style={s.sub}>Masuk dengan akun teknisi yang diberikan admin.</Text>

          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            placeholder="Masukkan username"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="Masukkan password"
            placeholderTextColor="#bbb"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={login}
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={login}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>MASUK</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.primary },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brandBox:    { alignItems: 'center', marginBottom: spacing.xxl },
  iconText:    { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  brandSub:    { color: '#fde2eb', fontSize: 12, marginTop: spacing.xs, letterSpacing: 1 },
  card:        { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.xl, elevation: 5 },
  title:       { fontSize: 22, fontWeight: '700', color: colors.primaryDark },
  sub:         { fontSize: 12, color: colors.textMute, marginBottom: spacing.lg, marginTop: 2 },
  label:       { fontSize: 12, color: colors.text, marginBottom: 4, fontWeight: '600' },
  input:       { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
                 padding: 14, fontSize: 14, marginBottom: spacing.md, backgroundColor: colors.bg },
  btn:         { backgroundColor: colors.accent, borderRadius: radius.md,
                 padding: 16, alignItems: 'center', marginTop: spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnTxt:      { color: colors.primaryDark, fontWeight: '900', fontSize: 15, letterSpacing: 2 },
});
