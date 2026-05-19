/**
 * TECH & STARTUP VCARD THEME — Complete Redesign
 * Design: Vercel/Linear-inspired dark glassmorphism. Animated gradient orbs,
 *         frosted glass cards, neon accent glows, modern sans typography.
 *         Clean, premium, startup-ready.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Share2, Mail, Phone, MapPin, ExternalLink, ArrowRight, Zap, Star, Clock, ChevronRight } from 'lucide-react';
import {
    SaveContactBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    InstagramSection, ServiceCarousel, HeroSlider
} from './VcardShared';

/* ── Palette ─────────────────────────────────────────────────────────────── */
const BG      = '#060608';
const SURFACE = 'rgba(255,255,255,0.04)';
const GLASS   = 'rgba(255,255,255,0.06)';
const BORDER  = 'rgba(255,255,255,0.08)';
const BORDER2 = 'rgba(255,255,255,0.12)';
const TEXT    = '#f0f0f5';
const MUTED   = 'rgba(240,240,245,0.45)';
const MUTED2  = 'rgba(240,240,245,0.65)';

/* ── CSS keyframes injected once ─────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(40px,-60px) scale(1.15);} 66%{transform:translate(-30px,30px) scale(0.9);} }
  @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-50px,40px) scale(1.2);} 66%{transform:translate(30px,-20px) scale(0.85);} }
  @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20px,-40px) scale(1.1);} }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
  @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5);} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0);} }
  @keyframes shimmer { 0%{background-position:200% center;} 100%{background-position:-200% center;} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
  @keyframes scanX { 0%{transform:translateX(-100%);} 100%{transform:translateX(100vw);} }
  .tech-card { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; }
  .tech-card:hover { transform: translateY(-3px); }
  .tech-contact-row { transition: all 0.25s ease; }
  .tech-contact-row:hover { background: rgba(255,255,255,0.08) !important; transform: translateX(4px); }
  .tech-service-card { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .tech-service-card:hover { transform: translateY(-4px) scale(1.01); }
  .tech-cta-btn { transition: all 0.25s ease; }
  .tech-cta-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
`;

/* ── Sub-components ──────────────────────────────────────────────────────── */

