const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const User = require(path.join(__dirname, '../../../server/models/User'));

// Sample endpoint for the Plugin to expose specific logic or webhooks
router.get('/status', (req, res) => {
    res.json({ status: 'active', plugin: 'ai_bot' });
});

const calculateTokenCost = (text) => {
    // Simple cost model: 1 token per 50 characters generated, minimum 1
    if (!text) return 1;
    return Math.max(1, Math.ceil(text.length / 50));
};

// ── Build the full system prompt from advanced config ──
const buildSystemPrompt = (config) => {
    const parts = [];

    // Core system prompt (user-written persona)
    if (config.systemPrompt) {
        parts.push(config.systemPrompt);
    } else {
        parts.push('You are a helpful and concise WhatsApp assistant. Keep your replies short, friendly, and formatted for WhatsApp.');
    }

    // Tone
    const toneMap = {
        professional: 'Maintain a professional and formal tone in all responses.',
        friendly: 'Be warm, friendly, and approachable in your responses.',
        sales: 'Be persuasive, enthusiastic, and sales-oriented. Highlight benefits and encourage action.',
        technical: 'Be precise, technical, and detailed. Use accurate terminology.',
        casual: 'Be relaxed and conversational, like chatting with a friend.',
    };
    if (config.tone && toneMap[config.tone]) {
        parts.push(toneMap[config.tone]);
    }

    // Language
    if (config.defaultLanguage && config.defaultLanguage !== 'auto') {
        const langNames = {
            en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
            ar: 'Arabic', pt: 'Portuguese', de: 'German', ja: 'Japanese', zh: 'Chinese'
        };
        parts.push(`Always respond in ${langNames[config.defaultLanguage] || config.defaultLanguage}, regardless of the user's language.`);
    } else {
        parts.push('Respond in the same language the user is writing in.');
    }

    // Emoji usage
    const emojiMap = {
        none: 'Do NOT use any emojis in your responses.',
        minimal: 'Use emojis sparingly — only when they genuinely enhance the message.',
        expressive: 'Use emojis frequently to make messages lively and expressive.',
    };
    if (config.emojiUsage && emojiMap[config.emojiUsage]) {
        parts.push(emojiMap[config.emojiUsage]);
    }

    // Knowledge Base
    if (config.knowledgeBase && config.knowledgeBase.trim()) {
        parts.push(`\n--- KNOWLEDGE BASE (use this to answer questions accurately) ---\n${config.knowledgeBase.trim()}\n--- END KNOWLEDGE BASE ---`);
    }

    // Handoff keywords instruction
    if (config.handoffKeywords && config.handoffKeywords.trim()) {
        const keywords = config.handoffKeywords.split(',').map(k => k.trim()).filter(Boolean);
        if (keywords.length > 0) {
            parts.push(`If the user's message contains any of these keywords: [${keywords.join(', ')}], respond ONLY with: "Let me connect you with a team member who can help you better. Please hold on." — do not attempt to answer the query yourself.`);
        }
    }

    return parts.join('\n\n');
};

const processMessage = async (messageBody, userId, conversationId, config, allSettings) => {
    try {
        const user = await User.findByPk(userId);

        // ── Operating Mode Check ──
        const mode = config.operatingMode || 'always';
        if (mode === 'manual') {
            if (!config.manualEnabled) {
                console.log(`[AI BOT] Manual mode is active but AI is disabled for user ${userId}`);
                return null;
            }
        } else if (mode === 'off_hours') {
            // Check if it's currently off-hours based on allSettings.whatsappAutomations.offHoursMessage
            const offHours = allSettings?.whatsappAutomations?.offHoursMessage;
            if (offHours?.enabled && Array.isArray(offHours.schedule)) {
                const userTime = new Date().toLocaleString("en-US", { timeZone: offHours.timezone || 'UTC' });
                const currDate = new Date(userTime);
                const currDay = currDate.toLocaleDateString("en-US", { weekday: 'long' });
                const currTime = currDate.getHours().toString().padStart(2, '0') + ":" + currDate.getMinutes().toString().padStart(2, '0');

                const daySchedule = offHours.schedule.find(s => s.day === currDay);
                if (daySchedule) {
                    const isOffHours = currTime < daySchedule.start || currTime > daySchedule.end;
                    if (!isOffHours) {
                        console.log(`[AI BOT] Off-hours mode active but it is currently Business Hours for user ${userId}`);
                        return null;
                    }
                }
            } else {
                console.log(`[AI BOT] Off-hours mode active but no schedule configured for user ${userId}`);
                return null;
            }
        }

        // Check if user has enough AI tokens to at least attempt a reply (min 1)
        if (!user || user.aiTokenBalance <= 0) {
            console.log(`[AI BOT] User ${userId} has insufficient AI tokens.`);
            return null; // Silent fail, allowing for default fallback if needed, or simply not responding
        }

        const apiKey = process.env.GEMINI_API_KEY; // Use master key
        if (!apiKey) {
            console.error('[AI BOT] GEMINI_API_KEY is not set in environment variables.');
            return "I am unable to respond at the moment due to an API configuration issue."; // Notify end user of dev issue
        }

        // Build advanced system prompt from all config settings
        const systemPrompt = buildSystemPrompt(config);

        // Temperature from config (default 0.7, clamped 0-1)
        const temperature = Math.min(1, Math.max(0, config.temperature ?? 0.7));

        // Max output tokens from config (default 200, clamped 50-1000)
        const maxOutputTokens = Math.min(1000, Math.max(50, config.maxResponseLength ?? 200));

        // Determine AI model from SystemConfig (Superadmin setting)
        const SystemConfig = require(path.join(__dirname, '../../../server/models/SystemConfig'));
        const sysConfig = await SystemConfig.getConfig();
        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';

        console.log(`[AI BOT] Processing incoming message for User ${userId} | model=${aiModel} temp=${temperature} maxTokens=${maxOutputTokens} tone=${config.tone || 'default'}`);

        // Use Gemini REST API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `Instructions: ${systemPrompt}\n\nUser Message: ${messageBody}` }]
                }
            ],
            generationConfig: {
                maxOutputTokens: maxOutputTokens,
                temperature: temperature,
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const replyText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (replyText) {
            // Deduct Tokens
            const cost = calculateTokenCost(replyText);

            // To prevent going negative, if they can't afford this exact response cost, 
            // still send it this one time but they will hit 0 balance for the next request.
            await user.decrement('aiTokenBalance', { by: cost });
            console.log(`[AI BOT] Generated reply. Deducted ${cost} tokens from user ${userId}. New Balance: ${user.aiTokenBalance - cost}`);

            return replyText;
        }

        return null;

    } catch (err) {
        const errorDetail = err.response?.data || err.message;
        console.error('[AI BOT] Processing Error:', JSON.stringify(errorDetail));
        
        // If it's a 404, it might be the model name or API path
        if (err.response?.status === 404) {
            return "AI Error: The requested AI model was not found. Please check your configuration.";
        }
        
        return "I encountered an error while trying to process your request. (Debug: " + (err.response?.data?.error?.message || err.message) + ")";
    }
};

module.exports = {
    router,
    processMessage
};
