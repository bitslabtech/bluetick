// Shared sub-components reused across all VCard themes
import React, { useState, useEffect } from 'react';
import { Download, Share2, MessageCircle, Mail, Phone, Globe, MapPin, ExternalLink, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Hero Slider ─────────────────────────────────────────────────────────────
export function HeroSlider({ heroMedia, coverImage, style = {}, alt = "Cover" }) {
    const urls = heroMedia?.urls?.length > 0 ? heroMedia.urls : (heroMedia?.url ? [heroMedia.url] : (coverImage ? [coverImage] : []));
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(-1);

    useEffect(() => {
        if (urls.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((curr) => {
                setPrevIndex(curr);
                return (curr + 1) % urls.length;
            });
        }, 4000);
        return () => clearInterval(timer);
    }, [urls.length]);

    // Force a slide change to preview the new animation immediately when the user changes the effect
    const effect = heroMedia?.effect || 'kenburns';
    useEffect(() => {
        if (urls.length > 1) {
            setCurrentIndex((curr) => {
                setPrevIndex(curr);
                return (curr + 1) % urls.length;
            });
        }
    }, [effect]);

    if (!urls.length) return null;

    if (urls.length === 1) {
        return <img src={urls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} alt={alt} />;
    }

    return (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: 0 }}>
            {urls.map((url, idx) => {
                const isCurrent = currentIndex === idx;
                const isPrev = prevIndex === idx;
                const effect = heroMedia?.effect || 'kenburns';
                
                if (effect === 'splitReveal') {
                    const baseHalfStyle = {
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                        zIndex: isPrev ? 2 : (isCurrent ? 1 : 0),
                        opacity: (isCurrent || isPrev) ? 1 : 0,
                    };

                    return (
                        <React.Fragment key={idx}>
                            {/* Left Half */}
                            <img
                                src={url}
                                alt={`${alt} ${idx + 1} Left`}
                                style={{
                                    ...baseHalfStyle,
                                    clipPath: 'inset(0 50% 0 0)',
                                    transform: isCurrent ? 'scale(1.1) translateX(0)' : (isPrev ? 'scale(1.1) translateX(-50%)' : 'scale(1) translateX(0)'),
                                    transition: isCurrent ? 'transform 4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease' : (isPrev ? 'transform 1.5s cubic-bezier(0.76, 0, 0.24, 1), opacity 1.5s ease-in' : 'none'),
                                    ...style
                                }}
                            />
                            {/* Right Half */}
                            <img
                                src={url}
                                alt={`${alt} ${idx + 1} Right`}
                                style={{
                                    ...baseHalfStyle,
                                    clipPath: 'inset(0 0 0 50%)',
                                    transform: isCurrent ? 'scale(1.1) translateX(0)' : (isPrev ? 'scale(1.1) translateX(50%)' : 'scale(1) translateX(0)'),
                                    transition: isCurrent ? 'transform 4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease' : (isPrev ? 'transform 1.5s cubic-bezier(0.76, 0, 0.24, 1), opacity 1.5s ease-in' : 'none'),
                                    ...style
                                }}
                            />
                        </React.Fragment>
                    );
                }
                
                let animStyle = {};
                switch (effect) {
                    case 'fade':
                        animStyle = {
                            opacity: isCurrent ? 1 : 0,
                            transform: 'none',
                            transition: 'opacity 1s ease-in-out',
                        };
                        break;
                    case 'slideRight':
                        animStyle = {
                            opacity: isCurrent ? 1 : 0,
                            transform: isCurrent ? 'scale(1.08) translateX(0)' : 'scale(1.08) translateX(3%)',
                            transition: 'opacity 1.5s ease-in-out, transform 4s ease-out',
                        };
                        break;
                    case 'zoomOut':
                        animStyle = {
                            opacity: isCurrent ? 1 : 0,
                            transform: isCurrent ? 'scale(1)' : 'scale(1.25)',
                            transition: 'opacity 1.5s ease-in-out, transform 4s cubic-bezier(0.25, 1, 0.5, 1)',
                        };
                        break;
                    case 'blurFade':
                        animStyle = {
                            opacity: isCurrent ? 1 : 0,
                            filter: isCurrent ? 'blur(0px)' : 'blur(12px)',
                            transform: isCurrent ? 'scale(1)' : 'scale(1.05)',
                            transition: 'opacity 1.2s ease-in-out, filter 1.2s ease-in-out, transform 4s linear',
                        };
                        break;
                    case 'kenburns':
                    default:
                        animStyle = {
                            opacity: isCurrent ? 1 : 0,
                            transform: isCurrent ? 'scale(1)' : 'scale(1.1)',
                            transition: 'opacity 1.5s ease-in-out, transform 4s linear',
                        };
                        break;
                }

                return (
                    <img
                        key={idx}
                        src={url}
                        alt={`${alt} ${idx + 1}`}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: isCurrent ? 1 : 0,
                            ...animStyle,
                            ...style
                        }}
                    />
                );
            })}
        </div>
    );
}

