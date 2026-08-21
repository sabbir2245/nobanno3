import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, User, Review } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewCard } from '@/components/ReviewCard';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function FarmerProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [farmer, setFarmer] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getFarmer(Number(id))
      .then(setFarmer)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const data = await api.getFarmerReviews(Number(id));
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ScreenHeader title="Farmer" onBack={() => router.back()} />
        <ActivityIndicator color={colors.darkGreen} />
      </View>
    );
  }

  if (notFound || !farmer) {
    return (
      <View style={styles.center}>
        <ScreenHeader title="Farmer" onBack={() => router.back()} />
        <Text style={styles.error}>Farmer not found.</Text>
      </View>
    );
  }

  const avg = farmer.avg_rating ?? 0;
  const count = farmer.ratings_count ?? 0;
  const fullStars = Math.floor(avg);
  const hasHalf = avg - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const location = farmer.location
    ? [farmer.location.division, farmer.location.district, farmer.location.upazila, farmer.location.union]
        .filter(Boolean)
        .join(' → ')
    : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Farmer Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={colors.white} />
          </View>
          <Text style={styles.name}>{farmer.name || farmer.username}</Text>
          {farmer.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.darkGreen} />
              <Text style={styles.verifiedText}>Verified Seller</Text>
            </View>
          )}

          <View style={styles.ratingRow}>
            {Array.from({ length: fullStars }).map((_, i) => (
              <Ionicons key={`f-${i}`} name="star" size={18} color={colors.starGold} />
            ))}
            {hasHalf && <Ionicons name="star-half" size={18} color={colors.starGold} />}
            {Array.from({ length: emptyStars }).map((_, i) => (
              <Ionicons key={`e-${i}`} name="star-outline" size={18} color={colors.starGold} />
            ))}
            <Text style={styles.ratingText}>
              {avg > 0 ? `${avg.toFixed(1)} (${count})` : 'No ratings yet'}
            </Text>
          </View>

          {location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.darkGreen} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Reviews ({reviews.length})</Text>
        {reviewsLoading ? (
          <ActivityIndicator color={colors.darkGreen} style={{ marginTop: Spacing.lg }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.empty}>No reviews yet.</Text>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  center: { flex: 1, backgroundColor: Colors.paleGreen },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  name: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.darkGreen },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  verifiedText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.darkGreen },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.sm,
  },
  ratingText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  locationText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.darkGreen,
    marginBottom: Spacing.sm,
  },
  empty: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },
  error: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});