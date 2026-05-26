import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PublicLayout from '../components/landing/PublicLayout';
import { Mail, MessageSquare, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const ContactUs = () => {
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [turnstileToken, setTurnstileToken] = useState('');
    const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/landing`)
            .then(res => setConfig(res.data))
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');
        setError('');

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            countryCode: formData.get('countryCode'),
            phone: formData.get('phone'),
            message: formData.get('message'),
            'cf-turnstile-response': turnstileToken
        };

        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setError('Please complete the security check.');
            setLoading(false);
            return;
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/contact`, data);
            setStatus('Thanks for reaching out! We will get back to you shortly.');
            e.target.reset();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    const info = config?.contactInfo || {
        email: 'hello@example.com',
        supportEmail: 'support@example.com',
        phone: '+1 234 567 8900',
        addressLine1: 'Global remote team',
        addressLine2: 'Building the future of messaging'
    };

    return (
        <PublicLayout title="Contact Us">
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                Have a question, feedback, or need support? Our team is always here to help you get the most out of our platform.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                    <h3 className="text-xl font-bold mb-6">Get in Touch</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Email Us</h4>
                                <p className="text-sm text-slate-500 mt-1">{info.email} <br/> {info.supportEmail}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Call Us</h4>
                                <p className="text-sm text-slate-500 mt-1">{info.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Headquarters</h4>
                                <p className="text-sm text-slate-500 mt-1">{info.addressLine1} <br/> {info.addressLine2}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                            <input name="name" type="text" required className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <input name="email" type="email" required className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                            <div className="flex gap-2">
                                <select name="countryCode" required className="w-1/3 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none cursor-pointer">
                                    <option value="" disabled selected>Code</option>
                                    <option value="+1">+1 (US/CA)</option>
                                    <option value="+44">+44 (UK)</option>
                                    <option value="+91">+91 (IN)</option>
                                    <option value="+61">+61 (AU)</option>
                                    <option value="+81">+81 (JP)</option>
                                    <option value="+49">+49 (DE)</option>
                                    <option value="+33">+33 (FR)</option>
                                    <option value="+55">+55 (BR)</option>
                                    <option value="+971">+971 (AE)</option>
                                    <option value="+27">+27 (ZA)</option>
                                    <option value="other">Other</option>
                                </select>
                                <input name="phone" type="tel" required className="w-2/3 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Phone Number" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Message</label>
                            <textarea name="message" rows="4" required className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"></textarea>
                        </div>
                        
                        {TURNSTILE_SITE_KEY && (
                            <div className="flex justify-center mt-4">
                                <Turnstile 
                                    siteKey={TURNSTILE_SITE_KEY} 
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    onError={() => setError('Captcha verification failed. Please refresh.')}
                                    onExpire={() => setTurnstileToken('')}
                                />
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Send Message <Send className="w-4 h-4" /></>}
                        </button>
                        {status && <div className="text-sm text-green-600 text-center font-medium">{status}</div>}
                        {error && <div className="text-sm text-red-500 text-center font-medium">{error}</div>}
                    </form>
                </div>
            </div>
        </PublicLayout>
    );
};

export default ContactUs;
