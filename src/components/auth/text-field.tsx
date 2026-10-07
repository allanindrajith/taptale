import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';

const TOGGLE_SIZE = 48;

type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  ref?: React.Ref<TextInput>;
  label: string;
  language: AppLanguage;
  /** Already-translated error message; shown under the field and announced. */
  error?: string;
  /** Treat as a password: hidden by default with a show/hide toggle. */
  isPassword?: boolean;
  /** Optional helper shown when there is no error. */
  hint?: string;
};

/** Labelled text input with inline error and optional show/hide password toggle. */
export function TextField({
  ref,
  label,
  language,
  error,
  isPassword,
  hint,
  ...inputProps
}: TextFieldProps) {
  const [isHidden, setIsHidden] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const message = error ?? hint;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} accessible={false}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}>
        <TextInput
          ref={ref}
          {...inputProps}
          style={styles.input}
          placeholderTextColor={Palette.mute}
          secureTextEntry={isPassword ? isHidden : false}
          autoCorrect={isPassword ? false : inputProps.autoCorrect}
          accessibilityLabel={label}
          accessibilityHint={error}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isHidden
                ? tr(language, 'Show password', 'Rodyti slaptažodį')
                : tr(language, 'Hide password', 'Slėpti slaptažodį')
            }
            onPress={() => setIsHidden((v) => !v)}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
            <Ionicons
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={Palette.inkSoft}
            />
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          {error ? <Ionicons name="alert-circle" size={15} color={Palette.danger} /> : null}
          <Text style={error ? styles.error : styles.hint}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...Type.label, color: Palette.inkSoft, fontSize: 13, letterSpacing: 0.2 },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    backgroundColor: Palette.surface,
    paddingLeft: 16,
  },
  inputRowFocused: { borderColor: Palette.green },
  inputRowError: { borderColor: Palette.danger, backgroundColor: Palette.dangerTint },
  input: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 12,
    paddingRight: 16,
    fontSize: 17,
    color: Palette.ink,
  },
  toggle: {
    width: TOGGLE_SIZE,
    minHeight: TOGGLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  error: { flex: 1, fontSize: 14, lineHeight: 19, color: Palette.danger, fontWeight: '600' },
  hint: { flex: 1, fontSize: 13, lineHeight: 18, color: Palette.mute },
});
