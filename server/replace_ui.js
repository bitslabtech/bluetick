const fs = require('fs');
const filepath = 'f:\\Bitslab\\Whatsapp cloud\\client\\src\\pages\\AddonDetail.jsx';
let content = fs.readFileSync(filepath, 'utf8');

// Handle both \r\n and \n
let lines = content.split(/\r?\n/);

const replacement = `    return (
        <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/marketplace')}
                    className="flex items-center text-sm font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Marketplace
                </button>

                {owned && (
                    <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20 shadow-sm animate-pulse-soft">
                        <CheckCircle className="w-4 h-4" />
                        Installed & Active
                    </span>
                )}
            </div>

            {/* Page Header (Title + Desc moved to top) */}
            <div className="max-w-4xl space-y-4">
                <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {addon.name}
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                    {addon.description}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pt-6">
                
                {/* Main Content Column (Left Side) */}
                <div className="lg:col-span-8 space-y-12">
                    
                    {/* Rich Media Showcase */}
                    {(addon.demoVideoUrl || addon.bannerUrl) && (
                        <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/10 border border-gray-200/50 dark:border-gray-700/50 bg-gray-900 relative aspect-video group transform transition-all hover:shadow-indigo-500/20">
                            {addon.demoVideoUrl ? (
                                addon.demoVideoUrl.includes('youtube.com') || addon.demoVideoUrl.includes('youtu.be') ? (
                                    <iframe
                                        className="absolute inset-0 w-full h-full"
                                        src={addon.demoVideoUrl.replace('watch?v=', 'embed/').split('&')[0]}
                                        title="Add-on Demo Video"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <video
                                        className="absolute inset-0 w-full h-full object-cover"
                                        controls
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        src={addon.demoVideoUrl}>
                                    </video>
                                )
                            ) : (
                                <img src={addon.bannerUrl} alt={addon.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                            )}
                        </div>
                    )}

                    {/* Dynamic Core Features */}
                    {addon.features && addon.features.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Zap className="w-6 h-6 text-indigo-500" />
                                Premium Capabilities
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {addon.features.map((feat, idx) => (
                                    <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800/50 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="pt-2 text-gray-700 dark:text-gray-300 font-medium text-lg leading-snug">
                                            {feat}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating CTA Right Column */}
                <div className="lg:col-span-4 relative">
                    <div className="sticky top-24 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-gray-700/80">
                        
                        {/* Interactive Sparkle Effect inside Card */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

                        <div className="relative z-10">
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Investment</p>
                            
                            {addon.price > 0 ? (
                                <div className="mb-8">
                                    <div className="flex items-start gap-1">
                                        <span className="text-3xl font-bold text-gray-400 mt-2">{getCurrencySymbol(addon.currency)}</span>
                                        <span className="text-7xl font-extrabold text-gray-900 dark:text-white tracking-tighter tabular-nums">
                                            {addon.price}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium flex items-center gap-2">
                                        Amount in {addon.currency} 
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                                            {addon.isRecurring ? \`Billed \${addon.recurringInterval}ly\` : 'Lifetime Access'}
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-8">
                                    <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 tracking-tighter">
                                        Free
                                    </span>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Included forever.</p>
                                </div>
                            )}

                            {owned ? (
                                <div className="space-y-4">
                                    <Link
                                        to={\`/addons/\${addon.module_key}\`}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5"
                                    >
                                        <Settings className="w-5 h-5" />
                                        Manage Module
                                    </Link>
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">Settings are located in your sidebar.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchasing}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl flex justify-center items-center gap-2 transition-all shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.5)] transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                                    >
                                        {purchasing ? (
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-6 h-6" />
                                                {addon.price > 0 ? "Secure Checkout" : "Enable Add-on"}
                                            </>
                                        )}
                                    </button>
                                    
                                    {addon.price > 0 && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                                            <ShieldCheck className="w-4 h-4 text-green-500" />
                                            Guaranteed safe & secure checkout
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );`;

// The return statement is at line 125 (0-indexed 124)
// The ending ); is at line 269 (0-indexed 268)

let startIdx = lines.findIndex(l => l.includes('    return ('));
let endIdxStr = '};\n\nexport default AddonDetail;';
let endIdx = lines.findIndex(l => l.startsWith('export default AddonDetail;'));

if (startIdx !== -1 && endIdx !== -1) {
    // Delete from startIdx up to endIdx-1 (because line before export is `};`)
    lines.splice(startIdx, endIdx - startIdx - 1, replacement);
    fs.writeFileSync(filepath, lines.join('\\n'));
    console.log("Successfully replaced UI");
} else {
    console.log("Could not find start/end", startIdx, endIdx);
}
