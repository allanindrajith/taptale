// Safe Storage abstraction that works across Web, Native, and Expo Go
// Even if native AsyncStorage is missing or unlinked, this will fallback gracefully.

let nativeStorage: any = null;

try {
  const mod = require('@react-native-async-storage/async-storage');
  nativeStorage = mod.default || mod;
} catch (e) {
  // Native AsyncStorage unavailable
}

// In-memory fallback dictionary
const memoryFallback = new Map<string, string>();

export const SafeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
      if (nativeStorage && typeof nativeStorage.getItem === 'function') {
        const val = await nativeStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      // Fall through to memory fallback
    }
    return memoryFallback.get(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryFallback.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
    try {
      if (nativeStorage && typeof nativeStorage.setItem === 'function') {
        await nativeStorage.setItem(key, value);
      }
    } catch (e) {}
  },

  async removeItem(key: string): Promise<void> {
    memoryFallback.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    try {
      if (nativeStorage && typeof nativeStorage.removeItem === 'function') {
        await nativeStorage.removeItem(key);
      }
    } catch (e) {}
  },
};
