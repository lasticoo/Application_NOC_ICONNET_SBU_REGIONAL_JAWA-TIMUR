// Theme tokens — palet pink/maroon ICONNET sesuai mockup.
import { Platform } from 'react-native';

export const colors = {
  primary:       '#B14F6A',   // pink/maroon header
  primaryDark:   '#7E2A45',
  primaryLight:  '#E5BAC9',
  accent:        '#F4B731',   // kuning tombol
  accentDark:    '#D89C20',
  bg:            '#FFF6F2',   // background krim
  card:          '#FFFFFF',
  text:          '#1F1F1F',
  textMute:      '#7A7A7A',
  border:        '#EADBD3',
  success:       '#3FB950',
  danger:        '#E03A3A',
  terminalBg:    '#0D1117',
  terminalText:  '#E6EDF3',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius   = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const mono = Platform.OS === 'ios' ? 'Courier' : 'monospace';
