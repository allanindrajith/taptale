import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { AppLanguage, resolveText, Spot } from '@/constants/spots';
import { NfcService } from '@/services/nfc-service';
import { UnlockService } from '@/services/unlock-storage';
import { tr } from '@/components/ui/kit';

interface Options {
  language: AppLanguage;
  /** Called after a plaque was verified (new unlock, or a pass that was already active). */
  onUnlocked: (spot: Spot, alreadyUnlocked: boolean) => void;
  /** Called when NFC is unavailable / fails, so the UI can offer the code fallback. */
  onFallback: (spot?: Spot) => void;
  /** Offered when the user scans another place's plaque; omit to hide that choice. */
  onDirections?: (spot: Spot) => void;
}

/**
 * Single NFC scanning flow shared by Home and the spot screen.
 * Keeps user-facing messages short and always offers the code fallback on failure.
 */
export function useNfcUnlock({ language, onUnlocked, onFallback, onDirections }: Options) {
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
        if (result.wrongPlace && result.spot && result.tagKey && target) {
          askAboutOtherPlace(result.spot, result.tagKey, target, language, onUnlocked, onDirections);
          return;
        }
        if (result.message?.toLowerCase().includes('cancel')) return;

        Alert.alert(
          tr(language, 'Couldn’t read the plaque', 'Nepavyko nuskaityti lentelės'),
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
    [language, onUnlocked, onFallback, onDirections]
  );

  return { scanning, scan };
}

/**
 * The user scanned a real plaque, but for a different place than the one they opened.
 * Let them unlock the plaque's place, or get directions to the place they picked.
 */
function askAboutOtherPlace(
  plaqueSpot: Spot,
  tagKey: string,
  target: Spot,
  language: AppLanguage,
  onUnlocked: (spot: Spot, alreadyUnlocked: boolean) => void,
  onDirections?: (spot: Spot) => void
) {
  const plaqueName = resolveText(plaqueSpot.title, language);
  const targetName = resolveText(target.title, language);
  Alert.alert(
    tr(language, 'Wrong place', 'Ne ta vieta'),
    tr(
      language,
      `This plaque isn’t for ${targetName}. It belongs to ${plaqueName}.`,
      `Ši lentelė ne „${targetName}“. Ji priklauso „${plaqueName}“.`
    ),
    [
      {
        text: tr(language, `Unlock ${plaqueName}`, `Atrakinti „${plaqueName}“`),
        onPress: () => {
          const res = UnlockService.validateAndUnlock(plaqueSpot.id, tagKey, plaqueSpot.nfcSecretKey);
          if (res.success) onUnlocked(plaqueSpot, !!res.alreadyUnlocked);
        },
      },
      ...(onDirections
        ? [
            {
              text: tr(language, `Directions to ${targetName}`, `Maršrutas į „${targetName}“`),
              onPress: () => onDirections(target),
            },
          ]
        : []),
      { text: tr(language, 'Cancel', 'Atšaukti'), style: 'cancel' as const },
    ]
  );
}

/** Confirmation after a verified plaque: new 30-day pass, or the days left on an active one. */
export function showUnlockedAlert(spot: Spot, alreadyUnlocked: boolean, language: AppLanguage) {
  const name = resolveText(spot.title, language);
  if (!alreadyUnlocked) {
    Alert.alert(
      tr(language, 'Unlocked', 'Atrakinta'),
      tr(language, `${name} is unlocked for 30 days.`, `„${name}“ atrakinta 30 dienų.`)
    );
    return;
  }
  const days = UnlockService.getDaysRemaining(spot.id);
  Alert.alert(
    tr(language, 'Already unlocked', 'Jau atrakinta'),
    tr(
      language,
      `${name} is already unlocked. Your pass expires in ${days} ${days === 1 ? 'day' : 'days'}.`,
      `„${name}“ jau atrakinta. Leidimas galioja dar ${days} d.`
    )
  );
}
