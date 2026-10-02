// Safe lazy import for expo-location so it never crashes if ExpoLocation native module is not present
let Location: any = null;
try {
  const mod = require('expo-location');
  Location = mod.default || mod;
} catch (e) {
  // ExpoLocation missing
}

export interface LocationState {
  latitude: number;
  longitude: number;
  label: string;
  cityName?: string;
  district?: string;
  isRealGps: boolean;
  accuracy?: number | null;
  error?: string | null;
}

// Default fallback location: Cathedral Square, Vilnius Old Town
const DEFAULT_VILNIUS: LocationState = {
  latitude: 54.6853,
  longitude: 25.2872,
  label: 'Vilnius Old Town',
  cityName: 'Vilnius, Lithuania',
  district: 'Senamiestis',
  isRealGps: false,
};

let currentState: LocationState = { ...DEFAULT_VILNIUS };
const listeners: Array<() => void> = [];
let locationSubscription: any = null;
let isWatching = false;

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      // ignore
    }
  });
}

async function reverseGeocodeCoords(latitude: number, longitude: number) {
  if (!Location || typeof Location.reverseGeocodeAsync !== 'function') return null;
  try {
    const res = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (res && res.length > 0) {
      const p = res[0];
      const city = p.city || p.subregion || p.region || '';
      const country = p.country || '';
      const district = p.district || p.street || '';
      const cityName = city && country ? `${city}, ${country}` : (city || country || 'Vilnius, Lithuania');
      return {
        cityName,
        district,
        label: district && city ? `${district}, ${city}` : (city || district || 'Vilnius, Lithuania'),
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export const LocationService = {
  /**
   * Get current location coordinates
   */
  getCoords(): LocationState {
    return { ...currentState };
  },

  /**
   * Subscribe to location updates
   */
  subscribe(callback: () => void): () => void {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /**
   * Initialize real-time device GPS location and watch for movement
   */
  async initRealTimeLocation(): Promise<{ success: boolean; message?: string }> {
    if (!Location || typeof Location.requestForegroundPermissionsAsync !== 'function') {
      currentState = {
        ...currentState,
        error: null,
        isRealGps: false,
      };
      notify();
      return { success: false, message: 'ExpoLocation not available in Expo Go' };
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        currentState = {
          ...currentState,
          error: 'Location permission was denied. Using Vilnius Old Town default.',
          isRealGps: false,
        };
        notify();
        return { success: false, message: 'Permission denied' };
      }

      // Get initial position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geo = await reverseGeocodeCoords(position.coords.latitude, position.coords.longitude);

      currentState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: geo?.label || 'Vilnius Old Town',
        cityName: geo?.cityName || 'Vilnius, Lithuania',
        district: geo?.district || '',
        isRealGps: true,
        accuracy: position.coords.accuracy,
        error: null,
      };
      notify();

      // Start real-time GPS subscription
      if (!isWatching) {
        isWatching = true;
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 15, // update when moved 15 meters
            timeInterval: 5000,   // or every 5 seconds
          },
          async (newPos: any) => {
            if (currentState.isRealGps) {
              const prevLat = currentState.latitude;
              const prevLng = currentState.longitude;
              const movedEnough = Math.abs(newPos.coords.latitude - prevLat) > 0.001 || Math.abs(newPos.coords.longitude - prevLng) > 0.001;

              currentState = {
                ...currentState,
                latitude: newPos.coords.latitude,
                longitude: newPos.coords.longitude,
                accuracy: newPos.coords.accuracy,
                error: null,
              };
              notify();

              if (movedEnough || !currentState.cityName) {
                const updatedGeo = await reverseGeocodeCoords(newPos.coords.latitude, newPos.coords.longitude);
                if (updatedGeo) {
                  currentState = {
                    ...currentState,
                    cityName: updatedGeo.cityName,
                    district: updatedGeo.district,
                    label: updatedGeo.label,
                  };
                  notify();
                }
              }
            }
          }
        );
      }

      return { success: true };
    } catch (err: any) {
      currentState = {
        ...currentState,
        error: err?.message || 'Error acquiring GPS location',
        isRealGps: false,
      };
      notify();
      return { success: false, message: err?.message };
    }
  },

  /**
   * Switch to a preset simulation location (useful for simulator testing in Lithuania)
   */
  setSimulatedLocation(latitude: number, longitude: number, label: string) {
    currentState = {
      latitude,
      longitude,
      label,
      isRealGps: false,
      error: null,
    };
    notify();
  },

  /**
   * Switch back to Live Real GPS
   */
  async enableRealGps() {
    await this.initRealTimeLocation();
  },

  /**
   * Stop watching
   */
  stopWatching() {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
      isWatching = false;
    }
  },
};
