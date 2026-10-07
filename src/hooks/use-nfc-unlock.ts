import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { AppLanguage, resolveText, Spot } from '@/constants/spots';
import { NfcService } from '@/services/nfc-service';
import { tr } from '@/components/ui/kit';

interface Options {
  language: AppLanguage;
  /** Called after a plaque was verified (new unlock or renewal). */
  onUnlocked: (spot: Spot, renewed: boolean) => void;
  /** Called when NFC is unavailable / fails, so the UI can offer the code fallback. */
  onFallback: (spot?: Spot) => void;
}

/**
 * Single NFC scanning flow shared by Home and the spot screen.
 * Keeps user-facing messages short and always offers the code fallback on failure.
 */
export function useNfcUnlock({ language, onUnlocked, onFallback }: Options) {
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(
    async (target?: Spot) => {
      setScanning(true);
      try {
        const result = await NfcService.scanPhysicalTag(target);
        setScanning(false);

        if (result.success && result.spot) {
          onUnlocked(result.spot, !!result.alreadyUnlocked);
          return;
        }
        if (result.message?.toLowerCase().includes('cancel')) return;

        Alert.alert(
          tr(language, 'Couldn’t read the plaque', 'Nepavyko nuskaityti žymos'),
          result.hardwareMissing
            ? tr(language, 'This phone can’t scan NFC. You can type the code printed on the plaque instead.', 'Šis telefonas nepalaiko NFC. Galite įvesti ant lentelės išspausdintą kodą.')
            : tr(language, 'Try holding the top of your phone closer, or type the plaque code.', 'Priglauskite telefono viršų arčiau arba įveskite lentelės kodą.'),
          [
            { text: tr(language, 'Cancel', 'Atšaukti'), style: 'cancel' },
            { text: tr(language, 'Enter code', 'Įvesti kodą'), onPress: () => onFallback(target) },
          ]
        );
      } catch (err: any) {
        setScanning(false);
        Alert.alert(
          tr(language, 'Scan failed', 'Nuskaitymas nepavyko'),
          err?.message || tr(language, 'Please try again or enter the plaque code.', 'Bandykite dar kartą arba įveskite kodą.'),
          [
            { text: tr(language, 'Cancel', 'Atšaukti'), style: 'cancel' },
            { text: tr(language, 'Enter code', 'Įvesti kodą'), onPress: () => onFallback(target) },
          ]
        );
      }
    },
    [language, onUnlocked, onFallback]
  );

  return { scanning, scan };
}

/** Short confirmation shown after a successful unlock. */
export function unlockedMessage(spot: Spot, renewed: boolean, language: AppLanguage) {
  const name = resolveText(spot.title, language);
  return renewed
    ? tr(language, `${name} renewed for 30 days.`, `„${name}“ pratęsta 30 dienų.`)
    : tr(language, `${name} is unlocked for 30 days.`, `„${name}“ atrakinta 30 dienų.`);
}
