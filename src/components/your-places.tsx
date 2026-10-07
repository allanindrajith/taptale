import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { spotImage, tr } from '@/components/ui/kit';
import { AppLanguage, resolveText, Spot, SPOTS } from '@/constants/spots';
import { Palette } from '@/constants/theme';
import { UnlockService } from '@/services/unlock-storage';

/** Length of a pass, used only for the "x / 30 days" label and bar. */
const PASS_DAYS = 30;
const CARD_WIDTH = 152;
const PHOTO_HEIGHT = 100;
const PLACEHOLDER = { blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' };

export interface UnlockedPlace {
  spot: Spot;
  daysLeft: number;
}

/**
 * Every currently unlocked place, most days left first (= most recently unlocked).
 * `version` comes from useUnlocks(); passing it in makes callers recompute
 * whenever a pass is unlocked, renewed or reset.
 */
export function getUnlockedPlaces(version: number): UnlockedPlace[] {
  void version;
  return SPOTS.filter((spot) => UnlockService.isUnlocked(spot.id))
    .map((spot) => ({ spot, daysLeft: UnlockService.getDaysRemaining(spot.id) }))
    .sort((a, b) => b.daysLeft - a.daysLeft || a.spot.id.localeCompare(b.spot.id));
}

interface YourPlacesProps {
  places: UnlockedPlace[];
  language: AppLanguage;
  onOpen: (spot: Spot) => void;
}

export function YourPlaces({ places, language, onOpen }: YourPlacesProps) {
  if (places.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="phone-portrait-outline" size={20} color={Palette.gold} />
        </View>
        <Text style={styles.emptyText}>
          {tr(
            language,
            'Tap a plaque to unlock your first story',
            'Priglauskite telefoną prie lentelės ir atrakinkite pirmą istoriją'
          )}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}>
      {places.map(({ spot, daysLeft }) => (
        <PlaceShortcut key={spot.id} spot={spot} daysLeft={daysLeft} language={language} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

interface PlaceShortcutProps {
  spot: Spot;
  daysLeft: number;
  language: AppLanguage;
  onOpen: (spot: Spot) => void;
}

function PlaceShortcut({ spot, daysLeft, language, onOpen }: PlaceShortcutProps) {
  const name = resolveText(spot.title, language);
  const pct = Math.max(0, Math.min(100, Math.round((daysLeft / PASS_DAYS) * 100)));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(
        language,
        `${name}, ${daysLeft} of ${PASS_DAYS} days left`,
        `${name}, liko ${daysLeft} iš ${PASS_DAYS} dienų`
      )}
      accessibilityHint={tr(language, 'Opens the story', 'Atidaro istoriją')}
      onPress={() => onOpen(spot)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View>
        <Image
          source={spotImage(spot)}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          placeholder={PLACEHOLDER}
          accessible={false}
        />
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.days}>
          {tr(language, `${daysLeft} / ${PASS_DAYS} days`, `${daysLeft} / ${PASS_DAYS} d.`)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so the row scrolls under the 20px gutter.
  scroller: { marginHorizontal: -20 },
  row: { paddingHorizontal: 20, gap: 12 },

  card: {
    width: CARD_WIDTH,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: PHOTO_HEIGHT, backgroundColor: Palette.goldTint },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 4 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: Palette.ink },
  days: { fontSize: 14, fontWeight: '700', color: Palette.gold },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.goldTint,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: Palette.gold },

  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Palette.goldTint,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.gold,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600', color: Palette.inkSoft },

  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
