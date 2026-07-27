const fs = require('fs');
const path = 'j:/New folder (2)/Bitslab/backup of whatsapp cloud 19-05-2026/Whatsapp cloud/client/src/pages/WaStoreManager/WaStoreSettings.jsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

if (lines[210].includes('if (loading || !store) return (') && lines[211].includes('];')) {
    lines.splice(210, 143);
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Fixed duplicate block');
} else {
    console.log('Lines do not match expected! Please check manually.', lines[210], lines[211]);
}
