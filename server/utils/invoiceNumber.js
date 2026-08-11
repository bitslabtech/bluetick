const { sequelize } = require('../config/database');

/**
 * Pure function to format an invoice number based on config and sequence.
 * Supports {PREFIX}, {YYYY}, {YY}, {MM}, {DD}, {FY}, {SEQ}
 *
 * @param {object} ic - invoiceConfig block
 * @param {number} sequence - The sequence number to format
 * @param {Date} [date] - Optional date to use for FY/YYYY. Defaults to new Date()
 * @returns {string} Formatted invoice string
 */
function formatInvoiceNumber(ic, sequence, date = new Date()) {
    const prefix = ic.invoicePrefix || 'INV';
    let format = ic.invoiceFormat || '{PREFIX}-{YYYY}-{SEQ}'; // Fallback to old format logic basically
    const padding = parseInt(ic.invoiceSequencePadding) || 4;
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
    
    // FY calculation (Indian Financial Year: April 1 to March 31)
    let fyStartYear = year;
    if (month < 3) {
        fyStartYear = year - 1;
    }
    const fyEndYear = (fyStartYear + 1).toString().slice(-2);
    const fyString = `${fyStartYear.toString().slice(-2)}-${fyEndYear}`;
    
    const placeholders = {
        '{PREFIX}': prefix,
        '{YYYY}': year,
        '{YY}': year.toString().slice(-2),
        '{MM}': String(month + 1).padStart(2, '0'),
        '{DD}': String(date.getDate()).padStart(2, '0'),
        '{FY}': fyString,
        '{SEQ}': String(sequence).padStart(padding, '0')
    };
    
    return format.replace(/{PREFIX}|{YYYY}|{YY}|{MM}|{DD}|{FY}|{SEQ}/g, match => placeholders[match]);
}

/**
 * Atomically generates the next sequential invoice number.
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

        const current = ic.currentInvoiceSequence || (ic.invoiceStartNumber || 1);

        const formatted = formatInvoiceNumber(ic, current);

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

module.exports = { getNextInvoiceNumber, formatInvoiceNumber };
