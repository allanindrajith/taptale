import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { Colors, WiseColors, Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';

function HomeIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="M20 20L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function MeIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function HelpIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path
        d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.39913C11.0108 7.03015 11.7301 6.87895 12.4357 6.97128C13.1412 7.06362 13.7915 7.39382 14.2762 7.90422C14.7608 8.41462 15.0506 9.07323 15.0955 9.76632C15.1404 10.4594 14.9377 11.1448 14.5218 11.7067C14.1058 12.2685 13.5015 12.6719 12.81 12.85C12.33 12.98 12 13.43 12 14V14.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="17.5" r="0.75" fill={color} />
    </Svg>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  renderIcon: (color: string) => React.ReactNode;
  label: string;
}

function TabButton({
  isFocused,
  renderIcon,
  label,
  ...props
}: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const iconColor = isFocused ? WiseColors.primary : colors.textSecondary;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.pressed,
      ]}>
      <View style={styles.tabIconBox}>
        {renderIcon(iconColor)}
      </View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: iconColor,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { language } = useLanguage();

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.content} />
      <TabList
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, Spacing.xs),
          },
        ]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton
            renderIcon={(c) => <HomeIcon color={c} size={22} />}
            label={language === 'lt' ? 'Pradžia' : 'Home'}
          />
        </TabTrigger>
        <TabTrigger name="search" href="/search" asChild>
          <TabButton
            renderIcon={(c) => <SearchIcon color={c} size={22} />}
            label={language === 'lt' ? 'Paieška' : 'Search'}
          />
        </TabTrigger>
        <TabTrigger name="me" href="/me" asChild>
          <TabButton
            renderIcon={(c) => <MeIcon color={c} size={22} />}
            label={language === 'lt' ? 'Aš' : 'Me'}
          />
        </TabTrigger>
        <TabTrigger name="help" href="/help" asChild>
          <TabButton
            renderIcon={(c) => <HelpIcon color={c} size={22} />}
            label={language === 'lt' ? 'Gidas' : 'Help'}
          />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  tabIconBox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});
