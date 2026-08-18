const fs = require('fs');
const path = require('path');

const clientSrcDir = path.join(__dirname, 'client', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(clientSrcDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // We only care about files that use /store/${slug}
    if (!content.includes('/store/${slug}')) return;
    
    let modified = false;

    // Make sure we import getStoreRoute if we're going to use it
    if (!content.includes('getStoreRoute')) {
        // Find how many directories deep we are to properly import
        const relativePath = path.relative(path.dirname(file), path.join(clientSrcDir, 'utils', 'storeRouting'));
        let importPath = relativePath.replace(/\\/g, '/');
        if (!importPath.startsWith('.')) {
            importPath = './' + importPath;
        }
        
        // Add import after the last import statement
        const importRegex = /import .* from ['"].*['"];?\n/g;
        let lastMatch;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            lastMatch = match;
        }
        
        if (lastMatch) {
            const index = lastMatch.index + lastMatch[0].length;
            content = content.slice(0, index) + `import { getStoreRoute } from '${importPath}';\n` + content.slice(index);
            modified = true;
        }
    }

    // Replace navigate(`/store/${slug}/product/${product.id}`)
    // => navigate(getStoreRoute(slug, `/product/${product.id}`))
    const backtickRegex = /`\/store\/\$\{slug\}([^`]*)`/g;
    content = content.replace(backtickRegex, (match, pathContent) => {
        modified = true;
        if (!pathContent) {
            return `getStoreRoute(slug)`;
        }
        return `getStoreRoute(slug, \`${pathContent}\`)`;
    });

    // Replace Link to={`/store/${slug}...`}
    // This is already caught by the backtickRegex!
    // Because to={`/store/${slug}/...`} will be replaced by to={getStoreRoute(slug, `/...`)}

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.relative(__dirname, file)}`);
        changedFiles++;
    }
});

console.log(`Done! Modified ${changedFiles} files.`);
