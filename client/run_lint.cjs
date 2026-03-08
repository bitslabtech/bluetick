const cp = require('child_process');
const fs = require('fs');
try {
    let out = cp.execSync('npx eslint --format json "f:\\\\Bitslab\\\\Whatsapp cloud\\\\client\\\\src\\\\pages\\\\Support.jsx"', { encoding: 'utf8' });
    fs.writeFileSync('lint.json', out);
} catch (err) {
    fs.writeFileSync('lint.json', err.stdout ? err.stdout : err.toString());
}
