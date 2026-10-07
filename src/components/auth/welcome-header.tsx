import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { tr } from '@/components/ui/kit';
import { AppLanguage } from '@/constants/spots';
import { Palette } from '@/constants/theme';

/** Compact echo of Explore's green "tap card": brand name + one-line pitch. */
export function WelcomeHeader({ language }: { language: AppLanguage }) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Ionicons name="phone-portrait-outline" size={22} color={Palette.greenDeep} />
      </View>
      <View style={styles.text}>
        <Text style={styles.brand} accessibilityRole="header">
          TapTale
        </Text>
        <Text style={styles.pitch}>
          {tr(
            language,
            'Tap a plaque at a historic spot in Lithuania and unlock its story for 30 days.',
            'Priglauskite telefoną prie lentelės istorinėje Lietuvos vietoje ir atrakinkite jos istoriją 30 dienų.'
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.green,
    borderRadius: 28,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 4 },
  brand: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  pitch: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.88)' },
});
