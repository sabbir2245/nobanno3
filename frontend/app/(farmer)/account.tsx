import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function FarmerAccountScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const { t } = useTranslation();
  const router = useRouter();
  const { token, user, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [bkashNumber, setBkashNumber] = useState(user?.bkash_number || '');
  const [savingBkash, setSavingBkash] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    await refreshProfile();
  }, [token, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
      setBkashNumber(user?.bkash_number || '');
    }, [load, user?.bkash_number]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const saveBkashNumber = async () => {
    if (!token) return;
    if (!bkashNumber.trim()) {
      Alert.alert('Error', 'bKash number cannot be empty.');
      return;
    }
    setSavingBkash(true);
    try {
      await api.updateProfileInfo(token, { bkash_number: bkashNumber.trim() } as any);
      await refreshProfile();
      Alert.alert('Saved', 'Your bKash number has been updated.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save';
      Alert.alert('Error', msg);
    } finally {
      setSavingBkash(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("আমার অ্যাকাউন্ট")} subtitle={t("নবান্ন ফার্মার হাব")} />
      <ScrollView
        contentContainerStyle={styles.content}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(user?.name || user?.username || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.name}>{user?.name || user?.username}</Text>
            <Text style={styles.detail}>{user?.phone_number || 'কোনো ফোন নম্বর নেই'}</Text>
            <Text style={styles.detail}>{user?.address || 'কোনো ঠিকানা নেই'}</Text>
            {user?.avg_rating != null && (
              <Text style={styles.rating}>★ {user.avg_rating} গড় রেটিং</Text>
            )}
          </View>
        </View>

        <View style={styles.bkashSection}>
          <Text style={styles.bkashLabel}>bKash নম্বর</Text>
          <View style={styles.bkashRow}>
            <TextInput
              style={styles.bkashInput}
              value={bkashNumber}
              onChangeText={setBkashNumber}
              keyboardType="phone-pad"
              placeholder="01XXXXXXXXX"
              placeholderTextColor={colors.textMuted}
            />
            <PrimaryButton
              title={savingBkash ? '...' : 'Save'}
              onPress={saveBkashNumber}
              loading={savingBkash}
              variant="secondary"
              style={styles.bkashSaveBtn}
            />
          </View>
        </View>

        <PrimaryButton
          title="Edit Profile"
          onPress={() => router.push('/auth/update-profile')}
          variant="sage"
          style={{ marginTop: Spacing.md }}
        />

        <PrimaryButton
          title="Set Location"
          onPress={() => router.push('/(farmer)/set-location')}
          variant="sage"
          style={{ marginTop: Spacing.md }}
        />

        <ThemeToggle />

        <PrimaryButton
          title={t("লগআউট")}
          onPress={handleLogout}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paleGreen,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.textOnPrimary,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.textDark,
  },
  detail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rating: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.darkGreen,
    marginTop: Spacing.xs,
  },
  bkashSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bkashLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  bkashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bkashInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
  },
  bkashSaveBtn: {
    minWidth: 70,
  },
});
