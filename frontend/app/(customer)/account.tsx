import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReviewFormModal } from '@/components/ReviewFormModal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { globalstyles } from '@/styles/global';

export default function CustomerAccountScreen() {
  const router = useRouter();
  const { token, user, logout, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ postId: number; postTitle: string } | null>(null);
  const [reviewedPostIds, setReviewedPostIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!token || !user) return;
    await refreshProfile();
    const [orderData, reviewData] = await Promise.all([
      api.getOrders(token),
      api.getReviewsByCustomer(token, user.id),
    ]);
    setOrders(orderData);
    setReviewedPostIds(new Set(reviewData.map((r) => r.post)));
  }, [token, refreshProfile, user]);

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

  const completeOrder = async (orderId: number) => {
    if (!token) return;
    try {
      await api.completeOrder(token, orderId);
      await load();
      Alert.alert('Delivery confirmed', 'Order marked as completed.');
    } catch {
      Alert.alert('Error', 'Could not complete order.');
    }
  };

  const completedOrderFarmerIds = useMemo(() => {
    const ids = new Set<number>();
    orders.forEach((o) => {
      if (o.status === 'completed' && o.post_farmer_id) ids.add(o.post_farmer_id);
    });
    return ids;
  }, [orders]);

  return (
    <View style={globalstyles.container}>
      <ScreenHeader title="My Account" subtitle="Nobanno" />
      <ScrollView
        contentContainerStyle={globalstyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={globalstyles.profileCard}>
          <View style={globalstyles.avatar}>
            <Text style={globalstyles.avatarText}>
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={globalstyles.profileInfo}>
            <Text style={globalstyles.name}>{user?.name || user?.username}</Text>
            <Text style={globalstyles.phone}>
              {user?.phone_number || 'No phone set'}
            </Text>
            <Text style={globalstyles.address}>
              {user?.address || 'No address set'}
            </Text>
          </View>
        </View>

        <View style={globalstyles.walletCard}>
          <Text style={globalstyles.walletLabel}>Current Wallet Balance</Text>
          <Text style={globalstyles.walletValue}>
            ৳ {parseFloat(user?.balance ?? '0').toFixed(2)}
          </Text>
        </View>

        <Text style={globalstyles.sectionTitle}>Previous Purchases (Invoices)</Text>
        {orders.length === 0 ? (
          <Text style={globalstyles.empty}>No orders yet.</Text>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={globalstyles.invoiceCard}>
              <View style={globalstyles.invoiceHeader}>
                <Text style={globalstyles.invoiceTitle}>Order #{order.id}</Text>
                <View
                  style={[
                    globalstyles.statusBadge,
                    order.status === 'completed' && globalstyles.statusDone,
                    order.status === 'shipped' && globalstyles.statusShipped,
                  ]}
                >
                  <Text style={globalstyles.statusText}>{order.status}</Text>
                </View>
              </View>
              <Text style={globalstyles.invoiceProduct}>{order.post_title}</Text>
              <Text style={globalstyles.invoiceDetail}>
                {parseFloat(order.quantity_kg).toFixed(0)} kg · ৳{' '}
                {parseFloat(order.total_paid).toFixed(0)}
              </Text>
              <Text style={globalstyles.invoiceFarmer}>
                Farmer: {order.post_farmer_name}
              </Text>
              {order.status === 'shipped' && (
                <PrimaryButton
                  title="Confirm Delivery"
                  onPress={() => completeOrder(order.id)}
                  variant="sage"
                  style={{ marginTop: Spacing.sm }}
                />
              )}
              {order.status === 'completed' && reviewedPostIds.has(order.post) ? (
                <View style={globalstyles.reviewDoneBadge}>
                  <Text style={globalstyles.reviewDoneText}>Review Done</Text>
                </View>
              ) : order.status === 'completed' ? (
                <PrimaryButton
                  title="Write a Review"
                  onPress={() =>
                    setReviewTarget({
                      postId: order.post,
                      postTitle: order.post_title,
                    })
                  }
                  variant="primary"
                  style={{ marginTop: Spacing.sm }}
                />
              ) : null}
            </View>
          ))
        )}

        <PrimaryButton
          title="Edit Profile"
          onPress={() => router.push('/auth/update-profile')}
          variant="sage"
          style={{ marginTop: Spacing.md }}
        />

        <PrimaryButton
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>

      {reviewTarget && (
        <ReviewFormModal
          visible
          postId={reviewTarget.postId}
          postTitle={reviewTarget.postTitle}
          onClose={() => setReviewTarget(null)}
          onSuccess={load}
        />
      )}
    </View>
  );
}

/*

const globalstyles = globalstylesheet.create({
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
    marginBottom: Spacing.md,
    gap: Spacing.md,
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
  profileInfo: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.textDark,
  },
  phone: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  address: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textDark,
  },
  statusBadge: {
    backgroundColor: Colors.paleYellow,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusDone: {
    backgroundColor: Colors.paleGreen,
  },
  statusShipped: {
    backgroundColor: Colors.lightOrange,
  },
  statusText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  invoiceProduct: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    marginTop: Spacing.xs,
  },
  invoiceDetail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
*/