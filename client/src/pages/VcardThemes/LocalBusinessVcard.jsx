/**
 * LOCAL BUSINESS VCARD THEME — Premium Redesign
 *
 * Design Language: Bold amber/gold + deep charcoal — rich, warm, trustworthy.
 * Layout: Full-bleed cinematic hero → floating glassmorphic profile card →
 *         dark-on-light alternating sections with premium micro-details.
 * Signature: Animated "Open Now" pulse ring, decorative corner accents,
 *            gold shimmer dividers, premium card hover lift.
 */

import React from 'react';
import { Share2, MapPin, Phone, Mail, Star, ExternalLink, ChevronRight } from 'lucide-react';
import {
    SaveContactBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    InstagramSection, ServiceCarousel, HeroSlider
} from './VcardShared';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const AMBER  = '#f59e0b';
const GOLD   = '#fbbf24';
const PEACH  = '#ffedd5';   // warm section bg
const CREAM  = '#fffbeb';   // page bg
const WHITE  = '#ffffff';
const BORDER_LIGHT = 'rgba(245,158,11,0.2)';
const BORDER_WARM  = 'rgba(245,158,11,0.3)';
const TEXT_DARK    = '#431407';
const TEXT_MUTED   = 'rgba(67,20,7,0.5)';
const SHADOW_AMBER = '0 12px 40px rgba(245,158,11,0.22)';
const SHADOW_SM    = '0 4px 20px rgba(0,0,0,0.06)';

/* ─── CSS Animations ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  @keyframes pulseRing {
    0%   { transform: scale(1);   opacity: 0.6; }
    70%  { transform: scale(1.35); opacity: 0; }
    100% { transform: scale(1.35); opacity: 0; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes floatUp {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes drift {
    0%   { transform: translate(0, 0) scale(1);   opacity: 0.55; }
    33%  { transform: translate(6px, -10px) scale(1.1); opacity: 0.8; }
    66%  { transform: translate(-4px, 5px) scale(0.95); opacity: 0.45; }
    100% { transform: translate(0, 0) scale(1);   opacity: 0.55; }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
    50%       { opacity: 1; transform: scale(1.2) rotate(180deg); }
  }
  @keyframes bounceDot {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes zigIn {
    from { stroke-dashoffset: 600; }
    to   { stroke-dashoffset: 0; }
  }
  .lb-card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease; }
  .lb-card-hover:hover { transform: translateY(-3px); box-shadow: ${SHADOW_AMBER}; }
`;

/* ─── Polka Dot Background Layer ────────────────────────────────────────── */
const DOTS_LIGHT = [
  [18,22],[72,8],[130,30],[200,12],[280,28],[340,8],[390,20],
  [45,55],[110,70],[175,52],[245,68],[315,50],[385,62],
  [25,92],[90,108],[160,88],[230,104],[300,90],[375,100],
  [55,130],[140,148],[210,128],[285,144],[360,132],
];
const DOTS_DARK = [
  [20,15],[80,5],[150,25],[220,10],[300,22],[375,8],
  [40,50],[110,62],[180,45],[255,60],[330,48],[400,58],
  [15,95],[88,108],[165,90],[240,104],[318,95],[390,108],
  [60,135],[135,148],[208,132],[285,145],[360,138],
];

function PolkaDotBg({ dark = false, height = 160 }) {
    const dots = dark ? DOTS_DARK : DOTS_LIGHT;
    const fill = dark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)';
    const fill2 = dark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)';
    return (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox={`0 0 430 ${height}`} preserveAspectRatio="xMidYMid slice">
            {dots.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 5 : i % 3 === 1 ? 3.5 : 2.5}
                    fill={i % 2 === 0 ? fill : fill2}
                    style={{ animation: `drift ${3.5 + (i % 4) * 0.8}s ease-in-out ${i * 0.15}s infinite` }}
                />
            ))}
        </svg>
    );
}

/* ─── Floating Sparkle Stars ─────────────────────────────────────────────── */
function SparkleBar({ dark = false }) {
    const c = dark ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.4)';
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            {[0,1,2,3,4].map(i => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                    style={{ animation: `sparkle ${1.8 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` }}
                >
                    <path d="M12 2l2.09 6.26L20 9.27l-4.73 4.61 1.12 6.52L12 17.27l-4.39 2.63 1.12-6.52L4 9.27l5.91-.91z"
                        fill={c} />
                </svg>
            ))}
        </div>
    );
}

