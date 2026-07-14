import React from 'react';
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  variant?: 'cream' | 'white';
}

export function InputField({ label, variant = 'cream', style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          variant === 'white' && styles.inputWhite,
          style,
        ]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
