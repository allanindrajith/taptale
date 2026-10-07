import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';

import { LocationAnimation } from '@/components/location-animation';
import { PasskeySheet } from '@/components/passkey-sheet';
import { SpotStoryModal } from '@/components/spot-story-modal';
import { Chip, ChipRow, EmptyState, Segmented, SpotRow, tr } from '@/components/ui/kit';
import { calculateDistanceKm, CITIES, resolveText, Spot, SPOTS } from '@/constants/spots';
import { Palette, Type } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { unlockedMessage, useNfcUnlock } from '@/hooks/use-nfc-unlock';
import { useUnlocks } from '@/hooks/use-unlocks';
import { useUserLocation } from '@/hooks/use-user-location';
import { UnlockService } from '@/services/unlock-storage';

interface SpotWithDistance {
  spot: Spot;
  km: number;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const { location, refresh } = useUserLocation();
  const { unlockedCount, total, version } = useUnlocks();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [passkeySpot, setPasskeySpot] = useState<Spot | null>(null);
  const [isPasskeyOpen, setIsPasskeyOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const byDistance: SpotWithDistance[] = useMemo(
    () =>
      SPOTS.map((spot) => ({
        spot,
        km: calculateDistanceKm(location.latitude, location.longitude, spot.latitude, spot.longitude),
      })).sort((a, b) => a.km - b.km),
    [location.latitude, location.longitude]
  );

  const spots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byDistance.filter(
      ({ spot }) =>
        (city === 'all' || spot.cityID === city) &&
        (!q ||
          resolveText(spot.title, language).toLowerCase().includes(q) ||
          resolveText(spot.teaser, language).toLowerCase().includes(q))
    );
  }, [byDistance, query, city, language]);

  const nearest = byDistance[0]?.spot;

  const openPasskey = useCallback(
    (spot?: Spot) => {
      setPasskeySpot(spot ?? nearest ?? null);
      setIsPasskeyOpen(true);
    },
    [nearest]
  );

  const handleUnlocked = useCallback(
    (spot: Spot, renewed: boolean) => {
      setIsPasskeyOpen(false);
      setActiveSpot(spot);
      Alert.alert(tr(language, 'Unlocked', 'Atrakinta'), unlockedMessage(spot, renewed, language));
    },
    [language]
  );

  const { scanning, scan } = useNfcUnlock({
    language,
    onUnlocked: handleUnlocked,
    onFallback: openPasskey,
  });

  // A spot passed in the URL (e.g. from the web unlock page) opens until the user closes it
  const params = useLocalSearchParams<{ spot?: string }>();
  const [closedParam, setClosedParam] = useState<string | undefined>();
  const paramSpot = params.spot !== closedParam ? SPOTS.find((s) => s.id === params.spot) : undefined;
  const shownSpot = activeSpot ?? paramSpot ?? null;

  const closeSpot = () => {
    setActiveSpot(null);
    setClosedParam(params.spot);
  };

  // Plaque deep links: taptale://unlock?spot=<id>&key=<code>
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const { queryParams } = ExpoLinking.parse(url);
      const spotId = typeof queryParams?.spot === 'string' ? queryParams.spot : undefined;
      const key = typeof queryParams?.key === 'string' ? queryParams.key : undefined;
      const spot = SPOTS.find((s) => s.id === spotId);
      if (!spot || !key) return;

      const renewed = UnlockService.isUnlocked(spot.id);
      const res = UnlockService.validateAndUnlock(spot.id, key, spot.nfcSecretKey);
      if (res.success) {
        handleUnlocked(spot, renewed);
      } else {
        Alert.alert(
          tr(language, 'Couldn’t unlock', 'Nepavyko atrakinti'),
          tr(language, 'This plaque link isn’t valid.', 'Ši lentelės nuoroda negalioja.')
        );
      }
    };

    ExpoLinking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [language, handleUnlocked]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const progressPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
  const place = location.cityName?.split(',')[0] || 'Lithuania';

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.topBar}>
        <View style={styles.flex}>
          <View style={styles.placeRow}>
            <Ionicons name="navigate" size={12} color={Palette.green} />
            <Text style={styles.placeText}>{place}</Text>
          </View>
          <Text style={Type.display} accessibilityRole="header">
            {tr(language, 'Explore', 'Atraskite')}
          </Text>
        </View>
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

      {/* The one thing this app does: tap a plaque */}
      <View style={styles.tapCard}>
        <View style={styles.tapTop}>
          <View style={styles.flex}>
            <Text style={styles.tapTitle}>
              {scanning
                ? tr(language, 'Hold near the plaque…', 'Priglauskite prie lentelės…')
                : tr(language, 'At a plaque?', 'Prie lentelės?')}
            </Text>
            <Text style={styles.tapBody}>
              {tr(
                language,
                'Tap it with your phone to unlock its story for 30 days.',
                'Priglauskite telefoną ir atrakinkite istoriją 30 dienų.'
              )}
            </Text>
          </View>
          <LocationAnimation animation="pulse" color="#FFFFFF" size={64} />
        </View>

        <Pressable
          testID="scan-button"
          accessibilityRole="button"
          accessibilityLabel={tr(language, 'Scan plaque', 'Skenuoti lentelę')}
          disabled={scanning}
          onPress={() => scan()}
          style={({ pressed }) => [styles.scanBtn, pressed && styles.pressed, scanning && styles.dim]}>
          <Ionicons name="phone-portrait-outline" size={18} color={Palette.greenDeep} />
          <Text style={styles.scanBtnText}>
            {scanning ? tr(language, 'Scanning…', 'Skenuojama…') : tr(language, 'Scan plaque', 'Skenuoti lentelę')}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => openPasskey()} hitSlop={8} style={styles.codeLink}>
          <Text style={styles.codeLinkText}>{tr(language, 'No NFC? Enter the code', 'Nėra NFC? Įveskite kodą')}</Text>
        </Pressable>

        <View style={styles.progressRow} accessible accessibilityLabel={`${unlockedCount} / ${total}`}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {unlockedCount}/{total} {tr(language, 'collected', 'surinkta')}
          </Text>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={Palette.mute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tr(language, 'Search places', 'Ieškoti vietų')}
          placeholderTextColor={Palette.mute}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={tr(language, 'Search places', 'Ieškoti vietų')}
        />
      </View>

      <ChipRow>
        <Chip label={tr(language, 'Nearby', 'Šalia')} active={city === 'all'} onPress={() => setCity('all')} />
        {CITIES.map((c) => (
          <Chip
            key={c.id}
            label={resolveText(c.name, language)}
            active={city === c.id}
            onPress={() => setCity(c.id)}
          />
        ))}
      </ChipRow>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={spots}
        keyExtractor={(item) => item.spot.id}
        extraData={version}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) + 12 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.green} />}
        renderItem={({ item }) => (
          <SpotRow
            spot={item.spot}
            language={language}
            distanceKm={item.km}
            unlocked={UnlockService.isUnlocked(item.spot.id)}
            daysLeft={UnlockService.getDaysRemaining(item.spot.id)}
            onPress={() => setActiveSpot(item.spot)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={tr(language, 'No places found', 'Vietų nerasta')}
            body={tr(language, 'Try another name or city.', 'Pabandykite kitą pavadinimą ar miestą.')}
          />
        }
      />

      <PasskeySheet
        visible={isPasskeyOpen}
        spot={passkeySpot}
        language={language}
        userCoords={location}
        onClose={() => setIsPasskeyOpen(false)}
        onUnlocked={(spot) => handleUnlocked(spot, false)}
      />

      <SpotStoryModal spot={shownSpot} language={language} visible={shownSpot !== null} onClose={closeSpot} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  headerStack: { gap: 20, marginBottom: 8 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  placeText: { fontSize: 13, fontWeight: '600', color: Palette.green },
  langToggle: { width: 96, marginBottom: 4 },

  tapCard: {
    backgroundColor: Palette.green,
    borderRadius: 28,
    padding: 22,
    gap: 14,
    overflow: 'hidden',
  },
  tapTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tapTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tapBody: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  scanBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanBtnText: { fontSize: 16, fontWeight: '700', color: Palette.greenDeep },
  codeLink: { alignSelf: 'center', paddingVertical: 2 },
  codeLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textDecorationLine: 'underline',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Palette.goldTint },
  progressText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.hairline,
  },
  searchInput: { flex: 1, fontSize: 16, color: Palette.ink, paddingVertical: 0 },

  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.7 },
});
