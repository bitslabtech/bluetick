const fs = require('fs');

const path = 'j:/New folder (2)/Bitslab/backup of whatsapp cloud 19-05-2026/Whatsapp cloud/client/src/pages/WaStoreManager/WaStoreSettings.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
content = content.replace(
    `const [templates, setTemplates] = useState([]);`,
    `const [templates, setTemplates] = useState([]);\n    const [activeTab, setActiveTab] = useState('domain');\n\n    const tabs = [\n        { id: 'domain', label: 'Domain', icon: <Globe className="w-4 h-4" /> },\n        { id: 'layout', label: 'Layout & Display', icon: <LayoutGrid className="w-4 h-4" /> },\n        { id: 'checkout', label: 'Checkout & Auth', icon: <ShoppingBag className="w-4 h-4" /> },\n        { id: 'inventory', label: 'Inventory', icon: <ClipboardList className="w-4 h-4" /> },\n        { id: 'tax_invoice', label: 'Tax & Invoice', icon: <FileText className="w-4 h-4" /> },\n        { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },\n    ];`
);

// 2. Add Tab UI
const tabUI = `
            {/* Tabs Navigation */}
            <div className="sticky top-[60px] md:top-0 z-40 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md py-4 border-b border-slate-200 dark:border-slate-800 mb-6 -mx-4 px-4 md:-mx-8 md:px-8">
                <div className="flex overflow-x-auto hide-scrollbar gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors \${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700'}\`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Contents */}
            <div className="space-y-6">
`;

content = content.replace(
    `            {/* Custom Domain Mapping */}`,
    `${tabUI}\n            {/* Custom Domain Mapping */}`
);

content = content.replace(
    `            {/* Custom Domain Mapping */}`,
    `            {activeTab === 'domain' && (\n            <>\n            {/* Custom Domain Mapping */}`
);
content = content.replace(
    `            {/* Product Grid Layout */}`,
    `            </>\n            )}\n            {activeTab === 'layout' && (\n            <>\n            {/* Product Grid Layout */}`
);

content = content.replace(
    `            {/* Checkout & Payment Configuration */}`,
    `            </>\n            )}\n            {activeTab === 'checkout' && (\n            <>\n            {/* Checkout & Payment Configuration */}`
);

content = content.replace(
    `            {/* Inventory Configuration */}`,
    `            </>\n            )}\n            {activeTab === 'inventory' && (\n            <>\n            {/* Inventory Configuration */}`
);

content = content.replace(
    `            {/* Invoice Configuration */}`,
    `            </>\n            )}\n            {activeTab === 'tax_invoice' && (\n            <>\n            {/* Invoice Configuration */}`
);

content = content.replace(
    `            {/* Danger Zone */}`,
    `            </>\n            )}\n            {activeTab === 'danger' && (\n            <>\n            {/* Danger Zone */}`
);

content = content.replace(
    `            {/* ─── CUSTOMER ACCOUNTS ─── */}`,
    `            </>\n            )}\n            {activeTab === 'checkout' && (\n            <>\n            {/* ─── CUSTOMER ACCOUNTS ─── */}`
);

content = content.replace(
    `        </div>\n    );\n}`,
    `            </>\n            )}\n            </div>\n        </div>\n    );\n}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
