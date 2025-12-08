import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  type ReactNode 
} from 'react';
import { translations, type Language, type TranslationKeys, type TextDirection } from '../translations';

// --- 1. TYPES & DEFINITIONS ---

export type { Language, TextDirection };

// Define a hybrid type for 't' that acts as both a function and a dictionary object
// This supports legacy usage like t.nav_home and new usage like t('nav.home')
export type TranslatorFunction = {
  (key: string, params?: Record<string, string | number>): string;
} & TranslationKeys;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslatorFunction;
  dir: TextDirection;
  isLoaded: boolean;
}

// --- 2. SECURITY & UTILITIES ---

const LANGUAGE_STORAGE_KEY = 'tourloop_lang';
const DEFAULT_LANGUAGE: Language = 'ar';

/**
 * Security: HTML Entity Encoding to prevent XSS via variable interpolation.
 */
const escapeHtml = (unsafe: string | number): string => {
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Utility: Normalizes keys from 'dot.notation' or 'camelCase' to 'snake_case'
 * to match the keys in translations.ts.
 * Example: 'about.workEdu' -> 'about_work_edu'
 */
const normalizeKey = (key: string): keyof TranslationKeys => {
  // 1. Replace dots with underscores
  let normalized = key.replace(/\./g, '_');
  
  // 2. Convert camelCase to snake_case (e.g. workEdu -> work_edu)
  normalized = normalized.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  return normalized as keyof TranslationKeys;
};

// --- 3. CONTEXT ---

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// --- 4. PROVIDER ---

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize lazily to avoid hydration mismatch, default to 'ar'
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      // Whitelist validation against available translations
      if (saved && translations[saved]) {
        return saved;
      }
    }
    return DEFAULT_LANGUAGE;
  });
  
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Security: Secure Cookie Attribute Logic
  const setSecureCookie = useCallback((lang: Language) => {
    if (typeof document === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    const cookieString = `${LANGUAGE_STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    document.cookie = cookieString;
  }, []);

  // Mount Effect
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // DOM Updates & Persistence
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const currentTranslations = translations[language];
    
    // Efficient DOM updates
    document.documentElement.lang = language;
    document.documentElement.dir = currentTranslations.dir;
    document.body.dir = currentTranslations.dir;
    document.body.dataset.lang = language;
    
    // Class handling for CSS direction utilities
    const classes = document.body.classList;
    classes.remove('rtl', 'ltr');
    classes.add(currentTranslations.dir);

    // Persistence
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      setSecureCookie(language);
    } catch (e) {
      console.warn('[Security] LocalStorage access denied or quota exceeded');
    }
  }, [language, setSecureCookie]);

  // Public API: Change Language
  const setLanguage = useCallback((lang: Language) => {
    if (!translations[lang]) {
      console.error(`[Security] Invalid language attempt: ${lang}`);
      return;
    }
    setLanguageState(lang);
  }, []);

  /**
   * The Translator Function 't'
   * It is implemented as a function that can also be accessed as an object.
   * This supports legacy components using `t.key` and modern ones using `t('key')`.
   */
  const t = useMemo(() => {
    const currentDict = translations[language];
    const defaultDict = translations[DEFAULT_LANGUAGE];

    // The core translation function
    const translateFn = (key: string, params?: Record<string, string | number>): string => {
      const normalizedKey = normalizeKey(key);
      
      // O(1) Lookup with Fallback
      let text = (currentDict as any)[normalizedKey] || (defaultDict as any)[normalizedKey];

      if (!text) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[i18n] Missing key: "${key}" (normalized: "${normalizedKey}")`);
        }
        return key;
      }

      // Secure Interpolation
      if (params) {
        return text.replace(/{{(\w+)}}/g, (_: string, paramKey: string) => {
          const value = params[paramKey];
          if (value === undefined || value === null) return '';
          return escapeHtml(value);
        });
      }

      return text;
    };

    // Proxy to allow property access (t.nav_home) dynamically
    // This ensures that `t.some_key` always returns the string from the current language
    return new Proxy(translateFn, {
      get: (target, prop: string | symbol) => {
        // Convert symbols to strings for processing
        const propKey = typeof prop === 'symbol' ? String(prop) : prop;
        
        // If property exists on function (like apply, call, bind), return it
        if (prop in target) {
          return (target as any)[prop];
        }
        
        // Otherwise, treat prop as a translation key
        if (typeof propKey === 'string') {
          const val = (currentDict as any)[propKey] || (defaultDict as any)[propKey];
          return val || propKey;
        }
        
        return Reflect.get(target, prop);
      }
    }) as TranslatorFunction;

  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    dir: translations[language].dir,
    isLoaded
  }), [language, setLanguage, t, isLoaded]);

  // Prevent hydration mismatch by rendering null until mounted if necessary,
  // but returning children immediately is usually preferred for SEO unless auth-gated.
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// --- 6. HOOK ---

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};