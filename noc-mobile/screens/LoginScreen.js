import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

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
        ['role',     data.role],
      ]);
      navigation.replace('Home');
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
        <View style={s.top}>
          <Text style={s.appName}>NOC System</Text>
          <Text style={s.appSub}>Teknisi Lapangan</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Masuk</Text>
          <Text style={s.sub}>Login dengan akun yang diberikan admin</Text>

          <View style={s.inputBox}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              placeholder="Masukkan username"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
            />
          </View>

          <View style={s.inputBox}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="Masukkan password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={login}
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={login}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Masuk</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#1e3a5f' },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24 },
  top:        { alignItems: 'center', marginBottom: 32 },
  appName:    { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  appSub:     { fontSize: 14, color: '#a0c4e8', marginTop: 4 },
  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 28 },
  title:      { fontSize: 24, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 4 },
  sub:        { color: '#888', fontSize: 13, marginBottom: 24 },
  inputBox:   { marginBottom: 16 },
  label:      { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '500' },
  input:      { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
                padding: 14, fontSize: 15, backgroundColor: '#fafafa' },
  btn:        { backgroundColor: '#1e3a5f', borderRadius: 12,
                padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled:{ opacity: 0.6 },
  btnTxt:     { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
