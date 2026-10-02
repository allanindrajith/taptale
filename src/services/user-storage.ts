import { Spot, SPOTS } from '@/constants/spots';
import { UnlockRecord, UnlockService } from './unlock-storage';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthProvider = 'apple' | 'google' | 'email' | 'guest';

export interface UserAvatar {
  id: string;
  emoji: string;
  label: string;
  bgHex: string;
}

export const AVATAR_PRESETS: UserAvatar[] = [
  { id: 'compass', emoji: '🧭', label: 'Explorer', bgHex: '#e8f2ea' },
  { id: 'knight', emoji: '🏰', label: 'Castle Master', bgHex: '#f6eedb' },
  { id: 'fox', emoji: '🦊', label: 'Baltic Fox', bgHex: '#fcebe6' },
  { id: 'eagle', emoji: '🦅', label: 'Falcon', bgHex: '#e8f0fe' },
  { id: 'camera', emoji: '📸', label: 'Photographer', bgHex: '#edf2f7' },
  { id: 'crown', emoji: '👑', label: 'Grand Duke', bgHex: '#fef3c7' },
  { id: 'palette', emoji: '🎨', label: 'Bohemian', bgHex: '#f3e8ff' },
  { id: 'backpack', emoji: '🎒', label: 'Wanderer', bgHex: '#e2f5ea' },
];

export interface UserProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  provider: AuthProvider;
  isConnected: boolean;
  avatarId: string;
  avatarUri?: string;
  birthDate?: string;
  password?: string;
  joinedAt: number;
  lastSyncedAt: number;
  cloudSyncEnabled: boolean;
}

export interface AchievementBadge {
  id: string;
  icon: string;
  titleEn: string;
  titleLt: string;
  descEn: string;
  descLt: string;
  category: 'milestone' | 'discovery' | 'mastery';
  totalRequired: number;
  currentCount: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

export interface TimelineEntry {
  spot: Spot;
  record: UnlockRecord;
  visitedDateFormatted: string;
  daysRemaining: number;
  isPassActive: boolean;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_guest',
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  provider: 'guest',
  isConnected: false,
  avatarId: 'compass',
  birthDate: '',
  joinedAt: Date.now(),
  lastSyncedAt: Date.now(),
  cloudSyncEnabled: true,
};

let currentProfile: UserProfile = { ...DEFAULT_USER };
const listeners: Array<() => void> = [];

// Load from AsyncStorage (Native) or localStorage (Web)
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const saved = window.localStorage.getItem('taptale_user_profile');
    if (saved) {
      currentProfile = { ...DEFAULT_USER, ...JSON.parse(saved) };
    }
  } catch (e) {
    // Ignore
  }
}

AsyncStorage.getItem('@taptale_user_profile')
  .then((saved) => {
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed.email === 'traveler.google@gmail.com' ||
          parsed.email === 'traveler.apple@icloud.com'
        ) {
          currentProfile = { ...DEFAULT_USER };
          AsyncStorage.removeItem('@taptale_user_profile');
        } else {
          currentProfile = { ...DEFAULT_USER, ...parsed };
        }
        notify();
      } catch (err) {}
    }
  })
  .catch(() => {});

function persistProfile() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('taptale_user_profile', JSON.stringify(currentProfile));
    } catch (e) {
      // Ignore
    }
  }
  AsyncStorage.setItem('@taptale_user_profile', JSON.stringify(currentProfile)).catch(() => {});
  notify();
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // Ignore
    }
  });
}

export const DEMO_ACCOUNT = {
  email: 'demo@taptale.com',
  password: 'demo1234',
  name: 'Allan Indrajith (Demo)',
  firstName: 'Allan',
  lastName: 'Indrajith',
  birthDate: '1998-05-14',
  avatarId: 'compass',
};

