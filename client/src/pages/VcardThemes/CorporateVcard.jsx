/**
 * CORPORATE EXECUTIVE VCARD THEME (Modern Apple-Style Redesign)
 * 
 * Design Language: Ultra-clean, modern, minimalist, world-class (Apple-inspired).
 * Layout: Edge-to-edge subtle mesh/image hero, overlapping central avatar,
 *         clean typography with tight tracking, floating pure white cards with soft shadows.
 * Features: High use of whitespace, pill-shaped buttons, glassmorphic headers.
 */

import React, { useState, useEffect } from 'react';
import { Share2, Mail, Phone, Globe, MapPin, ExternalLink, Briefcase, Award, ArrowRight } from 'lucide-react';
import {
    SaveContactBtn, ShareBtn, SocialLinksRow, GalleryGrid,
    TestimonialCard, BusinessHoursTable, EnquiryForm, BookingForm,
    SectionHeading, InstagramSection, ServiceCarousel, HeroSlider
} from './VcardShared';

// Core Apple-style palette
const BG = '#f5f5f7';          // Very light gray background
const CARD_BG = '#ffffff';     // Pure white cards
const TEXT_MAIN = '#1d1d1f';   // Deep slate for primary text
const TEXT_MUTED = '#86868b';  // Soft gray for secondary text
const BORDER = 'rgba(0,0,0,0.06)'; // Extremely subtle border
const DEFAULT_PC = '#0071e3';  // Apple blue default if no color picked

