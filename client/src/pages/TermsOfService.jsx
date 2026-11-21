import React from 'react';
import PublicLayout from '../components/landing/PublicLayout';
// Default text. Superadmin → Landing page → Pages can override it: open "HTML Source" there and
// paste the contents of src/legal/terms.html to start from this version.
import html from '../legal/terms.html?raw';

const TermsOfService = () => (
    <PublicLayout title="Terms of Service" pageKey="terms">
        <div dangerouslySetInnerHTML={{ __html: html }} />
    </PublicLayout>
);

export default TermsOfService;
