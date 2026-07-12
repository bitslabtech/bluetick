import React, { useState } from 'react';
import { MapPin, X, Phone, Mail } from 'lucide-react';
import { useUI } from '../context/UIContext';
import DOMPurify from 'dompurify';

export default function WaStoreFooter({ store }) {
    const { publicSettings } = useUI();
    const [policyModal, setPolicyModal] = useState(null); // 'terms', 'privacy', 'return', or null

    if (!store) return null;

    const renderPolicyModal = () => {
        if (!policyModal) return null;
        
        let title = '';
        let content = '';

        if (policyModal === 'terms') {
            title = 'Terms & Conditions';
            content = store.termsConditions;
        } else if (policyModal === 'privacy') {
            title = 'Privacy Policy';
            content = store.privacyPolicy;
        } else if (policyModal === 'return') {
            title = 'Return & Refund Policy';
            content = store.returnPolicy;
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={() => setPolicyModal(null)} />
                <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="px-4 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        <button onClick={() => setPolicyModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 md:p-6 overflow-y-auto prose prose-sm text-gray-600">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content?.replace(/\n/g, '<br />') || 'No policy provided.') }} />
                    </div>
                </div>
            </div>
        );
    };

    const hasPolicies = store.termsConditions || store.privacyPolicy || store.returnPolicy;

    return (
        <footer className="bg-white border-t border-gray-200 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    
                    {/* Store Info */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{store.name}</h3>
                        {store.address && (
                            <div className="flex items-start gap-3 text-sm text-gray-500 max-w-sm mb-3">
                                <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-gray-400" />
                                <p>
                                    {store.address}
                                    {store.city && `, ${store.city}`}
                                    {store.state && `, ${store.state}`}
                                    {store.country && `, ${store.country}`}
                                </p>
                            </div>
                        )}
                        {store.whatsappNumber && (
                            <div className="flex items-center gap-3 text-sm text-gray-500 max-w-sm mb-3">
                                <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                                <p>{store.whatsappNumber}</p>
                            </div>
                        )}
                        {store.phone && (
                            <div className="flex items-center gap-3 text-sm text-gray-500 max-w-sm mb-3">
                                <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                                <p>{store.phone}</p>
                            </div>
                        )}
                        {store.email && (
                            <div className="flex items-center gap-3 text-sm text-gray-500 max-w-sm mb-3">
                                <Mail className="w-5 h-5 shrink-0 text-gray-400" />
                                <a href={`mailto:${store.email}`} className="hover:text-gray-900 transition-colors">{store.email}</a>
                            </div>
                        )}
                    </div>

                    {/* Links */}
                    {hasPolicies && (
                        <div className="md:text-right">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Policies</h3>
                            <ul className="space-y-3">
                                {store.termsConditions && (
                                    <li><button onClick={() => setPolicyModal('terms')} className="text-sm text-gray-500 hover:text-black transition-colors">Terms & Conditions</button></li>
                                )}
                                {store.privacyPolicy && (
                                    <li><button onClick={() => setPolicyModal('privacy')} className="text-sm text-gray-500 hover:text-black transition-colors">Privacy Policy</button></li>
                                )}
                                {store.returnPolicy && (
                                    <li><button onClick={() => setPolicyModal('return')} className="text-sm text-gray-500 hover:text-black transition-colors">Return Policy</button></li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</p>
                    <p>
                        Made by <a href="/" className="text-gray-900 font-medium hover:underline">{publicSettings?.appName || 'Bluetick'}</a>
                    </p>
                </div>
            </div>
            
            {renderPolicyModal()}
        </footer>
    );
}
