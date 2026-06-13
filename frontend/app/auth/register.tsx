import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ApiError } from '@/services/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { authStyles } from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();


  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'farmer',
    phone_number: '',
    address: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const roleOptions = [
    { label: 'কৃষক', value: 'farmer' },
    { label: 'ক্রেতা', value: 'customer' },
  ];

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.phone_number || !form.password || !form.role) {
      Alert.alert('তথ্য অনুপস্থিত', 'ইউজারনেম, ইমেইল, ফোন, ভূমিকা এবং পাসওয়ার্ড আবশ্যক।');
      return;
    }

    if (form.password.length < 8) {
      Alert.alert('পাসওয়ার্ড সমস্যা', 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    if (form.password !== confirmPassword) {
      Alert.alert('পাসওয়ার্ড মিলছে না', 'পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড একই হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      await register({ ...form, role: form.role as any });
      Alert.alert('অ্যাকাউন্ট তৈরি হয়েছে', 'আপনার নতুন অ্যাকাউন্ট দিয়ে লগইন করুন।', [
        { text: 'ঠিক আছে', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'নিবন্ধন ব্যর্থ হয়েছে';
      Alert.alert('সাইন আপ ব্যর্থ হয়েছে', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={authStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={authStyles.container}>
        <Text style={authStyles.brand}>Nobanno</Text>
        <Text style={authStyles.title}>অ্যাকাউন্ট তৈরি করুন</Text>

        <InputField
          label="পূর্ণ নাম"
          value={form.name}
          onChangeText={(v) => update('name', v)}
          placeholder="আপনার নাম"
        />

        <Text style={styles.label}>আপনার ভূমিকা নির্বাচন করুন</Text>
        <TouchableOpacity
          style={styles.selectBox}
          onPress={() => setRoleModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.selectBoxContent}>
            <Ionicons
              name={form.role === 'farmer' ? 'leaf-outline' : 'cart-outline'}
              size={20}
              color={Colors.mediumGreen}
              style={styles.selectIcon}
            />
            <Text style={styles.selectBoxText}>
              {roleOptions.find((r) => r.value === form.role)?.label}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={Colors.mediumGreen} />
        </TouchableOpacity>

        <Modal
          visible={roleModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRoleModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setRoleModalVisible(false)}
          >
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>ভূমিকা নির্বাচন করুন</Text>
              {roleOptions.map((option) => {
                const selected = form.role === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      update('role', option.value);
                      setRoleModalVisible(false);
                    }}
                  >
                    <View style={styles.selectBoxContent}>
                      <Ionicons
                        name={option.value === 'farmer' ? 'leaf-outline' : 'cart-outline'}
                        size={20}
                        color={selected ? Colors.white : Colors.mediumGreen}
                        style={styles.selectIcon}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark" size={20} color={Colors.white} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        <InputField
          label="ইউজারনেম"
          value={form.username}
          onChangeText={(v) => update('username', v)}
          autoCapitalize="none"
          placeholder="একটি ইউজারনেম নির্বাচন করুন"
        />
        <InputField
          label="ইমেইল"
          value={form.email}
          onChangeText={(v) => update('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@email.com"
        />
        <InputField
          label="ফোন নম্বর"
          value={form.phone_number}
          onChangeText={(v) => update('phone_number', v)}
          keyboardType="phone-pad"
          placeholder="01XXXXXXXXX"
        />
        <InputField
          label="ঠিকানা"
          value={form.address}
          onChangeText={(v) => update('address', v)}
          placeholder="ডেলিভারি / খামারের ঠিকানা"
        />

        <Text style={styles.label}>পাসওয়ার্ড</Text>
        <View style={styles.passwordRow}>
          <View style={styles.passwordInputWrapper}>
            <InputField
              value={form.password}
              onChangeText={(v) => update('password', v)}
              secureTextEntry={!showPassword}
              placeholder="সুরক্ষিত পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
            />
          </View>
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color={Colors.mediumGreen}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>পাসওয়ার্ড নিশ্চিত করুন</Text>
        <View style={styles.passwordRow}>
          <View style={styles.passwordInputWrapper}>
            <InputField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="পাসওয়ার্ড আবার লিখুন"
            />
          </View>
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword((prev) => !prev)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={22}
              color={Colors.mediumGreen}
            />
          </TouchableOpacity>
        </View>
        {form.password.length > 0 && form.password.length < 8 && (
          <Text style={styles.errorText}>পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।</Text>
        )}
        {confirmPassword.length > 0 && form.password !== confirmPassword && (
          <Text style={styles.errorText}>পাসওয়ার্ড মিলছে না।</Text>
        )}

        <PrimaryButton title="সাইন আপ" onPress={handleRegister} loading={loading} />

        <View style={authStyles.footer}>
          <Text style={authStyles.footerText}>আগে থেকেই অ্যাকাউন্ট আছে?</Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={authStyles.link}>লগইন</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  selectBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectIcon: {
    marginRight: 8,
  },
  selectBoxText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.textDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg ?? 24,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md ?? 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: Spacing.sm ?? 12,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F5F7F4',
  },
  optionRowSelected: {
    backgroundColor: Colors.mediumGreen,
  },
  optionText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textDark,
  },
  optionTextSelected: {
    color: Colors.white,
    fontFamily: Fonts.medium,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.mediumGreen,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputWrapper: {
    flex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: Spacing.sm ?? 12,
    top: 14,
    padding: 4,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#D14343',
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
});