import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Image,
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
  CITIES,
  calculateDistanceKm,
  formatDistance,
  formatMinutes,
  getTravelEstimates,
  resolveText,
  Spot,
  SPOTS,
} from '@/constants/spots';
import { Spacing, WiseColors } from '@/constants/theme';
import { LocationService, LocationState } from '@/services/location-service';
import { UnlockService } from '@/services/unlock-storage';
import { useLanguage } from '@/hooks/use-language';
import { SearchIcon } from '@/components/brand-icons';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  // User location: live GPS with simulation fallback
  const [locationState, setLocationState] = useState<LocationState>(LocationService.getCoords());

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await LocationService.initRealTimeLocation();
      setLocationState(LocationService.getCoords());
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = LocationService.subscribe(() => {
      setLocationState(LocationService.getCoords());
    });
    return unsub;
  }, []);

  const categories = [
    { id: 'all', labelEn: 'All Types', labelLt: 'Visi Tipai' },
    { id: 'castle', labelEn: '🏰 Castles', labelLt: '🏰 Pilys' },
    { id: 'sacred', labelEn: '⛪ Sacred & Churches', labelLt: '⛪ Šventovės' },
    { id: 'culture', labelEn: '🎨 Art & Republic', labelLt: '🎨 Menas ir Respublika' },
    { id: 'historic', labelEn: '🎓 Universities & Cloisters', labelLt: '🎓 Istorija ir Mokslas' },
  ];

  const filteredSpots = useMemo(() => {
    return SPOTS.filter((spot) => {
      // City filter
      if (selectedCity !== 'all' && spot.cityID !== selectedCity) {
        return false;
      }

      // Category filter
      if (selectedCategory === 'castle') {
        const isCastle =
          spot.id.includes('castle') ||
          spot.id.includes('tower') ||
          spot.id.includes('bastion') ||
          spot.id.includes('fort') ||
          spot.id.includes('palace');
        if (!isCastle) return false;
      }
      if (selectedCategory === 'sacred') {
        const isSacred =
          spot.id.includes('cathedral') ||
          spot.id.includes('dawn') ||
          spot.id.includes('cross') ||
          spot.id.includes('church') ||
          spot.id.includes('monastery') ||
          spot.id.includes('hill');
        if (!isSacred) return false;
      }
      if (selectedCategory === 'culture') {
        const isCulture =
          spot.id.includes('uzupis') ||
          spot.id.includes('museum') ||
          spot.id.includes('pier') ||
          spot.id.includes('funicular') ||
          spot.id.includes('garden') ||
          spot.id.includes('town-hall');
        if (!isCulture) return false;
      }
      if (selectedCategory === 'historic') {
        const isHistoric =
          spot.id.includes('university') ||
          spot.id.includes('town-hall') ||
          spot.id.includes('palace') ||
          spot.id.includes('monastery') ||
          spot.id.includes('fort') ||
          spot.id.includes('bastion');
        if (!isHistoric) return false;
      }

      // Search query matching (title, teaser, activities, city)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const titleEn = spot.title.en.toLowerCase();
        const titleLt = (spot.title.lt || '').toLowerCase();
        const teaserEn = spot.teaser.en.toLowerCase();
        const teaserLt = (spot.teaser.lt || '').toLowerCase();
        const activitiesStr = spot.activities.map((a) => (a.en + ' ' + (a.lt || '')).toLowerCase()).join(' ');

        const match =
          titleEn.includes(query) ||
          titleLt.includes(query) ||
          teaserEn.includes(query) ||
          teaserLt.includes(query) ||
          activitiesStr.includes(query);

        if (!match) return false;
      }

      return true;
    }).map((spot) => {
      const dist = calculateDistanceKm(
        locationState.latitude,
        locationState.longitude,
        spot.latitude,
        spot.longitude
      );
      const estimates = getTravelEstimates(dist);
      const isUnlocked = UnlockService.isUnlocked(spot.id);
      const days = UnlockService.getDaysRemaining(spot.id);

      return {
        spot,
        distanceKm: dist,
        estimates,
        isUnlocked,
        daysRemaining: days,
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [searchQuery, selectedCity, selectedCategory, locationState.latitude, locationState.longitude]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 8 }]}
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

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>
              {language === 'lt' ? 'Paieška' : 'Search Landmarks'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {language === 'lt'
                ? 'Raskite istorines vietas, pilis ir šventoves'
                : 'Find historical landmarks, castles, and sacred sites'}
            </Text>
            {/* Live Location indicator */}
            <View style={styles.locationPillRow}>
              <View style={[styles.locationIndicatorDot, styles.locationIndicatorDotLive]} />
              <Text style={styles.locationPillText}>
                📍 {locationState.district && !locationState.cityName?.includes(locationState.district)
                  ? `${locationState.district}, ${locationState.cityName}`
                  : (locationState.cityName || locationState.label || 'Vilnius, Lithuania')}
              </Text>
            </View>
          </View>

        </View>

        {/* Search Bar Input */}
        <View style={styles.searchBarWrap}>
          <SearchIcon size={18} color="#9ca3af" style={styles.searchIconBox} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              language === 'lt'
                ? 'Ieškoti pagal pavadinimą, vietovę ar veiklą...'
                : 'Search by castle, church, university, lore...'
            }
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* City Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}>
          <Pressable
            style={[
              styles.cityFilterChip,
              selectedCity === 'all' && styles.cityFilterChipActive,
            ]}
            onPress={() => setSelectedCity('all')}>
            <Text
              style={[
                styles.cityFilterChipText,
                selectedCity === 'all' && styles.cityFilterChipTextActive,
              ]}>
              {language === 'lt' ? 'Visi Miestai' : 'All Regions'}
            </Text>
          </Pressable>

          {CITIES.map((city) => {
            const isSelected = selectedCity === city.id;
            return (
              <Pressable
                key={city.id}
                style={[
                  styles.cityFilterChip,
                  isSelected && styles.cityFilterChipActive,
                ]}
                onPress={() => setSelectedCity(city.id)}>
                <Text
                  style={[
                    styles.cityFilterChipText,
                    isSelected && styles.cityFilterChipTextActive,
                  ]}>
                  {resolveText(city.name, language)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterPillsRow, { marginTop: 6, marginBottom: 14 }]}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}>
                  {language === 'lt' ? cat.labelLt : cat.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results Counter */}
        <View style={styles.resultsHeaderRow}>
          <Text style={styles.resultsCountText}>
            {language === 'lt'
              ? `Rasta vietų: ${filteredSpots.length}`
              : `Showing ${filteredSpots.length} landmark${filteredSpots.length === 1 ? '' : 's'}`}
          </Text>
          <Text style={styles.resultsSortHint}>
            {language === 'lt' ? 'Rūšiuojama pagal atstumą' : 'Sorted by distance'}
          </Text>
        </View>

        {/* Spots Results List */}
        {filteredSpots.length === 0 ? (
          <View style={styles.emptyCard}>
            <SearchIcon size={44} color={WiseColors.mute} style={styles.emptyIconBox} />
            <Text style={styles.emptyTitle}>
              {language === 'lt' ? 'Rezultatų nerasta' : 'No Landmarks Found'}
            </Text>
            <Text style={styles.emptyDesc}>
              {language === 'lt'
                ? 'Pabandykite pakeisti paieškos žodį arba išvalykite pasirinktus filtrus.'
                : 'Try searching with a different keyword or resetting your region and category filters.'}
            </Text>
            <Pressable
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCity('all');
                setSelectedCategory('all');
              }}>
              <Text style={styles.resetFiltersBtnText}>
                {language === 'lt' ? 'Išvalyti Filtrus' : 'Clear All Filters'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.spotsList}>
            {filteredSpots.map(({ spot, distanceKm, estimates, isUnlocked, daysRemaining }) => {
              const spotTitle = resolveText(spot.title, language);
              const spotTeaser = resolveText(spot.teaser, language);
              const city = CITIES.find((c) => c.id === spot.cityID);
              const cityName = city ? resolveText(city.name, language) : '';

              return (
                <Pressable
                  key={spot.id}
                  style={styles.spotCard}
                  onPress={() => setSelectedSpot(spot)}>
                  <Image
                    source={
                      typeof spot.imageUrl === 'string'
                        ? { uri: spot.imageUrl }
                        : spot.imageUrl
                    }
                    style={styles.spotImage}
                    resizeMode="cover"
                  />

                  <View style={styles.spotCardBody}>
                    <View style={styles.spotBadgeRow}>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>📍 {cityName}</Text>
                      </View>

                      {isUnlocked ? (
                        <View style={styles.passActivePill}>
                          <Text style={styles.passActiveText}>
                            🟢 {daysRemaining}d Pass
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.passLockedPill}>
                          <Text style={styles.passLockedText}>🔒 Tap NFC</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.spotTitle} numberOfLines={1}>
                      {spotTitle}
                    </Text>

                    <Text style={styles.spotTeaser} numberOfLines={2}>
                      {spotTeaser}
                    </Text>

                    {/* Travel modes footer */}
                    <View style={styles.travelFooter}>
                      <View style={styles.travelModesList}>
                        {estimates.slice(0, 3).map((est) => (
                          <Text key={est.mode} style={styles.travelModeChip}>
                            {est.icon} {formatMinutes(est.minutes)}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.distBadge}>
                        <Text style={styles.distBadgeText}>
                          {formatDistance(distanceKm)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Spot Story Modal */}
      <SpotStoryModal
        spot={selectedSpot}
        language={language}
        visible={!!selectedSpot}
        userCoords={{
          latitude: locationState.latitude,
          longitude: locationState.longitude,
          label: locationState.label,
        }}
        onClose={() => setSelectedSpot(null)}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
    marginTop: 2,
  },
  locationPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  locationIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WiseColors.primary,
  },
  locationIndicatorDotLive: {
    backgroundColor: '#10b981',
  },
  locationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.inkDeep,
  },
  locationCoordsMini: {
    fontSize: 10,
    color: WiseColors.mute,
    fontWeight: '500',
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
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIconBox: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: WiseColors.ink,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: WiseColors.mute,
    fontWeight: '700',
  },
  filterPillsRow: {
    gap: 8,
  },
  cityFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  cityFilterChipActive: {
    backgroundColor: WiseColors.primary,
    borderColor: WiseColors.primary,
  },
  cityFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WiseColors.body,
  },
  cityFilterChipTextActive: {
    color: '#ffffff',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: WiseColors.canvas,
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
  },
  categoryChipActive: {
    backgroundColor: WiseColors.primaryPale,
    borderColor: WiseColors.primary,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  categoryChipTextActive: {
    color: WiseColors.primary,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: WiseColors.inkDeep,
  },
  resultsSortHint: {
    fontSize: 11,
    color: WiseColors.mute,
  },
  spotsList: {
    gap: 14,
  },
  spotCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  spotImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#e5e7eb',
  },
  spotCardBody: {
    padding: 14,
  },
  spotBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cityPill: {
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: WiseColors.ink,
  },
  passActivePill: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  passLockedPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  spotTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 4,
  },
  spotTeaser: {
    fontSize: 12,
    color: WiseColors.body,
    lineHeight: 17,
    marginBottom: 12,
  },
  travelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: WiseColors.forestBorder,
  },
  travelModesList: {
    flexDirection: 'row',
    gap: 6,
  },
  travelModeChip: {
    fontSize: 11,
    fontWeight: '600',
    color: WiseColors.body,
    backgroundColor: WiseColors.canvasSoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distBadge: {
    backgroundColor: WiseColors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: WiseColors.primary,
  },
  emptyCard: {
    backgroundColor: WiseColors.canvas,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WiseColors.forestBorder,
    marginTop: 20,
  },
  emptyIconBox: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WiseColors.inkDeep,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: WiseColors.body,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  resetFiltersBtn: {
    backgroundColor: WiseColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFiltersBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
