/**
 * TapTale minimal UI kit.
 * Small set of shared building blocks so every screen looks and behaves the same.
 */
import React from 'react';
import {
  ActivityIndicator,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLanguage, CITIES, resolveText, Spot } from '@/constants/spots';
import { Palette, TIGHT_FONT_SCALE, Touch, Type } from '@/constants/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Pick the right string for the active language. */
export function tr(lang: AppLanguage, en: string, lt: string) {
  return lang === 'lt' ? lt : en;
}

/** "350 m" / "2.4 km" — compact distance without the word "away". */
export function shortDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Walking minutes (~4.8 km/h) — used as the single travel hint in lists. */
export function walkMinutes(km: number) {
  return Math.max(1, Math.round(km * 12.5));
}

export function spotImage(spot: Spot): ImageSourcePropType {
  return typeof spot.imageUrl === 'string' ? { uri: spot.imageUrl } : spot.imageUrl;
}

export function cityName(spot: Spot, lang: AppLanguage) {
  const c = CITIES.find((x) => x.id === spot.cityID);
  return c ? resolveText(c.name, lang) : '';
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface ScreenProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Scrollable page with safe-area top padding and optional pull-to-refresh. */
export function Screen({ children, refreshing, onRefresh, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.screenContent,
          { paddingTop: Math.max(insets.top, 20) + 12 },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={Palette.green}
              colors={[Palette.green]}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </View>
  );
}

export function Header({
  title,
  eyebrow,
  right,
}: {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={Type.display} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={Type.heading}>{title}</Text>
      {trailing ? <Text style={Type.small}>{trailing}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  testID,
}: ButtonProps) {
  const fg =
    variant === 'primary' ? '#FFFFFF' : variant === 'secondary' ? Palette.ink : Palette.green;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        (disabled || loading) && { opacity: 0.55 },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={fg} />
      ) : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'light',
  size = 44,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'light' | 'glass';
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(8, Math.ceil((Touch.min - size) / 2))}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        tone === 'glass' && styles.iconBtnGlass,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={Math.max(20, Math.round(size * 0.5))}
        color={tone === 'glass' ? '#FFFFFF' : Palette.ink}
      />
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipRowOuter}
      contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

/** Two-option segmented control (e.g. EN / LT, Voice / Music). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}>
            {o.icon ? (
              <Ionicons name={o.icon} size={17} color={active ? Palette.ink : Palette.mute} />
            ) : null}
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PillTone = 'green' | 'gold' | 'neutral' | 'danger';

export function Pill({ label, icon, tone = 'neutral' }: { label: string; icon?: IconName; tone?: PillTone }) {
  const map = {
    green: { bg: Palette.greenTint, fg: Palette.green },
    gold: { bg: Palette.goldTint, fg: Palette.gold },
    neutral: { bg: Palette.surfaceMuted, fg: Palette.inkSoft },
    danger: { bg: Palette.dangerTint, fg: Palette.danger },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      {icon ? <Ionicons name={icon} size={14} color={map.fg} /> : null}
      <Text style={[styles.pillText, { color: map.fg }]} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Spot list row                                                       */
/* ------------------------------------------------------------------ */

interface SpotRowProps {
  spot: Spot;
  language: AppLanguage;
  distanceKm?: number;
  unlocked: boolean;
  daysLeft?: number;
  onPress: () => void;
  meta?: string;
}

export function SpotRow({ spot, language, distanceKm, unlocked, daysLeft, onPress, meta }: SpotRowProps) {
  const subtitle =
    meta ??
    [cityName(spot, language), distanceKm !== undefined ? shortDistance(distanceKm) : null]
      .filter(Boolean)
      .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolveText(spot.title, language)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Image
        source={spotImage(spot)}
        style={styles.rowThumb}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {resolveText(spot.title, language)}
        </Text>
        <Text style={Type.small} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {unlocked ? (
        <View style={styles.rowState}>
          <Ionicons name="checkmark-circle" size={26} color={Palette.green} />
          {daysLeft !== undefined ? (
            <Text style={styles.rowStateText}>{tr(language, `${daysLeft}d`, `${daysLeft} d.`)}</Text>
          ) : null}
        </View>
      ) : (
        <Ionicons name="lock-closed-outline" size={22} color={Palette.mute} />
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.sheetGrabber} />
          {title ? (
            <View style={styles.sheetHeader}>
              <Text style={[Type.title, styles.sheetTitle]}>{title}</Text>
              <IconButton icon="close" label="Close" onPress={onClose} size={40} />
            </View>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={Palette.mute} />
      </View>
      <Text style={[Type.heading, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[Type.small, styles.emptyBody]}>{body}</Text> : null}
      {action}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  screenContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 24,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  eyebrow: { ...Type.small, marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  btn: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: { backgroundColor: Palette.green },
  btnSecondary: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  btnGhost: { backgroundColor: 'transparent', minHeight: Touch.min },
  btnText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.1, textAlign: 'center', flexShrink: 1 },

  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
  },
  iconBtnGlass: { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.25)' },

  chipRowOuter: { marginHorizontal: -20, flexGrow: 0 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  chipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  chipText: { fontSize: 15, fontWeight: '600', color: Palette.inkSoft },
  chipTextActive: { color: '#FFFFFF' },

  segment: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 14,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  segmentItemActive: {
    backgroundColor: Palette.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 15, fontWeight: '600', color: Palette.mute },
  segmentTextActive: { color: Palette.ink },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { fontSize: 13, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 88,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: 16,
  },
  rowPressed: { backgroundColor: Palette.surfaceMuted },
  rowThumb: { width: 70, height: 70, borderRadius: 16, backgroundColor: Palette.surfaceMuted },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: Palette.ink, letterSpacing: -0.2 },
  rowState: { alignItems: 'center', gap: 2, minWidth: 32 },
  rowStateText: { fontSize: 13, fontWeight: '600', color: Palette.green },

  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: Palette.overlay },
  sheet: {
    backgroundColor: Palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.hairline,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { flex: 1 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyBody: { textAlign: 'center', lineHeight: 21 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
