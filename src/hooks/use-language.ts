import { useState, useEffect } from 'react';
import { AppLanguage } from '@/constants/spots';
import { LanguageService } from '@/services/language-service';

export function useLanguage() {
  const [language, setLangState] = useState<AppLanguage>(LanguageService.getLanguage());

  useEffect(() => {
    setLangState(LanguageService.getLanguage());
    return LanguageService.subscribe((newLang) => {
      setLangState(newLang);
    });
  }, []);

  const setLanguage = (newLang: AppLanguage) => {
    LanguageService.setLanguage(newLang);
  };

  return { language, setLanguage };
}
