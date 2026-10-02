import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SPOTS, Spot, resolveText } from '@/constants/spots';
import { Rounded, Spacing, WiseColors } from '@/constants/theme';
import { UnlockService } from '@/services/unlock-storage';
import { useLanguage } from '@/hooks/use-language';

export default function UnlockScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const { spot: spotId, key } = useLocalSearchParams<{ spot?: string; key?: string }>();

  const [validationResult, setValidationResult] = useState<{
    status: 'checking' | 'valid' | 'invalid';
    spot?: Spot;
    message?: string;
  }>({ status: 'checking' });

  useEffect(() => {
    if (!spotId) {
      setValidationResult({
        status: 'invalid',
        message: 'No monument spot specified in NFC payload.',
      });
      return;
    }

    const matchedSpot = SPOTS.find((s) => s.id === spotId);
    if (!matchedSpot) {
      setValidationResult({
        status: 'invalid',
        message: `Unknown landmark ID (${spotId}). Tag is not in TapTale's heritage registry.`,
      });
      return;
    }

    if (!key) {
      setValidationResult({
        status: 'invalid',
        spot: matchedSpot,
        message: 'Missing cryptographic passkey in NFC tag data.',
      });
      return;
    }

    // Cryptographic validation against target monument
    const res = UnlockService.validateAndUnlock(spotId, key, matchedSpot.nfcSecretKey);
    if (res.success) {
      setValidationResult({
        status: 'valid',
        spot: matchedSpot,
        message: res.message,
      });
    } else {
      setValidationResult({
        status: 'invalid',
        spot: matchedSpot,
        message: res.message || 'Signature mismatch. Passkey invalid.',
      });
    }
  }, [spotId, key]);

  const targetSpot = validationResult.spot;
  const isWeb = Platform.OS === 'web';

  // Detect Mobile OS if opened in a web browser
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      if (/android/i.test(ua)) {
        setDeviceOS('android');
      } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
        setDeviceOS('ios');
      } else {
        setDeviceOS('other');
      }

      // If spot and key are present, attempt to launch installed native app via custom scheme
      if (spotId && key) {
        const nativeUri = `taptale://unlock?spot=${encodeURIComponent(spotId)}&key=${encodeURIComponent(key)}`;
        // Small delay to allow page render before triggering intent
        const timer = setTimeout(() => {
          try {
            window.location.href = nativeUri;
          } catch (e) {}
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isWeb, spotId, key]);

  const handleOpenNativeApp = () => {
    if (!spotId || !key) return;
    const nativeUri = `taptale://unlock?spot=${encodeURIComponent(spotId)}&key=${encodeURIComponent(key)}`;
    if (isWeb && typeof window !== 'undefined') {
      window.location.href = nativeUri;
    }
  };

  const handleOpenStore = (store: 'ios' | 'android') => {
    if (isWeb && typeof window !== 'undefined') {
      if (store === 'ios') {
        // Direct App Store link (or search fallback)
        window.open('https://apps.apple.com/app/taptale/id6470000000', '_blank');
      } else {
        // Direct Google Play Store link
        window.open('https://play.google.com/store/apps/details?id=com.allanindrajith.taptale', '_blank');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {validationResult.status === 'checking' && (
          <View style={styles.centerBox}>
            <Text style={styles.loadingEmoji}>📡</Text>
            <Text style={styles.title}>Validating NFC Plaque…</Text>
            <Text style={styles.subtitle}>
              Reading cryptographic signature and cross-referencing monument registry…
            </Text>
          </View>
        )}

        {validationResult.status === 'valid' && targetSpot && (
          <View style={styles.card}>
            {/* Show landmark hero image if in web browser */}
            {isWeb && targetSpot.imageUrl && (
              <Image
                source={typeof targetSpot.imageUrl === 'string' ? { uri: targetSpot.imageUrl } : targetSpot.imageUrl}
                style={styles.heroImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.successIconBadge}>
              <Text style={styles.badgeEmoji}>🎉</Text>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusPillDot} />
              <Text style={styles.statusPillText}>PHYSICAL NFC VERIFIED</Text>
            </View>

            <Text style={styles.title}>
              {language === 'lt' ? '30 dienų leidimas aktyvuotas!' : '30-Day Pass Activated!'}
            </Text>
            <Text style={styles.spotTitle}>{resolveText(targetSpot.title, language)}</Text>
            <Text style={styles.subtitle}>
              {isWeb
                ? 'You discovered this authentic monument! Open TapTale to enjoy the audio story, interactive 3D map, and archival lore.'
                : 'Physical tag signature matches monument security key. Full story, lore, and audio guide are unlocked for 30 days!'}
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Validity Period:</Text>
              <Text style={styles.infoValue}>30 Days</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{targetSpot.cityID.toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Audio Guide:</Text>
              <Text style={styles.infoValue}>{targetSpot.audioGuide.duration} Narrated</Text>
            </View>

            {/* If viewed in Web Browser on a Mobile Phone */}
            {isWeb ? (
              <View style={styles.storeSection}>
                <Text style={styles.storePrompt}>Experience this story in the TapTale app:</Text>

                {/* Primary Button: Open App if already installed */}
                <Pressable style={styles.primaryBtn} onPress={handleOpenNativeApp}>
                  <Text style={styles.primaryBtnText}>📲 Open in TapTale App</Text>
                </Pressable>

                {/* Dynamic Store Buttons based on User Device OS */}
                {(deviceOS === 'ios' || deviceOS === 'other') && (
                  <Pressable style={styles.appStoreBtn} onPress={() => handleOpenStore('ios')}>
                    <Text style={styles.storeBtnIcon}>🍎</Text>
                    <View style={styles.storeBtnTextContainer}>
                      <Text style={styles.storeBtnSub}>Download on the</Text>
                      <Text style={styles.storeBtnTitle}>Apple App Store</Text>
                    </View>
                  </Pressable>
                )}

                {(deviceOS === 'android' || deviceOS === 'other') && (
                  <Pressable style={styles.playStoreBtn} onPress={() => handleOpenStore('android')}>
                    <Text style={styles.storeBtnIcon}>🤖</Text>
                    <View style={styles.storeBtnTextContainer}>
                      <Text style={styles.storeBtnSub}>GET IT ON</Text>
                      <Text style={styles.storeBtnTitle}>Google Play</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            ) : (
              /* Native App Experience */
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  router.replace({ pathname: '/', params: { spot: targetSpot.id } });
                }}>
                <Text style={styles.primaryBtnText}>
                  {language === 'lt'
                    ? `Peržiūrėti ${resolveText(targetSpot.title, language)} istoriją →`
                    : `Visit ${resolveText(targetSpot.title, language)} Story →`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {validationResult.status === 'invalid' && (
          <View style={styles.card}>
            <View style={styles.errorIconBadge}>
              <Text style={styles.badgeEmoji}>❌</Text>
            </View>

            <View style={styles.errorStatusPill}>
              <Text style={styles.errorStatusPillText}>REJECTED • COUNTERFEIT OR INVALID</Text>
            </View>

            <Text style={styles.title}>Verification Failed</Text>
            {targetSpot && <Text style={styles.spotTitle}>{targetSpot.title.en}</Text>}

            <Text style={styles.errorMessage}>
              {validationResult.message || 'Invalid NFC tag signature. Content remains locked.'}
            </Text>

            <Text style={styles.errorHint}>
              Physical unlocking requires scanning an authentic TapTale plaque at the physical site, or entering the engraved passkey manually.
            </Text>

            {isWeb ? (
              <Pressable style={styles.primaryBtn} onPress={handleOpenNativeApp}>
                <Text style={styles.primaryBtnText}>Open TapTale App</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  router.replace('/');
                }}>
                <Text style={styles.secondaryBtnText}>Back to Map</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WiseColors.inkDeep,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  centerBox: {
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 54,
    marginBottom: Spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e6f7ec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  errorIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  statusPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.6,
  },
  errorStatusPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  errorStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: WiseColors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  spotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WiseColors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  errorHint: {
    fontSize: 12,
    color: WiseColors.mute,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 13,
    color: WiseColors.body,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: WiseColors.primary,
    paddingVertical: 14,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.onPrimary,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: WiseColors.canvasSoft,
    paddingVertical: 14,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: Rounded.lg,
    marginBottom: Spacing.md,
  },
  storeSection: {
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
  },
  storePrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: WiseColors.body,
    marginBottom: 4,
    textAlign: 'center',
  },
  appStoreBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Rounded.pill,
    gap: 12,
  },
  playStoreBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Rounded.pill,
    gap: 12,
  },
  storeBtnIcon: {
    fontSize: 22,
  },
  storeBtnTextContainer: {
    alignItems: 'flex-start',
  },
  storeBtnSub: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  storeBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
