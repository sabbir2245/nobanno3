import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, ApiError } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const { token, user, refreshProfile } = useAuth();
  const { items, removeItem, clear } = useCart();
  const [loading, setLoading] = useState<number | null>(null);

  const total = items.reduce(
    (sum, item) => sum + item.quantityKg * parseFloat(item.post.price_per_kg),
    0,
  );

  const placeOrder = async (postId: number, qty: number, title: string) => {
    if (!token || !user) return;
    setLoading(postId);
    try {
      await api.createOrder(token, {
        post: postId,
        quantity_kg: qty.toFixed(2),
        delivery_address: user.address || 'Delivery address not set',
      });
      removeItem(postId);
      await refreshProfile();
      Alert.alert('Order placed', `${title} — ${qty} kg ordered successfully.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Order failed';
      Alert.alert('Order failed', msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cart" subtitle="Nobanno" />
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Browse listings on Home and add bulk orders here.
            </Text>
            <PrimaryButton
              title="Browse Listings"
              onPress={() => router.push('/(customer)/home')}
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        ) : (
          <>
            {items.map((item) => {
              const lineTotal =
                item.quantityKg * parseFloat(item.post.price_per_kg);
              return (
                <View key={item.post.id} style={styles.card}>
                  <Text style={styles.title}>{item.post.title}</Text>
                  <Text style={styles.farmer}>
                    {item.post.farmer_name || item.post.farmer_username}
                  </Text>
                  <Text style={styles.detail}>
                    {item.quantityKg} kg @ ৳{' '}
                    {parseFloat(item.post.price_per_kg).toFixed(0)}/kg
                  </Text>
                  <Text style={styles.lineTotal}>
                    ৳ {lineTotal.toFixed(0)}
                  </Text>
                  <View style={styles.actions}>
                    <PrimaryButton
                      title="Place Order"
                      onPress={() =>
                        placeOrder(item.post.id, item.quantityKg, item.post.title)
                      }
                      loading={loading === item.post.id}
                      style={styles.orderBtn}
                    />
                    <TouchableOpacity onPress={() => removeItem(item.post.id)}>
                      <Text style={styles.remove}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Cart Total</Text>
              <Text style={styles.totalValue}>৳ {total.toFixed(0)}</Text>
            </View>
            <PrimaryButton title="Clear Cart" onPress={clear} variant="secondary" />
          </>
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
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.textDark,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.darkGreen,
  },
  farmer: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  detail: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    marginTop: Spacing.sm,
  },
  lineTotal: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.darkGreen,
    marginTop: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  orderBtn: {
    width: '100%',
  },
  remove: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
  },
  totalValue: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.darkGreen,
  },
});