export const UserService = {
  /**
   * Get the current user profile
   */
  getProfile(): UserProfile {
    return { ...currentProfile };
  },

  /**
   * Subscribe to user profile updates
   */
  subscribe(callback: () => void): () => void {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /**
   * Register a new real user with a completely FRESH start (0 passes, fresh timeline)
   */
  registerUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    birthDate: string;
    avatarUri?: string;
    avatarId?: string;
  }) {
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    currentProfile = {
      ...currentProfile,
      id: `usr_${Date.now()}`,
      name: fullName,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim(),
      password: data.password,
      birthDate: data.birthDate,
      avatarUri: data.avatarUri,
      avatarId: data.avatarId || 'compass',
      provider: 'email',
      isConnected: true,
      joinedAt: Date.now(),
      lastSyncedAt: Date.now(),
      cloudSyncEnabled: true,
    };
    // Fresh start for real user
    UnlockService.switchUser(data.email.trim(), false);
    UnlockService.clearForFreshStart();
    persistProfile();
  },

  /**
   * Log in with Email and Password.
   * If Demo credentials (demo@taptale.com / demo1234): loads rich demo passes & badges!
   * If Real account: loads personal passes or starts fresh.
   */
  loginWithEmail(email: string, password?: string) {
    const isDemo = email.trim().toLowerCase() === DEMO_ACCOUNT.email.toLowerCase();

    if (isDemo) {
      currentProfile = {
        ...currentProfile,
        id: 'usr_demo_vip',
        name: DEMO_ACCOUNT.name,
        firstName: DEMO_ACCOUNT.firstName,
        lastName: DEMO_ACCOUNT.lastName,
        email: DEMO_ACCOUNT.email,
        birthDate: DEMO_ACCOUNT.birthDate,
        avatarId: DEMO_ACCOUNT.avatarId,
        avatarUri: undefined,
        provider: 'email',
        isConnected: true,
        lastSyncedAt: Date.now(),
        cloudSyncEnabled: true,
      };
      UnlockService.switchUser(DEMO_ACCOUNT.email, true);
      persistProfile();
      return;
    }

    const isSameEmail = currentProfile.email.toLowerCase() === email.trim().toLowerCase();
    const resolvedName = isSameEmail && currentProfile.name
      ? currentProfile.name
      : email.split('@')[0];

    currentProfile = {
      ...currentProfile,
      id: `usr_${Date.now()}`,
      email: email.trim(),
      name: resolvedName,
      provider: 'email',
      isConnected: true,
      lastSyncedAt: Date.now(),
      cloudSyncEnabled: true,
    };
    UnlockService.switchUser(email.trim(), false);
    persistProfile();
  },

  /**
   * One-tap login as the rich Demo account
   */
  loginAsDemo() {
    this.loginWithEmail(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
  },

  /**
   * Connect with real Apple ID (Fresh start for personal Apple account)
   */
  connectApple(appleName: string, appleEmail: string, appleUserId?: string) {
    const trimmedName = appleName.trim() || 'Apple User';
    const trimmedEmail = appleEmail.trim().toLowerCase();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || 'Apple';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    currentProfile = {
      ...currentProfile,
      id: appleUserId ? `usr_apple_${appleUserId}` : `usr_apple_${Date.now()}`,
      isConnected: true,
      provider: 'apple',
      name: trimmedName,
      firstName,
      lastName,
      email: trimmedEmail,
      avatarUri: undefined,
      avatarId: 'compass',
      lastSyncedAt: Date.now(),
      cloudSyncEnabled: true,
    };
    UnlockService.switchUser(trimmedEmail, false);
    UnlockService.clearForFreshStart();
    persistProfile();
  },

  /**
   * Connect with real Google Account (Fresh start for personal Google account)
   */
  connectGoogle(googleName: string, googleEmail: string, avatarUri?: string, googleId?: string) {
    const trimmedName = googleName.trim() || 'Google User';
    const trimmedEmail = googleEmail.trim().toLowerCase();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || 'Google';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    currentProfile = {
      ...currentProfile,
      id: googleId ? `usr_google_${googleId}` : `usr_google_${Date.now()}`,
      isConnected: true,
      provider: 'google',
      name: trimmedName,
      firstName,
      lastName,
      email: trimmedEmail,
      avatarUri: avatarUri || undefined,
      avatarId: 'fox',
      lastSyncedAt: Date.now(),
      cloudSyncEnabled: true,
    };
    UnlockService.switchUser(trimmedEmail, false);
    UnlockService.clearForFreshStart();
    persistProfile();
  },

  /**
   * Connect with custom email
   */
  connectEmail(email: string, name?: string) {
    this.loginWithEmail(email);
  },

  /**
   * Disconnect / Log out — locks into Auth screen
   */
  logOut() {
    currentProfile = {
      ...currentProfile,
      isConnected: false,
      provider: 'guest',
      cloudSyncEnabled: false,
    };
    persistProfile();
  },

  /**
   * Update chosen avatar
   */
  updateAvatar(avatarId: string) {
    currentProfile = {
      ...currentProfile,
      avatarId,
    };
    persistProfile();
  },

  /**
   * Toggle cloud backup sync
   */
  toggleCloudSync() {
    currentProfile = {
      ...currentProfile,
      cloudSyncEnabled: !currentProfile.cloudSyncEnabled,
      lastSyncedAt: Date.now(),
    };
    persistProfile();
  },

  /**
   * Calculate all achievement badges dynamically based on unlocked spots
   */
  getAchievements(): {
    badges: AchievementBadge[];
    unlockedCount: number;
    totalPlaces: number;
    visitedPlacesCount: number;
    completionPercent: number;
  } {
    const allRecords = UnlockService.getAllRecords();
    const unlockedSpotIds = Object.keys(allRecords);
    const visitedPlacesCount = unlockedSpotIds.length;
    const totalPlaces = SPOTS.length;
    const completionPercent = Math.round((visitedPlacesCount / totalPlaces) * 100);

    const hasGediminas = unlockedSpotIds.includes('vln-gediminas-tower');
    const hasCathedral = unlockedSpotIds.includes('vln-cathedral-square');
    const hasGate = unlockedSpotIds.includes('vln-gate-of-dawn');
    const hasUniversity = unlockedSpotIds.includes('vln-university');
    const hasUzupis = unlockedSpotIds.includes('vln-uzupis');
    const hasTrakai = unlockedSpotIds.includes('trk-island-castle');
    const hasHill = unlockedSpotIds.includes('sia-hill-of-crosses');

    const badges: AchievementBadge[] = [
      {
        id: 'badge-first-tap',
        icon: '⚡',
        titleEn: 'First Tap Pioneer',
        titleLt: 'Pirmasis Prisilietimas',
        descEn: 'Unlock your first historical site via physical NFC plaque or passkey.',
        descLt: 'Atrakinkite pirmąją istorinę vietą NFC žyma arba slaptažodžiu.',
        category: 'milestone',
        totalRequired: 1,
        currentCount: Math.min(1, visitedPlacesCount),
        isUnlocked: visitedPlacesCount >= 1,
        unlockedAt: allRecords['vln-gediminas-tower']?.unlockedAt,
      },
      {
        id: 'badge-castle-master',
        icon: '🏰',
        titleEn: 'Grand Castle Master',
        titleLt: 'Didysis Pilių Valdovas',
        descEn: 'Conquer both Gediminas Castle Tower and Trakai Island Fortress.',
        descLt: 'Aplankykite Gedimino pilies bokštą ir Trakų salos pilį.',
        category: 'mastery',
        totalRequired: 2,
        currentCount: (hasGediminas ? 1 : 0) + (hasTrakai ? 1 : 0),
        isUnlocked: hasGediminas && hasTrakai,
      },
      {
        id: 'badge-sacred-pilgrim',
        icon: '⛪',
        titleEn: 'Sacred Pilgrim',
        titleLt: 'Šventasis Piligrimas',
        descEn: 'Visit Vilnius Cathedral, Gate of Dawn, and the Hill of Crosses.',
        descLt: 'Aplankykite Vilniaus Katedrą, Aušros Vartus ir Kryžių Kalną.',
        category: 'discovery',
        totalRequired: 3,
        currentCount: (hasCathedral ? 1 : 0) + (hasGate ? 1 : 0) + (hasHill ? 1 : 0),
        isUnlocked: hasCathedral && hasGate && hasHill,
      },
      {
        id: 'badge-bohemian-citizen',
        icon: '🎨',
        titleEn: 'Bohemian Citizen',
        titleLt: 'Užupio Respublikos Pilietis',
        descEn: 'Unlock the constitution and free spirit of the Republic of Užupis.',
        descLt: 'Atrakinkite Užupio Respublikos konstituciją ir laisvą dvasią.',
        category: 'discovery',
        totalRequired: 1,
        currentCount: hasUzupis ? 1 : 0,
        isUnlocked: hasUzupis,
      },
      {
        id: 'badge-vilnius-scholar',
        icon: '🎓',
        titleEn: 'Vilnius Scholar',
        titleLt: 'Vilniaus Mokslininkas',
        descEn: 'Step into the 1579 Renaissance cloisters of Vilnius University.',
        descLt: 'Įženkite į 1579 m. Vilniaus universiteto renesanso kiemus.',
        category: 'discovery',
        totalRequired: 1,
        currentCount: hasUniversity ? 1 : 0,
        isUnlocked: hasUniversity,
      },
      {
        id: 'badge-pass-guardian',
        icon: '🛡️',
        titleEn: 'Heritage Guardian',
        titleLt: 'Paveldo Globėjas',
        descEn: 'Hold 3 or more active 30-day NFC access passes concurrently.',
        descLt: 'Išlaikykite 3 ar daugiau aktyvių 30 dienų NFC leidimų vienu metu.',
        category: 'milestone',
        totalRequired: 3,
        currentCount: Math.min(3, visitedPlacesCount),
        isUnlocked: visitedPlacesCount >= 3,
      },
      {
        id: 'badge-grand-explorer',
        icon: '🌟',
        titleEn: 'Grand Explorer of Lithuania',
        titleLt: 'Didysis Lietuvos Tyrinėtojas',
        descEn: 'Visit all 7 national heritage wonders and collect their complete lore.',
        descLt: 'Aplankykite visas 7 nacionalines paveldo vietas visoje Lietuvoje.',
        category: 'mastery',
        totalRequired: totalPlaces,
        currentCount: visitedPlacesCount,
        isUnlocked: visitedPlacesCount === totalPlaces,
      },
    ];

    const unlockedCount = badges.filter((b) => b.isUnlocked).length;

    return {
      badges,
      unlockedCount,
      totalPlaces,
      visitedPlacesCount,
      completionPercent,
    };
  },

  /**
   * Get visit history timeline sorted in reverse chronological order
   */
  getVisitTimeline(): TimelineEntry[] {
    const allRecords = UnlockService.getAllRecords();
    const entries: TimelineEntry[] = [];

    for (const [spotId, record] of Object.entries(allRecords)) {
      const spot = SPOTS.find((s) => s.id === spotId);
      if (spot) {
        const days = UnlockService.getDaysRemaining(spotId);
        const dateObj = new Date(record.unlockedAt);
        const formatted = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        entries.push({
          spot,
          record,
          visitedDateFormatted: formatted,
          daysRemaining: days,
          isPassActive: days > 0,
        });
      }
    }

    // Sort newest visit first
    return entries.sort((a, b) => b.record.unlockedAt - a.record.unlockedAt);
  },
};
