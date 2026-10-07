import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SpotStoryModal } from '@/components/spot-story-modal';
import { Card, Header, IconName, Screen, Segmented, Sheet, spotImage, tr } from '@/components/ui/kit';
import { resolveText, Spot, SPOTS } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useUnlocks } from '@/hooks/use-unlocks';
import { UnlockService } from '@/services/unlock-storage';
import { AVATAR_PRESETS, UserProfile, UserService } from '@/services/user-storage';

export default function PassportScreen() {
  const { language, setLanguage } = useLanguage();
  const { unlockedCount, total, version } = useUnlocks();
  const [profile, setProfile] = useState<UserProfile>(UserService.getProfile());
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);

  useEffect(() => UserService.subscribe(() => setProfile(UserService.getProfile())), []);

  // Collected stamps first, then the rest in their original order.
  // `version` changes whenever a pass is unlocked/reset, so the order refreshes.
  const stamps = useMemo(() => {
    void version;
    return [...SPOTS].sort(
      (a, b) => Number(UnlockService.isUnlocked(b.id)) - Number(UnlockService.isUnlocked(a.id))
    );
  }, [version]);

  const avatar = AVATAR_PRESETS.find((a) => a.id === profile.avatarId) ?? AVATAR_PRESETS[0];
  const firstName = profile.firstName || profile.name?.split(' ')[0] || '';
  const progressPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

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
      <Screen>
        <Header
          eyebrow={firstName ? tr(language, `Hi, ${firstName}`, `Sveiki, ${firstName}`) : undefined}
          title={tr(language, 'Passport', 'Pasas')}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr(language, 'Change avatar', 'Keisti avatarą')}
              onPress={() => setIsAvatarOpen(true)}
              style={[styles.avatar, { backgroundColor: avatar.bgHex }]}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              )}
            </Pressable>
          }
        />

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
          {stamps.map((spot) => {
            const isOn = UnlockService.isUnlocked(spot.id);
            const days = UnlockService.getDaysRemaining(spot.id);
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
                  <Image source={spotImage(spot)} style={[styles.stampImage, !isOn && styles.stampImageOff]} />
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

        {profile.email ? <Text style={styles.footer}>{profile.email}</Text> : null}
      </Screen>

      <Sheet
        visible={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        title={tr(language, 'Choose avatar', 'Pasirinkite avatarą')}>
        <View style={styles.avatarGrid}>
          {AVATAR_PRESETS.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              accessibilityState={{ selected: a.id === profile.avatarId }}
              onPress={() => {
                UserService.updateAvatar(a.id);
                setIsAvatarOpen(false);
              }}
              style={[
                styles.avatarOption,
                { backgroundColor: a.bgHex },
                a.id === profile.avatarId && styles.avatarOptionOn,
              ]}>
              <Text style={styles.avatarEmoji}>{a.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <SpotStoryModal
        spot={activeSpot}
        language={language}
        visible={activeSpot !== null}
        onClose={() => setActiveSpot(null)}
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
      <Ionicons name={name} size={18} color={isDanger ? Palette.danger : Palette.inkSoft} />
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
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      <SettingIcon name={icon} isDanger={isDanger} />
      <Text style={[styles.settingLabel, isDanger && styles.dangerText]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Palette.mute} />
    </Pressable>
  );
}

const STAMP = 84;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 24 },

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

  settings: { paddingVertical: 6, paddingHorizontal: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: Palette.dangerTint },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: Palette.ink },
  dangerText: { color: Palette.danger },
  langToggle: { width: 96 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.hairline, marginLeft: 44 },
  footer: { ...Type.small, textAlign: 'center', marginTop: -8 },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  avatarOption: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarOptionOn: { borderWidth: 3, borderColor: Palette.green },
});
