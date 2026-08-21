import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/PrimaryButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Colors, Fonts, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useGlobalStyles } from '@/styles/global';
import { useTheme, useThemedStyles } from '@/contexts/ThemeContext';

const BKASH_NUMBER = '01570237742';

export default function CustomerAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const styles = useGlobalStyles();
  const { colors } = useTheme();
  const modalStyles = useThemedStyles(createModalStyles);
  const [bkashModalVisible, setBkashModalVisible] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const copyBkashNumber = async () => {
    await Clipboard.setStringAsync(BKASH_NUMBER);
    Alert.alert('Copied', 'bKash number copied to clipboard.');
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

        <TouchableOpacity
          style={modalStyles.bkashButton}
          onPress={() => setBkashModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.white} />
          <Text style={modalStyles.bkashButtonText}>Show Admin bKash</Text>
        </TouchableOpacity>

        <ThemeToggle />
        <PrimaryButton title="Logout" onPress={handleLogout} variant="secondary" style={{ marginTop: Spacing.md }} />
      </ScrollView>

      <Modal
        visible={bkashModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBkashModalVisible(false)}
      >
        <Pressable
          style={modalStyles.modalOverlay}
          onPress={() => setBkashModalVisible(false)}
        >
          <View style={modalStyles.modalSheet}>
            <Text style={modalStyles.modalTitle}>Send Money to bKash</Text>

            <View style={modalStyles.qrPlaceholder}>
              <Ionicons name="qr-code" size={80} color={colors.textMuted} />
              <Text style={modalStyles.qrPlaceholderText}>QR Code</Text>
            </View>

            <Text style={modalStyles.bkashLabel}>bKash Personal Number</Text>
            <View style={modalStyles.bkashRow}>
              <Text style={modalStyles.bkashNumber}>{BKASH_NUMBER}</Text>
              <TouchableOpacity onPress={copyBkashNumber} style={modalStyles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color={colors.darkGreen} />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.hint}>
              Send the amount, then enter your TrxID in the Orders page.
            </Text>

            <TouchableOpacity
              style={modalStyles.closeBtn}
              onPress={() => setBkashModalVisible(false)}
            >
              <Text style={modalStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createModalStyles = (Colors: ThemeColors) => StyleSheet.create({
  bkashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  bkashButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg ?? 24,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg ?? 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
  qrPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  bkashLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  bkashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bkashNumber: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.darkGreen,
    letterSpacing: 1,
  },
  copyBtn: {
    marginLeft: Spacing.sm,
    padding: 6,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  closeBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.darkGreen,
  },
});
