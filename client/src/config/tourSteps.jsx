// Tour step definitions for the onboarding experience
export const tourSteps = [
    {
        target: 'body',
        content: '🎉 Welcome to Bluetick! Let\'s take a quick 2-minute tour to get you started.',
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '[data-tour="dashboard"]',
        content: 'This is your Dashboard - your command center for all WhatsApp messaging activities. Monitor your usage, and track performance at a glance.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="usage-stats"]',
        content: '📊 Track your message usage here. You have 30 free messages to start! Upgrade anytime for more capacity.',
        placement: 'bottom',
    },
    {
        target: '[data-tour="quick-actions"]',
        content: 'Quick actions to create campaigns, send messages, or import contacts - all just one click away!',
        placement: 'bottom',
    },
    {
        target: '[data-tour="sidebar"]',
        content: 'Navigate between different modules using this sidebar. Each module serves a specific purpose in your WhatsApp messaging workflow.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-contacts"]',
        content: '📇 Manage your contacts here. Free plan includes 10 contacts. Import via CSV or add manually.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-templates"]',
        content: '📝 Create WhatsApp message templates here. Free plan includes 2 templates. Templates must be approved by WhatsApp before use.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-campaigns"]',
        content: '📢 Schedule and send bulk messages to your contacts. Create targeted campaigns with your approved templates.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-messages"]',
        content: '💬 Track all sent messages, delivery status, read receipts, and message history in one place.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-analytics"]',
        content: '📊 View detailed analytics on message performance, engagement rates, and campaign effectiveness.',
        placement: 'right',
    },
    {
        target: '[data-tour="menu-settings"]',
        content: '⚙️ Configure your WhatsApp API, payment gateways, notification templates, and system preferences.',
        placement: 'right',
    },
    {
        target: 'body',
        content: (
            <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">🎊 Tour Complete!</h3>
                <p className="mb-4">You're all set! Here's what to do next:</p>
                <div className="text-left space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>1. Configure WhatsApp API (Settings &gt; WhatsApp Gateway)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>2. Import your first 10 contacts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>3. Create your first template</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>4. Send your first campaign</span>
                    </div>
                </div>
                <p className="text-sm text-slate-500">You can restart this tour anytime from Settings.</p>
            </div>
        ),
        placement: 'center',
        locale: { last: 'Get Started!' },
    },
];

export const tourStyles = {
    options: {
        arrowColor: '#fff',
        backgroundColor: '#fff',
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        primaryColor: '#6366f1',
        textColor: '#0f172a',
        width: 380,
        zIndex: 10000,
    },
    tooltip: {
        borderRadius: 12,
        padding: 20,
    },
    tooltipContainer: {
        textAlign: 'left',
    },
    tooltipTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '8px',
    },
    tooltipContent: {
        fontSize: '14px',
        lineHeight: 1.6,
    },
    buttonNext: {
        backgroundColor: '#6366f1',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    buttonBack: {
        color: '#6366f1',
        marginRight: 10,
    },
    buttonSkip: {
        color: '#64748b',
    },
    beacon: {
        inner: '#6366f1',
        outer: '#6366f1',
    },
};
