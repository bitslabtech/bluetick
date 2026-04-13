const fs = require('fs');
let c = fs.readFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', 'utf8');

c = c.replace('Image as ImageIcon,', 'Image as ImageIcon, Play, FileText,');

// Replace Image emoji in non-carousel
c = c.replace(
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-2xl">🖼️</div>',
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-2xl"><ImageIcon className="w-8 h-8" /></div>'
);

// Replace Video emoji in non-carousel
c = c.replace(
  '<div className="opacity-30 text-2xl">🎬</div>',
  '<div className="opacity-30 text-2xl"><Play className="w-8 h-8" /></div>'
);

// Replace Document emoji in non-carousel
c = c.replace(
  '<span>📄</span>',
  '<FileText className="w-4 h-4 text-slate-500 mr-1" />'
);

// Replace Image emoji in carousel
c = c.replace(
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-xl">🖼️</div>',
  '<div className="w-full h-full flex items-center justify-center opacity-30 text-xl"><ImageIcon className="w-6 h-6" /></div>'
);

// Replace Video emoji in carousel
c = c.replace(
  '<div className="opacity-30 text-xl">🎬</div>',
  '<div className="opacity-30 text-xl"><Play className="w-6 h-6" /></div>'
);

fs.writeFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', c, 'utf8');
console.log('Replaced correctly');
