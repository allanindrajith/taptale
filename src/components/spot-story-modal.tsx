import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PasskeySheet } from '@/components/passkey-sheet';
import { StoryPlayer } from '@/components/story-player';
import {
  Button,
  cityName,
  IconButton,
  Pill,
  shortDistance,
  spotImage,
  tr,
  walkMinutes,
} from '@/components/ui/kit';
import { AppLanguage, calculateDistanceKm, resolveText, Spot } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { unlockedMessage, useNfcUnlock } from '@/hooks/use-nfc-unlock';
import { useUnlocks } from '@/hooks/use-unlocks';
import { useUserLocation } from '@/hooks/use-user-location';
import { UnlockService } from '@/services/unlock-storage';

interface Props {
  spot: Spot | null;
  language: AppLanguage;
  visible: boolean;
  onClose: () => void;
}

/** Any spot closer than this counts as "you're here". */
const HERE_KM = 0.05;
const MAX_ACTIVITIES = 3;

function openDirections(spot: Spot, title: string) {
  const { latitude: lat, longitude: lng } = spot;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(title)}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(title)})`,
    default: web,
  });
  Linking.openURL(url).catch(() => Linking.openURL(web).catch(() => {}));
}

/**
 * Spot page. Locked: what it is + how to unlock it.
 * Unlocked: the story player. Nothing else competes for attention.
 */
export function SpotStoryModal({ spot, language, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { location } = useUserLocation();
  useUnlocks(); // re-render when this spot gets unlocked
  const [isPasskeyOpen, setIsPasskeyOpen] = useState(false);

  const { scanning, scan } = useNfcUnlock({
    language,
    onUnlocked: (s, renewed) => {
      setIsPasskeyOpen(false);
      Alert.alert(tr(language, 'Unlocked', 'Atrakinta'), unlockedMessage(s, renewed, language));
    },
    onFallback: () => setIsPasskeyOpen(true),
  });

  if (!spot) return null;

  const title = resolveText(spot.title, language);
  const isUnlocked = UnlockService.isUnlocked(spot.id);
  const daysLeft = UnlockService.getDaysRemaining(spot.id);
  const km = calculateDistanceKm(location.latitude, location.longitude, spot.latitude, spot.longitude);
  const isHere = km <= HERE_KM;
  const meta = [
    cityName(spot, language),
    isHere ? tr(language, 'You’re here', 'Esate čia') : shortDistance(km),
    isHere ? null : tr(language, `${walkMinutes(km)} min walk`, `${walkMinutes(km)} min pėsčiomis`),
  ]
    .filter(Boolean)
    .join(' · ');

  // pageSheet on iOS already sits below the status bar
  const closeTop = Platform.OS === 'ios' ? 14 : insets.top + 10;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
          <View style={styles.hero}>
            <Image source={spotImage(spot)} style={styles.heroImage} resizeMode="cover" />
            <View style={[styles.close, { top: closeTop }]}>
              <IconButton icon="close" label={tr(language, 'Close', 'Uždaryti')} tone="glass" onPress={onClose} />
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.titleBlock}>
              {isUnlocked ? (
                <Pill
                  tone="green"
                  icon="checkmark-circle"
                  label={tr(language, `Unlocked · ${daysLeft} days left`, `Atrakinta · liko ${daysLeft} d.`)}
                />
              ) : (
                <Pill tone="neutral" icon="lock-closed" label={tr(language, 'Locked', 'Užrakinta')} />
              )}
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={Type.small}>{meta}</Text>
            </View>

            <Text style={Type.body}>{resolveText(spot.teaser, language)}</Text>

            {isUnlocked ? (
              <StoryPlayer key={spot.id} spot={spot} language={language} />
            ) : (
              <View style={styles.lockCard}>
                <View style={styles.lockIcon}>
                  <Ionicons name="phone-portrait-outline" size={26} color={Palette.gold} />
                </View>
                <Text style={styles.lockTitle}>{tr(language, 'Tap the plaque to unlock', 'Priglauskite prie lentelės')}</Text>
                <Text style={styles.lockBody}>
                  {isHere
                    ? tr(
                        language,
                        'Hold the top of your phone against the TapTale plaque here. The story and audio stay unlocked for 30 days.',
                        'Priglauskite telefono viršų prie TapTale lentelės. Istorija ir garsas bus atrakinti 30 dienų.'
                      )
                    : tr(
                        language,
                        `The plaque is ${shortDistance(km)} away. When you get there, tap it to hear the story for 30 days.`,
                        `Lentelė už ${shortDistance(km)}. Nuvykę priglauskite telefoną ir klausykitės istorijos 30 dienų.`
                      )}
                </Text>
                <Button
                  testID="spot-scan"
                  label={scanning ? tr(language, 'Scanning…', 'Skenuojama…') : tr(language, 'Scan plaque', 'Skenuoti lentelę')}
                  icon="scan-outline"
                  loading={scanning}
                  onPress={() => scan(spot)}
                  style={styles.fullWidth}
                />
                <Button
                  variant="ghost"
                  label={tr(language, 'Enter code instead', 'Įvesti kodą')}
                  onPress={() => setIsPasskeyOpen(true)}
                />
              </View>
            )}

            <Button
              variant="secondary"
              icon="navigate-outline"
              label={tr(language, 'Directions', 'Maršrutas')}
              onPress={() => openDirections(spot, title)}
            />

            {spot.activities.length > 0 ? (
              <View style={styles.todo}>
                <Text style={Type.heading}>{tr(language, 'While you’re there', 'Ką veikti')}</Text>
                {spot.activities.slice(0, MAX_ACTIVITIES).map((a, i) => (
                  <View key={i} style={styles.todoRow}>
                    <Ionicons name="ellipse" size={6} color={Palette.green} style={styles.bullet} />
                    <Text style={[Type.body, styles.flex]}>{resolveText(a, language)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <PasskeySheet
          visible={isPasskeyOpen}
          spot={spot}
          language={language}
          userCoords={location}
          onClose={() => setIsPasskeyOpen(false)}
          onUnlocked={(s) => {
            setIsPasskeyOpen(false);
            Alert.alert(tr(language, 'Unlocked', 'Atrakinta'), unlockedMessage(s, false, language));
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },

  hero: { height: 300, backgroundColor: Palette.surfaceMuted },
  heroImage: { width: '100%', height: '100%' },
  close: { position: 'absolute', right: 16 },

  body: {
    padding: 20,
    gap: 20,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Palette.bg,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  titleBlock: { gap: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, color: Palette.ink },

  lockCard: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.gold,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: { ...Type.heading, textAlign: 'center' },
  lockBody: { ...Type.body, textAlign: 'center', marginBottom: 4 },

  todo: { gap: 10 },
  todoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { marginTop: 8 },
});
