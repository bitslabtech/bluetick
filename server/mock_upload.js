require('dotenv').config();
const path = require('path');
const { sequelize } = require('./config/database');
const AddonModel = require('./models/Addon');

async function test() {
    try {
        await sequelize.authenticate();
        console.log("DB Authed");
        const manifest = {
            name: 'AI WhatsApp Auto-Responder',
            module_key: 'ai_bot',
            version: '1.0.0',
            description: '...',
            default_price: 0,
            is_recurring: false,
            features: ['Gemini & ChatGPT Model Support', '...']
        };
        let addon = await AddonModel.findOne({ where: { module_key: manifest.module_key } });
        if (addon) {
            console.log("Found existing. Saving");
            addon.moduleHash = Date.now().toString();
            await addon.save();
        } else {
            console.log("Creating new...");
            addon = await AddonModel.create({
                name: manifest.name,
                description: manifest.description || '',
                module_key: manifest.module_key,
                price: parseFloat(0),
                currency: 'USD',
                isRecurring: manifest.is_recurring,
                recurringInterval: manifest.recurring_interval || 'month',
                isActive: true,
                features: manifest.features || []
            });
            console.log("Created successfully");
        }
    } catch (err) {
        console.error("DB Error:", err);
    }
    process.exit(0);
}
test();
