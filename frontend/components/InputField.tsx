import React from 'react';
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  variant?: 'cream' | 'white';
}

export function InputField({ label, variant = 'cream', style, ...props }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          variant === 'white' && styles.inputWhite,
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWhite: {
    backgroundColor: Colors.white,
    borderColor: Colors.darkGreen,
  },
});
