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
import { api, ApiError, ProductType } from '@/services/api';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductTypePicker } from '@/components/ProductTypePicker';
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
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getProductTypes(token ?? null).then(setProductTypes).catch(() => {});
  }, [token]);

  const selectedType = productTypes.find((pt) => pt.id === productTypeId);
  const maxPrice = selectedType?.max_price_limit ?? null;
  const pricePlaceholder = maxPrice ? `Max: ৳${parseFloat(maxPrice).toFixed(0)}` : 'Max: ৳999';

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const post = await api.getPost(parseInt(id, 10), token);
        setTitle(post.title);
        setDescription(post.description);
        setTotalWeight(post.total_weight_kg.toString());
        setPricePerKg(post.price_per_kg.toString());
        if (post.product_type) setProductTypeId(post.product_type);
        if (post.images && post.images.length > 0) {
          setExistingImages(post.images.map((img) => img.image).filter(Boolean) as string[]);
        } else if (post.image) {
          setExistingImages([post.image]);
        }
      } catch {
        Alert.alert('Error', 'Failed to load post.');
        router.back();
      } finally {
        setFetching(false);
      }
    })();
  }, [id, token]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImageUris((prev) => [...prev, ...newUris].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
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
        product_type: productTypeId || undefined,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
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

  const allDisplayImages = [...imageUris, ...existingImages];

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
        <Text style={styles.sectionLabel}>Product Photos (max 3)</Text>
        <View style={styles.photoRow}>
          {imageUris.map((uri, i) => (
            <View key={`new-${i}`} style={styles.photoBox}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color={Colors.darkGreen} />
              </TouchableOpacity>
            </View>
          ))}
          {existingImages.map((uri, i) => (
            <View key={`old-${i}`} style={styles.photoBox}>
              <Image source={{ uri }} style={styles.previewImage} />
              <View style={styles.existingBadge}>
                <Text style={styles.existingBadgeText}>existing</Text>
              </View>
            </View>
          ))}
          {allDisplayImages.length < 3 && (
            <TouchableOpacity style={styles.photoBox} onPress={pickImages}>
              <Ionicons name="add" size={28} color={Colors.darkGreen} />
              <Text style={styles.photoText}>Add Images</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>Product Details</Text>
        <ProductTypePicker
          token={token}
          selectedId={productTypeId}
          onSelect={(type) => setProductTypeId(type ? type.id : null)}
        />
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
              placeholder={pricePlaceholder}
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
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  photoBox: {
    width: 100,
    height: 100,
    backgroundColor: Colors.lightGreen,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 11,
  },
  existingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  existingBadgeText: {
    fontFamily: Fonts.regular,
    fontSize: 9,
    color: Colors.white,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gridInput: {
    flex: 1,
  },
});
