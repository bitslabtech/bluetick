const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LandingPage = sequelize.define('LandingPage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    hero: {
        type: DataTypes.JSON,
        defaultValue: {
            title: '5X Your Leads\nwith the Power of WhatsApp',
            subtitle: 'Broadcast, Automate, Engage, Sell - do everything with the AI-powered WhatsApp Marketing & Engagement Platform.',
            ctaText: 'Start Free Trial',
            ctaLink: '/register',
            image: '',
            gradientStart: '#4f46e5', // Indigo-600
            gradientEnd: '#9333ea'    // Purple-600
        }
    },
    features: {
        type: DataTypes.JSON,
        defaultValue: [
            { title: 'Bulk Messaging', description: 'Send thousands of messages in seconds with high delivery rates.', icon: 'MessageSquare' },
            { title: 'Smart Networking', description: 'Real-time analytics and detailed delivery reports.', icon: 'BarChart' },
            { title: 'Secure & Private', description: 'Enterprise-grade encryption for your customer data.', icon: 'Shield' }
        ]
    },
    stats: {
        type: DataTypes.JSON,
        defaultValue: [
            { label: 'Messages Sent', value: '10M+', icon: 'Send' },
            { label: 'Happy Users', value: '50k+', icon: 'Users' },
            { label: 'Uptime', value: '99.9%', icon: 'Server' }
        ]
    },
    testimonials: {
        type: DataTypes.JSON,
        defaultValue: [
            { name: 'Sarah Johnson', role: 'Marketing Director', quote: 'This tool revolutionized our customer outreach. The ROI is incredible.', avatar: '' },
            { name: 'David Chen', role: 'CEO, TechStart', quote: 'Simple, powerful, and reliable. Exactly what we needed.', avatar: '' }
        ]
    },
    cta: {
        type: DataTypes.JSON,
        defaultValue: {
            title: 'Ready to grow your business?',
            subtitle: 'Join thousands of businesses using our platform today.',
            buttonText: 'Start Your Free Trial'
        }
    },
    brand: {
        type: DataTypes.JSON,
        defaultValue: {
            name: 'Bluetick',
            logo: '',
            footerText: '© 2024 Bluetick. All rights reserved.'
        }
    },
    trustedBy: {
        type: DataTypes.JSON,
        defaultValue: [
            { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
            { name: 'Microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
            { name: 'Spotify', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg' },
            { name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
            { name: 'Slack', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' }
        ]
    },
    faqs: {
        type: DataTypes.JSON,
        defaultValue: [
            { question: 'Is there a free trial?', answer: 'Yes, we offer a 14-day free trial on all plans.' },
            { question: 'Can I cancel anytime?', answer: 'Absolutely. There are no lock-in contracts.' }
        ]
    },
    steps: {
        type: DataTypes.JSON,
        defaultValue: [
            { title: 'Create Your Account', description: 'Sign up in under 2 minutes. No credit card required - get started instantly.', icon: 'UserPlus' },
            { title: 'Connect via Meta Signup', description: 'Use our embedded Meta Business signup flow to securely connect your WhatsApp Business number — no QR code, no manual setup.', icon: 'Smartphone' },
            { title: 'Launch Your First Campaign', description: 'Import contacts, pick a template and broadcast to thousands of customers in seconds.', icon: 'Send' }
        ]
    },
    seo: {
        type: DataTypes.JSON,
        defaultValue: {
            title: 'Bluetick - Bulk Messaging Platform',
            description: 'The best platform for WhatsApp marketing and automation.',
            keywords: 'whatsapp, marketing, bulk sender, automation, business api',
            ogImage: '',
            canonicalUrl: '',
            robots: 'index, follow',
            twitterCard: 'summary_large_image',
            socialTitle: '',
            socialDescription: '',
            socialLinks: {
                facebook: '',
                twitter: '',
                instagram: '',
                linkedin: ''
            }
        }
    },
    footer: {
        type: DataTypes.JSON,
        defaultValue: {
            columns: [
                {
                    heading: "Product",
                    links: [
                        { label: "Features", href: "#platform" },
                        { label: "Pricing", href: "#pricing" },
                        { label: "Blog", href: "/blog" },
                        { label: "Integrations", href: "#integrations" }
                    ]
                },
                {
                    heading: "Company",
                    links: [
                        { label: "About Us", href: "/about" },
                        { label: "Partner with Us", href: "/partner" },
                        { label: "Blog", href: "/blog" },
                        { label: "Contact Support", href: "/contact" }
                    ]
                },
                {
                    heading: "Legal",
                    links: [
                        { label: "Privacy Policy", href: "/privacy" },
                        { label: "Terms of Service", href: "/terms" }
                    ]
                }
            ],
            bottomBarLeft: "© {year} {brand}. All rights reserved.",
            bottomBarRight: "Built for Scale • 99.9% Uptime"
        }
    },
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'light'
    },
    publicPages: {
        type: DataTypes.JSON,
        defaultValue: {
            about: '',
            partner: '',
            contact: '',
            privacy: '',
            terms: ''
        }
    },
    aiChatbot: {
        type: DataTypes.JSON,
        defaultValue: {
            enabled: false,
            welcomeMessage: 'Hi there! How can I help you learn more about our platform?',
            knowledgeBase: 'We are a powerful WhatsApp Business API platform designed to automate your marketing, sales, and customer support.'
        }
    },
    contactInfo: {
        type: DataTypes.JSON,
        defaultValue: {
            email: 'hello@example.com',
            supportEmail: 'support@example.com',
            phone: '+1 234 567 8900',
            addressLine1: 'Global remote team',
            addressLine2: 'Building the future of messaging'
        }
    },
    capabilities: {
        type: DataTypes.JSON,
        defaultValue: {
            title: 'Powerful Capabilities That Maximize Your Reach',
            subtitle: 'Everything you need to market, sell, and support on WhatsApp.',
            cards: [
                { id: 'marketing', title: 'Maximize Leads, \nOptimize Sales', desc: 'Run Click-to-WhatsApp ads to capture leads instantly on Meta platforms and run personalized broadcast campaigns.', tag: 'Marketing', link: '#', image: '' },
                { id: 'support', title: 'Shared Team Inbox', desc: 'Collaborate with multiple agents on a single WhatsApp number to resolve queries lightning fast.', tag: 'Support', link: '#', image: '' },
                { id: 'automation', title: 'No-Code AI Chatbots', desc: '', tag: 'Automation', link: '', image: '' },
                { id: 'commerce', title: 'Product Catalogs', desc: '', tag: 'Commerce', link: '', image: '' },
                { id: 'crm', title: 'Organize & Track Leads', desc: '', tag: 'Sales CRM', link: '', image: '' }
            ]
        }
    },
    advancedFeatures: {
        type: DataTypes.JSON,
        defaultValue: {
            title: 'Advanced Features that drive Conversions',
            subtitle: 'Everything you need to market, sell, and support customers — all inside WhatsApp.',
            features: [
                { id: 'chatbot', label: 'No-Code Flow Bots', tagText: 'Automation', title: 'Build No-Code Chatbot in Minutes', desc: 'Visual drag-and-drop flow builder for WhatsApp chatbots & product catalog journeys — no code, no complexity.', stats: ['80% Auto-resolved', '24/7 Running', '5 min Setup'], image: '' },
                { id: 'livechat', label: 'Multi-Agent Inbox', tagText: 'Support', title: 'Shared Team Inbox for WhatsApp', desc: 'Let multiple agents handle conversations from one WhatsApp number. Smart routing, labels, quick replies, and internal notes included.', stats: ['60% Faster Support', 'Smart Routing', 'Team Collab'], image: '' },
                { id: 'analytics_wa', label: 'Delivery Reports', tagText: 'Insights', title: 'Message Delivery & Read Rates', desc: 'Monitor exactly how many messages are sent, delivered, and read in real-time. Understand agent performance and customer engagement.', stats: ['Read Rates', 'Agent Performance', 'Engagement KPIs'], image: '' },
                { id: 'aibot', label: 'Generative AI Bot', tagText: 'AI-Powered', title: 'Generative AI that Sells & Supports', desc: 'Train your own GPT-powered bot on product knowledge, FAQs, pricing and policies. It answers, qualifies and converts leads — 24/7, autonomously.', stats: ['GPT-4 Powered', 'Custom Training', 'Zero Hallucination'], image: '' },
                { id: 'broadcast', label: 'Meta Ads & Broadcasts', tagText: 'Marketing', title: 'Click-to-WhatsApp (CTWA) & Bulk Broadcasts', desc: 'Launch Meta Ads that drive traffic straight to your WhatsApp inbox, and broadcast personalized campaigns to thousands instantly.', stats: ['98% Open Rate', '5x Lead Gen', '3x ROI'], image: '' },
                { id: 'retarget', label: 'Smart Retargeting', tagText: 'Re-engagement', title: 'Retarget to 3X Conversions', desc: "Re-engage customers who didn't respond or purchase with hyper-personalized automated follow-up campaigns and smart audience segments.", stats: ['3x Conversions', 'Auto Follow-up', 'Smart Segments'], image: '' },
                { id: 'audience_sync', label: 'CRM Audience Sync', tagText: 'Integration', title: 'Auto-Sync Contacts to Meta', desc: 'Seamlessly sync your WhatsApp contacts and segmented CRM lists directly to Meta Custom Audiences for highly targeted Facebook & Instagram ads.', stats: ['Lookalike Sync', 'Zero Manual Export', 'High Match Rate'], image: '' },

                { id: 'analytics_meta', label: 'Ad Performance', tagText: 'Insights', title: 'Real-Time Meta Campaign Analytics', desc: 'Monitor Ad Spend, Click-to-WhatsApp conversions, and ROAS live. Track exactly which ads drive the most engaged conversations.', stats: ['Live Dashboard', 'Campaign ROI', 'Ad Spend Tracking'], image: '' },
                { id: 'meta_lead_ads', label: 'Click-to-WhatsApp Ads', tagText: 'Advertising', title: 'Launch CTWA Ads in 1-Click', desc: 'Connect your Meta Business Manager to launch high-converting Click-to-WhatsApp ads directly from our dashboard without ever logging into Ads Manager.', stats: ['1-Click Ads', 'Auto-Sync', 'Lowest CPA'], image: '' },
                { id: 'meta_pixel_sync', label: 'Meta Pixel Sync', tagText: 'Tracking', title: 'Send Conversions to Meta Pixel', desc: 'Automatically send WhatsApp purchases, leads, and custom events back to your Meta Pixel via Conversion API to optimize your ad delivery engine.', stats: ['CAPI Integration', 'Zero Data Loss', 'Smart Optimization'], image: '' },
                { id: 'meta_custom_audience', label: 'Dynamic Audiences', tagText: 'Targeting', title: 'Sync WhatsApp Segments to Meta', desc: 'Automatically build highly targeted Facebook Custom Audiences by syncing WhatsApp segments (like VIP customers or abandoned carts) in real-time.', stats: ['Lookalike Sync', 'Real-time Updates', 'Higher ROAS'], image: '' },
                { id: 'meta_catalog_sales', label: 'Advantage+ Catalog Sales', tagText: 'Commerce', title: 'Sync Store Inventory with Meta', desc: 'Keep your native Online Store catalog perfectly synced with your Meta Commerce Manager to run dynamic Advantage+ catalog sales campaigns seamlessly.', stats: ['2-Way Sync', 'Dynamic Ads', 'Auto-Updates'], image: '' },
                { id: 'meta_ab_testing', label: 'A/B Testing', tagText: 'Optimization', title: 'A/B Test Ad Creatives & Messages', desc: 'Split-test different Facebook ad creatives against varying WhatsApp welcome messages to scientifically discover the highest converting funnel.', stats: ['Split Testing', 'Winner Selection', 'Funnel Optimization'], image: '' },
                { id: 'meta_campaign_builder', label: 'Unified Campaign Builder', tagText: 'Strategy', title: 'AI-Powered Campaign Architect', desc: 'Generate end-to-end campaigns—from Facebook ad copy to the WhatsApp chatbot flow—using our built-in Generative AI Campaign Builder.', stats: ['AI Copywriting', 'Flow Generation', 'Instant Launch'], image: '' },

                { id: 'catalog', label: 'Native Online Store', tagText: 'Commerce', title: 'Sell Products Inside WhatsApp', desc: 'Share your full product catalog, collect orders and receive payments natively within WhatsApp. Zero-friction in-chat checkout.', stats: ['In-chat Checkout', 'UPI & Cards', '2x Orders'], image: '' },
                { id: 'cart_payment', label: 'Cart & Payments', tagText: 'Checkout', title: 'Seamless In-Chat Checkout', desc: 'Allow customers to build their cart and complete payments using UPI, credit cards, or net banking without ever leaving WhatsApp.', stats: ['UPI Supported', 'One-Click Pay', 'Zero Drops'], image: '' },
                { id: 'order_track', label: 'Order Tracking', tagText: 'Post-Purchase', title: 'Automated Shipping Updates', desc: 'Send proactive notifications for order confirmations, shipping dispatch, and live tracking updates directly to the customer\'s inbox.', stats: ['Live Tracking', 'Auto Updates', 'High Trust'], image: '' },
                { id: 'store_categories', label: 'Smart Categories', tagText: 'Navigation', title: 'Intelligent Product Categories', desc: 'Organize thousands of products into smart categories and collections, allowing customers to seamlessly browse your entire catalog directly inside WhatsApp.', stats: ['Nested Categories', 'Smart Search', 'Easy Browsing'], image: '' },
                { id: 'store_orders', label: 'Order Management', tagText: 'Fulfillment', title: 'Kanban Order Dashboard', desc: 'Manage your entire fulfillment workflow with a powerful drag-and-drop Kanban dashboard. Track every order from "Placed" to "Delivered" with automatic customer notifications.', stats: ['Kanban Board', 'Auto-Updates', 'Team Access'], image: '' },
                { id: 'store_coupons', label: 'Dynamic Coupons', tagText: 'Promotions', title: 'Native WhatsApp Promo Codes', desc: 'Create dynamic discount codes, flash sales, and BOGO offers that customers can natively apply to their cart during the seamless in-chat checkout process.', stats: ['Flash Sales', 'BOGO Offers', 'Usage Limits'], image: '' },
                { id: 'store_invoices', label: 'Automated Invoices', tagText: 'Accounting', title: 'Instant PDF Receipts', desc: 'Automatically generate and instantly send beautiful PDF invoices and payment receipts to the customer’s WhatsApp inbox the moment a payment is confirmed.', stats: ['Tax Compliant', 'PDF Generation', 'Instant Delivery'], image: '' },

                { id: 'vcard', label: 'Interactive VeCards', tagText: 'Networking', title: 'Premium Digital Business Cards', desc: 'Share stunning, mobile-first interactive business cards with custom QR codes to capture leads straight into your WhatsApp CRM.', stats: ['10+ Themes', 'Custom QR', 'Direct Save'], image: '' },
                { id: 'vcard_lead', label: 'Instant Lead Capture', tagText: 'CRM Sync', title: 'Turn Scans into WhatsApp Leads', desc: 'When someone scans your veCard QR code, their details are instantly captured and they are redirected to your WhatsApp inbox to start a conversation.', stats: ['Auto-Save Contacts', 'CRM Integration', '1-Click Connect'], image: '' },
                { id: 'vcard_theme', label: 'Premium Themes', tagText: 'Customization', title: 'Stunning Designer Layouts', desc: 'Choose from 10+ gorgeous, mobile-optimized business card templates. Completely customize colors, fonts, and layouts to match your brand.', stats: ['10+ Themes', 'Color Customizer', 'CSS Editing'], image: '' },
                { id: 'vcard_analytics', label: 'Profile Analytics', tagText: 'Insights', title: 'Track Scans & Link Clicks', desc: 'Get deep insights into your networking performance. Monitor total QR scans, unique profile views, and see exactly which links are getting the most engagement.', stats: ['Scan Tracking', 'Link Analytics', 'Lead Sources'], image: '' },
                { id: 'vcard_appointments', label: 'Appointment Booking', tagText: 'Scheduling', title: 'Built-in Scheduling Calendar', desc: 'Eliminate back-and-forth emails. Let clients book appointments directly from your veCard, and receive instant booking notifications and reminders via WhatsApp.', stats: ['Time Slots', 'Auto-Reminders', 'WhatsApp Sync'], image: '' },
                { id: 'vcard_nfc', label: 'NFC Integration', tagText: 'Hardware', title: 'Tap-to-Share NFC Compatibility', desc: 'Connect your digital profile to a physical NFC card. Share your details instantly by simply tapping your card against any modern smartphone—no app required.', stats: ['Tap-to-Share', 'No App Needed', 'Write to NFC'], image: '' },
                { id: 'vcard_domain', label: 'Custom Domains', tagText: 'Branding', title: 'White-Label Custom Domains', desc: 'Elevate your personal brand by hosting your veCard on your own custom domain (e.g., card.yourbrand.com) rather than a generic platform URL.', stats: ['SSL Included', 'White-Label', 'DNS Mapping'], image: '' }
            ]
        }
    },
    industries: {
        type: DataTypes.JSON,
        defaultValue: {
            title: 'Built for every industry',
            subtitle: 'See how leading verticals leverage WhatsApp to cut costs and drive unprecedented revenue.',
            items: [
                { id: 'ecommerce', icon: 'ShoppingCart', title: 'E-Commerce', desc: 'Recover abandoned carts, send shipping updates, and run flash sales directly on WhatsApp.', metrics: ['80% higher cart recovery', '3x repeat purchase rate'], image: '' },
                { id: 'education', icon: 'GraduationCap', title: 'Education (Edtech)', desc: 'Send fee reminders, zoom links, and automated course updates to students and parents instantly.', metrics: ['99% communication delivery', 'Cut admin time by 60%'], image: '' },
                { id: 'realestate', icon: 'Building', title: 'Real Estate', desc: 'Share property brochures, schedule site visits, and qualify leads 24/7 with an AI Agent.', metrics: ['5x more leads qualified', 'Instant prospect engagement'], image: '' },
                { id: 'healthcare', icon: 'HeartPulse', title: 'Healthcare', desc: 'Automate appointment booking, send prescription reminders, and handle basic triage automatically.', metrics: ['Reduce no-shows by 40%', 'HIPAA-compliant secure chats'], image: '' },
                { id: 'travel', icon: 'Plane', title: 'Travel & Tours', desc: 'Send booking confirmations, flight updates, and offer 24/7 concierge services efficiently.', metrics: ['24/7 instant support', '95% faster query resolution'], image: '' },
                { id: 'finance', icon: 'Landmark', title: 'Fintech & Banking', desc: 'Share real-time transaction alerts, automate loan queries, and provide secure account updates.', metrics: ['End-to-end encryption', '2x faster document collection'], image: '' },
                { id: 'automotive', icon: 'Car', title: 'Automotive', desc: 'Schedule test drives, automate service reminders, and share interactive vehicle brochures.', metrics: ['3x test drives booked', 'Higher service retention'], image: '' },
                { id: 'retail', icon: 'Store', title: 'Retail & FMCG', desc: 'Run localized promotional campaigns, build loyal customer communities, and handle store inquiries.', metrics: ['Boost footfall by 40%', 'Higher coupon redemption'], image: '' }
            ]
        }
    }
}, {
    timestamps: true
});

// Helper to ensure singleton config exists
LandingPage.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create(); // Uses defaultValues defined above
    }
    return settings;
};

module.exports = LandingPage;
