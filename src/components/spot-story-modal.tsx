import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DirectionsSheet } from '@/components/directions-sheet';
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
import { getPhotoCredit } from '@/constants/photo-credits';
import { AppLanguage, calculateDistanceKm, resolveText, Spot } from '@/constants/spots';
import { Palette, TIGHT_FONT_SCALE, Type } from '@/constants/theme';
import { showUnlockedAlert, useNfcUnlock } from '@/hooks/use-nfc-unlock';
import { usePass } from '@/hooks/use-unlocks';
import { useDirections } from '@/hooks/use-directions';
import { useUserLocation } from '@/hooks/use-user-location';

interface Props {
  spot: Spot | null;
  language: AppLanguage;
  visible: boolean;
  onClose: () => void;
  /** Show another spot in this sheet (e.g. the user unlocked a different place's plaque). */
  onOpenSpot: (spot: Spot) => void;
}

/** Any spot closer than this counts as "you're here". */
const HERE_KM = 0.05;
const MAX_ACTIVITIES = 3;

function openPhotoSource(url: string) {
  Linking.openURL(url).catch((e) => {
    if (__DEV__) console.warn('Could not open photo source', e);
  });
}

/**
 * Spot page. Locked: what it is + how to unlock it.
 * Unlocked: the story player. Nothing else competes for attention.
 */
export function SpotStoryModal({ spot, language, visible, onClose, onOpenSpot }: Props) {
  const insets = useSafeAreaInsets();
  const { location } = useUserLocation();
  // Live status: flips to unlocked the moment a scan succeeds, no app restart needed
  const { isUnlocked, daysLeft } = usePass(spot?.id);
  const [isPasskeyOpen, setIsPasskeyOpen] = useState(false);
  const { startDirections, sheet: directionsSheet } = useDirections();

  const { scanning, scan } = useNfcUnlock({
    language,
    onUnlocked: (s, alreadyUnlocked) => {
      setIsPasskeyOpen(false);
      if (s.id !== spot?.id) onOpenSpot(s);
      showUnlockedAlert(s, alreadyUnlocked, language);
    },
    onFallback: () => setIsPasskeyOpen(true),
    onDirections: startDirections,
  });

  if (!spot) return null;

  const title = resolveText(spot.title, language);
  const credit = getPhotoCredit(spot.id);
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
            <Image
              source={spotImage(spot)}
              style={styles.heroImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
            {credit ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={tr(
                  language,
                  `Photo by ${credit.author}, ${credit.license}. Opens the source page.`,
                  `Nuotraukos autorius ${credit.author}, ${credit.license}. Atidaro šaltinio puslapį.`
                )}
                hitSlop={10}
                onPress={() => openPhotoSource(credit.sourceUrl)}
                style={({ pressed }) => [styles.credit, pressed && styles.creditPressed]}>
                <Text style={styles.creditText} numberOfLines={1} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
                  {tr(language, 'Photo', 'Nuotrauka')}: {credit.author} · {credit.license}
                </Text>
              </Pressable>
            ) : null}
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
                  <Ionicons name="phone-portrait-outline" size={30} color={Palette.gold} />
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
              onPress={() => startDirections(spot)}
            />

            {spot.activities.length > 0 ? (
              <View style={styles.todo}>
                <Text style={Type.heading}>{tr(language, 'While you’re there', 'Ką veikti')}</Text>
                {spot.activities.slice(0, MAX_ACTIVITIES).map((a, i) => (
                  <View key={i} style={styles.todoRow}>
                    <Ionicons name="ellipse" size={7} color={Palette.green} style={styles.bullet} />
                    <Text style={[Type.body, styles.flex]}>{resolveText(a, language)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <DirectionsSheet {...directionsSheet} language={language} />

        <PasskeySheet
          visible={isPasskeyOpen}
          spot={spot}
          language={language}
          userCoords={location}
          onClose={() => setIsPasskeyOpen(false)}
          onUnlocked={(s, alreadyUnlocked) => {
            setIsPasskeyOpen(false);
            if (s.id !== spot.id) onOpenSpot(s);
            showUnlockedAlert(s, alreadyUnlocked, language);
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
  heroImage: { width: '100%', height: '100%', backgroundColor: Palette.surfaceMuted },
  close: { position: 'absolute', right: 16 },
  credit: {
    position: 'absolute',
    right: 12,
    bottom: 38, // sits just above the rounded body overlap
    maxWidth: '80%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  creditPressed: { opacity: 0.7 },
  creditText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },

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
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, color: Palette.ink },

  lockCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.gold,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: { ...Type.heading, textAlign: 'center' },
  lockBody: { ...Type.body, textAlign: 'center', marginBottom: 4 },

  todo: { gap: 12 },
  todoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bullet: { marginTop: 9 },
});
