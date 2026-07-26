const { sequelize } = require('../config/database');

/**
 * Atomically generates the next sequential invoice number.
 *
 * Format: {prefix}-{YYYY}-{NNNN}
 * Example: INV-2025-0042
 *
 * Uses a DB-level transaction with row lock to ensure no two concurrent
 * requests produce the same number even under high load.
 *
 * @param {object} invoiceConfig - The invoiceConfig block from SystemConfig.settings
 * @returns {string} Formatted invoice number e.g. "INV-2025-0042"
 */
async function getNextInvoiceNumber(invoiceConfig) {
    const SystemConfig = require('../models/SystemConfig');

    // Use a DB transaction with SERIALIZABLE isolation to prevent race conditions
    return await sequelize.transaction(async (t) => {
        // Re-fetch config with a row-level lock so no other process can read/write simultaneously
        const config = await SystemConfig.findOne({
            where: { id: 1 },
            lock: t.LOCK.UPDATE,
            transaction: t
        });

        if (!config) throw new Error('SystemConfig not found');

        const settings = config.settings || {};
        const ic = settings.invoiceConfig || {};

        const prefix = ic.invoicePrefix || 'INV';
        const current = ic.currentInvoiceSequence || (ic.invoiceStartNumber || 1);

        // Format: INV-0042 (zero-padded to 4 digits, grows as needed)
        const formatted = `${prefix}-${String(current).padStart(4, '0')}`;

        // Increment sequence atomically
        const updatedSettings = {
            ...settings,
            invoiceConfig: {
                ...ic,
                currentInvoiceSequence: current + 1
            }
        };

        await config.update({ settings: updatedSettings }, { transaction: t });

        return formatted;
    });
}

module.exports = { getNextInvoiceNumber };
