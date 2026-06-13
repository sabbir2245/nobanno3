import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ApiError } from '@/services/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { authStyles } from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import '../../localization/i18n'; // Ensure the config is loaded

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();

  // Functional configurations
  const [identityInput, setIdentityInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPass, setShowPass] = useState<boolean>(false);

  // Force re-render on language change
  const [, setTick] = useState(0);
  useEffect(() => {
    const handleLanguageChange = () => setTick((prev) => prev + 1);
    i18n.on('languageChanged', handleLanguageChange);
    return () => { i18n.off('languageChanged', handleLanguageChange); };
  }, []);

  const toggleLanguage = (): void => {
    i18n.changeLanguage(i18n.language === 'en' ? 'bn' : 'en');
  };

  const handleLogin = async (): Promise<void> => {
    if (!identityInput.trim() || !password) {
      Alert.alert(t('Missing fields'), t('Please fill in all details.'));
      return;
    }
    
    setLoading(true);
    try {
      // Pass raw text directly (handles username, email, or phone back-end side)
      const loggedInUser = await login(identityInput.trim(), password);
      
      if (loggedInUser?.role === 'farmer') {
        router.replace('/(farmer)/dashboard');
      } else if (loggedInUser?.role === 'customer') {
        router.replace('/(customer)/home');
      } else {
        throw new Error(t('Unknown user role'));
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={authStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={authStyles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={authStyles.brand}>Nobanno</Text>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
            <Ionicons name="language" size={16} color={Colors.darkGreen} style={{ marginRight: 4 }} />
            <Text style={styles.langToggleText}>{i18n.language === 'en' ? 'বাংলা' : 'English'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={authStyles.title}>{t('Welcome back')}</Text>
        <Text style={styles.subtitle}>{t('log in')}</Text>

        <InputField
          label={t('Username, Email, or Phone')}
          value={identityInput}
          onChangeText={setIdentityInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address" // Allows text characters, symbols, and numbers fluidly
          placeholder={t('Enter username, email, or phone')}
        />

        <View style={styles.passwordWrapper}>
          <View style={{ flex: 1 }}>
            <InputField
              label={t("Password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder={t("Enter your password")}
            />
          </View>
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off' : 'eye'} size={22} color={Colors.mediumGreen} />
          </TouchableOpacity>
        </View>

        <Link href="/auth/forgot" asChild>
          <TouchableOpacity>
            <Text style={styles.forgot}>{t('Forgot password?')}</Text>
          </TouchableOpacity>
        </Link>

        <PrimaryButton title={t("Login")} onPress={handleLogin} loading={loading} />

        <View style={authStyles.footer}>
          <Text style={authStyles.footerText}>{t("Don't have an account?")}</Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={authStyles.link}>{t('Sign up')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mediumGreen,
  },
  langToggleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.darkGreen,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  eyeIconContainer: {
    position: 'absolute',
    right: 12,
    bottom: 14,
    zIndex: 5,
  },
  forgot: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.mediumGreen,
    textAlign: 'right',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
    textDecorationLine: 'underline',
  },
});