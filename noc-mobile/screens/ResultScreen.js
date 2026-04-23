import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Platform
} from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { output, command, duration, device } = route.params;

  const share = () => Share.share({
    message: `Command: ${command}\nDevice: ${device}\n\nOutput:\n${output}`
  });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>← Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={share}>
          <Text style={s.shareTxt}>Bagikan</Text>
        </TouchableOpacity>
      </View>

      {/* Info command */}
      <View style={s.meta}>
        <Text style={s.metaDevice} numberOfLines={2}>{device}</Text>
        <Text style={s.metaCmd}>{command}</Text>
        <View style={s.metaRow}>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>✓ Berhasil</Text>
          </View>
          <Text style={s.metaDur}>{duration}ms</Text>
        </View>
      </View>

      <Text style={s.outputLabel}>OUTPUT OLT</Text>

      {/* Output terminal */}
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.output} selectable>
          {output || '(Tidak ada output)'}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0d1117' },
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
  metaCmd:     { color: '#79c0ff', fontSize: 13, marginBottom: 8,
                 fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  metaRow:     { flexDirection: 'row', alignItems: 'center' },
  badge:       { backgroundColor: '#1a3a1a', paddingHorizontal: 10,
                 paddingVertical: 3, borderRadius: 10, marginRight: 12 },
  badgeTxt:    { color: '#3fb950', fontSize: 12, fontWeight: '600' },
  metaDur:     { color: '#8b949e', fontSize: 12 },
  outputLabel: { color: '#8b949e', fontSize: 10, paddingHorizontal: 16,
                 paddingTop: 12, paddingBottom: 4, letterSpacing: 1.5 },
  scroll:      { flex: 1 },
  output:      { color: '#e6edf3', fontSize: 12, lineHeight: 20,
                 fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});
