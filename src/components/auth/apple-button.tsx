import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { UserService } from '@/services/user-storage';

const BUTTON_HEIGHT = 52;
const BUTTON_RADIUS = 16;

export type AppleSignInResult = 'ok' | 'canceled' | 'error';

/** True only on iOS devices where Sign in with Apple is actually available. */
export function useAppleSignInAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let isActive = true;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isActive) setIsAvailable(available);
      })
      .catch(() => {
        if (isActive) setIsAvailable(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return isAvailable;
}

function isCanceled(err: unknown) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'ERR_REQUEST_CANCELED'
  );
}

/**
 * Runs the native Apple sheet and connects the account via `UserService.connectApple`.
 * Apple only shares name + email on the very first sign-in, so on later sign-ins we reuse
 * what this phone already stored for the same Apple user id (read-only).
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const stored = UserService.getProfile();
    const isKnownAppleUser = stored.id === `usr_apple_${credential.user}`;

    const givenName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const fullName = givenName || (isKnownAppleUser ? stored.name : '') || 'Apple Traveler';

    const email =
      credential.email ||
      (isKnownAppleUser ? stored.email : '') ||
      `${credential.user.slice(0, 10)}@privaterelay.appleid.com`;

    UserService.connectApple(fullName, email, credential.user);
    return 'ok';
  } catch (err) {
    return isCanceled(err) ? 'canceled' : 'error';
  }
}

interface AppleButtonProps {
  onPress: () => void;
  isBusy?: boolean;
}

/** Apple's own "Sign in with Apple" button (required by App Store guidelines). */
export function AppleButton({ onPress, isBusy }: AppleButtonProps) {
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={BUTTON_RADIUS}
      style={[styles.button, isBusy && styles.busy]}
      onPress={() => {
        if (!isBusy) onPress();
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', height: BUTTON_HEIGHT },
  busy: { opacity: 0.55 },
});
