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
            title: 'Connect with Customers on WhatsApp',
            subtitle: 'The most reliable WhatsApp marketing platform for your business. Reach millions with just a click.',
            ctaText: 'Get Started Free',
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
            { title: 'Register Account', description: 'Sign up for a free account in less than 2 minutes.', icon: 'UserPlus' },
            { title: 'Connect WhatsApp', description: 'Scan the QR code to link your number successfully.', icon: 'Smartphone' },
            { title: 'Start Sending', description: 'Create campaigns and reach your customers instantly.', icon: 'Send' }
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
