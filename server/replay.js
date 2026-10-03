const fs = require('fs');
const axios = require('axios');

async function replayWebhooks() {
    console.log('Starting webhook replay...');
    // Replace this with the path to your production log file if different
    const logData = fs.readFileSync('webhook_debug.log', 'utf8');
    const lines = logData.split('\n');

    const seenMessageIds = new Set();
    let replayedCount = 0;
    
    let lastSignature = null;

    for (const line of lines) {
        if (!line.trim()) continue;

        // Extract signature if this is a signature line
        if (line.includes('SIGNATURE_CHECK')) {
            const parts = line.split(' | ');
            if (parts.length >= 3) {
                lastSignature = parts[2].trim();
            }
            continue;
        }

        // Line format: timestamp | userId | JSON_payload
        const parts = line.split(' | ');
        if (parts.length < 3) continue;

        const userId = parts[1].trim();
        const payloadStr = parts.slice(2).join(' | ').trim();

        try {
            const payload = JSON.parse(payloadStr);

            // We only care about incoming messages
            const changes = payload.entry?.[0]?.changes?.[0]?.value;
            if (changes && changes.messages && changes.messages.length > 0) {
                const messageId = changes.messages[0].id;
                
                // Avoid replaying the exact same message twice during this run
                if (seenMessageIds.has(messageId)) continue;
                seenMessageIds.add(messageId);

                console.log(`Replaying message ${messageId} for user ${userId}...`);
                
                // POST to local server WITH the original Meta signature!
                await axios.post(`http://localhost:5000/api/webhook/${userId}`, payload, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-hub-signature-256': lastSignature // Passing original signature!
                    }
                });
                replayedCount++;
                
                // slight delay to not overwhelm the server
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (e) {
            // Ignore parse errors or failed requests
        }
    }

    console.log(`Replay complete! Replayed ${replayedCount} unique incoming messages.`);
}

replayWebhooks();
