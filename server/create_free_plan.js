const { sequelize } = require('./config/database');
const Plan = require('./models/Plan');

async function createFreePlan() {
    try {
        await sequelize.sync();

        // Check if Free plan already exists
        const existingFreePlan = await Plan.findOne({ where: { name: 'Free' } });

        if (existingFreePlan) {
            console.log('✓ Free plan already exists:', existingFreePlan.toJSON());
            return;
        }

        // Create Free plan
        const freePlan = await Plan.create({
            name: 'Free',
            description: 'Perfect for getting started',
            price: 0,
            currency: 'USD',
            interval: 'month',
            messageLimit: 30,
            contactLimit: 10,
            templateLimit: 2,
            features: [
                '30 messages per month',
                '10 contacts',
                '2 message templates',
                'Basic analytics',
                'Email support'
            ],
            color: 'blue',
            isPopular: false,
            isActive: true,
            isDefault: true,      // Set as default plan
            isPublic: false       // Hidden from public pricing page
        });

        console.log('✓ Free plan created successfully!');
        console.log(JSON.stringify(freePlan.toJSON(), null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Failed to create Free plan:', error);
        process.exit(1);
    }
}

createFreePlan();
