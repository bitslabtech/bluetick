/**
 * HEALTH & WELLNESS VCARD THEME
 *
 * Design Language: Clean, calm, organic — soft whites and mint greens.
 * Layout: Light background with organic SVG wave dividers (competitor-inspired),
 *         centered profile with leaf/nature feel, soft pill buttons,
 *         alternating mint/white section blocks.
 * Beyond competitors: Organic blob section shapes (not rectangular blocks),
 *                     ECG pulse line decoration, calming ambient background,
 *                     warm serif font for name, round pill contact items.
 */

import React from 'react';
import { Download, Share2, MessageCircle, Heart, Leaf, ExternalLink } from 'lucide-react';
import {
    SaveContactBtn, ShareBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    SectionHeading, InstagramSection, ContactButtons, ServiceCarousel, HeroSlider
} from './VcardShared';

const PC = '#10b981';   // emerald
const PC2 = '#34d399';  // light emerald
const PC3 = '#6ee7b7';  // mint
const BG = '#f0fdf8';
const MINT_BG = '#d1fae5';
const WHITE = '#ffffff';
const CARD = '#ffffff';
const BORDER = 'rgba(16,185,129,0.15)';
const TEXT = '#064e3b';
const MUTED = 'rgba(6,78,59,0.5)';
const SOFT_SHADOW = '0 4px 24px rgba(16,185,129,0.12)';

// ─── Animated Wave Divider (seamless tiled loop) ─────────────────────────
// The SVG viewBox is 2400 wide with the wave pattern repeated twice (0-1200, 1200-2400).
// Animating translateX(0→-50%) shifts exactly one full period, making the loop invisible.
const WAVE_CSS = `
  @keyframes waveScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
`;

function WaveDivider({ fromColor, toColor, flip = false }) {
    // When flipped upside down, the wave becomes the top edge and the background becomes the bottom edge.
    // We swap the colors so fromColor is always at the top and toColor is always at the bottom.
    const effectiveFrom = flip ? toColor : fromColor;
    const effectiveTo = flip ? fromColor : toColor;
    
    const fill = effectiveTo || MINT_BG;
    return (
        <div style={{ background: effectiveFrom || 'transparent', lineHeight: 0, transform: flip ? 'scaleY(-1)' : 'none', marginTop: -1, overflow: 'hidden', position: 'relative', height: 54 }}>
            <style>{WAVE_CSS}</style>

            {/* Back wave — slow (9s), floats lazily behind */}
            <svg viewBox="0 0 2400 60" xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', display: 'block', animation: 'waveScroll 9s linear infinite' }}>
                <path
                    d="M0,28 C150,50 450,6 600,28 C750,50 1050,6 1200,28 C1350,50 1650,6 1800,28 C1950,50 2250,6 2400,28 L2400,60 L0,60 Z"
                    fill={fill} opacity="0.35"
                />
            </svg>

            {/* Front wave — faster (5.5s), rides ahead of the back layer */}
            <svg viewBox="0 0 2400 60" xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', display: 'block', animation: 'waveScroll 5.5s linear infinite' }}>
                <path
                    d="M0,38 C150,56 450,20 600,38 C750,56 1050,20 1200,38 C1350,56 1650,20 1800,38 C1950,56 2250,20 2400,38 L2400,60 L0,60 Z"
                    fill={fill}
                />
            </svg>
        </div>
    );
}


// ─── ECG Line decoration ──────────────────────────────────────────────────
function EcgLine() {
    return (
        <svg viewBox="0 0 400 30" style={{ width: '100%', height: 20, opacity: 0.2 }} preserveAspectRatio="none">
            <polyline
                points="0,15 60,15 75,5 90,25 105,3 120,27 135,15 200,15 215,10 230,20 245,15 400,15"
                fill="none" stroke={PC} strokeWidth="1.5" strokeLinecap="round"
            />
        </svg>
    );
}

