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
import { Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function CreatePostScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [quantityType, setQuantityType] = useState<'kg' | 'piece'>('kg');
  const [estWeight, setEstWeight] = useState('');
  const [timeAvailability, setTimeAvailability] = useState('');
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
  const pricePlaceholder = maxPrice ? `Price per ${quantityType === 'piece' ? 'piece' : 'kg'} (max ৳${parseFloat(maxPrice).toFixed(0)})` : `Enter price per ${quantityType === 'piece' ? 'piece' : 'kg'}`;

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
    if (quantityType === 'piece' && !estWeight) {
      Alert.alert('Missing field', 'Per-piece listings require an estimated weight per piece.');
      return;
    }
    const farmerLocationId = user?.location?.id;
    if (!farmerLocationId) {
      Alert.alert('Location missing', 'Set your location in your profile before posting a listing.');
      return;
    }

    setLoading(true);
    try {
      await api.createPost(token, {
        title,
        description,
        total_weight_kg: parseFloat(totalWeight),
        price_per_kg: parseFloat(pricePerKg),
        quantity_type: quantityType,
        est_weight_kg: quantityType === 'piece' ? parseFloat(estWeight) : undefined,
        time_availability: timeAvailability ? parseInt(timeAvailability, 10) : undefined,
        location: farmerLocationId,
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
      setQuantityType('kg');
      setEstWeight('');
      setTimeAvailability('');
      setImageUris([]);
      setProductTypeId(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to post listing';
      console.log('[POST] Listing submit FAILED:', err);
      console.log('[POST] stack:', err instanceof Error ? err.stack : '(no stack)');
      console.log('[POST] ApiError data:', err instanceof ApiError ? err.data : null);
      Alert.alert('Error posting listing', `${msg}\n\n(Details logged to console)`);
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
                <Ionicons name="close-circle" size={22} color={colors.darkGreen} />
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < 3 && (
            <TouchableOpacity style={styles.photoBox} onPress={pickImages}>
              <Ionicons name="add" size={28} color={colors.darkGreen} />
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
        <InputField placeholder="পণ্যের নাম" value={title} onChangeText={setTitle} />
        <InputField placeholder="বিবরণ" value={description} onChangeText={setDescription} multiline />

        <Text style={styles.sectionLabel}>{t('quantity_price')}</Text>
        <View style={styles.unitToggle}>
          {(['kg', 'piece'] as const).map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[styles.unitOption, quantityType === unit && styles.unitOptionActive]}
              onPress={() => setQuantityType(unit)}
            >
              <Text style={[styles.unitText, quantityType === unit && styles.unitTextActive]}>
                {unit === 'kg' ? 'প্রতি কেজি' : 'প্রতি পিস'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.grid}>
          <InputField
            placeholder={quantityType === 'kg' ? 'মোট ওজন (কেজি)' : 'মোট পিস'}
            value={totalWeight}
            onChangeText={setTotalWeight}
            keyboardType="decimal-pad"
          />
          <View style={styles.priceWrap}>
            <InputField
              placeholder={pricePlaceholder}
              value={pricePerKg}
              onChangeText={setPricePerKg}
              keyboardType="decimal-pad"
            />
            {maxPrice && (
              <Text style={styles.maxPriceText}>সর্বোচ্চ: ৳{parseFloat(maxPrice).toFixed(0)}</Text>
            )}
          </View>
        </View>
        {quantityType === 'piece' && (
          <View style={styles.estWeightRow}>
            <InputField
              placeholder="প্রতি পিস আনুমানিক ওজন (কেজি)"
              value={estWeight}
              onChangeText={setEstWeight}
              keyboardType="decimal-pad"
            />
          </View>
        )}
        <Text style={styles.sectionLabel}>সময়সীমা</Text>
        <InputField
          placeholder="উপলব্ধতার সময়সীমা (ঘণ্টা)"
          value={timeAvailability}
          onChangeText={setTimeAvailability}
          keyboardType="number-pad"
        />

        <PrimaryButton title="পোস্ট করুন" onPress={submit} loading={loading} />

        <View style={styles.commissionNote}>
          <Text style={styles.commissionText}>কমিশন নোট: বিক্রয় শেষে স্বয়ংক্রিয় হিসাব হবে।</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

  const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    priceWrap: {
      flex: 1,
    },
    maxPriceText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: Colors.darkGreen,
      marginTop: 4,
      textAlign: 'right',
    },
    unitToggle: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    unitOption: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.lightGreen,
      alignItems: 'center',
    },
    unitOptionActive: {
      backgroundColor: Colors.darkGreen,
      borderColor: Colors.darkGreen,
    },
    unitText: {
      fontFamily: Fonts.semiBold,
      fontSize: 14,
      color: Colors.darkGreen,
    },
    unitTextActive: {
      color: Colors.textOnPrimary,
    },
    estWeightRow: {
      marginTop: Spacing.sm,
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
