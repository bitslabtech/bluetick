import React from 'react';
import { Home, Search, ShoppingCart, MessageCircle, Menu, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WaStoreMobileBottomMenu({ store, theme, cartCount, setIsCartOpen, setIsSearchOpen, setIsMobileMenuOpen }) {
    const navigate = useNavigate();

    // Default configuration if not saved yet
    const config = store?.mobileBottomMenu || [
        { id: 'home', enabled: true },
        { id: 'search', enabled: true },
        { id: 'cart', enabled: true },
        { id: 'whatsapp', enabled: true }
    ];

    const enabledItems = config.filter(item => item.enabled);

    if (enabledItems.length === 0) return null;

    const handleAction = (id) => {
        switch (id) {
            case 'home':
                navigate(`/store/${store.slug}`);
                window.scrollTo(0, 0);
                break;
            case 'search':
                if (setIsSearchOpen) setIsSearchOpen(true);
                break;
            case 'cart':
                if (setIsCartOpen) setIsCartOpen(true);
                break;
            case 'whatsapp':
                if (store.whatsappNumber) {
                    window.open(`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`, '_blank');
                }
                break;
            case 'categories':
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(true);
                break;
            case 'policies':
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(true);
                break;
            case 'profile':
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(true);
                break;
            default:
                break;
        }
    };

    const getIcon = (id) => {
        switch (id) {
            case 'home': return <Home className="w-5 h-5" />;
            case 'search': return <Search className="w-5 h-5" />;
            case 'cart': return (
                <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {cartCount}
                        </span>
                    )}
                </div>
            );
            case 'whatsapp': return <MessageCircle className="w-5 h-5" />;
            case 'categories': return <Menu className="w-5 h-5" />;
            case 'policies': return <FileText className="w-5 h-5" />;
            case 'profile': return <User className="w-5 h-5" />;
            default: return <Home className="w-5 h-5" />;
        }
    };

    const getLabel = (id) => {
        if (id === 'whatsapp') return 'WhatsApp';
        return id.charAt(0).toUpperCase() + id.slice(1);
    };

    return (
        <nav 
            className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${theme?.pageBg || 'bg-white'} border-t border-black/5 dark:border-white/10 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            {enabledItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleAction(item.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 w-full transition-colors ${theme?.textMuted || 'text-gray-500'} hover:opacity-70`}
                >
                    {getIcon(item.id)}
                    <span className="text-[10px] font-semibold mt-1">{getLabel(item.id)}</span>
                </button>
            ))}
        </nav>
    );
}