function TechSectionLabel({ label, pc }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 3, height: 18, borderRadius: 99, background: `linear-gradient(180deg, ${pc}, ${pc}40)` }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: pc, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${pc}30, transparent)` }} />
        </div>
    );
}

function GlowDivider({ pc }) {
    return (
        <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc, boxShadow: `0 0 10px ${pc}` }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: pc, opacity: 0.5 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc, boxShadow: `0 0 10px ${pc}` }} />
            <div style={{ flex: 1, height: 1, background: BORDER }} />
        </div>
    );
}

function ContactRow({ href, icon, label, value, pc }) {
    const El = href ? 'a' : 'div';
    return (
        <El href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
            className="tech-contact-row"
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: SURFACE, border: `1px solid ${BORDER}`,
                textDecoration: 'none', color: TEXT, marginBottom: 10,
            }}
        >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${pc}18`, border: `1px solid ${pc}30`, color: pc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT }}>{value}</p>
            </div>
            <ChevronRight size={14} color={MUTED} style={{ flexShrink: 0 }} />
        </El>
    );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function TechVcard({ vcard, onShare }) {
    const pc   = vcard.primaryColor || '#6366f1';
    const pc2  = pc; // use same hue, shift via opacity
    const [blink, setBlink] = useState(true);

    useEffect(() => {
        const t = setInterval(() => setBlink(b => !b), 530);
        return () => clearInterval(t);
    }, []);

    const inputStyle = {
        width: '100%', padding: '13px 16px', borderRadius: 12, fontSize: '0.9rem',
        border: `1px solid ${BORDER2}`, background: SURFACE, color: TEXT,
        outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };
    const btnStyle = {
        padding: '14px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
        color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
        background: `linear-gradient(135deg, ${pc}, ${pc}cc)`,
        boxShadow: `0 8px 24px ${pc}40`,
        transition: 'all 0.25s ease', letterSpacing: '0.01em', fontFamily: 'Inter, sans-serif',
    };

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif", color: TEXT }}>
            <style>{STYLES}</style>

            {/* Fixed ambient glows */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: `${pc}18`, filter: 'blur(100px)', animation: 'orb1 14s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '30%', right: '-15%', width: 400, height: 400, borderRadius: '50%', background: `${pc}12`, filter: 'blur(80px)', animation: 'orb2 18s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 300, height: 300, borderRadius: '50%', background: `${pc}0d`, filter: 'blur(70px)', animation: 'orb3 12s ease-in-out infinite' }} />
            </div>

            <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1, paddingBottom: 80 }}>

                {/* ── HERO ──────────────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} />
                        : (
                            <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${BG} 0%, #0d0d14 50%, ${pc}18 100%)`, position: 'relative', overflow: 'hidden' }}>
                                {/* Grid dots */}
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }} viewBox="0 0 430 240" preserveAspectRatio="xMidYMid slice">
                                    <defs>
                                        <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
                                            <circle cx="1" cy="1" r="1" fill={pc} />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#dots)" />
                                </svg>
                                {/* Scan line */}
                                <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, transparent, ${pc}80, transparent)`, animation: 'scanX 4s linear infinite', opacity: 0.6 }} />
                                {/* Center glow */}
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, borderRadius: '50%', background: `${pc}15`, filter: 'blur(50px)' }} />
                            </div>
                        )
                    }
                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,8,0.1) 0%, rgba(6,6,8,0.75) 100%)' }} />

                    {/* Share btn */}
                    <button onClick={onShare} style={{
                        position: 'absolute', top: 16, right: 16,
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
                        border: `1px solid ${BORDER2}`, color: TEXT,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Share2 size={16} />
                    </button>

                </div>

                {/* ── PROFILE CARD ─────────────────────────────────────── */}
                <div style={{ padding: '0 16px', marginTop: -28, position: 'relative', zIndex: 10, animation: 'fadeUp 0.5s ease forwards' }}>
                    <div className="tech-card" style={{
                        background: 'rgba(15,15,20,0.85)', backdropFilter: 'blur(24px)',
                        borderRadius: 24, border: `1px solid ${BORDER2}`,
                        padding: '24px 24px 20px',
                        boxShadow: `0 0 0 1px ${pc}20, 0 24px 60px rgba(0,0,0,0.6), 0 0 80px ${pc}10`,
                    }}>
                        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: 20,
                                    overflow: 'hidden', background: vcard.profileImage ? '#ffffff' : `${pc}20`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '2rem', fontWeight: 800, color: pc,
                                    border: `2px solid ${pc}40`,
                                    boxShadow: `0 0 20px ${pc}30`,
                                }}>
                                    {vcard.profileImage
                                        ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt={vcard.name} />
                                        : vcard.name?.charAt(0)
                                    }
                                </div>

                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vcard.name}</span>
                                    <span style={{ opacity: blink ? 1 : 0, color: pc, transition: 'opacity 0.1s', fontSize: '1.2rem' }}>|</span>
                                </h1>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: pc, marginBottom: 4, letterSpacing: '-0.01em' }}>{vcard.designation}</p>
                                {vcard.company && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: SURFACE, border: `1px solid ${BORDER}` }}>
                                        <Zap size={10} color={MUTED2} />
                                        <span style={{ fontSize: '0.72rem', color: MUTED2, fontWeight: 500 }}>{vcard.company}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {vcard.bio && (
                            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: MUTED2, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                                {vcard.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── CTA ──────────────────────────────────────────────── */}
                <div style={{ padding: '14px 16px 0' }}>
                    <SaveContactBtn vcard={vcard} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '15px 20px', borderRadius: 14, fontWeight: 700, fontSize: '0.9rem',
                        color: '#fff', textDecoration: 'none', letterSpacing: '0.01em',
                        background: `linear-gradient(135deg, ${pc}ee, ${pc}99)`,
                        boxShadow: `0 8px 28px ${pc}40`,
                    }} className="tech-cta-btn">
                        Save Contact
                    </SaveContactBtn>
                </div>

                {/* ── SOCIAL LINKS ─────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ padding: '20px 16px 0' }}>
                        <SocialLinksRow
                            links={vcard.socialLinks}
                            containerStyle={{ justifyContent: 'center', flexWrap: 'wrap' }}
                            itemStyle={{ borderRadius: 14 }}
                        />
                    </div>
                )}

                {/* ── CONTACT ──────────────────────────────────────────── */}
                {(vcard.phone || vcard.alternatePhone || vcard.email || vcard.location) && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Contact" pc={pc} />
                        {vcard.phone && <ContactRow href={`tel:${vcard.phone}`} icon={<Phone size={16} />} label="Mobile" value={vcard.phone} pc={pc} />}
                        {vcard.alternatePhone && <ContactRow href={`tel:${vcard.alternatePhone}`} icon={<Phone size={16} />} label="Work" value={vcard.alternatePhone} pc={pc} />}
                        {vcard.email && <ContactRow href={`mailto:${vcard.email}`} icon={<Mail size={16} />} label="Email" value={vcard.email} pc={pc} />}
                        {vcard.location && <ContactRow href={null} icon={<MapPin size={16} />} label="Location" value={vcard.location} pc={pc} />}
                    </div>
                )}

                {/* ── SERVICES ─────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Services" pc={pc} />
                        <ServiceCarousel
                            services={vcard.services}
                            autoplay={vcard.servicesAutoplay}
                            primaryColor={pc}
                            renderCard={(s) => (
                                <div className="tech-service-card" style={{
                                    background: GLASS, border: `1px solid ${BORDER2}`,
                                    borderRadius: 18, padding: '20px',
                                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
                                    position: 'relative', overflow: 'hidden', height: '100%',
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                    {/* top accent line */}
                                    <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 2, borderRadius: 99, background: `linear-gradient(90deg, transparent, ${pc}, transparent)` }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>{s.title}</h3>
                                        {s.price && (
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: pc, background: `${pc}18`, padding: '3px 10px', borderRadius: 99, border: `1px solid ${pc}30`, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
                                                {s.price}
                                            </span>
                                        )}
                                    </div>
                                    {s.description && <p style={{ fontSize: '0.82rem', color: MUTED2, lineHeight: 1.65, margin: 0, flex: 1 }}>{s.description}</p>}
                                    {s.url && (
                                        <a href={s.url} target="_blank" rel="noreferrer" style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            fontSize: '0.78rem', fontWeight: 600, color: pc,
                                            textDecoration: 'none', marginTop: 14,
                                        }}>
                                            Learn More <ArrowRight size={12} />
                                        </a>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                )}

                {/* ── GALLERY ──────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Work" pc={pc} />
                        <GalleryGrid images={vcard.gallery} borderRadius={14} gap={10} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ── TESTIMONIALS ─────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Testimonials" pc={pc} />
                        <TestimonialCard
                            testimonials={vcard.testimonials}
                            cardStyle={{ background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 18, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', padding: 20 }}
                            quoteColor={MUTED2}
                            nameColor={TEXT}
                            autoplay={vcard.testimonialsAutoplay}
                            perView={vcard.testimonialsPerView || 1}
                            primaryColor={pc}
                        />
                    </div>
                )}

                {/* ── BUSINESS HOURS ────────────────────────────────────── */}
                {vcard.businessHours && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Availability" pc={pc} />
                        <BusinessHoursTable hours={vcard.businessHours} accentColor={pc} rowBg={SURFACE} borderColor={BORDER} textColor={TEXT} />
                    </div>
                )}

                {/* ── BOOKING ───────────────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Book a Meeting" pc={pc} />
                        <div style={{ background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 20, padding: '24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                            {vcard.booking.heading && <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8, textAlign: 'center' }}>{vcard.booking.heading}</h2>}
                            {vcard.booking.description && <p style={{ fontSize: '0.82rem', color: MUTED2, marginBottom: 20, textAlign: 'center', lineHeight: 1.6 }}>{vcard.booking.description}</p>}
                            <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                    </div>
                )}

                {/* ── ENQUIRY ───────────────────────────────────────────── */}
                {vcard.enquiryForm?.enabled && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label={vcard.enquiryForm.heading || 'Get In Touch'} pc={pc} />
                        <div style={{ background: GLASS, border: `1px solid ${BORDER2}`, borderRadius: 20, padding: '24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                            <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                    </div>
                )}

                {/* ── INSTAGRAM ─────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ padding: '32px 16px 0' }}>
                        <TechSectionLabel label="Instagram" pc={pc} />
                        <InstagramSection posts={vcard.instagramPosts} borderColor={BORDER2} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ── FOOTER ────────────────────────────────────────────── */}
                <GlowDivider pc={pc} />
                {!vcard.hideBranding && (
                    <div style={{ textAlign: 'center', padding: '0 16px 20px', opacity: 0.5 }}>
                        <p style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.05em', fontWeight: 500 }}>
                            Created by <a href="/" target="_blank" rel="noreferrer" style={{ color: pc, textDecoration: 'none', fontWeight: 600 }}>{vcard.appName || 'BitsLab vCard'}</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
