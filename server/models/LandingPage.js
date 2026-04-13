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
            name: 'WhatsApp Cloud',
            logo: '',
            footerText: '© 2024 WhatsApp Cloud. All rights reserved.'
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
            title: 'WhatsApp Cloud - Bulk Messaging Platform',
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
                { id: 'broadcast', label: 'Bulk Broadcasts', tagText: 'Marketing', title: 'Import & Broadcast Instantly', desc: 'Import contacts and broadcast approved WhatsApp messages to thousands in seconds. Track delivery, read, and click rates in real-time.', stats: ['98% Open Rate', '45% CTR', '3x Revenue'], image: '' },
                { id: 'chatbot', label: 'No-Code Flow Bots', tagText: 'Automation', title: 'Build No-Code Chatbot in Minutes', desc: 'Visual drag-and-drop flow builder for WhatsApp chatbots & product catalog journeys — no code, no complexity.', stats: ['80% Auto-resolved', '24/7 Running', '5 min Setup'], image: '' },
                { id: 'livechat', label: 'Multi-Agent Inbox', tagText: 'Support', title: 'Shared Team Inbox for WhatsApp', desc: 'Let multiple agents handle conversations from one WhatsApp number. Smart routing, labels, quick replies, and internal notes included.', stats: ['60% Faster Support', 'Smart Routing', 'Team Collab'], image: '' },
                { id: 'analytics', label: 'Analytics & Reports', tagText: 'Insights', title: 'Real-Time Campaign Analytics', desc: 'Monitor Read, Replied & Clicked rates live. Segment audiences by engagement and auto-retarget cold leads for maximum conversions.', stats: ['Live Dashboard', 'Campaign ROI', 'Retargeting'], image: '' },
                { id: 'catalog', label: 'Catalog & Payments', tagText: 'Commerce', title: 'Sell Products Inside WhatsApp', desc: 'Share your full product catalog, collect orders and receive payments — all within WhatsApp. Zero-friction in-chat checkout.', stats: ['In-chat Checkout', 'UPI & Cards', '2x Orders'], image: '' },
                { id: 'retarget', label: 'Smart Retargeting', tagText: 'Re-engagement', title: 'Retarget to 3X Conversions', desc: "Re-engage customers who didn't respond or purchase with hyper-personalized automated follow-up campaigns and smart audience segments.", stats: ['3x Conversions', 'Auto Follow-up', 'Smart Segments'], image: '' },
                { id: 'aibot', label: 'Generative AI Bot', tagText: 'AI-Powered', title: 'Generative AI that Sells & Supports', desc: 'Train your own GPT-powered bot on product knowledge, FAQs, pricing and policies. It answers, qualifies and converts leads — 24/7, autonomously.', stats: ['GPT-4 Powered', 'Custom Training', 'Zero Hallucination'], image: '' }
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
