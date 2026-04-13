import fs from 'fs';
const file = 'f:/Bitslab/Whatsapp cloud/client/src/pages/addons/WhatsAppFormsBuilder.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/âœ…/g, '✅');
content = content.replace(/â Œ/g, '❌');
content = content.replace(/â†  Back/g, '← Back');
content = content.replace(/Next â†’/g, 'Next →');
content = content.replace(/ðŸ”—/g, '🔗');
content = content.replace(/âš¡/g, '⚡');
content = content.replace(/â†’/g, '→');
content = content.replace(/ðŸŽ¬/g, '🎬');
content = content.replace(/ðŸ–¼ï¸ /g, '🖼️');
content = content.replace(/â†—/g, '↗');
content = content.replace(/ðŸ˜Š/g, '😊');

fs.writeFileSync(file, content);
console.log("Encoding corruptions fixed successfully.");
