'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Import locale files
import en from './en.json';

type Locale = 'en' | string;
type LocaleData = typeof en;

const locales: Record<Locale, LocaleData> = {
  en,
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLocales: { code: Locale; name: string }[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const availableLocales: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  // Add more locales here as they are added
  // { code: 'es', name: 'Español' },
  // { code: 'fr', name: 'Français' },
];

interface LocaleProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ 
  children, 
  defaultLocale = 'en' 
}) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && locales[savedLocale]) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (locales[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = locales[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found in current locale
        value = en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            // Return the key itself if not found in fallback
            return key;
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters in the string
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t, locale, setLocale, availableLocales } = useLocale();
  return { t, locale, setLocale, availableLocales };
};

export default LocaleContext;
