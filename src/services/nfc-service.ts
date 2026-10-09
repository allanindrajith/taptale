import { Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SPOTS, Spot } from '@/constants/spots';
import { UnlockService } from '@/services/unlock-storage';

// Safe lazy import for react-native-nfc-manager so it never crashes in environments without NFC
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;

try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
  Ndef = nfcModule.Ndef;
} catch (e) {
  // Not supported or not built with native NFC
}

export interface NfcScanResult {
  success: boolean;
  spot?: Spot;
  alreadyUnlocked?: boolean;
  /** Genuine plaque, but for a different place than the one being scanned for. `spot` is the plaque's place. */
  wrongPlace?: boolean;
  /** The plaque's key, so the UI can unlock `spot` if the user chooses to. */
  tagKey?: string;
  message: string;
  hardwareMissing?: boolean;
}

let isNfcInitialized = false;

export const NfcService = {
  /**
   * Check if physical NFC hardware is supported on this device
   */
  async isHardwareSupported(): Promise<boolean> {
    if (!NfcManager) return false;
    try {
      const supported = await NfcManager.isSupported();
      return !!supported;
    } catch {
      return false;
    }
  },

  /**
   * Check if physical NFC is turned on in device settings
   */
  async isEnabled(): Promise<boolean> {
    if (!NfcManager) return false;
    if (Platform.OS === 'ios') {
      return this.isHardwareSupported();
    }
    try {
      const enabled = await NfcManager.isEnabled();
      return !!enabled;
    } catch {
      return false;
    }
  },

  /**
   * Initialize NFC hardware module
   */
  async init(): Promise<boolean> {
    if (!NfcManager) return false;
    if (isNfcInitialized) return true;
    try {
      const supported = await this.isHardwareSupported();
      if (!supported) {
        return false;
      }
      await NfcManager.start();
      isNfcInitialized = true;
      return true;
    } catch (e: any) {
      const errMsg = String(e?.message || e || '');
      if (!errMsg.toLowerCase().includes('not support')) {
        console.warn('NFC init error:', e);
      }
      return false;
    }
  },

  /**
   * Parse NFC payload string from URI, URL, or JSON
   * e.g. taptale://unlock?spot=vln-gediminas-tower&key=GELEZINIS-VILKAS-1323
   */
  parseTagPayload(rawPayload: string): { spotId?: string; key?: string } | null {
    if (!rawPayload || typeof rawPayload !== 'string') return null;

    try {
      // 1. Try URI / URL parsing
      if (rawPayload.includes('spot=') && rawPayload.includes('key=')) {
        const parsed = Linking.parse(rawPayload);
        const spotId = (parsed.queryParams?.spot as string) || undefined;
        const key = (parsed.queryParams?.key as string) || undefined;
        if (spotId && key) return { spotId, key };

        // Fallback regex in case queryParams failed
        const spotMatch = rawPayload.match(/[?&]spot=([^&]+)/);
        const keyMatch = rawPayload.match(/[?&]key=([^&]+)/);
        if (spotMatch && keyMatch) {
          return {
            spotId: decodeURIComponent(spotMatch[1]),
            key: decodeURIComponent(keyMatch[1]),
          };
        }
      }

      // 2. Try JSON format: {"spot":"vln-gediminas-tower","key":"GELEZINIS-VILKAS-1323"}
      if (rawPayload.startsWith('{') && rawPayload.endsWith('}')) {
        const json = JSON.parse(rawPayload);
        if (json.spot && json.key) {
          return { spotId: json.spot, key: json.key };
        }
      }

      // 3. Try delimited format: "vln-gediminas-tower:GELEZINIS-VILKAS-1323"
      if (rawPayload.includes(':')) {
        const parts = rawPayload.split(':');
        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
          return { spotId: parts[0].trim(), key: parts[1].trim() };
        }
      }
    } catch (err) {
      console.warn('Failed to parse NFC tag payload:', err);
    }

    return null;
  },

  /**
   * Scan physical NFC tag near the phone.
   * Reads the real NFC chip NDEF records, validates the cryptographic key against the monument,
   * and unlocks ONLY IF VALID. Never fake unlocks!
   */
  async scanPhysicalTag(targetSpot?: Spot): Promise<NfcScanResult> {
    try {
      const supported = await this.isHardwareSupported();
      if (!supported) {
        return {
          success: false,
          hardwareMissing: true,
          message:
            Platform.OS === 'ios'
              ? 'NFC tag reading is not available on this device or simulator. Hold a physical iPhone near the plaque or use passkey verification.'
              : 'NFC hardware is not supported on this device.',
        };
      }

      const initialized = await this.init();
      if (!initialized) {
        return {
          success: false,
          hardwareMissing: true,
          message:
            Platform.OS === 'ios'
              ? 'Could not start CoreNFC session. Ensure NFC capability is enabled.'
              : 'NFC reading session could not be started.',
        };
      }

      // Request NDEF technology reading session (triggers native iOS CoreNFC modal or Android scan)
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: targetSpot
            ? `Hold iPhone near the physical ${targetSpot.title.en} plaque`
            : 'Hold iPhone near any TapTale physical heritage plaque',
        });
      } else {
        await NfcManager.requestTechnology(NfcTech.Ndef);
      }

      const tag = await NfcManager.getTag();
      if (!tag) {
        await this.cancelScan();
        return { success: false, message: 'No NFC tag detected.' };
      }

      // Read raw NDEF message records from physical chip
      let payloadString = '';

      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (const record of tag.ndefMessage) {
          try {
            if (Ndef && Ndef.uri && Ndef.uri.decodePayload) {
              const decodedUri = Ndef.uri.decodePayload(record.payload);
              if (decodedUri) {
                payloadString = decodedUri;
                break;
              }
            }
            if (Ndef && Ndef.text && Ndef.text.decodePayload) {
              const decodedText = Ndef.text.decodePayload(record.payload);
              if (decodedText) {
                payloadString = decodedText;
                break;
              }
            }
          } catch {
            // continue checking next record
          }
        }

        // Raw byte fallback if helpers didn't resolve
        if (!payloadString && tag.ndefMessage[0].payload) {
          const bytes = tag.ndefMessage[0].payload;
          payloadString = String.fromCharCode(...bytes);
        }
      }

      await this.cancelScan();

      if (!payloadString) {
        return {
          success: false,
          message: 'NFC plaque detected, but no readable TapTale NDEF data found on tag.',
        };
      }

      // Parse spot ID and secret key from the physical tag
      const parsedData = this.parseTagPayload(payloadString);
      if (!parsedData || !parsedData.spotId || !parsedData.key) {
        return {
          success: false,
          message: 'Invalid NFC tag format. This tag is not a recognized TapTale heritage plaque.',
        };
      }

      // Find monument in registry
      const matchedSpot = SPOTS.find((s) => s.id === parsedData.spotId);
      if (!matchedSpot) {
        return {
          success: false,
          message: `Unknown landmark ID (${parsedData.spotId}) in NFC tag payload.`,
        };
      }

      // Scanning for a specific monument but this is another place's plaque:
      // nothing is unlocked yet; the UI asks whether to unlock that place instead.
      if (targetSpot && matchedSpot.id !== targetSpot.id) {
        if (!UnlockService.keyMatches(parsedData.key, matchedSpot.nfcSecretKey)) {
          return {
            success: false,
            message: '❌ Invalid NFC plaque signature. This tag is rejected.',
          };
        }
        return {
          success: false,
          wrongPlace: true,
          spot: matchedSpot,
          tagKey: parsedData.key,
          message: `This plaque is for "${matchedSpot.title.en}", not "${targetSpot.title.en}".`,
        };
      }

      // Cryptographically validate the physical tag secret key
      const validation = UnlockService.validateAndUnlock(
        matchedSpot.id,
        parsedData.key,
        matchedSpot.nfcSecretKey
      );

      if (!validation.success) {
        return {
          success: false,
          message: `❌ Invalid NFC plaque signature: ${validation.message}. This tag is rejected.`,
        };
      }

      const alreadyUnlocked = !!validation.alreadyUnlocked;
      return {
        success: true,
        spot: matchedSpot,
        alreadyUnlocked,
        message: alreadyUnlocked
          ? `${matchedSpot.title.en} is already unlocked.`
          : `🎉 Physical NFC Tag Verified! 30-Day pass activated for ${matchedSpot.title.en}.`,
      };
    } catch (err: any) {
      await this.cancelScan();
      const errMsg = err?.message || String(err || '');
      const isUserCancel = errMsg.toLowerCase().includes('cancel') || errMsg.toLowerCase().includes('user');
      return {
        success: false,
        hardwareMissing: !isUserCancel,
        message: isUserCancel
          ? 'NFC scan was cancelled.'
          : (errMsg || 'NFC reading session could not be started in this build.'),
      };
    }
  },

  /**
   * Cancel ongoing NFC reading session
   */
  async cancelScan() {
    if (!NfcManager) return;
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignore
    }
  },
};
