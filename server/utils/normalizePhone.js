/**
 * normalizePhone.js
 * -----------------
 * Shared phone-number utility used across webhook, contacts, and campaign code.
 *
 * WHY THIS EXISTS
 * ---------------
 * Meta always delivers phone numbers in full E.164 form without '+':
 *   e.g.  919876543210  (91 = India country code + 10-digit mobile)
 *
 * Users may import/add contacts WITHOUT the country code:
 *   e.g.  9876543210
 *
 * This mismatch causes two problems:
 *   1. Webhook status updates (131026 "Not on WhatsApp") fail to find the contact -> status never updated.
 *   2. Inbound messages create a NEW contact instead of finding the existing one -> duplicates.
 *
 * SOLUTION
 * --------
 * Country codes are always 1-3 digits.
 * Given Meta's full number "919876543210", the stored contact could be:
 *   - "919876543210" (stored with country code)   -> exact match
 *   - "+919876543210" (stored with +)              -> normalised exact match
 *   - "19876543210"  (stripped 1 digit)            -> try
 *   - "9876543210"   (stripped 2 digits = CC "91") -> match!
 *   - "876543210"    (stripped 3 digits)            -> try (harmless if no match)
 *
 * phoneVariants() generates this small candidate set so we can use Op.in on a
 * single indexed query - no country code config needed.
 */

/**
 * Strip everything except digits. Returns a plain digit string.
 * @param {string|number} phone
 * @returns {string}
 */
function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

/**
 * Return all plausible stored formats for a given phone number.
 * Works bidirectionally:
 *   - Pass a Meta-style full number  -> variants include shorter (no-CC) forms
 *   - Pass a short (no-CC) number    -> variants include the number as-is
 *
 * The result is always a deduplicated array of digit-only strings.
 * Use with Sequelize Op.in for a single indexed lookup.
 *
 * @param {string|number} phone  - Raw phone (any format)
 * @returns {string[]}           - Array of candidate phone strings
 */
function phoneVariants(phone) {
    const clean = normalizePhone(phone);
    if (!clean) return [];

    const variants = new Set();

    // 1. The number exactly as normalised (digits only, no +)
    variants.add(clean);

    // 2. With leading '+' (some systems store it this way)
    variants.add('+' + clean);

    // 3. Strip the first 1, 2, and 3 digits to account for any country code prefix
    //    (country codes are always 1-3 digits per ITU-T E.164)
    //    Only add if the resulting number is still at least 7 digits (shortest valid local number)
    for (let strip = 1; strip <= 3; strip++) {
        if (clean.length - strip >= 7) {
            variants.add(clean.slice(strip));
        }
    }

    return [...variants];
}

module.exports = { normalizePhone, phoneVariants };
