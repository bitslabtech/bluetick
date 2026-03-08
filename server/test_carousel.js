const axios = require('axios');

async function testCarouselCreation() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@gmail.com',
            password: '6374280716'
        });

        const token = loginRes.data.token;
        console.log("Logged in! Token obtained.");

        // First, check template count and delete the most recent one if at limit
        const getRes = await axios.get('http://localhost:5000/api/templates', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const templates = getRes.data;
        if (templates.length >= 10) {
            console.log("Template limit reached. Deleting the oldest template to make room...");
            await axios.delete(`http://localhost:5000/api/templates/${templates[templates.length - 1].id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Deleted old template.");
        }

        console.log("Creating Carousel Template...");
        const payload = {
            name: "carousel_agent_test_" + Date.now(),
            category: "MARKETING",
            language: "en_US",
            content: "Check out our new products!",
            archetype: "carousel",
            cards: [
                {
                    headerType: "IMAGE",
                    content: "Product A is great!",
                    buttons: [
                        { type: "URL", text: "Visit Store", url: "https://store.com" }
                    ]
                },
                {
                    headerType: "IMAGE",
                    content: "Product B is also great!",
                    buttons: [
                        { type: "URL", text: "Buy B", url: "https://store.com/b" }
                    ]
                }
            ]
        };

        const createRes = await axios.post('http://localhost:5000/api/templates', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("SUCCESS! Meta API Response:", createRes.data);
    } catch (error) {
        console.error("FAILED.");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testCarouselCreation();
