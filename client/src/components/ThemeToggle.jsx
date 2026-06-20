import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || document.documentElement.classList.contains('dark');

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className={`
                relative w-16 h-8 rounded-full p-1 transition-colors duration-500 ease-in-out overflow-hidden shadow-inner
                ${isDark ? 'bg-indigo-950' : 'bg-sky-400'}
            `}
        >
            {/* Background Elements */}
            <div className="absolute inset-0 transition-opacity duration-500">
                {/* Stars (Dark Mode) */}
                <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${isDark ? 'opacity-100' : ''}`}>
                    <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                    <div className="absolute bottom-2 left-6 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-75"></div>
                    <div className="absolute top-1 right-4 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-150"></div>
                    <div className="absolute bottom-3 right-8 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-200"></div>
                    {/* Shooting Star 1 */}
                    <div className="absolute top-1 left-1 w-6 h-0.5 bg-gradient-to-r from-transparent to-white rounded-full animate-shooting-star origin-top-left"></div>
                    {/* Shooting Star 2 */}
                    <div className="absolute top-0 left-2 w-4 h-0.5 bg-gradient-to-r from-transparent to-white rounded-full animate-shooting-star origin-top-left delay-1500 text-opacity-80"></div>
                </div>

                {/* Clouds (Light Mode) */}
                {/* Clouds (Light Mode) */}
                <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${!isDark ? 'opacity-100' : ''}`}>
                    <div className="absolute top-1 right-2 w-7 h-4 bg-white/90 rounded-full blur-[1px] animate-fly-right"></div>
                    <div className="absolute bottom-1 right-5 w-6 h-3 bg-white/70 rounded-full blur-[1px] animate-fly-right-slow delay-200"></div>
                    <div className="absolute top-2.5 right-8 w-4 h-4 bg-white/80 rounded-full blur-[1.5px] animate-fly-right-fast delay-500"></div>
                </div>
            </div>

            {/* Toggle Handle (Sun/Moon) */}
            <div
                className={`
                    absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-all duration-500 ease-in-out z-10
                    ${isDark ? 'translate-x-8 bg-slate-200' : 'translate-x-0 bg-yellow-300'}
                `}
            >
                {/* Moon Craters */}
                <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${isDark ? 'opacity-100 delay-200' : ''}`}>
                    <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-slate-300 rounded-full shadow-inner"></div>
                    <div className="absolute bottom-1.5 right-1.5 w-1 h-1 bg-slate-300 rounded-full shadow-inner"></div>
                    <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-slate-300 rounded-full shadow-inner"></div>
                </div>
            </div>
        </button>
    );
};

export default ThemeToggle;
