import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UnlockRecord {
  spotId: string;
  unlockedAt: number; // Date.now()
  expiresAt: number;  // Date.now() + 30 days
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Rich Demo Passes visible ONLY in the Demo Account (demo@taptale.com)
export const DEMO_RECORDS: Record<string, UnlockRecord> = {
  'vln-gediminas-tower': {
    spotId: 'vln-gediminas-tower',
    unlockedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 27 * 24 * 60 * 60 * 1000,
  },
  'vln-cathedral-square': {
    spotId: 'vln-cathedral-square',
    unlockedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
  },
  'vln-uzupis': {
    spotId: 'vln-uzupis',
    unlockedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
  },
  'trk-island-castle': {
    spotId: 'trk-island-castle',
    unlockedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 23 * 24 * 60 * 60 * 1000,
  },
};

let activeUserEmail: string = 'demo@taptale.com';
let memoryStore: Record<string, UnlockRecord> = { ...DEMO_RECORDS };
const listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
}

function getStorageKey(email: string) {
  return `@taptale_unlocked_spots_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

async function persistCurrentStore() {
  const key = getStorageKey(activeUserEmail);
  const data = JSON.stringify(memoryStore);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, data);
    } catch (e) {}
  }

  try {
    await AsyncStorage.setItem(key, data);
  } catch (e) {}

  notify();
}

export const UnlockService = {
  /**
   * Subscribe to unlock changes
   */
  subscribe(callback: () => void): () => void {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /**
   * Set the active user email and load their specific passes.
   * If Demo: loads rich demo passes.
   * If Real/Other User: loads their saved passes (or starts completely fresh with 0 passes).
   */
  async switchUser(email: string, isDemo = false) {
    activeUserEmail = email.trim().toLowerCase();

    if (isDemo || activeUserEmail === 'demo@taptale.com') {
      memoryStore = { ...DEMO_RECORDS };
      persistCurrentStore();
      return;
    }

    // Real user account: load their personal stored passes (defaults to empty {})
    const key = getStorageKey(activeUserEmail);
    let loaded: Record<string, UnlockRecord> | null = null;

    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        loaded = JSON.parse(stored);
      }
    } catch (e) {}

    if (!loaded && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored) loaded = JSON.parse(stored);
      } catch (e) {}
    }

    // For a fresh account with no prior unlocks, start with empty {}
    memoryStore = loaded ? loaded : {};
    notify();
  },

  /**
   * Reset/clear all passes for the current user (gives a 100% fresh start)
   */
  async clearForFreshStart() {
    memoryStore = {};
    await persistCurrentStore();
  },

  /**
   * Check if a spot is currently unlocked and has not expired.
   */
  isUnlocked(spotId: string): boolean {
    const record = memoryStore[spotId];
    if (!record) return false;
    return record.expiresAt > Date.now();
  },

  /**
   * Get the days remaining before the 30-day NFC unlock expires.
   */
  getDaysRemaining(spotId: string): number {
    const record = memoryStore[spotId];
    if (!record) return 0;
    const diff = record.expiresAt - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  },

  /**
   * Get the expiration date object.
   */
  getExpiresAt(spotId: string): Date | null {
    const record = memoryStore[spotId];
    if (!record || record.expiresAt <= Date.now()) return null;
    return new Date(record.expiresAt);
  },

  /**
   * Scan/tap NFC tag at location to unlock for 30 days (1 month).
   */
  unlockSpot(spotId: string): UnlockRecord {
    const now = Date.now();
    const newRecord: UnlockRecord = {
      spotId,
      unlockedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };
    memoryStore[spotId] = newRecord;
    persistCurrentStore();
    return newRecord;
  },

  /**
   * Validate secret password/key from physical NFC tag and unlock if valid.
   */
  validateAndUnlock(
    spotId: string,
    providedKey: string,
    expectedKey: string
  ): { success: boolean; message: string } {
    if (!providedKey || !expectedKey) {
      return { success: false, message: 'Missing NFC security key.' };
    }
    const cleanProvided = providedKey.trim().toUpperCase();
    const cleanExpected = expectedKey.trim().toUpperCase();
    if (cleanProvided === cleanExpected) {
      this.unlockSpot(spotId);
      return { success: true, message: 'Verified! 30-Day pass activated.' };
    }
    return {
      success: false,
      message: `Invalid key "${providedKey}". Check the physical plaque for the correct secret passkey.`,
    };
  },

  /**
   * Get all active unlock records as a dictionary
   */
  getAllRecords(): Record<string, UnlockRecord> {
    const active: Record<string, UnlockRecord> = {};
    const now = Date.now();
    Object.keys(memoryStore).forEach((spotId) => {
      const rec = memoryStore[spotId];
      if (rec && rec.expiresAt > now) {
        active[spotId] = rec;
      }
    });
    return active;
  },
};
