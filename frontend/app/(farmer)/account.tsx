import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function FarmerAccountScreen() {

  const { t } = useTranslation();
  const router = useRouter();
  const { token, user, logout, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState({
    balance: '0',
    pending_payouts: '0',
    total_earnings: '0',
    total_commission_deductions: '0',
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    await refreshProfile();
    const data = await api.getFarmerWallet(token);
    setWallet(data);
  }, [token, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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
            <Text style={styles.avatarText}>
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </Text>
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

        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>ওয়ালেট ব্যালেন্স</Text>
          <Text style={styles.walletValue}>
            ৳ {parseFloat(wallet.balance).toFixed(2)}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>বাকি পাওনা (পেন্ডিং)</Text>
            <Text style={styles.statValue}>
              ৳ {parseFloat(wallet.pending_payouts).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>মোট উপার্জন</Text>
            <Text style={styles.statValue}>
              ৳ {parseFloat(wallet.total_earnings).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>কমিশন দেওয়া হয়েছে</Text>
            <Text style={styles.statValue}>
              ৳ {parseFloat(wallet.total_commission_deductions).toFixed(0)}
            </Text>
          </View>
        </View>

        <PrimaryButton
          title={t("লগআউট")}
          onPress={handleLogout}
          variant="secondary"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.white,
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
  walletCard: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  walletLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.lightGreen,
  },
  walletValue: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    gap: Spacing.sm,
  },
  statItem: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  statValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.darkGreen,
    marginTop: 2,
  },
});
