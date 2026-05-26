const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Pattern 1: , { headers: { 'x-auth-token': localStorage.getItem('token') } }
    // Note: this might have newlines or spacing. Let's use regex.
    content = content.replace(/,\s*\{\s*headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*localStorage\.getItem\(['"]token['"]\)\s*\}\s*\}/g, '');
    
    // Pattern 2: headers: { 'x-auth-token': localStorage.getItem('token') } inside a larger object
    // For example: { params: {...}, headers: { 'x-auth-token': localStorage.getItem('token') } }
    content = content.replace(/,\s*headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*localStorage\.getItem\(['"]token['"]\)\s*\}/g, '');
    content = content.replace(/headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*localStorage\.getItem\(['"]token['"]\)\s*\},?\s*/g, '');

    // Pattern 3: Authorization: `Bearer ${localStorage.getItem('token')}`
    content = content.replace(/,\s*['"]?Authorization['"]?\s*:\s*`Bearer \$\{localStorage\.getItem\(['"]token['"]\)\}`/g, '');
    content = content.replace(/['"]?Authorization['"]?\s*:\s*`Bearer \$\{localStorage\.getItem\(['"]token['"]\)\}`,?\s*/g, '');

    // Pattern 4: const token = localStorage.getItem('token'); and then used as variable
    content = content.replace(/const\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);\s*/g, '');
    content = content.replace(/,\s*\{\s*headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*token\s*\}\s*\}/g, '');
    content = content.replace(/,\s*headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*token\s*\}/g, '');
    content = content.replace(/headers:\s*\{\s*['"]x-auth-token['"]\s*:\s*token\s*\},?\s*/g, '');

    // Pattern 5: headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    content = content.replace(/,\s*\{\s*headers:\s*\{\s*Authorization\s*:\s*`Bearer \$\{localStorage\.getItem\(['"]token['"]\)\}`\s*\}\s*\}/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

walkDir(srcDir);
console.log('Done.');
