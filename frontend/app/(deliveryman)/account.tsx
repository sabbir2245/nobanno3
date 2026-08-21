import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useGlobalStyles } from '@/styles/global';

export default function DeliverymanAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const styles = useGlobalStyles();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(user?.name || user?.username || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || user?.username}</Text>
            <Text style={styles.phone}>{user?.phone_number || 'No phone set'}</Text>
            <Text style={styles.address}>{user?.address || 'No address set'}</Text>
          </View>
        </View>
        <PrimaryButton title="Edit Profile" onPress={() => router.push('/auth/update-profile')} variant="sage" style={{ marginTop: Spacing.md }} />
        <ThemeToggle />
        <PrimaryButton title="Logout" onPress={handleLogout} variant="secondary" style={{ marginTop: Spacing.md }} />
      </ScrollView>
    </View>
  );
}