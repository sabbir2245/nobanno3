import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '@/services/api';
import { ImageViewer } from '@/components/ImageViewer';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';

interface Props { review: Review; }

export function ReviewCard({ review }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);

  const imageSources = (review.images || []).map((img) => img.image || img.image_url).filter(Boolean) as string[];

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
              <Ionicons key={`f-${i}`} name="star" size={12} color={colors.starGold} />
            ))}
            {hasHalf && <Ionicons name="star-half" size={12} color={colors.starGold} />}
            {Array.from({ length: emptyStars }).map((_, i) => (
              <Ionicons key={`e-${i}`} name="star-outline" size={12} color={colors.starGold} />
            ))}
          </View>
        </View>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {imageSources.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {imageSources.map((source, i) => (
            <TouchableOpacity key={i} onPress={() => setViewImageIndex(i)} activeOpacity={0.85}>
              <Image source={{ uri: source }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ImageViewer
        visible={viewImageIndex !== null}
        images={imageSources}
        initialIndex={viewImageIndex ?? 0}
        onClose={() => setViewImageIndex(null)}
      />
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.mediumGreen, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  avatarText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.textOnPrimary },
  headerInfo: { flex: 1 },
  name: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark },
  starRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  date: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  comment: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textDark, lineHeight: 20, marginTop: Spacing.sm },
  imageRow: { marginTop: Spacing.sm, marginLeft: -Spacing.sm, marginRight: -Spacing.sm, paddingHorizontal: Spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: Radius.sm, marginRight: Spacing.sm, backgroundColor: Colors.lightGreen },
});