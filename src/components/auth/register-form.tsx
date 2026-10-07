import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette } from '@/constants/theme';
import { UserService } from '@/services/user-storage';

import { TextField } from './text-field';
import {
  accountExists,
  announceError,
  AuthErrorCode,
  errorText,
  FieldErrors,
  hasErrors,
  REGISTER_MIN_PASSWORD,
  RegisterField,
  splitName,
  validateRegister,
} from './validation';

interface RegisterFormProps {
  language: AppLanguage;
  email: string;
  onEmailChange: (email: string) => void;
  onSwitchToSignIn: () => void;
  onSuccess: () => void;
}

export function RegisterForm({
  language,
  email,
  onEmailChange,
  onSwitchToSignIn,
  onSuccess,
}: RegisterFormProps) {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !isSubmitting;
  const fieldError = (field: RegisterField) => {
    const code = errors[field];
    return code ? errorText(code, language) : undefined;
  };
  const clearError = (field: RegisterField) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  };

  const submit = () => {
    if (isSubmitting) return;
    const base = validateRegister(name, email, password);
    const nextErrors: FieldErrors<RegisterField> =
      !base.email && accountExists(email) ? { ...base, email: 'accountExists' } : base;
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) {
      announceError(nextErrors.name ?? nextErrors.email ?? nextErrors.password, language);
      return;
    }
    setIsSubmitting(true);
    try {
      const { firstName, lastName } = splitName(name);
      UserService.registerUser({
        firstName,
        lastName,
        email: email.trim(),
        password,
        birthDate: '',
      });
      onSuccess();
    } catch {
      setFormError('unknown');
      announceError('unknown', language);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        testID="auth-name"
        label={tr(language, 'Your name', 'Jūsų vardas')}
        language={language}
        value={name}
        onChangeText={(text) => {
          setName(text);
          clearError('name');
        }}
        error={fieldError('name')}
        placeholder={tr(language, 'e.g. Ada Lovelace', 'pvz., Jonas Jonaitis')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        testID="auth-email"
        label={tr(language, 'Email', 'El. paštas')}
        language={language}
        value={email}
        onChangeText={(text) => {
          onEmailChange(text);
          clearError('email');
        }}
        error={fieldError('email')}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      {errors.email === 'accountExists' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(language, 'Sign in instead', 'Prisijungti')}
          onPress={onSwitchToSignIn}
          style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>{tr(language, 'Sign in instead', 'Prisijungti')}</Text>
        </Pressable>
      ) : null}
      <TextField
        ref={passwordRef}
        testID="auth-password"
        label={tr(language, 'Password', 'Slaptažodis')}
        language={language}
        isPassword
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearError('password');
        }}
        error={fieldError('password')}
        hint={tr(
          language,
          `At least ${REGISTER_MIN_PASSWORD} characters.`,
          `Bent ${REGISTER_MIN_PASSWORD} simboliai.`
        )}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {formError ? (
        <View style={styles.formError} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text style={styles.formErrorText}>{errorText(formError, language)}</Text>
        </View>
      ) : null}

      <Button
        testID="auth-register-submit"
        label={tr(language, 'Create account', 'Sukurti paskyrą')}
        icon="person-add-outline"
        onPress={submit}
        disabled={!canSubmit}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  inlineLink: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginTop: -10 },
  inlineLinkText: { fontSize: 14, fontWeight: '700', color: Palette.green },
  formError: {
    backgroundColor: Palette.dangerTint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formErrorText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: Palette.danger },
});
