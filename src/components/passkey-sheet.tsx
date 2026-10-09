import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppLanguage, calculateDistanceKm, resolveText, Spot, SPOTS } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { UnlockService } from '@/services/unlock-storage';
import { Button, Sheet, shortDistance, tr } from '@/components/ui/kit';

const MAX_METERS = 10;

interface Props {
  visible: boolean;
  spot: Spot | null;
  language: AppLanguage;
  userCoords: { latitude: number; longitude: number };
  onClose: () => void;
  onUnlocked: (spot: Spot, alreadyUnlocked: boolean) => void;
}

/**
 * Fallback for phones without NFC: type the code printed on the plaque.
 * Only accepted within 10 m of the plaque.
 */
export function PasskeySheet({ visible, spot, language, userCoords, onClose, onUnlocked }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCode('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const distanceTo = (s: Spot) =>
    calculateDistanceKm(userCoords.latitude, userCoords.longitude, s.latitude, s.longitude);

  const targetKm = spot ? distanceTo(spot) : 0;
  const inRange = targetKm * 1000 <= MAX_METERS;

  const submit = () => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError(tr(language, 'Type the code from the plaque.', 'Įveskite kodą nuo lentelės.'));
      return;
    }
    const matched = SPOTS.find((s) => s.nfcSecretKey.toUpperCase() === clean) || spot;
    if (!matched) return;

    const km = distanceTo(matched);
    if (km * 1000 > MAX_METERS) {
      setError(
        tr(
          language,
          `You’re ${shortDistance(km)} away. Codes only work right next to the plaque.`,
          `Esate ${shortDistance(km)} atstumu. Kodas veikia tik prie pat lentelės.`
        )
      );
      return;
    }

    const res = UnlockService.validateAndUnlock(matched.id, clean, matched.nfcSecretKey);
    if (res.success) {
      reset();
      onUnlocked(matched, !!res.alreadyUnlocked);
    } else {
      setError(tr(language, 'That code doesn’t match. Check the plaque and try again.', 'Kodas netinka. Patikrinkite lentelę ir bandykite dar kartą.'));
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title={tr(language, 'Enter plaque code', 'Įveskite lentelės kodą')}>
      {spot ? (
        <View style={styles.target}>
          <Ionicons name="location-outline" size={22} color={Palette.inkSoft} />
          <Text style={styles.targetName} numberOfLines={2}>
            {resolveText(spot.title, language)}
          </Text>
          <Text style={[styles.range, { color: inRange ? Palette.green : Palette.mute }]}>
            {inRange ? tr(language, 'You’re here', 'Esate vietoje') : shortDistance(targetKm)}
          </Text>
        </View>
      ) : null}

      <TextInput
        testID="passkey-input"
        style={[styles.input, error && { borderColor: Palette.danger }]}
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setError(null);
        }}
        placeholder="VILKAS-1323"
        placeholderTextColor={Palette.mute}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel={tr(language, 'Plaque code', 'Lentelės kodas')}
      />

      <Text style={error ? styles.error : Type.small}>
        {error ??
          tr(language, 'Find it under the NFC logo on the plaque.', 'Kodas yra po NFC ženklu ant lentelės.')}
      </Text>

      <Button testID="passkey-submit" label={tr(language, 'Unlock', 'Atrakinti')} icon="lock-open-outline" onPress={submit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    backgroundColor: Palette.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
  },
  targetName: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '600', color: Palette.ink },
  range: { fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 62,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    backgroundColor: Palette.surface,
    paddingHorizontal: 18,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    color: Palette.ink,
    textAlign: 'center',
  },
  error: { fontSize: 15, color: Palette.danger, lineHeight: 21 },
});
