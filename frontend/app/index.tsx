import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

export default function LocationScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { setLocation, token, user, location, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    
    // 1. If tokens exist, route directly to the appropriate role dashboard
    if (token && user) {
      const route = user.role === 'farmer' ? '/(farmer)/dashboard' : user.role === 'deliveryman' ? '/(deliveryman)/dashboard' : '/(customer)/home';
      router.replace(route);
      return;
    }
    
    // 2. If location is set but no token exists, go straight to login
    if (location) {
      router.replace('/auth/login');
    }
  }, [isLoading, token, user, location, router]);

  const requestLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location needed',
          'Nobanno uses your location to show nearby crop listings.',
        );
        setLoading(false);
        return;
      }
      
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      let label = 'Your area';
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (geo) {
          label = [geo.city, geo.district, geo.region]
            .filter(Boolean)
            .join(', ') || label;
        }
      } catch {
        // Keep fallback label on reverse geocode failures
      }
      
      await setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label,
      });

      // 3. Changed routing target from old /role to /auth/login
      router.replace('/auth/login');
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="leaf" size={48} color={colors.white} />
        </View>
        <Text style={styles.brand}>Nobanno</Text>
        <Text style={styles.tagline}>Fresh crops from local farmers</Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="location" size={32} color={colors.darkGreen} />
        <Text style={styles.title}>Enable Location</Text>
        <Text style={styles.subtitle}>
          We need your location to show crop listings near you and sort by distance.
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.darkGreen} style={{ marginTop: Spacing.lg }} />
        ) : (
          <PrimaryButton
            title="Allow Location Access"
            onPress={requestLocation}
            style={styles.btn}
          />
        )}
        <PrimaryButton
          title="Skip"
          onPress={() => router.replace('/auth/login')}
          variant="secondary"
          style={styles.skipBtn}
        />
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paleGreen,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brand: {
    fontFamily: Fonts.bold,
    fontSize: 36,
    color: Colors.darkGreen,
  },
  tagline: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.textDark,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  skipBtn: {
    marginTop: Spacing.sm,
    width: '100%',
  },
});