import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { OrderCard } from '@/components/OrderCard';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function FarmerOrdersScreen() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [shippingId, setShippingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api.getOrders(token);
    setOrders(data);
  }, [token]);

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

  const variantFor = (status: Order['status']) => {
    if (status === 'pending') return 'paid' as const;
    if (status === 'shipped') return 'shipped' as const;
    return 'completed' as const;
  };

  return (
      <View style={styles.container}>
        <ScreenHeader 
          title={t('অর্ডারসমূহ')} 
          subtitle={t('নবান্ন ফার্মার হাব')} 
        />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.length === 0 ? (
            <Text style={styles.empty}>{t('এখনো কোনো অর্ডার পাওয়া যায়নি।')}</Text>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                variant={variantFor(order.status)}
                actionLabel={
                  order.status === 'pending' ? t('পাঠানো হয়েছে চিহ্নিত করুন') : undefined
                }
                onAction={
                  order.status === 'pending'
                    ? () => shipOrder(order.id)
                    : undefined
                }
                actionLoading={shippingId === order.id}
              />
            ))
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
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});