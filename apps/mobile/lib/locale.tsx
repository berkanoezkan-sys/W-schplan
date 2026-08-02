import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_LOCALES,
  getLocale,
  localeLabel,
  setLocale as applyLocale,
  t,
  type Locale,
} from '@/lib/i18n';

const LOCALE_KEY = 'woeschplan_locale';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  hydrated: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isAppLocale(value: string | null): value is (typeof APP_LOCALES)[number] {
  return value === 'de' || value === 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LOCALE_KEY)
      .then((stored) => {
        if (!active || !isAppLocale(stored)) return;
        applyLocale(stored);
        setLocaleState(stored);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    if (!isAppLocale(next)) return;
    applyLocale(next);
    setLocaleState(next);
    await AsyncStorage.setItem(LOCALE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, hydrated }),
    [locale, setLocale, hydrated],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

/** Subscribe to locale changes and re-render when translations update. */
export function useTranslation() {
  const { locale } = useLocale();
  return { t, locale };
}

export { APP_LOCALES, localeLabel };
