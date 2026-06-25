import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Compass, Send } from 'lucide-react';
import PublicLayout from '../components/landing/PublicLayout';

const NotFound404 = () => {
    const navigate = useNavigate();

    return (
        <PublicLayout title="Page Not Found" fullWidth={true}>
            <div className="min-h-[85vh] w-full flex flex-col items-center justify-center p-6 pt-32 pb-24 relative overflow-hidden transition-colors duration-300 bg-white select-none">
                
                {/* Soft ambient background glow blobs */}
                <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                    
                    {/* Thematic Animated Paper Plane Orbit Graphic */}
                    <div className="relative w-44 h-44 flex items-center justify-center mb-6">
                        {/* Glow effect behind the center icon */}
                        <div className="absolute inset-4 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                        
                        {/* Dotted Orbit Line */}
                        <svg className="w-full h-full animate-[spin_40s_linear_infinite] opacity-60" viewBox="0 0 200 200">
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="75" 
                                fill="none" 
                                stroke="currentColor" 
                                className="text-slate-300" 
                                strokeWidth="2" 
                                strokeDasharray="6 6" 
                            />
                        </svg>

                        {/* Orbiting Paper Plane */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="w-full h-full relative">
                                <motion.div 
                                    className="absolute left-[calc(50%-12px)] top-[14px] text-indigo-600"
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    {/* Rotating Send icon represents a flying message paper-plane */}
                                    <Send size={22} className="rotate-45" />
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Center Icon */}
                        <motion.div 
                            className="absolute w-20 h-20 rounded-full bg-white border border-slate-200/60 flex items-center justify-center shadow-lg"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Compass className="w-9 h-9 text-indigo-600" />
                        </motion.div>
                    </div>

                    {/* Giant 404 Typography */}
                    <motion.h1
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 leading-none tracking-tighter mb-4 select-none drop-shadow-sm"
                    >
                        404
                    </motion.h1>

                    {/* Headings and Descriptions */}
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
                        Oops! You've drifted off course.
                    </h2>
                    
                    <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
                        We couldn't find the page you were looking for. It might have been moved, deleted, or never existed in the first place.
                    </p>

                    {/* Functional Navigation Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-slate-700 font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-55 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
                            Go Back
                        </button>
                        
                        <button
                            onClick={() => navigate('/')}
                            className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <Home size={18} className="group-hover:scale-110 transition-transform duration-200" />
                            Back to Home
                        </button>
                    </div>

                </div>
            </div>
        </PublicLayout>
    );
};

export default NotFound404;
