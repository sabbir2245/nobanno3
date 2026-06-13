import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { api, ApiError } from '@/services/api';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

type Method = 'email' | 'sms';
type Step = 'send-otp' | 'reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('send-otp');
  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Required', 'Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email, method);
      Alert.alert('OTP Sent', `A 6-digit OTP has been sent to ${email}. It expires in 5 minutes.`);
      setStep('reset-password');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send OTP';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Required', 'Enter the 6-digit OTP sent to your email.');
      return;
    }
    if (!newPassword) {
      Alert.alert('Required', 'Enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email, otp, newPassword);
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please login with your new password.',
        [{ text: 'Go to Login', onPress: () => router.replace('/auth/login') }],
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reset password';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Forgot Password</Text>

        {step === 'send-otp' ? (
          <>
            <Text style={styles.subtitle}>
              Enter your email to receive a password reset OTP.
            </Text>

            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'email' && styles.methodActive]}
                onPress={() => setMethod('email')}
              >
                <Text
                  style={[
                    styles.methodText,
                    method === 'email' && styles.methodTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'sms' && styles.methodActive]}
                onPress={() => Alert.alert('Coming Soon', 'SMS OTP will be available soon.')}
              >
                <Text
                  style={[
                    styles.methodText,
                    method === 'sms' && styles.methodTextActive,
                  ]}
                >
                  Phone OTP
                </Text>
              </TouchableOpacity>
            </View>

            <InputField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@email.com"
            />

            <PrimaryButton title="Send OTP" onPress={handleSendOtp} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Enter the OTP sent to <Text style={styles.bold}>{email}</Text> and choose a new
              password.
            </Text>

            <InputField
              label="OTP Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
            />

            <InputField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />

            <InputField
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
            />

            <PrimaryButton title="Reset Password" onPress={handleResetPassword} loading={loading} />

            <TouchableOpacity
              onPress={() => {
                setStep('send-otp');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={styles.back}
            >
              <Text style={styles.backText}>Back to email entry</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.back}>
          <Text style={styles.backText}>Back to login</Text>
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
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  bold: {
    fontFamily: Fonts.bold,
    color: Colors.textDark,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  methodActive: {
    backgroundColor: Colors.darkGreen,
    borderColor: Colors.darkGreen,
  },
  methodText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textDark,
  },
  methodTextActive: {
    color: Colors.white,
  },
  back: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  backText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.mediumGreen,
    textDecorationLine: 'underline',
  },
});
