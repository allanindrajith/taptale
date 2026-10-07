import React from 'react';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconName, tr } from '@/components/ui/kit';
import { Palette } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';

interface TabButtonProps extends TabTriggerSlotProps {
  icon: IconName;
  activeIcon: IconName;
  label: string;
}

function TabButton({ isFocused, icon, activeIcon, label, ...props }: TabButtonProps) {
  const color = isFocused ? Palette.green : Palette.mute;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
        <Ionicons name={isFocused ? activeIcon : icon} size={22} color={color} />
      </View>
      <Text style={[styles.label, { color }, isFocused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  return (
    <Tabs style={styles.flex}>
      <TabSlot style={styles.flex} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="compass-outline" activeIcon="compass" label={tr(language, 'Explore', 'Atrasti')} />
        </TabTrigger>
        <TabTrigger name="me" href="/me" asChild>
          <TabButton icon="ribbon-outline" activeIcon="ribbon" label={tr(language, 'Passport', 'Pasas')} />
        </TabTrigger>
        <TabTrigger name="help" href="/help" asChild>
          <TabButton icon="help-circle-outline" activeIcon="help-circle" label={tr(language, 'Help', 'Pagalba')} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.hairline,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: Palette.greenTint },
  label: { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
