import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Zap, MessageSquare, BarChart, Shield, Send, Server, Users, ArrowRight, Check, Star, Menu, X, ChevronRight, UserPlus, Smartphone, HelpCircle, ChevronDown } from 'lucide-react';

// Icon Map
const IconMap = { Zap, MessageSquare, BarChart, Shield, Send, Server, Users, Star, ArrowRight, Check, UserPlus, Smartphone, HelpCircle };

const LandingPage = () => {
    const [config, setConfig] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [error, setError] = useState(false);

    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetchConfig();
        fetchPlans();
    }, []);

    // Update SEO Meta
    useEffect(() => {
        if (config?.seo) {
            document.title = config.seo.title || 'WhatsApp Cloud';

            // Allow social sharing/SEO description
            let metaDesc = document.querySelector("meta[name='description']");
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = config.seo.description || '';
        }
    }, [config]);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/landing');
            setConfig(res.data);
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    const fetchPlans = async () => {
        try {
            // Fetch only public plans (excludes default/hidden plans)
            const res = await axios.get('http://localhost:5000/api/plans/public');
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans', err);
        }
    };

    if (error) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4">
            <p className="text-red-400">Failed to load content.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold">Retry</button>
        </div>
    );

    if (!config) return (
        <div className="h-screen w-full flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        {config.brand.name}
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
                        <Link to="/login" className="text-white hover:text-indigo-400 transition-colors">Log In</Link>
                        <Link
                            to="/register"
                            className="px-5 py-2.5 bg-white text-black rounded-full hover:bg-slate-200 transition-all font-bold"
                        >
                            Get Started
                        </Link>
                    </div>

                    <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
                        >
                            <div className="flex flex-col p-6 gap-6 text-center">
                                <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
                                <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
                                <Link to="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-white text-black py-3 rounded-full font-bold">Get Started</Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />

                <div className="max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-md">
                            New Release 2.0
                        </span>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                            {config.hero.title}
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            {config.hero.subtitle}
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <Link
                                to={config.hero.ctaLink}
                                className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-white/10 flex items-center gap-2"
                            >
                                {config.hero.ctaText} <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/login"
                                className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-colors backdrop-blur-md"
                            >
                                Live Demo
                            </Link>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    {config.stats && config.stats.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-20 mt-20 border-t border-white/5 pt-10"
                        >
                            {config.stats.map((stat, i) => {
                                const Icon = IconMap[stat.icon] || BarChart;
                                return (
                                    <div key={i} className="text-center">
                                        <div className="flex items-center justify-center mb-2 text-indigo-500">
                                            <Icon className="w-6 h-6 opacity-80" />
                                        </div>
                                        <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                                        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">{stat.label}</div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-zinc-950 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Powerful features built for modern businesses.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {config.features.map((feature, i) => {
                            const Icon = IconMap[feature.icon] || Zap;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-white/[0.07] transition-all group"
                                >
                                    <div className="w-12 h-12 bg-black rounded-2xl border border-white/10 flex items-center justify-center mb-6 group-hover:border-indigo-500/50 transition-colors">
                                        <Icon className="w-6 h-6 text-white group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>



            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-black relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Choose the perfect plan for your business needs.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`p-8 rounded-3xl border flex flex-col ${plan.name === 'Pro' || plan.name === 'Business' // Highlight popular plans
                                    ? 'bg-indigo-900/10 border-indigo-500/50 relative overflow-hidden'
                                    : 'bg-white/5 border-white/5'
                                    }`}
                            >
                                {(plan.name === 'Pro' || plan.name === 'Business') && (
                                    <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-bl-xl">POPULAR</div>
                                )}

                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <div className="text-4xl font-bold mb-1">${plan.price}</div>
                                <div className="text-sm text-slate-400 mb-6">per month</div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-center gap-3 text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <span>{plan.messageLimit} Messages/mo</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <span>{plan.contactLimit} Contacts</span>
                                    </li>
                                </ul>

                                <Link
                                    to={`/register?plan=${plan.id}`}
                                    className={`w-full py-3 rounded-xl font-bold text-center transition-colors ${plan.name === 'Pro' || plan.name === 'Business'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    Choose {plan.name}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            {
                config.testimonials && config.testimonials.length > 0 && (
                    <section id="testimonials" className="py-24">
                        <div className="max-w-7xl mx-auto px-6">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-bold mb-4">Loved by innovators</h2>
                                <p className="text-slate-400">Join thousands of businesses scaling with us.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {config.testimonials.map((t, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/5"
                                    >
                                        <div className="flex gap-1 text-yellow-500 mb-6">
                                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                                        </div>
                                        <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8 text-slate-200">
                                            "{t.quote}"
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg">
                                                {t.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{t.name}</div>
                                                <div className="text-sm text-slate-400">{t.role}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            {/* CTA */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto relative rounded-[3rem] overflow-hidden bg-indigo-600">
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

                    <div className="relative py-24 px-8 text-center">
                        <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">{config.cta.title}</h2>
                        <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                            {config.cta.subtitle}
                        </p>
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-2xl"
                        >
                            {config.cta.buttonText} <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-xl tracking-tight mb-4">
                    <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-white" />
                    </div>
                    {config.brand.name}
                </div>
                <p className="text-slate-500 text-sm">{config.brand.footerText}</p>
            </footer>
        </div >
    );
};

const FAQItem = ({ faq }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
            >
                <span className="font-bold text-lg">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 pt-0 text-slate-400 leading-relaxed">
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
