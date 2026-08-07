const { sequelize } = require('./config/database');
const Contact = require('./models/Contact');
const Group = require('./models/Group');

async function syncGroups() {
    try {
        console.log('Fetching contacts...');
        const contacts = await Contact.findAll({ attributes: ['userId', 'tags'], raw: true });
        const groupSet = new Set();
        
        for (const c of contacts) {
            if (c.tags && c.tags.length > 0) {
                for (const tag of c.tags) {
                    if (tag && tag.trim()) {
                        groupSet.add(JSON.stringify({ name: tag.trim(), userId: c.userId }));
                    }
                }
            }
        }

        const groupsToCreate = Array.from(groupSet).map(s => JSON.parse(s));
        
        if (groupsToCreate.length > 0) {
            console.log(`Found ${groupsToCreate.length} unique group-user pairs to sync. Inserting...`);
            await Group.bulkCreate(groupsToCreate, { ignoreDuplicates: true });
            console.log('Sync complete!');
        } else {
            console.log('No tags found to sync.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

syncGroups();
