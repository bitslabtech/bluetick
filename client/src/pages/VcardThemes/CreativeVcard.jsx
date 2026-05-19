/**
 * CREATIVE PORTFOLIO VCARD THEME
 *
 * Design Language: Vibrant dark glassmorphism.
 * Layout: Full-bleed gradient hero with floating glass profile card,
 *         animated background, glass-card sections with blur backdrop.
 */

import React from 'react';
import { Download, Share2, MessageCircle, Palette, Camera, Music, ExternalLink } from 'lucide-react';
import {
    SaveContactBtn, ShareBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    SectionHeading, InstagramSection, ContactButtons, ServiceCarousel, HeroSlider
} from './VcardShared';

const PC = '#a855f7';   // purple (default primary)
const BG = '#0d0d1a';
const GLASS = 'rgba(255,255,255,0.06)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';
const TEXT = '#f0eeff';
const MUTED = 'rgba(240,238,255,0.6)';

function GlassCard({ children, style }) {
    return (
        <div style={{
            background: GLASS, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${GLASS_BORDER}`, borderRadius: 20,
            ...style
        }}>
            {children}
        </div>
    );
}

function AnimatedDivider({ color = PC }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '36px 0', gap: 0, position: 'relative' }}>
            <style>{`
                @keyframes divDiamond { 0%, 100% { transform: rotate(45deg) scale(1); box-shadow: 0 0 8px ${color}80, 0 0 20px ${color}40; } 50% { transform: rotate(45deg) scale(1.18); box-shadow: 0 0 16px ${color}, 0 0 36px ${color}60; } }
                @keyframes divSparkle { 0%, 100% { transform: rotate(0deg) scale(0.7); opacity: 0.5; } 50% { transform: rotate(90deg) scale(1); opacity: 1; } }
                @keyframes divDot { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.3); opacity: 0.9; } }
                @keyframes divLine { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
            `}</style>

            {/* Left gradient line */}
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent 0%, ${color}20 30%, ${color}80 100%)`, animation: 'divLine 3s ease-in-out infinite' }} />

            {/* Left micro-dot */}
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: 0.7, margin: '0 8px', animation: 'divDot 2.5s ease-in-out infinite 0.4s', boxShadow: `0 0 6px ${color}` }} />

            {/* Center diamond core */}
            <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 4px' }}>
                {/* Outer diamond */}
                <div style={{ position: 'absolute', width: 18, height: 18, border: `1.5px solid ${color}`, borderRadius: 3, background: `${color}10`, animation: 'divDiamond 2.8s ease-in-out infinite', boxShadow: `0 0 10px ${color}60` }} />
                {/* Inner sparkle cross */}
                <div style={{ position: 'relative', width: 8, height: 8, animation: 'divSparkle 2.8s ease-in-out infinite' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: color, transform: 'translateY(-50%)', borderRadius: 2 }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, background: color, transform: 'translateX(-50%)', borderRadius: 2 }} />
                </div>
            </div>

            {/* Right micro-dot */}
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: 0.7, margin: '0 8px', animation: 'divDot 2.5s ease-in-out infinite 0.8s', boxShadow: `0 0 6px ${color}` }} />

            {/* Right gradient line */}
            <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent 0%, ${color}20 30%, ${color}80 100%)`, animation: 'divLine 3s ease-in-out infinite 0.5s' }} />
        </div>
    );
}

function CreativeContactItem({ href, icon, label, value, external, pc }) {
    const El = href ? 'a' : 'div';
    return (
        <El href={href} target={external ? '_blank' : undefined} rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: GLASS, border: `1px solid ${GLASS_BORDER}`, textDecoration: 'none', color: TEXT, transition: 'all 0.3s', marginBottom: 8 }}
            onMouseOver={e => { e.currentTarget.style.background = `${pc}15`; e.currentTarget.style.borderColor = `${pc}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = GLASS; e.currentTarget.style.borderColor = GLASS_BORDER; e.currentTarget.style.transform = 'none'; }}
        >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${pc}20`, border: `1px solid ${pc}40`, color: pc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: pc, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT }}>{value}</p>
            </div>
            {external && <ExternalLink size={13} color={MUTED} />}
        </El>
    );
}

export default function CreativeVcard({ vcard, onShare }) {
    const pc = vcard.primaryColor || PC;

    const inputStyle = {
        width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: '0.875rem',
        border: `1px solid ${GLASS_BORDER}`, background: GLASS,
        color: TEXT, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    };
    const btnStyle = {
        padding: '14px 20px', borderRadius: 12, fontWeight: 800, fontSize: '0.95rem',
        color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
        background: pc,
        boxShadow: `0 8px 30px ${pc}40, 0 0 0 1px ${pc}30`,
        transition: 'all 0.2s',
    };

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', justifyContent: 'center', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
            {/* Animated blob background */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '60%', height: '60%', background: `radial-gradient(circle, ${pc}15 0%, transparent 70%)`, animation: 'blobFloat1 8s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', top: '30%', right: '-15%', width: '50%', height: '50%', background: `radial-gradient(circle, ${pc}10 0%, transparent 70%)`, animation: 'blobFloat2 10s ease-in-out infinite alternate' }} />
                <style>{`
                    @keyframes blobFloat1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,-30px) scale(1.1); } }
                    @keyframes blobFloat2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-30px,40px) scale(0.95); } }
                `}</style>
            </div>

            <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1 }}>

                {/* ─── HERO ─────────────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 280 }}>
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} />
                        : (
                            <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, #1a0533 0%, #0d0d1a 40%, #1a0b2e 100%)` }}>
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 430 280">
                                    <defs>
                                        <radialGradient id="cpOrb1" cx="20%" cy="20%" r="50%">
                                            <stop offset="0%" stopColor={pc} stopOpacity="0.3" />
                                            <stop offset="100%" stopColor={pc} stopOpacity="0" />
                                        </radialGradient>
                                        <radialGradient id="cpOrb2" cx="80%" cy="80%" r="50%">
                                            <stop offset="0%" stopColor={pc} stopOpacity="0.15" />
                                            <stop offset="100%" stopColor={pc} stopOpacity="0" />
                                        </radialGradient>
                                    </defs>
                                    <rect width="430" height="280" fill="url(#cpOrb1)" />
                                    <rect width="430" height="280" fill="url(#cpOrb2)" />
                                    {/* Star sparkles */}
                                    {[[50, 60], [380, 40], [200, 100], [320, 180], [80, 220], [400, 200]].map(([x, y], i) => (
                                        <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 2 : 1.5} fill={pc} opacity="0.6" />
                                    ))}
                                </svg>
                            </div>
                        )
                    }
                    {vcard.heroMedia?.overlay !== false && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(13,13,26,0.85) 100%)' }} />
                    )}
                    <button onClick={onShare} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: GLASS, backdropFilter: 'blur(12px)', border: `1px solid ${GLASS_BORDER}`, color: TEXT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Share2 size={16} />
                    </button>
                </div>

                {/* ─── PROFILE CARD (overlapping) ─────────────────────────── */}
                <div style={{ margin: '0 16px', marginTop: -30, position: 'relative', zIndex: 10 }}>
                    <div style={{ position: 'absolute', inset: -15, background: pc, filter: 'blur(35px)', opacity: 0.25, borderRadius: 30, animation: 'pulseGlow 4s ease-in-out infinite alternate', zIndex: -1 }} />
                    <style>{`@keyframes pulseGlow { 0% { opacity: 0.15; transform: scale(0.95); } 100% { opacity: 0.35; transform: scale(1.05); } }`}</style>
                    <GlassCard style={{ padding: '24px', textAlign: 'center', boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${pc}20` }}>
                        {/* Avatar with glow ring */}
                        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 16px' }}>
                            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: `conic-gradient(${pc}, transparent, ${pc}, transparent, ${pc})`, animation: 'spin 6s linear infinite' }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: BG }} />
                            <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', overflow: 'hidden', background: vcard.profileImage ? '#fff' : pc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                                {vcard.profileImage
                                    ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt={vcard.name} />
                                    : vcard.name?.charAt(0)
                                }
                            </div>
                        </div>

                        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{vcard.name}</h1>
                        <p style={{ fontSize: '0.9rem', color: pc, fontWeight: 600, marginBottom: 2 }}>{vcard.designation}</p>
                        {vcard.company && <p style={{ fontSize: '0.8rem', color: MUTED, opacity: 0.8 }}>{vcard.company}</p>}
                    </GlassCard>
                </div>

                {/* ─── BIO ────────────────────────────────────────────────── */}
                {vcard.bio && (
                    <div style={{ margin: '16px 16px 0', padding: '18px 20px', background: GLASS, backdropFilter: 'blur(12px)', border: `1px solid ${GLASS_BORDER}`, borderRadius: 16 }}>
                        <p style={{ fontSize: '0.875rem', lineHeight: 1.75, color: MUTED, textAlign: 'center' }}>{vcard.bio}</p>
                    </div>
                )}

                {/* ─── CTAs ────────────────────────────────────────────────── */}
                <div style={{ margin: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SaveContactBtn vcard={vcard} style={btnStyle}>
                        Save to Contacts
                    </SaveContactBtn>
                </div>

                {/* ─── SOCIAL ──────────────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ padding: '24px 16px 0' }}>
                        <SocialLinksRow links={vcard.socialLinks} containerStyle={{ justifyContent: 'center' }} itemStyle={{ borderRadius: 14 }} />
                    </div>
                )}

                {/* ─── CONTACT ─────────────────────────────────────────────── */}
                {(vcard.phone || vcard.alternatePhone || vcard.email || vcard.location) && (
                    <div style={{ margin: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>Contact</h2>
                        {vcard.phone && <CreativeContactItem pc={pc} href={`tel:${vcard.phone}`} icon="📱" label="Phone" value={vcard.phone} />}
                        {vcard.alternatePhone && <CreativeContactItem pc={pc} href={`tel:${vcard.alternatePhone}`} icon="📱" label="Alt Phone" value={vcard.alternatePhone} />}
                        {vcard.email && <CreativeContactItem pc={pc} href={`mailto:${vcard.email}`} icon="✉" label="Email" value={vcard.email} />}
                        {vcard.location && <CreativeContactItem pc={pc} href={null} icon="📍" label="Location" value={vcard.location} />}
                    </div>
                )}

                {/* ─── SERVICES ────────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>What I Do</h2>
                        <ServiceCarousel 
                            services={vcard.services} 
                            autoplay={vcard.servicesAutoplay} 
                            primaryColor={pc} 
                            renderCard={(s, i) => (
                                <GlassCard key={i} style={{ padding: '16px' }}>
                                    <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: pc, marginBottom: 6 }}>{s.title}</h3>
                                    {s.price && <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff', marginBottom: 6 }}>{s.price}</p>}
                                    {s.description && <p style={{ fontSize: '0.75rem', color: MUTED, lineHeight: 1.55 }}>{s.description}</p>}
                                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, padding: '6px 14px', background: pc, color: '#fff', fontSize: '0.75rem', fontWeight: 700, borderRadius: 8, textDecoration: 'none' }}>Explore <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} /></a>}
                                </GlassCard>
                            )}
                        />
                    </div>
                )}

                {/* ─── GALLERY ────────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>Gallery</h2>
                        <GalleryGrid images={vcard.gallery} borderRadius={14} gap={10} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>Kind Words</h2>
                        <TestimonialCard testimonials={vcard.testimonials} cardStyle={{ background: GLASS, border: `1px solid ${GLASS_BORDER}`, backdropFilter: 'blur(12px)' }} quoteColor={MUTED} autoplay={vcard.testimonialsAutoplay} perView={vcard.testimonialsPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── BUSINESS HOURS ──────────────────────────────────────── */}
                {vcard.businessHours && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>Hours</h2>
                        <GlassCard style={{ padding: '8px' }}>
                            <BusinessHoursTable hours={vcard.businessHours} accentColor={pc} rowBg="rgba(255,255,255,0.02)" borderColor={GLASS_BORDER} textColor={TEXT} />
                        </GlassCard>
                    </div>
                )}



                {/* ─── BOOKING / ENQUIRY ──────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>{vcard.booking.heading || 'Book a Session'}</h2>
                        {vcard.booking.description && <p style={{ fontSize: '0.85rem', color: MUTED, textAlign: 'center', marginBottom: 16, lineHeight: 1.6 }}>{vcard.booking.description}</p>}
                        {vcard.booking.url
                            ? <a href={vcard.booking.url} target="_blank" rel="noreferrer" style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>📅 {vcard.booking.buttonLabel || 'Book Now'}</a>
                            : <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        }
                    </div>
                )}
                {vcard.enquiryForm?.enabled && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <AnimatedDivider color={pc} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16 }}>{vcard.enquiryForm.heading || 'Get In Touch'}</h2>
                        <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                    </div>
                )}

                {/* ─── INSTAGRAM ─────────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ padding: '28px 16px 0' }}>
                        <InstagramSection posts={vcard.instagramPosts} borderColor={GLASS_BORDER} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ─── FOOTER ─────────────────────────────────────────────── */}
                {!vcard.hideBranding && (
                    <div style={{ textAlign: 'center', padding: '32px 16px 140px' }}>
                        <p style={{ fontSize: '0.65rem', color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Created by <a href="/" target="_blank" rel="noreferrer" style={{ color: pc, textDecoration: 'none' }}>{vcard.appName || 'BitsLab vCard'}</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
