import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';

interface Props {
  visible: boolean;
  postId: number;
  postTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewFormModal({ visible, postId, postTitle, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const remaining = 3 - imageUris.length;
        const newUris = result.assets.slice(0, remaining).map((a) => a.uri);
        setImageUris((prev) => [...prev, ...newUris].slice(0, 3));
      }
    } catch (err) {
      // picker cancelled or failed — silently ignore
    }
  };

  const removeImage = (idx: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    if (!token) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    setSubmitting(true);
    console.log(`[ReviewFormModal] Submitting review — post=${postId} rating=${rating} images=${imageUris.length}`);
    try {
      const result = await api.createReviewWithImages(token, {
        post: postId,
        rating,
        comment,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
      });
      console.log(`[ReviewFormModal] Submit success — review #${result.id}`);
      Alert.alert('Thank you!', 'Your review has been submitted.');
      setRating(0);
      setComment('');
      setImageUris([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data
        ? (typeof err.data === 'string' ? err.data : JSON.stringify(err.data))
        : (err.message || 'Could not submit review.');
      console.log(`[ReviewFormModal] Submit error — ${msg}`);
      Alert.alert('Review Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Rate {postTitle}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? colors.starGold : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Write your review (optional)"
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={18} color={colors.darkGreen} />
              <Text style={styles.photoBtnText}>
                {imageUris.length > 0 ? `${imageUris.length}/3 photos` : 'Add Photos'}
              </Text>
            </TouchableOpacity>

            {imageUris.length > 0 && (
              <View style={styles.photoPreviewRow}>
                {imageUris.map((uri, i) => (
                  <View key={i} style={styles.photoPreviewBox}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeImage(i)}>
                      <Ionicons name="close-circle" size={18} color={colors.darkGreen} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <PrimaryButton
                title="Cancel"
                onPress={onClose}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title={submitting ? 'Submitting...' : 'Submit Review'}
                onPress={handleSubmit}
                disabled={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  ratingLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.starGold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    minHeight: 80,
    marginBottom: Spacing.md,
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.sm, paddingVertical: Spacing.sm,
  },
  photoBtnText: {
    fontFamily: Fonts.medium, fontSize: 14, color: Colors.darkGreen,
  },
  photoPreviewRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  photoPreviewBox: {
    width: 72, height: 72, borderRadius: Radius.sm, overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%', height: '100%', borderRadius: Radius.sm,
  },
  photoRemove: {
    position: 'absolute', top: -4, right: -4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
