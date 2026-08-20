import React from 'react';
import { MapPin, Phone, Mail, MessageCircle, ChevronRight } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { Link } from 'react-router-dom';
import { getStoreRoute } from '../utils/storeRouting';

export default function WaStoreFooter({ store }) {
    const { publicSettings } = useUI();

    if (!store) return null;

    // Helper to check if rich text actually has content (isn't just <p><br></p>)
    const hasContent = (html) => html && html.replace(/<[^>]*>?/gm, '').trim().length > 0;
    
    const hasContactInfo = !!(store.email || store.whatsappNumber || store.phone || store.address);

    const hasPolicies = hasContent(store.shippingPolicy) || 
                        hasContent(store.termsConditions) || 
                        hasContent(store.privacyPolicy) || 
                        hasContent(store.returnPolicy);

    // Get categories excluding hidden
    const allCategories = (store.categories || []).filter(c => !(store.hiddenCategories || []).includes(c));
    const topCategories = allCategories.slice(0, 4);
    const hasMoreCategories = allCategories.length > 4;

    return (
        <footer className="bg-white dark:bg-[#0c0c0c] border-t border-gray-200 dark:border-white/10 pt-12 pb-32 md:py-16 mt-auto text-slate-800 dark:text-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* Left Column: Store Branding, Description & Contact Details (spans 5 cols on lg) */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-4">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {store.name}
                            </h3>
                            {store.description && (
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed max-w-sm">
                                    {store.description}
                                </p>
                            )}
                        </div>

                        {/* Physical Address */}
                        {store.address && (
                            <div className="flex items-start gap-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-300 pt-1">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" />
                                <p className="leading-relaxed">
                                    {store.address}
                                    {store.city && `, ${store.city}`}
                                    {store.state && `, ${store.state}`}
                                    {store.country && `, ${store.country}`}
                                </p>
                            </div>
                        )}

                        {/* Direct Contacts */}
                        <div className="space-y-2.5 pt-1">
                            {store.whatsappNumber && (
                                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-500" />
                                    <a 
                                        href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono font-medium"
                                    >
                                        {store.whatsappNumber}
                                    </a>
                                </div>
                            )}
                            {store.phone && (
                                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-gray-400 dark:text-gray-500" />
                                    <a 
                                        href={`tel:${store.phone}`} 
                                        className="hover:text-gray-900 dark:hover:text-white transition-colors font-mono font-medium"
                                    >
                                        {store.phone}
                                    </a>
                                </div>
                            )}
                            {store.email && (
                                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-gray-400 dark:text-gray-500" />
                                    <a 
                                        href={`mailto:${store.email}`} 
                                        className="hover:text-gray-900 dark:hover:text-white transition-colors truncate font-medium"
                                    >
                                        {store.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Information (spans 2 or 3 cols on lg) */}
                    <div className="lg:col-span-2 sm:col-span-1">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                            Information
                        </h4>
                        <ul className="space-y-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                            <li>
                                <Link 
                                    to={getStoreRoute(store.slug, '/')} 
                                    className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                >
                                    Home
                                </Link>
                            </li>
                            {hasContent(store.aboutUs) && (
                                <li>
                                    <Link 
                                        to={getStoreRoute(store.slug, '/pages/about-us')} 
                                        className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                    >
                                        About Us
                                    </Link>
                                </li>
                            )}
                            {hasContactInfo && (
                                <li>
                                    <Link 
                                        to={getStoreRoute(store.slug, '/pages/contact-us')} 
                                        className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                    >
                                        Contact Us
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Column 3: Shop / Categories (spans 3 cols on lg) */}
                    {allCategories.length > 0 && (
                        <div className="lg:col-span-3 sm:col-span-1">
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                Shop
                            </h4>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                                {topCategories.map(cat => (
                                    <li key={cat}>
                                        <Link 
                                            to={getStoreRoute(store.slug, `/category/${encodeURIComponent(cat)}`)} 
                                            className="hover:text-gray-900 dark:hover:text-white transition-colors line-clamp-1 inline-block py-0.5"
                                        >
                                            {cat}
                                        </Link>
                                    </li>
                                ))}
                                {allCategories.length > 0 && (
                                    <li className="pt-1">
                                        <Link 
                                            to={getStoreRoute(store.slug, '/categories')} 
                                            className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors py-0.5"
                                        >
                                            <span>{hasMoreCategories ? 'More Categories' : 'All Categories'}</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Column 4: Policies (spans 3 cols on lg) */}
                    {hasPolicies && (
                        <div className="lg:col-span-3 sm:col-span-1">
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                Policies
                            </h4>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                                {hasContent(store.shippingPolicy) && (
                                    <li>
                                        <Link 
                                            to={getStoreRoute(store.slug, '/pages/shipping-policy')} 
                                            className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                        >
                                            Shipping Policy
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.termsConditions) && (
                                    <li>
                                        <Link 
                                            to={getStoreRoute(store.slug, '/pages/terms-and-conditions')} 
                                            className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                        >
                                            Terms & Conditions
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.privacyPolicy) && (
                                    <li>
                                        <Link 
                                            to={getStoreRoute(store.slug, '/pages/privacy-policy')} 
                                            className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                        >
                                            Privacy Policy
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.returnPolicy) && (
                                    <li>
                                        <Link 
                                            to={getStoreRoute(store.slug, '/pages/return-policy')} 
                                            className="hover:text-gray-900 dark:hover:text-white transition-colors inline-block py-0.5"
                                        >
                                            Return Policy
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <p className="text-center sm:text-left font-medium">
                        &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
                    </p>
                    
                    {store.customFooterText ? (
                        <>
                            <p className="text-center sm:order-last sm:text-right font-medium text-gray-700 dark:text-gray-300">
                                {store.customFooterText}
                            </p>
                            <p className="text-center font-medium">
                                Made by <a href="/" className="text-gray-900 dark:text-white font-bold hover:underline">{publicSettings?.appName || 'Bluetick.cloud'}</a>
                            </p>
                        </>
                    ) : (
                        <p className="text-center sm:text-right font-medium">
                            Made by <a href="/" className="text-gray-900 dark:text-white font-bold hover:underline">{publicSettings?.appName || 'Bluetick.cloud'}</a>
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}
