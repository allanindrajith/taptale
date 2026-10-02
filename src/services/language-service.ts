import { AppLanguage } from '@/constants/spots';
import { SafeStorage } from './safe-storage';

const STORAGE_KEY = 'taptale_user_language';

type LanguageListener = (lang: AppLanguage) => void;

class LanguageServiceClass {
  private currentLanguage: AppLanguage = 'en';
  private listeners: Set<LanguageListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    try {
      const saved = await SafeStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'lt') {
        this.currentLanguage = saved;
        this.notifyListeners();
      }
    } catch {
      // ignore
    } finally {
      this.isInitialized = true;
    }
  }

  getLanguage(): AppLanguage {
    return this.currentLanguage;
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    this.notifyListeners();
    try {
      await SafeStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }

  subscribe(listener: LanguageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentLanguage);
      } catch {
        // ignore subscriber errors
      }
    }
  }
}

export const LanguageService = new LanguageServiceClass();
