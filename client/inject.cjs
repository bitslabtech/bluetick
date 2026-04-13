const fs = require('fs');
let c = fs.readFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', 'utf8');

const missingBlock = `    const selTmplName = activeForm.automation?.whatsappTemplate?.name;
    const selTmpl = templates.find(t => t.name === selTmplName);
    
    const vars = [];
    if (selTmpl) {
        if (selTmpl.components) {
            selTmpl.components.forEach(c => {
                if (c.text) {
                    const matches = c.text.match(new RegExp('\\\\{\\\\{(\\\\d+)\\\\}\\\\}', 'g'));
                    if (matches) matches.forEach(m => {
                        const num = m.replace(new RegExp('[{}]', 'g'), '');
                        if (!vars.includes(num)) vars.push(num);
                    });
                }
            });
        } else if (selTmpl.content) {
            const matches = selTmpl.content.match(new RegExp('\\\\{\\\\{(\\\\d+)\\\\}\\\\}', 'g'));
            if (matches) matches.forEach(m => {
                const num = m.replace(new RegExp('[{}]', 'g'), '');
                if (!vars.includes(num)) vars.push(num);
            });
        }
        vars.sort((a,b) => parseInt(a) - parseInt(b));
    }

    let previewText = selTmpl ? (selTmpl.content || selTmpl.components?.find(c => c.type === 'BODY')?.text || '') : '';
    if (selTmpl && activeForm.automation?.whatsappTemplate?.mappings) {
        const mappings = activeForm.automation.whatsappTemplate.mappings;
        Object.keys(mappings).forEach(key => {
            if (!key.startsWith('body_')) return;
            const varNum = key.replace('body_', '');
            const mapData = mappings[key];
            const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
            
            let replacement = '';
            if (mapObj.type === 'custom') {
                replacement = mapObj.value || \`[Custom \${varNum}]\`;
            } else {
                const field = activeForm.fields?.find(f => f.id === mapObj.value);
                replacement = field ? \`[\${field.label}]\` : '';
            }
            if (replacement) {
                previewText = previewText.replace(new RegExp(\`\\\\{\\\\{\${varNum}\\\\\}\\\\\}\`, 'g'), replacement);
            }
        });
    }
    
    const headerComp = selTmpl?.components?.find(c => c.type === 'HEADER' && ['IMAGE','VIDEO','DOCUMENT'].includes(c.format));
    const hasMediaHeader = !!headerComp;
    const btnComp = selTmpl?.components?.find(c => c.type === 'BUTTONS');
    const dynamicButtons = btnComp?.buttons?.map((b, i) => ({...b, index: i})).filter(b => b.type === 'URL' || b.type === 'QUICK_REPLY') || [];
    const hasDynamicButtons = dynamicButtons.length > 0;
    
    const carouselComp = selTmpl?.components?.find(c => c.type === 'CAROUSEL');
    const isCarousel = selTmpl?.archetype === 'carousel' || !!carouselComp;
    const cardsArr = selTmpl?.cards || carouselComp?.cards || [];`;

c = c.replace('const cardsArr = selTmpl?.cards || carouselComp?.cards || [];', missingBlock);
fs.writeFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', c, 'utf8');
console.log('Restored the missing variables');
