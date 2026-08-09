import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMG_W = SCREEN_WIDTH - Spacing.md * 2;

const MIN_QTY = 0;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { addItem } = useCart();
  const [post, setPost] = useState<Post | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [quantity, setQuantity] = useState(MIN_QTY);
  const [imageIndex, setImageIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const previewScrollRef = useRef<ScrollView>(null);

  const allImages: string[] = React.useMemo(() => {
    const uris: string[] = [];
    if (post?.images?.length) {
      post.images.forEach((img) => { if (img.image) uris.push(img.image); });
    }
    if (!uris.length && post?.image) uris.push(post.image);
    return uris;
  }, [post]);

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

  const handleQtyChange = (text: string) => {
    const val = parseInt(text, 10);
    if (isNaN(val) || val < 0) {
      setQuantity(0);
    } else {
      setQuantity(Math.min(val, maxQty));
    }
  };

  const addToCart = () => {
    if (quantity <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a quantity greater than 0.');
      return;
    }
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
          {allImages.length > 0 ? (
            <View style={styles.imageWrapper}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / IMG_W);
                  if (idx !== imageIndex) setImageIndex(idx);
                }}
                scrollEventThrottle={16}
              >
                {allImages.map((uri, i) => (
                  <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setImageIndex(i); setShowPreview(true); }}>
                    <Image source={{ uri }} style={{ width: IMG_W, height: 180 }} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {allImages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowLeft]}
                    onPress={() => {
                      const next = Math.max(0, imageIndex - 1);
                      setImageIndex(next);
                      scrollRef.current?.scrollTo({ x: next * IMG_W, animated: true });
                    }}
                  >
                    <Ionicons name="chevron-back" size={16} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowRight]}
                    onPress={() => {
                      const next = Math.min(allImages.length - 1, imageIndex + 1);
                      setImageIndex(next);
                      scrollRef.current?.scrollTo({ x: next * IMG_W, animated: true });
                    }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={Colors.white} />
                  </TouchableOpacity>
                  <View style={styles.dots}>
                    {allImages.map((_, i) => (
                      <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={{ width: IMG_W, height: 180, backgroundColor: Colors.lightGreen, borderRadius: Radius.md }} />
          )}
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
        </View>

        {post.location && (
          <View style={styles.locationCard}>
            <Ionicons name="location-outline" size={16} color={Colors.darkGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Collection Location</Text>
              <Text style={styles.locationValue}>
                {[post.location.division, post.location.district, post.location.upazila, post.location.union]
                  .filter(Boolean)
                  .join(' → ')}
              </Text>
            </View>
            {post.distance_km != null && (
              <Text style={styles.distanceText}>{post.distance_km} km away</Text>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>Quantity (kg)</Text>
        <TextInput
          style={styles.qtyInput}
          value={String(quantity)}
          onChangeText={handleQtyChange}
          keyboardType="number-pad"
          placeholder="Enter quantity"
          placeholderTextColor={Colors.textMuted}
        />

        {quantity > 0 && (
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
        )}

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

      <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
        <View style={styles.previewOverlay}>
          <ScrollView ref={previewScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (idx !== imageIndex) setImageIndex(idx);
            }}
            scrollEventThrottle={16} style={{ flex: 1 }}
          >
            {allImages.map((uri, i) => (
              <TouchableOpacity key={i} activeOpacity={1} onPress={() => {}}>
                <Image source={{ uri }} style={{ width: SCREEN_WIDTH, height: Dimensions.get('window').height * 0.6 }} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {allImages.length > 1 && (
            <>
              {imageIndex > 0 && (
                <TouchableOpacity style={styles.previewArrowLeft} onPress={() => {
                  const next = imageIndex - 1;
                  setImageIndex(next);
                  previewScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
                }}>
                  <Ionicons name="chevron-back-circle" size={40} color={Colors.white} />
                </TouchableOpacity>
              )}
              {imageIndex < allImages.length - 1 && (
                <TouchableOpacity style={styles.previewArrowRight} onPress={() => {
                  const next = imageIndex + 1;
                  setImageIndex(next);
                  previewScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
                }}>
                  <Ionicons name="chevron-forward-circle" size={40} color={Colors.white} />
                </TouchableOpacity>
              )}
            </>
          )}
          <View style={styles.previewCounter}>
            <Text style={styles.previewCounterText}>{imageIndex + 1} / {allImages.length}</Text>
          </View>
          <TouchableOpacity style={styles.previewClose} onPress={() => setShowPreview(false)}>
            <Ionicons name="close-circle" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paleGreen },
  loading: { fontFamily: Fonts.regular, textAlign: 'center', marginTop: 40, color: Colors.textMuted },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  gallery: { marginBottom: Spacing.md },
  imageWrapper: { position: 'relative', borderRadius: Radius.md, overflow: 'hidden' },
  arrowBtn: {
    position: 'absolute', top: 0, bottom: 22, width: 28,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  arrowLeft: { left: 0 },
  arrowRight: { right: 0 },
  dots: {
    position: 'absolute', bottom: 4, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 8, height: 8, borderRadius: 4 },
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
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  locationTitle: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.textMuted },
  locationValue: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textDark, marginTop: 2 },
  distanceText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.darkGreen },
  sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: Spacing.sm },
  qtyInput: {
    borderWidth: 1,
    borderColor: Colors.textDark,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
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
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewArrowLeft: { position: 'absolute', left: 10, top: '50%', marginTop: -20 },
  previewArrowRight: { position: 'absolute', right: 10, top: '50%', marginTop: -20 },
  previewCounter: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  previewCounterText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.white },
  previewClose: { position: 'absolute', top: 50, right: 20 },
});