import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  order: Order;
  variant: 'paid' | 'shipped' | 'completed';
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
}

const headerStyles = {
  paid: { bg: Colors.paleYellow, text: Colors.textDark },
  shipped: { bg: Colors.lightOrange, text: Colors.textDark },
  completed: { bg: Colors.darkGreen, text: Colors.white },
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
    variant === 'paid'
      ? 'গ্রাহকের অর্ডার — পরিশোধিত'
      : variant === 'shipped'
        ? 'অর্ডার প্রেরিত — ডেলিভারি নিশ্চিতকরণ অপেক্ষিত'
        : 'অর্ডার ডেলিভারি সম্পন্ন';

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
          {order.status === 'pending' ? 'অপেক্ষমান' : order.status === 'shipped' ? 'প্রেরিত' : order.status === 'completed' ? 'সম্পন্ন' : 'বাতিল'}।
        </Text>
        {variant === 'shipped' && (
          <Text style={styles.subDetail}>
            গ্রাহকের নিশ্চিতকরণ অপেক্ষিত। ফারমার রেটিং অপেক্ষমান।
          </Text>
        )}
        {variant === 'completed' && (
          <Text style={styles.subDetail}>
            গ্রাহক ডেলিভারি নিশ্চিত করেছেন। পেমেন্ট ওয়ালেটে জমা হয়েছে।
          </Text>
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
  actionBtn: {
    marginTop: Spacing.md,
  },
});
