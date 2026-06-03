import React from 'react';
import IntegrationsTab from '../components/IntegrationsTab';
import TopHeader from '../components/TopHeader';

const Integrations = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader 
                title="Integrations & API" 
                subtitle="Connect your WhatsApp communications with CRM, eCommerce, and 3rd-party tools."
            />
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative p-4 sm:p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    <IntegrationsTab />
                </div>
            </div>
        </div>
    );
};

export default Integrations;
