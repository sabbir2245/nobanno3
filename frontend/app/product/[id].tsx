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
import { ImageViewer } from '@/components/ImageViewer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ReviewCard } from '@/components/ReviewCard';
import { Colors, Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMG_W = SCREEN_WIDTH - Spacing.md * 2;

export default function ProductDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { addItem } = useCart();
  const [post, setPost] = useState<Post | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [quantity, setQuantity] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [addedVisible, setAddedVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
  const qtyNum = parseInt(quantity, 10);
  const productCost = (isNaN(qtyNum) ? 0 : qtyNum) * pricePerKg;
  const isPieceProduct = post.quantity_type === 'piece';
  const quantityLabel = isPieceProduct ? 'pieces' : 'kg';
  const priceUnit = isPieceProduct ? 'piece' : 'kg';

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
    if (text === '') {
      setQuantity('');
      return;
    }
    const val = parseInt(text, 10);
    if (isNaN(val) || val < 0) {
      setQuantity('');
    } else {
      setQuantity(String(Math.min(val, maxQty)));
    }
  };

  const addToCart = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a quantity greater than 0.');
      return;
    }
    addItem(post, qty);
    setAddedVisible(true);
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
                    <Ionicons name="chevron-back" size={16} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowRight]}
                    onPress={() => {
                      const next = Math.min(allImages.length - 1, imageIndex + 1);
                      setImageIndex(next);
                      scrollRef.current?.scrollTo({ x: next * IMG_W, animated: true });
                    }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.white} />
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
            <View style={{ width: IMG_W, height: 180, backgroundColor: colors.lightGreen, borderRadius: Radius.md }} />
          )}
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={28} color={colors.white} />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.productTitle}>{post.title}</Text>
            <TouchableOpacity onPress={() => router.push(`/farmer/${post.farmer}`)}>
              <Text style={styles.farmerName}>
                {post.farmer_name || post.farmer_username}{' '}
                <Ionicons name="chevron-forward" size={13} color={colors.darkGreen} />
              </Text>
            </TouchableOpacity>
            <View style={styles.ratingRow}>
              {Array.from({ length: fullStars }).map((_, i) => (
                <Ionicons key={`f-${i}`} name="star" size={14} color={colors.starGold} />
              ))}
              {hasHalf && <Ionicons name="star-half" size={14} color={colors.starGold} />}
              {Array.from({ length: emptyStars }).map((_, i) => (
                <Ionicons key={`e-${i}`} name="star-outline" size={14} color={colors.starGold} />
              ))}
              <Text style={styles.ratingText}>
                {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingsCount})` : 'No ratings'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.darkGreen} />
              <Text style={styles.verifiedText}>Seller Verification</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Price:</Text>
            <Text style={styles.statValue}>৳ {pricePerKg.toFixed(0)} / {priceUnit}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Available:</Text>
            <Text style={styles.statValue}>{maxQty} {quantityLabel}</Text>
          </View>
        </View>

        {post.time_availability != null && post.time_availability > 0 && (
          <View style={[styles.statBox, { marginBottom: Spacing.md }]}>
            <Text style={styles.statLabel}>Time Availability:</Text>
            <Text style={styles.statValue}>{post.time_availability} hrs</Text>
          </View>
        )}

        {post.location && (
          <View style={styles.locationCard}>
            <Ionicons name="location-outline" size={16} color={colors.darkGreen} />
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

        <Text style={styles.sectionLabel}>Quantity ({isPieceProduct ? 'pieces' : 'kg'})</Text>
        <TextInput
          style={styles.qtyInput}
          value={quantity}
          onChangeText={handleQtyChange}
          keyboardType="number-pad"
          placeholder={isPieceProduct ? 'Enter number of pieces' : 'Enter quantity in kg'}
          placeholderTextColor={colors.textMuted}
        />

        {qtyNum > 0 && (
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
          <PrimaryButton title="Add to Cart" onPress={addToCart} variant="sage" style={styles.primaryActionBordered} />
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
                  <Ionicons key={`sf-${i}`} name="star" size={16} color={colors.starGold} />
                ))}
                {hasHalf && <Ionicons name="star-half" size={16} color={colors.starGold} />}
                {Array.from({ length: emptyStars }).map((_, i) => (
                  <Ionicons key={`se-${i}`} name="star-outline" size={16} color={colors.starGold} />
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
                    <Ionicons name="star" size={10} color={colors.starGold} />
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
            <ActivityIndicator color={colors.darkGreen} style={{ marginTop: Spacing.md }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => <ReviewCard key={review.id} review={review} />)
          )}
        </View>
      </ScrollView>

      <ImageViewer
        visible={showPreview}
        images={allImages}
        initialIndex={imageIndex}
        onClose={() => setShowPreview(false)}
      />
      <Modal transparent visible={addedVisible} animationType="fade" onRequestClose={() => setAddedVisible(false)}>
        <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setAddedVisible(false)}>
          <View style={styles.popupCard}>
            <Ionicons name="checkmark-circle" size={34} color={colors.darkGreen} />
            <Text style={styles.popupTitle}>Added to cart</Text>
            <Text style={styles.popupText}>{post.title} has been added successfully.</Text>
            <View style={styles.popupActions}>
              <TouchableOpacity style={[styles.popupBtn, styles.popupBtnSecondary]} onPress={() => setAddedVisible(false)}>
                <Text style={styles.popupBtnSecondaryText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupBtn, styles.popupBtnPrimary]}
                onPress={() => {
                  setAddedVisible(false);
                  router.push('/(customer)/cart');
                }}
              >
                <Text style={styles.popupBtnPrimaryText}>View Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  primaryActionBordered: {
    flex: 2,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
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
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: Spacing.lg },
  popupCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  popupTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark, marginTop: Spacing.sm },
  popupText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xs },
  popupActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  popupBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill, minWidth: 110, alignItems: 'center' },
  popupBtnSecondary: { backgroundColor: Colors.paleGreen },
  popupBtnSecondaryText: { fontFamily: Fonts.semiBold, color: Colors.darkGreen },
  popupBtnPrimary: { backgroundColor: Colors.darkGreen },
  popupBtnPrimaryText: { fontFamily: Fonts.semiBold, color: Colors.textOnPrimary },
});
