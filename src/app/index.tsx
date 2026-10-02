import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';

import { LocationAnimation } from '@/components/location-animation';
import { SpotStoryModal } from '@/components/spot-story-modal';
import {
  AppLanguage,
  CITIES,
  resolveText,
  Spot,
  SPOTS,
  calculateDistanceKm,
  formatDistance,
  getTravelEstimates,
  formatMinutes,
} from '@/constants/spots';
import { Rounded, Spacing, WiseColors } from '@/constants/theme';
import { LocationService, LocationState } from '@/services/location-service';
import { UnlockService } from '@/services/unlock-storage';
import { NfcService } from '@/services/nfc-service';
import { useLanguage } from '@/hooks/use-language';


export default function HomeScreen() {
  const { language, setLanguage } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // User's location: live GPS with simulation fallback
  const [locationState, setLocationState] = useState<LocationState>(LocationService.getCoords());
  const [unlockVersion, setUnlockVersion] = useState(0);

  // Initialize Real-time Device GPS location
  useEffect(() => {
    LocationService.initRealTimeLocation();
    const unsub = LocationService.subscribe(() => {
      setLocationState(LocationService.getCoords());
    });
    return unsub;
  }, []);

  const searchParams = useLocalSearchParams<{ spot?: string }>();

  // If navigated with ?spot=... (e.g. from unlock screen), immediately open that spot
  useEffect(() => {
    if (searchParams.spot) {
      const found = SPOTS.find((s) => s.id === searchParams.spot);
      if (found) {
        setActiveSpot(found);
      }
    }
  }, [searchParams.spot]);

  // Listen for physical NFC tag deep links (e.g. taptale://unlock?spot=vln-cathedral-square&key=STEBUKLAS-1989)
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (!url) return;
      try {
        const parsed = ExpoLinking.parse(url);
        const spotId = parsed.queryParams?.spot as string | undefined;
        const key = parsed.queryParams?.key as string | undefined;
        if (spotId && key) {
          const targetSpot = SPOTS.find((s) => s.id === spotId);
          if (targetSpot) {
            const alreadyUnlocked = UnlockService.isUnlocked(spotId);
            const res = UnlockService.validateAndUnlock(spotId, key, targetSpot.nfcSecretKey);
            if (res.success) {
              setUnlockVersion((v) => v + 1);
              // Immediately visit that spot's page
              setActiveSpot(targetSpot);
              Alert.alert(
                alreadyUnlocked
                  ? (language === 'lt' ? '🏷️ Sveiki sugrįžę!' : '🏷️ Welcome Back!')
                  : (language === 'lt' ? '🏷️ Fizinė NFC Žyma Patvirtinta!' : '🏷️ NFC Plaque Verified!'),
                alreadyUnlocked
                  ? (language === 'lt'
                      ? `„${resolveText(targetSpot.title, language)}“ jau atrakinta! 30 d. prieiga atnaujinta. Atveriame istoriją…`
                      : `"${resolveText(targetSpot.title, language)}" is already unlocked! 30-Day pass renewed. Opening story…`)
                  : (language === 'lt'
                      ? `Sėkmingai atrakinote „${resolveText(targetSpot.title, language)}“ 30 dienų! Atveriame istoriją…`
                      : `30-Day Pass activated for "${resolveText(targetSpot.title, language)}"! Opening full audio guide & secrets…`),
                [{ text: language === 'lt' ? 'Tyrinėti' : 'Explore Now' }]
              );
            } else {
              Alert.alert('❌ NFC Tag Error', res.message);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse NFC URL', err);
      }
    };

    ExpoLinking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleUrl({ url: initialUrl });
      }
    });

    const sub = ExpoLinking.addEventListener('url', handleUrl);
    return () => {
      sub.remove();
    };
  }, [language]);

  // Force re-render when an unlock record updates
  const handleUnlockedChange = () => {
    setUnlockVersion((v) => v + 1);
  };

  // Filter spots by city
  const cityFilteredSpots =
    selectedCity === 'all'
      ? SPOTS
      : SPOTS.filter((s) => s.cityID === selectedCity);

  // Sort spots by geographic distance from user's current GPS location
  const sortedSpots = [...cityFilteredSpots].sort((a, b) => {
    const distA = calculateDistanceKm(locationState.latitude, locationState.longitude, a.latitude, a.longitude);
    const distB = calculateDistanceKm(locationState.latitude, locationState.longitude, b.latitude, b.longitude);
    return distA - distB;
  });

  // Calculate remaining locked spots
  const unlockedCount = SPOTS.filter((s) => UnlockService.isUnlocked(s.id)).length;
  const remainingCount = SPOTS.length - unlockedCount;
  const nearestSpot = sortedSpots[0];
  const nearestDistance = nearestSpot
    ? calculateDistanceKm(locationState.latitude, locationState.longitude, nearestSpot.latitude, nearestSpot.longitude)
    : 0;

  // User-facing clean location text
  const userLocationTitle = locationState.district && !locationState.cityName?.includes(locationState.district)
    ? `${locationState.district}, ${locationState.cityName}`
    : (locationState.cityName || locationState.label || (language === 'lt' ? 'Vilnius, Lietuva' : 'Vilnius, Lithuania'));

  // Real physical NFC scanning: Reads tag from physical NFC chip and validates cryptographic key
  // Unlocks that specific place and immediately visits its page (or visits if already unlocked)
  const handleTriggerScan = async (spot?: Spot) => {
    // When called without a spot (from Home button), target is undefined so it accepts ANY TapTale plaque
    const target = spot;
    setIsScanning(true);
    setScanMessage(
      language === 'lt'
        ? 'Priglauskite telefoną prie fizinės NFC lentelės…'
        : 'Hold phone near physical NFC plaque…'
    );

    try {
      const scanResult = await NfcService.scanPhysicalTag(target);
      setIsScanning(false);
      setScanMessage(null);

      if (scanResult.success && scanResult.spot) {
        handleUnlockedChange();
        // Immediately visit that specific place's story & audio page!
        setActiveSpot(scanResult.spot);

        if (scanResult.alreadyUnlocked) {
          Alert.alert(
            language === 'lt' ? '🎉 Sveiki sugrįžę!' : '🎉 Welcome Back!',
            language === 'lt'
              ? `„${resolveText(scanResult.spot.title, language)}“ jau atrakinta! 30 d. prieiga atnaujinta. Atveriame istoriją ir garsą.`
              : `"${resolveText(scanResult.spot.title, language)}" is already unlocked! 30-day pass renewed. Opening story and audio guide now.`,
            [{ text: language === 'lt' ? 'Atverti' : 'Open' }]
          );
        } else {
          Alert.alert(
            language === 'lt' ? '🎉 Fizinė NFC Žyma Patvirtinta!' : '🎉 Physical NFC Tag Verified!',
            language === 'lt'
              ? `Sėkmingai atrakinote „${resolveText(scanResult.spot.title, language)}“ 30 dienų! Atveriame istoriją…`
              : `Successfully unlocked "${resolveText(scanResult.spot.title, language)}" for 30 days! Opening story & audio…`,
            [{ text: language === 'lt' ? 'Tyrinėti' : 'Explore Now' }]
          );
        }
      } else {
        // Check if NFC hardware is missing in this test environment (e.g. simulator/dev client)
        const isSupported = await NfcService.isHardwareSupported();
        if (!isSupported) {
          // Provide instant simulation menu so user can test the exact unlock + visit flow
          const defaultSpot = nearestSpot || SPOTS[0];
          Alert.alert(
            language === 'lt' ? 'NFC Prieigos Testavimas' : 'NFC Heritage Plaque',
            language === 'lt'
              ? `Fizinis CoreNFC skaitytuvas neaptiktas simuliatoriuje. Ar norite simuliuoti fizinį NFC prilietimą prie artimiausios lentelės (${resolveText(defaultSpot.title, language)})?`
              : `CoreNFC hardware not present in simulator. Would you like to simulate tapping the nearest physical plaque (${resolveText(defaultSpot.title, language)})?`,
            [
              { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
              {
                text: language === 'lt' ? 'Priliesti lentelę' : 'Tap Plaque Now',
                onPress: () => {
                  const wasUnlocked = UnlockService.isUnlocked(defaultSpot.id);
                  UnlockService.unlockSpot(defaultSpot.id);
                  handleUnlockedChange();
                  // Immediately visit that place's page!
                  setActiveSpot(defaultSpot);
                  Alert.alert(
                    wasUnlocked
                      ? (language === 'lt' ? '🎉 Sveiki sugrįžę!' : '🎉 Welcome Back!')
                      : (language === 'lt' ? '🎉 Vieta Atrakinta!' : '🎉 Plaque Verified!'),
                    wasUnlocked
                      ? (language === 'lt'
                          ? `„${resolveText(defaultSpot.title, language)}“ jau atrakinta! Atveriame puslapį.`
                          : `"${resolveText(defaultSpot.title, language)}" is already unlocked! Visiting page now.`)
                      : (language === 'lt'
                          ? `Sėkmingai atrakinote „${resolveText(defaultSpot.title, language)}“ 30 dienų! Atveriame puslapį.`
                          : `Successfully unlocked "${resolveText(defaultSpot.title, language)}" for 30 days! Visiting page now.`)
                  );
                },
              },
            ]
          );
        } else {
          Alert.alert(
            language === 'lt' ? 'Fizinio NFC Skaitytuvas' : 'Physical NFC Reader',
            scanResult.message,
            [{ text: language === 'lt' ? 'Supratau' : 'OK' }]
          );
        }
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanMessage(null);
      Alert.alert(
        language === 'lt' ? 'NFC Klaida' : 'NFC Error',
        err?.message || (language === 'lt' ? 'Nuskaitymas nepavyko.' : 'Scanning cancelled or failed.')
      );
    }
  };

  const openNavigation = (spot: Spot) => {
    // Open in-app directions & turn-by-turn guidance directly
    setActiveSpot(spot);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top App Bar & Language Switcher */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.wiseFlagBadge}>
              <Text style={styles.wiseFlagSymbol}>⚡</Text>
            </View>
            <View>
              <Text style={styles.appTitle}>TapTale</Text>
              <Text style={styles.appSubtitle}>
                {language === 'lt' ? 'Pasaulinis paveldo gidas' : 'Smart Heritage Guide'}
              </Text>
            </View>
          </View>

          <View style={styles.langPillContainer}>
            <Pressable
              onPress={() => setLanguage('en')}
              style={[styles.langPill, language === 'en' && styles.langPillActive]}>
              <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>
                EN
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('lt')}
              style={[styles.langPill, language === 'lt' && styles.langPillActive]}>
              <Text style={[styles.langPillText, language === 'lt' && styles.langPillTextActive]}>
                LT
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Heavy Bold Display Hero */}
        <View style={styles.heroSection}>
          <View style={styles.kickerPill}>
            <Text style={styles.kickerText}>
              {language === 'lt' ? 'LIETUVOS KULTŪROS PAVELDAS' : 'LOCATION-BASED HERITAGE'}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {language === 'lt' ? 'Kelionės vietos.\nPriliesk istoriją.' : 'Travel local.\nTap globally.'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {language === 'lt'
              ? 'Raskite lankytinus objektus pagal savo buvimo vietą. Priglauskite telefoną prie fizinės NFC žymos ir atrakinkite pasakojimą bei muziką 30 dienų.'
              : 'Discover heritage spots near your exact location. Tap the physical NFC tag at each spot to unlock full stories, audio guides, and ambient music for 30 days.'}
          </Text>
        </View>

        {/* GEOGRAPHICAL PROGRESS & RADAR CARD */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View style={[styles.gpsPulseDot, styles.gpsPulseDotLive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.progressLocationText}>
                📍 {userLocationTitle}
              </Text>
              <Text style={styles.progressSubLocationText}>
                {nearestSpot
                  ? `${language === 'lt' ? 'Artimiausias objektas' : 'Nearest landmark'}: ${resolveText(nearestSpot.title, language)} (${formatDistance(nearestDistance, language)})`
                  : (language === 'lt' ? 'Ieškoma lankytinų vietų…' : 'Finding nearby landmarks…')}
              </Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{remainingCount}</Text>
              <Text style={styles.statLabel}>
                {language === 'lt' ? 'Likę aplankyti' : 'Places to go'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{unlockedCount}</Text>
              <Text style={styles.statLabel}>
                {language === 'lt' ? 'Atrakinta (30d.)' : '30-Day Passes'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {formatDistance(nearestDistance, language)}
              </Text>
              <Text style={styles.statLabel}>
                {language === 'lt' ? 'Artimiausias' : 'Nearest Spot'}
              </Text>
            </View>
          </View>
        </View>

        {/* Crisp White Card: Radar NFC Scanner */}
        <View style={styles.scannerCard}>
          <View style={styles.scannerAnimationBox}>
            <LocationAnimation
              animation="pulse"
              color={WiseColors.primary}
              size={135}
            />
          </View>

          <View style={styles.scannerInfoBox}>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>
                {isScanning
                  ? language === 'lt'
                    ? 'Nuskaitoma…'
                    : 'Reading NFC plaque...'
                  : language === 'lt'
                  ? 'NFC paruoštas nuskaitymui'
                  : 'NFC Ready to Tap'}
              </Text>
            </View>

            <Text style={styles.scannerCardHeading}>
              {isScanning
                ? language === 'lt'
                  ? 'Jungiamasi prie žymos…'
                  : 'Connecting to tag...'
                : language === 'lt'
                ? 'Atrakinti vietą 30 dienų'
                : 'Tap Plaque to Unlock'}
            </Text>

            <Text style={styles.scannerCardBody}>
              {scanMessage ||
                (language === 'lt'
                  ? 'Atvykę prie artimiausio objekto priglauskite telefoną prie lentelės, kad aktyvuotumėte 1 mėnesio prieigą.'
                  : 'When standing near a physical plaque in Lithuania, tap your phone to unlock audio, lore, and music for 30 days.')}
            </Text>
          </View>

          {/* Chunky Dark Forest Green Pill Button */}
          <Pressable
            disabled={isScanning}
            onPress={() => handleTriggerScan()}
            style={({ pressed }) => [
              styles.wisePillButton,
              pressed && styles.wisePillButtonPressed,
              isScanning && styles.wisePillButtonScanning,
            ]}>
            <Text style={styles.wisePillButtonText}>
              {isScanning
                ? language === 'lt'
                  ? 'Nuskaitoma žyma…'
                  : 'Scanning NFC…'
                : language === 'lt'
                ? 'Skenuoti fizinę NFC žymą'
                : 'Scan Physical NFC Plaque'}
            </Text>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowCircleText}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* City Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Pressable
              onPress={() => setSelectedCity('all')}
              style={[styles.cityChip, selectedCity === 'all' && styles.cityChipActive]}>
              <Text style={[styles.cityChipText, selectedCity === 'all' && styles.cityChipTextActive]}>
                {language === 'lt' ? 'Visi objektai' : 'All Spots'} ({SPOTS.length})
              </Text>
            </Pressable>
            {CITIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCity(c.id)}
                style={[styles.cityChip, selectedCity === c.id && styles.cityChipActive]}>
                <Text style={[styles.cityChipText, selectedCity === c.id && styles.cityChipTextActive]}>
                  {resolveText(c.name, language)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Historical Spots List (Sorted by Geographical Distance) */}
        <View style={styles.spotsSection}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionHeadingText}>
                {language === 'lt' ? 'Objektai pagal atstumą' : 'Spots Sorted by Distance'}
              </Text>
              <Text style={styles.sectionHeadingSubtext}>
                {language === 'lt'
                  ? `${remainingCount} vietos dar neatrakintos prie jūsų`
                  : `${remainingCount} spots remaining to unlock near you`}
              </Text>
            </View>
            <View style={styles.countTag}>
              <Text style={styles.countTagText}>{sortedSpots.length}</Text>
            </View>
          </View>

          {sortedSpots.map((spot) => {
            const unlocked = UnlockService.isUnlocked(spot.id);
            const daysLeft = UnlockService.getDaysRemaining(spot.id);
            const dist = calculateDistanceKm(
              locationState.latitude,
              locationState.longitude,
              spot.latitude,
              spot.longitude
            );

            return (
              <View key={spot.id} style={styles.spotCard}>
                {/* Spot Landmark Thumbnail Image */}
                <Pressable onPress={() => setActiveSpot(spot)} style={styles.spotImageContainer}>
                  <View style={styles.imagePlaceholderBackdrop}>
                    <LocationAnimation animation={spot.animation} color={WiseColors.primary} size={80} />
                    <Text style={styles.imageBackdropTitle}>{resolveText(spot.title, language)}</Text>
                  </View>
                  <Image
                    source={typeof spot.imageUrl === 'string' ? { uri: spot.imageUrl } : spot.imageUrl}
                    style={styles.spotCardImage}
                    resizeMode="cover"
                  />
                  {/* Distance Overlay Badge */}
                  <View style={styles.spotDistanceBadge}>
                    <Text style={styles.spotDistanceText}>
                      📍 {formatDistance(dist, language)}
                    </Text>
                  </View>
                  {/* Duration Badge */}
                  <View style={styles.spotDurationBadge}>
                    <Text style={styles.spotDurationText}>
                      ⏱️ {spot.durationMinutes} min
                    </Text>
                  </View>
                </Pressable>

                {/* Spot Card Body */}
                <View style={styles.spotCardContent}>
                  <View style={styles.spotCardHeader}>
                    <Text style={styles.spotTitle}>{resolveText(spot.title, language)}</Text>
                    {unlocked ? (
                      <View style={styles.unlockedPill}>
                        <Text style={styles.unlockedPillText}>
                          ✓ {language === 'lt' ? `Aktyvu (${daysLeft} d.)` : `30d Pass (${daysLeft}d)`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.lockedPill}>
                        <Text style={styles.lockedPillText}>
                          🔒 {language === 'lt' ? 'Reikia NFC žymos' : 'NFC Lock'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.spotTeaser}>{resolveText(spot.teaser, language)}</Text>

                  {/* "What you can do there" quick snippet */}
                  <View style={styles.activitySnippet}>
                    <Text style={styles.activitySnippetIcon}>💡</Text>
                    <Text style={styles.activitySnippetText} numberOfLines={1}>
                      {resolveText(spot.activities[0], language)}
                    </Text>
                  </View>

                  {/* 4-Mode Travel Times Row: Walk, Bicycle, Transit, Car */}
                  <View style={styles.travelTimesPillRow}>
                    {getTravelEstimates(dist).map((est) => (
                      <View key={est.mode} style={styles.travelTimeMiniPill}>
                        <Text style={styles.travelTimeMiniText}>
                          {est.icon} {formatMinutes(est.minutes, language)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions Row: Directions in Maps + View Details */}
                  <View style={styles.spotActionRow}>
                    <Pressable
                      onPress={() => openNavigation(spot)}
                      style={styles.mapActionBtn}>
                      <Text style={styles.mapActionBtnText}>
                        🗺️ {language === 'lt' ? 'Žemėlapis' : 'Directions'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setActiveSpot(spot)}
                      style={styles.detailsActionBtn}>
                      <Text style={styles.detailsActionBtnText}>
                        {unlocked
                          ? language === 'lt'
                            ? 'Pasakojimas ir garsas →'
                            : 'Open Story & Audio →'
                          : language === 'lt'
                          ? 'Peržiūrėti / Skenuoti →'
                          : 'Details & Unlock →'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Story & Lore Modal */}
      <SpotStoryModal
        spot={activeSpot}
        language={language}
        visible={activeSpot !== null}
        userCoords={{
          latitude: locationState.latitude,
          longitude: locationState.longitude,
          label: locationState.label,
        }}
        onClose={() => setActiveSpot(null)}
        onUnlockedChange={handleUnlockedChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: Spacing.huge,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wiseFlagBadge: {
    width: 38,
    height: 38,
    borderRadius: Rounded.md,
    backgroundColor: WiseColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wiseFlagSymbol: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.4,
  },
  appSubtitle: {
    fontSize: 12,
    color: WiseColors.body,
    fontWeight: '500',
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Rounded.pill,
  },
  langPillActive: {
    backgroundColor: WiseColors.primary,
  },
  langPillText: {
    color: WiseColors.body,
    fontSize: 12,
    fontWeight: '800',
  },
  langPillTextActive: {
    color: '#FFFFFF',
  },
  heroSection: {
    gap: 10,
    marginTop: Spacing.xs,
  },
  kickerPill: {
    alignSelf: 'flex-start',
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  kickerText: {
    color: WiseColors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: WiseColors.ink,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  heroSubtitle: {
    color: WiseColors.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  progressCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WiseColors.primary,
  },
  gpsPulseDotLive: {
    backgroundColor: '#10b981',
  },
  progressLocationText: {
    fontSize: 14,
    fontWeight: '800',
    color: WiseColors.ink,
  },
  progressSubLocationText: {
    fontSize: 12,
    color: WiseColors.body,
    fontWeight: '500',
    marginTop: 3,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: WiseColors.canvasSoft,
    paddingVertical: Spacing.md,
    borderRadius: Rounded.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: WiseColors.ink,
  },
  statLabel: {
    fontSize: 11,
    color: WiseColors.body,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#dcdfd9',
  },
  scannerCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  scannerAnimationBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerInfoBox: {
    alignItems: 'center',
    width: '100%',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Rounded.pill,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: WiseColors.primary,
  },
  activePillText: {
    color: WiseColors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  scannerCardHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.5,
  },
  scannerCardBody: {
    fontSize: 14,
    color: WiseColors.body,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.lg,
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  wisePillButton: {
    backgroundColor: WiseColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Rounded.pill,
    shadowColor: WiseColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  wisePillButtonPressed: {
    backgroundColor: WiseColors.primaryActive,
    transform: [{ scale: 0.99 }],
  },
  wisePillButtonScanning: {
    backgroundColor: WiseColors.primaryHover,
  },
  wisePillButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  filterSection: {
    marginVertical: Spacing.xs,
  },
  filterScroll: {
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: '#dcdfd9',
  },
  cityChipActive: {
    backgroundColor: WiseColors.primary,
    borderColor: WiseColors.primary,
  },
  cityChipText: {
    color: WiseColors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  spotsSection: {
    gap: Spacing.md,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeadingText: {
    fontSize: 19,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.4,
  },
  sectionHeadingSubtext: {
    fontSize: 12,
    color: WiseColors.body,
    marginTop: 2,
  },
  countTag: {
    backgroundColor: WiseColors.primaryPale,
    borderRadius: Rounded.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  countTagText: {
    color: WiseColors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  spotCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dcdfd9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  spotImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#dcdfd9',
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
    gap: 6,
  },
  imageBackdropTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WiseColors.primary,
    letterSpacing: -0.2,
  },
  spotCardImage: {
    width: '100%',
    height: '100%',
  },
  spotDistanceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
  },
  spotDistanceText: {
    fontSize: 11,
    fontWeight: '800',
    color: WiseColors.ink,
  },
  spotDurationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(17, 24, 19, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Rounded.pill,
  },
  spotDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spotCardContent: {
    padding: Spacing.lg,
    gap: 8,
  },
  spotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: WiseColors.ink,
    letterSpacing: -0.3,
    flex: 1,
  },
  unlockedPill: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: WiseColors.primaryNeutral,
  },
  unlockedPillText: {
    color: WiseColors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  lockedPill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.pill,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  lockedPillText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '800',
  },
  spotTeaser: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
  },
  activitySnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Rounded.md,
    marginTop: 2,
  },
  activitySnippetIcon: {
    fontSize: 12,
  },
  activitySnippetText: {
    fontSize: 12,
    color: WiseColors.ink,
    fontWeight: '600',
    flex: 1,
  },
  travelTimesPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  travelTimeMiniPill: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: Rounded.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e7e3',
  },
  travelTimeMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  spotActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  mapActionBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    borderWidth: 1,
    borderColor: '#dcdfd9',
    alignItems: 'center',
  },
  mapActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  detailsActionBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
