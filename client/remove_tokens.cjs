const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, filesList);
        } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
            filesList.push(filePath);
        }
    }
    return filesList;
}

const allFiles = getFiles(path.join(__dirname, 'src'));

let totalChanges = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Remove specific header object fields for token
    content = content.replace(/'x-auth-token':\s*localStorage\.getItem\('token'\),?/g, '');
    content = content.replace(/'x-auth-token':\s*token\(\),?/g, '');
    
    // Sometimes there's an empty headers object left over, let's just let the formatter handle it or leave it as headers: {}
    
    // Remove token from variables if they exist
    content = content.replace(/const token = \(\) => localStorage\.getItem\('token'\);\n?/g, '');
    content = content.replace(/const authToken = localStorage\.getItem\('token'\);\n?/g, '');
    
    // Special cases like headers: { 'x-auth-token': ... }
    content = content.replace(/headers:\s*{\s*'x-auth-token':\s*localStorage\.getItem\('token'\)\s*}/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        totalChanges++;
        console.log(`Updated ${path.basename(file)}`);
    }
});

console.log(`Done! Modified ${totalChanges} files to remove manual token headers.`);
