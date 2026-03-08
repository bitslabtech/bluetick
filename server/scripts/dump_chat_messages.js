require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const ChatMessage = require('../models/ChatMessage');
const Template = require('../models/Template');

const dump = async () => {
    try {
        await sequelize.authenticate();
        const conversationId = '4c08b2b2-56a3-45c4-a392-94ad10278ec6'; // From previous log
        console.log("Dumping messages for Conversation: " + conversationId);

        const messages = await ChatMessage.findAll({
            where: { conversationId },
            order: [['timestamp', 'ASC']],
            raw: true
        });

        console.log(JSON.stringify(messages, null, 2));
        console.log(`Total Messages: ${messages.length}`);

        // Check the latest OUTBOUND template body
        const lastTemplateMsg = messages.reverse().find(m => m.type === 'template');
        if (lastTemplateMsg) {
            console.log("Latest Template Message Body:", lastTemplateMsg.body);
            // Try to find the template matches
            // We can't easily find which template ID it was from here without parsing, 
            // but let's just list all templates to see what 'content' looks like.
            const templates = await Template.findAll({ limit: 5 });
            console.log("Sample Templates:", JSON.stringify(templates.map(t => ({ id: t.id, name: t.name, content: t.content })), null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

dump();
