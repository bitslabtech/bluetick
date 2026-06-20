/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
                'background-light': '#f6f7f8',
                'background-dark': '#111a22',
                'surface-dark': '#233648',
                'text-secondary': '#92adc9',
            },
            screens: {
                'xl': '1400px',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
            },
            animation: {
                'blob': 'blob 7s infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'drift': 'drift 8s ease-in-out infinite',
                'fly-right': 'fly-right 8s linear infinite',
                'fly-right-slow': 'fly-right 12s linear infinite',
                'fly-right-fast': 'fly-right 6s linear infinite',
                'shooting-star': 'shooting-star 3s ease-in-out infinite',
            },
            keyframes: {
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                drift: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(-5px)' },
                },
                'fly-right': {
                    '0%': { transform: 'translateX(-80px)' },
                    '100%': { transform: 'translateX(60px)' },
                },
                'shooting-star': {
                    '0%': { transform: 'translateX(0) translateY(0) rotate(45deg) scale(0)', opacity: '0' },
                    '10%': { opacity: '1', transform: 'translateX(5px) translateY(4px) rotate(45deg) scale(1)' },
                    '50%': { transform: 'translateX(40px) translateY(35px) rotate(45deg) scale(0.5)', opacity: '0' },
                    '100%': { opacity: '0' },
                }
            }
        },
    },
    plugins: [],
}
