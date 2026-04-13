const fs = require('fs');
const path = require('path');

function replaceDeep(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
            if (f === 'node_modules' || f === 'dist' || f === '.git') continue;
            const fullPath = path.join(dir, f);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                replaceDeep(fullPath);
            } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('http://localhost:5000')) {
                    content = content.replace(/http:\/\/localhost:5000/g, 'http://127.0.0.1:5000');
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log('Fixed', fullPath);
                }
            }
        }
    } catch (e) {
        console.error("Error in", dir, e.message);
    }
}

replaceDeep(path.resolve(__dirname, 'src'));
console.log('Done replacement!');
