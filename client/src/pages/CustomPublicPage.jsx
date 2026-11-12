import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { Loader2 } from 'lucide-react';
import PublicLayout from '../components/landing/PublicLayout';
import NotFound404 from './NotFound404';

const CustomPublicPage = () => {
    const { slug } = useParams();
    // The result remembers which slug it belongs to, so moving to another /p/ link shows the spinner again
    const [result, setResult] = useState({ slug: null, page: null });

    useEffect(() => {
        let cancelled = false;
        axios.get(`${import.meta.env.VITE_API_URL}/api/landing/page/${encodeURIComponent(slug)}`)
            .then(res => { if (!cancelled) setResult({ slug, page: res.data }); })
            .catch(() => { if (!cancelled) setResult({ slug, page: null }); });
        return () => { cancelled = true; };
    }, [slug]);

    if (result.slug !== slug) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }
    if (!result.page) return <NotFound404 />;

    return (
        <PublicLayout key={slug} title={result.page.title}>
            <div
                className="custom-page-content max-w-full overflow-x-auto"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(result.page.content, {
                        ADD_ATTR: ['class', 'style', 'target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'href', 'src', 'alt', 'title'],
                        ADD_TAGS: ['iframe', 'style']
                    })
                }}
            />
        </PublicLayout>
    );
};

export default CustomPublicPage;
