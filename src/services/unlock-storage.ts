import { SafeStorage } from './safe-storage';

export interface UnlockRecord {
  spotId: string;
  unlockedAt: number; // Date.now()
  expiresAt: number;  // Date.now() + 30 days
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const CATHEDRAL_SQUARE_ID = 'vln-cathedral-square';

// Only Cathedral Square is unlocked; all other places are locked
export const DEMO_RECORDS: Record<string, UnlockRecord> = {
  [CATHEDRAL_SQUARE_ID]: {
    spotId: CATHEDRAL_SQUARE_ID,
    unlockedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 28 * 24 * 60 * 60 * 1000,
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
    await SafeStorage.setItem(key, data);
  } catch (e) {}

  notify();
}

// Load saved passes from local storage on app start
SafeStorage.getItem(getStorageKey(activeUserEmail))
  .then((stored) => {
    if (stored !== null && stored !== undefined) {
      try {
        memoryStore = JSON.parse(stored) || {};
        notify();
      } catch (e) {
        memoryStore = {};
      }
    } else {
      memoryStore = { ...DEMO_RECORDS };
      persistCurrentStore();
    }
  })
  .catch(() => {});

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
   */
  async switchUser(email: string, isDemo = false) {
    activeUserEmail = email.trim().toLowerCase();

    const key = getStorageKey(activeUserEmail);
    let loaded: Record<string, UnlockRecord> | null = null;

    try {
      const stored = await SafeStorage.getItem(key);
      if (stored !== null && stored !== undefined) {
        loaded = JSON.parse(stored);
      }
    } catch (e) {}

    if (loaded !== null) {
      memoryStore = loaded;
    } else {
      memoryStore = isDemo || activeUserEmail === 'demo@taptale.com' ? { ...DEMO_RECORDS } : {};
      persistCurrentStore();
    }
    notify();
  },

  /**
   * Pull-to-refresh: re-read the current user's passes from storage and
   * notify, so every screen recomputes unlocked state and days left.
   */
  async reload() {
    try {
      const stored = await SafeStorage.getItem(getStorageKey(activeUserEmail));
      if (stored !== null && stored !== undefined) {
        memoryStore = JSON.parse(stored) || {};
      }
    } catch (e) {
      if (__DEV__) console.warn('Could not reload passes', e);
    }
    notify();
  },

  /**
   * Reset passes: Keeps ONLY Cathedral Square unlocked, and locks all other 6 places.
   * Gives a clean testing state for physical NFC plaques while keeping one sample pass active.
   */
  async resetEverything() {
    memoryStore = {
      [CATHEDRAL_SQUARE_ID]: {
        spotId: CATHEDRAL_SQUARE_ID,
        unlockedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() + 28 * 24 * 60 * 60 * 1000,
      },
    };
    await persistCurrentStore();
    notify();
  },

  /**
   * Reset/clear passes for the current user
   */
  async clearForFreshStart() {
    await this.resetEverything();
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
    notify();
    return newRecord;
  },

  /** True when a plaque key matches the spot's key (case/whitespace-insensitive). */
  keyMatches(providedKey: string, expectedKey: string): boolean {
    if (!providedKey || !expectedKey) return false;
    return providedKey.trim().toUpperCase() === expectedKey.trim().toUpperCase();
  },

  /**
   * Validate secret password/key from physical NFC tag and unlock if valid.
   * An active pass is left as-is (not extended) so the user sees its real days left.
   */
  validateAndUnlock(
    spotId: string,
    providedKey: string,
    expectedKey: string
  ): { success: boolean; alreadyUnlocked?: boolean; message: string } {
    if (!providedKey || !expectedKey) {
      return { success: false, message: 'Missing NFC security key.' };
    }
    if (this.keyMatches(providedKey, expectedKey)) {
      if (this.isUnlocked(spotId)) {
        return { success: true, alreadyUnlocked: true, message: 'Already unlocked.' };
      }
      this.unlockSpot(spotId);
      return { success: true, alreadyUnlocked: false, message: 'Verified! 30-Day pass activated.' };
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
