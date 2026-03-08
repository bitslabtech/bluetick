const Message = require('../models/Message');
const { Op } = require('sequelize');
const processCampaign = require('./campaignProcessor');

// Initialize the scheduler
function initScheduler() {
    console.log('Campaign Scheduler initialized. Checking every 60 seconds...');

    setInterval(async () => {
        try {
            // Find messages that are SCHEDULED and due for sending (scheduledFor <= now)
            const dueMessages = await Message.findAll({
                where: {
                    status: 'SCHEDULED',
                    scheduledFor: {
                        [Op.lte]: new Date()
                    }
                }
            });

            if (dueMessages.length > 0) {
                console.log(`Found ${dueMessages.length} due campaigns.`);

                // Process each due campaign
                dueMessages.forEach(msg => {
                    console.log(`Processing scheduled campaign: ${msg.id} (Due: ${msg.scheduledFor})`);
                    processCampaign(msg.id).catch(err => console.error(`Scheduler Error [${msg.id}]:`, err));
                });
            }
        } catch (err) {
            console.error('Scheduler main loop error:', err);
        }
    }, 60000); // Check every 60 seconds
}

module.exports = { initScheduler };