/* ─── Smooth Wave Section Divider ──────────────────────────────────────── */
function ZigZag({ fromColor, toColor, flip = false }) {
    // When flipped, swap colors so the visual result is correct:
    // the wave always shows fromColor above and toColor below.
    const effectiveFrom = flip ? toColor : fromColor;
    const effectiveTo   = flip ? fromColor : toColor;
    return (
        <div style={{ lineHeight: 0, transform: flip ? 'scaleY(-1)' : 'none', marginTop: -1 }}>
            <svg viewBox="0 0 430 36" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
                style={{ width: '100%', height: 36, display: 'block', background: effectiveFrom || 'transparent' }}>
                <path d="M0,18 C72,36 144,0 215,18 C286,36 358,0 430,18 L430,36 L0,36 Z"
                    fill={effectiveTo || WHITE}
                />
            </svg>
        </div>
    );
}

/* ─── Bouncing Dots Row ──────────────────────────────────────────────────── */
function BouncingDots({ color = AMBER }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0' }}>
            {[0,1,2,3,4,5,6].map(i => (
                <div key={i} style={{
                    width: i % 2 === 0 ? 8 : 5,
                    height: i % 2 === 0 ? 8 : 5,
                    borderRadius: '50%',
                    background: i % 3 === 0 ? color : i % 3 === 1 ? `${color}80` : `${color}40`,
                    animation: `bounceDot ${1 + i * 0.12}s ease-in-out ${i * 0.1}s infinite`,
                }} />
            ))}
        </div>
    );
}

/* ─── Decorative Corner Ring ─────────────────────────────────────────────── */
function CornerRing({ top, right, left, bottom, size = 60, dark = false }) {
    const c = dark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)';
    return (
        <div style={{ position: 'absolute', top, right, left, bottom, width: size, height: size, borderRadius: '50%', border: `2px solid ${c}`, pointerEvents: 'none', animation: 'rotateSlow 12s linear infinite' }} />
    );
}

