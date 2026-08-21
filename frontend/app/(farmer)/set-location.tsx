import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/services/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import CascadingLocationPicker from '@/components/CascadingLocationPicker';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function SetLocationScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { token, user, refreshProfile } = useAuth();
  const [locationId, setLocationId] = useState<number | null>(
    user?.location?.id ?? null,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token || !locationId) {
      Alert.alert('Error', 'Please select a Union or Upazila.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfileInfo(token, { location: locationId });
      await refreshProfile();
      Alert.alert('Saved', 'Your location has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save location';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Set Location</Text>
      </View>

      <View style={styles.preview}>
        <Ionicons name="location" size={16} color={colors.darkGreen} />
        <Text style={styles.previewText}>
          {user?.location
            ? [user.location.division, user.location.district, user.location.upazila, user.location.union]
                .filter(Boolean)
                .join(' → ')
            : 'No location selected'}
        </Text>
      </View>

      {saving ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.darkGreen} />
        </View>
      ) : (
        <CascadingLocationPicker
          onLocationSelected={(sel) => {
            const id = sel.union?.id ?? sel.upazila?.id ?? null;
            setLocationId(id);
          }}
        />
      )}

      <View style={styles.footer}>
        <PrimaryButton
          title="Save Location"
          onPress={handleSave}
          loading={saving}
          variant="primary"
        />
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen, padding: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, flex: 1 },
  footer: { marginTop: Spacing.md },
});