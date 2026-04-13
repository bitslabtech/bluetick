import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus, Search, Filter, MoreVertical, Calendar,
    MessageSquare, CheckCircle, AlertTriangle, XCircle, Clock, Menu, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import CampaignStep1 from '../components/campaigns/CampaignStep1';
import CampaignStep2 from '../components/campaigns/CampaignStep2';
import CampaignStep3 from '../components/campaigns/CampaignStep3';

const Campaigns = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showModal } = useUI();
    const [step, setStep] = useState(1);
    const [campaignData, setCampaignData] = useState({
        name: '',
        description: '',
        recipients: [],
        templateId: null,
        params: {},
        retargetCampaignId: null,
        retargetStatus: null,
        retargetLogIds: null
    });
    const { user } = useAuth();
    const [isConfigured, setIsConfigured] = useState(true); // Default true until fetched

    useEffect(() => {
        if (user?.id) {
            axios.get('http://127.0.0.1:5000/api/dashboard/stats', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            }).then(res => {
                setIsConfigured(res.data.isWhatsappConfigured);
            }).catch(() => setIsConfigured(false));
        }
    }, [user?.id]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const retargetCampaignId = params.get('retargetCampaignId');
        const retargetStatus = params.get('retargetStatus');
        const sourceName = params.get('sourceName');
        const retargetLogIds = location.state?.retargetLogIds || null;
        
        if (retargetCampaignId && retargetStatus) {
            setCampaignData(prev => ({
                ...prev,
                retargetCampaignId,
                retargetStatus,
                retargetLogIds,
                name: `[Retarget - ${retargetStatus}] ${sourceName || 'Campaign'}`
            }));
        }
    }, [location.search, location.state]);

    const updateData = (newData) => {
        setCampaignData(prev => ({ ...prev, ...newData }));
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async (payload) => {
        try {
            const finalPayload = {
                ...payload,
                name: campaignData.name
            };
            await axios.post('http://127.0.0.1:5000/api/messages/send', finalPayload);

            showModal({
                type: 'success',
                title: 'Campaign Sent!',
                message: 'Your campaign has been successfully queued for sending.',
                confirmText: 'Go to Campaigns',
                onConfirm: () => navigate('/campaign-list')
            });
        } catch (err) {
            console.error(err);
            showModal({
                type: 'error',
                title: 'Sending Failed',
                message: err.response?.data?.error || err.message,
                confirmText: 'Close'
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">
                    <button className="md:hidden text-slate-900 dark:text-white">
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Search Bar */}
                    <div className="hidden md:flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-primary transition-colors">
                        <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
                    {!isConfigured ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-24 h-24 bg-white dark:bg-surface-dark rounded-full flex items-center justify-center shadow-xl mb-6 border border-slate-100 dark:border-white/5">
                                <Settings className="w-12 h-12 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">WhatsApp Not Configured</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                You need to connect your WhatsApp Business account before you can send campaigns or messages.
                            </p>
                            <button
                                onClick={() => navigate('/settings', { state: { initialTab: 'whatsapp_gateway' } })}
                                className="px-8 py-3.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                            >
                                Configure WhatsApp
                            </button>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <CampaignStep1
                                    data={campaignData}
                                    updateData={updateData}
                                    onNext={handleNext}
                                />
                            )}
                            {step === 2 && (
                                <CampaignStep2
                                    data={campaignData}
                                    updateData={updateData}
                                    onNext={handleNext}
                                    onBack={handleBack}
                                />
                            )}
                            {step === 3 && (
                                <CampaignStep3
                                    data={campaignData}
                                    updateData={updateData}
                                    onBack={handleBack}
                                    onSubmit={handleSubmit}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Campaigns;
