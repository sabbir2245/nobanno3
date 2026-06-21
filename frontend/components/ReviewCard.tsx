import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Props {
  review: Review;
}

export function ReviewCard({ review }: Props) {
  const fullStars = Math.floor(review.rating);
  const hasHalf = review.rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const dateStr = new Date(review.created_at).toLocaleDateString('en-BD', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(review.customer_username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{review.customer_username}</Text>
          <View style={styles.starRow}>
            {Array.from({ length: fullStars }).map((_, i) => (
              <Ionicons key={`f-${i}`} name="star" size={12} color={Colors.starGold} />
            ))}
            {hasHalf && <Ionicons name="star-half" size={12} color={Colors.starGold} />}
            {Array.from({ length: emptyStars }).map((_, i) => (
              <Ionicons key={`e-${i}`} name="star-outline" size={12} color={Colors.starGold} />
            ))}
          </View>
        </View>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}

      {review.images && review.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {review.images.map((img) => {
            const source = img.image || img.image_url;
            if (!source) return null;
            return (
              <Image key={img.id} source={{ uri: source }} style={styles.thumb} />
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mediumGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textDark,
  },
  starRow: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },
  date: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  comment: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  imageRow: {
    marginTop: Spacing.sm,
    marginLeft: -Spacing.sm,
    marginRight: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
    backgroundColor: Colors.lightGreen,
  },
});
