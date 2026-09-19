import React, { useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { Link } from 'react-router-dom';
import { getStoreRoute } from '../utils/storeRouting';

export default function WaStoreFooter({ store, theme }) {
    const { publicSettings } = useUI();
    const [openSections, setOpenSections] = useState({
        information: false,
        shop: false,
        policies: false
    });

    if (!store) return null;

    const activeTheme = theme || (store?.themeId ? { id: store.themeId } : null);
    const isAmber = activeTheme?.id === 'amber';
    const isJewelry = activeTheme?.id === 'jewelry';

    // Theme color tokens for footer
    const fHeadingColor = isJewelry ? 'text-[#261C1D]' : isAmber ? 'text-[#261A14]' : 'text-gray-900 dark:text-white';
    const fMutedColor = isJewelry ? 'text-[#523C40]' : isAmber ? 'text-[#4A382E]' : 'text-gray-600 dark:text-gray-400';
    const fIconColor = isJewelry ? 'text-[#B76E79]' : isAmber ? 'text-[#261A14]' : 'text-gray-400 dark:text-gray-500';
    const fBorderColor = isJewelry ? 'border-[#B76E79]/25 sm:border-transparent' : 'border-[#CDC1AE]/30 sm:border-transparent dark:border-white/10';
    const fLinkColor = isJewelry ? 'hover:text-[#261C1D]' : isAmber ? 'hover:text-[#261A14]' : 'hover:text-gray-900 dark:hover:text-white';
    const fListTextColor = isJewelry ? 'text-[#523C40]' : isAmber ? 'text-[#523F34]' : 'text-gray-600 dark:text-gray-300';
    const fActionLink = isJewelry ? 'text-[#A85D6A] hover:underline' : isAmber ? 'text-[#261A14] hover:underline' : 'text-indigo-600 dark:text-indigo-400 hover:underline';
    const fBottomBar = isJewelry ? 'border-[#B76E79]/25 text-[#735A5E]' : isAmber ? 'border-[#CDC1AE] text-[#6E584B]' : 'border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400';

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
        <footer className={isJewelry
            ? "bg-[#EAD8DB] border-t border-[#B76E79]/35 pt-12 pb-[68px] md:py-16 mt-auto text-[#261C1D]"
            : isAmber
            ? "bg-[#DFD5C3] border-t border-[#CDC1AE] pt-12 pb-[68px] md:py-16 mt-auto text-[#4A382E]"
            : "bg-white dark:bg-[#0c0c0c] border-t border-gray-200 dark:border-white/10 pt-12 pb-[68px] md:py-16 mt-auto text-slate-800 dark:text-slate-200"
        }>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">

                    {/* Left Column: Store Branding, Description & Contact Details (spans 5 cols on lg) */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-4 mb-4 sm:mb-0">
                        <div>
                            <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${fHeadingColor}`}>
                                {store.name}
                            </h3>
                            {store.description && (
                                <p className={`text-sm sm:text-base mt-2 line-clamp-3 leading-relaxed max-w-sm ${fMutedColor}`}>
                                    {store.description}
                                </p>
                            )}
                        </div>

                        {/* Physical Address */}
                        {store.address && (
                            <div className={`flex items-start gap-2.5 text-sm sm:text-base pt-1 ${fMutedColor}`}>
                                <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${fIconColor}`} />
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
                                <div className={`flex items-center gap-2.5 text-sm sm:text-base ${fMutedColor}`}>
                                    <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isJewelry ? 'text-[#B76E79]' : isAmber ? 'text-[#261A14]' : 'text-emerald-500'}`} />
                                    <a
                                        href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`transition-colors font-mono font-medium ${isJewelry ? 'text-[#261C1D] hover:underline' : isAmber ? 'text-[#261A14] hover:underline' : 'hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                                    >
                                        {store.whatsappNumber}
                                    </a>
                                </div>
                            )}
                            {store.phone && (
                                <div className={`flex items-center gap-2.5 text-sm sm:text-base ${fMutedColor}`}>
                                    <Phone className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${fIconColor}`} />
                                    <a
                                        href={`tel:${store.phone}`}
                                        className={`transition-colors font-mono font-medium ${isJewelry ? 'text-[#261C1D] hover:underline' : isAmber ? 'text-[#261A14] hover:underline' : 'hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        {store.phone}
                                    </a>
                                </div>
                            )}
                            {store.email && (
                                <div className={`flex items-center gap-2.5 text-sm sm:text-base ${fMutedColor}`}>
                                    <Mail className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${fIconColor}`} />
                                    <a
                                        href={`mailto:${store.email}`}
                                        className={`transition-colors truncate font-medium ${isJewelry ? 'text-[#261C1D] hover:underline' : isAmber ? 'text-[#261A14] hover:underline' : 'hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        {store.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Information (spans 2 or 3 cols on lg) */}
                    <div className={`lg:col-span-2 sm:col-span-1 border-t ${fBorderColor} pt-4 sm:pt-0`}>
                        <button 
                            className="flex justify-between w-full items-center sm:cursor-auto focus:outline-none group"
                            onClick={() => window.innerWidth < 640 && setOpenSections(prev => ({...prev, information: !prev.information}))}
                        >
                            <h4 className={`text-sm sm:text-base font-bold uppercase tracking-wider sm:mb-4 ${fHeadingColor}`}>
                                Information
                            </h4>
                            <span className={`sm:hidden transition-transform ${openSections.information ? 'rotate-180' : ''} ${fMutedColor}`}>
                                <ChevronDown className="w-4 h-4" />
                            </span>
                        </button>
                        <ul className={`mt-4 sm:mt-0 space-y-3 text-sm sm:text-base font-medium ${openSections.information ? 'block' : 'hidden sm:block'} ${fListTextColor}`}>
                            <li>
                                <Link
                                    to={getStoreRoute(store.slug, '/')}
                                    className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                >
                                    Home
                                </Link>
                            </li>
                            {hasContent(store.aboutUs) && (
                                <li>
                                    <Link
                                        to={getStoreRoute(store.slug, '/pages/about-us')}
                                        className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                    >
                                        About Us
                                    </Link>
                                </li>
                            )}
                            {hasContactInfo && (
                                <li>
                                    <Link
                                        to={getStoreRoute(store.slug, '/pages/contact-us')}
                                        className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                    >
                                        Contact Us
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Column 3: Shop / Categories (spans 3 cols on lg) */}
                    {allCategories.length > 0 && (
                        <div className={`lg:col-span-3 sm:col-span-1 border-t ${fBorderColor} pt-4 sm:pt-0`}>
                            <button 
                                className="flex justify-between w-full items-center sm:cursor-auto focus:outline-none group"
                                onClick={() => window.innerWidth < 640 && setOpenSections(prev => ({...prev, shop: !prev.shop}))}
                            >
                                <h4 className={`text-sm sm:text-base font-bold uppercase tracking-wider sm:mb-4 ${fHeadingColor}`}>
                                    Shop
                                </h4>
                                <span className={`sm:hidden transition-transform ${openSections.shop ? 'rotate-180' : ''} ${fMutedColor}`}>
                                    <ChevronDown className="w-4 h-4" />
                                </span>
                            </button>
                            <ul className={`mt-4 sm:mt-0 space-y-3 text-sm sm:text-base font-medium ${openSections.shop ? 'block' : 'hidden sm:block'} ${fListTextColor}`}>
                                {topCategories.map(cat => (
                                    <li key={cat}>
                                        <Link
                                            to={getStoreRoute(store.slug, `/category/${encodeURIComponent(cat)}`)}
                                            className={`transition-colors line-clamp-1 inline-block py-0.5 ${fLinkColor}`}
                                        >
                                            {cat}
                                        </Link>
                                    </li>
                                ))}
                                {allCategories.length > 0 && (
                                    <li className="pt-1">
                                        <Link
                                            to={getStoreRoute(store.slug, '/categories')}
                                            className={`inline-flex items-center gap-1 font-bold py-0.5 transition-colors ${fActionLink}`}
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
                        <div className={`lg:col-span-3 sm:col-span-1 border-t ${fBorderColor} pt-4 sm:pt-0`}>
                            <button 
                                className="flex justify-between w-full items-center sm:cursor-auto focus:outline-none group"
                                onClick={() => window.innerWidth < 640 && setOpenSections(prev => ({...prev, policies: !prev.policies}))}
                            >
                                <h4 className={`text-sm sm:text-base font-bold uppercase tracking-wider sm:mb-4 ${fHeadingColor}`}>
                                    Policies
                                </h4>
                                <span className={`sm:hidden transition-transform ${openSections.policies ? 'rotate-180' : ''} ${fMutedColor}`}>
                                    <ChevronDown className="w-4 h-4" />
                                </span>
                            </button>
                            <ul className={`mt-4 sm:mt-0 space-y-3 text-sm sm:text-base font-medium ${openSections.policies ? 'block' : 'hidden sm:block'} ${fListTextColor}`}>
                                {hasContent(store.shippingPolicy) && (
                                    <li>
                                        <Link
                                            to={getStoreRoute(store.slug, '/pages/shipping-policy')}
                                            className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                        >
                                            Shipping Policy
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.termsConditions) && (
                                    <li>
                                        <Link
                                            to={getStoreRoute(store.slug, '/pages/terms-and-conditions')}
                                            className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                        >
                                            Terms & Conditions
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.privacyPolicy) && (
                                    <li>
                                        <Link
                                            to={getStoreRoute(store.slug, '/pages/privacy-policy')}
                                            className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
                                        >
                                            Privacy Policy
                                        </Link>
                                    </li>
                                )}
                                {hasContent(store.returnPolicy) && (
                                    <li>
                                        <Link
                                            to={getStoreRoute(store.slug, '/pages/return-policy')}
                                            className={`transition-colors inline-block py-0.5 ${fLinkColor}`}
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
                <div className={`mt-8 sm:mt-12 pt-6 sm:pt-8 border-t sm:border-t-0 ${fBottomBar} flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm`}>
                    <p className="text-center sm:text-left font-medium">
                        &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
                    </p>

                    {store.customFooterText ? (
                        <>
                            <p className={`text-center sm:order-last sm:text-right font-medium ${fListTextColor}`}>
                                {store.customFooterText}
                            </p>
                            <p className="text-center font-medium">
                                Made by <a href="/" className={`font-bold hover:underline ${fHeadingColor}`}>{publicSettings?.appName || 'Bluetick.cloud'}</a>
                            </p>
                        </>
                    ) : (
                        <p className="text-center sm:text-right font-medium">
                            Made by <a href="/" className={`font-bold hover:underline ${fHeadingColor}`}>{publicSettings?.appName || 'Bluetick.cloud'}</a>
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}
