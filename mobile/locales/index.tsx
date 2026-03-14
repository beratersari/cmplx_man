import { useCallback, useState, useContext, createContext, ReactNode } from 'react';
import en from './en.json';

type TranslationKey = string;
type TranslationValue = string | Record<string, any>;

interface LocaleContextType {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  locale: string;
  setLocale: (locale: string) => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const translations: Record<string, typeof en> = {
  en,
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState('en');

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: TranslationValue = translations[locale];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, TranslationValue>)[k];
        } else {
          // Fallback to English
          value = translations['en'];
          for (const fk of keys) {
            if (value && typeof value === 'object' && fk in value) {
              value = (value as Record<string, TranslationValue>)[fk];
            } else {
              return key; // Return key if translation not found
            }
          }
          break;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      // Replace parameters
      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) => str.replace(`{{${paramKey}}}`, String(paramValue)),
          value
        );
      }

      return value;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
};

export default { LocaleProvider, useTranslation };
