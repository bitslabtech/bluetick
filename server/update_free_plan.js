// Script to update Free plan limits in database
require('dotenv').config();
const { sequelize } = require('./config/database');
const Plan = require('./models/Plan');

async function updateFreePlanLimits() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Update Free plan limits
        const [updatedCount] = await Plan.update(
            {
                messageLimit: 30,
                contactLimit: 10,
                templateLimit: 2
            },
            {
                where: { name: 'Free' }
            }
        );

        if (updatedCount > 0) {
            console.log(`✅ Updated Free plan limits successfully!`);

            // Verify the update
            const freePlan = await Plan.findOne({ where: { name: 'Free' } });
            if (freePlan) {
                console.log('\n📊 Free Plan Current Limits:');
                console.log(`   Messages: ${freePlan.messageLimit}/month`);
                console.log(`   Contacts: ${freePlan.contactLimit}`);
                console.log(`   Templates: ${freePlan.templateLimit}`);
                //End of verify
            }
        } else {
            console.log('⚠️ No Free plan found in database. It will use model defaults on next insert.');
        }

    } catch (error) {
        console.error('❌ Error updating Free plan:', error);
    } finally {
        await sequelize.close();
        console.log('\n✅ Database connection closed');
    }
}

updateFreePlanLimits();
