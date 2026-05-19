/**
 * PublicVcard.jsx — Theme Router
 *
 * This file is intentionally minimal. Its only job is to:
 *  1. Fetch vcard data from the API
 *  2. Inject SEO / analytics tags
 *  3. Select the correct theme component from /VcardThemes/
 *  4. Delegate ALL rendering to that theme component
 *
 * To add/edit/delete a theme, work in /VcardThemes/ exclusively.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getThemeComponent } from './VcardThemes';

export default function PublicVcard() {
    const { slug } = useParams();
    const [vcard, setVcard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVcard = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/public/${slug}`);
                setVcard(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'vCard not found');
            } finally {
                setLoading(false);
            }
        };
        fetchVcard();
    }, [slug]);

    useEffect(() => {
        if (!vcard) return;

        // SEO
        document.title = vcard.seoTitle || `${vcard.name} - Digital Business Card`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = vcard.seoDescription || vcard.bio || vcard.designation || '';

        // Google Analytics
        if (vcard.googleAnalyticsId) {
            const s = document.createElement('script');
            s.async = true;
            s.src = `https://www.googletagmanager.com/gtag/js?id=${vcard.googleAnalyticsId}`;
            document.head.appendChild(s);
            const c = document.createElement('script');
            c.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${vcard.googleAnalyticsId}');`;
            document.head.appendChild(c);
        }

        // Facebook Pixel
        if (vcard.facebookPixelId) {
            const fb = document.createElement('script');
            fb.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${vcard.facebookPixelId}');fbq('track','PageView');`;
            document.head.appendChild(fb);
        }
    }, [vcard]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: vcard?.seoTitle || vcard?.name,
                    text: vcard?.bio || vcard?.designation,
                    url: window.location.href,
                });
            } catch { }
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    // ─── Loading ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48, height: 48,
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        Loading vCard...
                    </p>
                </div>
            </div>
        );
    }

    // ─── Error ────────────────────────────────────────────────────────
    if (error || !vcard) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#0f172a', color: '#fff', textAlign: 'center', padding: 24,
            }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 8 }}>404</h1>
                <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>
                    {error || 'This digital business card is not available.'}
                </p>
            </div>
        );
    }

    // ─── Route to correct theme component ────────────────────────────
    const ThemeComponent = getThemeComponent(vcard.themeId);
    return <ThemeComponent vcard={vcard} onShare={handleShare} />;
}
