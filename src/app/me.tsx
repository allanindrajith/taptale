import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ProfileAvatar, ProfileEditor } from '@/components/profile-editor';
import { SpotStoryModal } from '@/components/spot-story-modal';
import { Card, Header, IconName, Screen, Segmented, spotImage, tr } from '@/components/ui/kit';
import { resolveText, Spot, SPOTS } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useUnlocks } from '@/hooks/use-unlocks';
import { UnlockService } from '@/services/unlock-storage';
import { UserProfile, UserService } from '@/services/user-storage';

const SAVED_VISIBLE_MS = 2000;
const FADE_MS = 200;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface Stamp {
  spot: Spot;
  isOn: boolean;
  days: number;
}

/**
 * Collected stamps first, then the rest in their original order.
 * `version` comes from useUnlocks(); taking it as an argument makes React Compiler
 * re-read every pass after an unlock/reset (a closure over it gets cached stale).
 */
function getStamps(version: number): Stamp[] {
  void version;
  return SPOTS.map((spot) => ({
    spot,
    isOn: UnlockService.isUnlocked(spot.id),
    days: UnlockService.getDaysRemaining(spot.id),
  })).sort((a, b) => Number(b.isOn) - Number(a.isOn));
}

export default function PassportScreen() {
  const { language, setLanguage } = useLanguage();
  const { unlockedCount, total, version } = useUnlocks();
  const [profile, setProfile] = useState<UserProfile>(UserService.getProfile());
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // Bumped on every open so the editor remounts with a fresh draft (Cancel discards).
  const [editSession, setEditSession] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [savedOpacity] = useState(() => new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);

  // Pull down: re-read passes (stamps, count, days left) and the profile
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await UnlockService.reload();
      setProfile(UserService.getProfile());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => UserService.subscribe(() => setProfile(UserService.getProfile())), []);

  // "Saved" pill: fade in, hold, fade out. Cleanup clears the timer on re-save and unmount.
  useEffect(() => {
    if (savedAt === null) return;
    Animated.timing(savedOpacity, { toValue: 1, duration: FADE_MS, useNativeDriver: USE_NATIVE_DRIVER }).start();
    const timer = setTimeout(() => {
      Animated.timing(savedOpacity, { toValue: 0, duration: FADE_MS, useNativeDriver: USE_NATIVE_DRIVER }).start(
        ({ finished }) => {
          if (finished) setSavedAt(null);
        }
      );
    }, SAVED_VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      savedOpacity.stopAnimation();
    };
  }, [savedAt, savedOpacity]);

  const stamps = getStamps(version);

  const firstName = profile.firstName || profile.name?.split(' ')[0] || '';
  const progressPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const openEditor = () => {
    setEditSession((n) => n + 1);
    setIsEditorOpen(true);
  };

  const handleSaved = () => {
    setIsEditorOpen(false);
    setSavedAt(Date.now());
    AccessibilityInfo.announceForAccessibility(tr(language, 'Profile saved', 'Profilis išsaugotas'));
  };

  const confirmSignOut = () =>
    Alert.alert(tr(language, 'Sign out?', 'Atsijungti?'), undefined, [
      { text: tr(language, 'Cancel', 'Atšaukti'), style: 'cancel' },
      { text: tr(language, 'Sign out', 'Atsijungti'), style: 'destructive', onPress: () => UserService.logOut() },
    ]);

  const confirmReset = () =>
    Alert.alert(
      tr(language, 'Reset passes?', 'Atstatyti leidimus?'),
      tr(
        language,
        'Locks every place except Cathedral Square. Useful for testing plaques.',
        'Užrakina visas vietas, išskyrus Katedros aikštę. Naudinga testuojant lenteles.'
      ),
      [
        { text: tr(language, 'Cancel', 'Atšaukti'), style: 'cancel' },
        { text: tr(language, 'Reset', 'Atstatyti'), style: 'destructive', onPress: () => UnlockService.resetEverything() },
      ]
    );

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Header
          eyebrow={firstName ? tr(language, `Hi, ${firstName}`, `Sveiki, ${firstName}`) : undefined}
          title={tr(language, 'Passport', 'Pasas')}
        />

        {/* Profile */}
        <Card style={styles.profileCard}>
          <ProfileAvatar uri={profile.avatarUri} avatarId={profile.avatarId} size={64} />
          <View style={styles.profileText}>
            <Text style={[styles.profileName, !profile.name && styles.profileNameEmpty]} numberOfLines={2}>
              {profile.name || tr(language, 'Add your name', 'Pridėkite vardą')}
            </Text>
            {savedAt !== null ? (
              <Animated.View style={[styles.savedPill, { opacity: savedOpacity }]}>
                <Ionicons name="checkmark-circle" size={16} color={Palette.green} />
                <Text style={styles.savedText}>{tr(language, 'Saved', 'Išsaugota')}</Text>
              </Animated.View>
            ) : profile.email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profile.email}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr(language, 'Edit profile', 'Redaguoti profilį')}
            onPress={openEditor}
            hitSlop={6}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Ionicons name="create-outline" size={18} color={Palette.green} />
            <Text style={styles.editText}>{tr(language, 'Edit', 'Redaguoti')}</Text>
          </Pressable>
        </Card>

        {/* Progress */}
        <View style={styles.summary}>
          <Text style={styles.bigNumber}>{unlockedCount}</Text>
          <View style={styles.flex}>
            <Text style={Type.heading}>
              {tr(language, `of ${total} places collected`, `iš ${total} vietų surinkta`)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        </View>

        {/* Stamps */}
        <View style={styles.grid}>
          {stamps.map(({ spot, isOn, days }) => {
            const name = resolveText(spot.title, language);
            const state = isOn ? tr(language, 'collected', 'surinkta') : tr(language, 'locked', 'užrakinta');
            return (
              <Pressable
                key={spot.id}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${state}`}
                onPress={() => setActiveSpot(spot)}
                style={({ pressed }) => [styles.stamp, pressed && styles.pressed]}>
                <View style={[styles.stampRing, isOn ? styles.stampRingOn : styles.stampRingOff]}>
                  <Image
                    source={spotImage(spot)}
                    style={[styles.stampImage, !isOn && styles.stampImageOff]}
                    contentFit="cover"
                    transition={200}
                  />
                  {!isOn ? (
                    <View style={styles.stampLock}>
                      <Ionicons name="lock-closed" size={14} color={Palette.inkSoft} />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.stampName, !isOn && styles.stampNameOff]} numberOfLines={2}>
                  {name}
                </Text>
                {isOn ? <Text style={styles.stampDays}>{tr(language, `${days} days`, `${days} d.`)}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Settings */}
        <Card style={styles.settings}>
          <View style={styles.settingRow}>
            <SettingIcon name="language-outline" />
            <Text style={styles.settingLabel}>{tr(language, 'Language', 'Kalba')}</Text>
            <View style={styles.langToggle}>
              <Segmented
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'en', label: 'EN' },
                  { value: 'lt', label: 'LT' },
                ]}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <SettingRow icon="refresh-outline" label={tr(language, 'Reset passes', 'Atstatyti leidimus')} onPress={confirmReset} />
          <View style={styles.divider} />
          <SettingRow icon="log-out-outline" label={tr(language, 'Sign out', 'Atsijungti')} onPress={confirmSignOut} isDanger />
        </Card>

      </Screen>

      <ProfileEditor
        key={editSession}
        visible={isEditorOpen}
        language={language}
        profile={profile}
        onCancel={() => setIsEditorOpen(false)}
        onSaved={handleSaved}
      />

      <SpotStoryModal
        spot={activeSpot}
        language={language}
        visible={activeSpot !== null}
        onClose={() => setActiveSpot(null)}
        onOpenSpot={setActiveSpot}
      />
    </>
  );
}

interface SettingIconProps {
  name: IconName;
  isDanger?: boolean;
}

function SettingIcon({ name, isDanger }: SettingIconProps) {
  return (
    <View style={[styles.settingIcon, isDanger && styles.settingIconDanger]}>
      <Ionicons name={name} size={20} color={isDanger ? Palette.danger : Palette.inkSoft} />
    </View>
  );
}

interface SettingRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  isDanger?: boolean;
}

function SettingRow({ icon, label, onPress, isDanger }: SettingRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      <SettingIcon name={icon} isDanger={isDanger} />
      <Text style={[styles.settingLabel, isDanger && styles.dangerText]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={Palette.mute} />
    </Pressable>
  );
}

const STAMP = 84;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  profileText: { flex: 1, gap: 4 },
  profileName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: Palette.ink },
  profileNameEmpty: { color: Palette.mute },
  profileEmail: { ...Type.small },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Palette.greenTint,
  },
  savedText: { fontSize: 13, fontWeight: '700', color: Palette.green },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Palette.greenTint,
  },
  editText: { fontSize: 16, fontWeight: '700', color: Palette.green },

  summary: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigNumber: { fontSize: 56, fontWeight: '800', color: Palette.gold, letterSpacing: -2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.surfaceMuted,
    marginTop: 10,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: Palette.gold },

  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
  stamp: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  stampRing: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    padding: 4,
    borderWidth: 2,
  },
  stampRingOn: { borderColor: Palette.gold, backgroundColor: Palette.goldTint },
  stampRingOff: { borderColor: Palette.hairline, borderStyle: 'dashed' },
  stampImage: { width: '100%', height: '100%', borderRadius: STAMP / 2 },
  stampImageOff: { opacity: 0.3 },
  stampLock: {
    position: 'absolute',
    alignSelf: 'center',
    top: STAMP / 2 - 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampName: { fontSize: 13, fontWeight: '600', color: Palette.ink, textAlign: 'center' },
  stampNameOff: { color: Palette.mute },
  stampDays: { fontSize: 11, fontWeight: '700', color: Palette.gold, marginTop: -2 },

  settings: { paddingVertical: 6, paddingHorizontal: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: Palette.dangerTint },
  settingLabel: { flex: 1, fontSize: 17, fontWeight: '500', color: Palette.ink },
  dangerText: { color: Palette.danger },
  langToggle: { minWidth: 112 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.hairline, marginLeft: 50 },
});
