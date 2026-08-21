import React from 'react';
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

import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/contexts/ThemeContext';
import { User } from '@/services/api';

export default function CartScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeItem, clear } = useCart();

  const total = items.reduce(
    (sum, item) => sum + item.quantityKg * parseFloat(item.post.price_per_kg),
    0,
  );

  // Build the delivery address from the customer's profile location + lane.
  const buildDeliveryAddress = (profile: User): string => {
    const loc = profile.location;
    const parts = [
      loc?.division,
      loc?.district,
      loc?.upazila,
      loc?.union,
      loc?.level === 'ward' ? loc.name_en : null,
      profile.address?.trim(),
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handlePlaceOrder = () => {
    if (items.length === 0) return;
    if (!user) return;
    const deliveryAddress = buildDeliveryAddress(user);
    if (!deliveryAddress) {
      Alert.alert(
        'Delivery address missing',
        'Please set your area (location) and lane in your profile before ordering.',
        [
          { text: 'Update Profile', onPress: () => router.push('/(customer)/account') },
          { text: 'OK', style: 'cancel' },
        ],
      );
      return;
    }
    router.push({
      pathname: '/(customer)/payment',
      params: { address: deliveryAddress },
    });
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
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeItem(item.post.id)}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>{item.post.title}</Text>
                  <Text style={styles.farmer}>
                    {item.post.farmer_name || item.post.farmer_username}
                  </Text>
                  <Text style={styles.detail}>
                    {item.quantityKg} {item.post.quantity_type === 'piece' ? 'pieces' : 'kg'} @ ৳{' '}
                    {parseFloat(item.post.price_per_kg).toFixed(0)}/{item.post.quantity_type === 'piece' ? 'piece' : 'kg'}
                  </Text>
                  <Text style={styles.lineTotal}>৳ {lineTotal.toFixed(0)}</Text>
                </View>
              );
            })}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Cart Total</Text>
              <Text style={styles.totalValue}>৳ {total.toFixed(0)}</Text>
            </View>
            <PrimaryButton
              title="Place Order"
              onPress={handlePlaceOrder}
              style={styles.checkoutBtn}
            />
            <PrimaryButton title="Clear Cart" onPress={clear} variant="secondary" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    position: 'relative',
  },
  title: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.darkGreen },
  farmer: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  detail: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, marginTop: Spacing.sm },
  lineTotal: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen, marginTop: Spacing.xs },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  removeBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.darkGreen,
    lineHeight: 20,
  },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  totalLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
  totalValue: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen },
  checkoutBtn: { marginBottom: Spacing.md },
});