/* ─── Open/Closed Live Badge ─────────────────────────────────────────────── */
function LiveStatusBadge({ hours }) {
    if (!hours) return null;
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const day = hours[dayName];
    const toMins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = toMins(day?.open);
    const closeMins = toMins(day?.close);
    const isOpen = day?.enabled && openMins !== null && closeMins !== null
        && nowMins >= openMins && nowMins < closeMins;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isOpen ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`, position: 'relative' }}>
            {isOpen && (
                <span style={{ position: 'absolute', left: 14, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulseRing 1.8s ease-out infinite' }} />
            )}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOpen ? '#22c55e' : '#ef4444', flexShrink: 0, zIndex: 1 }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isOpen ? '#15803d' : '#b91c1c', letterSpacing: '0.04em' }}>
                {isOpen ? `Open · Closes ${day.close}` : 'Closed Now'}
            </span>
        </div>
    );
}

/* ─── Gold Shimmer Divider ───────────────────────────────────────────────── */
function GoldDivider() {
    return (
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #f59e0b, #fbbf24, #f59e0b, transparent)', margin: '0 24px', borderRadius: 99, backgroundSize: '400px 100%', animation: 'shimmer 2.5s linear infinite' }} />
    );
}

/* ─── Section Title (dark version for alternating sections) ──────────────── */
function SectionTitle({ title, sub, light = false }) {
    const c = light ? WHITE : TEXT_DARK;
    const ac = AMBER;
    return (
        <div style={{ marginBottom: 22, animation: 'fadeSlideIn 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 22, borderRadius: 99, background: `linear-gradient(${ac}, ${GOLD})` }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: c, letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
            </div>
            {sub && <p style={{ fontSize: '0.78rem', color: light ? 'rgba(255,255,255,0.6)' : TEXT_MUTED, marginLeft: 14, lineHeight: 1.5 }}>{sub}</p>}
        </div>
    );
}

/* ─── Premium Contact Row ─────────────────────────────────────────────────── */
function ContactRow({ href, icon: Icon, iconColor, label, value, external }) {
    const El = href ? 'a' : 'div';
    return (
        <El href={href} target={external ? '_blank' : undefined} rel="noreferrer"
            className="lb-card-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: WHITE, border: `1px solid ${BORDER_LIGHT}`, textDecoration: 'none', color: TEXT_DARK, marginBottom: 10, boxShadow: SHADOW_SM }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${AMBER}22, ${GOLD}33)`, border: `1.5px solid ${BORDER_LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={AMBER} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT_DARK }}>{value}</p>
            </div>
            {external && <ChevronRight size={14} color={TEXT_MUTED} />}
        </El>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function LocalBusinessVcard({ vcard, onShare }) {
    const pc = vcard.primaryColor || AMBER;
    const pc2 = GOLD;

    const inputStyle = {
        width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: '0.875rem',
        border: `1.5px solid ${BORDER_LIGHT}`, background: WHITE, color: TEXT_DARK,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        boxShadow: SHADOW_SM, transition: 'border-color 0.2s',
    };
    const btnStyle = {
        padding: '14px 20px', borderRadius: 14, fontWeight: 800, fontSize: '0.95rem',
        color: TEXT_DARK, border: 'none', cursor: 'pointer', width: '100%',
        background: `linear-gradient(135deg, ${pc}, ${pc2})`,
        boxShadow: SHADOW_AMBER, transition: 'all 0.2s',
    };

    return (
        <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            <style>{GLOBAL_CSS}</style>

            <div style={{ width: '100%', maxWidth: 430, position: 'relative' }}>

                {/* ─── HERO BANNER ─────────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 240, overflow: 'hidden', background: `linear-gradient(135deg, #92400e 0%, #b45309 55%, #d97706 100%)` }}>
                    {/* Hero image / slider */}
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0) && (
                        <div style={{ position: 'absolute', inset: 0 }}>
                            <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} style={{ objectFit: 'cover' }} />
                        </div>
                    )}
                    {/* Dark gradient overlay for text readability — only when image present and overlay not disabled */}
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? (vcard.heroMedia?.overlay !== false && (
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />
                        ))
                        : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(120,53,15,0.2) 0%, rgba(120,53,15,0.5) 100%)', zIndex: 1 }} />
                    }
                    {/* Subtle rotating corner rings only */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                        <CornerRing top={-20} right={-20} size={90} dark={false} />
                        <CornerRing bottom={-15} left={-15} size={70} dark={false} />
                        <CornerRing top={60} right={30} size={36} dark={false} />
                    </div>

                    {/* Share button */}
                    <button onClick={onShare} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Share2 size={16} />
                    </button>
                </div>

                {/* ─── PROFILE FLOAT CARD ───────────────────────────────────── */}
                <div style={{ background: WHITE, margin: '12px 16px 0', borderRadius: 20, position: 'relative', zIndex: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.09)', border: `1px solid ${BORDER_LIGHT}`, overflow: 'hidden' }}>

                    {/* Horizontal layout: avatar left, details center, status right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px 10px' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: `conic-gradient(${AMBER}, ${GOLD}, ${AMBER})`, padding: 2 }}>
                                <div style={{ borderRadius: '50%', background: WHITE, width: '100%', height: '100%' }} />
                            </div>
                            <div style={{ width: 62, height: 62, borderRadius: '50%', overflow: 'hidden', background: vcard.profileImage ? WHITE : `linear-gradient(135deg, ${AMBER}, ${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, color: TEXT_DARK, position: 'relative', zIndex: 1, border: `2px solid ${WHITE}` }}>
                                {vcard.profileImage
                                    ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} alt={vcard.name} />
                                    : vcard.name?.charAt(0)
                                }
                            </div>
                        </div>

                        {/* Name + details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: TEXT_DARK, letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 2px' }}>{vcard.name}</h1>
                            {vcard.designation && <p style={{ fontSize: '0.78rem', fontWeight: 600, color: AMBER, margin: '0 0 2px' }}>{vcard.designation}</p>}
                            {vcard.company && <p style={{ fontSize: '0.72rem', color: TEXT_MUTED, margin: 0, fontWeight: 500 }}>{vcard.company}</p>}
                        </div>

                        {/* Status badge — right side, vertically centered */}
                        {vcard.businessHours && (
                            <div style={{ flexShrink: 0 }}>
                                <LiveStatusBadge hours={vcard.businessHours} />
                            </div>
                        )}
                    </div>

                    {/* Thin separator line */}
                    <div style={{ height: 1, background: BORDER_LIGHT, margin: '0 16px' }} />

                    {/* CTA */}
                    <div style={{ padding: '10px 16px 12px' }}>
                        <SaveContactBtn vcard={vcard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 20px', borderRadius: 12, fontWeight: 800, fontSize: '0.88rem', color: WHITE, textDecoration: 'none', background: '#d97706', boxShadow: SHADOW_AMBER, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                            Save to Contacts
                        </SaveContactBtn>
                    </div>
                </div>

                {/* ─── SOCIAL LINKS ────────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ background: CREAM, padding: '20px 16px 12px' }}>
                        <SocialLinksRow links={vcard.socialLinks} containerStyle={{ justifyContent: 'center' }} itemStyle={{ borderRadius: 14 }} />
                    </div>
                )}

                {/* ─── BIO ─────────────────────────────────────────────────── */}
                {vcard.bio && (
                    <div style={{ margin: '16px 16px 0', background: WHITE, borderRadius: 20, padding: '20px 20px', boxShadow: SHADOW_SM, border: `1px solid ${BORDER_LIGHT}` }}>
                        <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: TEXT_DARK, textAlign: 'center', margin: 0 }}>"{vcard.bio}"</p>
                    </div>
                )}

                {/* ─── CONTACT ─────────────────────────────────────────────── */}
                {(vcard.phone || vcard.alternatePhone || vcard.email || vcard.location) && (
                    <>
                        <ZigZag fromColor={WHITE} toColor={PEACH} />
                        <div style={{ background: PEACH, padding: '20px 16px 32px', position: 'relative', overflow: 'hidden' }}>
                            <PolkaDotBg dark={false} height={200} />
                            <CornerRing top={-10} right={10} size={55} dark={false} />
                            <CornerRing bottom={10} left={-10} size={42} dark={false} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <SparkleBar dark={false} />
                                <SectionTitle title="Get In Touch" />
                                {vcard.phone && <ContactRow href={`tel:${vcard.phone}`} icon={Phone} label="Phone" value={vcard.phone} />}
                                {vcard.alternatePhone && <ContactRow href={`tel:${vcard.alternatePhone}`} icon={Phone} label="Alt Phone" value={vcard.alternatePhone} />}
                                {vcard.email && <ContactRow href={`mailto:${vcard.email}`} icon={Mail} label="Email" value={vcard.email} external />}
                                {vcard.location && <ContactRow href={null} icon={MapPin} label="Location" value={vcard.location} />}
                            </div>
                        </div>
                        <ZigZag fromColor={PEACH} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── SERVICES ────────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ background: WHITE, padding: '20px 16px 28px' }}>
                        <BouncingDots />
                        <SectionTitle title="Our Services" />
                        <ServiceCarousel
                            services={vcard.services}
                            autoplay={vcard.servicesAutoplay}
                            primaryColor={pc}
                            renderCard={(s) => (
                                <div className="lb-card-hover" style={{ padding: '20px', borderRadius: 20, background: CREAM, border: `1px solid ${BORDER_LIGHT}`, boxShadow: SHADOW_SM }}>
                                    {s.price && (
                                        <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 99, background: `linear-gradient(135deg, ${AMBER}20, ${GOLD}30)`, border: `1px solid ${BORDER_LIGHT}`, marginBottom: 10 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: AMBER }}>{s.price}</span>
                                        </div>
                                    )}
                                    <h3 style={{ fontWeight: 800, fontSize: '1rem', color: TEXT_DARK, marginBottom: 6 }}>{s.title}</h3>
                                    {s.description && <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{s.description}</p>}
                                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, padding: '7px 14px', background: `linear-gradient(135deg, ${pc}, ${pc2})`, color: TEXT_DARK, fontSize: '0.75rem', fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}>View More <ExternalLink size={11} /></a>}
                                </div>
                            )}
                        />
                    </div>
                )}

                {/* ─── GALLERY ─────────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <>
                        <ZigZag fromColor={WHITE} toColor={PEACH} />
                        <div style={{ background: PEACH, padding: '20px 16px 32px', position: 'relative', overflow: 'hidden' }}>
                            <PolkaDotBg dark={false} height={220} />
                            <CornerRing top={-15} left={10} size={65} dark={false} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <SparkleBar dark={false} />
                                <SectionTitle title="Our Work" />
                                <GalleryGrid images={vcard.gallery} borderRadius={18} gap={10} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                            </div>
                        </div>
                        <ZigZag fromColor={PEACH} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ background: WHITE, padding: '20px 16px 28px' }}>
                        <BouncingDots />
                        <SectionTitle title="What Customers Say" />
                        <TestimonialCard testimonials={vcard.testimonials} cardStyle={{ background: CREAM, border: `1px solid ${BORDER_LIGHT}`, boxShadow: SHADOW_SM, borderRadius: 20 }} quoteColor={TEXT_MUTED} autoplay={vcard.testimonialsAutoplay} perView={vcard.testimonialsPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── BUSINESS HOURS ──────────────────────────────────────── */}
                {vcard.businessHours && (
                    <>
                        <ZigZag fromColor={WHITE} toColor={PEACH} />
                        <div style={{ background: PEACH, padding: '20px 16px 32px', position: 'relative', overflow: 'hidden' }}>
                            <PolkaDotBg dark={false} height={220} />
                            <CornerRing top={-10} right={-10} size={60} dark={false} />
                            <CornerRing bottom={10} left={10} size={38} dark={false} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <SparkleBar dark={false} />
                                <SectionTitle title="Opening Hours" />
                                <div style={{ background: WHITE, borderRadius: 20, overflow: 'hidden', border: `1px solid ${BORDER_WARM}`, boxShadow: SHADOW_AMBER }}>
                                    <BusinessHoursTable hours={vcard.businessHours} accentColor={pc} rowBg="rgba(245,158,11,0.06)" borderColor={BORDER_LIGHT} textColor={TEXT_DARK} />
                                </div>
                            </div>
                        </div>
                        <ZigZag fromColor={PEACH} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── BOOKING ─────────────────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ background: WHITE, padding: '28px 16px' }}>
                        <SectionTitle title={vcard.booking.heading || 'Make a Reservation'} />
                        {vcard.booking.description && <p style={{ fontSize: '0.85rem', color: TEXT_MUTED, textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>{vcard.booking.description}</p>}
                        {vcard.booking.url
                            ? <a href={vcard.booking.url} target="_blank" rel="noreferrer" style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>📅 {vcard.booking.buttonLabel || 'Book Now'}</a>
                            : <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        }
                    </div>
                )}

                {/* ─── ENQUIRY ─────────────────────────────────────────────── */}
                {vcard.enquiryForm?.enabled && (
                    <>
                        <ZigZag fromColor={WHITE} toColor={PEACH} />
                        <div style={{ background: PEACH, padding: '20px 16px 32px', position: 'relative', overflow: 'hidden' }}>
                            <PolkaDotBg dark={false} height={180} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <SparkleBar dark={false} />
                                <SectionTitle title={vcard.enquiryForm.heading || 'Send a Message'} />
                                <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                            </div>
                        </div>
                        <ZigZag fromColor={PEACH} toColor={WHITE} flip />
                    </>
                )}

                {/* ─── INSTAGRAM ───────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ background: WHITE, padding: '28px 16px' }}>
                        <SectionTitle title="Instagram" />
                        <InstagramSection posts={vcard.instagramPosts} borderColor={BORDER_LIGHT} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ─── FOOTER ──────────────────────────────────────────────── */}
                {!vcard.hideBranding && (
                    <>
                        <ZigZag fromColor={WHITE} toColor={PEACH} />
                        <div style={{ background: PEACH, textAlign: 'center', padding: '16px 16px 90px', position: 'relative', overflow: 'hidden' }}>
                            <PolkaDotBg dark={false} height={110} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <BouncingDots color={AMBER} />
                                <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, letterSpacing: '0.06em' }}>
                                    Created by{' '}
                                    <a href="/" target="_blank" rel="noreferrer" style={{ color: AMBER, fontWeight: 700, textDecoration: 'none' }}>
                                        {vcard.appName || 'BitsLab vCard'}
                                    </a>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
