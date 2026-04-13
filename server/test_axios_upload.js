require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function testUpload() {
    try {
        await sequelize.authenticate();
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        if (!adminUser) throw new Error("No admin found");

        const payload = { user: { id: adminUser.id, isAdmin: true } };
        // Wait, the auth middleware checks req.user.id and might check if user exists.
        // It's just a standard JWT payload. Let's look at `auth.js` in middleware. Usually: id: user.id
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        const zipPath = 'f:/Bitslab/Whatsapp cloud/design/Plugins/ai_bot.zip';

        const formData = new FormData();
        formData.append('pluginZip', fs.createReadStream(zipPath));

        console.log("Sending POST to /api/admin/addons/upload");
        const res = await axios.post('http://localhost:5000/api/admin/addons/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Success!", res.data);
    } catch (e) {
        console.error("AXIOS ERROR:", e.response?.data || e.message);
    }
    process.exit(0);
}
testUpload();
