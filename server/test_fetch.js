
const axios = require('axios');
require('dotenv').config();

async function testFetch() {
    try {
        // 1. Login to get token (Skipped for Auth-Disabled Test)
        /*
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com', // Assuming admin exists, or use a known user email
            password: 'password123'     // Replace with valid credentials if known, or I might need to Create a user first
        });

        const token = loginRes.data.token;
        console.log("Logged in. Token acquired.");
        */
        const token = "DUMMY_TOKEN";

        // 2. Fetch Notifications
        console.log("Fetching notifications...");
        const res = await axios.get('http://localhost:5000/api/notifications', {
            headers: { Authorization: `Bearer ${token} ` }
        });

        console.log("Response Status:", res.status);
        console.log("Data Length:", res.data.length);
        console.log("Data:", JSON.stringify(res.data, null, 2));

    } catch (err) {
        console.error("Test Failed:", err.response ? err.response.data : err.message);
    }
}

testFetch();
