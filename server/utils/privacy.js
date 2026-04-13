/**
 * Utility to apply privacy masking to data returned to the client.
 * Masking happens server-side so raw data never reaches the browser network tab.
 */

const applyPrivacyMask = (data, user) => {
    // If no user or user is owner/admin (direct), return data as is
    if (!user || (!user.parentUserId && user.isAdmin !== false)) {
        return data;
    }

    const isSubMember = !!user.parentUserId;
    const policy = user.teamPolicy?.phonePrivacy || 'visible';

    // If visible or not a submember, return data as is
    if (!isSubMember || policy === 'visible') {
        return data;
    }

    // Function to mask a single object
    const maskObject = (obj) => {
        const masked = { ...obj };
        
        // Handle Conversations (phoneNumber, lastMessage if it contains phone)
        if (masked.phoneNumber) {
            masked.phoneNumber = policy === 'masked' 
                ? `****${masked.phoneNumber.slice(-4)}`
                : '[HIDDEN]'; // For 'blurred', we treat as hidden on backend to be 100% safe
        }

        // Handle Contacts (phone field)
        if (masked.phone) {
            masked.phone = policy === 'masked'
                ? `****${masked.phone.slice(-4)}`
                : '[HIDDEN]';
        }

        // Handle Messages (body might have phone, but usually we mask the 'to' field)
        return masked;
    };

    if (Array.isArray(data)) {
        return data.map(item => {
            // Handle Sequelize instances
            const obj = typeof item.toJSON === 'function' ? item.toJSON() : item;
            return maskObject(obj);
        });
    }

    const obj = typeof data.toJSON === 'function' ? data.toJSON() : data;
    return maskObject(obj);
};

module.exports = { applyPrivacyMask };
