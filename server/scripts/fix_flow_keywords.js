require('dotenv').config();
const Flow = require('../models/Flow');

async function fixFlowKeywords() {
    try {
        console.log('[MIGRATION] Starting triggerKeyword normalization...');
        const flows = await Flow.findAll();
        
        let updatedCount = 0;
        for (const flow of flows) {
            if (flow.triggerKeyword) {
                const original = flow.triggerKeyword;
                const normalized = flow.triggerKeyword.trim().toLowerCase();
                if (normalized !== original) {
                    await Flow.update(
                        { triggerKeyword: normalized },
                        { where: { id: flow.id } }
                    );
                    updatedCount++;
                    console.log(`[MIGRATION] Updated flow "${flow.name}": "${original}" -> "${normalized}"`);
                }
            }
        }
        
        console.log(`[MIGRATION] Finished. Updated ${updatedCount} flows.`);
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION ERROR]', err);
        process.exit(1);
    }
}

fixFlowKeywords();
