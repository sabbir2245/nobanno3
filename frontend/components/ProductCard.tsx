import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Props {
  post: Post;
  onPress: () => void;
  imageTint?: string;
}

export function ProductCard({ post, onPress, imageTint = Colors.lightGreen }: Props) {
  const rating = post.farmer_avg_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.imageArea, { backgroundColor: imageTint }]}>
        {post.image ? (
          <Image 
            source={{ uri: post.image }} 
            style={StyleSheet.absoluteFill} 
            resizeMode="cover" 
          />
        ) : null}
        
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {post.distance_km != null ? `${post.distance_km} km` : 'Nearby'}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.farmer}>{post.farmer_name || post.farmer_username}</Text>
        <View style={styles.ratingRow}>
          {Array.from({ length: fullStars }).map((_, i) => (
            <Ionicons key={`full-${i}`} name="star" size={14} color={Colors.starGold} />
          ))}
          {hasHalf && <Ionicons name="star-half" size={14} color={Colors.starGold} />}
          {Array.from({ length: emptyStars }).map((_, i) => (
            <Ionicons key={`empty-${i}`} name="star-outline" size={14} color={Colors.starGold} />
          ))}
          <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : ''}</Text>
        </View>
        <Text style={styles.price}>
          ৳ {parseFloat(post.price_per_kg).toFixed(0)} / kg
        </Text>
        <Text style={styles.minOrder}>Min. 10 kg order</Text>
        <View style={styles.stockBadge}>
          <Text style={styles.stockText}>
            {parseFloat(post.total_weight_kg).toFixed(0)} kg left
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  imageArea: {
    height: 140,
    position: 'relative',
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  distanceText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.white,
  },
  body: {
    padding: Spacing.md,
    position: 'relative',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.darkGreen,
    marginBottom: 2,
  },
  farmer: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  ratingText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  price: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.darkGreen,
  },
  minOrder: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  stockBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  stockText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.darkGreen,
  },
});