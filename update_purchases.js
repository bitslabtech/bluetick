const fs = require('fs');
let code = fs.readFileSync('client/src/pages/AdminPurchases.jsx', 'utf8');
code = code.replace('const AdminPurchases = () => {', 'const AdminPurchases = ({ isComponent = false, parentSearchTerm }) => {');
code = code.replace("const [searchTerm, setSearchTerm] = useState('');", "const [localSearchTerm, setLocalSearchTerm] = useState('');\\n    const searchTerm = parentSearchTerm !== undefined ? parentSearchTerm : localSearchTerm;");
code = code.replace(/return \(\s*<div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">\s*{\/\* Top Bar \*\/}\s*<AdminHeader\s*searchTerm={searchTerm}\s*onSearchChange={\(e\) => setSearchTerm\(e\.target\.value\)}\s*>\s*<TrialBanner \/>\s*<ThemeToggle \/>\s*<\/AdminHeader>\s*<main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">/g, 
'const content = (\\n        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">');
code = code.replace(/<\/div>\s*<\/main>\s*<\/div>\s*\);\s*};\s*const StatCard/g,
'</div>\\n            </main>\\n    );\\n\\n    if (isComponent) return content;\\n\\n    return (\\n        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">\\n            <AdminHeader searchTerm={localSearchTerm} onSearchChange={(e) => setLocalSearchTerm(e.target.value)}>\\n                <TrialBanner />\\n                <ThemeToggle />\\n            </AdminHeader>\\n            {content}\\n        </div>\\n    );\\n};\\n\\nconst StatCard');
fs.writeFileSync('client/src/pages/AdminPurchases.jsx', code);
