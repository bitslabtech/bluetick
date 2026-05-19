import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Megaphone, Calendar, ArrowRight, ArrowUpRight, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import PublicLayout from '../components/landing/PublicLayout';

const BlogList = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        document.title = "Blog - Our Latest Updates and Insights";
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing/blogs`); // Only returns published for public
            setBlogs(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load blogs', err);
            setLoading(false);
        }
    };

    const filteredBlogs = blogs.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || (b.excerpt && b.excerpt.toLowerCase().includes(search.toLowerCase())));

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <PublicLayout pageKey="blog" fullWidth={true}>
            <div className="bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-white font-display selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200">
            {/* Hero Section */}
            <header className="pt-40 pb-20 px-6 text-center max-w-4xl mx-auto">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-tight mb-6">
                    Insights from the <br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">cutting edge.</span>
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
                    The latest news, updates, and deep dives into features to help you scale your business seamlessly.
                </motion.p>
                
                {/* Search Bar */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-12 max-w-xl mx-auto relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search for articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-indigo-500 outline-none text-lg dark:text-white transition-all hover:shadow-[0_15px_50px_-15px_rgba(0,0,0,0.15)] group-hover:scale-[1.01]"
                    />
                </motion.div>
            </header>

            {/* Featured or Grid Section */}
            <main className="max-w-7xl mx-auto px-6 pb-40">
                {filteredBlogs.length === 0 ? (
                    <div className="text-center py-20">
                        <Megaphone className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-2xl font-bold mb-2">No articles found</h3>
                        <p className="text-slate-500 max-w-md mx-auto">We couldn't find any articles matching your search criteria. Try different keywords.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                        {filteredBlogs.map((blog, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ delay: idx * 0.1 }}
                                key={blog.id} 
                                className="group flex flex-col cursor-pointer"
                            >
                                <Link to={`/blog/${blog.slug}`} className="flex flex-col h-full rounded-3xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-none dark:hover:bg-[#2C2C2E] transition-all duration-500 border border-transparent dark:border-white/5 group-hover:-translate-y-1">
                                    <div className="h-60 overflow-hidden relative bg-slate-100 dark:bg-white/5">
                                        {blog.coverImage ? (
                                            <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]" />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:scale-105 transition-transform duration-700"></div>
                                        )}
                                    </div>
                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-sm text-indigo-500 dark:text-indigo-400 font-bold tracking-wide uppercase mb-4">
                                            <Calendar className="w-4 h-4" /> 
                                            {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <h3 className="text-2xl font-extrabold tracking-tight mb-3 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{blog.title}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-6 flex-1 text-lg">{blog.excerpt}</p>
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mt-auto group-hover:gap-3 transition-all">
                                            Read Article <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
            </div>
        </PublicLayout>
    );
};

export default BlogList;
