import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { api, Post, Review } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReviewCard } from '@/components/ReviewCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const MIN_QTY = 10;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, location } = useAuth();
  const { addItem } = useCart();
  const [post, setPost] = useState<Post | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [quantity, setQuantity] = useState(MIN_QTY);

  useEffect(() => {
    if (!id) return;
    api.getPost(Number(id), token).then(setPost).catch(() => setPost(null));
  }, [id, token]);

  const loadReviews = useCallback(async () => {
    if (!post) return;
    setReviewsLoading(true);
    try {
      const data = await api.getReviews(post.id);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [post]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (!post) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Listing Detail" onBack={() => router.back()} />
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const maxQty = Math.floor(parseFloat(post.total_weight_kg));
  const pricePerKg = parseFloat(post.price_per_kg);
  const productCost = quantity * pricePerKg;

  const avgRating = post.farmer_avg_rating ?? 0;
  const ratingsCount = post.farmer_ratings_count ?? 0;
  const fullStars = Math.floor(avgRating);
  const hasHalf = avgRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) distribution[5 - r.rating]++;
  });

  const adjustQty = (delta: number) => {
    setQuantity((q) => Math.min(maxQty, Math.max(MIN_QTY, q + delta)));
  };

  const addToCart = () => {
    addItem(post, quantity);
    Alert.alert('Added to cart', `${quantity} kg of ${post.title} added.`, [
      { text: 'View Cart', onPress: () => router.push('/(customer)/cart') },
      { text: 'Continue', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Listing Detail: ${post.title}`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.gallery}>
          {post.image ? (
            <Image source={{ uri: post.image }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.mainImage} />
          )}
          <View style={styles.thumbRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.thumb} />
            ))}
          </View>
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={28} color={Colors.white} />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.productTitle}>{post.title}</Text>
            <Text style={styles.farmerName}>{post.farmer_name || post.farmer_username}</Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: fullStars }).map((_, i) => (
                <Ionicons key={`f-${i}`} name="star" size={14} color={Colors.starGold} />
              ))}
              {hasHalf && <Ionicons name="star-half" size={14} color={Colors.starGold} />}
              {Array.from({ length: emptyStars }).map((_, i) => (
                <Ionicons key={`e-${i}`} name="star-outline" size={14} color={Colors.starGold} />
              ))}
              <Text style={styles.ratingText}>
                {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingsCount})` : 'No ratings'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.darkGreen} />
              <Text style={styles.verifiedText}>Seller Verification</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Price:</Text>
            <Text style={styles.statValue}>৳ {pricePerKg.toFixed(0)} / kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Available:</Text>
            <Text style={styles.statValue}>{maxQty} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min. Order:</Text>
            <Text style={styles.statValue}>{MIN_QTY} kg</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quantity Selection</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(-5)}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyValue}>{quantity} kg</Text>
          </View>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(5)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.costBox}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Product Cost:</Text>
            <Text style={styles.costValue}>৳ {productCost.toFixed(0)}</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Shipping Est.:</Text>
            <Text style={styles.costValue}>৳ --</Text>
          </View>
          <View style={[styles.costRow, styles.costTotal]}>
            <Text style={styles.costLabel}>Total Estimate:</Text>
            <Text style={styles.costValue}>৳ {productCost.toFixed(0)} + Shipping</Text>
          </View>
        </View>

        {post.description ? <Text style={styles.description}>{post.description}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton title="Place Bulk Order" onPress={addToCart} variant="sage" style={styles.primaryAction} />
        </View>

        {/* ─── REVIEWS SECTION ─── */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionLabel}>Ratings & Reviews</Text>

          {/* Summary Dashboard */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.bigRating}>
                {avgRating > 0 ? avgRating.toFixed(1) : '--'}
              </Text>
              <Text style={styles.bigLabel}>out of 5</Text>
              <View style={styles.summaryStars}>
                {Array.from({ length: fullStars }).map((_, i) => (
                  <Ionicons key={`sf-${i}`} name="star" size={16} color={Colors.starGold} />
                ))}
                {hasHalf && <Ionicons name="star-half" size={16} color={Colors.starGold} />}
                {Array.from({ length: emptyStars }).map((_, i) => (
                  <Ionicons key={`se-${i}`} name="star-outline" size={16} color={Colors.starGold} />
                ))}
              </View>
              <Text style={styles.totalRatings}>{ratingsCount} total ratings</Text>
            </View>
            <View style={styles.summaryRight}>
              {distribution.map((count, idx) => {
                const star = 5 - idx;
                const pct = ratingsCount > 0 ? (count / ratingsCount) * 100 : 0;
                return (
                  <View key={star} style={styles.barRow}>
                    <Text style={styles.barLabel}>{star}</Text>
                    <Ionicons name="star" size={10} color={Colors.starGold} />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reviews List */}
          {reviewsLoading ? (
            <ActivityIndicator color={Colors.darkGreen} style={{ marginTop: Spacing.md }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => <ReviewCard key={review.id} review={review} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  loading: { fontFamily: Fonts.regular, textAlign: 'center', marginTop: 40, color: Colors.textMuted },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  gallery: { marginBottom: Spacing.md },
  mainImage: { height: 180, backgroundColor: Colors.lightGreen, borderRadius: Radius.md, marginBottom: Spacing.sm },
  thumbRow: { flexDirection: 'row', gap: Spacing.sm },
  thumb: { flex: 1, height: 60, backgroundColor: Colors.cream, borderRadius: Radius.sm },
  sellerCard: { flexDirection: 'row', backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.md },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.mediumGreen, alignItems: 'center', justifyContent: 'center' },
  sellerInfo: { flex: 1 },
  productTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.textDark },
  farmerName: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  ratingText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted, marginLeft: 4 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  verifiedText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.darkGreen },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.sm },
  statLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  statValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark, marginTop: 2 },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: Spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.darkGreen, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.white },
  qtyDisplay: { flex: 1, borderWidth: 1, borderColor: Colors.textDark, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center' },
  qtyValue: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
  costBox: { backgroundColor: Colors.paleGreen, borderWidth: 1, borderColor: Colors.textDark, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  costTotal: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  costLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, flex: 1 },
  costValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark },
  description: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, lineHeight: 22, marginBottom: Spacing.md },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryAction: { flex: 2 },
  secondaryAction: { flex: 1 },

  // Review section
  reviewsSection: { marginTop: Spacing.lg },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  bigRating: { fontFamily: Fonts.bold, fontSize: 36, color: Colors.textDark },
  bigLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  summaryStars: { flexDirection: 'row', gap: 1, marginTop: Spacing.xs },
  totalRatings: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  summaryRight: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabel: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textDark, width: 12 },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.lightGreen, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.starGold, borderRadius: 3 },
  barCount: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, width: 20, textAlign: 'right' },
  emptyReviews: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});