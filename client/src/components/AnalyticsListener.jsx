import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { initGA, initPixel, trackPageView } from '../utils/analytics';

/**
 * AnalyticsListener — Listens to React Router navigation and synchronizes
 * page_view events across all public routes in the SPA.
 */
export default function AnalyticsListener() {
    const location = useLocation();
    const isReadyRef = useRef(false);

    // Initial setup: Fetch global analytics settings from landing config
    useEffect(() => {
        let isMounted = true;
        const apiUrl = import.meta.env.VITE_API_URL || '';

        axios.get(`${apiUrl}/api/landing`)
            .then(res => {
                if (!isMounted) return;
                const seo = res.data?.seo || {};

                if (seo.googleAnalyticsId) {
                    initGA(seo.googleAnalyticsId);
                }
                if (seo.facebookPixelId) {
                    initPixel(seo.facebookPixelId);
                }

                isReadyRef.current = true;
                // Track initial landing page
                trackPageView(location.pathname + location.search, document.title);
            })
            .catch(() => {
                // If API is unreachable or offline, allow local tracking if gtag already exists
                isReadyRef.current = true;
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Track SPA route changes
    useEffect(() => {
        if (!isReadyRef.current) return;

        // Small delay so active page components can update document.title
        const timer = setTimeout(() => {
            trackPageView(location.pathname + location.search, document.title);
        }, 100);

        return () => clearTimeout(timer);
    }, [location.pathname, location.search]);

    return null;
}
