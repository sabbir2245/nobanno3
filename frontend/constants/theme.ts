export type ThemeColors = {
  darkGreen: string;
  headerGreen: string;
  mediumGreen: string;
  lightGreen: string;
  paleGreen: string;
  sageGreen: string;
  cream: string;
  paleYellow: string;
  lightOrange: string;
  white: string;
  textOnPrimary: string;
  textDark: string;
  textMuted: string;
  border: string;
  starGold: string;
  red: string;
  cardShadow: string;
};

export const lightColors: ThemeColors = {
  darkGreen: '#1B4332',
  headerGreen: '#1E3D2F',
  mediumGreen: '#2D6A4F',
  lightGreen: '#D8ECD8',
  paleGreen: '#E8F5E3',
  sageGreen: '#B7D4B0',
  cream: '#FFF9E6',
  paleYellow: '#FFF4C4',
  lightOrange: '#FFD9A0',
  white: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textDark: '#1A1A1A',
  textMuted: '#5C5C5C',
  border: '#C5C5C5',
  starGold: '#D4A017',
  red: '#D14343',
  cardShadow: 'rgba(27, 67, 50, 0.12)',
};

export const darkColors: ThemeColors = {
  darkGreen: '#86C29D',
  headerGreen: '#0F2018',
  mediumGreen: '#3B8F6A',
  lightGreen: '#2A4A38',
  paleGreen: '#15221C',
  sageGreen: '#4A6B55',
  cream: '#1C2A22',
  paleYellow: '#2B2A1A',
  lightOrange: '#2A2418',
  white: '#1A1A1A',
  textOnPrimary: '#FFFFFF',
  textDark: '#E6EBE8',
  textMuted: '#B8C4BE',
  border: '#3A4A40',
  starGold: '#E0B344',
  red: '#E06565',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
};

export const Colors: ThemeColors = lightColors;

export const Fonts = {
  regular: 'Lora_400Regular',
  medium: 'Lora_500Medium',
  semiBold: 'Lora_600SemiBold',
  bold: 'Lora_700Bold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 24,
  full: 999,
};