// ─── Contact Row ───────────────────────────────────────────────────────────
function ContactRow({ href, icon, label, value, external, pc }) {
    const El = href ? 'a' : 'div';
    return (
        <El href={href} target={external ? '_blank' : undefined} rel="noreferrer"
            style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px', borderRadius: 16,
                background: CARD_BG, border: `1px solid ${BORDER}`,
                textDecoration: 'none', color: TEXT_MAIN,
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                marginBottom: 10,
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}
            onMouseOver={e => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
                e.currentTarget.style.transform = 'none';
            }}
        >
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${pc}12`, color: pc, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TEXT_MAIN }}>{value}</p>
            </div>
            {external && <ExternalLink size={16} color={TEXT_MUTED} style={{ flexShrink: 0 }} />}
        </El>
    );
}

// ─── Apple-style Section Heading ─────────────────────────────────────────
function CleanHeading({ title }) {
    return (
        <h2 style={{
            fontSize: '1.4rem', fontWeight: 700, color: TEXT_MAIN,
            letterSpacing: '-0.02em', marginBottom: 20, textAlign: 'center'
        }}>
            {title}
        </h2>
    );
}

export default function CorporateVcard({ vcard, onShare }) {
    const pc = vcard.primaryColor || DEFAULT_PC;

    // Apple-style input
    const inputStyle = {
        width: '100%', padding: '16px 20px', borderRadius: 14, fontSize: '0.95rem',
        border: `1px solid ${BORDER}`, background: '#f5f5f7',
        color: TEXT_MAIN, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        transition: 'all 0.2s ease',
    };

    // Apple-style primary pill button
    const btnStyle = {
        padding: '16px 24px', borderRadius: 100, fontWeight: 600, fontSize: '1rem',
        color: '#ffffff', border: 'none', cursor: 'pointer', width: '100%',
        background: pc,
        boxShadow: `0 8px 20px ${pc}40`,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        letterSpacing: '-0.01em',
    };

    return (
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

            <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1, paddingBottom: 60 }}>

                {/* ─── HERO BANNER ──────────────────────────────────────── */}
                <div style={{ position: 'relative', height: 260, overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
                    {(vcard.coverImage || vcard.heroMedia?.url || vcard.heroMedia?.urls?.length > 0)
                        ? <HeroSlider heroMedia={vcard.heroMedia} coverImage={vcard.coverImage} />
                        : (
                            <div style={{
                                width: '100%', height: '100%',
                                background: `radial-gradient(circle at 50% 0%, ${pc}22 0%, #f5f5f7 100%)`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Abstract soft mesh/blur elements with animation */}
                                <style>
                                    {`
                                        @keyframes float {
                                            0% { transform: translate(0px, 0px) scale(1); }
                                            33% { transform: translate(30px, -50px) scale(1.1); }
                                            66% { transform: translate(-20px, 20px) scale(0.9); }
                                            100% { transform: translate(0px, 0px) scale(1); }
                                        }
                                        @keyframes float2 {
                                            0% { transform: translate(0px, 0px) scale(1); }
                                            33% { transform: translate(-30px, 50px) scale(1.2); }
                                            66% { transform: translate(20px, -20px) scale(0.8); }
                                            100% { transform: translate(0px, 0px) scale(1); }
                                        }
                                    `}
                                </style>
                                <div style={{ position: 'absolute', top: -50, left: -50, width: 250, height: 250, background: `${pc}44`, borderRadius: '50%', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', bottom: -50, right: -50, width: 250, height: 250, background: `${pc}33`, borderRadius: '50%', filter: 'blur(60px)', animation: 'float2 12s ease-in-out infinite' }} />
                            </div>
                        )
                    }

                    {/* Share button - Glassmorphic */}
                    <button onClick={onShare} style={{
                        position: 'absolute', top: 20, right: 20,
                        width: 44, height: 44, borderRadius: 22,
                        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid rgba(255,255,255,0.5)`, color: TEXT_MAIN,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        <Share2 size={18} />
                    </button>
                </div>

                {/* ─── PROFILE AVATAR & INFO (Card View) ────────────────── */}
                <div style={{ padding: '0 16px', marginTop: -20, position: 'relative', zIndex: 10 }}>
                    <div style={{
                        background: CARD_BG, borderRadius: 24, border: `1px solid ${BORDER}`,
                        padding: '24px', display: 'flex', gap: 20, alignItems: 'center',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.08)'
                    }}>
                        {/* Avatar on the Left */}
                        <div style={{ flexShrink: 0 }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: 50,
                                border: `2px solid ${BORDER}`, overflow: 'hidden',
                                background: vcard.profileImage ? '#fff' : pc,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem', fontWeight: 900, color: '#fff'
                            }}>
                                {vcard.profileImage
                                    ? <img src={vcard.profileImage} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt={vcard.name} />
                                    : vcard.name?.charAt(0)
                                }
                            </div>
                        </div>

                        {/* Info on the Right */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TEXT_MAIN, letterSpacing: '-0.03em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vcard.name}</span>
                                {vcard.isVerified && <Award size={18} color={pc} style={{ flexShrink: 0 }} />}
                            </h1>
                            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: TEXT_MUTED, letterSpacing: '-0.01em', marginBottom: 4 }}>{vcard.designation}</p>
                            {vcard.company && <p style={{ fontSize: '0.85rem', color: TEXT_MAIN, fontWeight: 600 }}>{vcard.company}</p>}
                        </div>
                    </div>
                </div>

                {/* ─── PRIMARY CTA ────────────────────────────────────────── */}
                <div style={{ padding: '12px 24px' }}>
                    <SaveContactBtn vcard={vcard} style={{ ...btnStyle, padding: '12px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', width: 'auto', borderRadius: 10 }}>
                        Save Contact
                    </SaveContactBtn>
                </div>

                {/* ─── BIO ────────────────────────────────────────────────── */}
                {vcard.bio && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: TEXT_MAIN, textAlign: 'center', fontWeight: 400 }}>
                            {vcard.bio}
                        </p>
                    </div>
                )}

                {/* ─── SOCIAL LINKS ────────────────────────────────────────── */}
                {vcard.socialLinks?.length > 0 && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <CleanHeading title="Connect" />
                        <SocialLinksRow links={vcard.socialLinks} containerStyle={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}
                            itemStyle={{ borderRadius: 14 }}
                        />
                    </div>
                )}

                {/* ─── CONTACT SECTION ────────────────────────────────────── */}
                {(vcard.phone || vcard.alternatePhone || vcard.email || vcard.location) && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <CleanHeading title="Contact" />
                        {vcard.phone && <ContactRow href={`tel:${vcard.phone}`} icon={<Phone size={18} />} label="Mobile" value={vcard.phone} pc={pc} />}
                        {vcard.alternatePhone && <ContactRow href={`tel:${vcard.alternatePhone}`} icon={<Phone size={18} />} label="Work" value={vcard.alternatePhone} pc={pc} />}
                        {vcard.email && <ContactRow href={`mailto:${vcard.email}`} icon={<Mail size={18} />} label="Email" value={vcard.email} pc={pc} />}
                        {vcard.location && <ContactRow href={null} icon={<MapPin size={18} />} label="Office" value={vcard.location} pc={pc} />}
                    </div>
                )}

                {/* ─── SERVICES ────────────────────────────────────────────── */}
                {vcard.services?.length > 0 && (
                    <div style={{ padding: '0 16px 32px' }}>
                        <CleanHeading title="Expertise" />
                        <ServiceCarousel
                            services={vcard.services}
                            autoplay={vcard.servicesAutoplay}
                            primaryColor={pc}
                            renderCard={(s) => (
                                <div style={{
                                    padding: '24px', borderRadius: 24,
                                    background: CARD_BG, border: `1px solid ${BORDER}`,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                    height: '100%', display: 'flex', flexDirection: 'column'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: TEXT_MAIN, margin: 0, letterSpacing: '-0.01em' }}>{s.title}</h3>
                                        {s.price && <span style={{ fontWeight: 700, color: pc, fontSize: '0.95rem', background: `${pc}15`, padding: '4px 10px', borderRadius: 100 }}>{s.price}</span>}
                                    </div>
                                    {s.description && <p style={{ fontSize: '0.9rem', color: TEXT_MUTED, lineHeight: 1.5, margin: 0, flex: 1 }}>{s.description}</p>}
                                    {s.url && (
                                        <a href={s.url} target="_blank" rel="noreferrer" style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            fontSize: '0.85rem', fontWeight: 600, color: pc,
                                            textDecoration: 'none', marginTop: 16
                                        }}>
                                            Learn More <ArrowRight size={14} />
                                        </a>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                )}

                {/* ─── GALLERY ────────────────────────────────────────────── */}
                {vcard.gallery?.length > 0 && (
                    <div style={{ padding: '0 16px 32px' }}>
                        <CleanHeading title="Portfolio" />
                        <GalleryGrid images={vcard.gallery} borderRadius={16} gap={12} style={vcard.galleryStyle} autoplay={vcard.galleryAutoplay} slidesPerView={vcard.gallerySlidesPerView || 1} primaryColor={pc} />
                    </div>
                )}

                {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
                {vcard.testimonials?.length > 0 && (
                    <div style={{ padding: '0 16px 32px' }}>
                        <CleanHeading title="Client Reviews" />
                        <TestimonialCard testimonials={vcard.testimonials}
                            cardStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: 24 }}
                            quoteColor={TEXT_MUTED}
                            nameColor={TEXT_MAIN}
                            autoplay={vcard.testimonialsAutoplay}
                            perView={vcard.testimonialsPerView || 1}
                            primaryColor={pc}
                        />
                    </div>
                )}

                {/* ─── BUSINESS HOURS ────────────────────────────────────────── */}
                {vcard.businessHours && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <CleanHeading title="Availability" />
                        <BusinessHoursTable hours={vcard.businessHours} accentColor={pc} rowBg={CARD_BG} borderColor={BORDER} textColor={TEXT_MAIN} />
                    </div>
                )}

                {/* ─── BOOKING ────────────────────────────────────────────── */}
                {vcard.booking?.enabled && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <div style={{ background: CARD_BG, borderRadius: 24, padding: '32px 24px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: TEXT_MAIN, letterSpacing: '-0.02em', marginBottom: 12 }}>
                                {vcard.booking.heading || 'Book a Consultation'}
                            </h2>
                            {vcard.booking.description && <p style={{ fontSize: '0.95rem', color: TEXT_MUTED, marginBottom: 24, lineHeight: 1.5 }}>{vcard.booking.description}</p>}
                            <BookingForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                    </div>
                )}

                {/* ─── ENQUIRY FORM ─────────────────────────────────────────── */}
                {vcard.enquiryForm?.enabled && (
                    <div style={{ padding: '0 24px 32px' }}>
                        <div style={{ background: CARD_BG, borderRadius: 24, padding: '32px 24px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: TEXT_MAIN, letterSpacing: '-0.02em', marginBottom: 24, textAlign: 'center' }}>
                                {vcard.enquiryForm.heading || 'Get In Touch'}
                            </h2>
                            <EnquiryForm vcard={vcard} accentColor={pc} inputStyle={inputStyle} btnStyle={btnStyle} />
                        </div>
                    </div>
                )}

                {/* ─── INSTAGRAM ─────────────────────────────────────────────── */}
                {vcard.instagramPosts?.length > 0 && (
                    <div style={{ padding: '0 16px 32px' }}>
                        <CleanHeading title="Instagram" />
                        <InstagramSection posts={vcard.instagramPosts} borderColor={BORDER} displayStyle={vcard.instagramDisplayStyle || 'slides'} slidesPerView={vcard.instagramSlidesPerView || 2} autoplay={vcard.instagramAutoplay !== false} primaryColor={pc} />
                    </div>
                )}

                {/* ─── FOOTER ─────────────────────────────────────────────── */}
                {!vcard.hideBranding && (
                    <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                        <p style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontWeight: 500 }}>
                            Created by <a href="/" target="_blank" rel="noreferrer" style={{ color: BG.match(/#([0-4][0-9a-f]){3}/i) ? '#60A5FA' : '#2563EB', textDecoration: 'none', fontWeight: 600 }}>{vcard.appName || 'BitsLab vCard'}</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
