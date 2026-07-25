import React, { useState } from 'react';
import AdminPurchases from './AdminPurchases';
import AdminInvoices from './AdminInvoices';
import { ShoppingBag, FileText } from 'lucide-react';
import AdminHeader from '../components/AdminHeader';
import TrialBanner from '../components/TrialBanner';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminPurchasesInvoices() {
    const [activeTab, setActiveTab] = useState('purchases');
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
                <TrialBanner />
                <ThemeToggle />
            </AdminHeader>

            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-6">
                <div className="flex space-x-6 border-b border-slate-200 dark:border-white/10">
                    <button 
                        onClick={() => setActiveTab('purchases')}
                        className={`flex items-center gap-2 pb-3 font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        <ShoppingBag className="w-4 h-4" /> Purchases
                    </button>
                    <button 
                        onClick={() => setActiveTab('invoices')}
                        className={`flex items-center gap-2 pb-3 font-medium border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        <FileText className="w-4 h-4" /> Invoices
                    </button>
                </div>
            </div>

            <div className="flex-1">
                {activeTab === 'purchases' && <AdminPurchases isComponent={true} parentSearchTerm={searchTerm} />}
                {activeTab === 'invoices' && <AdminInvoices isComponent={true} parentSearchTerm={searchTerm} />}
            </div>
        </div>
    );
}
