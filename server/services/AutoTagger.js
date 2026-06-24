/**
 * AutoTagger Service
 * 
 * Evaluates all active AutoTagRules for a given user and applies matching tags
 * to a contact based on an incoming message body and context.
 *
 * Called from the webhook handler on every new incoming WhatsApp message.
 *
 * Tag Expiry:
 *   When a rule has expiresInHours set, we record the expiry ISO timestamp in
 *   contact.tagExpiry[tagName]. The nightly scheduler reads this field and
 *   prunes expired tags.
 */

const AutoTagRule = require('../models/AutoTagRule');

/**
 * Evaluates auto-tag rules for a user and applies any matching tags to the contact.
 *
 * @param {object} contact         - Sequelize Contact instance
 * @param {string} messageBody     - Incoming message text (may be empty for media messages)
 * @param {boolean} isFirstMessage - True if this is the contact's very first message ever
 * @param {object|null} referralData - CTWA referral object from Meta (or null)
 * @returns {Promise<string[]>}    - Array of tags that were newly applied
 */
async function applyAutoTags(contact, messageBody, isFirstMessage = false, referralData = null) {
    const appliedTags = [];

    try {
        // Fetch all active rules for this contact's owner
        const rules = await AutoTagRule.findAll({
            where: { userId: contact.userId, isActive: true }
        });

        if (rules.length === 0) return appliedTags;

        const bodyLower = (messageBody || '').toLowerCase().trim();
        const currentTags = Array.isArray(contact.tags) ? [...contact.tags] : [];
        const currentExpiry = contact.tagExpiry ? { ...contact.tagExpiry } : {};
        let tagsChanged = false;

        for (const rule of rules) {
            // Check if the tag is already assigned to this contact — skip if so
            if (currentTags.includes(rule.applyTag)) continue;

            let matched = false;

            switch (rule.type) {
                case 'keyword':
                    // Exact word match — the pattern must appear as a whole word in the message
                    if (bodyLower && rule.pattern) {
                        const escapedPattern = rule.pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const wordRegex = new RegExp(`\\b${escapedPattern}\\b`);
                        matched = wordRegex.test(bodyLower);
                    }
                    break;

                case 'contains':
                    // Simple substring match
                    if (bodyLower && rule.pattern) {
                        matched = bodyLower.includes(rule.pattern.toLowerCase());
                    }
                    break;

                case 'regex':
                    // Full regex match — pattern is a raw regex string
                    if (bodyLower && rule.pattern) {
                        try {
                            matched = new RegExp(rule.pattern, 'i').test(bodyLower);
                        } catch (e) {
                            console.warn(`[AutoTagger] Invalid regex in rule ${rule.id}: ${e.message}`);
                        }
                    }
                    break;

                case 'first_message':
                    // Fires only on the very first message from this contact
                    matched = isFirstMessage;
                    break;

                case 'ctwa':
                    // Fires when the contact originated from a Click-to-WhatsApp ad
                    matched = !!referralData && !!referralData.source_id;
                    break;

                default:
                    break;
            }

            if (matched) {
                currentTags.push(rule.applyTag);
                appliedTags.push(rule.applyTag);
                tagsChanged = true;

                // Set expiry if configured
                if (rule.expiresInHours) {
                    const expiryDate = new Date();
                    expiryDate.setHours(expiryDate.getHours() + rule.expiresInHours);
                    currentExpiry[rule.applyTag] = expiryDate.toISOString();
                }

                // Increment the rule's match counter (fire-and-forget)
                rule.increment('matchCount').catch(() => {});

                console.log(`[AutoTagger] Rule "${rule.name}" (${rule.type}) matched → applying tag "${rule.applyTag}" to contact ${contact.phone}`);
            }
        }

        // Persist changes if any tags were applied
        if (tagsChanged) {
            await contact.update({
                tags: currentTags,
                tagExpiry: Object.keys(currentExpiry).length > 0 ? currentExpiry : null
            });
        }
    } catch (err) {
        // Non-fatal — log but never crash the webhook handler
        console.error('[AutoTagger] Error evaluating rules:', err.message);
    }

    return appliedTags;
}

module.exports = { applyAutoTags };
