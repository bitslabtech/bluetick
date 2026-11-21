import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';
// Default text. Superadmin → Landing page → Pages can override it: open "HTML Source" there and
// paste the contents of src/legal/refund.html to start from this version.
import html from '../legal/refund.html?raw';

const RefundPolicy = () => (
    <PublicLayout title="Cancellation & Refund Policy" pageKey="refund-policy">
        <div dangerouslySetInnerHTML={{ __html: html }} />
    </PublicLayout>
);

export default RefundPolicy;
