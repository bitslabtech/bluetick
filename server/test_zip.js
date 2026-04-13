const admZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

try {
    const zipPath = 'f:/Bitslab/Whatsapp cloud/design/Plugins/ai_bot.zip';
    const zip = new admZip(zipPath);

    const extractPath = path.join(__dirname, `plugins/addon_ai_bot`);
    console.log("Extracting to:", extractPath);

    zip.extractAllTo(extractPath, true);
    console.log("Extraction successful!");
} catch (e) {
    console.error("Extraction Error:", e.message);
}