function HealthContactItem({ href, icon, label, value, external }) {
    const El = href ? 'a' : 'div';
    return (
        <El href={href} target={external ? '_blank' : undefined} rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 99, background: WHITE, border: `1px solid ${BORDER}`, textDecoration: 'none', color: TEXT, marginBottom: 10, boxShadow: SOFT_SHADOW, transition: 'all 0.25s' }}
            onMouseOver={e => { e.currentTarget.style.background = MINT_BG; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(16,185,129,0.2)`; }}
            onMouseOut={e => { e.currentTarget.style.background = WHITE; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = SOFT_SHADOW; }}
        >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${PC}, ${PC2})`, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: PC, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT }}>{value}</p>
            </div>
            {external && <ExternalLink size={13} color={MUTED} />}
        </El>
    );
}

export default function HealthVcard({ vcard, onShare }) {
    const pc = vcard.primaryColor || PC;

    const inputStyle = {
        width: '100%', padding: '12px 18px', borderRadius: 99, fontSize: '0.875rem',
        border: `1px solid ${BORDER}`, background: WHITE, color: TEXT,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    };
    const btnStyle = {
        padding: '14px 24px', borderRadius: 99, fontWeight: 800, fontSize: '0.95rem',
        color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
        background: `linear-gradient(135deg, ${pc}, ${PC2})`,
        boxShadow: `0 10px 30px ${pc}40`, transition: 'all 0.2s', letterSpacing: '0.02em',
    };

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', justifyContent: 'center', fontFamily: "'Nunito', 'Inter', sans-serif" }}>
            {/* Ambient background blobs */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-20%', width: '70%', height: '60%', background: `radial-gradient(ellipse, ${pc}12 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '5%', left: '-10%', width: '50%', height: '40%', background: `radial-gradient(ellipse, ${PC2}10 0%, transparent 70%)`, borderRadius: '50%' }} />
            </div>

            <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1 }}>

                {/* ─── HERO ─────────────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 240 }}>
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} />
                        : (
                            <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)` }}>
                                {/* ECG pulse */}
                                <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0 }}>
                                    <EcgLine />
                                </div>
                                {/* Nature icons */}
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 430 240">
                                    {/* Leaf 1 */}
                                    <g opacity="0.15" transform="translate(340,20) rotate(-30) scale(0.9)">
                                        <path d="M25 5 Q50 5 50 30 Q50 55 25 55 Q0 40 25 5Z" fill={pc} />
                                        <line x1="25" y1="55" x2="25" y2="70" stroke={pc} strokeWidth="2" />
                                    </g>
                                    {/* Heart */}
                                    <g opacity="0.12" transform="translate(30,20) scale(1.2)">
                                        <path d="M30 50 C30 50 5 33 5 18 A15 15 0 0 1 30 15 A15 15 0 0 1 55 18 C55 33 30 50 30 50Z" fill={pc} />
                                    </g>
                                    {/* Medical cross */}
                                    <g opacity="0.1" transform="translate(370,150) scale(0.6)">
                                        <rect x="15" y="3" width="12" height="36" rx="4" fill={pc} />
                                        <rect x="3" y="15" width="36" height="12" rx="4" fill={pc} />
                                    </g>
                                    {/* Stethoscope circle */}
                                    <circle cx="380" cy="220" r="50" fill="none" stroke={pc} strokeWidth="1.5" opacity="0.15" />
                                </svg>
                            </div>
                        )
                    }
                    {vcard.heroMedia?.overlay !== false && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(240,253,248,0.5) 100%)' }} />
                    )}
                    <button onClick={onShare} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: `1px solid ${BORDER}`, color: pc, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SOFT_SHADOW }}>
                        <Share2 size={16} />
                    </button>

                </div>

                {/* ─── PROFILE CARD ────────────────────────────────────────── */}
                <WaveDivider toColor={WHITE} />
                <div style={{ background: WHITE, padding: '0 16px 12px', textAlign: 'center' }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: -80, marginBottom: 16, position: 'relative', zIndex: 10 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 108, height: 108, borderRadius: '50%', border: `4px solid ${WHITE}`, boxShadow: `0 0 0 3px ${PC}50, ${SOFT_SHADOW}`, overflow: 'hidden', background: vcard.profileImage ? '#fff' : `linear-gradient(135deg, ${PC}, ${PC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>
                                {vcard.profileImage
                                    ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt={vcard.name} />
                                    : vcard.name?.charAt(0)
                                }
                            </div>
                            {/* Leaf badge */}
                            <div style={{ position: 'absolute', bottom: 4, right: 0, width: 28, height: 28, borderRadius: '50%', background: WHITE, border: `2px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SOFT_SHADOW }}>
                                <Leaf size={13} color={pc} />
                            </div>
                        </div>
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT, letterSpacing: '-0.01em', marginBottom: 4 }}>{vcard.name}</h1>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: pc, marginBottom: 2 }}>{vcard.designation}</p>
                    {vcard.company && <p style={{ fontSize: '0.8rem', color: MUTED }}>{vcard.company}</p>}


                </div>

                {/* ─── BIO ─────────────────────────────────────────────────── */}
                {vcard.bio && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, padding: '12px 24px' }}>
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: TEXT, textAlign: 'center' }}>{vcard.bio}</p>
                        </div>
                        <WaveDivider fromColor={MINT_BG} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── CTAs ────────────────────────────────────────────────── */}
                <div style={{ background: WHITE, padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SaveContactBtn vcard={vcard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px 24px', borderRadius: 99, fontWeight: 800, fontSize: '0.95rem', color: '#fff', textDecoration: 'none', background: `linear-gradient(135deg, ${pc}, ${PC2})`, boxShadow: `0 10px 30px ${pc}40`, transition: 'all 0.2s' }}>
                        Save to Contacts
                    </SaveContactBtn>
                </div>

                {/* ─── SOCIAL ──────────────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ background: WHITE, padding: '0 16px 24px' }}>
                        <SocialLinksRow links={vcard.socialLinks} containerStyle={{ justifyContent: 'center' }} itemStyle={{ borderRadius: '50%' }} />
                    </div>
                )}

                {/* ─── CONTACT ─────────────────────────────────────────────── */}
                {(vcard.phone || vcard.alternatePhone || vcard.email || vcard.location) && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, padding: '28px 16px' }}>
                            <SectionHeading title="Get In Touch" accentColor={pc} textColor={TEXT} />
                            {vcard.phone && <HealthContactItem href={`tel:${vcard.phone}`} icon="📞" label="Phone" value={vcard.phone} />}
                            {vcard.alternatePhone && <HealthContactItem href={`tel:${vcard.alternatePhone}`} icon="📞" label="Alt Phone" value={vcard.alternatePhone} />}
                            {vcard.email && <HealthContactItem href={`mailto:${vcard.email}`} icon="✉️" label="Email" value={vcard.email} />}
                            {vcard.location && <HealthContactItem href={null} icon="📍" label="Location" value={vcard.location} />}
                        </div>
                        <WaveDivider fromColor={MINT_BG} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── SERVICES ────────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ background: WHITE, padding: '0 16px 28px' }}>
                        <SectionHeading title="Services" accentColor={pc} textColor={TEXT} />
                        <ServiceCarousel 
                            services={vcard.services} 
                            autoplay={vcard.servicesAutoplay} 
                            primaryColor={pc} 
                            renderCard={(s, i) => (
                                <div style={{ padding: '18px 20px', borderRadius: 20, background: MINT_BG, border: `1px solid ${BORDER}`, boxShadow: SOFT_SHADOW }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: TEXT }}>{s.title}</h3>
                                        {s.price && <span style={{ fontWeight: 800, color: pc, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{s.price}</span>}
                                    </div>
                                    {s.description && <p style={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.65, margin: 0 }}>{s.description}</p>}
                                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', background: pc, padding: '6px 14px', borderRadius: 20, textDecoration: 'none', marginTop: 12, display: 'inline-block' }}>Learn More →</a>}
                                </div>
                            )}
                        />
                    </div>
                )}

                {/* ─── GALLERY ────────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, padding: '28px 16px' }}>
                            <SectionHeading title="Gallery" accentColor={pc} textColor={TEXT} />
                            <GalleryGrid images={vcard.gallery} borderRadius={20} gap={10} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                        </div>
                        <WaveDivider fromColor={MINT_BG} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ background: WHITE, padding: '0 16px 28px' }}>
                        <SectionHeading title="Client Reviews" accentColor={pc} textColor={TEXT} />
                        <TestimonialCard testimonials={vcard.testimonials} cardStyle={{ background: MINT_BG, border: `1px solid ${BORDER}` }} quoteColor={MUTED} autoplay={vcard.testimonialsAutoplay} perView={vcard.testimonialsPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── BUSINESS HOURS ──────────────────────────────────────── */}
                {vcard.businessHours && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, padding: '28px 16px 32px' }}>
                            {/* Section heading with icon */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${pc}, ${PC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: TEXT, margin: 0 }}>Availability</h2>
                            </div>

                            {/* White card wrapper for strong contrast */}
                            <div style={{
                                background: WHITE,
                                borderRadius: 20,
                                overflow: 'hidden',
                                boxShadow: `0 8px 32px rgba(16,185,129,0.15), 0 2px 8px rgba(0,0,0,0.06)`,
                                border: `1px solid rgba(16,185,129,0.2)`,
                            }}>
                                <BusinessHoursTable
                                    hours={vcard.businessHours}
                                    accentColor={pc}
                                    rowBg="rgba(16,185,129,0.07)"
                                    borderColor="rgba(16,185,129,0.15)"
                                    textColor={TEXT}
                                />
                            </div>
                        </div>
                        <WaveDivider fromColor={MINT_BG} toColor={WHITE} flip />
                    </>
                )}



                {/* ─── BOOKING ─────────────────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ background: WHITE, padding: '0 16px 28px' }}>
                        <SectionHeading title={vcard.booking.heading || 'Book an Appointment'} accentColor={pc} textColor={TEXT} />
                        {vcard.booking.description && <p style={{ fontSize: '0.85rem', color: MUTED, textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>{vcard.booking.description}</p>}
                        {vcard.booking.url
                            ? <a href={vcard.booking.url} target="_blank" rel="noreferrer" style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>📅 {vcard.booking.buttonLabel || 'Book Now'}</a>
                            : <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        }
                    </div>
                )}

                {/* ─── ENQUIRY ─────────────────────────────────────────────── */}
                {vcard.enquiryForm?.enabled && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, padding: '28px 16px' }}>
                            <SectionHeading title={vcard.enquiryForm.heading || 'Get In Touch'} accentColor={pc} textColor={TEXT} />
                            <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                        <WaveDivider fromColor={MINT_BG} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── INSTAGRAM ─────────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ background: WHITE, padding: '0 16px 28px' }}>
                        <SectionHeading title="Instagram" accentColor={pc} textColor={TEXT} />
                        <InstagramSection posts={vcard.instagramPosts} borderColor={BORDER} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ─── FOOTER ─────────────────────────────────────────────── */}
                {!vcard.hideBranding && (
                    <>
                        <WaveDivider fromColor={WHITE} toColor={MINT_BG} />
                        <div style={{ background: MINT_BG, textAlign: 'center', padding: '20px 16px 90px' }}>
                            <p style={{ fontSize: '0.72rem', color: TEXT, letterSpacing: '0.06em', fontWeight: 500, opacity: 0.7 }}>
                                Created by{' '}
                                <a href="/" target="_blank" rel="noreferrer" style={{ color: pc, fontWeight: 700, textDecoration: 'none' }}>
                                    {vcard.appName || 'BitsLab vCard'}
                                </a>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
