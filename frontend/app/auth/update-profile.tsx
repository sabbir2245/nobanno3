import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/services/api';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function UpdateProfileScreen() {
  const router = useRouter();
  const { token, user, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locLabel, setLocLabel] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phone_number || '');
      setAddress(user.address || '');
      setEmail(user.email || '');
      setLatitude(user.latitude);
      setLongitude(user.longitude);
      if (user.latitude && user.longitude) {
        setLocLabel(`${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`);
      }
    }
    setInitializing(false);
  }, [user]);

  const hasChanges =
    name !== (user?.name || '') ||
    phoneNumber !== (user?.phone_number || '') ||
    address !== (user?.address || '') ||
    email !== (user?.email || '') ||
    latitude !== user?.latitude ||
    longitude !== user?.longitude;

  const detectLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to auto-detect your location.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) {
          label = [geo.city, geo.district, geo.region].filter(Boolean).join(', ') || label;
        }
      } catch {}
      setLocLabel(label);
    } catch {
      Alert.alert('Error', 'Could not detect your location.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!name.trim() || !email.trim()) {
      Alert.alert('Missing info', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfileInfo(token, {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        address: address.trim(),
        email: email.trim(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      await refreshProfile();
      Alert.alert('Updated', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.darkGreen} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={22} color={Colors.darkGreen} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          <InputField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@email.com"
          />
          <InputField
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="01XXXXXXXXX"
          />
          <InputField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Your address"
            multiline
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={22} color={Colors.darkGreen} />
            <Text style={styles.cardTitle}>Your Location</Text>
          </View>
          <Text style={styles.locHint}>
            Used to show nearby listings and calculate distances.
          </Text>
          <View style={styles.locRow}>
            <View style={styles.locInfo}>
              <Ionicons name="navigate" size={18} color={Colors.mediumGreen} />
              <Text style={styles.locText}>
                {locLabel || 'Not set — tap the button to detect'}
              </Text>
            </View>
          </View>
          <PrimaryButton
            title={locLoading ? 'Detecting...' : 'Detect My Location'}
            onPress={detectLocation}
            loading={locLoading}
            variant="sage"
          />
        </View>

        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasChanges}
          style={!hasChanges ? styles.disabledBtn : undefined}
        />

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textDark,
  },
  locHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  locText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textDark,
    flex: 1,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.textMuted,
  },
});
