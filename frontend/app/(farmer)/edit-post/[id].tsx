import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/services/api';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

export default function EditPostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const post = await api.getPost(parseInt(id, 10), token);
        setTitle(post.title);
        setDescription(post.description);
        setTotalWeight(post.total_weight_kg.toString());
        setPricePerKg(post.price_per_kg.toString());
        if (post.image) setExistingImage(post.image);
      } catch {
        Alert.alert('Error', 'Failed to load post.');
        router.back();
      } finally {
        setFetching(false);
      }
    })();
  }, [id, token]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Gallery access is required to change image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!token || !id) return;
    if (!title.trim() || !totalWeight || !pricePerKg) {
      Alert.alert('Missing fields', 'Title, quantity, and price are required.');
      return;
    }
    setLoading(true);
    try {
      await api.updatePost(token, parseInt(id, 10), {
        title: title.trim(),
        description: description.trim(),
        total_weight_kg: parseFloat(totalWeight),
        price_per_kg: parseFloat(pricePerKg),
        imageUri: imageUri || undefined,
      });
      Alert.alert('Updated', 'Your post has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.darkGreen} />
      </View>
    );
  }

  const displayImage = imageUri || existingImage;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.backBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="checkmark" size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Product Photo</Text>
        <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="add" size={28} color={Colors.darkGreen} />
              <Text style={styles.photoText}>Add Image</Text>
            </>
          )}
        </TouchableOpacity>
        {existingImage && !imageUri && (
          <Text style={styles.hint}>Tap to change photo</Text>
        )}

        <Text style={styles.sectionLabel}>Product Details</Text>
        <InputField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Product name"
        />
        <InputField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your product"
          multiline
        />

        <Text style={styles.sectionLabel}>Quantity & Price</Text>
        <View style={styles.grid}>
          <View style={styles.gridInput}>
            <InputField
              label="Total Weight (kg)"
              value={totalWeight}
              onChangeText={setTotalWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
            />
          </View>
          <View style={styles.gridInput}>
            <InputField
              label="Price per kg (৳)"
              value={pricePerKg}
              onChangeText={setPricePerKg}
              keyboardType="decimal-pad"
              placeholder="e.g. 50"
            />
          </View>
        </View>

        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.paleGreen,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleGreen,
  },
  header: {
    backgroundColor: Colors.headerGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: Colors.white,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  photoBox: {
    width: 120,
    height: 120,
    backgroundColor: Colors.lightGreen,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  photoText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.darkGreen,
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gridInput: {
    flex: 1,
  },
});
