const fs = require('fs');
const file = 'src/pages/addons/WhatsAppFormsBuilder.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace('Image as ImageIcon,', 'Image as ImageIcon, Play, FileText,');

// Replace Image emoji in non-carousel
c = c.replace(
  /<div className="w-full h-full flex items-center justify-center opacity-30 text-2xl">[^<]*<\/div>(?=}<\/div>;)/g,
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-2xl"><ImageIcon className="w-8 h-8" /><\/div>'
);

// Replace Video emoji in non-carousel
c = c.replace(
  /<div className="opacity-30 text-2xl">[^<]*<\/div>(?=}<\/div>;)/g,
  '<div className="opacity-30 text-2xl"><Play className="w-8 h-8" /><\/div>'
);

// Replace Document emoji in non-carousel
c = c.replace(
  /<span>[^<]*<\/span><span className="text-\[10px\] truncate\">{fileName \|\| 'document.pdf'}/g,
  '<FileText className="w-4 h-4 text-slate-500" /><span className="text-[10px] truncate">{fileName || \\'document.pdf\\'}'
);

// Replace Image emoji in carousel
c = c.replace(
  /<div className="w-full h-full flex items-center justify-center opacity-30 text-xl">[^<]*<\/div>(?=}<\/div>})/g,
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-xl"><ImageIcon className="w-6 h-6" /><\/div>'
);

// Replace Video emoji in carousel
c = c.replace(
  /<div className="opacity-30 text-xl">[^<]*<\/div>(?=}<\/div>})/g,
  '<div className="opacity-30 text-xl"><Play className="w-6 h-6" /><\/div>'
);

fs.writeFileSync(file, c, 'utf8');
console.log('Replacements complete');
