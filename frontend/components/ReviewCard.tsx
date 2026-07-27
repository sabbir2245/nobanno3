import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '@/services/api';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props { review: Review; }

export function ReviewCard({ review }: Props) {
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const previewScrollRef = useRef<ScrollView>(null);

  const imageSources = (review.images || []).map((img) => img.image || img.image_url).filter(Boolean) as string[];
  const previewWidth = Dimensions.get('window').width;

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
          <Text style={styles.avatarText}>{(review.customer_username || '?')[0].toUpperCase()}</Text>
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

      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {imageSources.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {imageSources.map((source, i) => (
            <TouchableOpacity key={i} onPress={() => setViewImageIndex(i)}>
              <Image source={{ uri: source }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={viewImageIndex !== null} transparent animationType="fade" onRequestClose={() => setViewImageIndex(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView ref={previewScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / previewWidth);
              if (idx !== viewImageIndex) setViewImageIndex(idx);
            }}
            scrollEventThrottle={16} style={{ flex: 1 }}
          >
            {imageSources.map((uri, i) => (
              <TouchableOpacity key={i} activeOpacity={1} onPress={() => {}}>
                <Image source={{ uri }} style={{ width: previewWidth, height: Dimensions.get('window').height * 0.6 }} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {imageSources.length > 1 && (
            <>
              {viewImageIndex! > 0 && (
                <TouchableOpacity style={styles.arrowLeft} onPress={() => {
                  const next = viewImageIndex! - 1;
                  setViewImageIndex(next);
                  previewScrollRef.current?.scrollTo({ x: next * previewWidth, animated: true });
                }}>
                  <Ionicons name="chevron-back-circle" size={40} color={Colors.white} />
                </TouchableOpacity>
              )}
              {viewImageIndex! < imageSources.length - 1 && (
                <TouchableOpacity style={styles.arrowRight} onPress={() => {
                  const next = viewImageIndex! + 1;
                  setViewImageIndex(next);
                  previewScrollRef.current?.scrollTo({ x: next * previewWidth, animated: true });
                }}>
                  <Ionicons name="chevron-forward-circle" size={40} color={Colors.white} />
                </TouchableOpacity>
              )}
            </>
          )}
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{viewImageIndex !== null ? viewImageIndex + 1 : 0} / {imageSources.length}</Text>
          </View>
          <TouchableOpacity style={styles.modalClose} onPress={() => setViewImageIndex(null)}>
            <Ionicons name="close-circle" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.mediumGreen, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  avatarText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.white },
  headerInfo: { flex: 1 },
  name: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark },
  starRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  date: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  comment: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, lineHeight: 20, marginTop: Spacing.sm },
  imageRow: { marginTop: Spacing.sm, marginLeft: -Spacing.sm, marginRight: -Spacing.sm, paddingHorizontal: Spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: Radius.sm, marginRight: Spacing.sm, backgroundColor: Colors.lightGreen },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20 },
  arrowLeft: { position: 'absolute', left: 10, top: '50%', marginTop: -20 },
  arrowRight: { position: 'absolute', right: 10, top: '50%', marginTop: -20 },
  counterBadge: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  counterText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.white },
});
