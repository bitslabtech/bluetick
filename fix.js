const fs = require('fs');
let file = fs.readFileSync('client/src/pages/MetaAdsManager/MetaAdsWizard.jsx', 'utf8');

file = file.replace(
    /const \[showPreview, setShowPreview\] = useState\(false\); {8}\/\/ ad preview modal/,
    'const [showPreview, setShowPreview] = useState(false);        // ad preview modal\n    const [publishSuccess, setPublishSuccess] = useState(false);'
);

file = file.replace(
    /toast\.success\('Campaign prepared successfully!'\);\n            }\n            navigate\('\/growth-hub'\);/,
    'toast.success(\'Campaign prepared successfully!\');\n            }\n            setPublishSuccess(true);'
);

file = file.replace(
    /toast\.success\('Campaign saved successfully!'\);\n            }\n            navigate\('\/growth-hub'\);/,
    'toast.success(\'Campaign saved successfully!\');\n            }\n            setPublishSuccess(true);'
);

file = file.replace(
    /                            <button\n                                onClick={handlePublish}\n                                disabled={loading \|\| !Object\.values\(checklistChecks\)\.every\(Boolean\)}\n                                className={`flex items-center gap-2 px-8 py-3\.5 rounded-xl font-bold shadow-lg transition-all w-full justify-center ml-4 \$\{metaConnected\n                                        \? 'bg-primary hover:bg-primary\/90 shadow-md text-white'\n                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500\/25 text-white'\n                                    \} disabled:opacity-60 disabled:cursor-not-allowed`}\n                            >\n                                \{loading \? <Loader2 className="w-5 h-5 animate-spin" \/> : <Megaphone className="w-5 h-5" \/>\}\n                                \{metaConnected \? 'Publish Ad Campaign' : 'Save as Draft'\}\n                            <\/button>\n                        <\/div>/,
    `                            <div className="flex items-center gap-3 w-full md:w-auto ml-4">
                                <button
                                    onClick={handlePublish}
                                    disabled={loading}
                                    className="px-6 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={loading || !Object.values(checklistChecks).every(Boolean)}
                                    className={\`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all justify-center \${metaConnected
                                            ? 'bg-primary hover:bg-primary/90 shadow-md text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 text-white'
                                        } disabled:opacity-60 disabled:cursor-not-allowed\`}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                                    Publish to Meta
                                </button>
                            </div>
                        </div>`
);

file = file.replace(
    /                            <button\n                                onClick={handleManualPublish}\n                                disabled={loading \|\| !Object\.values\(checklistChecks\)\.every\(Boolean\)}\n                                className={`mt-6 flex items-center gap-2 px-8 py-3\.5 rounded-xl font-bold shadow-lg transition-all w-full justify-center \$\{metaConnected\n                                        \? 'bg-primary hover:bg-primary\/90 shadow-md text-white'\n                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500\/25 text-white'\n                                    \} disabled:opacity-60 disabled:cursor-not-allowed`}\n                            >\n                                \{loading \? <Loader2 className="w-5 h-5 animate-spin" \/> : <Megaphone className="w-5 h-5" \/>\}\n                                \{metaConnected \? 'Publish Ad Campaign' : 'Save as Draft'\}\n                            <\/button>\n                        <\/div>/,
    `                            <div className="pt-6 flex justify-between items-center">
                                <button
                                    onClick={handleManualPublish}
                                    disabled={loading}
                                    className="px-6 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    onClick={handleManualPublish}
                                    disabled={loading || !Object.values(checklistChecks).every(Boolean)}
                                    className={\`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all justify-center \${metaConnected
                                            ? 'bg-primary hover:bg-primary/90 shadow-md text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 text-white'
                                        } disabled:opacity-60 disabled:cursor-not-allowed\`}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                                    Publish to Meta
                                </button>
                            </div>
                        </div>`
);

file = file.replace(
    /            \{\/\* ══ Preview Modal ══ \*\/\}/,
    `            {/* ══ Success Screen ══ */}
            <AnimatePresence>
                {publishSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden"
                        >
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Campaign Published!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                Your campaign has been successfully saved. {metaConnected ? "It is now syncing with Meta and will be active shortly." : "It is saved as a Draft since Meta Ads is not connected."}
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => navigate('/growth-hub')}
                                    className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-md"
                                >
                                    Go to Growth Hub
                                </button>
                                <button
                                    onClick={() => {
                                        setPublishSuccess(false);
                                        setCurrentStep(0);
                                    }}
                                    className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                    Create Another Campaign
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ Preview Modal ══ */}`
);

fs.writeFileSync('client/src/pages/MetaAdsManager/MetaAdsWizard.jsx', file);
console.log('Done!');
