import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpotStoryModal } from '@/components/spot-story-modal';
import {
  AppLanguage,
  resolveText,
  Spot,
  SPOTS,
} from '@/constants/spots';
import { Spacing, WiseColors } from '@/constants/theme';
import {
  AVATAR_PRESETS,
  AchievementBadge,
  TimelineEntry,
  UserProfile,
  UserService,
  DEMO_ACCOUNT,
} from '@/services/user-storage';
import { UnlockService } from '@/services/unlock-storage';
import { AppleLogo, GoogleLogo, MailIcon, UserIcon } from '@/components/brand-icons';
import { useLanguage } from '@/hooks/use-language';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const { language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>(UserService.getProfile());
  const [achievements, setAchievements] = useState(UserService.getAchievements());
  const [timeline, setTimeline] = useState<TimelineEntry[]>(UserService.getVisitTimeline());

  // Modals state
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [selectedSpotForStory, setSelectedSpotForStory] = useState<Spot | null>(null);

  // Status feedback toast/banner
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshData();
    const unsubscribe = UserService.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  function refreshData() {
    setProfile(UserService.getProfile());
    setAchievements(UserService.getAchievements());
    setTimeline(UserService.getVisitTimeline());
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refreshData();
      await new Promise((resolve) => setTimeout(resolve, 600));
      refreshData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  function showBanner(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  }

  // Auth actions
  function handleConnectApple() {
    UserService.connectApple('Traveler Allan', 'allan.traveler@icloud.com');
    showBanner('Connected with Apple ID! All passes and badges synced to iCloud.');
  }

  function handleConnectGoogle() {
    UserService.connectGoogle('Allan Indrajith', 'allan.indrajith@gmail.com');
    showBanner('Connected with Google! Cloud sync active.');
  }

  function handleConnectEmailSubmit() {
    if (!emailInput || !emailInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    UserService.connectEmail(emailInput.trim(), nameInput.trim() || undefined);
    setEmailModalVisible(false);
    setEmailInput('');
    setNameInput('');
    showBanner('✉️ Email account linked! Your visit history is safely backed up.');
  }

  function handleLogOut() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? You will return to the Welcome & Sign In screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            UserService.logOut();
          },
        },
      ]
    );
  }

  function handleResetDemo() {
    Alert.alert(
      language === 'lt' ? 'Atstatyti leidimus' : 'Reset Passes',
      language === 'lt'
        ? 'Palikti tik Katedros aikštę atrakintą, o visas kitas 6 vietas užrakinti NFC testavimui?'
        : 'Keep only Cathedral Square unlocked and lock all other 6 places to test NFC tags?',
      [
        { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
        {
          text: language === 'lt' ? 'Atstatyti' : 'Reset',
          style: 'destructive',
          onPress: async () => {
            await UnlockService.resetEverything();
            refreshData();
            showBanner(
              language === 'lt'
                ? 'Katedros aikštė atrakinta. Kitos 6 vietos užrakintos ir paruoštos NFC testavimui!'
                : 'Cathedral Square kept unlocked. Other 6 spots locked & ready for NFC testing!'
            );
          },
        },
      ]
    );
  }

  const currentAvatar =
    AVATAR_PRESETS.find((a) => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WiseColors.forestGreen}
            colors={[WiseColors.forestGreen]}
            progressBackgroundColor={WiseColors.canvas}
          />
        }>
        
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>
              {language === 'lt' ? 'Mano Profilis ir Nustatymai' : 'Me & Settings'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {language === 'lt'
                ? 'Profilis, nustatymai, pasiekimai ir 30 dienų leidimai'
                : 'Profile, settings, achievements & 30-day visit timeline'}
            </Text>
          </View>

        </View>

        {/* Temporary Banner Message */}
        {statusMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{statusMessage}</Text>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileMainRow}>
            {/* Avatar with edit icon */}
            <Pressable
              style={[styles.avatarCircle, { backgroundColor: currentAvatar.bgHex }]}
              onPress={() => setAvatarModalVisible(true)}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarCustomImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
              )}
              <View style={styles.avatarEditPill}>
                <Text style={styles.avatarEditText}>✎</Text>
              </View>
            </Pressable>

            {/* Profile Info */}
            <View style={styles.profileTextCol}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{profile.name}</Text>
                {profile.isConnected && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>
                {profile.email}
              </Text>
              {profile.birthDate ? (
                <Text style={styles.userDob}>🎂 Born: {profile.birthDate}</Text>
              ) : null}

              {/* Provider Badge */}
              <View style={styles.providerPill}>
                {profile.provider === 'apple' && (
                  <View style={styles.providerContentRow}>
                    <AppleLogo size={13} color={WiseColors.primary} />
                    <Text style={styles.providerText}>Apple Account</Text>
                  </View>
                )}
                {profile.provider === 'google' && (
                  <View style={styles.providerContentRow}>
                    <GoogleLogo size={13} />
                    <Text style={styles.providerText}>Google Account</Text>
                  </View>
                )}
                {profile.provider === 'email' && (
                  <View style={styles.providerContentRow}>
                    <MailIcon size={13} color={WiseColors.primary} />
                    <Text style={styles.providerText}>Email Account</Text>
                  </View>
                )}
                {profile.provider === 'guest' && (
                  <View style={styles.providerContentRow}>
                    <UserIcon size={13} color={WiseColors.primary} />
                    <Text style={styles.providerText}>Guest Explorer</Text>
                  </View>
                )}
                {profile.cloudSyncEnabled && (
                  <Text style={styles.syncDot}> • Cloud Sync ON</Text>
                )}
              </View>
            </View>
          </View>

          {/* Profile Actions: Switch Avatar & Log Out / Disconnect */}
          <View style={styles.profileActionsRow}>
            <Pressable
              style={styles.profileActionBtn}
              onPress={() => setAvatarModalVisible(true)}>
              <Text style={styles.profileActionBtnText}>
                {language === 'lt' ? 'Keisti Avatarą' : 'Change Avatar'}
              </Text>
            </Pressable>

            {profile.isConnected ? (
              <Pressable style={styles.logOutBtn} onPress={handleLogOut}>
                <Text style={styles.logOutBtnText}>
                  {language === 'lt' ? 'Atsijungti' : 'Log Out'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.connectPrimaryBtn}
                onPress={() => setEmailModalVisible(true)}>
                <Text style={styles.connectPrimaryBtnText}>
                  {language === 'lt' ? 'Prisijungti' : 'Sign In'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Connect Options Card (If guest or linking accounts) */}
        {!profile.isConnected ? (
          <View style={styles.connectCard}>
            <Text style={styles.sectionHeader}>
              {language === 'lt' ? 'Išsaugokite Duomenis' : 'Save Your Visit Lore & Passes'}
            </Text>
            <Text style={styles.connectCardDesc}>
              {language === 'lt'
                ? 'Prisijunkite su Apple, Google arba el. paštu, kad išsaugotumėte savo 30 dienų leidimus keliuose įrenginiuose.'
                : 'Connect with Apple, Google, or Email to securely backup your 30-day passes, unlocked lore, and milestone badges.'}
            </Text>

            <View style={styles.connectButtonsGrid}>
              <Pressable style={styles.appleBtn} onPress={handleConnectApple}>
                <AppleLogo size={18} color="#ffffff" />
                <Text style={styles.appleBtnText}>Continue with Apple</Text>
              </Pressable>

              <Pressable style={styles.googleBtn} onPress={handleConnectGoogle}>
                <GoogleLogo size={18} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                style={styles.emailBtn}
                onPress={() => setEmailModalVisible(true)}>
                <MailIcon size={18} color={WiseColors.primary} />
                <Text style={styles.emailBtnText}>Continue with Email</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.syncCard}>
            <View style={styles.syncCardRow}>
              <View style={styles.syncIconWrap}>
                <Text style={styles.syncIcon}>☁️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.syncTitle}>
                  {language === 'lt' ? 'Debesies Saugykla Aktyvi' : 'Cloud Backup Active'}
                </Text>
                <Text style={styles.syncDesc}>
                  {language === 'lt'
                    ? 'Visi 30 dienų NFC leidimai ir pasiekimai automatiškai sinchronizuojami.'
                    : 'All unlocked sites, 30-day NFC passes and badges are protected.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ACHIEVEMENTS & BADGES SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {language === 'lt' ? 'Pasiekimai ir Ženkleliai' : 'Achievements & Badges'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {language === 'lt'
                  ? `Aplankyta ${achievements.visitedPlacesCount} iš ${achievements.totalPlaces} vietų (${achievements.completionPercent}%)`
                  : `${achievements.visitedPlacesCount} of ${achievements.totalPlaces} places unlocked (${achievements.completionPercent}%)`}
              </Text>
            </View>

            {/* Earned counter pill */}
            <View style={styles.badgeCountPill}>
              <Text style={styles.badgeCountText}>
                🏆 {achievements.unlockedCount} / {achievements.badges.length}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(8, achievements.completionPercent)}%` },
              ]}
            />
          </View>

          {/* Badges Grid */}
          <View style={styles.badgesGrid}>
            {achievements.badges.map((badge) => (
              <Pressable
                key={badge.id}
                style={[
                  styles.badgeCard,
                  badge.isUnlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
                ]}
                onPress={() => setSelectedBadge(badge)}>
                <View
                  style={[
                    styles.badgeIconCircle,
                    badge.isUnlocked
                      ? styles.badgeIconCircleUnlocked
                      : styles.badgeIconCircleLocked,
                  ]}>
                  <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                  {badge.isUnlocked && (
                    <View style={styles.badgeCheckPill}>
                      <Text style={styles.badgeCheckText}>✓</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.badgeTitle,
                    !badge.isUnlocked && styles.badgeTitleLocked,
                  ]}
                  numberOfLines={1}>
                  {language === 'lt' ? badge.titleLt : badge.titleEn}
                </Text>

                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {language === 'lt' ? badge.descLt : badge.descEn}
                </Text>

                {/* Progress / Status Tag */}
                <View
                  style={[
                    styles.badgeStatusTag,
                    badge.isUnlocked
                      ? styles.badgeStatusTagUnlocked
                      : styles.badgeStatusTagLocked,
                  ]}>
                  <Text
                    style={[
                      styles.badgeStatusText,
                      badge.isUnlocked
                        ? styles.badgeStatusTextUnlocked
                        : styles.badgeStatusTextLocked,
                    ]}>
                    {badge.isUnlocked
                      ? language === 'lt'
                        ? 'Gautas'
                        : 'Earned'
                      : `${badge.currentCount}/${badge.totalRequired}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* VISIT TIMELINE SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {language === 'lt' ? 'Apsilankymų Istorija' : 'Visit Timeline'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {language === 'lt'
                  ? 'Jūsų atrakintos vietos ir aktyvūs 30 dienų leidimai'
                  : 'Historical landmarks visited & active 30-day passes'}
              </Text>
            </View>
          </View>

          {timeline.length === 0 ? (
            <View style={styles.emptyTimelineCard}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>
                {language === 'lt'
                  ? 'Dar neaplankyta jokia vieta'
                  : 'No Places Visited Yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {language === 'lt'
                  ? 'Eikite į Pradžią arba Naršyti, suraskite istorinę vietą Vilniuje, Kaune, Palangoje, Trakuose ar Šiauliuose ir nuskaitykite NFC lentelę arba suveskite kodą!'
                  : 'Visit historical spots in Vilnius, Kaunas, Palanga, Trakai, or Šiauliai and tap the physical NFC tag to unlock 30-day passes and record your timeline!'}
              </Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {timeline.map((entry, index) => {
                const titleStr = resolveText(entry.spot.title, language);
                const isLast = index === timeline.length - 1;

                return (
                  <View key={entry.spot.id} style={styles.timelineItemRow}>
                    {/* Timeline line & dot */}
                    <View style={styles.timelineSpineCol}>
                      <View style={styles.timelineDot}>
                        <Text style={styles.timelineDotInner}>✓</Text>
                      </View>
                      {!isLast && <View style={styles.timelineSpineLine} />}
                    </View>

                    {/* Timeline Card */}
                    <Pressable
                      style={styles.timelineCard}
                      onPress={() => setSelectedSpotForStory(entry.spot)}>
                      <Image
                        source={
                          typeof entry.spot.imageUrl === 'string'
                            ? { uri: entry.spot.imageUrl }
                            : entry.spot.imageUrl
                        }
                        style={styles.timelinePhoto}
                        resizeMode="cover"
                      />

                      <View style={styles.timelineCardBody}>
                        <View style={styles.timelineHeaderRow}>
                          <Text style={styles.timelineSpotTitle} numberOfLines={1}>
                            {titleStr}
                          </Text>
                          <Text style={styles.timelineDateText}>
                            {entry.visitedDateFormatted}
                          </Text>
                        </View>

                        <Text style={styles.timelineTeaser} numberOfLines={2}>
                          {resolveText(entry.spot.teaser, language)}
                        </Text>

                        {/* 30-day Pass Badge */}
                        <View style={styles.timelinePassRow}>
                          <View
                            style={[
                              styles.passPill,
                              entry.isPassActive
                                ? styles.passPillActive
                                : styles.passPillExpired,
                            ]}>
                            <Text
                              style={[
                                styles.passPillText,
                                entry.isPassActive
                                  ? styles.passPillTextActive
                                  : styles.passPillTextExpired,
                              ]}>
                              {entry.isPassActive
                                ? `🟢 ${entry.daysRemaining} days left on pass`
                                : '⚠️ Pass Expired (Tap NFC to renew)'}
                            </Text>
                          </View>

                          <View style={styles.readStoryPill}>
                            <Text style={styles.readStoryText}>
                              {language === 'lt' ? 'Istorija ➔' : 'Story & Lore ➔'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* SETTINGS & SYSTEM SECTION */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>
            {language === 'lt' ? 'Programėlės Nustatymai' : 'Settings & Preferences'}
          </Text>

          <View style={styles.settingsCard}>
            {/* Language Setting */}
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>
                  {language === 'lt' ? 'Kalba / Language' : 'App Language'}
                </Text>
                <Text style={styles.settingSub}>
                  {language === 'en'
                    ? 'English (Active)'
                    : 'Lietuvių kalba (Aktyvi)'}
                </Text>
              </View>
              <View style={styles.settingLangButtons}>
                <Pressable
                  style={[
                    styles.langChip,
                    language === 'en' && styles.langChipActive,
                  ]}
                  onPress={() => setLanguage('en')}>
                  <Text
                    style={[
                      styles.langChipText,
                      language === 'en' && styles.langChipTextActive,
                    ]}>
                    EN
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.langChip,
                    language === 'lt' && styles.langChipActive,
                  ]}
                  onPress={() => setLanguage('lt')}>
                  <Text
                    style={[
                      styles.langChipText,
                      language === 'lt' && styles.langChipTextActive,
                    ]}>
                    LT
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Cloud Backup Toggle */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.settingLabel}>
                  {language === 'lt' ? 'Debesies Sinchronizacija' : 'Cloud Sync & Pass Backup'}
                </Text>
                <Text style={styles.settingSub}>
                  {profile.cloudSyncEnabled
                    ? language === 'lt'
                      ? 'Sinchronizuojama su paskyra'
                      : 'Automatically saved to your account'
                    : language === 'lt'
                    ? 'Išjungta (tik šiame įrenginyje)'
                    : 'Disabled (stored locally only)'}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.toggleBtn,
                  profile.cloudSyncEnabled && styles.toggleBtnActive,
                ]}
                onPress={() => UserService.toggleCloudSync()}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    profile.cloudSyncEnabled && styles.toggleBtnTextActive,
                  ]}>
                  {profile.cloudSyncEnabled ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
            </View>

            {/* Reset Passes for Testing */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.settingLabel}>
                  {language === 'lt' ? 'Atstatyti Leidimus' : 'Reset Passes (Test NFC)'}
                </Text>
                <Text style={styles.settingSub}>
                  {language === 'lt'
                    ? 'Palikti Katedros aikštę atrakintą, o kitas 6 vietas užrakinti NFC testui'
                    : 'Keep Cathedral Square unlocked and lock other 6 places for NFC testing'}
                </Text>
              </View>
              <Pressable style={styles.resetBtn} onPress={handleResetDemo}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* AVATAR PICKER MODAL */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'lt' ? 'Pasirinkite Avatarą' : 'Choose Your Traveler Avatar'}
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              {language === 'lt'
                ? 'Pasirinkite personažą, kuris atspindės jus TapTale kelionių žurnale'
                : 'Select an avatar to represent you on your Lithuanian historical journey'}
            </Text>

            <View style={styles.avatarGrid}>
              {AVATAR_PRESETS.map((avatar) => {
                const isSelected = profile.avatarId === avatar.id;
                return (
                  <Pressable
                    key={avatar.id}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: avatar.bgHex },
                      isSelected && styles.avatarOptionSelected,
                    ]}
                    onPress={() => {
                      UserService.updateAvatar(avatar.id);
                      setAvatarModalVisible(false);
                      showBanner(`Avatar updated to ${avatar.label}!`);
                    }}>
                    <Text style={styles.avatarOptionEmoji}>{avatar.emoji}</Text>
                    <Text style={styles.avatarOptionLabel}>{avatar.label}</Text>
                    {isSelected && (
                      <View style={styles.avatarOptionCheck}>
                        <Text style={styles.avatarOptionCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* EMAIL SIGN-IN MODAL */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'lt' ? 'Prisijungti su El. Paštu' : 'Save With Email'}
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setEmailModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              {language === 'lt'
                ? 'Įveskite savo el. pašto adresą, kad išsaugotumėte savo 30 dienų leidimus ir pasiekimus'
                : 'Enter your email to backup your 30-day NFC passes, lore discoveries, and badges across devices'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {language === 'lt' ? 'Jūsų Vardas' : 'Your Name'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Allan Traveler"
                placeholderTextColor="#9ca3af"
                value={nameInput}
                onChangeText={setNameInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {language === 'lt' ? 'El. Paštas' : 'Email Address'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailInput}
                onChangeText={setEmailInput}
              />
            </View>

            <Pressable
              style={styles.modalSubmitBtn}
              onPress={handleConnectEmailSubmit}>
              <Text style={styles.modalSubmitBtnText}>
                {language === 'lt' ? 'Išsaugoti Paskyrą' : 'Save Account & Sync'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* BADGE CERTIFICATE / DETAIL MODAL */}
      {selectedBadge && (
        <Modal
          visible={!!selectedBadge}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBadge(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.badgeDetailContent}>
              <View
                style={[
                  styles.badgeDetailCircle,
                  selectedBadge.isUnlocked
                    ? styles.badgeDetailCircleUnlocked
                    : styles.badgeDetailCircleLocked,
                ]}>
                <Text style={styles.badgeDetailEmoji}>{selectedBadge.icon}</Text>
              </View>

              <Text style={styles.badgeDetailTitle}>
                {language === 'lt' ? selectedBadge.titleLt : selectedBadge.titleEn}
              </Text>

              <View
                style={[
                  styles.badgeDetailPill,
                  selectedBadge.isUnlocked
                    ? styles.badgeDetailPillUnlocked
                    : styles.badgeDetailPillLocked,
                ]}>
                <Text
                  style={[
                    styles.badgeDetailPillText,
                    selectedBadge.isUnlocked
                      ? styles.badgeDetailPillTextUnlocked
                      : styles.badgeDetailPillTextLocked,
                  ]}>
                  {selectedBadge.isUnlocked
                    ? language === 'lt'
                      ? '✓ PASIEKIMAS GAUTAS'
                      : '✓ ACHIEVEMENT EARNED'
                    : language === 'lt'
                    ? `🔒 UŽRAKINTA (${selectedBadge.currentCount}/${selectedBadge.totalRequired})`
                    : `🔒 LOCKED (${selectedBadge.currentCount}/${selectedBadge.totalRequired})`}
                </Text>
              </View>

              <Text style={styles.badgeDetailDesc}>
                {language === 'lt' ? selectedBadge.descLt : selectedBadge.descEn}
              </Text>

              <View style={styles.badgeDetailLoreBox}>
                <Text style={styles.badgeDetailLoreTitle}>
                  {language === 'lt' ? 'Kaip Atrakinti:' : 'How to Unlock:'}
                </Text>
                <Text style={styles.badgeDetailLoreText}>
                  {selectedBadge.id === 'badge-first-tap' &&
                    (language === 'lt'
                      ? 'Aplankykite bet kurį istorinį objektą Lietuvoje ir priglauskite telefoną prie NFC žymos arba įveskite kodą.'
                      : 'Visit any historical landmark in Lithuania and tap the physical NFC plaque or enter the site passkey.')}
                  {selectedBadge.id === 'badge-castle-master' &&
                    (language === 'lt'
                      ? 'Aplankykite Gedimino pilies bokštą Vilniuje ir Trakų salos pilį.'
                      : "Visit both Gediminas' Castle Tower in Vilnius and the Medieval Island Fortress in Trakai.")}
                  {selectedBadge.id === 'badge-sacred-pilgrim' &&
                    (language === 'lt'
                      ? 'Aplankykite Vilniaus Katedrą, Aušros Vartus ir Kryžių Kalną prie Šiaulių.'
                      : 'Visit Vilnius Cathedral Basilica, the miraculous Gate of Dawn chapel, and the sacred Hill of Crosses in Šiauliai.')}
                  {selectedBadge.id === 'badge-bohemian-citizen' &&
                    (language === 'lt'
                      ? 'Apsilankykite meniškoje Užupio Respublikoje ir nuskaitykite žymą prie Užupio Angelo.'
                      : 'Visit the artistic Republic of Užupis and tap the plaque near the Bronze Angel of Freedom.')}
                  {selectedBadge.id === 'badge-vilnius-scholar' &&
                    (language === 'lt'
                      ? 'Aplankykite Vilniaus universiteto senamiesčio ansamblį ir pasivaikščiokite po jo istorinius kiemelius.'
                      : 'Visit Vilnius University Old Town campus and walk its 13 Renaissance and Baroque courtyards.')}
                  {selectedBadge.id === 'badge-vilnius-master' &&
                    (language === 'lt'
                      ? 'Atrakinkite bent 5 skirtingas istorines vietas Vilniuje ir tapkite sostinės žinovu.'
                      : 'Unlock at least 5 different historic monuments across Vilnius to become an Old Town Master.')}
                  {selectedBadge.id === 'badge-kaunas-explorer' &&
                    (language === 'lt'
                      ? 'Aplankykite bent 2 istorines vietas Kaune (pvz., Kauno pilį, Pažaislį ar Rotušę).'
                      : 'Visit at least 2 historical sites in Kaunas, such as Kaunas Castle, Pažaislis, or the Town Hall.')}
                  {selectedBadge.id === 'badge-palanga-coast' &&
                    (language === 'lt'
                      ? 'Aplankykite bent 2 pajūrio vietas Palangoje (pvz., Palangos tiltą į jūrą, Gintaro muziejų ar Birutės kalną).'
                      : 'Visit at least 2 coastal landmarks in Palanga, such as the Sea Pier, Amber Museum, or Birutė Hill.')}
                  {selectedBadge.id === 'badge-pass-guardian' &&
                    (language === 'lt'
                      ? 'Išlaikykite bent 3 aktyvius 30 dienų NFC leidimus vienu metu.'
                      : 'Maintain 3 or more active 30-day NFC passes at the same time.')}
                  {selectedBadge.id === 'badge-grand-explorer' &&
                    (language === 'lt'
                      ? 'Atrakinkite visas istorines vietas visoje Lietuvoje ir tapkite Didžiuoju Lietuvos Tyrinėtoju!'
                      : 'Unlock all historical heritage sites across Lithuania to become a Grand Explorer!')}
                </Text>
              </View>

              <Pressable
                style={styles.badgeDetailCloseBtn}
                onPress={() => setSelectedBadge(null)}>
                <Text style={styles.badgeDetailCloseBtnText}>
                  {language === 'lt' ? 'Uždaryti' : 'Close Badge Lore'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* SPOT STORY MODAL FOR TIMELINE */}
      <SpotStoryModal
        spot={selectedSpotForStory}
        language={language}
        visible={!!selectedSpotForStory}
        userCoords={{ latitude: 54.6872, longitude: 25.2797, label: 'Vilnius Old Town' }}
        onClose={() => setSelectedSpotForStory(null)}
        onUnlockedChange={() => refreshData()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: WiseColors.body,
    marginTop: 3,
  },
  langToggle: {
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  toastBanner: {
    backgroundColor: WiseColors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarCustomImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userDob: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: WiseColors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarEditText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  profileTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  verifiedBadge: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: WiseColors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    color: WiseColors.body,
    marginTop: 2,
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  providerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: WiseColors.primary,
  },
  syncDot: {
    fontSize: 11,
    color: WiseColors.mute,
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: WiseColors.forestBorder,
  },
  profileActionBtn: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  profileActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  logOutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  logOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  connectPrimaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: WiseColors.primary,
  },
  connectPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  connectCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  connectCardDesc: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  connectButtonsGrid: {
    gap: 8,
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  googleBtnText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  emailBtn: {
    backgroundColor: WiseColors.primaryPale,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  emailBtnText: {
    color: WiseColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  syncCard: {
    backgroundColor: WiseColors.primaryPale,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginBottom: 20,
  },
  syncCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIcon: {
    fontSize: 20,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  syncDesc: {
    fontSize: 12,
    color: WiseColors.body,
    marginTop: 1,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: WiseColors.body,
    marginTop: 2,
  },
  badgeCountPill: {
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: WiseColors.primary,
    borderRadius: 3,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48.5%',
    backgroundColor: WiseColors.canvas,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  badgeCardUnlocked: {
    borderColor: WiseColors.primary,
    backgroundColor: '#ffffff',
  },
  badgeCardLocked: {
    opacity: 0.72,
    backgroundColor: '#fafafa',
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  badgeIconCircleUnlocked: {
    backgroundColor: WiseColors.primaryPale,
  },
  badgeIconCircleLocked: {
    backgroundColor: '#f3f4f6',
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeCheckPill: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: WiseColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheckText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 4,
  },
  badgeTitleLocked: {
    color: '#6b7280',
  },
  badgeDesc: {
    fontSize: 11,
    color: WiseColors.body,
    lineHeight: 15,
    minHeight: 30,
    marginBottom: 8,
  },
  badgeStatusTag: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeStatusTagUnlocked: {
    backgroundColor: WiseColors.primaryPale,
  },
  badgeStatusTagLocked: {
    backgroundColor: '#f3f4f6',
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeStatusTextUnlocked: {
    color: WiseColors.primary,
  },
  badgeStatusTextLocked: {
    color: '#9ca3af',
  },
  unlockDemoBtn: {
    backgroundColor: WiseColors.primaryPale,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unlockDemoBtnText: {
    color: WiseColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTimelineCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  sampleUnlockBtn: {
    backgroundColor: WiseColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sampleUnlockBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineList: {
    marginTop: 4,
  },
  timelineItemRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineSpineCol: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: WiseColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotInner: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  timelineSpineLine: {
    width: 2,
    flex: 1,
    backgroundColor: WiseColors.forestBorder,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: WiseColors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    overflow: 'hidden',
  },
  timelinePhoto: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e7eb',
  },
  timelineCardBody: {
    padding: 12,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineSpotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    flex: 1,
    marginRight: 6,
  },
  timelineDateText: {
    fontSize: 11,
    color: WiseColors.mute,
    fontWeight: '600',
  },
  timelineTeaser: {
    fontSize: 12,
    color: WiseColors.body,
    lineHeight: 16,
    marginBottom: 10,
  },
  timelinePassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passPillActive: {
    backgroundColor: WiseColors.primaryPale,
  },
  passPillExpired: {
    backgroundColor: '#fee2e2',
  },
  passPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  passPillTextActive: {
    color: WiseColors.primary,
  },
  passPillTextExpired: {
    color: '#dc2626',
  },
  readStoryPill: {
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readStoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  settingsCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginTop: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: WiseColors.inkDeep,
  },
  settingSub: {
    fontSize: 12,
    color: WiseColors.mute,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: WiseColors.forestBorder,
    marginVertical: 6,
  },
  settingLangButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  langChipActive: {
    backgroundColor: WiseColors.primary,
    borderColor: WiseColors.primary,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  langChipTextActive: {
    color: '#ffffff',
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  toggleBtnActive: {
    backgroundColor: WiseColors.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4b5563',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: WiseColors.canvas,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.inkDeep,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: WiseColors.mute,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: WiseColors.primary,
  },
  avatarOptionEmoji: {
    fontSize: 34,
  },
  avatarOptionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: WiseColors.ink,
    marginTop: 2,
  },
  avatarOptionCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: WiseColors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionCheckText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: WiseColors.inkDeep,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: WiseColors.ink,
  },
  modalSubmitBtn: {
    backgroundColor: WiseColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  badgeDetailContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: WiseColors.canvas,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  badgeDetailCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeDetailCircleUnlocked: {
    backgroundColor: WiseColors.primaryPale,
  },
  badgeDetailCircleLocked: {
    backgroundColor: '#f3f4f6',
  },
  badgeDetailEmoji: {
    fontSize: 48,
  },
  badgeDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDetailPill: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeDetailPillUnlocked: {
    backgroundColor: WiseColors.primaryPale,
  },
  badgeDetailPillLocked: {
    backgroundColor: '#f3f4f6',
  },
  badgeDetailPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeDetailPillTextUnlocked: {
    color: WiseColors.primary,
  },
  badgeDetailPillTextLocked: {
    color: '#9ca3af',
  },
  badgeDetailDesc: {
    fontSize: 14,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeDetailLoreBox: {
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 18,
  },
  badgeDetailLoreTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 4,
  },
  badgeDetailLoreText: {
    fontSize: 12,
    color: WiseColors.body,
    lineHeight: 17,
  },
  badgeDetailCloseBtn: {
    backgroundColor: WiseColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  badgeDetailCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
