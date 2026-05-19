import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUI } from '../context/UIContext';
import PublicLayout from '../components/landing/PublicLayout';
import 'react-quill-new/dist/quill.snow.css'; // Import quill styles for correct rendering of editor content
import DOMPurify from 'dompurify';

const BlogPost = () => {
    const { slug } = useParams();
    const { showToast } = useUI();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlog();
        // eslint-disable-next-line
    }, [slug]);

    const fetchBlog = async () => {
        try {
            // view=true increments the view counter
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing/blogs/${slug}?view=true`);
            const data = res.data;
            setBlog(data);
            setLoading(false);

            // Inject SEO Meta Tags dynamically
            document.title = data.metaTitle || data.title + " | Our Blog";
            
            // Helper to set or create meta tags
            const setMetaTag = (name, content, attribute = 'name') => {
                let element = document.querySelector(`meta[${attribute}="${name}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute(attribute, name);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            };

            if (data.metaDescription) setMetaTag('description', data.metaDescription);
            if (data.keywords && data.keywords.length > 0) setMetaTag('keywords', data.keywords.join(', '));
            
            // Open Graph (Social Sharing)
            setMetaTag('og:title', data.metaTitle || data.title, 'property');
            if (data.metaDescription) setMetaTag('og:description', data.metaDescription, 'property');
            if (data.coverImage) setMetaTag('og:image', data.coverImage, 'property');
            setMetaTag('og:type', 'article', 'property');

        } catch (err) {
            console.error('Failed to load blog', err);
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: blog.title,
                    text: blog.metaDescription || blog.excerpt,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share error', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            showToast({ type: 'success', title: 'Copied', message: 'Link copied to clipboard!' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
                <p className="text-slate-500 mb-8 max-w-md">The article you're looking for was either removed or doesn't exist.</p>
                <Link to="/blog" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform">Return to Blog</Link>
            </div>
        );
    }

    return (
        <PublicLayout pageKey="blog" fullWidth={true}>
            <div className="bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white font-display selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200">

            <article className="pt-32 pb-40">
                {/* Article Header */}
                <header className="max-w-4xl mx-auto px-6 text-center mb-16">
                    <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-12 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full">
                        <ChevronLeft className="w-4 h-4" /> Back to Blog
                    </Link>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6">
                        <Calendar className="w-4 h-4" /> {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                        <User className="w-4 h-4" /> {blog.author?.name || 'Admin'}
                        <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                        {blog.views} Views
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-tight mb-8">
                        {blog.title}
                    </motion.h1>
                    {blog.excerpt && (
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
                            {blog.excerpt}
                        </motion.p>
                    )}
                </header>

                {/* Hero Image */}
                {blog.coverImage && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.7 }} className="max-w-6xl mx-auto px-6 mb-20">
                        <div className="aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl relative">
                            <img src={blog.coverImage} className="w-full h-full object-cover" alt={blog.title} />
                        </div>
                    </motion.div>
                )}

                {/* Rich Text Content */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="max-w-3xl mx-auto px-6">
                    <div 
                        className="prose prose-lg md:prose-xl dark:prose-invert max-w-none prose-indigo prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-3xl prose-img:shadow-xl"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blog.content) }} 
                    />

                    {/* Tags */}
                    {blog.keywords && blog.keywords.length > 0 && (
                        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2">
                            <span className="font-bold text-sm text-slate-500 hidden md:block mt-1">Tags:</span>
                            {blog.keywords.map((kw, i) => (
                                <span key={i} className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold tracking-wide">
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Share Bottom */}
                    <div className="mt-10 flex items-center gap-4">
                        <span className="font-bold text-slate-900 dark:text-white">Share this article:</span>
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:scale-110 transition-transform">
                            <Twitter className="w-4 h-4 fill-current" />
                        </a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center hover:scale-110 transition-transform">
                            <Facebook className="w-4 h-4 fill-current" />
                        </a>
                        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 flex items-center justify-center hover:scale-110 transition-transform">
                            <Linkedin className="w-4 h-4 fill-current" />
                        </a>
                        <button onClick={handleShare} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:scale-110 transition-transform">
                            <LinkIcon className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </article>

            {/* Read Next Section Placeholder */}
            <div className="bg-[#F5F5F7] dark:bg-black py-24 border-t border-slate-200 dark:border-white/5">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-extrabold mb-8">Want to read more?</h2>
                    <Link to="/blog" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg shadow-xl shadow-indigo-500/30 transition-all">View All Articles</Link>
                </div>
            </div>
            </div>
        </PublicLayout>
    );
};

export default BlogPost;
