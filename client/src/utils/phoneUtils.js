export const countryCodes = [
    { code: 'IN', dialCode: '+91', label: 'India', regex: /^[6-9]\d{9}$/ },
    { code: 'US', dialCode: '+1', label: 'US/Canada', regex: /^\d{10}$/ },
    { code: 'UK', dialCode: '+44', label: 'UK', regex: /^\d{10,11}$/ },
    { code: 'AE', dialCode: '+971', label: 'UAE', regex: /^\d{9}$/ },
    { code: 'AU', dialCode: '+61', label: 'Australia', regex: /^\d{9}$/ },
    { code: 'SG', dialCode: '+65', label: 'Singapore', regex: /^\d{8}$/ },
    { code: 'ZA', dialCode: '+27', label: 'South Africa', regex: /^\d{9}$/ },
    { code: 'OTHER', dialCode: '', label: 'Other', regex: /^\d{7,15}$/ }
];

export const validatePhone = (dialCode, phone) => {
    if (!phone || phone.trim() === '') return true; // Empty check handled separately
    
    // Clean phone number: remove spaces, dashes, parentheses
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Find country based on dialCode
    const country = countryCodes.find(c => c.dialCode === dialCode) || countryCodes.find(c => c.code === 'OTHER');
    
    return country.regex.test(cleanPhone);
};
