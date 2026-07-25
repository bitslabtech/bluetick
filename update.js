const fs = require('fs');

let codeP = fs.readFileSync('client/src/pages/AdminPurchases.jsx', 'utf8');
codeP = codeP.replace('const AdminPurchases = () => {', 'const AdminPurchases = ({ isComponent = false, parentSearchTerm }) => {');
codeP = codeP.replace("const [searchTerm, setSearchTerm] = useState('');", "const [localSearchTerm, setLocalSearchTerm] = useState('');\\n    const searchTerm = parentSearchTerm !== undefined ? parentSearchTerm : localSearchTerm;");
codeP = codeP.replace(/return \(\s*<div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">\s*{\/\* Top Bar \*\/}\s*<AdminHeader[^>]*>\s*<TrialBanner \/>\s*<ThemeToggle \/>\s*<\/AdminHeader>\s*<main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">/g, 
'const content = (\\n        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">');
codeP = codeP.replace(/<\/div>\s*<\/main>\s*<\/div>\s*\);\s*};\s*const StatCard/g,
'</div>\\n            </main>\\n    );\\n\\n    if (isComponent) return content;\\n\\n    return (\\n        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">\\n            <AdminHeader searchTerm={localSearchTerm} onSearchChange={(e) => setLocalSearchTerm(e.target.value)}>\\n                <TrialBanner />\\n                <ThemeToggle />\\n            </AdminHeader>\\n            {content}\\n        </div>\\n    );\\n};\\n\\nconst StatCard');
fs.writeFileSync('client/src/pages/AdminPurchases.jsx', codeP);


let codeI = fs.readFileSync('client/src/pages/AdminInvoices.jsx', 'utf8');
codeI = codeI.replace('export default function AdminInvoices() {', 'export default function AdminInvoices({ isComponent = false, parentSearchTerm }) {');
codeI = codeI.replace(/const \[filters, setFilters\] = useState\(\{ search: '', invoiceType: '', whatsappStatus: '', from: '', to: '' \}\);\s*const \[exporting, setExporting\] = useState\(false\);/,
"const [filters, setFilters] = useState({ search: '', invoiceType: '', whatsappStatus: '', from: '', to: '' });\\n    const [exporting, setExporting] = useState(false);\\n\\n    useEffect(() => {\\n        if (parentSearchTerm !== undefined) {\\n            setFilters(f => ({ ...f, search: parentSearchTerm }));\\n        }\\n    }, [parentSearchTerm]);");

codeI = codeI.replace(/return \(\s*<div style={{ padding: '24px', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>/,
`const content = (
        <div style={{ padding: isComponent ? '0' : '24px', fontFamily: "'Inter', system-ui, sans-serif", background: isComponent ? 'transparent' : '#f8fafc', minHeight: isComponent ? 'auto' : '100vh' }}>`);

codeI = codeI.replace(/<input\s*style={{ \.\.\.inputStyle, minWidth: '200px', flex: 1 }}\s*placeholder="🔍 Search name, email, invoice#, plan…"\s*value={filters\.search}\s*onChange={e => handleFilterChange\('search', e\.target\.value\)}\s*id="invoice-search"\s*\/>/,
`{!isComponent && (
                    <input
                        style={{ ...inputStyle, minWidth: '200px', flex: 1 }}
                        placeholder="🔍 Search name, email, invoice#, plan…"
                        value={filters.search}
                        onChange={e => handleFilterChange('search', e.target.value)}
                        id="invoice-search"
                    />
                )}`);

codeI = codeI.replace(/<\/div>\s*\);\s*}/g, "</div>\\n    );\\n\\n    return content;\\n}");

fs.writeFileSync('client/src/pages/AdminInvoices.jsx', codeI);
