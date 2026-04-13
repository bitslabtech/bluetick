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

    // Response length instruction (natural language — avoids mid-sentence hard cuts)
    const maxLen = config.maxResponseLength ?? 200;
    if (maxLen <= 80) {
        parts.push('Keep your replies extremely brief — 1 to 2 sentences maximum. Never write more than that.');
    } else if (maxLen <= 150) {
        parts.push('Keep your replies short — 2 to 3 sentences at most. Be concise and to the point.');
    } else if (maxLen <= 300) {
        parts.push('Keep your replies concise — no more than a short paragraph (4-5 sentences). Avoid unnecessary detail.');
    } else if (maxLen <= 600) {
        parts.push('You may give moderately detailed replies, but stay focused. Aim for no more than 2 short paragraphs.');
    } else {
        parts.push('You may give thorough, detailed responses when needed. Be complete but avoid unnecessary repetition.');
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
            const isManualOn = config.manualEnabled === true || config.manualEnabled === 'true';
            if (!isManualOn) {
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
            return null;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AI BOT] GEMINI_API_KEY is not set in environment variables.');
            return "I am unable to respond at the moment due to an API configuration issue.";
        }

        // Build advanced system prompt from all config settings
        const systemPrompt = buildSystemPrompt(config);

        // Temperature from config (default 0.7, clamped 0-1)
        const temperature = Math.min(1, Math.max(0, config.temperature ?? 0.7));

        // maxOutputTokens is a hard safety ceiling only — NOT used to trim length.
        // Length control is handled gracefully via the system prompt instruction above.
        const maxOutputTokens = 1024;

        // Determine AI model from SystemConfig (Superadmin setting)
        const SystemConfig = require(path.join(__dirname, '../../../server/models/SystemConfig'));
        const sysConfig = await SystemConfig.getConfig();
        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';

        console.log(`[AI BOT] Processing incoming message for User ${userId} | model=${aiModel} temp=${temperature} maxTokens=${maxOutputTokens} tone=${config.tone || 'default'}`);

        // ── Fetch last 10 messages from this conversation for context ──
        const ChatMessage = require(path.join(__dirname, '../../../server/models/ChatMessage'));
        const recentMessages = await ChatMessage.findAll({
            where: { conversationId },
            order: [['timestamp', 'DESC']],
            limit: 10,
            raw: true
        });
        // Reverse so oldest is first (chronological order for the API)
        recentMessages.reverse();

        // Build Gemini multi-turn contents array from history
        // Gemini roles: 'user' for inbound/human, 'model' for outbound/AI
        const historyContents = recentMessages.map(msg => ({
            role: msg.direction === 'INBOUND' ? 'user' : 'model',
            parts: [{ text: msg.body || '' }]
        }));

        // If the last message in history is already the current inbound message, use history as-is.
        // Otherwise append the current message (handles edge case where message isn't saved yet).
        const lastInHistory = historyContents[historyContents.length - 1];
        const currentMsgAlreadyIncluded = lastInHistory &&
            lastInHistory.role === 'user' &&
            lastInHistory.parts[0].text === messageBody;

        if (!currentMsgAlreadyIncluded) {
            historyContents.push({
                role: 'user',
                parts: [{ text: messageBody }]
            });
        }

        // Gemini requires alternating user/model turns. Ensure the first turn is 'user'.
        // If history starts with a 'model' turn (rare), drop it.
        while (historyContents.length > 0 && historyContents[0].role === 'model') {
            historyContents.shift();
        }

        // Use Gemini REST API with systemInstruction (separate from contents)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: historyContents,
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
            
            const SystemConfig = require(path.join(__dirname, '../../../server/models/SystemConfig'));
            const sysConfig = await SystemConfig.getConfig();
            const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_chatbot ?? 1;
            const finalCost = Math.ceil(cost * multiplier);

            await user.decrement('aiTokenBalance', { by: finalCost });
            const newBal = (user.aiTokenBalance - finalCost);
            console.log(`[AI BOT] Generated reply. Deducted ${finalCost} tokens (base: ${cost}, x${multiplier}) from user ${userId}. New Balance: ${newBal}`);

            // Log token usage event
            try {
                const AiTokenLog = require(path.join(__dirname, '../../../server/models/AiTokenLog'));
                await AiTokenLog.create({
                    userId,
                    feature: 'ai_chatbot',
                    tokensUsed: finalCost,
                    balanceAfter: Math.max(0, newBal)
                });
            } catch (logErr) {
                console.warn('[AI BOT] Failed to write AiTokenLog:', logErr.message);
            }

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
