import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit3, Trash2, Link as LinkIcon, Image as ImageIcon, Eye, BarChart2, CheckCircle2, X, ChevronLeft, Save, Loader2, Sparkles, Megaphone, Smartphone, Layout, Globe, Tag, Calendar } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Quill Modules for better editing
const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image', 'video'],
        ['clean']
    ]
};

const BlogManager = () => {
    const { showToast, showModal } = useUI();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        id: null,
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        coverImage: '',
        metaTitle: '',
        metaDescription: '',
        keywords: '', // string for input, array in db
        isPublished: false
    });

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing/blogs?admin=true`);
            setBlogs(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            showToast({ type: 'error', title: 'Error', message: 'Failed to fetch blogs' });
        }
    };

    const handleCreateNew = () => {
        setForm({
            id: null, title: '', slug: '', excerpt: '', content: '',
            coverImage: '', metaTitle: '', metaDescription: '', keywords: '', isPublished: false
        });
        setIsEditing(true);
    };

    const handleEdit = (blog) => {
        setForm({
            ...blog,
            keywords: blog.keywords ? blog.keywords.join(', ') : ''
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        showModal({
            type: 'warning',
            title: 'Delete Blog',
            message: 'Are you sure you want to delete this blog post? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/landing/blogs/${id}`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
                    showToast({ type: 'success', title: 'Deleted', message: 'Blog deleted successfully.' });
                    fetchBlogs();
                } catch (err) {
                    showToast({ type: 'error', title: 'Error', message: 'Failed to delete blog' });
                }
            }
        });
    };

    const handleSave = async () => {
        if (!form.title || !form.content) {
            showToast({ type: 'error', title: 'Missing Fields', message: 'Title and content are required.' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean)
            };

            const hdrs = { headers: { 'x-auth-token': localStorage.getItem('token') } };

            if (form.id) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/landing/blogs/${form.id}`, payload, hdrs);
                showToast({ type: 'success', title: 'Saved', message: 'Blog updated successfully.' });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/blogs`, payload, hdrs);
                showToast({ type: 'success', title: 'Published', message: 'New blog created successfully.' });
            }
            
            setIsEditing(false);
            fetchBlogs();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.msg || 'Error saving blog' });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/blogs/upload`, formData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setForm({ ...form, coverImage: res.data.url });
            showToast({ type: 'success', title: 'Uploaded', message: 'Cover image updated.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Upload Failed', message: 'Failed to upload image.' });
        }
    };

    // Calculate SEO Score Basics
    const seoScore = React.useMemo(() => {
        let score = 0;
        if (form.metaTitle?.length > 40 && form.metaTitle?.length < 60) score += 30; // Optimal length
        else if (form.metaTitle?.length > 0) score += 15;
        
        if (form.metaDescription?.length > 120 && form.metaDescription?.length < 160) score += 40;
        else if (form.metaDescription?.length > 0) score += 20;

        if (form.keywords?.length > 0) score += 10;
        if (form.slug?.length > 0) score += 20;

        return Math.min(100, score);
    }, [form.metaTitle, form.metaDescription, form.keywords, form.slug]);

    if (loading && !isEditing) return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

    return (
        <div className={`bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden transition-all duration-500 flex flex-col ${isEditing ? 'min-h-[850px] h-[85vh]' : 'min-h-[400px]'}`}>
            
            <AnimatePresence>
                {!isEditing ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                            <div>
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center gap-2">
                                    <Megaphone className="w-6 h-6 text-indigo-500" /> Blog Management
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Create SEO-optimized articles to drive traffic and educate your audience.</p>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-900/10 dark:shadow-white/10 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> New Post
                            </button>
                        </div>

                        {blogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-2xl bg-slate-50 dark:bg-black/20 border border-dashed border-slate-200 dark:border-white/10">
                                <div className="w-16 h-16 bg-white dark:bg-surface-dark shadow-sm rounded-2xl flex items-center justify-center mb-4 text-indigo-500">
                                    <Edit3 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No blogs found</h3>
                                <p className="text-sm text-slate-500 max-w-sm mb-6">Start writing to improve your organic reach and engage with your customers.</p>
                                <button onClick={handleCreateNew} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">Write your first post</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {blogs.map(blog => (
                                    <div key={blog.id} className="group flex flex-col bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                                        <div className="h-40 bg-slate-100 dark:bg-white/5 relative overflow-hidden">
                                            {blog.coverImage ? (
                                                <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><ImageIcon className="w-10 h-10" /></div>
                                            )}
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-lg backdrop-blur-md ${blog.isPublished ? 'bg-green-500/90 text-white' : 'bg-slate-900/80 text-white'}`}>
                                                    {blog.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 font-medium">
                                                <Calendar className="w-3.5 h-3.5" /> {new Date(blog.createdAt).toLocaleDateString()}
                                                <span className="w-1 h-1 rounded-full bg-slate-300 mx-1"></span>
                                                <Eye className="w-3.5 h-3.5" /> {blog.views}
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{blog.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">{blog.excerpt || 'No excerpt provided.'}</p>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                                                <button onClick={() => handleEdit(blog)} className="text-sm font-bold text-slate-700 dark:text-white hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                                                    <Edit3 className="w-4 h-4" /> Edit Post
                                                </button>
                                                <button onClick={() => handleDelete(blog.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 z-10 bg-white dark:bg-background-dark flex flex-col h-full rounded-2xl">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/20 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {form.id ? 'Edit Post' : 'Create New Post'}
                                        {form.isPublished && <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Live</span>}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors hover:border-indigo-500/30">
                                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} />
                                    Publish visibly
                                </label>
                                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-70">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Post'}
                                </button>
                            </div>
                        </div>

                        {/* Editor Canvas Container */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Main Writing Area */}
                            <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
                                <div className="max-w-3xl mx-auto space-y-8">
                                    
                                    {/* Cover Image Upload (Apple-style sleek) */}
                                    <div className="relative group rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 aspect-[21/9] flex items-center justify-center transition-all hover:border-indigo-500/50">
                                        {form.coverImage ? (
                                            <>
                                                <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <label className="cursor-pointer px-6 py-3 bg-white/90 text-slate-900 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-white hover:scale-105 transition-all">
                                                        <ImageIcon className="w-4 h-4" /> Change Cover
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center gap-3 text-slate-400 hover:text-indigo-500 transition-colors w-full h-full justify-center">
                                                <div className="p-4 rounded-full bg-white dark:bg-surface-dark shadow-sm">
                                                    <ImageIcon className="w-6 h-6" />
                                                </div>
                                                <span className="font-bold text-sm">Upload Cover Image</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        )}
                                    </div>

                                    {/* Minimalist Title Input */}
                                    <textarea
                                        placeholder="Article Title..."
                                        className="w-full bg-transparent text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none resize-none leading-tight tracking-tight focus:ring-0"
                                        rows={1}
                                        value={form.title}
                                        onChange={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                            setForm({...form, title: e.target.value});
                                        }}
                                        style={{ overflow: 'hidden' }}
                                    />

                                    {/* Excerpt */}
                                    <textarea
                                        placeholder="A short subtitle or excerpt that summarizes the post..."
                                        className="w-full bg-transparent text-lg text-slate-500 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none resize-none leading-relaxed focus:ring-0 border-l-2 border-indigo-500 pl-4 py-1"
                                        rows={2}
                                        value={form.excerpt}
                                        onChange={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                            setForm({...form, excerpt: e.target.value});
                                        }}
                                        style={{ overflow: 'hidden' }}
                                    />

                                    {/* Rich Text Editor - React Quill */}
                                    <div className="prose prose-lg dark:prose-invert max-w-none pb-24">
                                        <style dangerouslySetInnerHTML={{__html: `
                                            .ql-toolbar { border: none !important; border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important; padding: 12px 0 !important; font-family: inherit !important; position: sticky; top: -10px; z-index: 10; background: inherit; backdrop-filter: blur(10px); }
                                            .dark .ql-toolbar .ql-stroke { stroke: #94a3b8 !important; }
                                            .dark .ql-toolbar .ql-fill { fill: #94a3b8 !important; }
                                            .dark .ql-toolbar button:hover .ql-stroke { stroke: #818cf8 !important; }
                                            .ql-container { border: none !important; font-size: 1.125rem !important; font-family: inherit !important; line-height: 1.8 !important;}
                                            .ql-editor { padding: 2rem 0 !important; }
                                            .ql-editor.ql-blank::before { left: 0 !important; font-style: normal !important; color: #94a3b8 !important; opacity: 0.6; }
                                        `}} />
                                        <ReactQuill 
                                            theme="snow"
                                            value={form.content}
                                            onChange={(val) => setForm({...form, content: val})}
                                            modules={quillModules}
                                            placeholder="Write your amazing story here..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SEO & Configuration Sidebar */}
                            <div className="w-80 bg-slate-50/50 dark:bg-black/10 flex flex-col border-l border-slate-100 dark:border-white/5 shrink-0 overflow-y-auto hidden lg:flex">
                                <div className="p-5 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-slate-50/90 dark:bg-[#0B1120]/90 backdrop-blur-md z-10 flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <Sparkles className="w-4 h-4 text-amber-500" /> SEO & Settings
                                    </h4>
                                    
                                    {/* SEO Score Ring */}
                                    <div className="relative w-10 h-10 flex items-center justify-center">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path className="text-slate-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path className={`${seoScore > 70 ? 'text-green-500' : seoScore > 40 ? 'text-amber-500' : 'text-red-500'}`} strokeDasharray={`${seoScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                        </svg>
                                        <span className="absolute text-[10px] font-bold text-slate-700 dark:text-white">{seoScore}</span>
                                    </div>
                                </div>
                                
                                <div className="p-5 space-y-6">
                                    {/* SEO Preview Widget */}
                                    <div className="bg-white dark:bg-black/40 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Globe className="w-3 h-3"/> Google Preview</div>
                                        <div className="text-xs text-indigo-700 dark:text-indigo-400 truncate mb-1">https://yourdomain.com/blog/{form.slug || 'your-slug'}</div>
                                        <div className="text-sm font-bold text-[#1a0dab] dark:text-[#8ab4f8] mb-1 leading-tight line-clamp-2 hover:underline cursor-pointer">{form.metaTitle || form.title || 'Your Post Title'}</div>
                                        <div className="text-xs text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">{form.metaDescription || form.excerpt || 'Write a compelling meta description to increase your click-through rate on search engines.'}</div>
                                    </div>

                                    {/* Slug Area */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                                            URL Slug
                                            <LinkIcon className="w-3 h-3"/>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="my-awesome-post"
                                            value={form.slug}
                                            onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')})}
                                        />
                                    </div>

                                    {/* Meta Title */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                                            Meta Title
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${form.metaTitle.length > 40 && form.metaTitle.length < 60 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                                                {form.metaTitle.length} / 60
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="SEO optimized title..."
                                            value={form.metaTitle}
                                            onChange={e => setForm({...form, metaTitle: e.target.value})}
                                        />
                                        <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                            <div className={`h-full transition-all ${form.metaTitle.length > 60 ? 'bg-red-500' : form.metaTitle.length > 40 ? 'bg-green-500' : 'bg-amber-500'}`} style={{width: `${Math.min(100, (form.metaTitle.length / 60) * 100)}%`}}></div>
                                        </div>
                                    </div>

                                    {/* Meta Description */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                                            Meta Description
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${form.metaDescription.length > 120 && form.metaDescription.length < 160 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                                                {form.metaDescription.length} / 160
                                            </span>
                                        </label>
                                        <textarea
                                            rows={4}
                                            className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                            placeholder="A summary of the page's content for search engines..."
                                            value={form.metaDescription}
                                            onChange={e => setForm({...form, metaDescription: e.target.value})}
                                        />
                                         <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                            <div className={`h-full transition-all ${form.metaDescription.length > 160 ? 'bg-red-500' : form.metaDescription.length > 120 ? 'bg-green-500' : 'bg-amber-500'}`} style={{width: `${Math.min(100, (form.metaDescription.length / 160) * 100)}%`}}></div>
                                        </div>
                                    </div>

                                    {/* Keywords */}
                                    <div className="space-y-2 pb-10">
                                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                                            Keywords (Comma Separated)
                                            <Tag className="w-3 h-3"/>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="marketing, api, business..."
                                            value={form.keywords}
                                            onChange={e => setForm({...form, keywords: e.target.value})}
                                        />
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BlogManager;
