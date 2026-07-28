const fs = require('fs');
const file = 'j:/New folder (2)/Bitslab/backup of whatsapp cloud 19-05-2026/Whatsapp cloud/client/src/pages/LandingPage.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const pricingStart = lines.findIndex(l => l.includes('{/* 11. PRICING */}'));
let pricingEnd = -1;
for (let i = pricingStart + 1; i < lines.length; i++) {
    if (lines[i].includes('</section>') && lines[i+1] && lines[i+1].includes(')}')) {
        pricingEnd = i + 1;
        break;
    }
}

if (pricingStart === -1 || pricingEnd === -1) {
    console.error('Could not find pricing section', { pricingStart, pricingEnd });
    process.exit(1);
}

const pricingBlock = lines.splice(pricingStart, (pricingEnd + 1) - pricingStart);
console.log(`Extracted pricing block from line ${pricingStart} to ${pricingEnd} (${pricingBlock.length} lines)`);

// We want to place it before "{/* 9. INDUSTRY SECTION */}" or "<section id=\"solutions\""
const targetIdx = lines.findIndex(l => l.includes('<section id="solutions"'));
if (targetIdx === -1) {
    console.error('Could not find target index');
    process.exit(1);
}

// Add a few newlines for spacing
pricingBlock.push('', '', '', '');

lines.splice(targetIdx, 0, ...pricingBlock);
fs.writeFileSync(file, lines.join('\n'));
console.log('Moved pricing section. New target index: ' + targetIdx);
