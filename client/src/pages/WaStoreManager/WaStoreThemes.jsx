import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LayoutTemplate, CheckCircle2, ShoppingBag, Watch, Utensils, Monitor, Sparkles, Gem, Leaf, Dumbbell, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { THEMES } from '../../utils/wastoreThemes';

export default function WaStoreThemes() {
    const { id: storeId } = useParams();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);

    const getIcon = (id, className) => {
        switch(id) {
            case 'vogue': return <ShoppingBag className={className} />;
            case 'cyber': return <Monitor className={className} />;
            case 'glow': return <Sparkles className={className} />;
            case 'luxe': return <Gem className={className} />;
            case 'crave': return <Utensils className={className} />;
            case 'nordic': return <LayoutTemplate className={className} />;
            case 'fresh': return <Leaf className={className} />;
            case 'pulse': return <Dumbbell className={className} />;
            case 'professional': return <Briefcase className={className} />;
            default: return <ShoppingBag className={className} />;
        }
    };

    const themes = [
        { 
            id: 'vogue', name: 'Vogue', industry: 'Fashion', 
            description: 'Editorial layout with minimalist elegance.', 
            gradient: 'from-zinc-800 to-black',
            previewBg: 'bg-white',
            heroColor: 'bg-zinc-100',
            textColor: 'text-black',
            accent: 'bg-black'
        },
        { 
            id: 'cyber', name: 'Cyber', industry: 'Tech', 
            description: 'Dark grid, neon glow, and high-tech typography.', 
            gradient: 'from-slate-800 to-indigo-950',
            previewBg: 'bg-slate-900',
            heroColor: 'bg-cyan-900/30',
            textColor: 'text-cyan-400',
            accent: 'bg-cyan-500'
        },
        { 
            id: 'glow', name: 'Glow', industry: 'Beauty', 
            description: 'Soft pastels and glassmorphism cards.', 
            gradient: 'from-rose-300 to-pink-200',
            previewBg: 'bg-rose-50',
            heroColor: 'bg-rose-200/50',
            textColor: 'text-rose-900',
            accent: 'bg-rose-400'
        },
        { 
            id: 'luxe', name: 'Luxe', industry: 'Jewelry', 
            description: 'High-contrast black & gold luxury styling.', 
            gradient: 'from-neutral-800 to-neutral-900',
            previewBg: 'bg-zinc-950',
            heroColor: 'bg-yellow-900/20',
            textColor: 'text-yellow-500',
            accent: 'bg-yellow-600'
        },
        { 
            id: 'crave', name: 'Crave', industry: 'Food', 
            description: 'Appetizing colors and rounded bento layouts.', 
            gradient: 'from-orange-400 to-red-500',
            previewBg: 'bg-orange-50',
            heroColor: 'bg-orange-200',
            textColor: 'text-orange-900',
            accent: 'bg-red-500'
        },
        { 
            id: 'nordic', name: 'Nordic', industry: 'Furniture', 
            description: 'Earthy tones, clean lines, and minimal aesthetics.', 
            gradient: 'from-[#D1C4B0] to-[#bdae97]',
            previewBg: 'bg-[#F9F6F0]',
            heroColor: 'bg-[#E5D9C5]',
            textColor: 'text-[#4A4A4A]',
            accent: 'bg-[#8C8273]'
        },
        { 
            id: 'fresh', name: 'Fresh', industry: 'Grocery', 
            description: 'Vibrant greens and crisp whites for a natural look.', 
            gradient: 'from-emerald-400 to-teal-500',
            previewBg: 'bg-emerald-50',
            heroColor: 'bg-emerald-200',
            textColor: 'text-emerald-800',
            accent: 'bg-emerald-500'
        },
        { 
            id: 'pulse', name: 'Pulse', industry: 'Fitness', 
            description: 'High-energy yellow/black, dynamic shapes.', 
            gradient: 'from-yellow-400 to-amber-500',
            previewBg: 'bg-zinc-900',
            heroColor: 'bg-zinc-800',
            textColor: 'text-yellow-400',
            accent: 'bg-yellow-400'
        },
        { 
            id: 'professional', name: 'Professional', industry: 'Corporate', 
            description: 'Trustworthy corporate blues and clean UI.', 
            gradient: 'from-blue-500 to-indigo-600',
            previewBg: 'bg-slate-50',
            heroColor: 'bg-blue-100',
            textColor: 'text-slate-800',
            accent: 'bg-blue-600'
        }
    ];

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
            } catch (error) {
                toast.error("Failed to load store");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [storeId]);

    const handleSelectTheme = async (themeId) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, { themeId }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setStore({ ...store, themeId });
            toast.success("Theme updated successfully!");
        } catch (error) {
            toast.error("Failed to update theme");
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-500 flex justify-center items-center h-64">Loading premium themes...</div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <LayoutTemplate className="w-8 h-8 text-indigo-500" />
                    Premium Store Templates
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                    Select a visually distinct theme. All themes are fully responsive, providing an app-like experience on mobile and a full-fledged e-commerce website layout on desktop.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {themes.map(theme => {
                    const isActive = store?.themeId === theme.id;
                    
                    return (
                        <div 
                            key={theme.id}
                            className={`group bg-white dark:bg-surface-dark border-2 rounded-[2rem] overflow-hidden transition-all duration-300 flex flex-col ${
                                isActive 
                                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/10' 
                                    : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 hover:shadow-2xl hover:-translate-y-1'
                            }`}
                        >
                            {/* Graphic Header with Centered Phone Mockup */}
                            {/* Fixed overflow and height so mockup stays fully inside */}
                            <div className={`relative h-64 w-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center overflow-hidden`}>
                                {/* Abstract Background Elements */}
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay" />
                                
                                {/* Phone Mockup - Now fully visible in center */}
                                <div className="w-[140px] h-[280px] bg-slate-900 rounded-[2rem] p-1.5 shadow-2xl border-4 border-slate-800 relative transform transition-transform duration-500 group-hover:scale-105">
                                    {/* Notch */}
                                    <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 rounded-b-xl w-[45%] mx-auto z-30" />
                                    
                                    {/* Screen Content - Accurate Representation */}
                                    <div className={`w-full h-full rounded-[1.5rem] overflow-hidden relative flex flex-col ${(THEMES[theme.id] || THEMES.vogue).pageBg}`}>
                                        
                                        {/* Mini Header */}
                                        <div className={`h-8 w-full flex items-center justify-between px-2 ${(THEMES[theme.id] || THEMES.vogue).header} border-none`}>
                                            <div className={`h-2 w-10 rounded ${theme.accent}`} />
                                            <div className={`h-3 w-3 rounded-full ${theme.accent}`} />
                                        </div>
                                        
                                        {/* Mini Hero Area */}
                                        <div className={`h-24 w-full relative overflow-hidden bg-white ${(THEMES[theme.id] || THEMES.vogue).heroShape}`}>
                                            <div className={`absolute inset-0 ${(THEMES[theme.id] || THEMES.vogue).heroOverlay} z-10`} />
                                            <div className={`absolute inset-0 ${theme.heroColor}`} />
                                            {/* Icon */}
                                            <div className="absolute inset-0 z-20 flex items-center justify-center">
                                                {getIcon(theme.id, `w-8 h-8 opacity-40 ${theme.textColor}`)}
                                            </div>
                                        </div>

                                        {/* Mini Categories */}
                                        <div className="px-2 pt-2 pb-1 flex gap-1 overflow-hidden shrink-0">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`h-2 w-8 shrink-0 flex items-center justify-center ${(THEMES[theme.id] || THEMES.vogue).categoryTab} border-0`} />
                                            ))}
                                        </div>
                                        
                                        {/* Mini Product Grid */}
                                        <div className="px-2 pb-2 grid grid-cols-2 gap-1.5 flex-1 overflow-hidden mt-1">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className={`flex flex-col overflow-hidden ${(THEMES[theme.id] || THEMES.vogue).cardStyle}`}>
                                                    <div className={`w-full ${(THEMES[theme.id] || THEMES.vogue).cardImageStyle} ${theme.heroColor} !border-0`} />
                                                    <div className="p-1 flex flex-col gap-0.5 bg-transparent">
                                                        <div className={`h-1 w-full rounded-full ${theme.accent} opacity-60`} />
                                                        <div className={`h-1 w-1/2 rounded-full ${theme.accent} opacity-30`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info & Action Area */}
                            <div className="p-6 flex-1 flex flex-col relative">
                                {/* Active Badge */}
                                {isActive && (
                                    <div className="absolute -top-4 right-6 z-30 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4"/> Active
                                    </div>
                                )}

                                <div className="mb-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest`}>
                                        {theme.industry}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{theme.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1 line-clamp-2">
                                    {theme.description}
                                </p>
                                
                                <button 
                                    onClick={() => handleSelectTheme(theme.id)}
                                    disabled={isActive}
                                    className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                        isActive 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-default' 
                                            : `bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20`
                                    }`}
                                >
                                    {isActive ? 'Current Theme' : 'Apply Theme'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
