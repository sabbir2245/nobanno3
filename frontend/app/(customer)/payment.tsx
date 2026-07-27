import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, ApiError } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function PaymentScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { token, refreshProfile } = useAuth();
  const { items, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [sslLoading, setSslLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    transaction_id: string;
    gateway_url: string;
  } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = items.reduce(
    (sum, item) => sum + item.quantityKg * parseFloat(item.post.price_per_kg),
    0,
  );

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const placeOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const bulkItems = items.map((item) => ({
        post: item.post.id,
        quantity_kg: item.quantityKg.toFixed(2),
      }));
      await api.createBulkOrders(token, bulkItems, address);
      clear();
      await refreshProfile();
      Alert.alert('Order placed', 'Your order has been placed successfully.', [
        { text: 'View Orders', onPress: () => router.replace('/(customer)/orders') },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Order failed';
      Alert.alert('Order failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const payViaSSLCommerz = async () => {
    if (!token) return;
    setSslLoading(true);
    try {
      const result = await api.initiatePayment(token, total);
      setPaymentResult({
        transaction_id: result.transaction_id,
        gateway_url: result.gateway_url,
      });

      const supported = await Linking.canOpenURL(result.gateway_url);
      if (supported) {
        await Linking.openURL(result.gateway_url);
        startPolling(result.transaction_id);
      } else {
        Alert.alert('Error', 'Cannot open payment gateway.');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Payment initiation failed';
      Alert.alert('Payment failed', msg);
    } finally {
      setSslLoading(false);
    }
  };

  const startPolling = (transactionId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const status = await api.getPaymentStatus(token, transactionId);
        if (status.status === 'success') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          Alert.alert('Payment received', 'Your payment was successful. Placing your order now.');
          await placeOrders();
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          Alert.alert('Payment failed', 'The payment was not completed. Please try again.');
          setPaymentResult(null);
        }
      } catch {
        // poll again
      }
    }, 3000);
  };

  const checkPaymentManually = async () => {
    if (!token || !paymentResult) return;
    setSslLoading(true);
    try {
      const status = await api.getPaymentStatus(token, paymentResult.transaction_id);
      if (status.status === 'success') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        Alert.alert('Payment received', 'Your payment was successful. Placing your order now.');
        await placeOrders();
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        Alert.alert('Payment not completed', 'Please try paying again.');
        setPaymentResult(null);
      } else {
        Alert.alert('Pending', 'The payment is still being processed. Please wait or check again later.');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Status check failed';
      Alert.alert('Error', msg);
    } finally {
      setSslLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Checkout" subtitle="Nobanno" />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <PrimaryButton
            title="Go to Home"
            onPress={() => router.replace('/(customer)/home')}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Checkout" subtitle="Nobanno" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.addressText}>{address}</Text>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
          Order Summary
        </Text>
        {items.map((item) => {
          const lineTotal = item.quantityKg * parseFloat(item.post.price_per_kg);
          return (
            <View key={item.post.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.post.title}</Text>
                  <Text style={styles.cardFarmer}>
                    {item.post.farmer_name || item.post.farmer_username}
                  </Text>
                  <Text style={styles.cardDetail}>
                    {item.quantityKg} kg × ৳{parseFloat(item.post.price_per_kg).toFixed(0)}/kg
                  </Text>
                </View>
                <Text style={styles.cardTotal}>৳{lineTotal.toFixed(0)}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>৳{total.toFixed(0)}</Text>
        </View>

        <View style={styles.paymentOptions}>
          <Text style={styles.paymentOptionsTitle}>Payment</Text>

          {!paymentResult ? (
            <PrimaryButton
              title="Pay via SSLCommerz"
              onPress={payViaSSLCommerz}
              loading={sslLoading}
              variant="sage"
              style={styles.payBtn}
            />
          ) : (
            <>
              <Text style={styles.paymentPendingText}>
                Payment page opened in your browser.{'\n'}
                Complete the payment there, then return here.
              </Text>
              <PrimaryButton
                title="I've Completed Payment — Check Status"
                onPress={checkPaymentManually}
                loading={sslLoading}
                variant="sage"
                style={styles.payBtn}
              />
              <PrimaryButton
                title="Pay Again (New Session)"
                onPress={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setPaymentResult(null);
                }}
                variant="secondary"
                style={styles.payBtn}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  addressText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.darkGreen },
  cardFarmer: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardDetail: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, marginTop: Spacing.xs },
  cardTotal: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.darkGreen, marginLeft: Spacing.md },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  totalLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
  totalValue: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.darkGreen },
  paymentOptions: { marginTop: Spacing.lg },
  paymentOptionsTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  payBtn: { marginBottom: Spacing.md },
  paymentPendingText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
});
