// ============================================================
// Profession-Based VCard Theme Configurations
// ============================================================

// Returns inline SVG as a data URI for use as background-image
export const THEME_BACKGROUNDS = {

    'corporate-executive': (primaryColor = '#1e3a5f') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0f172a"/>
                    <stop offset="100%" style="stop-color:#1e3a5f"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#g1)"/>
            <!-- Decorative briefcase icon -->
            <g opacity="0.07" transform="translate(400,60) scale(2.5)">
                <rect x="4" y="7" width="42" height="32" rx="4" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
                <path d="M16 7V5a2 2 0 012-2h8a2 2 0 012 2v2" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
                <line x1="4" y1="19" x2="46" y2="19" stroke="${primaryColor}" stroke-width="2.5"/>
            </g>
            <!-- Scale of justice icon -->
            <g opacity="0.06" transform="translate(30,120) scale(3)">
                <line x1="25" y1="4" x2="25" y2="46" stroke="${primaryColor}" stroke-width="2"/>
                <line x1="5" y1="12" x2="45" y2="12" stroke="${primaryColor}" stroke-width="2"/>
                <path d="M5 12 L2 22 Q5 26 8 22 Z" fill="${primaryColor}"/>
                <path d="M45 12 L42 22 Q45 26 48 22 Z" fill="${primaryColor}"/>
                <rect x="17" y="44" width="16" height="3" rx="1" fill="${primaryColor}"/>
            </g>
            <!-- Building/skyscraper -->
            <g opacity="0.05" transform="translate(200,700) scale(2.8)">
                <rect x="10" y="10" width="30" height="60" rx="2" fill="none" stroke="${primaryColor}" stroke-width="2"/>
                <rect x="16" y="18" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="28" y="18" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="16" y="30" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="28" y="30" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="16" y="42" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="28" y="42" width="6" height="6" rx="1" fill="${primaryColor}"/>
                <rect x="18" y="56" width="14" height="14" rx="1" fill="${primaryColor}"/>
            </g>
            <!-- Diagonal gold lines -->
            <line x1="0" y1="900" x2="600" y2="300" stroke="${primaryColor}" stroke-width="0.5" opacity="0.1"/>
            <line x1="0" y1="800" x2="600" y2="200" stroke="${primaryColor}" stroke-width="0.5" opacity="0.07"/>
            <!-- Bottom corner decorative circle -->
            <circle cx="600" cy="900" r="220" fill="none" stroke="${primaryColor}" stroke-width="0.8" opacity="0.08"/>
            <circle cx="0" cy="0" r="150" fill="none" stroke="${primaryColor}" stroke-width="0.8" opacity="0.08"/>
        </svg>
    `,

    'creative-portfolio': (primaryColor = '#8b5cf6') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <radialGradient id="rg1" cx="30%" cy="20%" r="70%">
                    <stop offset="0%" style="stop-color:#4c1d95"/>
                    <stop offset="60%" style="stop-color:#1e1b4b"/>
                    <stop offset="100%" style="stop-color:#0f0a1e"/>
                </radialGradient>
                <radialGradient id="rg2" cx="80%" cy="80%" r="50%">
                    <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.6"/>
                    <stop offset="100%" style="stop-color:#0f0a1e;stop-opacity:0"/>
                </radialGradient>
            </defs>
            <rect width="600" height="900" fill="url(#rg1)"/>
            <rect width="600" height="900" fill="url(#rg2)"/>
            <!-- Paintbrush -->
            <g opacity="0.1" transform="translate(380,40) rotate(35) scale(3)">
                <rect x="14" y="0" width="6" height="28" rx="3" fill="${primaryColor}"/>
                <ellipse cx="17" cy="32" rx="5" ry="8" fill="${primaryColor}"/>
                <ellipse cx="17" cy="38" rx="4" ry="4" fill="#e879f9"/>
            </g>
            <!-- Color palette circles -->
            <circle cx="80" cy="700" r="60" fill="#ec4899" opacity="0.08"/>
            <circle cx="50" cy="760" r="40" fill="#f59e0b" opacity="0.08"/>
            <circle cx="110" cy="750" r="35" fill="${primaryColor}" opacity="0.1"/>
            <!-- Geometric art shapes -->
            <polygon points="500,600 550,680 450,680" fill="none" stroke="#e879f9" stroke-width="1" opacity="0.15"/>
            <polygon points="480,640 530,720 430,720" fill="none" stroke="${primaryColor}" stroke-width="1" opacity="0.1"/>
            <!-- Star sparkles -->
            <g opacity="0.2">
                <circle cx="120" cy="150" r="2" fill="#f0abfc"/>
                <circle cx="480" cy="200" r="3" fill="#c4b5fd"/>
                <circle cx="300" cy="80" r="2" fill="#f0abfc"/>
                <circle cx="550" cy="400" r="2" fill="#c4b5fd"/>
                <circle cx="30" cy="400" r="2" fill="#f0abfc"/>
                <circle cx="430" cy="820" r="3" fill="#c4b5fd"/>
            </g>
            <!-- Camera icon -->
            <g opacity="0.07" transform="translate(50,80) scale(2.5)">
                <rect x="2" y="8" width="46" height="32" rx="5" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
                <circle cx="25" cy="24" r="9" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
                <rect x="16" y="3" width="18" height="8" rx="3" fill="${primaryColor}" opacity="0.5"/>
            </g>
        </svg>
    `,

    'tech-startup': (primaryColor = '#06b6d4') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="tg1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#020617"/>
                    <stop offset="100%" style="stop-color:#0c1a2e"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#tg1)"/>
            <!-- Grid lines (circuit board) -->
            <g opacity="0.06" stroke="${primaryColor}" stroke-width="0.8">
                <line x1="0" y1="150" x2="600" y2="150"/>
                <line x1="0" y1="300" x2="600" y2="300"/>
                <line x1="0" y1="450" x2="600" y2="450"/>
                <line x1="0" y1="600" x2="600" y2="600"/>
                <line x1="0" y1="750" x2="600" y2="750"/>
                <line x1="100" y1="0" x2="100" y2="900"/>
                <line x1="200" y1="0" x2="200" y2="900"/>
                <line x1="300" y1="0" x2="300" y2="900"/>
                <line x1="400" y1="0" x2="400" y2="900"/>
                <line x1="500" y1="0" x2="500" y2="900"/>
            </g>
            <!-- Circuit nodes -->
            <g fill="${primaryColor}" opacity="0.12">
                <circle cx="100" cy="150" r="4"/><circle cx="200" cy="150" r="3"/><circle cx="400" cy="300" r="4"/>
                <circle cx="500" cy="150" r="3"/><circle cx="300" cy="450" r="4"/><circle cx="100" cy="600" r="3"/>
                <circle cx="500" cy="600" r="4"/><circle cx="200" cy="750" r="3"/><circle cx="400" cy="750" r="4"/>
            </g>
            <!-- Code bracket icon -->
            <g opacity="0.1" transform="translate(380,50) scale(3)">
                <path d="M18 2L6 12 18 22" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M32 2L44 12 32 22" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
            </g>
            <!-- CPU/chip icon -->
            <g opacity="0.07" transform="translate(30,680) scale(2.5)">
                <rect x="12" y="12" width="26" height="26" rx="3" fill="none" stroke="${primaryColor}" stroke-width="2"/>
                <rect x="17" y="17" width="16" height="16" rx="2" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="18" y1="12" x2="18" y2="6" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="25" y1="12" x2="25" y2="6" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="32" y1="12" x2="32" y2="6" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="18" y1="38" x2="18" y2="44" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="25" y1="38" x2="25" y2="44" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="32" y1="38" x2="32" y2="44" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="12" y1="18" x2="6" y2="18" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="12" y1="25" x2="6" y2="25" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="38" y1="18" x2="44" y2="18" stroke="${primaryColor}" stroke-width="1.5"/>
                <line x1="38" y1="25" x2="44" y2="25" stroke="${primaryColor}" stroke-width="1.5"/>
            </g>
            <!-- Glowing orbs -->
            <circle cx="0" cy="0" r="180" fill="${primaryColor}" opacity="0.04"/>
            <circle cx="600" cy="900" r="200" fill="#6366f1" opacity="0.05"/>
        </svg>
    `,

    'health-wellness': (primaryColor = '#10b981') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="hg1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f0fdf4"/>
                    <stop offset="100%" style="stop-color:#dcfce7"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#hg1)"/>
            <!-- Soft blob shapes -->
            <ellipse cx="550" cy="100" rx="180" ry="160" fill="${primaryColor}" opacity="0.07" transform="rotate(20,550,100)"/>
            <ellipse cx="50" cy="800" rx="200" ry="150" fill="${primaryColor}" opacity="0.06" transform="rotate(-15,50,800)"/>
            <ellipse cx="300" cy="450" rx="300" ry="100" fill="${primaryColor}" opacity="0.04" transform="rotate(5,300,450)"/>
            <!-- Heart ECG line -->
            <polyline points="0,480 60,480 80,440 100,520 120,430 140,530 160,480 300,480 320,460 340,490 360,480 600,480"
                fill="none" stroke="${primaryColor}" stroke-width="1.5" opacity="0.15"/>
            <!-- Heart icon -->
            <g opacity="0.09" transform="translate(400,60) scale(3)">
                <path d="M25 40 C25 40 5 27 5 15 A10 10 0 0 1 25 12 A10 10 0 0 1 45 15 C45 27 25 40 25 40Z" fill="${primaryColor}"/>
            </g>
            <!-- Plus/cross medical -->
            <g opacity="0.07" transform="translate(30,100) scale(2.8)">
                <rect x="18" y="4" width="14" height="42" rx="5" fill="${primaryColor}"/>
                <rect x="4" y="18" width="42" height="14" rx="5" fill="${primaryColor}"/>
            </g>
            <!-- Leaf icons -->
            <g opacity="0.08" transform="translate(460,750) scale(2.5) rotate(-30)">
                <path d="M25 5 Q45 5 45 25 Q45 45 25 45 Q5 35 25 5Z" fill="${primaryColor}"/>
                <line x1="25" y1="45" x2="25" y2="55" stroke="${primaryColor}" stroke-width="2"/>
            </g>
            <!-- Stethoscope circles -->
            <circle cx="500" cy="800" r="50" fill="none" stroke="${primaryColor}" stroke-width="1.5" opacity="0.12"/>
            <circle cx="500" cy="800" r="35" fill="none" stroke="${primaryColor}" stroke-width="1" opacity="0.08"/>
        </svg>
    `,

    'real-estate-premium': (primaryColor = '#d97706') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="reg1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0f1923"/>
                    <stop offset="100%" style="stop-color:#1a2b1e"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#reg1)"/>
            <!-- Luxury building skyline -->
            <g opacity="0.1" fill="none" stroke="${primaryColor}" stroke-width="1.5">
                <rect x="50" y="620" width="60" height="200"/>
                <rect x="65" y="580" width="30" height="40"/>
                <rect x="130" y="550" width="80" height="280"/>
                <rect x="150" y="510" width="40" height="40"/>
                <rect x="230" y="590" width="50" height="240"/>
                <rect x="300" y="500" width="100" height="330"/>
                <rect x="325" y="460" width="50" height="40"/>
                <rect x="420" y="560" width="70" height="270"/>
                <rect x="500" y="600" width="60" height="240"/>
                <!-- Windows in buildings -->
                <rect x="140" y="570" width="8" height="8"/>
                <rect x="158" y="570" width="8" height="8"/>
                <rect x="140" y="590" width="8" height="8"/>
                <rect x="158" y="590" width="8" height="8"/>
                <rect x="315" y="520" width="10" height="10"/>
                <rect x="335" y="520" width="10" height="10"/>
                <rect x="355" y="520" width="10" height="10"/>
            </g>
            <!-- House/key icon -->
            <g opacity="0.08" transform="translate(380,50) scale(3)">
                <polygon points="25,4 46,22 4,22" fill="${primaryColor}"/>
                <rect x="10" y="22" width="30" height="22" rx="1" fill="${primaryColor}"/>
                <rect x="19" y="30" width="12" height="14" rx="1" fill="#0f1923"/>
            </g>
            <!-- Gold decorative lines -->
            <line x1="0" y1="0" x2="200" y2="200" stroke="${primaryColor}" stroke-width="0.8" opacity="0.1"/>
            <line x1="600" y1="0" x2="400" y2="200" stroke="${primaryColor}" stroke-width="0.8" opacity="0.1"/>
            <!-- Compass rose (luxury feel) -->
            <g opacity="0.06" transform="translate(80,800) scale(2)">
                <circle cx="25" cy="25" r="22" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
                <polygon points="25,4 28,22 25,25 22,22" fill="${primaryColor}"/>
                <polygon points="46,25 28,22 25,25 28,28" fill="${primaryColor}" opacity="0.5"/>
                <polygon points="25,46 22,28 25,25 28,28" fill="${primaryColor}" opacity="0.5"/>
                <polygon points="4,25 22,28 25,25 22,22" fill="${primaryColor}" opacity="0.5"/>
            </g>
            <circle cx="300" cy="0" r="300" fill="none" stroke="${primaryColor}" stroke-width="0.5" opacity="0.07"/>
        </svg>
    `,

    'local-business': (primaryColor = '#f97316') => `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fff7ed"/>
                    <stop offset="100%" style="stop-color:#ffedd5"/>
                </linearGradient>
            </defs>
            <rect width="600" height="900" fill="url(#lg1)"/>
            <!-- Storefront awning stripes -->
            <g opacity="0.08">
                <path d="M0 80 Q150 140 300 80 Q450 20 600 80 L600 140 Q450 80 300 140 Q150 200 0 140Z" fill="${primaryColor}"/>
            </g>
            <!-- Shop icon -->
            <g opacity="0.09" transform="translate(380,60) scale(3)">
                <rect x="4" y="18" width="42" height="26" rx="2" fill="none" stroke="${primaryColor}" stroke-width="2"/>
                <path d="M4 18 L8 6 H42 L46 18Z" fill="${primaryColor}" opacity="0.4"/>
                <rect x="16" y="28" width="18" height="16" rx="2" fill="${primaryColor}"/>
                <rect x="4" y="18" width="42" height="4" fill="${primaryColor}" opacity="0.6"/>
                <!-- Awning stripes -->
                <line x1="12" y1="8" x2="10" y2="18" stroke="#fff" stroke-width="2"/>
                <line x1="19" y1="8" x2="17" y2="18" stroke="#fff" stroke-width="2"/>
                <line x1="26" y1="8" x2="24" y2="18" stroke="#fff" stroke-width="2"/>
                <line x1="33" y1="8" x2="31" y2="18" stroke="#fff" stroke-width="2"/>
            </g>
            <!-- Shopping bag -->
            <g opacity="0.07" transform="translate(30,700) scale(2.8)">
                <rect x="8" y="14" width="34" height="28" rx="3" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
                <path d="M16 14V10a9 9 0 0118 0v4" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
            </g>
            <!-- Star rating icons -->
            <g fill="${primaryColor}" opacity="0.1">
                <polygon points="540,720 543,730 555,730 545,737 549,748 540,741 531,748 535,737 525,730 537,730" />
                <polygon points="560,750 563,760 575,760 565,767 569,778 560,771 551,778 555,767 545,760 557,760" transform="scale(0.7) translate(240,300)"/>
            </g>
            <!-- Polka dot pattern bottom -->
            <g fill="${primaryColor}" opacity="0.05">
                <circle cx="50" cy="860" r="15"/><circle cx="150" cy="880" r="10"/><circle cx="250" cy="850" r="18"/>
                <circle cx="350" cy="875" r="12"/><circle cx="450" cy="855" r="16"/><circle cx="550" cy="870" r="11"/>
            </g>
        </svg>
    `
};

// Theme metadata for builder UI
export const VCARD_THEMES = [
    {
        id: 'corporate-executive',
        label: 'Corporate / Executive',
        professions: 'Lawyers, Consultants, Finance',
        darkMode: true,
        primaryColor: '#c9a84c',
        bg: 'from-slate-900 to-[#1e3a5f]',
        previewBg: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        textColor: '#ffffff',
        cardBg: 'rgba(15,23,42,0.95)',
        accentBg: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(201,168,76,0.2)',
        buttonStyle: 'sharp', // sharp corners, solid
    },
    {
        id: 'creative-portfolio',
        label: 'Creative Portfolio',
        professions: 'Designers, Artists, Photographers',
        darkMode: true,
        primaryColor: '#a855f7',
        bg: 'from-[#0f0a1e] to-[#1e1b4b]',
        previewBg: 'linear-gradient(135deg, #0f0a1e 0%, #2d1b69 100%)',
        textColor: '#ffffff',
        cardBg: 'rgba(30,27,75,0.9)',
        accentBg: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.25)',
        buttonStyle: 'glass',
    },
    {
        id: 'tech-startup',
        label: 'Tech & Startup',
        professions: 'Developers, Engineers, IT Pros',
        darkMode: true,
        primaryColor: '#06b6d4',
        bg: 'from-[#020617] to-[#0c1a2e]',
        previewBg: 'linear-gradient(135deg, #020617 0%, #0c1a2e 100%)',
        textColor: '#ffffff',
        cardBg: 'rgba(2,6,23,0.97)',
        accentBg: 'rgba(6,182,212,0.07)',
        borderColor: 'rgba(6,182,212,0.2)',
        buttonStyle: 'neon',
    },
    {
        id: 'health-wellness',
        label: 'Health & Wellness',
        professions: 'Doctors, Therapists, Coaches',
        darkMode: false,
        primaryColor: '#10b981',
        bg: 'from-[#f0fdf4] to-[#dcfce7]',
        previewBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        textColor: '#1a2e1e',
        cardBg: 'rgba(255,255,255,0.95)',
        accentBg: 'rgba(16,185,129,0.06)',
        borderColor: 'rgba(16,185,129,0.15)',
        buttonStyle: 'rounded',
    },
    {
        id: 'real-estate-premium',
        label: 'Real Estate & Architecture',
        professions: 'Realtors, Brokers, Architects',
        darkMode: true,
        primaryColor: '#d97706',
        bg: 'from-[#0f1923] to-[#1a2b1e]',
        previewBg: 'linear-gradient(135deg, #0f1923 0%, #1a2420 100%)',
        textColor: '#ffffff',
        cardBg: 'rgba(15,25,35,0.97)',
        accentBg: 'rgba(217,119,6,0.08)',
        borderColor: 'rgba(217,119,6,0.2)',
        buttonStyle: 'sharp',
    },
    {
        id: 'local-business',
        label: 'Local Business',
        professions: 'Cafes, Salons, Retailers',
        darkMode: false,
        primaryColor: '#f97316',
        bg: 'from-[#fff7ed] to-[#ffedd5]',
        previewBg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        textColor: '#431407',
        cardBg: 'rgba(255,255,255,0.98)',
        accentBg: 'rgba(249,115,22,0.07)',
        borderColor: 'rgba(249,115,22,0.15)',
        buttonStyle: 'bold',
    }
];

export function getTheme(themeId) {
    return VCARD_THEMES.find(t => t.id === themeId) || VCARD_THEMES[0];
}

export function getSvgBackground(themeId, primaryColor) {
    const fn = THEME_BACKGROUNDS[themeId];
    if (!fn) return null;
    const svgString = fn(primaryColor);
    const encoded = encodeURIComponent(svgString.trim());
    return `url("data:image/svg+xml,${encoded}")`;
}
