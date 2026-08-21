import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReviewFormModal } from '@/components/ReviewFormModal';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

type SortMode = 'date' | 'status';

export default function CustomerOrdersScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [dateAsc, setDateAsc] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ postId: number; postTitle: string } | null>(null);
  const [reviewedPostIds, setReviewedPostIds] = useState<Set<number>>(new Set());
  const [trxInput, setTrxInput] = useState<Record<string, string>>({});
  const [senderInput, setSenderInput] = useState<Record<string, string>>({});
  const [manualBkashLoading, setManualBkashLoading] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const deleteOrder = (order: Order) => {
    if (!token) return;
    Alert.alert(
      'Delete Order',
      `Delete order #${order.id}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(order.id);
            try {
              await api.deleteOrder(token, order.id);
              await load();
            } catch (err: any) {
              Alert.alert('Delete failed', err.message || 'Could not delete the order');
            } finally {
              setDeleteLoading(null);
            }
          },
        },
      ],
    );
  };

  const submitManualBkashPayment = async (order: Order, type: 'advance' | 'final') => {
    if (!token) return;
    const trxId = (trxInput[order.id] || '').trim();
    const senderNumber = (senderInput[order.id] || '').trim();
    if (!trxId) {
      Alert.alert('TrxID required', 'Enter the bKash transaction ID after sending the money.');
      return;
    }
    if (!senderNumber) {
      Alert.alert('Sender number required', 'Enter the bKash number you sent money from.');
      return;
    }
    setManualBkashLoading(order.id);
    try {
      await api.submitManualBkash(token, order.id, type, trxId, senderNumber);
      Alert.alert('Payment submitted',
        'Your payment has been submitted for admin verification. You will be notified once it is approved.');
      setTrxInput((prev) => ({ ...prev, [order.id]: '' }));
      setSenderInput((prev) => ({ ...prev, [order.id]: '' }));
      await load();
    } catch (err: any) {
      Alert.alert('Submission failed', err.message || 'Could not submit the payment');
    } finally {
      setManualBkashLoading(null);
    }
  };

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

  useEffect(() => {
    if (!token || !user) return;
    const id = setInterval(() => { load(); }, 5000);
    return () => clearInterval(id);
  }, [token, user, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sorted = [...orders].sort((a, b) => {
    if (sortMode === 'status') {
      const statusOrder: Record<string, number> = { pending: 0, approved: 1, completed: 2, cancelled: 3 };
      return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    }
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return dateAsc ? -diff : diff;
  });

  const renderOrder = (order: Order) => {
    const items = order.items || [];
    const isMulti = items.length > 1;
    const allAdvancePaid = order.advance_paid;
    const allFinalPaid = order.final_paid;
    const allReviewed = items.every((i) => reviewedPostIds.has(i.post));
    const anyPending = order.status === 'pending' || order.status === 'approved';
    const needsAdvance = anyPending && !allAdvancePaid;
    const needsFinal = anyPending && allAdvancePaid && !allFinalPaid;

    const statusColors: Record<string, string> = {
      pending: colors.paleYellow,
      approved: colors.lightOrange,
      completed: colors.paleGreen,
      cancelled: '#f0d0d0',
    };

    return (
      <View key={order.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
            {!anyPending && allReviewed && items.length === 1 && (
              <TouchableOpacity
                onPress={() => deleteOrder(order)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteIconBtn}
              >
                <Ionicons name="close" size={18} color={colors.red} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isMulti ? items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.productTitle} numberOfLines={1}>{item.post_title}</Text>
            <Text style={styles.itemDetail}>
              {parseFloat(item.quantity_kg).toFixed(0)} {item.quantity_type === 'piece' ? 'pcs' : 'kg'} · ৳{parseFloat(item.subtotal).toFixed(0)}
            </Text>
          </View>
        )) : items.length === 1 ? (
          <>
            <Text style={styles.productTitle}>{items[0].post_title}</Text>
            <Text style={styles.detail}>
              {parseFloat(items[0].quantity_kg).toFixed(0)} {items[0].quantity_type === 'piece' ? 'pieces' : 'kg'} · ৳ {parseFloat(items[0].subtotal).toFixed(0)}
            </Text>
          </>
        ) : null}

        {items.length > 0 && (
          <Text style={styles.farmer}>Farmer: {items.map((i) => i.farmer_name).filter(Boolean).join(', ')}</Text>
        )}

        {items.length > 1 && (
          <Text style={styles.detail}>Total: ৳{parseFloat(order.total_paid).toFixed(0)}</Text>
        )}
        <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString('en-GB')}</Text>

        {needsAdvance && (
          <View style={styles.escrowBox}>
            <Text style={styles.escrowTitle}>
              Pay Advance (50%) — ৳{parseFloat(order.advance_amount ?? '0').toFixed(0)}
            </Text>
            <Text style={styles.escrowHint}>
              Send the amount to the bKash number shown at checkout, then enter your bKash number and TrxID below.
            </Text>
            <TextInput
              style={styles.trxInput}
              value={senderInput[order.id] ?? ''}
              onChangeText={(t) => setSenderInput((prev) => ({ ...prev, [order.id]: t }))}
              placeholder="Your bKash number (sender)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.trxInput}
              value={trxInput[order.id] ?? ''}
              onChangeText={(t) => setTrxInput((prev) => ({ ...prev, [order.id]: t }))}
              placeholder="bKash TrxID (e.g. 9A8B7C6D)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <PrimaryButton
              title="Submit for Admin Verification"
              onPress={() => submitManualBkashPayment(order, 'advance')}
              loading={manualBkashLoading === order.id}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}

        {needsFinal && (
          <View style={styles.escrowBox}>
            <Text style={styles.escrowTitle}>
              Complete payment (Final 50%) — ৳{parseFloat(order.final_amount ?? '0').toFixed(0)}
            </Text>
            <Text style={styles.escrowHint}>
              Send the amount to the bKash number shown at checkout, then enter your bKash number and TrxID below.
            </Text>
            <TextInput
              style={styles.trxInput}
              value={senderInput[order.id] ?? ''}
              onChangeText={(t) => setSenderInput((prev) => ({ ...prev, [order.id]: t }))}
              placeholder="Your bKash number (sender)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.trxInput}
              value={trxInput[order.id] ?? ''}
              onChangeText={(t) => setTrxInput((prev) => ({ ...prev, [order.id]: t }))}
              placeholder="bKash TrxID"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <PrimaryButton
              title="Submit for Admin Verification"
              onPress={() => submitManualBkashPayment(order, 'final')}
              loading={manualBkashLoading === order.id}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}

        {!needsAdvance && !needsFinal && allFinalPaid && (
          <View style={styles.reviewDone}>
            <Text style={styles.reviewDoneText}>Payment complete</Text>
          </View>
        )}

        <View style={styles.actions}>
          {order.status === 'completed' && !allReviewed && (
            <View>
              <Text style={styles.reviewSectionTitle}>Reviews</Text>
              {items.map((i) => (
                <TouchableOpacity
                  key={`rev-${i.id}`}
                  style={[styles.reviewItem, reviewedPostIds.has(i.post) && styles.reviewItemDone]}
                  onPress={() => {
                    if (!reviewedPostIds.has(i.post)) {
                      setReviewTarget({ postId: i.post, postTitle: i.post_title });
                    }
                  }}
                  disabled={reviewedPostIds.has(i.post)}
                >
                  <Text style={[styles.reviewItemText, reviewedPostIds.has(i.post) && styles.reviewItemTextDone]} numberOfLines={1}>
                    {i.post_title}
                  </Text>
                  <Text style={[styles.reviewItemAction, reviewedPostIds.has(i.post) && styles.reviewItemActionDone]}>
                    {reviewedPostIds.has(i.post) ? '✓ Done' : 'Write a Review'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {order.status === 'completed' && allReviewed && (
            <View style={styles.reviewDone}><Text style={styles.reviewDoneText}>All reviews done</Text></View>
          )}
        </View>
      </View>
    );
  };

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
            color={sortMode === 'date' ? colors.white : colors.darkGreen} />
          <Text style={[styles.sortText, sortMode === 'date' && styles.sortTextActive]}>
            Date {dateAsc ? '\u2191' : '\u2193'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'status' && styles.sortChipActive]}
          onPress={() => setSortMode('status')}
        >
          <Ionicons name="funnel" size={14}
            color={sortMode === 'status' ? colors.white : colors.darkGreen} />
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
          sorted.map((o) => renderOrder(o))
        )}
      </ScrollView>
      {reviewTarget && (
        <ReviewFormModal visible postId={reviewTarget.postId} postTitle={reviewTarget.postTitle}
          onClose={() => setReviewTarget(null)} onSuccess={load} />
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  sortBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.lightGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  sortChipActive: { backgroundColor: Colors.darkGreen },
  sortText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.darkGreen },
  sortTextActive: { color: Colors.textOnPrimary },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteIconBtn: {
    width: 24, height: 24, borderRadius: Radius.full,
    backgroundColor: Colors.paleGreen, alignItems: 'center', justifyContent: 'center',
  },
  orderId: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textDark, textTransform: 'capitalize' },
  productTitle: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, marginTop: Spacing.xs },
  detail: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  farmer: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemRow: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemDetail: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  date: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.xs, backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm, padding: Spacing.sm,
  },
  pickText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.darkGreen, flex: 1 },
  escrowBox: {
    marginTop: Spacing.sm, backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md, padding: Spacing.sm,
  },
  escrowTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark },
  escrowHint: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.xs },
  trxInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, fontFamily: Fonts.regular, fontSize: 14,
    color: Colors.textDark, marginBottom: Spacing.sm,
  },
  actions: { marginTop: Spacing.sm },
  actionBtn: { width: '100%' },
  reviewSectionTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark, marginBottom: Spacing.xs },
  reviewItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.paleGreen, borderRadius: Radius.sm, marginBottom: 4,
  },
  reviewItemDone: { backgroundColor: Colors.cream || '#f0f0f0', opacity: 0.6 },
  reviewItemText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, flex: 1, marginRight: Spacing.sm },
  reviewItemTextDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  reviewItemAction: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.darkGreen },
  reviewItemActionDone: { color: Colors.textMuted },
  reviewDone: { backgroundColor: Colors.paleGreen, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start' },
  reviewDoneText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.darkGreen },
});
