const fs = require('fs');
let code = fs.readFileSync('client/src/pages/AdminInvoices.jsx', 'utf8');
code = code.replace('export default function AdminInvoices() {', 'export default function AdminInvoices({ isComponent = false, parentSearchTerm }) {');
code = code.replace(/const \[filters, setFilters\] = useState\(\{ search: '', invoiceType: '', whatsappStatus: '', from: '', to: '' \}\);\s*const \[exporting, setExporting\] = useState\(false\);/,
"const [filters, setFilters] = useState({ search: '', invoiceType: '', whatsappStatus: '', from: '', to: '' });\\n    const [exporting, setExporting] = useState(false);\\n\\n    useEffect(() => {\\n        if (parentSearchTerm !== undefined) {\\n            setFilters(f => ({ ...f, search: parentSearchTerm }));\\n        }\\n    }, [parentSearchTerm]);");

code = code.replace(/return \(\s*<div style={{ padding: '24px', fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>/,
"const content = (\\n        <div style={{ padding: isComponent ? '0' : '24px', fontFamily: \\"'Inter', system-ui, sans-serif\\", background: isComponent ? 'transparent' : '#f8fafc', minHeight: isComponent ? 'auto' : '100vh' }}>");

code = code.replace(/<input\s*style={{ \.\.\.inputStyle, minWidth: '200px', flex: 1 }}\s*placeholder="🔍 Search name, email, invoice#, plan…"\s*value={filters\.search}\s*onChange={e => handleFilterChange\('search', e\.target\.value\)}\s*id="invoice-search"\s*\/>/,
"{!isComponent && (\\n                    <input\\n                        style={{ ...inputStyle, minWidth: '200px', flex: 1 }}\\n                        placeholder=\\"🔍 Search name, email, invoice#, plan…\\"\\n                        value={filters.search}\\n                        onChange={e => handleFilterChange('search', e.target.value)}\\n                        id=\\"invoice-search\\"\\n                    />\\n                )}");

code = code.replace(/<\/div>\s*\);\s*}/g, "</div>\\n    );\\n\\n    return content;\\n}");

fs.writeFileSync('client/src/pages/AdminInvoices.jsx', code);
