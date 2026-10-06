import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);
  const { language, setLanguage } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Plaque passkey manual entry modal state (fallback when NFC fails or hardware unavailable)
  const [isPasskeyModalVisible, setIsPasskeyModalVisible] = useState(false);
  const [passkeyTargetSpot, setPasskeyTargetSpot] = useState<Spot | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // User's location: live GPS with simulation fallback
  const [locationState, setLocationState] = useState<LocationState>(LocationService.getCoords());
  const [unlockVersion, setUnlockVersion] = useState(0);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await LocationService.initRealTimeLocation();
      setLocationState(LocationService.getCoords());
      setUnlockVersion((v) => v + 1);
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

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
  const openPasskeyModal = (spot?: Spot) => {
    const target = spot || nearestSpot || SPOTS[0];
    setPasskeyTargetSpot(target);
    setPasskeyInput('');
    setPasskeyError(null);
    setIsPasskeyModalVisible(true);
  };

  // Validates passkey input strictly within 10-meter proximity of the plaque
  const handleVerifyPasskey = () => {
    const targetSpot = passkeyTargetSpot || nearestSpot || SPOTS[0];
    const cleanInput = passkeyInput.trim().toUpperCase();

    if (!cleanInput) {
      setPasskeyError(
        language === 'lt'
          ? 'Įveskite lentelės kodą (pvz., VILKAS-1323).'
          : 'Please enter the plaque passkey (e.g., VILKAS-1323).'
      );
      return;
    }

    // Identify if the code matches this spot or any registered spot in Lithuania
    const matchedSpot =
      SPOTS.find((s) => s.nfcSecretKey.toUpperCase() === cleanInput) || targetSpot;

    // Strict 10-meter proximity verification:
    // Plaque passkeys are physically engraved on the monument and can ONLY be verified within 10 meters!
    const distKm = calculateDistanceKm(
      locationState.latitude,
      locationState.longitude,
      matchedSpot.latitude,
      matchedSpot.longitude
    );
    const distMeters = Math.round(distKm * 1000);

    if (distMeters > 10) {
      setPasskeyError(
        language === 'lt'
          ? `❌ Atstumo patikra nepavyko: esate ${distMeters >= 1000 ? distKm.toFixed(1) + ' km' : distMeters + ' m'} nuo „${resolveText(matchedSpot.title, language)}“. Šis kodas galioja tik būnant arčiau nei 10 metrų nuo fizinės lentelės.`
          : `❌ Proximity check failed: You are ${distMeters >= 1000 ? distKm.toFixed(1) + ' km' : distMeters + ' m'} away from "${resolveText(matchedSpot.title, language)}". Plaque passkeys can only be validated within 10 meters of the physical plaque.`
      );
      return;
    }

    // Cryptographic validation against target monument's secret key
    const res = UnlockService.validateAndUnlock(
      matchedSpot.id,
      cleanInput,
      matchedSpot.nfcSecretKey
    );

    if (res.success) {
      setIsPasskeyModalVisible(false);
      handleUnlockedChange();
      setActiveSpot(matchedSpot);
      Alert.alert(
        language === 'lt' ? '🎉 Fizinė Lentelė Patvirtinta!' : '🎉 Plaque Passkey Verified!',
        language === 'lt'
          ? `Sėkmingai patvirtinote „${resolveText(matchedSpot.title, language)}“ (atstumas: ${distMeters} m)! 30 d. prieiga aktyvuota.`
          : `Successfully verified "${resolveText(matchedSpot.title, language)}" (${distMeters}m away)! 30-day access activated.`
      );
    } else {
      setPasskeyError(
        language === 'lt'
          ? '❌ Neteisingas lentelės kodas. Patikrinkite raides ir skaičius fizinėje lentelėje.'
          : '❌ Invalid plaque passkey. Please check the code engraved on the physical plaque.'
      );
    }
  };

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
        // If NFC hardware is missing or scan failed/unsupported:
        // Offer the physical plaque passkey option (with 10-meter proximity gate)
        const isSupported = await NfcService.isHardwareSupported();
        const fallbackSpot = target || nearestSpot || SPOTS[0];

        if (!isSupported || scanResult.hardwareMissing) {
          Alert.alert(
            language === 'lt' ? '🔑 Įveskite lentelės kodą' : '🔑 Enter Plaque Passkey',
            language === 'lt'
              ? `NFC funkcija nepasiekiama šiame įrenginyje (${scanResult.message}). Galite įvesti fizinėje lentelėje iškaltą kodą (leidžiama tik būnant iki 10 m nuo objekto).`
              : `NFC is not available on this device (${scanResult.message}). You can enter the passkey code engraved on the plaque (only valid within 10 meters).`,
            [
              { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
              {
                text: language === 'lt' ? '🔑 Įvesti kodą (≤10 m)' : '🔑 Enter Passkey (≤10m)',
                onPress: () => openPasskeyModal(fallbackSpot),
              },
            ]
          );
        } else {
          Alert.alert(
            language === 'lt' ? 'Fizinio NFC Skaitytuvas' : 'Physical NFC Reader',
            scanResult.message,
            [
              { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
              {
                text: language === 'lt' ? '🔑 Įvesti kodą (≤10 m)' : '🔑 Enter Passkey (≤10m)',
                onPress: () => openPasskeyModal(fallbackSpot),
              },
            ]
          );
        }
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanMessage(null);
      const fallbackSpot = target || nearestSpot || SPOTS[0];
      Alert.alert(
        language === 'lt' ? 'NFC Klaida' : 'NFC Error',
        (err?.message || (language === 'lt' ? 'Nuskaitymas nepavyko.' : 'Scanning failed.')) +
          (language === 'lt'
            ? '\n\nGalite įvesti fizinės lentelės kodą būdami prie objekto (≤10 m).'
            : '\n\nYou can enter the plaque passkey while standing near the monument (≤10m).'),
        [
          { text: language === 'lt' ? 'Atšaukti' : 'Cancel', style: 'cancel' },
          {
            text: language === 'lt' ? '🔑 Įvesti kodą (≤10 m)' : '🔑 Enter Passkey (≤10m)',
            onPress: () => openPasskeyModal(fallbackSpot),
          },
        ]
      );
    }
  };

  const openNavigation = (spot: Spot) => {
    // Open in-app directions & turn-by-turn guidance directly
    setActiveSpot(spot);
  };

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topInset + Spacing.xs }]}
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

          {/* Action Area: Clear NFC Scan + Intuitive Passkey Fallback */}
          <View style={styles.scannerActionsContainer}>
            {/* Primary Action: NFC Scan */}
            <Pressable
              disabled={isScanning}
              onPress={() => handleTriggerScan()}
              style={({ pressed }) => [
                styles.wisePillButton,
                pressed && styles.wisePillButtonPressed,
                isScanning && styles.wisePillButtonScanning,
              ]}>
              <View style={styles.nfcBtnContent}>
                <View style={styles.nfcIconBubble}>
                  <Text style={styles.nfcIconSymbol}>📡</Text>
                </View>
                <View style={styles.nfcBtnTextGroup}>
                  <Text style={styles.wisePillButtonText}>
                    {isScanning
                      ? language === 'lt'
                        ? 'Nuskaitoma žyma…'
                        : 'Scanning NFC…'
                      : language === 'lt'
                      ? 'Priliesti fizinę NFC žymą'
                      : 'Scan Physical NFC Plaque'}
                  </Text>
                  <Text style={styles.wisePillButtonSubtext}>
                    {language === 'lt'
                      ? 'Priglauskite telefoną prie paveldo lentelės'
                      : 'Hold phone against the brass plaque'}
                  </Text>
                </View>
              </View>
              <View style={styles.arrowCircle}>
                <Text style={styles.arrowCircleText}>→</Text>
              </View>
            </Pressable>

            {/* Subtle Elegant "OR" Separator */}
            <View style={styles.actionDividerRow}>
              <View style={styles.actionDividerLine} />
              <Text style={styles.actionDividerText}>
                {language === 'lt' ? 'ARBA' : 'OR'}
              </Text>
              <View style={styles.actionDividerLine} />
            </View>

            {/* User-Friendly Secondary Option: Plaque Passkey Entry Card */}
            <Pressable
              onPress={() => openPasskeyModal(nearestSpot || SPOTS[0])}
              style={({ pressed }) => [
                styles.passkeyRowCard,
                pressed && styles.passkeyRowCardPressed,
              ]}>
              <View style={styles.passkeyRowLeft}>
                <View style={styles.passkeyKeyIconWrap}>
                  <Text style={styles.passkeyKeyIcon}>🔑</Text>
                </View>
                <View style={styles.passkeyTextCol}>
                  <View style={styles.passkeyTitleRow}>
                    <Text style={styles.passkeyRowTitle}>
                      {language === 'lt' ? 'Neturite NFC? Įvesti kodą' : 'No NFC? Enter plaque passkey'}
                    </Text>
                    <View style={styles.passkeyRangePill}>
                      <Text style={styles.passkeyRangePillText}>
                        {language === 'lt' ? '≤ 10 m' : '≤ 10m'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.passkeyRowSubtitle}>
                    {language === 'lt'
                      ? 'Iškaltas fizinėje lentelėje prie objekto'
                      : 'Engraved on the physical monument plaque'}
                  </Text>
                </View>
              </View>
              <View style={styles.passkeyChevronWrap}>
                <Text style={styles.passkeyChevronText}>›</Text>
              </View>
            </Pressable>
          </View>
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

      {/* Plaque Passkey Input Modal (Fallback when NFC fails or device lacks NFC, 10m proximity gated) */}
      <Modal
        visible={isPasskeyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasskeyModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsPasskeyModalVisible(false)}
          />
          <View style={styles.passkeyModalContent}>
            {/* Header */}
            <View style={styles.passkeyHeaderRow}>
              <View style={styles.passkeyIconBox}>
                <Text style={styles.passkeyIcon}>🔑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passkeyModalTitle}>
                  {language === 'lt' ? 'Lentelės kodas' : 'Plaque Passkey'}
                </Text>
                <Text style={styles.passkeyModalSubtitle}>
                  {language === 'lt'
                    ? 'Patvirtinimas be NFC (reikalinga ≤ 10 m)'
                    : 'Physical Plaque Passkey (≤ 10m range)'}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsPasskeyModalVisible(false)}
                style={styles.passkeyCloseBtn}>
                <Text style={styles.passkeyCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Target Spot & Proximity Badge */}
            {passkeyTargetSpot && (() => {
              const currentDistKm = calculateDistanceKm(
                locationState.latitude,
                locationState.longitude,
                passkeyTargetSpot.latitude,
                passkeyTargetSpot.longitude
              );
              const currentDistM = Math.round(currentDistKm * 1000);
              const isInRange = currentDistM <= 10;

              return (
                <View style={styles.passkeyTargetCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passkeySpotTitle} numberOfLines={1}>
                      📍 {resolveText(passkeyTargetSpot.title, language)}
                    </Text>
                    <Text style={styles.passkeySpotCity}>
                      {resolveText(
                        CITIES.find((c) => c.id === passkeyTargetSpot.cityID)?.name || passkeyTargetSpot.teaser,
                        language
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.proximityBadge,
                      isInRange ? styles.proximityBadgeInRange : styles.proximityBadgeOutOfRange,
                    ]}>
                    <View
                      style={[
                        styles.proximityDot,
                        isInRange ? styles.proximityDotInRange : styles.proximityDotOutOfRange,
                      ]}
                    />
                    <Text
                      style={[
                        styles.proximityText,
                        isInRange ? styles.proximityTextInRange : styles.proximityTextOutOfRange,
                      ]}>
                      {isInRange
                        ? (language === 'lt' ? `✅ Vietoje: ${currentDistM} m (≤ 10 m)` : `✅ In range: ${currentDistM}m (≤ 10m)`)
                        : (language === 'lt'
                            ? `🔴 Už zonos ribų: ${currentDistM >= 1000 ? currentDistKm.toFixed(1) + ' km' : currentDistM + ' m'} (reikia ≤ 10 m)`
                            : `🔴 Too far: ${currentDistM >= 1000 ? currentDistKm.toFixed(1) + ' km' : currentDistM + ' m'} (must be ≤ 10m)`)}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.passkeyInstruction}>
              {language === 'lt'
                ? 'Įveskite raides ir skaičius, iškaltus fizinėje paveldo lentelėje prie objekto (pvz., VILKAS-1323). Kodas bus patvirtintas TIK esant 10 metrų atstumu nuo objekto.'
                : 'Enter the letters and numbers engraved on the physical heritage plaque at this spot (e.g., VILKAS-1323). The passkey is ONLY validated if you are within 10 meters.'}
            </Text>

            {/* Input Field */}
            <View style={styles.passkeyInputWrapper}>
              <TextInput
                style={styles.passkeyTextInput}
                value={passkeyInput}
                onChangeText={(text) => {
                  setPasskeyInput(text);
                  setPasskeyError(null);
                }}
                placeholder={language === 'lt' ? 'Pvz., VILKAS-1323' : 'e.g., VILKAS-1323'}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleVerifyPasskey}
              />
            </View>

            {/* Plaque Helper Tip */}
            <View style={styles.passkeyTipBox}>
              <Text style={styles.passkeyTipText}>
                {language === 'lt'
                  ? '💡 Kodas yra iškaltas tiesiai po NFC simboliu fizinėje lentelėje.'
                  : '💡 The passkey is stamped directly below the NFC logo on the plaque.'}
              </Text>
            </View>

            {/* Error Message */}
            {passkeyError && (
              <View style={styles.passkeyErrorContainer}>
                <Text style={styles.passkeyErrorText}>{passkeyError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.passkeyModalActionRow}>
              <Pressable
                onPress={() => setIsPasskeyModalVisible(false)}
                style={styles.passkeyCancelBtn}>
                <Text style={styles.passkeyCancelText}>
                  {language === 'lt' ? 'Atšaukti' : 'Cancel'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleVerifyPasskey}
                style={({ pressed }) => [
                  styles.passkeyVerifyBtn,
                  pressed && styles.passkeyVerifyBtnPressed,
                ]}>
                <Text style={styles.passkeyVerifyText}>
                  🔓 {language === 'lt' ? 'Atrakinti vietą' : 'Unlock Spot'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: WiseColors.canvasSoft,
  },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xl,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
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
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: Rounded.pill,
    shadowColor: WiseColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  wisePillButtonPressed: {
    backgroundColor: WiseColors.primaryActive,
    transform: [{ scale: 0.99 }],
  },
  wisePillButtonScanning: {
    backgroundColor: WiseColors.primaryHover,
  },
  nfcBtnTextGroup: {
    flex: 1,
  },
  wisePillButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  wisePillButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  scannerActionsContainer: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  nfcBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  nfcIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcIconSymbol: {
    fontSize: 16,
  },
  actionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
    gap: 12,
  },
  actionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E7E4',
  },
  actionDividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A399',
    letterSpacing: 1,
  },
  passkeyRowCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F9F7',
    borderWidth: 1.5,
    borderColor: '#D7E5DC',
    borderRadius: Rounded.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  passkeyRowCardPressed: {
    backgroundColor: '#EBF2EE',
    borderColor: WiseColors.primary,
    transform: [{ scale: 0.99 }],
  },
  passkeyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  passkeyKeyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5F0E9',
    borderWidth: 1,
    borderColor: '#CEE0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyKeyIcon: {
    fontSize: 16,
  },
  passkeyTextCol: {
    flex: 1,
    gap: 2,
  },
  passkeyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passkeyRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: WiseColors.ink,
    letterSpacing: -0.2,
  },
  passkeyRowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: WiseColors.body,
    lineHeight: 15,
  },
  passkeyRangePill: {
    backgroundColor: '#D7EDE0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Rounded.pill,
  },
  passkeyRangePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: WiseColors.forestGreen,
    letterSpacing: 0.2,
  },
  passkeyChevronWrap: {
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  passkeyChevronText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8A9C90',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  passkeyModalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: WiseColors.canvas,
    borderRadius: Rounded.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  passkeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passkeyIconBox: {
    width: 44,
    height: 44,
    borderRadius: Rounded.md,
    backgroundColor: WiseColors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyIcon: {
    fontSize: 22,
  },
  passkeyModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.ink,
  },
  passkeyModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: WiseColors.body,
  },
  passkeyCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WiseColors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  passkeyTargetCard: {
    backgroundColor: WiseColors.canvasSoft,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  passkeySpotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WiseColors.ink,
  },
  passkeySpotCity: {
    fontSize: 12,
    fontWeight: '600',
    color: WiseColors.body,
  },
  proximityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Rounded.pill,
  },
  proximityBadgeInRange: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  proximityBadgeOutOfRange: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  proximityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  proximityDotInRange: {
    backgroundColor: '#16a34a',
  },
  proximityDotOutOfRange: {
    backgroundColor: '#dc2626',
  },
  proximityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  proximityTextInRange: {
    color: '#15803d',
  },
  proximityTextOutOfRange: {
    color: '#b91c1c',
  },
  passkeyInstruction: {
    fontSize: 13,
    color: WiseColors.body,
    lineHeight: 18,
  },
  passkeyInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: Rounded.md,
    borderWidth: 2,
    borderColor: WiseColors.primary,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  passkeyTextInput: {
    fontSize: 18,
    fontWeight: '800',
    color: WiseColors.ink,
    letterSpacing: 1.5,
  },
  passkeyTipBox: {
    backgroundColor: '#F3F6F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Rounded.md,
    borderWidth: 1,
    borderColor: '#E0E7E2',
  },
  passkeyTipText: {
    fontSize: 12,
    color: WiseColors.body,
    fontWeight: '500',
    lineHeight: 16,
  },
  passkeyErrorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: Rounded.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  passkeyErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    lineHeight: 16,
  },
  passkeyModalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  passkeyCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  passkeyVerifyBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: Rounded.pill,
    backgroundColor: WiseColors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyVerifyBtnPressed: {
    opacity: 0.85,
  },
  passkeyVerifyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