// ─── Save Contact Button ───────────────────────────────────────────────────
export function SaveContactBtn({ vcard, style, children }) {
    const showSave = vcard.showSaveContact !== false;
    const showWa = vcard.showWhatsappChat !== false && vcard.whatsappNumber;

    if (!showSave && !showWa) return null;

    const baseStyle = {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        ...style
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)',
            maxWidth: 390,
            zIndex: 50,
            display: 'flex',
            gap: 10
        }}>
            {showWa && (
                <a
                    href={`https://wa.me/${vcard.whatsappNumber?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        ...baseStyle,
                        background: '#25D366',
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
                        textDecoration: 'none'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
                >
                    Chat on WhatsApp
                </a>
            )}
            {showSave && (
                <a
                    href={`${import.meta.env.VITE_API_URL}/api/vcards/public/${vcard.slug}/download-vcf`}
                    rel="nofollow"
                    style={{
                        ...baseStyle,
                        textDecoration: 'none'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
                >
                    {children || 'Save Contact'}
                </a>
            )}
        </div>
    );
}

// ─── Share Button ──────────────────────────────────────────────────────────
export function ShareBtn({ vcard, style }) {
    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: vcard.seoTitle || vcard.name, text: vcard.bio || vcard.designation, url: window.location.href });
            } catch { }
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };
    return (
        <button onClick={handleShare} style={style} title="Share">
            <Share2 size={17} />
        </button>
    );
}

// ─── Social Links ──────────────────────────────────────────────────────────
export function SocialLinksRow({ links, itemStyle, containerStyle, iconColor, useBrandColors }) {
    const getPlatformIcon = (platform) => {
        const p = platform?.toLowerCase();
        const size = 20;
        
        // Brand Colors Mapping
        const brandColors = {
            facebook: '#1877F2',
            twitter: '#000000',
            x: '#000000',
            linkedin: '#0A66C2',
            instagram: '#E1306C',
            youtube: '#FF0000',
            tiktok: '#000000',
            github: '#333333',
            pinterest: '#E60023',
            whatsapp: '#25D366',
            telegram: '#229ED9',
            website: '#666666'
        };
        
        const color = useBrandColors ? (brandColors[p] || "#000") : (iconColor || itemStyle?.color || "#fff");
        switch (p) {
            case 'twitter':
            case 'x':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
            case 'linkedin':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
            case 'instagram':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
            case 'facebook':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
            case 'youtube':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
            case 'tiktok':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v8.12c0 2.26-.67 4.54-1.99 6.36-1.45 2.01-3.67 3.32-6.13 3.65-2.73.36-5.59-.2-7.85-1.89-2.06-1.54-3.41-3.83-3.8-6.38-.41-2.67.11-5.46 1.64-7.66 1.43-2.06 3.59-3.46 6.03-3.98v4.06c-1.59.32-3.13 1.25-4.07 2.58-.93 1.3-1.28 2.96-.94 4.54.34 1.6 1.4 3 2.78 3.82 1.48.88 3.3.99 4.88.35 1.57-.63 2.82-1.88 3.39-3.45.38-1.05.47-2.18.47-3.29V.02h3.18z"/></svg>;
            case 'github':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
            case 'pinterest':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.184 0 7.435 2.981 7.435 6.953 0 4.161-2.624 7.51-6.27 7.51-1.223 0-2.375-.636-2.768-1.385l-.754 2.873c-.272 1.042-1.011 2.345-1.507 3.141 1.171.362 2.421.558 3.71.558 6.621 0 11.988-5.367 11.988-11.987C24 5.367 18.638 0 12.017 0z"/></svg>;
            case 'whatsapp':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
            case 'telegram':
                return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm5.894-17.062l-1.928 13.565c-.147.662-.538.825-1.092.513l-3.02-2.224-1.455 1.401c-.161.161-.297.297-.611.297l.216-3.076 5.597-5.056c.244-.217-.053-.338-.378-.122l-6.918 4.354-2.983-.933c-.649-.204-.662-.649.136-.961L17.202 6.55c.677-.251 1.266.155 1.094.788z"/></svg>;
            case 'website':
                return <Globe size={size} color={color} strokeWidth={2} />;
            default:
                return <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{platform?.charAt(0).toUpperCase() || 'S'}</span>;
        }
    };

    const platformColors = {
        twitter: '#1DA1F2', x: '#000', linkedin: '#0A66C2', instagram: '#E1306C',
        facebook: '#1877F2', youtube: '#FF0000', tiktok: '#000', github: '#333',
        pinterest: '#E60023', whatsapp: '#25D366', telegram: '#2CA5E0', website: '#4f46e5',
    };
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, ...containerStyle }}>
            {links.map((link, i) => {
                const p = link.platform?.toLowerCase();
                const baseColor = platformColors[p] || '#888';
                
                // Advanced premium gradients based on platform
                let bg;
                if (p === 'instagram') bg = 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)';
                else if (p === 'whatsapp') bg = 'linear-gradient(135deg, #4FCE5D, #25D366)';
                else if (p === 'x' || p === 'tiktok' || p === 'github') bg = 'linear-gradient(135deg, #444, #0a0a0a)';
                else if (p === 'youtube') bg = 'linear-gradient(135deg, #FF3333, #CC0000)';
                else if (p === 'linkedin') bg = 'linear-gradient(135deg, #1178cd, #084c82)';
                else bg = `linear-gradient(135deg, ${baseColor}ea, ${baseColor})`;

                return (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer"
                        title={link.platform}
                        style={{ 
                            width: 46, height: 46, 
                            borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: bg, 
                            color: '#fff', 
                            textDecoration: 'none', 
                            flexShrink: 0, 
                            boxShadow: `inset 0 2px 2px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.1)`,
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
                            ...itemStyle 
                        }}
                        onMouseEnter={e => { 
                            e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)'; 
                            e.currentTarget.style.boxShadow = `inset 0 2px 2px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 14px 24px ${baseColor}60`; 
                            if (e.currentTarget.firstChild) e.currentTarget.firstChild.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={e => { 
                            e.currentTarget.style.transform = 'none'; 
                            e.currentTarget.style.boxShadow = `inset 0 2px 2px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.1)`; 
                            if (e.currentTarget.firstChild) e.currentTarget.firstChild.style.transform = 'scale(1)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', pointerEvents: 'none' }}>
                            {getPlatformIcon(link.platform)}
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

// ─── Gallery Grid ──────────────────────────────────────────────────────────
export function GalleryGrid({ images, borderRadius = 12, gap = 8, style = 'grid', autoplay = false, slidesPerView = 1, primaryColor = '#4f46e5' }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index if slidesPerView changes and it's out of bounds
    useEffect(() => {
        if (images && currentIndex > images.length - slidesPerView) {
            setCurrentIndex(Math.max(0, images.length - slidesPerView));
        }
    }, [slidesPerView, images?.length, currentIndex]);

    useEffect(() => {
        if (style !== 'slides' || !autoplay || images?.length <= slidesPerView) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                if (prevIndex >= images.length - slidesPerView) {
                    return 0;
                }
                return prevIndex + 1;
            });
        }, 3000);
        
        return () => clearInterval(interval);
    }, [style, autoplay, images?.length, slidesPerView]);

    if (!images?.length) return null;

    if (style === 'slides') {
        const itemWidth = `calc(${100 / slidesPerView}% - ${(gap * (slidesPerView - 1)) / slidesPerView}px)`;
        const maxIndex = Math.max(0, images.length - slidesPerView);
        
        return (
            <div style={{ width: '100%', overflow: 'hidden' }}>
                <div 
                    style={{ 
                        display: 'flex', 
                        gap: gap, 
                        transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                        transform: `translateX(calc(-${currentIndex * (100 / slidesPerView)}% - ${currentIndex * (gap / slidesPerView)}px))`
                    }}
                >
                    {images.map((img, i) => (
                        <div key={i} style={{ flex: '0 0 auto', width: itemWidth }}>
                            <a href={img.url} target="_blank" rel="noreferrer"
                                style={{ borderRadius, overflow: 'hidden', display: 'block', aspectRatio: '1', position: 'relative' }}
                            >
                                <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {img.caption && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {img.caption}
                                    </div>
                                )}
                            </a>
                        </div>
                    ))}
                </div>
                
                {maxIndex > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                style={{
                                    width: currentIndex === idx ? 20 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    background: currentIndex === idx ? primaryColor : 'rgba(150,150,150,0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>
            {images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noreferrer"
                    style={{ borderRadius, overflow: 'hidden', display: 'block', aspectRatio: '1', position: 'relative' }}
                >
                    <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                        onMouseOver={e => { e.target.style.transform = 'scale(1.08)'; }}
                        onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
                    />
                    {img.caption && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)', color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                            {img.caption}
                        </div>
                    )}
                </a>
            ))}
        </div>
    );
}

// ─── Testimonial Carousel ─────────────────────────────────────────────────
export function TestimonialCard({ testimonials, cardStyle, quoteColor = '#888', autoplay = false, perView = 1, primaryColor = '#4f46e5' }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const count = testimonials?.length || 0;
    const maxIndex = Math.max(0, count - perView);

    useEffect(() => {
        if (!autoplay || count <= perView) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
        }, 4000);
        return () => clearInterval(interval);
    }, [autoplay, count, perView, maxIndex]);

    // reset if perView changes and index is out of bounds
    useEffect(() => {
        if (currentIndex > maxIndex) setCurrentIndex(maxIndex);
    }, [perView, maxIndex, currentIndex]);

    if (!testimonials?.length) return null;

    const gap = 12;
    const itemWidth = `calc(${100 / perView}% - ${(gap * (perView - 1)) / perView}px)`;

    return (
        <div style={{ width: '100%' }}>
            <div style={{ overflow: 'hidden' }}>
                <div
                    style={{
                        display: 'flex',
                        gap,
                        transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                        transform: `translateX(calc(-${currentIndex * (100 / perView)}% - ${currentIndex * (gap / perView)}px))`
                    }}
                >
                    {testimonials.map((t, i) => (
                        <div key={i} style={{ flex: '0 0 auto', width: itemWidth }}>
                            <div style={{ borderRadius: 16, padding: '20px', height: '100%', boxSizing: 'border-box', ...cardStyle }}>
                                <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={14} fill={s <= (t.rating || 5) ? '#F59E0B' : 'none'} color={s <= (t.rating || 5) ? '#F59E0B' : '#ccc'} />
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 14, color: quoteColor }}>
                                    &ldquo;{t.review}&rdquo;
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                                    {t.imageUrl
                                        ? <img src={t.imageUrl} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={t.name} />
                                        : <div style={{ width: 36, height: 36, borderRadius: '50%', background: primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{t.name?.charAt(0)}</div>
                                    }
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{t.name}</p>
                                        {t.company && <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>{t.company}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {maxIndex > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                    {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            style={{
                                width: currentIndex === idx ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: currentIndex === idx ? primaryColor : 'rgba(150,150,150,0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Business Hours ──────────────────────────────────────────────────────
export function BusinessHoursTable({ hours, accentColor, rowBg, borderColor, textColor }) {
    const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const DAY_SHORT = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (!hours || !Object.values(hours).some(d => d?.enabled)) return null;

    // Format time "09:00" -> "9:00 AM"
    const fmt = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    // Build groups: merge consecutive days with identical hours
    const groups = [];
    DAY_KEYS.forEach((key) => {
        const d = hours[key] || { enabled: false, open: '', close: '' };
        const sig = d.enabled ? `${d.open}|${d.close}` : 'closed';
        const last = groups[groups.length - 1];
        if (last && last.sig === sig) {
            last.to = key;
        } else {
            groups.push({ from: key, to: key, sig, enabled: d.enabled, open: d.open, close: d.close });
        }
    });

    // Today status — full time-aware logic
    const todayData = hours[today] || { enabled: false };
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const toMins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const openMins = toMins(todayData.open);
    const closeMins = toMins(todayData.close);

    let statusLabel, statusSub, statusColor, dotColor;
    if (!todayData.enabled) {
        statusLabel = 'Closed Today';
        statusSub = null;
        statusColor = 'rgba(0,0,0,0.04)';
        dotColor = '#ef4444';
    } else if (openMins !== null && nowMins < openMins) {
        // Before opening
        statusLabel = `Opens at ${fmt(todayData.open)}`;
        statusSub = null;
        statusColor = 'rgba(234,179,8,0.08)';
        dotColor = '#eab308';
    } else if (openMins !== null && closeMins !== null && nowMins >= openMins && nowMins < closeMins) {
        // Currently open
        statusLabel = 'Open Now';
        statusSub = `Closes at ${fmt(todayData.close)}`;
        statusColor = `${accentColor}18`;
        dotColor = '#22c55e';
    } else {
        // After closing
        statusLabel = 'Closed';
        statusSub = `Closed at ${fmt(todayData.close)}`;
        statusColor = 'rgba(0,0,0,0.04)';
        dotColor = '#ef4444';
    }
    const isOpen = dotColor === '#22c55e';

    const rangeLabel = (g) => {
        if (g.from === g.to) return DAY_SHORT[g.from];
        return `${DAY_SHORT[g.from]} – ${DAY_SHORT[g.to]}`;
    };

    return (
        <div>
            {/* Today status badge */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 12,
                background: statusColor,
                border: `1.5px solid ${isOpen ? accentColor + '40' : borderColor}`,
                marginBottom: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dotColor,
                        boxShadow: `0 0 6px ${dotColor}`
                    }} />
                    <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: textColor, display: 'block' }}>
                            {statusLabel}
                        </span>
                        {statusSub && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.55, color: textColor }}>{statusSub}</span>
                        )}
                    </div>
                </div>
                {isOpen && todayData.open && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: accentColor, fontFamily: 'monospace' }}>
                        {fmt(todayData.open)} – {fmt(todayData.close)}
                    </span>
                )}
            </div>

            {/* Grouped schedule */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
                {groups.map((g, i) => {
                    const fromIdx = DAY_KEYS.indexOf(g.from);
                    const toIdx = DAY_KEYS.indexOf(g.to);
                    const todayIdx = DAY_KEYS.indexOf(today);
                    const isGroupToday = todayIdx >= fromIdx && todayIdx <= toIdx;
                    return (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '9px 14px', fontSize: '0.8rem',
                            background: isGroupToday ? `${accentColor}12` : (i % 2 === 0 ? rowBg : 'transparent'),
                            borderTop: i > 0 ? `1px solid ${borderColor}` : 'none',
                            borderLeft: isGroupToday ? `3px solid ${accentColor}` : '3px solid transparent',
                        }}>
                            <span style={{ fontWeight: isGroupToday ? 700 : 500, color: isGroupToday ? accentColor : textColor, opacity: isGroupToday ? 1 : 0.75 }}>
                                {rangeLabel(g)}
                            </span>
                            {g.enabled
                                ? <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: isGroupToday ? accentColor : textColor, fontWeight: 700 }}>
                                    {fmt(g.open)} – {fmt(g.close)}
                                  </span>
                                : <span style={{ fontSize: '0.72rem', opacity: 0.4, fontStyle: 'italic' }}>Closed</span>
                            }
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Enquiry Form ──────────────────────────────────────────────────────────
export function EnquiryForm({ vcard, accentColor, inputStyle, btnStyle, labelColor }) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/vcards/public/${vcard.slug}/enquiry`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, recipientEmail: vcard.enquiryForm?.recipientEmail })
            });
            setSent(true);
        } catch { setSent(true); } finally { setSending(false); }
    };

    if (sent) return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>Message Sent!</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.55, marginTop: 6 }}>We'll get back to you soon.</p>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ n: 'name', p: 'Your Name', t: 'text' }, { n: 'email', p: 'Email Address', t: 'email' }, { n: 'phone', p: 'Phone (Optional)', t: 'tel' }].map(f => (
                <input key={f.n} type={f.t} placeholder={f.p} value={form[f.n]}
                    onChange={e => setForm(p => ({ ...p, [f.n]: e.target.value }))}
                    required={f.n !== 'phone'}
                    style={{ ...inputStyle }}
                />
            ))}
            <textarea placeholder="Your Message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required rows={3} style={{ ...inputStyle, resize: 'none' }}
            />
            <button type="submit" disabled={sending} style={{ ...btnStyle }}>
                {sending ? 'Sending...' : (vcard.enquiryForm?.submitLabel || 'Send Message')}
            </button>
        </form>
    );
}

