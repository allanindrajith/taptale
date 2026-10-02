import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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

export default function UnlockScreen() {
  const router = useRouter();
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
            <View style={styles.successIconBadge}>
              <Text style={styles.badgeEmoji}>🎉</Text>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusPillDot} />
              <Text style={styles.statusPillText}>PHYSICAL NFC VERIFIED</Text>
            </View>

            <Text style={styles.title}>30-Day Pass Activated!</Text>
            <Text style={styles.spotTitle}>{targetSpot.title.en}</Text>
            <Text style={styles.subtitle}>
              Physical tag signature matches monument security key. Full story, lore, and audio guide
              are unlocked for 30 days!
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Validity Period:</Text>
              <Text style={styles.infoValue}>30 Days</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{targetSpot.cityID.toUpperCase()}</Text>
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                router.replace('/');
              }}>
              <Text style={styles.primaryBtnText}>Start Exploring</Text>
            </Pressable>
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

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                router.replace('/');
              }}>
              <Text style={styles.secondaryBtnText}>Back to Map</Text>
            </Pressable>
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
});
