const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUploadAndCarousel() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@gmail.com',
            password: '6374280716'
        });

        const token = loginRes.data.token;
        console.log("Logged in! Token obtained.");

        // First, create a dummy 1x1 image file
        const dummyImagePath = './dummy.jpg';
        // A minimal valid JPEG file (1x1 pixel)
        const jpegHex = "ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f9fe8a28afcfffd9";
        fs.writeFileSync(dummyImagePath, Buffer.from(jpegHex, 'hex'));

        console.log("Uploading Card 1 Media via Resumable API...");
        const fd1 = new FormData();
        fd1.append('file', fs.createReadStream(dummyImagePath));

        let handle1 = null;
        try {
            const upRes = await axios.post('http://localhost:5000/api/templates/upload', fd1, {
                headers: {
                    ...fd1.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            });
            handle1 = upRes.data.handle;
            console.log("Obtained handle 1:", handle1);
        } catch (e) {
            console.error("Upload Error:", e.response ? e.response.data : e.message);
            process.exit(1);
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
                    headerHandle: handle1,
                    content: "Product A is great!",
                    buttons: [
                        { type: "URL", text: "Visit Store", url: "https://store.com" }
                    ]
                },
                {
                    headerType: "IMAGE",
                    headerHandle: handle1, // reusing for card 2 for test
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
            console.error(error.stack);
        }
    }
}

testUploadAndCarousel();
