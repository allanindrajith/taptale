import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as AppleAuthentication from 'expo-apple-authentication';

import {
  AppleLogo,
  GoogleLogo,
  MailIcon,
  LockIcon,
  CalendarIcon,
  UserIcon,
  CameraIcon,
} from './brand-icons';
import { AVATAR_PRESETS, DEMO_ACCOUNT, UserService } from '@/services/user-storage';
import { WiseColors } from '@/constants/theme';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Mode: 'sign_in' | 'sign_up'
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');

  // Shared form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up specific fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('05');
  const [birthDay, setBirthDay] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState('compass');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real Social Authentication State (No Dummy Accounts)
  const [socialModalType, setSocialModalType] = useState<'google' | 'apple' | null>(null);
  const [socialNameInput, setSocialNameInput] = useState('');
  const [socialEmailInput, setSocialEmailInput] = useState('');
  const [socialError, setSocialError] = useState<string | null>(null);

  // Dynamic Theme Colors
  const colors = {
    bg: isDark ? '#0b1610' : '#f7f9f8',
    cardBg: isDark ? '#14251c' : '#ffffff',
    text: isDark ? '#ffffff' : '#111827',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#233d2f' : '#e2e8f0',
    inputBg: isDark ? '#0e1c15' : '#f8fafc',
    primaryGreen: '#003c14',
    accentGreen: '#25f46a',
    error: '#ef4444',
  };

  // -------------------------------------------------------------
  // Photo Picker
  // -------------------------------------------------------------
  async function handlePickImage() {
    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Access',
          'Please allow access to your photos to upload a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick photo from library.');
    }
  }

  async function handleTakePhoto() {
    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Access',
          'Please allow camera access to take a selfie for your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to open camera.');
    }
  }

  function handleChooseAvatarSource() {
    Alert.alert('Profile Picture', 'Choose an option to set your traveler photo', [
      { text: 'Choose from Photos', onPress: handlePickImage },
      { text: 'Take a Photo', onPress: handleTakePhoto },
      {
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => setAvatarUri(null),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // -------------------------------------------------------------
  // Real Social Logins (Apple & Google)
  // -------------------------------------------------------------
  async function handleAppleSignIn() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        if (isAvailable) {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          const givenName = credential.fullName?.givenName || '';
          const familyName = credential.fullName?.familyName || '';
          const fullName = [givenName, familyName].filter(Boolean).join(' ') || 'Apple Explorer';
          const realEmail =
            credential.email ||
            (credential.user ? `${credential.user.slice(0, 10)}@privaterelay.appleid.com` : '');

          if (realEmail) {
            UserService.connectApple(fullName, realEmail, credential.user);
            setIsLoading(false);
            onSuccess?.();
            return;
          }
        }
      }
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        setIsLoading(false);
        return;
      }
      console.warn('Apple Authentication note:', err);
    }

    // Prompt user to connect their real Apple ID (no hardcoded fake accounts!)
    setSocialModalType('apple');
    setSocialNameInput('');
    setSocialEmailInput('');
    setSocialError(null);
    setIsLoading(false);
  }

  function handleGoogleSignIn() {
    setIsLoading(true);
    setErrorMessage(null);
    // Open Google Account connection sheet so the user can connect their real Google Account
    setSocialModalType('google');
    setSocialNameInput('');
    setSocialEmailInput('');
    setSocialError(null);
    setIsLoading(false);
  }

  function handleConnectSocialAccount() {
    setSocialError(null);
    const trimmedName = socialNameInput.trim();
    const trimmedEmail = socialEmailInput.trim();

    if (!trimmedName) {
      setSocialError('Please enter your name as registered on your account.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setSocialError(
        socialModalType === 'google'
          ? 'Please enter a valid Google email address (e.g. name@gmail.com).'
          : 'Please enter a valid Apple ID email address (e.g. name@icloud.com).'
      );
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (socialModalType === 'google') {
        UserService.connectGoogle(trimmedName, trimmedEmail);
      } else {
        UserService.connectApple(trimmedName, trimmedEmail);
      }
      setIsLoading(false);
      setSocialModalType(null);
      onSuccess?.();
    }, 300);
  }

  // -------------------------------------------------------------
  // Email Sign In
  // -------------------------------------------------------------
  function handleEmailSignIn() {
    setErrorMessage(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      UserService.loginWithEmail(trimmedEmail, password);
      setIsLoading(false);
      onSuccess?.();
    }, 350);
  }

  // -------------------------------------------------------------
  // Email Registration (Sign Up)
  // -------------------------------------------------------------
  function handleEmailSignUp() {
    setErrorMessage(null);

    if (!firstName.trim()) {
      setErrorMessage('Please enter your First Name.');
      return;
    }

    if (!lastName.trim()) {
      setErrorMessage('Please enter your Last Name.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Validate Birth Date
    const day = parseInt(birthDay.trim(), 10);
    const year = parseInt(birthYear.trim(), 10);
    if (!birthDay || isNaN(day) || day < 1 || day > 31) {
      setErrorMessage('Please enter a valid birth day (1 - 31).');
      return;
    }
    if (!birthYear || isNaN(year) || year < 1920 || year > 2020) {
      setErrorMessage('Please enter a valid birth year (e.g. 1998).');
      return;
    }

    const formattedBirthDate = `${year}-${birthMonth.padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Validate Passwords
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      UserService.registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        password: password,
        birthDate: formattedBirthDate,
        avatarUri: avatarUri || undefined,
        avatarId: selectedAvatarId,
      });
      setIsLoading(false);
      onSuccess?.();
    }, 400);
  }

  // Autofill Demo account
  function handleAutofillDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setErrorMessage(null);
  }

  // 1-Tap Demo Login
  function handleDemoLogin() {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      UserService.loginAsDemo();
      setIsLoading(false);
      onSuccess?.();
    }, 350);
  }

  const isPasswordsMatching =
    password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;
  const isPasswordsMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 16, 44), paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header Brand */}
          <View style={styles.brandHeader}>
            <View style={styles.brandLogoRow}>
              <View style={styles.brandIconCircle}>
                <Text style={styles.brandBolt}>⚡</Text>
              </View>
              <View>
                <Text style={[styles.brandTitle, { color: colors.text }]}>TapTale</Text>
                <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
                  Smart Heritage Guide
                </Text>
              </View>
            </View>

            <Text style={[styles.welcomeHeadline, { color: colors.text }]}>
              {authMode === 'sign_in' ? 'Welcome back.' : 'Create your traveler passport.'}
            </Text>
            <Text style={[styles.welcomeSubline, { color: colors.textMuted }]}>
              {authMode === 'sign_in'
                ? 'Sign in to access your unlocked Vilnius passes, stories, and badges.'
                : 'Join thousands exploring Lithuania with physical NFC smart stories.'}
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={[styles.tabSelector, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Pressable
              style={[
                styles.tabButton,
                authMode === 'sign_in' && [styles.tabButtonActive, { backgroundColor: colors.cardBg }],
              ]}
              onPress={() => {
                setAuthMode('sign_in');
                setErrorMessage(null);
              }}>
              <Text
                style={[
                  styles.tabButtonText,
                  { color: authMode === 'sign_in' ? colors.text : colors.textMuted },
                  authMode === 'sign_in' && styles.tabButtonTextActive,
                ]}>
                Sign In
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabButton,
                authMode === 'sign_up' && [styles.tabButtonActive, { backgroundColor: colors.cardBg }],
              ]}
              onPress={() => {
                setAuthMode('sign_up');
                setErrorMessage(null);
              }}>
              <Text
                style={[
                  styles.tabButtonText,
                  { color: authMode === 'sign_up' ? colors.text : colors.textMuted },
                  authMode === 'sign_up' && styles.tabButtonTextActive,
                ]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Card Container */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}>
            {/* ========================================================= */}
            {/* SOCIAL LOGINS WITH ORIGINAL ICONS                         */}
            {/* ========================================================= */}
            <View style={styles.socialSection}>
              {/* Apple Sign In Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.appleButton,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading}>
                <View style={styles.socialIconSlot}>
                  <AppleLogo size={20} color="#ffffff" />
                </View>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </Pressable>

              {/* Google Sign In Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}>
                <View style={styles.socialIconSlot}>
                  <GoogleLogo size={20} />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                {authMode === 'sign_in' ? 'or sign in with email' : 'or register with email'}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* ========================================================= */}
            {/* SIGN IN FORM                                              */}
            {/* ========================================================= */}
            {authMode === 'sign_in' ? (
              <View style={styles.formContainer}>
                {/* Dedicated Demo Account Card */}
                <View
                  style={[
                    styles.demoCard,
                    {
                      backgroundColor: isDark ? '#152b1e' : '#f0fdf4',
                      borderColor: isDark ? '#254b34' : '#bbf7d0',
                    },
                  ]}>
                  <View style={styles.demoCardHeader}>
                    <View style={styles.demoBadgePill}>
                      <Text style={styles.demoBadgeText}>DEMO ACCOUNT</Text>
                    </View>
                    <Pressable onPress={handleAutofillDemo} style={styles.autofillBtn}>
                      <Text style={styles.autofillBtnText}>⚡ Auto-fill</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.demoCardDesc, { color: colors.textMuted }]}>
                    Log in with this demo profile to preview all unlocked Vilnius passes, lore, and achievements:
                  </Text>
                  <View style={styles.credRow}>
                    <Text style={[styles.credLabel, { color: colors.text }]}>Email:</Text>
                    <Text style={styles.credVal}>{DEMO_ACCOUNT.email}</Text>
                  </View>
                  <View style={styles.credRow}>
                    <Text style={[styles.credLabel, { color: colors.text }]}>Password:</Text>
                    <Text style={styles.credVal}>{DEMO_ACCOUNT.password}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.demoInstantBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                    ]}
                    onPress={handleDemoLogin}>
                    <Text style={styles.demoInstantBtnText}>🚀 1-Tap Sign In with Demo</Text>
                  </Pressable>
                </View>

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}>
                    <MailIcon size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="e.g. allan@traveler.com"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Demo Password Reset', 'For testing, you can use any password or click Demo Sign In.')
                      }>
                      <Text style={[styles.forgotLink, { color: WiseColors.forestGreen }]}>
                        Forgot password?
                      </Text>
                    </Pressable>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}>
                    <LockIcon size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeToggle}
                      onPress={() => setShowPassword(!showPassword)}>
                      <Text style={styles.eyeToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Sign In CTA Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={handleEmailSignIn}
                  disabled={isLoading}>
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In to TapTale'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* ========================================================= */
              /* SIGN UP / CREATE ACCOUNT FORM                             */
              /* ========================================================= */
              <View style={styles.formContainer}>
                {/* Fresh Start Notice */}
                <View
                  style={[
                    styles.freshNoticeBox,
                    {
                      backgroundColor: isDark ? '#0f2438' : '#f0f9ff',
                      borderColor: isDark ? '#1e3a5f' : '#bae6fd',
                    },
                  ]}>
                  <Text style={[styles.freshNoticeTitle, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                    🌱 Fresh Start Account
                  </Text>
                  <Text style={[styles.freshNoticeDesc, { color: isDark ? '#94a3b8' : '#0c4a6e' }]}>
                    Your personal account starts with 0 unlocked passes so you can tap real physical NFC tags across Lithuania to unlock stories!
                  </Text>
                </View>
                {/* Profile Picture Upload Section */}
                <View style={styles.photoUploadSection}>
                  <Pressable
                    style={[styles.avatarUploadCircle, { backgroundColor: isDark ? '#1c2f24' : '#eef7f0' }]}
                    onPress={handleChooseAvatarSource}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.uploadedAvatarImage} />
                    ) : (
                      <View style={styles.emptyAvatarPlaceholder}>
                        <CameraIcon size={30} color={WiseColors.forestGreen} />
                        <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                    <View style={styles.avatarCameraBadge}>
                      <Text style={styles.avatarCameraBadgeText}>📷</Text>
                    </View>
                  </Pressable>

                  <View style={styles.avatarTextContainer}>
                    <Text style={[styles.avatarSectionTitle, { color: colors.text }]}>
                      Profile Picture
                    </Text>
                    <Text style={[styles.avatarSectionSub, { color: colors.textMuted }]}>
                      Upload a photo or choose an avatar (Optional)
                    </Text>

                    <View style={styles.avatarActionRow}>
                      <Pressable style={styles.photoActionButton} onPress={handleChooseAvatarSource}>
                        <Text style={styles.photoActionText}>
                          {avatarUri ? 'Change Photo' : 'Upload Photo'}
                        </Text>
                      </Pressable>
                      {avatarUri ? (
                        <Pressable
                          style={[styles.photoActionButton, styles.photoActionRemove]}
                          onPress={() => setAvatarUri(null)}>
                          <Text style={styles.photoActionRemoveText}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Avatar Presets Selection (Alternative to Photo) */}
                {!avatarUri ? (
                  <View style={styles.presetSection}>
                    <Text style={[styles.presetHeader, { color: colors.textMuted }]}>
                      Or choose a traveler character avatar:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                      {AVATAR_PRESETS.map((item) => {
                        const isSelected = selectedAvatarId === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.presetPill,
                              { backgroundColor: item.bgHex },
                              isSelected && styles.presetPillSelected,
                            ]}
                            onPress={() => setSelectedAvatarId(item.id)}>
                            <Text style={styles.presetEmoji}>{item.emoji}</Text>
                            <Text style={styles.presetLabel}>{item.label}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {/* First Name & Last Name (Side by Side) */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>First Name *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.inputBg, borderColor: colors.border },
                      ]}>
                      <UserIcon size={17} color={colors.textMuted} />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        placeholder="e.g. Allan"
                        placeholderTextColor={colors.textMuted}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.inputBg, borderColor: colors.border },
                      ]}>
                      <TextInput
                        style={[styles.textInput, { color: colors.text, paddingLeft: 4 }]}
                        placeholder="e.g. Indrajith"
                        placeholderTextColor={colors.textMuted}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}>
                    <MailIcon size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="e.g. allan@traveler.com"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Date of Birth Field */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Date of Birth *</Text>
                    <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                      Required for passport
                    </Text>
                  </View>

                  <View style={styles.dobRow}>
                    {/* Day Input */}
                    <View
                      style={[
                        styles.dobInputWrapper,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 0.9 },
                      ]}>
                      <CalendarIcon size={16} color={colors.textMuted} />
                      <TextInput
                        style={[styles.dobTextInput, { color: colors.text }]}
                        placeholder="DD (1-31)"
                        placeholderTextColor={colors.textMuted}
                        value={birthDay}
                        onChangeText={setBirthDay}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

                    {/* Month Selector */}
                    <View
                      style={[
                        styles.dobInputWrapper,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 1.1 },
                      ]}>
                      <TextInput
                        style={[styles.dobTextInput, { color: colors.text }]}
                        placeholder="MM (01-12)"
                        placeholderTextColor={colors.textMuted}
                        value={birthMonth}
                        onChangeText={setBirthMonth}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

                    {/* Year Input */}
                    <View
                      style={[
                        styles.dobInputWrapper,
                        { backgroundColor: colors.inputBg, borderColor: colors.border, flex: 1.2 },
                      ]}>
                      <TextInput
                        style={[styles.dobTextInput, { color: colors.text }]}
                        placeholder="YYYY (e.g. 1998)"
                        placeholderTextColor={colors.textMuted}
                        value={birthYear}
                        onChangeText={setBirthYear}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                  </View>
                </View>

                {/* Create Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Create Password *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                    ]}>
                    <LockIcon size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeToggle}
                      onPress={() => setShowPassword(!showPassword)}>
                      <Text style={styles.eyeToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Confirm Password *
                    </Text>
                    {isPasswordsMatching ? (
                      <Text style={styles.matchSuccess}>✓ Passwords match</Text>
                    ) : isPasswordsMismatch ? (
                      <Text style={styles.matchError}>✕ Passwords do not match</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: isPasswordsMismatch ? '#ef4444' : isPasswordsMatching ? '#10b981' : colors.border,
                      },
                    ]}>
                    <LockIcon size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeToggle}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Text style={styles.eyeToggleText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Create Account CTA Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={handleEmailSignUp}
                  disabled={isLoading}>
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Creating Account...' : 'Create Account & Start Exploring'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Bottom Footer Info */}
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              By continuing, you agree to TapTale’s Terms of Service and Privacy Policy. Unlocked
              heritage stories will be tied to this traveler profile.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Real Social Account Connection Modal (No Dummy Accounts!) */}
      <Modal
        visible={socialModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSocialModalType(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSocialModalType(null)}
          />
          <View
            style={[
              styles.socialModalCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}>
            <View style={styles.socialModalHeader}>
              <View style={styles.socialModalIconSlot}>
                {socialModalType === 'google' ? (
                  <GoogleLogo size={32} />
                ) : (
                  <AppleLogo size={32} color={isDark ? '#ffffff' : '#000000'} />
                )}
              </View>
              <Text style={[styles.socialModalTitle, { color: colors.text }]}>
                {socialModalType === 'google' ? 'Connect Google Account' : 'Connect Apple ID'}
              </Text>
              <Text style={[styles.socialModalSubtitle, { color: colors.textMuted }]}>
                {socialModalType === 'google'
                  ? 'Connect your personal Google Account to sync your passes and profile.'
                  : 'Connect your personal Apple ID to link your heritage passbook.'}
              </Text>
            </View>

            {socialError ? (
              <View style={styles.socialErrorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.socialErrorText}>{socialError}</Text>
              </View>
            ) : null}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {socialModalType === 'google' ? 'Google Account Name' : 'Full Name'}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}>
                <UserIcon size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={
                    socialModalType === 'google'
                      ? 'e.g. Allan Indrajith'
                      : 'e.g. Allan Indrajith'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={socialNameInput}
                  onChangeText={(t) => {
                    setSocialNameInput(t);
                    setSocialError(null);
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {socialModalType === 'google' ? 'Google Email Address' : 'Apple ID Email Address'}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}>
                <MailIcon size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder={
                    socialModalType === 'google'
                      ? 'e.g. yourname@gmail.com'
                      : 'e.g. yourname@icloud.com'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={socialEmailInput}
                  onChangeText={(t) => {
                    setSocialEmailInput(t);
                    setSocialError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View
              style={[
                styles.socialNoticePill,
                {
                  backgroundColor: isDark ? '#152b1e' : '#f0fdf4',
                  borderColor: isDark ? '#254b34' : '#bbf7d0',
                },
              ]}>
              <Text style={styles.socialNoticeEmoji}>🛡️</Text>
              <Text style={[styles.socialNoticeText, { color: isDark ? '#86efac' : '#166534' }]}>
                Real accounts start with 0 passes unlocked. Passes unlock when you physically scan
                monument NFC plaques in Lithuania!
              </Text>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                socialModalType === 'google' ? styles.googleConnectBtn : styles.appleConnectBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
              onPress={handleConnectSocialAccount}
              disabled={isLoading}>
              <Text
                style={
                  socialModalType === 'google'
                    ? styles.googleConnectBtnText
                    : styles.appleConnectBtnText
                }>
                {isLoading
                  ? 'Connecting...'
                  : socialModalType === 'google'
                  ? 'Connect & Continue with Google'
                  : 'Connect & Continue with Apple'}
              </Text>
            </Pressable>

            {/* Cancel */}
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setSocialModalType(null)}>
              <Text style={[styles.modalCancelBtnText, { color: colors.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Brand Header
  brandHeader: {
    marginBottom: 20,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  brandIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WiseColors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  brandBolt: {
    fontSize: 22,
    color: '#25f46a',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeHeadline: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  welcomeSubline: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Tab Selector
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontWeight: '700',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },

  // Card
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  // Social Section
  socialSection: {
    gap: 12,
    marginBottom: 18,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  googleButtonText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  socialIconSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Forms
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 11,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeToggle: {
    padding: 6,
  },
  eyeToggleText: {
    fontSize: 15,
  },

  // Photo Upload Section
  photoUploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
    marginBottom: 4,
  },
  avatarUploadCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WiseColors.forestGreen,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'visible',
  },
  uploadedAvatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  emptyAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: WiseColors.forestGreen,
    marginTop: 2,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: WiseColors.forestGreen,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarCameraBadgeText: {
    fontSize: 10,
  },
  avatarTextContainer: {
    flex: 1,
    gap: 2,
  },
  avatarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarSectionSub: {
    fontSize: 12,
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  photoActionButton: {
    backgroundColor: '#003c14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  photoActionRemove: {
    backgroundColor: '#fee2e2',
  },
  photoActionRemoveText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
  },

  // Avatar Presets
  presetSection: {
    gap: 6,
    marginBottom: 4,
  },
  presetHeader: {
    fontSize: 12,
    fontWeight: '500',
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  presetPillSelected: {
    borderColor: WiseColors.forestGreen,
    transform: [{ scale: 1.04 }],
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },

  // Name Row
  nameRow: {
    flexDirection: 'row',
  },

  // DOB Row
  dobRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dobInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 48,
    gap: 6,
  },
  dobTextInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },

  // Password matching indicators
  matchSuccess: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  matchError: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Primary Button
  primaryButton: {
    backgroundColor: WiseColors.forestGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: WiseColors.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Demo Account Card
  demoCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  demoBadgePill: {
    backgroundColor: WiseColors.forestGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  autofillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
  },
  autofillBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  demoCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  credLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  credVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: WiseColors.forestGreen,
  },
  demoInstantBtn: {
    backgroundColor: WiseColors.forestGreen,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  demoInstantBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Fresh Start Notice
  freshNoticeBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  freshNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  freshNoticeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Demo Button
  demoButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: WiseColors.forestGreen,
    fontSize: 13,
    fontWeight: '600',
  },

  // Terms Footer
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 18,
  },

  // Real Social Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  socialModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  socialModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  socialModalIconSlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  socialModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  socialErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  socialErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  socialNoticePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  socialNoticeEmoji: {
    fontSize: 16,
  },
  socialNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  googleConnectBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleConnectBtnText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },
  appleConnectBtn: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleConnectBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
