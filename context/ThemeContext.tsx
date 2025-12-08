import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useLayoutEffect, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// 1. Constants & Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  storageKey?: string;
  defaultTheme?: Theme;
  attribute?: string;
  enableSystem?: boolean;
  nonce?: string;
}

// Aligned with Navbar.tsx usage ("theme") to ensure project consistency
const DEFAULT_STORAGE_KEY = 'theme'; 
const DEFAULT_THEME: Theme = 'system';
const MEDIA = '(prefers-color-scheme: dark)';

// ---------------------------------------------------------------------------
// 2. Security & Utility Layer
// ---------------------------------------------------------------------------

/**
 * Safely accesses localStorage avoiding SecurityError in sandboxed iframes.
 */
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.warn('[ThemeProvider] LocalStorage access denied:', e);
    return null;
  }
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[ThemeProvider] LocalStorage write failed:', e);
  }
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
};

/**
 * Disables CSS transitions strictly during theme toggle to prevent ugly flashing.
 */
const disableAnimation = () => {
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      `* {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  return () => {
    // Force reflow
    (() => window.getComputedStyle(document.body))();
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.head.removeChild(css);
      });
    });
  };
};

// ---------------------------------------------------------------------------
// 3. Context Definition
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ---------------------------------------------------------------------------
// 4. Critical: Optimized & Secure Blocking Script
// ---------------------------------------------------------------------------

export const ThemeScript = React.memo(
  ({
    storageKey = DEFAULT_STORAGE_KEY,
    attribute = 'class',
    defaultTheme = DEFAULT_THEME,
    nonce,
  }: { storageKey?: string; attribute?: string; defaultTheme?: Theme; nonce?: string }) => {
    // Script to run before React hydration to prevent FOUC (Flash of Unstyled Content)
    const scriptArgs = [attribute, storageKey, defaultTheme];
    
    const scriptCode = `(function(a,s,d){try{var e=document.documentElement,m=window.matchMedia,l=window.localStorage,v=l.getItem(s),x=v||d,c=x==='system'?m('${MEDIA}').matches:x==='dark';if(a==='class'){e.classList[c?'add':'remove']('dark')}else{e.setAttribute(a,c?'dark':'light')}e.style.colorScheme=c?'dark':'light'}catch(z){}})(...${JSON.stringify(scriptArgs)})`;

    return (
      <script
        id="tourloop-theme-script"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: scriptCode }}
      />
    );
  }
);

ThemeScript.displayName = 'ThemeScript';

// ---------------------------------------------------------------------------
// 5. Provider Component
// ---------------------------------------------------------------------------

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTheme = DEFAULT_THEME,
  attribute = 'class',
  enableSystem = true,
}) => {
  // Initialize state
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStorageItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored as Theme;
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'system') return getSystemTheme();
    return theme as ResolvedTheme;
  });

  const [mounted, setMounted] = useState(false);

  // DOM Update Logic
  const applyTheme = useCallback((targetTheme: ResolvedTheme) => {
    const root = document.documentElement;
    
    if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(targetTheme);
    } else {
      root.setAttribute(attribute, targetTheme);
    }
    
    root.style.colorScheme = targetTheme;
  }, [attribute]);

  // 1. Mount Handler
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Theme Change Handler
  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;

    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(effectiveTheme as ResolvedTheme);

    // Optimize visual transition
    const enableAnimation = disableAnimation();
    applyTheme(effectiveTheme as ResolvedTheme);
    setStorageItem(storageKey, theme);
    enableAnimation();

  }, [theme, mounted, applyTheme, storageKey]);

  // 3. System Preference Listener
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia(MEDIA);
    const handleSystemChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme, enableSystem, applyTheme]);

  // 4. Storage Sync Listener (Cross-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const newValue = e.newValue;
        if (newValue === 'light' || newValue === 'dark' || newValue === 'system') {
          setThemeState(newValue as Theme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  // Public API
  const setTheme = useCallback((newTheme: Theme) => {
    // Validation
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.warn(`[ThemeProvider] Invalid theme: ${newTheme}`);
      return;
    }
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'system') return getSystemTheme() === 'dark' ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }), [theme, resolvedTheme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {/* Inject script to handle initial load before React hydrates */}
      <ThemeScript storageKey={storageKey} defaultTheme={defaultTheme} attribute={attribute} />
      {children}
    </ThemeContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// 6. Hook
// ---------------------------------------------------------------------------

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};