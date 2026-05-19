import React from 'react';
import { Share2, MessageCircle, Sparkles, MapPin, Phone, Mail } from 'lucide-react';
import {
    SaveContactBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    InstagramSection, ContactButtons, ContactInfoCards, ServiceCarousel, HeroSlider
} from './VcardShared';

const PC = '#c8a27c'; // Rose Gold / Soft Gold
const PC_LIGHT = '#e8d5c4';
const BG = '#faf7f2'; // Very soft warm white
const PANEL = '#ffffff';
const BORDER = '#f0e6dd';
const TEXT = '#3d342b';
const MUTED = '#8c7d70';

const BEAUTY_ANIMATIONS = `
@keyframes beautyFloat {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
    50% { transform: translateY(-15px) scale(1.2); opacity: 0.6; }
}
@keyframes beautySpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
@keyframes beautyFadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes beautyShimmer {
    0% { transform: translateX(-100%) skewX(-15deg); }
    15%, 100% { transform: translateX(200%) skewX(-15deg); }
}
@keyframes beautyBreathe {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
.beauty-theme-root button[type="submit"],
.beauty-btn-shimmer {
    position: relative;
    overflow: hidden;
}
.beauty-theme-root button[type="submit"]::after,
.beauty-btn-shimmer::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: beautyShimmer 4s infinite;
    pointer-events: none;
}
`;

function BeautyDivider({ color = BORDER }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 24px 32px' }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${color})` }} />
            <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: color, margin: '0 12px' }} />
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        </div>
    );
}

function FloatingSparkles({ color }) {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
            <Sparkles size={14} color={color} style={{ position: 'absolute', top: '15%', left: '10%', animation: 'beautyFloat 4s ease-in-out infinite' }} />
            <Sparkles size={20} color={color} style={{ position: 'absolute', top: '35%', right: '15%', animation: 'beautyFloat 5s ease-in-out infinite 1s' }} />
            <Sparkles size={10} color={color} style={{ position: 'absolute', top: '65%', left: '20%', animation: 'beautyFloat 3.5s ease-in-out infinite 2s' }} />
            <Sparkles size={16} color={color} style={{ position: 'absolute', top: '50%', right: '8%', animation: 'beautyFloat 4.5s ease-in-out infinite 0.5s' }} />
            <Sparkles size={12} color={color} style={{ position: 'absolute', bottom: '25%', left: '40%', animation: 'beautyFloat 6s ease-in-out infinite 1.5s' }} />
            <Sparkles size={12} color={color} style={{ position: 'absolute', bottom: '25%', left: '40%', animation: 'beautyFloat 6s ease-in-out infinite 1.5s' }} />
        </div>
    );
}

function TradingBackground({ color }) {
    return (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="tradingGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#tradingGrid)" />
                
                {/* Animated Chart Lines */}
                <g fill="none" stroke={color} strokeWidth="2">
                    <path d="M-20,350 Q80,250 150,300 T280,150 T450,100" strokeDasharray="1000" strokeDashoffset="1000">
                        <animate attributeName="stroke-dashoffset" values="1000;0;1000" dur="20s" repeatCount="indefinite" />
                    </path>
                    <path d="M-20,550 Q100,450 200,500 T350,350 T450,250" strokeDasharray="1000" strokeDashoffset="1000" opacity="0.4">
                        <animate attributeName="stroke-dashoffset" values="1000;0;1000" dur="15s" repeatCount="indefinite" />
                    </path>
                    <path d="M-20,700 Q150,600 250,680 T400,500 T450,450" strokeDasharray="1000" strokeDashoffset="1000" opacity="0.6">
                        <animate attributeName="stroke-dashoffset" values="0;1000;0" dur="25s" repeatCount="indefinite" />
                    </path>
                </g>

                {/* Candlesticks overlay */}
                <g fill={color} opacity="0.6">
                    <rect x="50" y="270" width="8" height="40" rx="2" />
                    <line x1="54" y1="250" x2="54" y2="330" stroke={color} strokeWidth="2" />
                    
                    <rect x="120" y="290" width="8" height="50" rx="2" />
                    <line x1="124" y1="270" x2="124" y2="360" stroke={color} strokeWidth="2" />

                    <rect x="250" y="160" width="8" height="30" rx="2" />
                    <line x1="254" y1="140" x2="254" y2="210" stroke={color} strokeWidth="2" />
                    
                    <rect x="330" y="230" width="8" height="60" rx="2" />
                    <line x1="334" y1="210" x2="334" y2="310" stroke={color} strokeWidth="2" />
                </g>
            </svg>
        </div>
    );
}

