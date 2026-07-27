import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { globalstyles } from '@/styles/global';

export default function CustomerAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={globalstyles.container}>
      <ScrollView contentContainerStyle={globalstyles.content}>
        <View style={globalstyles.profileCard}>
          <View style={globalstyles.avatar}>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={globalstyles.avatarImage} />
            ) : (
              <Text style={globalstyles.avatarText}>
                {(user?.name || user?.username || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={globalstyles.profileInfo}>
            <Text style={globalstyles.name}>{user?.name || user?.username}</Text>
            <Text style={globalstyles.phone}>{user?.phone_number || 'No phone set'}</Text>
            <Text style={globalstyles.address}>{user?.address || 'No address set'}</Text>
          </View>
        </View>
        <PrimaryButton title="Edit Profile" onPress={() => router.push('/auth/update-profile')} variant="sage" style={{ marginTop: Spacing.md }} />
        <PrimaryButton title="Logout" onPress={handleLogout} variant="secondary" style={{ marginTop: Spacing.md }} />
      </ScrollView>
    </View>
  );
}
