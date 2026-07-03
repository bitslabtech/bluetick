import { createContext, useContext, useEffect, useState } from 'react';
import { getPublicSettings } from '../utils/publicSettings';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Initialize from localStorage immediately to avoid flash
    const [theme, setTheme] = useState(localStorage.getItem('theme') || null);

    // On mount, if no user preference is in localStorage, fetch the server default.
    // SKIP on /store/* — the store page applies its own color scheme via store.themeId.
    // Fetching platform theme setting is irrelevant and wastes a network request.
    useEffect(() => {
        if (!localStorage.getItem('theme')) {
            if (window.location.pathname.startsWith('/store/')) {
                setTheme('light'); // Store pages always use light as base; store.themeId overrides
                return;
            }
            getPublicSettings()
                .then(data => {
                    const serverTheme = data?.theme || 'system';
                    setTheme(serverTheme);
                })
                .catch(() => {
                    setTheme('system');
                });
        }
    }, []);

    useEffect(() => {
        if (!theme) return; // Wait until theme is resolved

        const root = window.document.documentElement;

        const removeOldTheme = () => {
            root.classList.remove('dark', 'light');
        };

        const applyTheme = (themeValue) => {
            removeOldTheme();
            if (themeValue === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(themeValue);
            }
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);

        // Listener for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = (e) => {
            if (theme === 'system') {
                removeOldTheme();
                root.classList.add(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);

    }, [theme]);

    // When admin changes Default Appearance in settings, clear localStorage
    // so next reload picks up the new server default
    const resetToServerDefault = () => {
        localStorage.removeItem('theme');
        setTheme(null);
        getPublicSettings()
            .then(data => setTheme(data?.theme || 'system'))
            .catch(() => setTheme('system'));
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resetToServerDefault }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
