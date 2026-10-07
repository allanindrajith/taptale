import React, { useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Segmented, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { UserService } from '@/services/user-storage';

import { AppleButton, signInWithApple, useAppleSignInAvailable } from './apple-button';
import { ForgotPasswordSheet } from './forgot-password-sheet';
import { RegisterForm } from './register-form';
import { SignInForm } from './sign-in-form';
import { WelcomeHeader } from './welcome-header';

type AuthMode = 'signIn' | 'register';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const isAppleAvailable = useAppleSignInAvailable();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isAppleBusy, setIsAppleBusy] = useState(false);
  const [appleError, setAppleError] = useState(false);

  const done = () => onSuccess?.();

  const handleApple = async () => {
    setIsForgotOpen(false);
    setAppleError(false);
    setIsAppleBusy(true);
    const result = await signInWithApple();
    setIsAppleBusy(false);
    if (result === 'ok') {
      done();
    } else if (result === 'error') {
      setAppleError(true);
      AccessibilityInfo.announceForAccessibility(appleErrorText(language));
    }
  };

  const handleDemo = () => {
    UserService.loginAsDemo();
    done();
  };

  const isSignIn = mode === 'signIn';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}>
        <View style={styles.topBar}>
          <Text style={Type.title} accessibilityRole="header">
            {tr(language, 'Welcome', 'Sveiki')}
          </Text>
          <View style={styles.langToggle}>
            <Segmented<AppLanguage>
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'lt', label: 'LT' },
              ]}
            />
          </View>
        </View>

        <WelcomeHeader language={language} />

        <Segmented<AuthMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'signIn', label: tr(language, 'Sign in', 'Prisijungti') },
            { value: 'register', label: tr(language, 'Create account', 'Registruotis') },
          ]}
        />

        <Card style={styles.card}>
          {isSignIn ? (
            <SignInForm
              language={language}
              email={email}
              onEmailChange={setEmail}
              onForgotPassword={() => setIsForgotOpen(true)}
              onSuccess={done}
            />
          ) : (
            <RegisterForm
              language={language}
              email={email}
              onEmailChange={setEmail}
              onSwitchToSignIn={() => setMode('signIn')}
              onSuccess={done}
            />
          )}
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(isSignIn ? 'register' : 'signIn')}
          style={styles.switchLink}>
          <Text style={styles.switchText}>
            {isSignIn
              ? tr(language, 'New here? ', 'Čia pirmą kartą? ')
              : tr(language, 'Already have an account? ', 'Jau turite paskyrą? ')}
            <Text style={styles.switchStrong}>
              {isSignIn
                ? tr(language, 'Create an account', 'Sukurkite paskyrą')
                : tr(language, 'Sign in', 'Prisijunkite')}
            </Text>
          </Text>
        </Pressable>

        {isAppleAvailable ? (
          <View style={styles.apple}>
            <View style={styles.divider} accessible={false}>
              <View style={styles.rule} />
              <Text style={Type.small}>{tr(language, 'or', 'arba')}</Text>
              <View style={styles.rule} />
            </View>
            <AppleButton onPress={handleApple} isBusy={isAppleBusy} />
            {appleError ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {appleErrorText(language)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Button
          variant="ghost"
          icon="flask-outline"
          label={tr(language, 'Try the demo account', 'Išbandyti demo paskyrą')}
          onPress={handleDemo}
          style={styles.demo}
        />
      </ScrollView>

      <ForgotPasswordSheet
        visible={isForgotOpen}
        language={language}
        canUseApple={isAppleAvailable}
        onClose={() => setIsForgotOpen(false)}
        onUseApple={handleApple}
        onCreateAccount={() => {
          setIsForgotOpen(false);
          setMode('register');
        }}
      />
    </KeyboardAvoidingView>
  );
}

function appleErrorText(language: AppLanguage) {
  return tr(
    language,
    'Sign in with Apple didn’t work. Please try again or use your email.',
    'Nepavyko prisijungti su Apple. Bandykite dar kartą arba naudokite el. paštą.'
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  content: {
    paddingHorizontal: 20,
    gap: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  langToggle: { width: 96 },
  card: { padding: 20 },
  switchLink: { minHeight: 48, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 8 },
  switchText: { fontSize: 15, color: Palette.inkSoft, textAlign: 'center' },
  switchStrong: { fontWeight: '700', color: Palette.green },
  apple: { gap: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Palette.hairline },
  error: { fontSize: 14, lineHeight: 19, color: Palette.danger, fontWeight: '600', textAlign: 'center' },
  demo: { minHeight: 48, alignSelf: 'center' },
});
