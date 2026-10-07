import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette } from '@/constants/theme';
import { UserService } from '@/services/user-storage';

import { TextField } from './text-field';
import {
  announceError,
  AuthErrorCode,
  credentialsMatch,
  errorText,
  FieldErrors,
  hasErrors,
  SignInField,
  validateSignIn,
} from './validation';

interface SignInFormProps {
  language: AppLanguage;
  email: string;
  onEmailChange: (email: string) => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}

export function SignInForm({
  language,
  email,
  onEmailChange,
  onForgotPassword,
  onSuccess,
}: SignInFormProps) {
  const passwordRef = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignInField>>({});
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;
  const fieldError = (field: SignInField) => {
    const code = errors[field];
    return code ? errorText(code, language) : undefined;
  };

  const submit = () => {
    if (isSubmitting) return;
    const nextErrors = validateSignIn(email, password);
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) {
      announceError(nextErrors.email ?? nextErrors.password, language);
      return;
    }
    if (!credentialsMatch(email, password)) {
      setFormError('wrongCredentials');
      announceError('wrongCredentials', language);
      return;
    }
    setIsSubmitting(true);
    try {
      UserService.loginWithEmail(email.trim(), password);
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
        testID="auth-email"
        label={tr(language, 'Email', 'El. paštas')}
        language={language}
        value={email}
        onChangeText={(text) => {
          onEmailChange(text);
          setErrors((prev) => ({ ...prev, email: undefined }));
          setFormError(null);
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
      <TextField
        ref={passwordRef}
        testID="auth-password"
        label={tr(language, 'Password', 'Slaptažodis')}
        language={language}
        isPassword
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrors((prev) => ({ ...prev, password: undefined }));
          setFormError(null);
        }}
        error={fieldError('password')}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {formError ? (
        <View style={styles.formError} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text style={styles.formErrorText}>{errorText(formError, language)}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr(language, 'Forgot password?', 'Pamiršote slaptažodį?')}
        onPress={onForgotPassword}
        style={styles.forgot}>
        <Text style={styles.forgotText}>{tr(language, 'Forgot password?', 'Pamiršote slaptažodį?')}</Text>
      </Pressable>

      <Button
        testID="auth-sign-in-submit"
        label={tr(language, 'Sign in', 'Prisijungti')}
        icon="log-in-outline"
        onPress={submit}
        disabled={!canSubmit}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  formError: {
    backgroundColor: Palette.dangerTint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formErrorText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: Palette.danger },
  forgot: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', marginTop: -8 },
  forgotText: { fontSize: 14, fontWeight: '600', color: Palette.green },
});
