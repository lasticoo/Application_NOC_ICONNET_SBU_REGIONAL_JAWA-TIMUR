// utils/brightness.js
//
// Force device brightness ke 100 % saat layar app dibuka, dan kembalikan
// ke setting awal saat user keluar (logout).
//
// Pakai expo-brightness; kalau modul ga tersedia, fallback no-op tanpa crash.

let original = null;
let Brightness = null;

try {
  Brightness = require('expo-brightness');
} catch {
  Brightness = null;
}

export async function forceMax() {
  if (!Brightness) return;
  try {
    if (Brightness.requestPermissionsAsync) {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
    if (original == null) original = await Brightness.getBrightnessAsync();
    await Brightness.setSystemBrightnessAsync?.(1) ??
          Brightness.setBrightnessAsync(1);
  } catch (e) {
    console.log('forceMax brightness err', e?.message);
  }
}

export async function restore() {
  if (!Brightness || original == null) return;
  try {
    await Brightness.setSystemBrightnessAsync?.(original) ??
          Brightness.setBrightnessAsync(original);
    original = null;
  } catch {}
}
