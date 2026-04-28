// ResultScreen — terminal output. Bisa di-scroll horizontal & vertikal,
// font monospace, render full tanpa wrap supaya tabel CLI ga rusak.

import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Platform,
} from 'react-native';
import { forceMax } from '../utils/brightness';
import { colors, mono } from '../theme';

export default function ResultScreen({ route, navigation }) {
  const {
    output, command, duration, device,
    success = true, historical = false,
  } = route.params;

  // saat layar dibuka, paksa brightness ke 100% (lampu lapangan)
  useEffect(() => { forceMax(); }, []);

  const share = () => Share.share({
    message: `Device: ${device}\nCommand: ${command}\n\n${output}`,
  });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>← Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={share}>
          <Text style={s.shareTxt}>Bagikan</Text>
        </TouchableOpacity>
      </View>

      <View style={s.meta}>
        <Text style={s.metaDevice} numberOfLines={2}>{device}</Text>
        <Text style={s.metaCmd}>{command}</Text>
        <View style={s.metaRow}>
          <View style={[s.badge, { backgroundColor: success ? '#1a3a1a' : '#3a1a1a' }]}>
            <Text style={[s.badgeTxt, { color: success ? '#3fb950' : '#ff7b72' }]}>
              {historical ? (success ? '✓ Sukses' : '✗ Gagal') : (success ? '✓ Berhasil' : '✗ Gagal')}
            </Text>
          </View>
          <Text style={s.metaDur}>{duration}ms</Text>
        </View>
      </View>

      <Text style={s.outputLabel}>OUTPUT TERMINAL</Text>

      {/* Outer = vertical scroll, inner = horizontal scroll.
          Text di dalam horizontal-scroll TIDAK wrap. */}
      <ScrollView style={s.outerScroll} contentContainerStyle={{ paddingVertical: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <Text style={s.output} selectable>
            {output && output.length > 0 ? output : '(Tidak ada output)'}
          </Text>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.terminalBg },
  header:      { flexDirection: 'row', justifyContent: 'space-between',
                 alignItems: 'center',
                 paddingTop: Platform.OS === 'ios' ? 56 : 48,
                 paddingHorizontal: 20, paddingBottom: 16,
                 backgroundColor: '#161b22' },
  backTxt:     { color: '#58a6ff', fontSize: 16 },
  shareTxt:    { color: '#f0a500', fontSize: 14 },
  meta:        { backgroundColor: '#161b22', padding: 16,
                 borderBottomWidth: 1, borderBottomColor: '#30363d' },
  metaDevice:  { color: '#8b949e', fontSize: 11, marginBottom: 4 },
  metaCmd:     { color: '#79c0ff', fontSize: 13, marginBottom: 8, fontFamily: mono },
  metaRow:     { flexDirection: 'row', alignItems: 'center' },
  badge:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginRight: 12 },
  badgeTxt:    { fontSize: 12, fontWeight: '600' },
  metaDur:     { color: '#8b949e', fontSize: 12 },
  outputLabel: { color: '#8b949e', fontSize: 10, paddingHorizontal: 16,
                 paddingTop: 12, paddingBottom: 4, letterSpacing: 1.5 },
  outerScroll: { flex: 1 },
  output:      { color: colors.terminalText, fontSize: 12, lineHeight: 18,
                 fontFamily: mono },
});
