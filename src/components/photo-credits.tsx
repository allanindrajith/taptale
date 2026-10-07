import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Sheet, tr } from '@/components/ui/kit';
import { PHOTO_CREDITS } from '@/constants/photo-credits';
import { AppLanguage, resolveText, SPOTS } from '@/constants/spots';
import { Palette, Touch, Type } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  language: AppLanguage;
}

const MAX_SHEET_HEIGHT = 560;

function openUrl(url: string) {
  Linking.openURL(url).catch((e) => {
    if (__DEV__) console.warn('Could not open photo credit link', e);
  });
}

/** Lists the author + license of every spot photo (required by CC BY / BY-SA). */
export function PhotoCreditsSheet({ visible, onClose, language }: Props) {
  const rows = SPOTS.flatMap((spot) => {
    const credit = PHOTO_CREDITS[spot.id];
    return credit ? [{ id: spot.id, place: resolveText(spot.title, language), credit }] : [];
  });

  return (
    <Sheet visible={visible} onClose={onClose} title={tr(language, 'Photo credits', 'Nuotraukų autoriai')}>
      <Text style={Type.small}>
        {tr(
          language,
          'Photos of each place come from Wikimedia Commons and are used under the licenses below. Tap a photo to open its source page.',
          'Vietų nuotraukos paimtos iš Wikimedia Commons ir naudojamos pagal toliau nurodytas licencijas. Palieskite, kad atvertumėte šaltinį.'
        )}
      </Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.map(({ id, place, credit }) => (
          <View key={id} style={styles.row}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={tr(
                language,
                `${place}. Photo by ${credit.author}. Opens the source page.`,
                `${place}. Nuotraukos autorius ${credit.author}. Atidaro šaltinio puslapį.`
              )}
              onPress={() => openUrl(credit.sourceUrl)}
              style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
              <Text style={styles.place}>{place}</Text>
              <Text style={Type.small}>
                {credit.author}
                {credit.modified ? tr(language, ' (modified)', ' (pakeista)') : ''}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={tr(language, `License ${credit.license}`, `Licencija ${credit.license}`)}
              onPress={() => openUrl(credit.licenseUrl)}
              style={({ pressed }) => [styles.license, pressed && styles.pressed]}>
              <Text style={styles.licenseText}>{credit.license}</Text>
              <Ionicons name="open-outline" size={14} color={Palette.green} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: MAX_SHEET_HEIGHT },
  listContent: { gap: 4, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.hairline,
  },
  main: { flex: 1, gap: 2, minHeight: Touch.min, justifyContent: 'center' },
  place: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: Palette.ink },
  license: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: Touch.min,
    paddingHorizontal: 4,
  },
  licenseText: { fontSize: 14, fontWeight: '600', color: Palette.green },
  pressed: { opacity: 0.6 },
});
