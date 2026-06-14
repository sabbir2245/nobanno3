import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order, Post } from '@/services/api';
import { OrderCard } from '@/components/OrderCard';
import { ProductCard } from '@/components/ProductCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function FarmerDashboardScreen() {
  const router = useRouter();
  const { token, user, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [wallet, setWallet] = useState<string>('0');
  const [refreshing, setRefreshing] = useState(false);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const { t } = useTranslation();

  
  const load = useCallback(async () => {
    if (!token) return;
    await refreshProfile();
    const [orderData, walletData, postsData] = await Promise.all([
      api.getOrders(token),
      api.getFarmerWallet(token),
      user?.id ? api.getPosts(token, { farmer_id: user.id }) : Promise.resolve([]),
    ]);
    setOrders(orderData);
    setWallet(walletData.balance);
    setMyPosts(postsData);
  }, [token, user?.id, refreshProfile]);

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

  const shipOrder = async (orderId: number) => {
    if (!token) return;
    setShippingId(orderId);
    try {
      await api.shipOrder(token, orderId);
      await load();
    } finally {
      setShippingId(null);
    }
  };

  const pending = orders.filter((o) => o.status === 'pending');
  const shipped = orders.filter((o) => o.status === 'shipped');
  const completed = orders.filter((o) => o.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Nobanno</Text>
          <Text style={styles.hub}>Farmer Hub</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(farmer)/account')}
        >
          <Ionicons name="person" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitial}>
            {(user?.name || user?.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || user?.username}</Text>
          <Text style={styles.profileAddress}>
            {user?.address || 'Address not set'}
          </Text>
          <Text style={styles.profilePhone}>
            {user?.phone_number || 'Phone not set'} — {user?.name || user?.username}
          </Text>
        </View>
      </View>

      <View style={styles.walletStrip}>
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.walletValue}>৳ {parseFloat(wallet).toFixed(0)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Your Orders & Tasks</Text>

        {pending.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            variant="paid"
            actionLabel="Mark as Shipped"
            onAction={() => shipOrder(order.id)}
            actionLoading={shippingId === order.id}
          />
        ))}

        {shipped.map((order) => (
          <OrderCard key={order.id} order={order} variant="shipped" />
        ))}

        {completed.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            variant="completed"
            actionLabel="Release Payout (90% to wallet)"
          />
        ))}

        {orders.length === 0 && (
          <Text style={styles.empty}>No orders yet.</Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>My Posts</Text>
        {myPosts.map((post) => (
          <ProductCard
            key={post.id}
            post={post}
            onPress={() => router.push(`/(farmer)/edit-post/${post.id}`)}
          />
        ))}
        {myPosts.length === 0 && (
          <Text style={styles.empty}>No posts yet. Create a listing to get started.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paleGreen,
  },
  header: {
    backgroundColor: Colors.headerGreen,
    paddingTop: 48,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.lightGreen,
  },
  hub: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.white,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mediumGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    backgroundColor: Colors.cream,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mediumGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textDark,
  },
  profileAddress: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profilePhone: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  walletStrip: {
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  walletLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.lightGreen,
  },
  walletValue: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.white,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
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
    textAlign: 'center',
    marginTop: 40,
  },
});
