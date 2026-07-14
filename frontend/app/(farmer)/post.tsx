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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError, ProductType } from '@/services/api';
import { ScreenHeader } from '@/components/ScreenHeader';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductTypePicker } from '@/components/ProductTypePicker';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from 'react-i18next';

export default function CreatePostScreen() {
  const router = useRouter();
  const { token, location, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    api.getProductTypes(token ?? null).then(setProductTypes).catch(() => {});
  }, [token]);

  const selectedType = productTypes.find((pt) => pt.id === productTypeId);
  const maxPrice = selectedType?.max_price_limit ?? null;
  const pricePlaceholder = maxPrice ? `Max: ৳${parseFloat(maxPrice).toFixed(0)}` : 'Max: ৳999';

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

  const submit = async () => {
    if (!token) return;
    if (!title || !totalWeight || !pricePerKg) {
      Alert.alert('Missing fields', 'Product name, quantity and price are required.');
      return;
    }
    const lat = location?.latitude ?? user?.latitude ?? 23.81;
    const lng = location?.longitude ?? user?.longitude ?? 90.41;

    setLoading(true);
    try {
      await api.createPost(token, {
        title,
        description,
        total_weight_kg: parseFloat(totalWeight),
        price_per_kg: parseFloat(pricePerKg),
        latitude: lat,
        longitude: lng,
        product_type: productTypeId || undefined,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
      });
      Alert.alert('Listing posted', 'Your crop listing is now live.', [
        { text: 'OK', onPress: () => router.push('/(farmer)/dashboard') },
      ]);
      setTitle('');
      setDescription('');
      setTotalWeight('');
      setPricePerKg('');
      setImageUris([]);
      setProductTypeId(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to post listing';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('create_listing')} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t('product_photos')} (max 3)</Text>
        <View style={styles.photoRow}>
          {imageUris.map((uri, i) => (
            <View key={i} style={styles.photoBox}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color={Colors.darkGreen} />
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < 3 && (
            <TouchableOpacity style={styles.photoBox} onPress={pickImages}>
              <Ionicons name="add" size={28} color={Colors.darkGreen} />
              <Text style={styles.photoText}>{t('add_images')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('product_details')}</Text>
        <ProductTypePicker
          token={token}
          selectedId={productTypeId}
          onSelect={(type) => setProductTypeId(type ? type.id : null)}
        />
        <InputField placeholder={t('product_name')} value={title} onChangeText={setTitle} />
        <InputField placeholder={t('description')} value={description} onChangeText={setDescription} multiline />

        <Text style={styles.sectionLabel}>{t('quantity_price')}</Text>
        <View style={styles.grid}>
          <InputField placeholder={t('total_qty')} value={totalWeight} onChangeText={setTotalWeight} keyboardType="decimal-pad" />
          <InputField placeholder={pricePlaceholder} value={pricePerKg} onChangeText={setPricePerKg} keyboardType="decimal-pad" />
        </View>

        <PrimaryButton title={t('post_listing')} onPress={submit} loading={loading} />

        <View style={styles.commissionNote}>
          <Text style={styles.commissionText}>{t('commission_note')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

  const styles = StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: Colors.paleGreen,
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
    grid: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    commissionNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
      justifyContent: 'center',
    },
    commissionText: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      color: Colors.textMuted,
    },
  });
