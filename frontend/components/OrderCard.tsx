import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  order: Order;
  variant: 'pending' | 'completed' | 'cancelled';
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
}

const headerStyles = {
  pending: { bg: Colors.paleYellow, text: Colors.textDark },
  completed: { bg: Colors.darkGreen, text: Colors.white },
  cancelled: { bg: '#f0d0d0', text: Colors.textDark },
};

export function OrderCard({
  order,
  variant,
  onAction,
  actionLabel,
  actionLoading,
}: Props) {
  const header = headerStyles[variant];
  const qty = parseFloat(order.quantity_kg);
  const pricePerKg = qty > 0 ? parseFloat(order.total_paid) / qty : 0;

  const headerTitle =
    variant === 'pending'
      ? 'গ্রাহকের অর্ডার — পরিশোধিত'
      : variant === 'completed'
        ? 'অর্ডার ডেলিভারি সম্পন্ন'
        : 'অর্ডার বাতিল';

  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: header.bg }]}>
        <Text style={[styles.headerText, { color: header.text }]}>{headerTitle}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.customer}>গ্রাহক: {order.customer_name || order.customer_username}</Text>
        <Text style={styles.product}>{order.post_title}</Text>
        <Text style={styles.detail}>
          {qty.toFixed(0)} কেজি @ ৳ {pricePerKg.toFixed(0)}/কেজি = ৳{' '}
          {parseFloat(order.total_paid).toFixed(0)}।{' '}
          {order.status === 'pending'
            ? 'অপেক্ষমান'
            : order.status === 'completed'
              ? 'সম্পন্ন'
              : 'বাতিল'}।
        </Text>
        {variant === 'completed' && (
          <Text style={styles.subDetail}>
            গ্রাহক ডেলিভারি নিশ্চিত করেছেন। পেমেন্ট ওয়ালেটে জমা হয়েছে।
          </Text>
        )}
        {(order.post_location || order.post_collection_point_address) && (
          <View style={styles.pickRow}>
            <Ionicons name="flag-outline" size={14} color={Colors.darkGreen} />
            <Text style={styles.pickText}>
              {order.post_collection_point_address
                ? `উঠানোর স্থান: ${order.post_collection_point_address}`
                : ''}
              {order.post_collection_point_address && order.post_location ? ' · ' : ''}
              {order.post_location
                ? [order.post_location.district, order.post_location.upazila, order.post_location.union]
                    .filter(Boolean)
                    .join(', ')
                : ''}
            </Text>
          </View>
        )}
        {onAction && actionLabel && (
          <PrimaryButton
            title={actionLabel}
            onPress={onAction}
            loading={actionLoading}
            style={styles.actionBtn}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  header: {
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  body: {
    padding: Spacing.md,
  },
  customer: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textDark,
  },
  product: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    marginTop: 2,
  },
  detail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  subDetail: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  pickText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.darkGreen,
    flex: 1,
  },
  actionBtn: {
    marginTop: Spacing.md,
  },
});