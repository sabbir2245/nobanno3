import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReviewFormModal } from '@/components/ReviewFormModal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type SortMode = 'date' | 'status';

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [dateAsc, setDateAsc] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ postId: number; postTitle: string } | null>(null);
  const [reviewedPostIds, setReviewedPostIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!token || !user) return;
    const [orderData, reviewData] = await Promise.all([
      api.getOrders(token),
      api.getReviewsByCustomer(token, user.id),
    ]);
    setOrders(orderData);
    setReviewedPostIds(new Set(reviewData.map((r) => r.post)));
  }, [token, user]);

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

  const sorted = [...orders].sort((a, b) => {
    if (sortMode === 'status') {
      const statusOrder = { pending: 0, shipped: 1, completed: 2, cancelled: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return dateAsc ? -diff : diff;
  });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Orders" subtitle="Nobanno" />
      <View style={styles.sortBar}>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'date' && styles.sortChipActive]}
          onPress={() => {
            if (sortMode === 'date') setDateAsc(!dateAsc);
            else setSortMode('date');
          }}
        >
          <Ionicons name={dateAsc ? 'arrow-up' : 'arrow-down'} size={14}
            color={sortMode === 'date' ? Colors.white : Colors.darkGreen} />
          <Text style={[styles.sortText, sortMode === 'date' && styles.sortTextActive]}>
            Date {dateAsc ? '\u2191' : '\u2193'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'status' && styles.sortChipActive]}
          onPress={() => setSortMode('status')}
        >
          <Ionicons name="funnel" size={14}
            color={sortMode === 'status' ? Colors.white : Colors.darkGreen} />
          <Text style={[styles.sortText, sortMode === 'status' && styles.sortTextActive]}>
            Status
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sorted.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No orders yet.</Text></View>
        ) : (
          sorted.map((order) => {
            const statusColors: Record<string, string> = {
              pending: Colors.paleYellow, shipped: Colors.lightOrange,
              completed: Colors.paleGreen, cancelled: '#f0d0d0',
            };
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.productTitle}>{order.post_title}</Text>
                <Text style={styles.detail}>{parseFloat(order.quantity_kg).toFixed(0)} kg · ৳ {parseFloat(order.total_paid).toFixed(0)}</Text>
                <Text style={styles.farmer}>Farmer: {order.post_farmer_name}</Text>
                <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString('en-GB')}</Text>
                <View style={styles.actions}>
                  {order.status === 'shipped' && (
                    <PrimaryButton title="Confirm Delivery" onPress={() => completeOrder(order.id)}
                      variant="sage" style={styles.actionBtn} />
                  )}
                  {order.status === 'completed' && !reviewedPostIds.has(order.post) && (
                    <PrimaryButton title="Write a Review"
                      onPress={() => setReviewTarget({ postId: order.post, postTitle: order.post_title })}
                      style={styles.actionBtn} />
                  )}
                  {order.status === 'completed' && reviewedPostIds.has(order.post) && (
                    <View style={styles.reviewDone}><Text style={styles.reviewDoneText}>Review Done</Text></View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      {reviewTarget && (
        <ReviewFormModal visible postId={reviewTarget.postId} postTitle={reviewTarget.postTitle}
          onClose={() => setReviewTarget(null)} onSuccess={load} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  sortBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.lightGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  sortChipActive: { backgroundColor: Colors.darkGreen },
  sortText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.darkGreen },
  sortTextActive: { color: Colors.white },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textDark, textTransform: 'capitalize' },
  productTitle: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, marginTop: Spacing.xs },
  detail: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  farmer: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  date: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  actions: { marginTop: Spacing.sm },
  actionBtn: { width: '100%' },
  reviewDone: { backgroundColor: Colors.paleGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start' },
  reviewDoneText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.darkGreen },
});
