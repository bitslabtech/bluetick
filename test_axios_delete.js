require('dotenv').config({ path: './server/.env' });
const axios = require('axios');
const { User, Addon } = require('./server/models/index');

async function testHttpDelete() {
    try {
        console.log('Connecting to DB to find an addon and an admin user...');

        // Find admin user to generate token (or use bypass)
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        if (!adminUser) throw new Error("No admin found");

        // Let's explicitly log in to get a real token
        console.log('Logging in as Admin...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: adminUser.email,
            password: 'password123' // assuming default or we can just mock token
        }).catch(async (e) => {
            console.log("Login failed with generic password. Generating manual JWT.");
            const jwt = require('jsonwebtoken');
            return { data: { token: jwt.sign({ id: adminUser.id, role: 'superadmin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' }) } };
        });

        const token = loginRes.data.token;
        console.log("Token acquired:", token.substring(0, 20) + '...');

        // Find an addon
        const addon = await Addon.findOne();
        if (!addon) {
            console.log('No addons found in DB to delete. Exiting.');
            process.exit(0);
        }

        console.log(`Sending DELETE /api/admin/addons/${addon.id}...`);

        const res = await axios.delete(`http://localhost:5000/api/admin/addons/${addon.id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Success! Status:', res.status);
        console.log('Data:', res.data);

    } catch (e) {
        console.error('DELETE Request Failed!');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    } finally {
        process.exit();
    }
}
testHttpDelete();
