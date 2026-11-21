import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';
// Default text. Superadmin → Landing page → Pages can override it: open "HTML Source" there and
// paste the contents of src/legal/privacy.html to start from this version.
import html from '../legal/privacy.html?raw';

const PrivacyPolicy = () => (
    <PublicLayout title="Privacy Policy" pageKey="privacy">
        <div dangerouslySetInnerHTML={{ __html: html }} />
    </PublicLayout>
);

export default PrivacyPolicy;
