import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Phone, Mail, QrCode, MessageCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SLIDES = [
    {
        id: 'whatsapp',
        title: 'Automated WhatsApp Marketing',
        description: 'Recover abandoned carts and provide 24/7 AI customer support directly inside WhatsApp.',
        badge: 'Top Feature',
        badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        cta: 'Explore WhatsApp Features'
    },
    {
        id: 'store',
        title: 'Launch Your Online Storefront',
        description: 'Build a premium e-commerce store in minutes. Sync inventory and accept global payments.',
        badge: 'New',
        badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        cta: 'Start Selling Online'
    },
    {
        id: 'meta',
        title: 'High-Converting Meta Ads',
        description: 'Launch Facebook & Instagram ads from your dashboard to drive traffic straight to your WhatsApp.',
        badge: 'ROI Focused',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        cta: 'Boost Your Sales'
    },
    {
        id: 'vcard',
        title: 'Smart Digital vCards',
        description: 'Replace paper business cards with dynamic digital profiles. Share contact info via QR code.',
        badge: 'Networking',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        cta: 'Create Your vCard'
    }
];

export default function HeroCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const timer = setInterval(() => {
            setDirection(1);
            setActiveIndex((prev) => (prev + 1) % SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeIndex]);

    const handleDotClick = (index) => {
        setDirection(index > activeIndex ? 1 : -1);
        setActiveIndex(index);
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 800 : -800,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 800 : -800,
            opacity: 0
        })
    };

    const renderMockup = (id) => {
        switch (id) {
            case 'whatsapp':
                return (
                    <div className="w-full max-w-[260px] h-[340px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col mx-auto relative z-10 transform -rotate-1 hover:rotate-0 transition-transform duration-500 origin-center scale-[0.85] sm:scale-100">
                        <div className="bg-[#128C7E] p-3 text-white flex items-center gap-2 shadow-md z-10">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle className="w-4 h-4" /></div>
                            <div>
                                <div className="text-xs font-bold">AI Support</div>
                                <div className="text-[9px] text-green-100">Online 24/7</div>
                            </div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col gap-3 bg-[url('https://i.imgur.com/GjEq44C.png')] bg-cover opacity-90 dark:opacity-40 text-[10px]">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl rounded-tl-sm w-4/5 shadow-sm text-slate-800 dark:text-slate-200">Hi! I noticed you abandoned your cart. Want a discount? 🛍️</div>
                            <div className="bg-[#DCF8C6] dark:bg-green-900 p-2 rounded-xl rounded-tr-sm w-3/4 self-end shadow-sm text-green-900 dark:text-green-100">Yes please! Send the code.</div>
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl rounded-tl-sm w-4/5 shadow-sm text-slate-800 dark:text-slate-200">Here is your code: SAVE10. Click below!</div>
                            <div className="bg-white dark:bg-slate-800 text-blue-500 font-bold py-2 rounded-lg text-center w-4/5 shadow-sm cursor-pointer mt-[-4px]">Checkout Now</div>
                        </div>
                    </div>
                );
            case 'store':
                return (
                    <div className="w-full max-w-[210px] aspect-[792/1708] border-4 border-slate-900 rounded-[2rem] shadow-2xl overflow-hidden mx-auto relative z-10 transform rotate-1 hover:rotate-0 transition-transform duration-500 flex flex-col origin-center scale-[0.85] sm:scale-100 bg-transparent">
                        <video src="/online-store-demo.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover rounded-[1.6rem]" />
                    </div>
                );
            case 'meta':
                return (
                    <div className="w-full max-w-[210px] aspect-[720/1280] border-4 border-slate-900 rounded-[2rem] shadow-2xl overflow-hidden mx-auto relative z-10 transform -rotate-1 hover:rotate-0 transition-transform duration-500 flex flex-col origin-center scale-[0.85] sm:scale-100 bg-transparent">
                        <video src="/ctwa-demo.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover rounded-[1.6rem]" />
                    </div>
                );
            case 'vcard':
                return (
                    <div className="w-full max-w-[240px] h-[320px] bg-gradient-to-br from-violet-600 to-indigo-800 rounded-3xl shadow-2xl p-5 flex flex-col items-center justify-center text-white border border-white/20 overflow-hidden mx-auto relative z-10 transform rotate-2 hover:rotate-0 transition-transform duration-500 origin-center scale-[0.85] sm:scale-100">
                        <div className="w-16 h-16 rounded-full border-2 border-white/30 p-1 mb-3 bg-white/10 backdrop-blur-md">
                            <img src="https://i.pravatar.cc/150?img=32" className="w-full h-full rounded-full object-cover" alt="Profile" />
                        </div>
                        <div className="font-bold text-lg mb-1">Sarah Jenkins</div>
                        <div className="text-xs text-white/70 mb-5">Marketing Director</div>
                        <div className="w-full grid grid-cols-2 gap-2 mb-5">
                            <div className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl p-2 flex flex-col items-center justify-center"><Phone className="w-4 h-4 mb-1"/><span className="text-[10px]">Call</span></div>
                            <div className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl p-2 flex flex-col items-center justify-center"><Mail className="w-4 h-4 mb-1"/><span className="text-[10px]">Email</span></div>
                        </div>
                        <div className="mt-auto w-16 h-16 bg-white rounded-xl p-1.5 shadow-inner">
                            <QrCode className="w-full h-full text-indigo-900" />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative w-full overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-white/5 rounded-[1.5rem] p-4 sm:p-6 lg:p-8 min-h-[380px] flex flex-col">
            
            {/* Main Slider Area */}
            <div className="relative flex-1 w-full h-[320px]">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={activeIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 350, damping: 35 },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0 w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-center"
                    >
                        {/* Text Content (Left Side) */}
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1 px-2 lg:px-0 mt-4 lg:mt-0">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mb-3 ${SLIDES[activeIndex].badgeColor}`}>
                                {SLIDES[activeIndex].badge}
                            </span>
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight">
                                {SLIDES[activeIndex].title}
                            </h2>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-5 leading-relaxed max-w-lg">
                                {SLIDES[activeIndex].description}
                            </p>
                            <Link to="/register" className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group text-sm">
                                {SLIDES[activeIndex].cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        
                        {/* Mockup (Right Side) */}
                        <div className="relative order-1 lg:order-2 flex items-center justify-center h-[260px] sm:h-full w-full">
                            {/* Decorative Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-[60px] rounded-full w-2/3 h-2/3 m-auto" />
                            
                            {renderMockup(SLIDES[activeIndex].id)}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-30">
                {SLIDES.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        className={`transition-all duration-300 rounded-full ${
                            index === activeIndex 
                                ? 'w-6 h-1.5 bg-indigo-600 dark:bg-indigo-500' 
                                : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
