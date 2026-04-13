import fs from 'fs';
const file = 'f:/Bitslab/Whatsapp cloud/client/src/pages/addons/WhatsAppFormsBuilder.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

lines[996] = '                                                                        <div className="flex-1 py-3 rounded-xl bg-white border-2 border-transparent shadow-sm text-sm font-bold text-slate-400 text-center">❌ No</div>';
lines[1067] = '                                                                    ← Back';
lines[1404] = '                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">{card.headerType === \'VIDEO\' ? \'🎬 Card Video\' : \'🖼️ Card Image\'}<span className="text-red-400 ml-1">*</span></label>';

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed exactly 3 lines.');