// ─── Booking Form ──────────────────────────────────────────────────────────
export function BookingForm({ vcard, accentColor, inputStyle, btnStyle }) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', appointmentDate: '' });
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/vcards/public/${vcard.slug}/enquiry`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: 'booking' })
            });
            setSent(true);
        } catch { setSent(true); } finally { setSending(false); }
    };

    if (sent) return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>Booking Request Sent!</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.55, marginTop: 6 }}>We'll confirm your appointment shortly.</p>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="datetime-local" value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))} onClick={e => e.target.showPicker && e.target.showPicker()} required style={inputStyle} />
            {[{ n: 'name', p: 'Your Name', t: 'text' }, { n: 'email', p: 'Email Address', t: 'email' }, { n: 'phone', p: 'Phone Number', t: 'tel' }].map(f => (
                <input key={f.n} type={f.t} placeholder={f.p} value={form[f.n]}
                    onChange={e => setForm(p => ({ ...p, [f.n]: e.target.value }))}
                    required={f.n !== 'phone'} style={inputStyle}
                />
            ))}
            <textarea placeholder="Additional Notes (Optional)" value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }}
            />
            <button type="submit" disabled={sending} style={btnStyle}>
                {sending ? 'Sending...' : (vcard.booking?.buttonLabel || 'Request Appointment')}
            </button>
        </form>
    );
}

// ─── Section Heading ───────────────────────────────────────────────────────
export function SectionHeading({ title, accentColor, textColor, style }) {
    return (
        <div style={{ textAlign: 'center', marginBottom: 20, ...style }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: textColor, marginBottom: 6 }}>{title}</h2>
            <div style={{ width: 40, height: 3, background: accentColor, borderRadius: 99, margin: '0 auto' }} />
        </div>
    );
}

// ─── Instagram Embeds ──────────────────────────────────────────────────────
export function InstagramSection({ posts, borderColor, displayStyle = 'grid', slidesPerView = 1, autoplay = false, primaryColor = '#E1306C' }) {
    const validPosts = (posts || []).filter(p => p.postUrl);
    const [visibleCount, setVisibleCount] = useState(4);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Autoplay for slides
    useEffect(() => {
        if (displayStyle !== 'slides' || !autoplay || validPosts.length <= slidesPerView) return;
        const maxIdx = Math.max(0, validPosts.length - slidesPerView);
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev >= maxIdx ? 0 : prev + 1));
        }, 4000);
        return () => clearInterval(interval);
    }, [displayStyle, autoplay, validPosts.length, slidesPerView]);

    // Reset slide index when mode/perView changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [displayStyle, slidesPerView]);

    if (!validPosts.length) return null;

    // ── SLIDES MODE ────────────────────────────────────────────────────────
    if (displayStyle === 'slides') {
        const gap = 12;
        const maxIdx = Math.max(0, validPosts.length - slidesPerView);
        const itemWidth = `calc(${100 / slidesPerView}% - ${(gap * (slidesPerView - 1)) / slidesPerView}px)`;
        return (
            <div style={{ width: '100%' }}>
                <div style={{ overflow: 'hidden', borderRadius: 16 }}>
                    <div style={{
                        display: 'flex',
                        gap,
                        transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                        transform: `translateX(calc(-${currentIndex * (100 / slidesPerView)}% - ${currentIndex * (gap / slidesPerView)}px))`
                    }}>
                        {validPosts.map((post, i) => (
                            <div key={i} style={{ flex: '0 0 auto', width: itemWidth, borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative', height: slidesPerView === 2 ? 350 : 580 }}>
                                {slidesPerView === 2 ? (
                                    <iframe
                                        src={post.postUrl.replace(/\/?$/, '/embed')}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: '0 0', display: 'block' }}
                                        frameBorder="0" scrolling="no" allowTransparency
                                        title={`Instagram ${i + 1}`}
                                    />
                                ) : (
                                    <iframe
                                        src={post.postUrl.replace(/\/?$/, '/embed')}
                                        style={{ width: '100%', height: '100%', display: 'block' }}
                                        frameBorder="0" scrolling="no" allowTransparency
                                        title={`Instagram ${i + 1}`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Dots navigation */}
                {maxIdx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                        {Array.from({ length: maxIdx + 1 }).map((_, idx) => (
                            <div
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                style={{
                                    width: currentIndex === idx ? 20 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    background: currentIndex === idx ? primaryColor : 'rgba(150,150,150,0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── GRID MODE (2 columns, load more 4 at a time) ───────────────────────
    const shown = validPosts.slice(0, visibleCount);
    const hasMore = visibleCount < validPosts.length;
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {shown.map((post, i) => (
                    <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative', height: 350 }}>
                        <iframe
                            src={post.postUrl.replace(/\/?$/, '/embed')}
                            style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: '0 0', display: 'block' }}
                            frameBorder="0" scrolling="no" allowTransparency
                            title={`Instagram ${i + 1}`}
                        />
                    </div>
                ))}
            </div>
            {hasMore && (
                <button
                    onClick={() => setVisibleCount(v => v + 4)}
                    style={{
                        marginTop: 14,
                        width: '100%',
                        padding: '11px 20px',
                        borderRadius: 12,
                        border: `1.5px solid ${primaryColor}`,
                        background: 'transparent',
                        color: primaryColor,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = primaryColor; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = primaryColor; }}
                >
                    Load More ({validPosts.length - visibleCount} more)
                </button>
            )}
        </div>
    );
}

// ─── Contact Buttons ───────────────────────────────────────────────────────
export function ContactButtons({ buttons, accentColor, btnRadius }) {
    if (!buttons?.length) return null;
    const colors = { whatsapp: '#25D366', call: accentColor, email: '#ef4444', sms: '#8b5cf6', maps: '#f59e0b' };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {buttons.map((btn, i) => {
                const href = btn.type === 'whatsapp' ? `https://wa.me/${btn.value?.replace(/[^0-9]/g, '')}`
                    : btn.type === 'call' ? `tel:${btn.value}`
                        : btn.type === 'email' ? `mailto:${btn.value}`
                            : btn.type === 'sms' ? `sms:${btn.value}` : btn.value;
                const color = colors[btn.type] || accentColor;
                return (
                    <a key={i} href={href} target={btn.type === 'maps' ? '_blank' : undefined} rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: btnRadius || 12, fontWeight: 700, color: '#fff', textDecoration: 'none', backgroundColor: color, fontSize: '0.9rem', transition: 'transform 0.2s, filter 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseOut={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                    >
                        {btn.label || btn.type}
                    </a>
                );
            })}
        </div>
    );
}

