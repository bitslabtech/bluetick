const fs = require('fs');
const filepath = 'f:\\Bitslab\\Whatsapp cloud\\client\\src\\pages\\AddonDetail.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// The file currently has literal \\n in it instead of actual newlines.
// It looks like everything from the start up until "return (" was joined with literal \n
// Wait, actually I had done: content.split(/\r?\n/).join('\\n')
// This means everynewline in the file was replaced by \n
content = content.split('\\n').join('\n');

fs.writeFileSync(filepath, content);
