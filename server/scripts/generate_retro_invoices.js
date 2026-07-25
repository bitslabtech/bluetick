require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { processInvoiceForTransaction } = require('../services/InvoiceService');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // 1. Find all completed transactions that do NOT have an invoice yet
        const transactions = await Transaction.findAll({
            where: { status: 'COMPLETED' },
            order: [['createdAt', 'ASC']]
        });

        console.log(`Found ${transactions.length} completed transactions total.`);

        let generatedCount = 0;

        for (const tx of transactions) {
            const existing = await Invoice.findOne({ where: { transactionId: tx.id } });
            
            if (!existing) {
                console.log(`\n[+] Generating missing invoice for Transaction: ${tx.id} (User: ${tx.userId})`);
                
                // Fetch the latest user profile to ensure billingProfile is captured
                // Note: processInvoiceForTransaction already fetches the user inside it, 
                // so it will automatically use the freshly updated billingProfile data!
                
                try {
                    await processInvoiceForTransaction(tx.id);
                    console.log(`    -> Success! Invoice generated for TX: ${tx.id}`);
                    generatedCount++;
                } catch (err) {
                    console.error(`    -> Failed to generate for TX: ${tx.id}`, err.message);
                }
            } else {
                console.log(`[SKIP] Invoice already exists for TX: ${tx.id}`);
            }
        }

        console.log(`\n=== DONE ===`);
        console.log(`Successfully generated ${generatedCount} retroactive invoices.`);

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

run();