// ─── Contact Info Cards (Grid layout for Basic Details) ────────────────────
export function ContactInfoCards({ vcard, accentColor, bgColor, cardBgColor, textColor, borderColor, borderRadius = 12 }) {
    const infos = [];
    if (vcard.phone) infos.push({ type: 'phone', label: 'Phone', value: vcard.phone, href: `tel:${vcard.phone}`, icon: <Phone size={20} /> });
    if (vcard.alternatePhone) infos.push({ type: 'altPhone', label: 'Alternate Phone', value: vcard.alternatePhone, href: `tel:${vcard.alternatePhone}`, icon: <Phone size={20} /> });
    if (vcard.email) infos.push({ type: 'email', label: 'Email', value: vcard.email, href: `mailto:${vcard.email}`, icon: <Mail size={20} /> });
    if (vcard.location) infos.push({ type: 'location', label: 'Location', value: vcard.location, href: null, icon: <MapPin size={20} /> });

    if (infos.length === 0) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: infos.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
            {infos.map((info, i) => {
                const El = info.href ? 'a' : 'div';
                return (
                    <El key={i} href={info.href} style={{ textDecoration: 'none', background: cardBgColor || bgColor, border: `1px solid ${borderColor}`, borderRadius, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, transition: 'transform 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}
                        onMouseOver={e => { if(info.href) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseOut={e => { if(info.href) e.currentTarget.style.transform = 'none'; }}
                    >
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${accentColor}15`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {info.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{info.label}</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: textColor, wordBreak: 'break-word', lineHeight: 1.3 }}>{info.value}</p>
                        </div>
                    </El>
                );
            })}
        </div>
    );
}

// ─── Service Carousel ───────────────────────────────────────────────────────
export function ServiceCarousel({ services, autoplay, primaryColor, renderCard }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!autoplay || services.length <= 2) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                // If moving by 1 item, max index is services.length - 2
                // so we can see the last two items at the end.
                if (prevIndex >= services.length - 2) {
                    return 0;
                }
                return prevIndex + 1;
            });
        }, 3000);
        
        return () => clearInterval(interval);
    }, [autoplay, services.length]);

    if (!services || services.length === 0) return null;

    const gap = 16;

    return (
        <div style={{ width: '100%', overflow: 'hidden' }}>
            <div 
                style={{ 
                    display: 'flex', 
                    gap: gap, 
                    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                    transform: `translateX(calc(-${currentIndex * 50}% - ${currentIndex * (gap / 2)}px))`
                }}
            >
                {services.map((s, i) => (
                    <div 
                        key={i} 
                        style={{ 
                            flex: '0 0 auto', 
                            width: `calc(50% - ${gap / 2}px)`,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {renderCard(s, i)}
                    </div>
                ))}
            </div>
            
            {services.length > 2 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                    {Array.from({ length: services.length - 1 }).map((_, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            style={{
                                width: currentIndex === idx ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: currentIndex === idx ? primaryColor : 'rgba(150,150,150,0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
