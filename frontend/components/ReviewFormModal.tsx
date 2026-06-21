import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  postId: number;
  postTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewFormModal({ visible, postId, postTitle, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    if (imageUris.length >= 3) {
      Alert.alert('Limit', 'You can add up to 3 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUris((prev) => [...prev, result.assets[0].uri].slice(0, 3));
    }
  };

  const removeImage = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
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
    try {
      const body: { post: number; rating: number; comment: string; imageUris?: string[] } = {
        post: postId,
        rating,
        comment,
      };
      if (imageUris.length > 0) body.imageUris = imageUris;
      await api.createReviewWithImages(token, body);
      Alert.alert('Thank you!', 'Your review has been submitted.');
      setRating(0);
      setComment('');
      setImageUris([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not submit review.');
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
                    color={star <= rating ? Colors.starGold : Colors.border}
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
              placeholderTextColor={Colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.imageLabel}>Add photos (up to 3)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {imageUris.map((uri) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.preview} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(uri)}>
                    <Ionicons name="close-circle" size={20} color={Colors.darkGreen} />
                  </TouchableOpacity>
                </View>
              ))}
              {imageUris.length < 3 && (
                <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={24} color={Colors.mediumGreen} />
                </TouchableOpacity>
              )}
            </ScrollView>

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

const styles = StyleSheet.create({
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
  imageLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  imageRow: {
    marginBottom: Spacing.lg,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    backgroundColor: Colors.lightGreen,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.white,
    borderRadius: 10,
  },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
