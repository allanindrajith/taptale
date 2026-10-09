import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapAppIcon } from '@/components/map-app-icon';
import { Sheet, tr } from '@/components/ui/kit';
import { AppLanguage, Spot } from '@/constants/spots';
import { Palette } from '@/constants/theme';
import { MapApp } from '@/services/directions';

interface Props {
  picker: { spot: Spot; apps: MapApp[] } | null;
  language: AppLanguage;
  onChoose: (app: MapApp) => void;
  onClose: () => void;
}

const ICON_SIZE = 52;

/** Row of the navigation / ride apps installed on this phone, each shown by its own icon. */
export function DirectionsSheet({ picker, language, onChoose, onClose }: Props) {
  return (
    <Sheet visible={picker !== null} onClose={onClose} title={tr(language, 'Directions', 'Maršrutas')}>
      <View style={styles.row}>
        {picker?.apps.map((app) => (
          <Pressable
            key={app.id}
            accessibilityRole="button"
            accessibilityLabel={tr(language, `Open in ${app.name}`, `Atidaryti ${app.name}`)}
            onPress={() => onChoose(app)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <MapAppIcon appId={app.id} size={ICON_SIZE} />
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {app.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // One line: every app shares the width equally, names shrink slightly instead of truncating
  row: { flexDirection: 'row', gap: 6, paddingVertical: 8 },
  item: { flex: 1, alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.6 },
  name: { alignSelf: 'stretch', fontSize: 11, fontWeight: '600', color: Palette.ink, textAlign: 'center' },
});
