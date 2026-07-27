import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, removeItem, clear } = useCart();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState(user?.address || '');

  const total = items.reduce(
    (sum, item) => sum + item.quantityKg * parseFloat(item.post.price_per_kg),
    0,
  );

  const handlePlaceOrder = () => {
    if (items.length === 0) return;
    setAddress(user?.address || '');
    setShowAddressModal(true);
  };

  const proceedToPayment = () => {
    if (!user) return;
    if (!address.trim()) {
      Alert.alert('Address required', 'Please enter a delivery address.');
      return;
    }
    setShowAddressModal(false);
    router.push({ pathname: '/(customer)/payment', params: { address: address.trim() } });
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
                  <Text style={styles.lineTotal}>৳ {lineTotal.toFixed(0)}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.post.id)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
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

      <Modal visible={showAddressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Address</Text>
            <TextInput
              style={styles.addressInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your delivery address"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setShowAddressModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Proceed to Payment"
                onPress={proceedToPayment}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={styles.paymentNote}>
              Payment auto-approved for demo.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  title: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.darkGreen },
  farmer: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  detail: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, marginTop: Spacing.sm },
  lineTotal: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen, marginTop: Spacing.xs },
  remove: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline', marginTop: Spacing.sm },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  totalLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
  totalValue: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen },
  checkoutBtn: { marginBottom: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  modalContent: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', maxWidth: 400 },
  modalTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark, marginBottom: Spacing.md },
  addressInput: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, backgroundColor: Colors.paleGreen, borderRadius: Radius.md, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  paymentNote: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, fontStyle: 'italic' },
});
