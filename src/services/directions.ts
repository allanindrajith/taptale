import { Linking, Platform } from 'react-native';

import { Spot } from '@/constants/spots';

export interface MapApp {
  id: string;
  name: string;
  /** URL used only to ask the OS "is this app installed?"; null = always available. */
  probe: string | null;
  /** Deep link that opens the app straight to a route to the spot. */
  url: (spot: Spot) => string;
  /** List the app even when it isn't detected (detection can miss apps with unpublished schemes). */
  alwaysShow?: boolean;
  /** Where to send the user if the app can't be opened, e.g. its store page. */
  fallbackUrl?: string;
}

const coords = (spot: Spot) => `${spot.latitude},${spot.longitude}`;

// Every app listed here must also be declared in app.json (iOS LSApplicationQueriesSchemes)
// and plugins/with-map-app-queries.js (Android <queries>), or the OS hides it from canOpenURL.
const APPLE_MAPS: MapApp = {
  id: 'apple',
  name: 'Apple Maps',
  probe: null,
  url: (spot) => `maps://?daddr=${coords(spot)}&dirflg=d`,
};

const GOOGLE_MAPS: MapApp =
  Platform.OS === 'ios'
    ? {
        id: 'google',
        name: 'Google Maps',
        probe: 'comgooglemaps://',
        url: (spot) => `comgooglemaps://?daddr=${coords(spot)}&directionsmode=walking`,
      }
    : {
        id: 'google',
        name: 'Google Maps',
        probe: 'google.navigation:q=0,0',
        url: (spot) => `google.navigation:q=${coords(spot)}&mode=w`,
      };

const WAZE: MapApp = {
  id: 'waze',
  name: 'Waze',
  probe: 'waze://',
  url: (spot) => `waze://?ll=${coords(spot)}&navigate=yes`,
};

const UBER: MapApp = {
  id: 'uber',
  name: 'Uber',
  probe: 'uber://',
  url: (spot) =>
    `uber://?action=setPickup&pickup=my_location` +
    `&dropoff[latitude]=${spot.latitude}&dropoff[longitude]=${spot.longitude}` +
    `&dropoff[nickname]=${encodeURIComponent(spot.title.en)}`,
};

// Bolt publishes no destination deep link, so this only opens the app; the rider types the
// address. Always listed: if it isn't installed (or `bolt://` isn't recognised), tapping it
// opens Bolt's store page instead.
const BOLT: MapApp = {
  id: 'bolt',
  name: 'Bolt',
  probe: 'bolt://',
  url: () => 'bolt://',
  alwaysShow: true,
  fallbackUrl:
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/id675033630'
      : 'https://play.google.com/store/apps/details?id=ee.mtakso.client',
};

const CANDIDATES: MapApp[] =
  Platform.OS === 'ios'
    ? [APPLE_MAPS, GOOGLE_MAPS, WAZE, UBER, BOLT]
    : [GOOGLE_MAPS, WAZE, UBER, BOLT];

async function isInstalled(app: MapApp): Promise<boolean> {
  if (!app.probe) return true;
  try {
    return await Linking.canOpenURL(app.probe);
  } catch {
    return false;
  }
}

/** The navigation / ride apps this phone actually has, in display order. */
export async function getInstalledMapApps(): Promise<MapApp[]> {
  const found = await Promise.all(CANDIDATES.map(isInstalled));
  return CANDIDATES.filter((app, i) => found[i] || app.alwaysShow);
}

/**
 * Fallback when no known app is detected (or one fails to open): the system's own
 * handler. On Android `geo:` raises the native "open with" chooser of every map app;
 * elsewhere it's the Google Maps web route.
 */
export async function openSystemDirections(spot: Spot): Promise<void> {
  const web = `https://www.google.com/maps/dir/?api=1&destination=${coords(spot)}`;
  const label = encodeURIComponent(spot.title.en);
  const url = Platform.OS === 'android' ? `geo:${coords(spot)}?q=${coords(spot)}(${label})` : web;
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(web).catch((e) => {
      if (__DEV__) console.warn('Could not open directions', e);
    });
  }
}

/** Opens the chosen app with a route from the user's live position to the spot. */
export async function openInMapApp(app: MapApp, spot: Spot): Promise<void> {
  try {
    await Linking.openURL(app.url(spot));
    return;
  } catch (e) {
    if (__DEV__) console.warn(`Could not open ${app.name}`, e);
  }
  if (app.fallbackUrl) {
    try {
      await Linking.openURL(app.fallbackUrl);
      return;
    } catch (e) {
      if (__DEV__) console.warn(`Could not open ${app.name} store page`, e);
    }
  }
  await openSystemDirections(spot);
}
