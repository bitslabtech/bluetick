import React from 'react';

/**
 * Required consent before connecting a Meta product (WhatsApp Business or Meta Ads).
 * Connecting links the user's Meta account, so Meta's own terms and privacy policy apply on
 * top of ours; the user must tick this before the connect button works.
 */
const LINKS = {
    whatsapp: [
        { label: 'WhatsApp Business Terms of Service', href: 'https://www.whatsapp.com/legal/business-terms/' },
        { label: 'WhatsApp Business Messaging Policy', href: 'https://business.whatsapp.com/policy' },
        { label: 'Meta Privacy Policy', href: 'https://www.facebook.com/privacy/policy/' },
    ],
    ads: [
        { label: 'Meta Terms of Service', href: 'https://www.facebook.com/terms.php' },
        { label: 'Meta Advertising Standards', href: 'https://transparency.meta.com/policies/ad-standards/' },
        { label: 'Meta Privacy Policy', href: 'https://www.facebook.com/privacy/policy/' },
    ],
};

const PRODUCT = { whatsapp: 'my WhatsApp Business Account', ads: 'my Meta ad account' };

const ExternalLink = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1877F2] hover:underline">
        {children}
    </a>
);

export default function MetaConsentCheckbox({ product = 'whatsapp', checked, onChange, className = '', textClassName = 'text-gray-600' }) {
    const links = LINKS[product] || LINKS.whatsapp;
    return (
        <label className={`flex items-start gap-3 cursor-pointer text-left ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
            />
            <span className={`text-xs sm:text-[13px] leading-relaxed ${textClassName}`}>
                I agree to connect {PRODUCT[product] || PRODUCT.whatsapp} to OneDash. Meta's terms apply to this connection:{' '}
                {links.map((l, i) => (
                    <React.Fragment key={l.href}>
                        <ExternalLink href={l.href}>{l.label}</ExternalLink>
                        {i < links.length - 2 ? ', ' : i === links.length - 2 ? ' and ' : ''}
                    </React.Fragment>
                ))}
                . OneDash will handle the data shared with it as described in our{' '}
                <ExternalLink href="/privacy">Privacy Policy</ExternalLink>.
            </span>
        </label>
    );
}
