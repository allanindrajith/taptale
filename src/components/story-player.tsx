import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppLanguage, resolveText, Spot } from '@/constants/spots';
import { Palette, Touch } from '@/constants/theme';
import { useStoryAudio } from '@/hooks/use-story-audio';
import { IconButton, Segmented, tr } from '@/components/ui/kit';

interface Props {
  spot: Spot;
  language: AppLanguage;
}

/**
 * Unlocked story: one chapter at a time, with a single play button that
 * either narrates the chapters in sequence or plays the spot's ambient music.
 */
export function StoryPlayer({ spot, language }: Props) {
  const chapters = useMemo(() => spot.story ?? [], [spot.story]);
  const lastIndex = Math.max(0, chapters.length - 1);

  const [isLoreOpen, setIsLoreOpen] = useState(false);
  const { mode, chapter, isPlaying, isLoading, progress, canPlayMusic, sourceLabel, togglePlay, goTo, switchMode } =
    useStoryAudio({ spotId: spot.id, language, chapters });

  const lore = spot.secretLore ?? [];

  return (
    <View style={styles.wrap}>
      {/* Player */}
      <View style={styles.player}>
        {canPlayMusic ? (
          <Segmented
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'voice', label: tr(language, 'Story', 'Istorija'), icon: 'mic-outline' },
              { value: 'music', label: tr(language, 'Music', 'Muzika'), icon: 'musical-notes-outline' },
            ]}
          />
        ) : null}
        <View style={styles.playerRow}>
          <Pressable
            testID="play-button"
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? tr(language, 'Pause', 'Pauzė') : tr(language, 'Play', 'Groti')}
            accessibilityState={{ busy: isLoading }}
            onPress={togglePlay}
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#FFFFFF" style={!isPlaying && styles.playNudge} />
            )}
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {mode === 'voice'
                ? tr(language, `Chapter ${chapter + 1}`, `${chapter + 1} skyrius`)
                : tr(language, 'Music for this place', 'Šios vietos muzika')}
            </Text>
            <Text style={styles.trackSub} numberOfLines={2}>
              {sourceLabel}
            </Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Reader */}
      {chapters.length > 0 ? (
        <View style={styles.reader}>
          <View style={styles.readerHead}>
            <Text style={styles.chapterLabel}>
              {tr(language, 'Chapter', 'Skyrius')} {chapter + 1} / {chapters.length}
            </Text>
            <View style={styles.pager}>
              <IconButton
                icon="chevron-back"
                label={tr(language, 'Previous chapter', 'Ankstesnis skyrius')}
                size={44}
                onPress={() => goTo(Math.max(0, chapter - 1))}
              />
              <IconButton
                icon="chevron-forward"
                label={tr(language, 'Next chapter', 'Kitas skyrius')}
                size={44}
                onPress={() => goTo(Math.min(lastIndex, chapter + 1))}
              />
            </View>
          </View>
          <Text style={styles.chapterText}>{resolveText(chapters[chapter], language)}</Text>
          <View style={styles.dots}>
            {chapters.map((_, i) => (
              <View key={i} style={[styles.dot, i === chapter && styles.dotActive]} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Hidden details */}
      {lore.length > 0 ? (
        <View style={styles.lore}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isLoreOpen }}
            onPress={() => setIsLoreOpen((v) => !v)}
            style={styles.loreHead}>
            <Ionicons name="sparkles-outline" size={20} color={Palette.gold} />
            <Text style={styles.loreTitle}>{tr(language, 'Hidden details', 'Paslaptys')}</Text>
            <Ionicons name={isLoreOpen ? 'chevron-up' : 'chevron-down'} size={20} color={Palette.mute} />
          </Pressable>
          {isLoreOpen
            ? lore.map((item, i) => (
                <Text key={i} style={styles.loreText}>
                  {resolveText(item, language)}
                </Text>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },

  player: {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    padding: 16,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Palette.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playNudge: { marginLeft: 3 },
  trackTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', color: Palette.ink },
  trackSub: { fontSize: 15, lineHeight: 20, color: Palette.mute, marginTop: 2 },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.surfaceMuted,
    marginTop: 10,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: Palette.green },

  reader: { gap: 12 },
  readerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chapterLabel: { flexShrink: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: Palette.mute, textTransform: 'uppercase' },
  pager: { flexDirection: 'row', gap: 8 },
  chapterText: { fontSize: 19, lineHeight: 30, color: Palette.ink },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.hairline },
  dotActive: { width: 18, backgroundColor: Palette.green },

  lore: {
    backgroundColor: Palette.goldTint,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  loreHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: Touch.min },
  loreTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Palette.ink },
  loreText: { fontSize: 17, lineHeight: 25, color: Palette.inkSoft },
});
