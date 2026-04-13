require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE = 'http://localhost:5000';
const ZIP_PATH = 'F:/Bitslab/Whatsapp cloud/design/Plugins/whatsapp-forms-addon.zip';

async function test() {
    console.log('--- Step 1: Login as superadmin ---');
    let token;
    try {
        const loginRes = await axios.post(`${BASE}/api/auth/login`, {
            email: 'lakshmanp1110@gmail.com',
            password: '9003169699'
        });
        token = loginRes.data.token;
        console.log('Login SUCCESS. Token received:', token.substring(0, 30) + '...');
    } catch (e) {
        console.error('Login FAILED:', e.response ? JSON.stringify(e.response.data) : e.message);
        process.exit(1);
    }

    console.log('\n--- Step 2: Upload plugin zip ---');
    console.log('Zip path:', ZIP_PATH);
    console.log('Zip exists:', fs.existsSync(ZIP_PATH));
    console.log('Zip size:', fs.existsSync(ZIP_PATH) ? fs.statSync(ZIP_PATH).size + ' bytes' : 'N/A');

    const form = new FormData();
    form.append('pluginZip', fs.createReadStream(ZIP_PATH));

    try {
        const uploadRes = await axios.post(`${BASE}/api/admin/addons/upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log('Upload SUCCESS:', JSON.stringify(uploadRes.data, null, 2));
    } catch (e) {
        console.error('Upload FAILED!');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Headers:', JSON.stringify(e.response.headers));
            console.error('Body:', typeof e.response.data === 'string' ? e.response.data.substring(0, 500) : JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Error:', e.message);
        }
    }
}

test();
