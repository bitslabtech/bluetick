const { sequelize } = require('./config/database');
const LandingPage = require('./models/LandingPage');

(async () => {
    try {
        await sequelize.authenticate();
        let settings = await LandingPage.getSettings();
        const updatedHero = {
            ...settings.hero,
            title: '5X Your Leads\nwith the Power of WhatsApp',
            subtitle: 'Broadcast, Automate, Engage, Sell - do everything with the AI-powered WhatsApp Marketing & Engagement Platform.',
            ctaText: 'Start Free Trial',
            ctaLink: '/register'
        };
        const updatedFeatures = [
            {
                title: 'Marketing Automation',
                description: 'Broadcast promotional messages to thousands in a click. Retarget smartly for higher conversions.',
                icon: 'Zap'
            },
            {
                title: 'Autonomous AI Agents',
                description: 'Turn everyday transactions into an AI-driven two-way conversation to drive higher customer engagement.',
                icon: 'MessageSquare'
            },
            {
                title: 'Sales CRM',
                description: 'Organize leads, track success, and win deals with WhatsApp-powered Sales CRM.',
                icon: 'BarChart'
            },
            {
                title: 'No-Code Chatbots',
                description: 'Launch intelligent automated workflows based on customer intent, not keywords.',
                icon: 'Smartphone'
            }
        ];
        
        await settings.update({
            hero: updatedHero,
            features: updatedFeatures,
            theme: 'light' // user wants light as default
        });
        
        console.log("Landing page config updated successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
