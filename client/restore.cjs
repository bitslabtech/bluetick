const fs = require('fs');
let c = fs.readFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', 'utf8');

const badBlockRegex = /const selTmplName = activeForm\.automation\?\.whatsappTemplate\?\.name;[\s\S]*?const cardsArr = selTmpl\?\.cards \|\| carouselComp\?\.cards \|\| \[\];\s*return \(\s*<>\s*/;

const originalGoodBlock = `const cardsArr = selTmpl?.cards || carouselComp?.cards || [];

    return (
<>
<div className="flex-1 flex overflow-hidden bg-[#F5F5F7] dark:bg-[#0B1120]">
                            
                            {/* Left Pane - Configuration */}
                            <div className="flex-1 border-r border-slate-200 dark:border-white/10 overflow-y-auto p-8 bg-white dark:bg-surface-dark shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] relative z-10">
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6 mb-6">
                                        <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-500 flex justify-center items-center rounded-2xl shadow-sm">
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <div>
                                            `;

c = c.replace(badBlockRegex, originalGoodBlock);
fs.writeFileSync('src/pages/addons/WhatsAppFormsBuilder.jsx', c, 'utf8');
console.log('Fixed WhatsAppFormsBuilder');
