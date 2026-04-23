import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ganti dengan IP laptop/server saat development
// WiFi lokal: 'http://192.168.x.x:5006/api'
const API_URL = 'http://172.168.8.182:5006/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async cfg => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.log('Token read error:', e);
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    console.log('API Error:', err.response?.status, err.message);
    return Promise.reject(err);
  }
);

export default api;
