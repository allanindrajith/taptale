/**
 * Auth form validation + bilingual error copy.
 * Pure helpers: they only read the stored profile, never write anything.
 */
import { AccessibilityInfo } from 'react-native';

import { tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { DEMO_ACCOUNT, UserService } from '@/services/user-storage';

/** Same minimums the previous auth screen enforced before calling UserService. */
export const SIGN_IN_MIN_PASSWORD = 4;
export const REGISTER_MIN_PASSWORD = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthErrorCode =
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordShortSignIn'
  | 'passwordShortRegister'
  | 'wrongCredentials'
  | 'accountExists'
  | 'unknown';

export type FieldErrors<K extends string> = Partial<Record<K, AuthErrorCode>>;

export function errorText(code: AuthErrorCode, lang: AppLanguage): string {
  switch (code) {
    case 'nameRequired':
      return tr(lang, 'Please enter your name.', 'Įveskite savo vardą.');
    case 'emailRequired':
      return tr(lang, 'Please enter your email.', 'Įveskite el. paštą.');
    case 'emailInvalid':
      return tr(lang, 'That email doesn’t look right (e.g. name@example.com).', 'El. paštas atrodo neteisingas (pvz., vardas@pastas.lt).');
    case 'passwordRequired':
      return tr(lang, 'Please enter your password.', 'Įveskite slaptažodį.');
    case 'passwordShortSignIn':
      return tr(lang, `Password must be at least ${SIGN_IN_MIN_PASSWORD} characters.`, `Slaptažodį turi sudaryti bent ${SIGN_IN_MIN_PASSWORD} simboliai.`);
    case 'passwordShortRegister':
      return tr(lang, `Use at least ${REGISTER_MIN_PASSWORD} characters.`, `Naudokite bent ${REGISTER_MIN_PASSWORD} simbolius.`);
    case 'wrongCredentials':
      return tr(lang, 'Email or password is incorrect.', 'Neteisingas el. paštas arba slaptažodis.');
    case 'accountExists':
      return tr(lang, 'An account with this email already exists on this phone. Sign in instead.', 'Paskyra su šiuo el. paštu šiame telefone jau yra. Prisijunkite.');
    case 'unknown':
      return tr(lang, 'Something went wrong. Please try again.', 'Kažkas nepavyko. Bandykite dar kartą.');
  }
}

function sameEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function validateEmail(email: string): AuthErrorCode | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'emailRequired';
  if (!EMAIL_PATTERN.test(trimmed)) return 'emailInvalid';
  return undefined;
}

export type SignInField = 'email' | 'password';
export type RegisterField = 'name' | 'email' | 'password';

export function validateSignIn(email: string, password: string): FieldErrors<SignInField> {
  const errors: FieldErrors<SignInField> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'passwordRequired';
  else if (password.length < SIGN_IN_MIN_PASSWORD) errors.password = 'passwordShortSignIn';
  return errors;
}

export function validateRegister(name: string, email: string, password: string): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};
  if (!name.trim()) errors.name = 'nameRequired';
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'passwordRequired';
  else if (password.length < REGISTER_MIN_PASSWORD) errors.password = 'passwordShortRegister';
  return errors;
}

/**
 * Accounts only live on this phone, so the only password we can check against is the
 * one stored with the local profile (or the demo account's). Unknown emails keep the
 * previous behaviour: `loginWithEmail` signs them in.
 */
export function credentialsMatch(email: string, password: string): boolean {
  if (sameEmail(email, DEMO_ACCOUNT.email)) return password === DEMO_ACCOUNT.password;
  const stored = UserService.getProfile();
  if (stored.email && sameEmail(email, stored.email) && stored.password) {
    return stored.password === password;
  }
  return true;
}

/** True when this email already belongs to the account on this phone (or the demo). */
export function accountExists(email: string): boolean {
  if (sameEmail(email, DEMO_ACCOUNT.email)) return true;
  const stored = UserService.getProfile();
  return !!stored.email && sameEmail(email, stored.email);
}

/** Split "Ada Lovelace King" into first name + the rest, as `registerUser` expects. */
export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function hasErrors(errors: Record<string, unknown>) {
  return Object.values(errors).some(Boolean);
}

/** Read the first error aloud for screen-reader users. */
export function announceError(code: AuthErrorCode | undefined, lang: AppLanguage) {
  if (code) AccessibilityInfo.announceForAccessibility(errorText(code, lang));
}
