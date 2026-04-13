require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const email = 'lakshmanp1110@gmail.com';
        const rawPassword = '9003169699';
        
        let user = await User.findOne({ where: { email } });
        
        if (!user) {
            console.log('User not found. Creating a new superadmin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);
            
            user = await User.create({
                name: 'Lakshman',
                email: email,
                password: hashedPassword,
                role: 'superadmin',
                isApproved: true,
                timezone: 'Asia/Kolkata'
            });
            console.log('Created superadmin account from scratch.');
        } else {
            console.log('User found. Forcing superadmin role, approval, and resetting password...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);
            
            user.password = hashedPassword;
            user.role = 'superadmin';
            user.isApproved = true;
            await user.save();
            console.log('Successfully updated the user account.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

resetAdmin();
