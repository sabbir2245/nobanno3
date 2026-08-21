import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/contexts/ThemeContext';

const OPTIONS: { key: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', icon: 'sunny' },
  { key: 'dark', icon: 'moon' },
];

export default function ThemeToggle() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        activeOpacity={0.85}
      >
        <Ionicons
          name={mode === 'dark' ? 'moon' : 'sunny'}
          size={18}
          color={colors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      marginTop: Spacing.lg,
      alignItems: 'flex-start',
    },
    toggle: {
      width: 46,
      height: 46,
      borderRadius: Radius.full,
      backgroundColor: Colors.darkGreen,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  });
