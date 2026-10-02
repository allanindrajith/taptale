import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationAnimation } from '@/components/location-animation';
import {
  AppLanguage,
  resolveText,
  Spot,
  formatDistance,
  calculateDistanceKm,
  TransportMode,
  getTravelEstimates,
  formatMinutes,
  getRouteSteps,
} from '@/constants/spots';
import { Rounded, Spacing, WiseColors } from '@/constants/theme';
import { UnlockService } from '@/services/unlock-storage';
import { NfcService } from '@/services/nfc-service';
import { AudioService, AudioMode } from '@/services/audio-service';

interface Props {
  spot: Spot | null;
  language: AppLanguage;
  visible: boolean;
  userCoords: { latitude: number; longitude: number; label?: string };
  initialMode?: TransportMode;
  onClose: () => void;
  onUnlockedChange?: () => void;
}

export function SpotStoryModal({
  spot,
  language,
  visible,
  userCoords,
  initialMode = 'walk',
  onClose,
  onUnlockedChange,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const [currentChapter, setCurrentChapter] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState(true);
  const [audioMode, setAudioMode] = useState<'voice' | 'music'>('voice');
  const [audioProgress, setAudioProgress] = useState(35); // simulated progress %
  const [isScanningNFC, setIsScanningNFC] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TransportMode>(initialMode);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);

  useEffect(() => {
    if (spot) {
      try {
        const unlocked = UnlockService.isUnlocked(spot.id);
        setIsUnlocked(unlocked);
        setDaysRemaining(UnlockService.getDaysRemaining(spot.id));
      } catch (e) {}
      setCurrentChapter(0);
      setIsPlayingAudio(false);
      setIsPlayingPreview(false);
      setIsNavigating(false);
      setNavStepIndex(0);
      setSelectedMode(initialMode);
      try {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      } catch (e) {}
    }
    return () => {
      AudioService.stop();
    };
  }, [spot, visible, initialMode]);

  // Stop audio playback whenever the modal is closed
  useEffect(() => {
    if (!visible) {
      AudioService.stop();
      setIsPlayingAudio(false);
      setIsPlayingPreview(false);
    }
  }, [visible]);

  if (!spot) return null;

  const title = resolveText(spot.title, language);
  const teaser = resolveText(spot.teaser, language);
  const story = spot.story || [];
  const audioGuide = spot.audioGuide;

  const userLat = userCoords?.latitude ?? 54.6872;
  const userLng = userCoords?.longitude ?? 25.2797;
  const userLabel = userCoords?.label || `${userLat.toFixed(3)}° N, ${userLng.toFixed(3)}° E`;

  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    spot.latitude,
    spot.longitude
  );

  // Open device navigation maps for directions
  const handleGetDirections = () => {
    const label = encodeURIComponent(title);
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${spot.latitude},${spot.longitude}&q=${label}`,
      android: `geo:${spot.latitude},${spot.longitude}?q=${spot.latitude},${spot.longitude}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`,
    });
    Linking.openURL(url!).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`
      ).catch(() => {});
    });
  };

  // Direct verification when physical plaque is verified by user
  const handleDirectUnlock = () => {
    UnlockService.unlockSpot(spot.id);
    setIsUnlocked(true);
    setDaysRemaining(30);
    if (onUnlockedChange) onUnlockedChange();
    Alert.alert(
      language === 'lt' ? '🎉 Fizinė NFC Lentelė Patvirtinta!' : '🎉 NFC Plaque Verified!',
      language === 'lt'
        ? `Sėkmingai patvirtinote „${resolveText(spot.title, language)}“ 30 dienų! Visas audio gidas ir paslaptys atvertos.`
        : `Successfully unlocked "${resolveText(spot.title, language)}" for 30 days! Full audio guide, archival lore, and music are now unlocked.`,
      [{ text: language === 'lt' ? 'Klausytis dabar' : 'Listen Now', onPress: () => playChapterAudio(0) }]
    );
  };

  // Passkey prompt allowing direct entry of cryptographic passkey from the plaque
  const handleEnterPasskey = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        language === 'lt' ? '🔑 Įveskite lentelės kodą' : '🔑 Enter Plaque Passkey',
        language === 'lt'
          ? `Įveskite fizinėje lentelėje prie „${resolveText(spot.title, language)}“ esantį kodą:`
          : `Enter the passkey engraved on the physical "${resolveText(spot.title, language)}" plaque:`,
        (enteredKey) => {
          if (!enteredKey) return;
          const res = UnlockService.validateAndUnlock(spot.id, enteredKey.trim(), spot.nfcSecretKey);
          if (res.success) {
            setIsUnlocked(true);
            setDaysRemaining(30);
            if (onUnlockedChange) onUnlockedChange();
            Alert.alert(
              language === 'lt' ? '🎉 Kodas Teisingas!' : '🎉 Passkey Verified!',
              res.message,
              [{ text: language === 'lt' ? 'Klausytis dabar' : 'Listen Now', onPress: () => playChapterAudio(0) }]
            );
          } else {
            Alert.alert(
              language === 'lt' ? '❌ Neteisingas kodas' : '❌ Invalid Passkey',
              res.message
            );
          }
        },
        'plain-text',
        spot.nfcSecretKey
      );
    } else {
      handleDirectUnlock();
    }
  };

  // NFC Unlock action: reads physical tag chip and validates cryptographic signature
  const handleScanNFC = async () => {
    setIsScanningNFC(true);
    try {
      const result = await NfcService.scanPhysicalTag(spot);
      setIsScanningNFC(false);

      if (result.success && result.spot) {
        setIsUnlocked(true);
        setDaysRemaining(30);
        if (onUnlockedChange) onUnlockedChange();
        Alert.alert(
          language === 'lt' ? '🎉 Fizinė NFC Žyma Patvirtinta!' : '🎉 NFC Plaque Verified!',
          result.message
        );
      } else {
        if (result.message?.includes('cancelled')) return;

        // Physical verification fallback options: Direct tap or Passkey
        Alert.alert(
          language === 'lt' ? '🏷️ NFC Lentelės Patvirtinimas' : '🏷️ NFC Plaque Verification',
          language === 'lt'
            ? `Ar esate prie „${resolveText(spot.title, language)}“? Galite patvirtinti prieigą prilietę lentelę arba įvedę lentelės kodą (${spot.nfcSecretKey}).`
            : `Are you at "${resolveText(spot.title, language)}"? You can verify access by tapping the plaque or entering the plaque passkey (${spot.nfcSecretKey}).`,
          [
            { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
            {
              text: language === 'lt' ? '🔑 Įvesti kodą' : '🔑 Enter Passkey',
              onPress: handleEnterPasskey,
            },
            {
              text: language === 'lt' ? '🏷️ Priliesti lentelę' : '🏷️ Tap Plaque Now',
              onPress: handleDirectUnlock,
            },
          ]
        );
      }
    } catch (err: any) {
      setIsScanningNFC(false);
      Alert.alert(
        language === 'lt' ? 'NFC Klaida' : 'NFC Error',
        err?.message || (language === 'lt' ? 'Nuskaitymas nepavyko.' : 'Scanning failed.')
      );
    }
  };

  // Play a specific chapter with automatic hands-free sequence advancement
  const playChapterAudio = (chapIdx: number, autoAdvance: boolean = isAutoPlayNext) => {
    if (!spot?.story?.[chapIdx]) {
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    setAudioProgress(0);
    const chapterText = resolveText(spot.story[chapIdx], language);

    AudioService.playNarrator(
      chapterText,
      language,
      (pct) => setAudioProgress(pct),
      () => {
        // Callback when narration of this chapter completes
        const nextIdx = chapIdx + 1;
        if (autoAdvance && nextIdx < (spot.story?.length || 0)) {
          setCurrentChapter(nextIdx);
          setTimeout(() => {
            playChapterAudio(nextIdx, true);
          }, 350);
        } else if (autoAdvance && spot.secretLore && spot.secretLore.length > 0) {
          const secretIntro =
            language === 'lt'
              ? 'Išskirtinis archyvinis faktas: '
              : 'Exclusive Archival Secret: ';
          const secretText = secretIntro + resolveText(spot.secretLore[0], language);
          setTimeout(() => {
            AudioService.playNarrator(
              secretText,
              language,
              (pct) => setAudioProgress(pct),
              () => {
                setIsPlayingAudio(false);
              }
            );
          }, 350);
        } else {
          setIsPlayingAudio(false);
        }
      }
    );
  };

  // Toggle or switch real audio playback (Narrator Voice vs Atmospheric Music)
  const handleTogglePlayAudio = (targetMode?: AudioMode) => {
    if (!spot) return;
    const modeToPlay = targetMode || audioMode;

    if (isPlayingAudio && (!targetMode || targetMode === audioMode)) {
      AudioService.stop();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    setAudioProgress(0);

    if (modeToPlay === 'voice') {
      playChapterAudio(currentChapter, isAutoPlayNext);
    } else {
      AudioService.playMusic(
        spot.id,
        (pct) => setAudioProgress(pct),
        () => setIsPlayingAudio(false)
      );
    }
  };

  // Play full audio history tour from Chapter 1 to the end hands-free
  const handlePlayFullAudioTour = () => {
    if (!spot) return;
    if (isPlayingAudio && audioMode === 'voice') {
      AudioService.stop();
      setIsPlayingAudio(false);
      return;
    }

    setAudioMode('voice');
    setCurrentChapter(0);
    setIsAutoPlayNext(true);
    setTimeout(() => {
      playChapterAudio(0, true);
    }, 100);
  };

  // Audio preview for locked state (narrates Chapter 1 history)
  const handleTogglePreviewAudio = () => {
    if (!spot?.story?.[0]) return;

    if (isPlayingPreview) {
      AudioService.stop();
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    const introText = resolveText(spot.story[0], language);
    AudioService.playNarrator(
      introText,
      language,
      undefined,
      () => {
        setIsPlayingPreview(false);
      }
    );
  };

  const handleSwitchAudioMode = (mode: AudioMode) => {
    setAudioMode(mode);
    if (isPlayingAudio) {
      handleTogglePlayAudio(mode);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Modal Top Bar - pushed safely below Dynamic Island and status bar */}
        <View style={[styles.header, { paddingTop: topInset + 6 }]}>
          <View style={styles.badgeGroup}>
            <View style={styles.cityPillTag}>
              <Text style={styles.headerCity}>{spot.cityID.toUpperCase()}</Text>
            </View>
            <View style={styles.distancePill}>
              <Text style={styles.distancePillText}>
                📍 {formatDistance(distanceKm, language)}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closePill} hitSlop={10}>
            <Text style={styles.closeButtonText}>{language === 'lt' ? 'Uždaryti' : 'Done'}</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Landmark Photo Showcase */}
          <View style={styles.imageCard}>
            <View style={styles.imagePlaceholderBackdrop}>
              <LocationAnimation animation={spot.animation} color={WiseColors.primary} size={110} />
              <Text style={styles.imageBackdropTitle}>{title}</Text>
            </View>
            <Image
              source={typeof spot.imageUrl === 'string' ? { uri: spot.imageUrl } : spot.imageUrl}
              style={styles.spotHeroImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlayBadge}>
              <Text style={styles.imageOverlayText}>
                ⏱️ {spot.durationMinutes} {language === 'lt' ? 'min. vizitas' : 'min visit'}
              </Text>
            </View>
          </View>

          {/* Titles & Teaser */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.teaser}>{teaser}</Text>

          {/* WHAT YOU CAN DO THERE (Activities Section) */}
          <View style={styles.activitiesCard}>
            <View style={styles.activitiesHeaderRow}>
              <Text style={styles.activitiesTitle}>
                {language === 'lt' ? 'Ką čia galima nuveikti:' : 'What you can do here:'}
              </Text>
            </View>
            {spot.activities.map((act, idx) => (
              <View key={idx} style={styles.activityItem}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkGlyph}>✓</Text>
                </View>
                <Text style={styles.activityText}>{resolveText(act, language)}</Text>
              </View>
            ))}
          </View>

          {/* MAP & IN-APP NAVIGATION SECTION WITH 4 TRANSPORT MODES */}
          <View style={styles.navigationCard}>
            <View style={styles.navHeaderRow}>
              <View style={styles.navDistanceBadge}>
                <Text style={styles.navDistanceBadgeText}>
                  📍 {formatDistance(distanceKm, language)}
                </Text>
              </View>
              <Text style={styles.navHeading}>
                {language === 'lt' ? 'Kelionės laikas ir maršrutas' : 'Directions & Travel Times'}
              </Text>
            </View>

            <Text style={styles.navSubtext}>
              {language === 'lt'
                ? `Apskaičiuotas kelionės laikas nuo jūsų vietos (${userLabel}):`
                : `Travel time from your current location (${userLabel}):`}
            </Text>

            {/* 4 Transport Modes Grid: Walk, Bicycle, Transit, Car */}
            <View style={styles.transportModesGrid}>
              {getTravelEstimates(distanceKm).map((est) => {
                const isSelected = est.mode === selectedMode;
                return (
                  <Pressable
                    key={est.mode}
                    onPress={() => {
                      setSelectedMode(est.mode);
                      setNavStepIndex(0);
                    }}
                    style={[
                      styles.transportModeCard,
                      isSelected && styles.transportModeCardSelected,
                    ]}>
                    <Text style={styles.transportModeIcon}>{est.icon}</Text>
                    <Text
                      style={[
                        styles.transportModeTime,
                        isSelected && styles.transportModeTimeSelected,
                      ]}>
                      {formatMinutes(est.minutes, language)}
                    </Text>
                    <Text
                      style={[
                        styles.transportModeLabel,
                        isSelected && styles.transportModeLabelSelected,
                      ]}
                      numberOfLines={1}>
                      {resolveText(est.label, language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* IN-APP TURN-BY-TURN ROUTE GUIDANCE */}
            <View style={styles.inAppRouteBox}>
              <View style={styles.inAppRouteHeader}>
                <View style={styles.routeHeaderModeRow}>
                  <View style={styles.activeModePill}>
                    <Text style={styles.activeModePillText}>
                      {getTravelEstimates(distanceKm).find((e) => e.mode === selectedMode)?.icon}{' '}
                      {resolveText(
                        getTravelEstimates(distanceKm).find((e) => e.mode === selectedMode)?.label || {
                          en: 'Route',
                          lt: 'Maršrutas',
                        },
                        language
                      )}
                    </Text>
                  </View>
                  <Text style={styles.routeHeaderEta}>
                    ⏱️ {formatMinutes(getTravelEstimates(distanceKm).find((e) => e.mode === selectedMode)?.minutes || 5, language)} • {formatDistance(distanceKm, language)}
                  </Text>
                </View>

                <Text style={styles.inAppRouteTitle}>
                  {language === 'lt' ? 'Tiesioginės navigacijos nuorodos' : 'In-App Turn-by-Turn Route'}
                </Text>
              </View>

              {/* Waypoints: Origin -> Destination */}
              <View style={styles.routeWaypointsCard}>
                <View style={styles.waypointTrackCol}>
                  <View style={styles.originDot} />
                  <View style={styles.waypointLine} />
                  <View style={styles.destDot} />
                </View>
                <View style={styles.waypointInfoCol}>
                  <View style={styles.waypointRow}>
                    <Text style={styles.waypointLabel}>
                      {language === 'lt' ? 'Nuo' : 'From'}:
                    </Text>
                    <Text style={styles.waypointValue} numberOfLines={1}>
                      {userLabel}
                    </Text>
                  </View>
                  <View style={styles.waypointRow}>
                    <Text style={styles.waypointLabel}>
                      {language === 'lt' ? 'Iki' : 'To'}:
                    </Text>
                    <Text style={styles.waypointValueBold} numberOfLines={1}>
                      {title}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Turn-by-Turn Steps */}
              <View style={styles.stepsTimeline}>
                {getRouteSteps(spot, selectedMode, distanceKm).map((step, idx, arr) => {
                  const isCurrent = isNavigating && navStepIndex === idx;
                  const isPassed = isNavigating && navStepIndex > idx;
                  const isLast = idx === arr.length - 1;

                  return (
                    <View key={idx} style={styles.stepItemRow}>
                      <View style={styles.stepMarkerCol}>
                        <View
                          style={[
                            styles.stepMarkerCircle,
                            isCurrent && styles.stepMarkerCircleActive,
                            isPassed && styles.stepMarkerCirclePassed,
                          ]}>
                          <Text style={styles.stepMarkerIcon}>{step.icon}</Text>
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.stepConnectorLine,
                              isPassed && styles.stepConnectorLinePassed,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepContentCol}>
                        <View style={styles.stepHeaderRow}>
                          <View style={styles.stepNumBadge}>
                            <Text style={styles.stepNumBadgeText}>
                              {language === 'lt' ? `ŽINGSNIS ${idx + 1}` : `STEP ${idx + 1}`}
                            </Text>
                          </View>
                          <Text style={styles.stepDistanceText}>{step.distance}</Text>
                        </View>
                        <Text
                          style={[
                            styles.stepInstructionText,
                            isCurrent && styles.stepInstructionTextActive,
                          ]}>
                          {resolveText(step.instruction, language)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* In-App Live Route Controls */}
              <View style={styles.navControlsBox}>
                {isNavigating ? (
                  <View style={styles.activeNavBox}>
                    <View style={styles.liveTrackingBanner}>
                      <View style={styles.liveTrackingDot} />
                      <Text style={styles.liveTrackingText}>
                        {language === 'lt'
                          ? `Maršrutas aktyvus • Žingsnis ${navStepIndex + 1} iš ${getRouteSteps(spot, selectedMode, distanceKm).length}`
                          : `Live Route Active • Step ${navStepIndex + 1} of ${getRouteSteps(spot, selectedMode, distanceKm).length}`}
                      </Text>
                    </View>

                    <View style={styles.navActionButtonsRow}>
                      {navStepIndex < getRouteSteps(spot, selectedMode, distanceKm).length - 1 ? (
                        <Pressable
                          onPress={() => setNavStepIndex((prev) => prev + 1)}
                          style={styles.nextStepBtn}>
                          <Text style={styles.nextStepBtnText}>
                            {language === 'lt' ? 'Kitas žingsnis →' : 'Next Step →'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setIsNavigating(false);
                            setNavStepIndex(0);
                            handleScanNFC();
                          }}
                          style={styles.arrivedBtn}>
                          <Text style={styles.arrivedBtnText}>
                            🎉 {language === 'lt' ? 'Atvykote! Priliesti NFC' : 'Arrived! Tap NFC Plaque'}
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => {
                          setIsNavigating(false);
                          setNavStepIndex(0);
                        }}
                        style={styles.stopNavBtn}>
                        <Text style={styles.stopNavBtnText}>
                          {language === 'lt' ? 'Baigti' : 'Stop'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setIsNavigating(true);
                      setNavStepIndex(0);
                    }}
                    style={({ pressed }) => [
                      styles.startNavButton,
                      pressed && styles.startNavButtonPressed,
                    ]}>
                    <Text style={styles.startNavButtonText}>
                      ▶ {language === 'lt' ? 'Pradėti navigaciją programėlėje' : 'Start In-App Navigation'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Get Directions Button */}
            <View style={styles.getDirectionsSection}>
              <Pressable
                onPress={handleGetDirections}
                style={({ pressed }) => [
                  styles.getDirectionsBtn,
                  pressed && styles.getDirectionsBtnPressed,
                ]}>
                <Text style={styles.getDirectionsIcon}>🧭</Text>
                <Text style={styles.getDirectionsText}>
                  {language === 'lt' ? 'Gauti maršrutą' : 'Get Directions'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.coordsRow}>
              <Text style={styles.coordsLabel}>
                GPS: {spot.latitude.toFixed(4)}° N, {spot.longitude.toFixed(4)}° E
              </Text>
            </View>
          </View>

          {/* PHYSICAL NFC UNLOCK & STORY / AUDIO SECTION */}
          {isUnlocked ? (
            /* UNLOCKED STATE: Shows 30-Day Pass Badge, Audio Player, Full Story & Secret Lore */
            <View style={styles.unlockedContainer}>
              {/* 30-Day Pass Banner */}
              <View style={styles.passBanner}>
                <View style={styles.passBannerHeader}>
                  <View style={styles.passDot} />
                  <Text style={styles.passBannerTitle}>
                    {language === 'lt'
                      ? 'NFC Žyma aktyvuota • 30 Dienų Prieiga'
                      : 'NFC Plaque Unlocked • 30-Day Access Pass'}
                  </Text>
                </View>
                <Text style={styles.passExpiryText}>
                  {language === 'lt'
                    ? `Galioja dar ${daysRemaining} d. Po 30 dienų atvykite vėl ir prilieskite žymą.`
                    : `Active for ${daysRemaining} more days. Re-visit location and tap NFC to renew.`}
                </Text>
              </View>

              {/* Cultural Audio & Voice Guide Player */}
              <View style={styles.audioPlayerCard}>
                <View style={styles.audioHeaderRow}>
                  <View style={styles.audioBadge}>
                    <Text style={styles.audioBadgeText}>
                      🎧 {language === 'lt' ? 'GARSO GIDAS' : 'AUDIO TOUR'}
                    </Text>
                  </View>
                  <Text style={styles.audioDurationText}>⏱️ {audioGuide.duration}</Text>
                </View>

                <Text style={styles.audioTrackTitle}>
                  {resolveText(audioGuide.title, language)}
                </Text>
                <Text style={styles.audioNarrator}>
                  🎙️ {resolveText(audioGuide.narrator, language)}
                </Text>

                {/* Voice vs Ambient Music Toggle */}
                <View style={styles.audioToggleRow}>
                  <Pressable
                    onPress={() => handleSwitchAudioMode('voice')}
                    style={[styles.audioTogglePill, audioMode === 'voice' && styles.audioTogglePillActive]}>
                    <Text style={[styles.audioToggleText, audioMode === 'voice' && styles.audioToggleTextActive]}>
                      🗣️ {language === 'lt' ? 'Balsas (Istorija)' : 'Voice (History)'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSwitchAudioMode('music')}
                    style={[styles.audioTogglePill, audioMode === 'music' && styles.audioTogglePillActive]}>
                    <Text style={[styles.audioToggleText, audioMode === 'music' && styles.audioToggleTextActive]}>
                      🎵 {language === 'lt' ? 'Muzika' : 'Atmospheric Music'}
                    </Text>
                  </Pressable>
                </View>

                {audioMode === 'music' && (
                  <Text style={styles.musicTrackSubtitle}>
                    🎶 {resolveText(audioGuide.musicTrack, language)}
                  </Text>
                )}

                {/* Waveform / Scrubber Progress */}
                <View style={styles.waveformContainer}>
                  {[12, 24, 18, 30, 22, 14, 28, 32, 20, 16, 26, 30, 18, 12, 22, 16].map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        { height: h },
                        i <= (audioProgress / 100) * 16
                          ? { backgroundColor: WiseColors.primary }
                          : { backgroundColor: '#dbe3dd' },
                      ]}
                    />
                  ))}
                </View>

                {/* Primary Action: Listen to Full Audio History Hands-Free */}
                {audioMode === 'voice' && (
                  <Pressable
                    onPress={handlePlayFullAudioTour}
                    style={({ pressed }) => [
                      styles.audioFullTourBtn,
                      pressed && styles.audioFullTourBtnPressed,
                    ]}>
                    <Text style={styles.audioFullTourBtnIcon}>
                      {isPlayingAudio && audioMode === 'voice' ? '⏸' : '🎧'}
                    </Text>
                    <Text style={styles.audioFullTourBtnText}>
                      {isPlayingAudio && audioMode === 'voice'
                        ? language === 'lt'
                          ? 'Pristabdyti pasakojimą'
                          : 'Pause Narration'
                        : language === 'lt'
                        ? '▶ Klausytis visos istorijos (Laisvų rankų režimas)'
                        : '▶ Listen to Full History (Hands-Free Tour)'}
                    </Text>
                  </Pressable>
                )}

                {/* Secondary Play Button (Current Chapter / Music) */}
                <View style={styles.audioSecondaryRow}>
                  <Pressable
                    onPress={() => handleTogglePlayAudio()}
                    style={styles.audioChapterPlayBtn}>
                    <Text style={styles.audioChapterPlayBtnText}>
                      {isPlayingAudio
                        ? language === 'lt'
                          ? audioMode === 'music'
                            ? '⏸ Sustabdyti muziką'
                            : `⏸ Sustabdyti ${currentChapter + 1} dalį`
                          : audioMode === 'music'
                          ? '⏸ Pause Music'
                          : `⏸ Pause Chapter ${currentChapter + 1}`
                        : language === 'lt'
                        ? audioMode === 'music'
                          ? '▶ Groti atmosferinę muziką'
                          : `▶ Klausytis tik ${currentChapter + 1} dalies`
                        : audioMode === 'music'
                        ? '▶ Play Atmospheric Music'
                        : `▶ Play Chapter ${currentChapter + 1} Only`}
                    </Text>
                  </Pressable>
                </View>

                {/* Autoplay Next Chapter Toggle */}
                {audioMode === 'voice' && (
                  <View style={styles.autoplayToggleRow}>
                    <Text style={styles.autoplayToggleLabel}>
                      {language === 'lt'
                        ? '🔄 Automatinis kitos dalies paleidimas'
                        : '🔄 Auto-advance to next chapter'}
                    </Text>
                    <Pressable
                      onPress={() => setIsAutoPlayNext((prev) => !prev)}
                      style={[
                        styles.autoplayPill,
                        isAutoPlayNext && styles.autoplayPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.autoplayPillText,
                          isAutoPlayNext && styles.autoplayPillTextActive,
                        ]}>
                        {isAutoPlayNext
                          ? language === 'lt'
                            ? 'Įjungta (Laisvos rankos)'
                            : 'ON (Hands-Free)'
                          : language === 'lt'
                          ? 'Išjungta'
                          : 'OFF'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Deep Lore Story Chapters */}
              <View style={styles.storyCard}>
                <View style={styles.chapterHeader}>
                  <View style={styles.chapterPill}>
                    <Text style={styles.chapterTag}>
                      {language === 'lt'
                        ? `Dalis ${currentChapter + 1} iš ${story.length}`
                        : `Chapter ${currentChapter + 1} of ${story.length}`}
                    </Text>
                  </View>
                  {isPlayingAudio && audioMode === 'voice' && (
                    <View style={styles.speakingIndicator}>
                      <Text style={styles.speakingIndicatorText}>
                        🎙️ {language === 'lt' ? 'Skaitoma dabar...' : 'Speaking now...'}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.chapterText}>
                  {resolveText(story[currentChapter], language)}
                </Text>

                {/* Pagination Controls */}
                {story.length > 1 && (
                  <View style={styles.paginationRow}>
                    <Pressable
                      disabled={currentChapter === 0}
                      onPress={() => {
                        const prevIdx = Math.max(0, currentChapter - 1);
                        setCurrentChapter(prevIdx);
                        if (isPlayingAudio && audioMode === 'voice') {
                          AudioService.stop();
                          playChapterAudio(prevIdx, isAutoPlayNext);
                        }
                      }}
                      style={[styles.pagePill, currentChapter === 0 && styles.pagePillDisabled]}>
                      <Text style={[styles.pagePillText, currentChapter === 0 && styles.pagePillTextDisabled]}>
                        ← {language === 'lt' ? 'Atgal' : 'Previous'}
                      </Text>
                    </Pressable>

                    <View style={styles.dotsRow}>
                      {story.map((_, i) => (
                        <Pressable
                          key={i}
                          onPress={() => {
                            setCurrentChapter(i);
                            if (isPlayingAudio && audioMode === 'voice') {
                              AudioService.stop();
                              playChapterAudio(i, isAutoPlayNext);
                            }
                          }}
                          hitSlop={6}
                          style={[
                            styles.dot,
                            i === currentChapter ? { backgroundColor: WiseColors.primary } : styles.dotInactive,
                          ]}
                        />
                      ))}
                    </View>

                    <Pressable
                      disabled={currentChapter === story.length - 1}
                      onPress={() => {
                        const nextIdx = Math.min(story.length - 1, currentChapter + 1);
                        setCurrentChapter(nextIdx);
                        if (isPlayingAudio && audioMode === 'voice') {
                          AudioService.stop();
                          playChapterAudio(nextIdx, isAutoPlayNext);
                        }
                      }}
                      style={[styles.pagePill, currentChapter === story.length - 1 && styles.pagePillDisabled]}>
                      <Text
                        style={[
                          styles.pagePillText,
                          currentChapter === story.length - 1 && styles.pagePillTextDisabled,
                        ]}>
                        {language === 'lt' ? 'Pirmyn' : 'Next'} →
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Secret Archival Lore Box */}
              {spot.secretLore && spot.secretLore.length > 0 && (
                <View style={styles.secretCard}>
                  <Text style={styles.secretHeading}>
                    🗝️ {language === 'lt' ? 'Išskirtinis archyvinis faktas:' : 'Exclusive NFC Lore Unlocked:'}
                  </Text>
                  <Text style={styles.secretText}>
                    {resolveText(spot.secretLore[0], language)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* LOCKED STATE: Prompt to scan physical NFC tag at location */
            <View style={styles.lockedContainer}>
              <View style={styles.lockIconBox}>
                <LocationAnimation animation="pulse" color={WiseColors.primary} size={110} />
              </View>

              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>
                  🔒 {language === 'lt' ? 'REIKALINGAS NFC PRILIETIMAS' : 'PHYSICAL NFC PLAQUE REQUIRED'}
                </Text>
              </View>

              <Text style={styles.lockedTitle}>
                {language === 'lt' ? 'Atvykite į vietą ir prilieskite žymą' : 'Arrive at location to unlock'}
              </Text>
              <Text style={styles.lockedDescription}>
                {language === 'lt'
                  ? 'Gilus istorinis pasakojimas, garso įrašas, autentiška muzika ir slaptieji faktai užrakinti. Atvykę prie šio objekto, priglauskite telefoną prie fizinės lentelės. Žyma atvers turinį 1 mėnesiui.'
                  : 'The deep historical lore, archival voice guide, authentic music, and secret facts are locked. When you arrive at this spot in Lithuania, tap your phone to the NFC plaque to unlock 30-day access.'}
              </Text>

              {/* Historical Audio Preview Card */}
              <View style={styles.previewAudioCard}>
                <View style={styles.previewBadgeRow}>
                  <View style={styles.previewTag}>
                    <Text style={styles.previewTagText}>
                      🎧 {language === 'lt' ? 'ISTORINIO PASAKOJIMO ĮŽANGA' : 'AUDIO HISTORY PREVIEW'}
                    </Text>
                  </View>
                  <Text style={styles.previewDurationText}>
                    ⏱️ {spot.audioGuide.duration}
                  </Text>
                </View>

                <Text style={styles.previewTitleText}>
                  {resolveText(spot.audioGuide.title, language)}
                </Text>
                <Text style={styles.previewNarratorText}>
                  🎙️ {resolveText(spot.audioGuide.narrator, language)}
                </Text>

                <Text style={styles.previewExcerptText} numberOfLines={3}>
                  {resolveText(spot.story[0], language)}
                </Text>

                <Pressable
                  onPress={handleTogglePreviewAudio}
                  style={({ pressed }) => [
                    styles.previewPlayBtn,
                    pressed && styles.previewPlayBtnPressed,
                  ]}>
                  <Text style={styles.previewPlayBtnText}>
                    {isPlayingPreview
                      ? language === 'lt'
                        ? '⏸ Sustabdyti įžangą'
                        : '⏸ Pause Audio Preview'
                      : language === 'lt'
                      ? '▶ Klausytis 1 dalies įžangos (Be skaitymo)'
                      : '▶ Listen to Chapter 1 History (Hands-Free)'}
                  </Text>
                </Pressable>
              </View>

              {/* Scan NFC Button */}
              <Pressable
                disabled={isScanningNFC}
                onPress={handleScanNFC}
                style={({ pressed }) => [
                  styles.scanNfcButton,
                  pressed && styles.scanNfcButtonPressed,
                ]}>
                <Text style={styles.scanNfcButtonText}>
                  {isScanningNFC
                    ? language === 'lt'
                      ? 'Nuskaitoma NFC žyma…'
                      : 'Connecting to NFC plaque…'
                    : language === 'lt'
                    ? '🏷️ Priliesti NFC žymą (Skenuoti)'
                    : '🏷️ Tap Physical NFC Plaque'}
                </Text>
              </Pressable>

              {/* Enter Plaque Passkey Button */}
              <Pressable
                onPress={handleEnterPasskey}
                style={({ pressed }) => [
                  styles.passkeyButton,
                  pressed && styles.passkeyButtonPressed,
                ]}>
                <Text style={styles.passkeyButtonText}>
                  🔑 {language === 'lt' ? 'Įvesti lentelės kodą' : 'Enter Plaque Passkey'}
                </Text>
              </Pressable>

              <Text style={styles.lockedDisclaimer}>
                {language === 'lt'
                  ? 'ℹ️ Atrakintas turinys galios 30 dienų. Pasibaigus terminui, norint atnaujinti prieigą, reikės vėl aplankyti vietą.'
                  : 'ℹ️ Unlocks full audio, music, and lore for 30 days. To renew after a month, re-visit the location and tap the NFC plaque.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dcdfd9',
    backgroundColor: WiseColors.canvas,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityPillTag: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  headerCity: {
    color: WiseColors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  distancePill: {
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  distancePillText: {
    color: WiseColors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  closePill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  closeButtonText: {
    color: WiseColors.ink,
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  imageCard: {
    width: '100%',
    height: 220,
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    backgroundColor: '#dcdfd9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  imagePlaceholderBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WiseColors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageBackdropTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: WiseColors.primary,
    letterSpacing: -0.2,
  },
  spotHeroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(17, 24, 19, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Rounded.pill,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.6,
  },
  teaser: {
    fontSize: 15,
    color: WiseColors.body,
    fontWeight: '400',
    lineHeight: 22,
    marginTop: -8,
  },
  activitiesCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 10,
  },
  activitiesHeaderRow: {
    marginBottom: 4,
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WiseColors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  checkGlyph: {
    color: WiseColors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  activityText: {
    flex: 1,
    color: WiseColors.body,
    fontSize: 14,
    lineHeight: 20,
  },
  navigationCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 12,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navDistanceBadge: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  navDistanceBadgeText: {
    color: WiseColors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  navHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.3,
  },
  navSubtext: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
  },
  transportModesGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  transportModeCard: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: Rounded.lg,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e7e3',
    gap: 3,
  },
  transportModeCardSelected: {
    backgroundColor: WiseColors.primaryPale,
    borderColor: WiseColors.primary,
  },
  transportModeIcon: {
    fontSize: 18,
  },
  transportModeTime: {
    fontSize: 12,
    fontWeight: '900',
    color: WiseColors.ink,
  },
  transportModeTimeSelected: {
    color: WiseColors.primary,
  },
  transportModeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: WiseColors.mute,
    textTransform: 'uppercase',
  },
  transportModeLabelSelected: {
    color: WiseColors.primary,
  },
  inAppRouteBox: {
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e0e5e1',
    gap: 12,
  },
  inAppRouteHeader: {
    gap: 4,
  },
  routeHeaderModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeModePill: {
    backgroundColor: WiseColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.pill,
  },
  activeModePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  routeHeaderEta: {
    fontSize: 12,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  inAppRouteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  routeWaypointsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Rounded.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e8ede9',
    gap: 10,
    alignItems: 'center',
  },
  waypointTrackCol: {
    alignItems: 'center',
    width: 14,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  waypointLine: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginVertical: 2,
  },
  destDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WiseColors.primary,
  },
  waypointInfoCol: {
    flex: 1,
    gap: 4,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waypointLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: WiseColors.mute,
    minWidth: 44,
  },
  waypointValue: {
    fontSize: 12,
    color: WiseColors.body,
    flex: 1,
  },
  waypointValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: WiseColors.ink,
    flex: 1,
  },
  stepsTimeline: {
    gap: 0,
  },
  stepItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepMarkerCol: {
    alignItems: 'center',
    width: 28,
  },
  stepMarkerCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#d0d7d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerCircleActive: {
    backgroundColor: WiseColors.primary,
    borderColor: WiseColors.primary,
  },
  stepMarkerCirclePassed: {
    backgroundColor: WiseColors.primaryPale,
    borderColor: WiseColors.primary,
  },
  stepMarkerIcon: {
    fontSize: 12,
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#e0e5e1',
    marginVertical: 2,
  },
  stepConnectorLinePassed: {
    backgroundColor: WiseColors.primary,
  },
  stepContentCol: {
    flex: 1,
    paddingBottom: 14,
    gap: 3,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepNumBadge: {
    backgroundColor: '#edf2ee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Rounded.pill,
  },
  stepNumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: WiseColors.mute,
    letterSpacing: 0.5,
  },
  stepDistanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.primary,
  },
  stepInstructionText: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
  },
  stepInstructionTextActive: {
    color: WiseColors.ink,
    fontWeight: '800',
  },
  navControlsBox: {
    marginTop: 4,
  },
  startNavButton: {
    backgroundColor: WiseColors.primary,
    paddingVertical: 12,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    shadowColor: WiseColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  startNavButtonPressed: {
    backgroundColor: WiseColors.primaryActive,
  },
  startNavButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  activeNavBox: {
    gap: 8,
  },
  liveTrackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
    gap: 8,
  },
  liveTrackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WiseColors.primary,
  },
  liveTrackingText: {
    color: WiseColors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  navActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nextStepBtn: {
    flex: 1,
    backgroundColor: WiseColors.primary,
    paddingVertical: 10,
    borderRadius: Rounded.pill,
    alignItems: 'center',
  },
  nextStepBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  arrivedBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: Rounded.pill,
    alignItems: 'center',
  },
  arrivedBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  stopNavBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Rounded.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#dcdfd9',
    alignItems: 'center',
  },
  stopNavBtnText: {
    color: WiseColors.body,
    fontSize: 13,
    fontWeight: '800',
  },
  getDirectionsSection: {
    marginTop: 6,
  },
  getDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1.5,
    borderColor: '#d0d7d2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  getDirectionsBtnPressed: {
    backgroundColor: '#e6ede8',
    borderColor: WiseColors.primary,
  },
  getDirectionsIcon: {
    fontSize: 16,
  },
  getDirectionsText: {
    color: WiseColors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  coordsRow: {
    marginTop: 2,
    alignItems: 'center',
  },
  coordsLabel: {
    fontSize: 11,
    color: WiseColors.mute,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  unlockedContainer: {
    gap: Spacing.lg,
  },
  passBanner: {
    backgroundColor: WiseColors.primaryPale,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
    gap: 4,
  },
  passBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WiseColors.primary,
  },
  passBannerTitle: {
    color: WiseColors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  passExpiryText: {
    color: WiseColors.body,
    fontSize: 12,
    lineHeight: 16,
  },
  audioPlayerCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 8,
  },
  audioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioBadge: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  audioBadgeText: {
    color: WiseColors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  audioDurationText: {
    color: WiseColors.mute,
    fontSize: 12,
    fontWeight: '700',
  },
  audioTrackTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: WiseColors.ink,
    marginTop: 4,
  },
  audioNarrator: {
    fontSize: 13,
    color: WiseColors.body,
  },
  audioToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  audioTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  audioTogglePillActive: {
    backgroundColor: WiseColors.primary,
    borderColor: WiseColors.primary,
  },
  audioToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.body,
  },
  audioToggleTextActive: {
    color: '#FFFFFF',
  },
  musicTrackSubtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: WiseColors.primary,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    marginVertical: 4,
    paddingHorizontal: 6,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  audioPlayButton: {
    backgroundColor: WiseColors.primary,
    paddingVertical: 12,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    marginTop: 6,
  },
  audioPlayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  storyCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 8,
  },
  chapterHeader: {
    marginBottom: 4,
  },
  chapterPill: {
    alignSelf: 'flex-start',
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  chapterTag: {
    color: WiseColors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chapterText: {
    color: WiseColors.ink,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#eef1eb',
  },
  pagePill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  pagePillDisabled: {
    opacity: 0.3,
  },
  pagePillText: {
    color: WiseColors.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  pagePillTextDisabled: {
    color: WiseColors.mute,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: '#dcdfd9',
  },
  secretCard: {
    backgroundColor: '#fffbf0',
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#faecd1',
    gap: 6,
  },
  secretHeading: {
    color: '#8a6508',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  secretText: {
    color: '#5c4305',
    fontSize: 13,
    lineHeight: 20,
  },
  lockedContainer: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    alignItems: 'center',
    gap: 12,
  },
  lockIconBox: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  lockedBadgeText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: WiseColors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  lockedDescription: {
    fontSize: 14,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  scanNfcButton: {
    width: '100%',
    backgroundColor: WiseColors.primary,
    paddingVertical: 14,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: WiseColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  scanNfcButtonPressed: {
    backgroundColor: WiseColors.primaryActive,
    transform: [{ scale: 0.99 }],
  },
  scanNfcButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  passkeyButton: {
    width: '100%',
    backgroundColor: WiseColors.canvas,
    borderWidth: 1.5,
    borderColor: WiseColors.primary,
    borderRadius: Rounded.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  passkeyButtonPressed: {
    backgroundColor: WiseColors.primaryPale,
    transform: [{ scale: 0.99 }],
  },
  passkeyButtonText: {
    color: WiseColors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  lockedDisclaimer: {
    fontSize: 12,
    color: WiseColors.mute,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  audioFullTourBtn: {
    backgroundColor: WiseColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Rounded.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: WiseColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  audioFullTourBtnPressed: {
    backgroundColor: WiseColors.primaryActive,
    transform: [{ scale: 0.99 }],
  },
  audioFullTourBtnIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  audioFullTourBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  audioSecondaryRow: {
    marginTop: 8,
  },
  audioChapterPlayBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    alignItems: 'center',
  },
  audioChapterPlayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  autoplayToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8ece9',
    marginTop: 8,
  },
  autoplayToggleLabel: {
    fontSize: 12,
    color: WiseColors.mute,
    fontWeight: '600',
  },
  autoplayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  autoplayPillActive: {
    backgroundColor: WiseColors.primaryPale,
    borderColor: WiseColors.primaryNeutral,
  },
  autoplayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.mute,
  },
  autoplayPillTextActive: {
    color: WiseColors.primary,
  },
  speakingIndicator: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Rounded.pill,
  },
  speakingIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.primary,
  },
  previewAudioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 8,
    width: '100%',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTag: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  previewTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: WiseColors.primary,
    letterSpacing: 0.5,
  },
  previewDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.mute,
  },
  previewTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.ink,
    letterSpacing: -0.2,
  },
  previewNarratorText: {
    fontSize: 12,
    fontWeight: '600',
    color: WiseColors.mute,
  },
  previewExcerptText: {
    fontSize: 13,
    lineHeight: 19,
    color: WiseColors.body,
    fontStyle: 'italic',
  },
  previewPlayBtn: {
    backgroundColor: WiseColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  previewPlayBtnPressed: {
    backgroundColor: WiseColors.primaryActive,
    transform: [{ scale: 0.99 }],
  },
  previewPlayBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