export default function BeautyVcard({ vcard, onShare }) {
    const pc = vcard.primaryColor || PC;

    const inputStyle = {
        width: '100%', padding: '14px 18px', borderRadius: 24, fontSize: '0.875rem',
        border: `1px solid ${BORDER}`, background: '#fff',
        color: TEXT, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
    };

    const btnStyle = {
        padding: '16px 24px', borderRadius: 30, fontWeight: 600, fontSize: '0.95rem',
        color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
        background: pc,
        boxShadow: `0 8px 20px ${pc}40`, transition: 'all 0.3s',
        fontFamily: 'inherit'
    };

    const SectionTitle = ({ title }) => (
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Sparkles size={16} color={pc} style={{ margin: '0 auto 8px' }} />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 600, fontFamily: "'Playfair Display', serif", color: TEXT, margin: 0, fontStyle: 'italic' }}>
                {title}
            </h2>
            <div style={{ width: 40, height: 2, background: pc, margin: '12px auto 0', borderRadius: 2 }} />
        </div>
    );

    return (
        <div className="beauty-theme-root" style={{ minHeight: '100vh', background: '#e0d8d0', display: 'flex', justifyContent: 'center', fontFamily: "'Outfit', 'Inter', sans-serif", fontWeight: 300 }}>
            <style>{BEAUTY_ANIMATIONS}</style>
            <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1, background: BG, overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.05)' }}>
                <TradingBackground color={pc} />

                {/* ─── HERO ─────────────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 320, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' }}>
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} />
                        : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${PC_LIGHT}, #fff, ${PC_LIGHT})`, backgroundSize: '200% 200%', animation: 'beautyBreathe 6s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={48} color={pc} opacity={0.3} />
                        </div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(61,52,43,0.15) 0%, rgba(61,52,43,0) 50%)' }} />
                    {vcard.heroMedia?.floatingSparkles === true && <FloatingSparkles color="#ffffff" />}
                    <button onClick={onShare} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: `1px solid rgba(255,255,255,0.4)`, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <Share2 size={18} />
                    </button>
                </div>

                {/* ─── PROFILE INFO ─────────────────────────────────────────── */}
                <div style={{ padding: '0 24px', position: 'relative', textAlign: 'center', marginTop: -40 }}>
                    <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto', animation: 'beautyFadeSlideUp 0.6s ease-out both' }}>
                        {/* Aura Ring */}
                        <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent, ${pc}, transparent)`, animation: 'beautySpin 8s linear infinite', opacity: 0.6, pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', border: `4px solid ${BG}`, background: '#fff', overflow: 'hidden', boxShadow: `0 10px 20px rgba(0,0,0,0.08)`, zIndex: 1 }}>
                            {vcard.profileImage
                                ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt={vcard.name} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 400, color: pc, fontFamily: "'Playfair Display', serif" }}>{vcard.name?.charAt(0)}</div>
                            }
                        </div>
                    </div>

                    <h1 style={{ fontSize: '1.9rem', fontWeight: 500, fontFamily: "'Playfair Display', serif", color: TEXT, margin: '14px 0 0', letterSpacing: '0.01em', animation: 'beautyFadeSlideUp 0.6s ease-out both 0.1s' }}>
                        {vcard.name}
                    </h1>

                    <div style={{ animation: 'beautyFadeSlideUp 0.6s ease-out both 0.2s' }}>
                        <p style={{ fontSize: '1rem', color: pc, fontWeight: 500, marginTop: 6, fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{vcard.designation}</p>
                        {vcard.company && <p style={{ fontSize: '0.75rem', color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{vcard.company}</p>}
                    </div>

                    {vcard.bio && (
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: MUTED, marginTop: 16, padding: '0 10px', animation: 'beautyFadeSlideUp 0.6s ease-out both 0.3s' }}>{vcard.bio}</p>
                    )}
                </div>

                {/* ─── CTAs ────────────────────────────────────────────────── */}
                <div style={{ padding: '14px 24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <SaveContactBtn vcard={vcard} style={btnStyle} className="beauty-btn-shimmer">
                        Save to Contacts
                    </SaveContactBtn>
                </div>

                {/* ─── SOCIAL ──────────────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ padding: '0 24px 24px' }}>
                        <SocialLinksRow links={vcard.socialLinks} containerStyle={{ justifyContent: 'center', gap: 16 }} itemStyle={{ borderRadius: '50%', border: `1px solid ${BORDER}`, width: 44, height: 44, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }} />
                    </div>
                )}

                {/* ─── CONTACT QUICK LINKS ──────────────────────────────────── */}
                <div style={{ padding: '0 24px 32px' }}>
                    <ContactInfoCards vcard={vcard} accentColor={pc} bgColor="#fff" cardBgColor="#fff" textColor={TEXT} borderColor={BORDER} borderRadius={24} />
                </div>

                {/* ─── SERVICES ────────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ padding: '10px 24px 32px', background: '#fff' }}>
                        <BeautyDivider />
                        <SectionTitle title="Our Services" />
                        <ServiceCarousel
                            services={vcard.services}
                            autoplay={vcard.servicesAutoplay}
                            primaryColor={pc}
                            renderCard={(s, i) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 14px', border: `1px solid ${BORDER}`, borderRadius: 16, background: '#fafafa', height: '100%', boxSizing: 'border-box' }}>
                                    <h3 style={{ fontWeight: 500, fontSize: '1.1rem', color: TEXT, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{s.title}</h3>
                                    {s.price && <p style={{ fontWeight: 600, fontSize: '0.9rem', color: pc, marginBottom: 8 }}>{s.price}</p>}
                                    {s.description && <p style={{ fontSize: '0.85rem', color: MUTED, lineHeight: 1.6 }}>{s.description}</p>}
                                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 'auto', paddingTop: 12, padding: '6px 16px', background: pc, color: '#fff', fontSize: '0.8rem', borderRadius: 20, textDecoration: 'none' }}>Learn More</a>}
                                </div>
                            )}
                        />
                    </div>
                )}



                {/* ─── GALLERY ────────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <div style={{ padding: '40px 24px' }}>
                        <SectionTitle title="Gallery" />
                        <GalleryGrid images={vcard.gallery} borderRadius={16} gap={12} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── INSTAGRAM ─────────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ padding: '0 24px 40px' }}>
                        <SectionTitle title="On Instagram" />
                        <InstagramSection posts={vcard.instagramPosts} borderColor={BORDER} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ padding: '10px 24px 40px', background: '#fff' }}>
                        <BeautyDivider />
                        <SectionTitle title="Client Love" />
                        <TestimonialCard testimonials={vcard.testimonials} cardStyle={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, textAlign: 'center', padding: 24 }} quoteColor={MUTED} autoplay={vcard.testimonialsAutoplay} perView={vcard.testimonialsPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── BUSINESS HOURS ──────────────────────────────────────── */}
                {vcard.businessHours && (
                    <div style={{ padding: '40px 24px' }}>
                        <SectionTitle title="Opening Hours" />
                        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
                            <BusinessHoursTable hours={vcard.businessHours} accentColor={pc} rowBg="transparent" borderColor={BORDER} textColor={TEXT} />
                        </div>
                    </div>
                )}

                {/* ─── BOOKING / ENQUIRY ──────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ padding: '10px 24px 40px', background: '#fff' }}>
                        <BeautyDivider />
                        <SectionTitle title={vcard.booking.heading || 'Book an Appointment'} />
                        {vcard.booking.description && <p style={{ fontSize: '0.9rem', color: MUTED, textAlign: 'center', marginBottom: 24, padding: '0 10px' }}>{vcard.booking.description}</p>}
                        {vcard.booking.url
                            ? <a href={vcard.booking.url} target="_blank" rel="noreferrer" className="beauty-btn-shimmer" style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>✨ {vcard.booking.buttonLabel || 'Book Now'}</a>
                            : <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        }
                    </div>
                )}

                {vcard.enquiryForm?.enabled && (
                    <div style={{ padding: '40px 24px', background: BG }}>
                        <SectionTitle title={vcard.enquiryForm.heading || 'Get In Touch'} />
                        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
                            <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                    </div>
                )}

                {/* ─── FOOTER ─────────────────────────────────────────────── */}
                {!vcard.hideBranding && (
                    <div style={{ textAlign: 'center', padding: '10px 16px 90px' }}>
                        <BeautyDivider />
                        <p style={{ fontSize: '0.7rem', color: MUTED }}>
                            Created with{' '}
                            <a href="/" target="_blank" rel="noreferrer" style={{ color: pc, textDecoration: 'none', fontWeight: 600 }}>
                                {vcard.appName || 'BitsLab vCard'}
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
