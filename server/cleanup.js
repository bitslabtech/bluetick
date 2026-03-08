const axios = require('axios');

async function cleanupTemplates() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@gmail.com',
            password: '6374280716'
        });
        const token = loginRes.data.token;
        const getRes = await axios.get('http://localhost:5000/api/templates', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const templates = getRes.data;
        if (templates.length >= 8) {
            console.log("Cleaning up old templates...");
            for (let i = 8; i < templates.length; i++) {
                await axios.delete(`http://localhost:5000/api/templates/${templates[i].id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        }
        console.log("Done cleanup.");
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
cleanupTemplates();
