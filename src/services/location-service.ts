import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  label: string;
  isRealGps: boolean;
  accuracy?: number | null;
  error?: string | null;
}

// Default fallback location: Cathedral Square, Vilnius Old Town
const DEFAULT_VILNIUS: LocationState = {
  latitude: 54.6853,
  longitude: 25.2872,
  label: 'Vilnius Old Town',
  isRealGps: false,
};

let currentState: LocationState = { ...DEFAULT_VILNIUS };
const listeners: Array<() => void> = [];
let locationSubscription: Location.LocationSubscription | null = null;
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

      currentState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: 'My Real Location (Live GPS)',
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
            distanceInterval: 10, // update when moved 10 meters
            timeInterval: 5000,   // or every 5 seconds
          },
          (newPos) => {
            if (currentState.isRealGps) {
              currentState = {
                latitude: newPos.coords.latitude,
                longitude: newPos.coords.longitude,
                label: 'My Real Location (Live GPS)',
                isRealGps: true,
                accuracy: newPos.coords.accuracy,
                error: null,
              };
              notify();
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
