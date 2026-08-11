require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const { generateAndDeliverInvoice } = require('../services/InvoiceService');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Deleting existing invoices to regenerate them...');
        await Invoice.destroy({ where: {}, truncate: true, cascade: true }).catch(() => Invoice.destroy({ where: {} }));

        const SystemConfig = require('../models/SystemConfig');
        const config = await SystemConfig.findOne({ where: { id: 1 } });
        if (config) {
            const settings = { ...config.settings } || {};
            if (settings.invoiceConfig) {
                settings.invoiceConfig = {
                    ...settings.invoiceConfig,
                    currentInvoiceSequence: settings.invoiceConfig.invoiceStartNumber || 1
                };
                config.settings = settings;
                config.changed('settings', true);
                await config.save();
                console.log('Reset invoice sequence counter to ' + settings.invoiceConfig.currentInvoiceSequence);
            }
        }

        const transactions = await Transaction.findAll({
            where: { status: 'COMPLETED' },
            order: [['createdAt', 'ASC']]
        });

        console.log(`Found ${transactions.length} completed transactions total.`);

        let generatedCount = 0;
        for (const tx of transactions) {
            console.log(`\n[+] Generating invoice for Transaction: ${tx.id}`);
            try {
                await generateAndDeliverInvoice(tx.id, { silent: true });
                console.log(`    -> Success! Invoice generated for TX: ${tx.id}`);
                generatedCount++;
            } catch (err) {
                console.error(`    -> Failed to generate for TX: ${tx.id}`, err.message);
            }
        }
        console.log(`\n=== DONE ===\nSuccessfully generated ${generatedCount} invoices.`);
    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        process.exit(0);
    }
}
run();
