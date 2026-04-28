// MainScreen — container untuk 3 tab (Activity, Home, Profile) dgn bottom-nav
// pink seperti mockup. Pakai state lokal supaya tidak menambah dependency
// @react-navigation/bottom-tabs.

import { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

import HomeTab     from './tabs/HomeTab';
import ActivityTab from './tabs/ActivityTab';
import ProfileTab  from './tabs/ProfileTab';

import { colors, radius } from '../theme';

// emoji-style icons (tanpa dependency tambahan)
const TABS = [
  { key: 'activity', icon: '☰', Cmp: ActivityTab },
  { key: 'home',     icon: '⌂', Cmp: HomeTab     },
  { key: 'profile',  icon: '☻', Cmp: ProfileTab  },
];

export default function MainScreen({ navigation }) {
  const [active, setActive] = useState('home');
  const Cmp = TABS.find(t => t.key === active)?.Cmp ?? HomeTab;

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <Cmp navigation={navigation} />
      </View>

      <View style={s.tabbarWrap}>
        <View style={s.tabbar}>
          {TABS.map(t => {
            const isActive = t.key === active;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActive(t.key)}
                style={[s.tabBtn, isActive && s.tabBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: isActive ? 26 : 22,
                  color: isActive ? colors.primaryDark : '#fff',
                  fontWeight: '700',
                }}>{t.icon}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  tabbarWrap: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 28 : 18, paddingTop: 8,
                backgroundColor: 'transparent' },
  tabbar:     { flexDirection: 'row', backgroundColor: colors.primary,
                borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 6,
                justifyContent: 'space-around', elevation: 6 },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center',
                paddingVertical: 10, borderRadius: radius.pill },
  tabBtnActive:{ backgroundColor: colors.accent },
});
