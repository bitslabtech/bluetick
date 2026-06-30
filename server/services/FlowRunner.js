const ChatMessage = require('../models/ChatMessage');
const ContactFlowState = require('../models/ContactFlowState');
const FlowExecutionLog = require('../models/FlowExecutionLog');
const { getIo } = require('../socket');

class FlowRunner {
    constructor(settings, conversation, userId, triggerType = 'keyword') {
        this.settings = settings;
        this.conversation = conversation;
        this.userId = userId;
        this.triggerType = triggerType;
        this.nodesExecuted = 0;
        this.currentLogId = null;
    }

    async executeFlow(flow, contactId, startingNodeId = null) {
        // Find the start node. If resume from pause, use startingNodeId. Otherwise find Trigger Node
        let currentNode = null;
        if (startingNodeId) {
            currentNode = flow.nodes.find(n => n.id === startingNodeId);
        } else {
            currentNode = flow.nodes.find(n => n.type === 'triggerNode');
        }

        if (!currentNode) {
            console.error('[FLOW] Starting node not found in flow:', flow.id);
            return;
        }

        // Log execution start for fresh triggers (not resumes)
        if (!startingNodeId && !this.currentLogId) {
            try {
                const log = await FlowExecutionLog.create({
                    flowId: flow.id,
                    userId: this.userId,
                    contactId: contactId || null,
                    status: 'triggered',
                    triggerType: this.triggerType
                });
                this.currentLogId = log.id;
                console.log(`[FLOW RUNNER] Execution logged: ${log.id} (trigger: ${this.triggerType})`);
            } catch (logErr) {
                console.error('[FLOW RUNNER] Failed to log execution:', logErr.message);
            }
        }

        await this.traverseNode(currentNode, flow, contactId);
    }

    async traverseNode(node, flow, contactId) {
        console.log(`[FLOW RUNNER] Executing Node: ${node.type} (${node.id})`);
        this.nodesExecuted++;
        
        // 1. Execute current node logic
        let pauseHere = false;

        switch (node.type) {
            case 'triggerNode':
                // Just the starting point, do nothing.
                break;

            case 'messageNode':
                if (node.data?.text) {
                    const interpolatedText = await this.interpolate(node.data.text, contactId);
                    await this.sendWhatsAppText(interpolatedText);
                }
                break;

            case 'interactiveNode':
                if (node.data?.text && node.data?.buttons?.length > 0) {
                    const interpolatedText = await this.interpolate(node.data.text, contactId);
                    await this.sendWhatsAppButtons(interpolatedText, node.data.buttons);
                    
                    // CRITICAL: We pause the flow here and wait for the user to reply.
                    // We save their state in ContactFlowState
                    pauseHere = true;
                    await this.saveContactState(contactId, flow.id, node.id);
                }
                break;

            case 'listNode': {
                const sections = node.data?.sections || [];
                const rows = sections[0]?.rows || [];
                const title = node.data?.title || 'Select an Option';
                const bodyTextRaw = node.data?.text || title;
                const interpolatedBody = await this.interpolate(bodyTextRaw, contactId);

                if (rows.length > 0) {
                    await this.sendWhatsAppList(interpolatedBody, title, rows);
                    pauseHere = true;
                    await this.saveContactState(contactId, flow.id, node.id);
                }
                break;
            }
                
            case 'delayNode': {
                // For a true MVP, we might skip actual long-running delays and just wait 3 seconds
                const val = node.data?.delayValue || 1;
                const unit = node.data?.delayUnit || 'minutes';
                let ms = val * 1000;
                if (unit === 'minutes') ms *= 60;
                if (unit === 'hours') ms *= 3600;
                if (unit === 'days') ms *= 86400;
                console.log(`[FLOW RUNNER] Pausing for ${ms}ms (Unit: ${unit})`);
                await new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000))); // Max 5s for MVP sync
                break;
            }

            case 'locationNode':
                if (node.data?.text) {
                    await this.sendWhatsAppLocationRequest(node.data.text);
                    // Pause and wait for the user to share their location
                    pauseHere = true;
                    await this.saveContactState(contactId, flow.id, node.id);
                }
                break;

            case 'mediaNode': {
                const mediaType = node.data?.mediaType || 'image';
                const mediaUrl = node.data?.mediaUrl;
                let caption = node.data?.caption || '';
                
                if (mediaUrl) {
                    caption = await this.interpolate(caption, contactId);
                    await this.sendWhatsAppMedia(mediaType, mediaUrl, caption, node.data?.originalName);
                }
                break;
            }

            case 'customFieldNode': {
                const Contact = require('../models/Contact');
                const fieldToUpdate = node.data?.field || 'name';
                let newValue = node.data?.value;

                if (fieldToUpdate && newValue !== undefined) {
                    const state = await ContactFlowState.findOne({ where: { contactId } });
                    // Try to resolve variable interpolation if it matches {{vars.varName}}
                    if (state && state.variables) {
                        newValue = newValue.replace(/\{\{vars\.([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
                            return state.variables[varName] !== undefined ? state.variables[varName] : match;
                        });
                    }

                    const contact = await Contact.findByPk(contactId);
                    if (contact) {
                        if (fieldToUpdate === 'name') contact.name = newValue;
                        if (fieldToUpdate === 'email') contact.email = newValue;
                        await contact.save();
                        console.log(`[FLOW RUNNER] Contact ${contactId} field '${fieldToUpdate}' updated to: ${newValue}`);
                    }
                }
                break;
            }

            case 'actionNode': {
                const actionType = node.data?.actionType || 'add_tag';
                const actionValue = node.data?.action; // The tag name, group name, or variable value
                
                if (actionType === 'add_tag' || actionType === 'remove_tag') {
                    if (actionValue) {
                        const Contact = require('../models/Contact');
                        const Label = require('../models/Label');
                        const contact = await Contact.findByPk(contactId);
                        if (contact) {
                            let currentLabels = Array.isArray(contact.labels) ? [...contact.labels] : [];

                            if (actionType === 'add_tag') {
                                // Look up an existing label ONLY — do NOT create new ones
                                const existingLabel = await Label.findOne({
                                    where: { name: actionValue, userId: this.userId }
                                });
                                const alreadyAdded = currentLabels.some(l => l.name === actionValue);
                                if (!alreadyAdded) {
                                    currentLabels.push(existingLabel
                                        ? { id: existingLabel.id, name: existingLabel.name, color: existingLabel.color || '#6366f1' }
                                        : { id: actionValue, name: actionValue, color: '#6366f1' } // fallback badge if label doesn't exist
                                    );
                                }
                            } else {
                                currentLabels = currentLabels.filter(l => l.name !== actionValue);
                            }

                            contact.labels = currentLabels;
                            await contact.save();
                            console.log(`[FLOW RUNNER] Contact ${contactId} label ${actionType}: "${actionValue}"`);
                        }
                    }
                } else if (actionType === 'add_group' || actionType === 'remove_group') {
                    if (actionValue) {
                        const Contact = require('../models/Contact');
                        const contact = await Contact.findByPk(contactId);
                        if (contact) {
                            let currentTags = Array.isArray(contact.tags) ? [...contact.tags] : [];
                            if (actionType === 'add_group') {
                                if (!currentTags.includes(actionValue)) {
                                    currentTags.push(actionValue);
                                }
                            } else {
                                currentTags = currentTags.filter(t => t !== actionValue);
                            }
                            contact.tags = currentTags;
                            await contact.save();
                            console.log(`[FLOW RUNNER] Contact ${contactId} group ${actionType}: "${actionValue}". Tags: ${JSON.stringify(currentTags)}`);
                        }
                    }
                } else if (actionType === 'set_variable') {
                    const varName = node.data?.variable;
                    if (varName && actionValue !== undefined) {
                        const state = await ContactFlowState.findOne({ where: { contactId } });
                        if (state) {
                            const vars = { ...(state.variables || {}), [varName]: actionValue };
                            state.variables = vars;
                            await state.save();
                            console.log(`[FLOW RUNNER] Set Variable: ${varName} = ${actionValue}`);
                        }
                    }
                }
                break;
            }

            case 'webhookNode': {
                const method = node.data?.method || 'GET';
                let url = node.data?.url;
                let body = node.data?.body;
                let headersStr = node.data?.headers;
                const saveVar = node.data?.variable;
                
                if (url) {
                    const state = await ContactFlowState.findOne({ where: { contactId } });
                    
                    // Interpolate variables
                    const replaceVars = (str) => {
                        if (!str || !state || !state.variables) return str;
                        return str.replace(/\{\{vars\.([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
                            return state.variables[varName] !== undefined ? state.variables[varName] : match;
                        });
                    };

                    url = replaceVars(url);
                    if (body) body = replaceVars(body);

                    let headers = {};
                    if (headersStr) {
                        try {
                            headersStr = replaceVars(headersStr);
                            headers = JSON.parse(headersStr);
                        } catch (e) {
                            console.error('[FLOW RUNNER] Failed to parse webhook headers:', e);
                        }
                    }

                    const fetchOptions = {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        }
                    };

                    if (method !== 'GET' && method !== 'DELETE' && body) {
                        try {
                            // Ensure it's valid JSON before sending, if they typed it manually
                            JSON.parse(body);
                            fetchOptions.body = body;
                        } catch (e) {
                            fetchOptions.body = body; // Send as raw string if not json
                        }
                    }

                    try {
                        console.log(`[FLOW RUNNER] Executing Webhook: ${method} ${url}`);
                        const response = await fetch(url, fetchOptions);
                        const responseData = await response.text();

                        if (saveVar && state) {
                            const vars = { ...(state.variables || {}), [saveVar]: responseData };
                            state.variables = vars;
                            await state.save();
                            console.log(`[FLOW RUNNER] Webhook response saved to variable: ${saveVar}`);
                        }
                    } catch (err) {
                        console.error('[FLOW RUNNER] Webhook failed:', err);
                    }
                }
                break;
            }

            case 'notifyNode': {
                const recipientEmail = node.data?.recipient || 'All Users';
                let subject = node.data?.subject || 'FlowBot Notification';
                let messageStr = node.data?.message || 'A flow node was triggered.';

                const state = await ContactFlowState.findOne({ where: { contactId } });
                
                // Interpolate variables
                const replaceVars = (str) => {
                    if (!str || !state || !state.variables) return str;
                    return str.replace(/\{\{vars\.([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
                        return state.variables[varName] !== undefined ? state.variables[varName] : match;
                    });
                };

                subject = replaceVars(subject);
                messageStr = replaceVars(messageStr);

                const SystemNotification = require('../models/SystemNotification');
                
                try {
                    await SystemNotification.create({
                        recipient: recipientEmail === 'All Users' ? null : recipientEmail,
                        type: 'Info',
                        title: subject,
                        message: messageStr,
                        target: recipientEmail === 'All Users' ? 'All Users' : `User: ${recipientEmail}`,
                        status: 'Sent'
                    });
                    
                    // Emit socket to update UI instantly
                    getIo().to(this.userId).emit('notification_update');
                    console.log(`[FLOW RUNNER] Sent Team Notification: ${subject}`);
                } catch (err) {
                    console.error('[FLOW RUNNER] Failed to create System Notification:', err);
                }
                break;
            }

            case 'inputTextNode':
            case 'inputDateNode':
            case 'inputNumberNode':
                if (node.data?.text) {
                    const interpolatedText = await this.interpolate(node.data.text, contactId);
                    await this.sendWhatsAppText(interpolatedText);
                    pauseHere = true;
                    await this.saveContactState(contactId, flow.id, node.id);
                }
                break;

            case 'paymentNode': {
                const Contact = require('../models/Contact');
                const Settings = require('../models/Settings');
                
                // Fetch user tracking down to Settings to get default currency
                const contact = await Contact.findByPk(contactId);
                let currency = node.data?.currency || 'INR'; // Use block currency or default to INR
                
                if (!node.data?.currency && contact) {
                    const settings = await Settings.findOne({ where: { userId: contact.userId } });
                    if (settings && settings.currency) {
                        currency = settings.currency;
                    }
                }

                const amount = await this.interpolate(node.data?.amount || '0', contactId);
                let paymentLink = await this.interpolate(node.data?.paymentLink || '', contactId);

                if (paymentLink) {
                    const msg = `Please complete your payment of ${amount} ${currency} here:\n${paymentLink}`;
                    await this.sendWhatsAppText(msg);

                    if (node.data?.waitForPayment) {
                        pauseHere = true;
                        // Wait for a webhook callback to resume
                        await this.saveContactState(contactId, flow.id, node.id);
                    }
                }
                break;
            }

            case 'handoffNode': {
                const Contact = require('../models/Contact');
                const Conversation = require('../models/Conversation');
                
                const assignedTo = node.data?.assignedTo; // Can be user ID or 'unassigned'
                const internalNote = node.data?.message;

                // Find the latest conversation for this contact to perform handoff
                let conversation = await Conversation.findOne({ 
                    where: { userId: this.userId, phoneNumber: this.conversation.phoneNumber },
                    order: [['updatedAt', 'DESC']]
                });
                
                if (conversation) {
                    console.log(`[FLOW RUNNER] Handing off conversation ${conversation.id} to human.`);
                    conversation.status = 'open';
                    if (assignedTo && assignedTo !== 'unassigned') {
                        conversation.assignedTo = assignedTo;
                    }
                    await conversation.save();

                    // Notify frontend socket about the assignment/handoff
                    if (internalNote) {
                        const Message = require('../models/Message');
                        await Message.create({
                            conversationId: conversation.id,
                            direction: 'internal',
                            type: 'text',
                            body: `[System Note]: ${internalNote}`,
                            status: 'read',
                            timestamp: new Date()
                        });
                    }
                    
                    const { getIo } = require('../socket');
                    getIo().to(this.userId).emit('conversation_status_update', {
                        id: conversation.id,
                        status: 'open',
                        assignedTo: conversation.assignedTo
                    });
                    getIo().to(this.userId).emit('conversation_updated', conversation);
                }
                
                // Handoff stops the bot flow for this user
                console.log(`[FLOW RUNNER] Handoff activated for contact ${contactId}. Bot pausing indefinitely.`);
                pauseHere = true;
                
                // Clear the state so the bot fully detaches until manually triggered again
                await this.clearContactState(contactId);
                // Mark execution as completed (handoff = successful conclusion)
                await this._finalizeLog('completed');
                break;
            }

            case 'aiNode': {
                const systemPrompt = node.data?.prompt || 'You are a helpful assistant.';
                const enableHandoff = node.data?.enableHandoff;
                const handoffTriggers = (node.data?.handoffTriggers || '').split(',').map(t => t.trim().toLowerCase());
                const handoffMessage = node.data?.handoffMessage || 'Connecting you to an agent...';
                
                // Get user's last message to feed into AI
                const conversation = this.conversation;
                let latestUserMessage = '';

                if (conversation) {
                    const lastMsg = await ChatMessage.findOne({
                        where: { conversationId: conversation.id, direction: 'INBOUND' },
                        order: [['createdAt', 'DESC']]
                    });
                    if (lastMsg) latestUserMessage = lastMsg.body;
                }

                if (enableHandoff && latestUserMessage) {
                    const userTextLower = latestUserMessage.toLowerCase();
                    const triggered = handoffTriggers.some(trigger => trigger && userTextLower.includes(trigger));
                    
                    if (triggered) {
                        console.log(`[FLOW RUNNER] AI Node triggered human handoff for word in: "${latestUserMessage}"`);
                        await this.sendWhatsAppText(handoffMessage);

                        if (conversation) {
                            conversation.status = 'open';
                            const assignedTo = node.data?.assignedTo;
                            if (assignedTo && assignedTo !== 'unassigned') {
                                conversation.assignedTo = assignedTo;
                            }
                            await conversation.save();
                            getIo().to(this.userId).emit('conversation_updated', conversation);
                        }

                        pauseHere = true;
                        await this.clearContactState(contactId);
                        break; // Stop AI node execution here
                    }
                }

                // If not handed off, proceed to generate AI response using Gemini
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const SystemConfig = require('../models/SystemConfig');
                    const sysConfig = await SystemConfig.getConfig();
                    const aiModelName = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';

                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ 
                        model: aiModelName,
                        systemInstruction: systemPrompt
                    });

                    // Format conversation history for Gemini
                    // IMPORTANT: Exclude the latest user message from history because
                    // we send it separately via chat.sendMessage() below
                    let history = [];
                    if (conversation) {
                        const allMsgs = await ChatMessage.findAll({
                            where: { conversationId: conversation.id },
                            order: [['createdAt', 'ASC']]
                        });
                        
                        // Map to Gemini roles ('user' or 'model')
                        // Only include messages with actual content
                        const mapped = allMsgs
                            .filter(m => m.body && m.body.trim())
                            .map(m => ({
                                role: m.direction === 'INBOUND' ? 'user' : 'model',
                                parts: [{ text: m.body }]
                            }));

                        // Remove the last user message (it will be sent via sendMessage)
                        if (mapped.length > 0 && mapped[mapped.length - 1].role === 'user') {
                            mapped.pop();
                        }

                        // Gemini requires history to start with 'user' role
                        // Also requires alternating user/model turns — merge consecutive same-role messages
                        const merged = [];
                        for (const entry of mapped) {
                            if (merged.length > 0 && merged[merged.length - 1].role === entry.role) {
                                // Merge text into previous entry of same role
                                merged[merged.length - 1].parts[0].text += '\n' + entry.parts[0].text;
                            } else {
                                merged.push({ ...entry });
                            }
                        }

                        // If history starts with 'model', remove it (Gemini requires 'user' first)
                        if (merged.length > 0 && merged[0].role === 'model') {
                            merged.shift();
                        }

                        history = merged;
                    }

                    console.log(`[FLOW RUNNER] AI History: ${history.length} turns. Latest message: "${latestUserMessage}"`);

                    // Initialize chat with history
                    const chat = model.startChat({ history });

                    // Send the latest user message to trigger generation
                    const promptText = latestUserMessage || 'Hello';
                    
                    const result = await chat.sendMessage(promptText);
                    const aiResponse = result.response.text();

                    console.log(`[FLOW RUNNER] AI Response: "${aiResponse.substring(0, 100)}..."`);
                    
                    await this.sendWhatsAppText(aiResponse);
                    
                    // Pause the flow and wait for the user's next message
                    pauseHere = true;
                    await this.saveContactState(contactId, flow.id, node.id);

                } catch (err) {
                    console.error('[FLOW RUNNER] AI API error:', err);
                    await this.sendWhatsAppText('I am having trouble connecting to my AI brain. Please try again later.');
                }
                break;
            }

            case 'templateNode': {
                const Template = require('../models/Template');
                const Contact = require('../models/Contact');
                const templateName = node.data?.templateName;
                
                if (templateName) {
                    const template = await Template.findOne({ where: { name: templateName, userId: this.userId } });
                    if (template) {
                        const state = await ContactFlowState.findOne({ where: { contactId } });
                        const contact = await Contact.findByPk(contactId);

                        const replaceVars = (str) => {
                            if (!str) return str;
                            let res = str.replace(/\{\{vars\.([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
                                return state?.variables?.[varName] !== undefined ? state.variables[varName] : match;
                            });
                            res = res.replace(/\{\{name\}\}/gi, contact?.name || 'Customer');
                            return res;
                        };

                        const userParams = {};
                        if (node.data?.templateVars) {
                            for (const [k, v] of Object.entries(node.data.templateVars)) {
                                userParams[k] = replaceVars(v);
                            }
                        }
                        if (node.data?.cardParams) {
                            for (const [k, v] of Object.entries(node.data.cardParams)) {
                                userParams[k] = typeof v === 'string' ? replaceVars(v) : v;
                            }
                        }

                        const variableMatches = template.content.match(/\{\{([^}]+)\}\}/g) || [];
                        const variables = variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''));

                        const bodyParameters = variables.map(v => {
                            return { type: "text", text: userParams[v] || '' };
                        });

                        const payload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: this.conversation.phoneNumber,
                            type: "template",
                            template: {
                                name: template.name,
                                language: { code: template.language }
                            }
                        };

                        if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
                            const carouselCardComponents = template.cards.map((card, cardIndex) => {
                                const cardComps = [];
                                const headerMediaId = userParams[`card_${cardIndex}_headerMediaId`];
                                if (card.headerType && card.headerType !== 'NONE' && headerMediaId) {
                                    const mediaType = card.headerType.toLowerCase();
                                    cardComps.push({
                                        type: 'header',
                                        parameters: [{ type: mediaType, [mediaType]: { id: headerMediaId } }]
                                    });
                                }

                                const cardVars = card.content ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];
                                if (cardVars.length > 0) {
                                    const bodyParams = cardVars.map(varName => {
                                        return { type: 'text', text: userParams[`card_${cardIndex}_var_${varName}`] || '' };
                                    });
                                    cardComps.push({ type: 'body', parameters: bodyParams });
                                }

                                if (card.buttons && card.buttons.length > 0) {
                                    card.buttons.forEach((btn, btnIdx) => {
                                        if (btn.type === 'URL') {
                                            const overrideUrl = userParams[`card_${cardIndex}_btn_${btnIdx}_url`];
                                            const buttonComp = { type: 'button', sub_type: 'url', index: String(btnIdx) };
                                            if (overrideUrl) buttonComp.parameters = [{ type: 'text', text: overrideUrl }];
                                            cardComps.push(buttonComp);
                                        } else if (btn.type === 'QUICK_REPLY') {
                                            cardComps.push({
                                                type: 'button', sub_type: 'quick_reply', index: String(btnIdx),
                                                parameters: [{ type: 'payload', payload: btn.text || 'reply' }]
                                            });
                                        }
                                    });
                                }
                                return { card_index: cardIndex, components: cardComps };
                            });

                            const components = [];
                            if (bodyParameters.length > 0) components.push({ type: 'body', parameters: bodyParameters });
                            components.push({ type: 'carousel', cards: carouselCardComponents });
                            payload.template.components = components;
                        } else {
                            // ── Standard template — build all applicable components ──────────
                            const components = [];

                            // 1. Header component (IMAGE / VIDEO / DOCUMENT)
                            //    cardParams in the flow node may carry a pre-uploaded headerMediaId.
                            const stdHeaderType = (template.headerType || '').toUpperCase();
                            const stdHeaderMediaId = userParams['headerMediaId'];
                            if (stdHeaderMediaId && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(stdHeaderType)) {
                                const mediaType = stdHeaderType.toLowerCase();
                                const mediaParam = { id: stdHeaderMediaId };
                                if (mediaType === 'document') {
                                    mediaParam.filename = userParams['headerFilename'] || template.name || 'document';
                                }
                                components.push({
                                    type: 'header',
                                    parameters: [{ type: mediaType, [mediaType]: mediaParam }]
                                });
                            }

                            // 2. Body component
                            if (bodyParameters.length > 0) {
                                components.push({ type: 'body', parameters: bodyParameters });
                            }

                            // 3. Button components (URL dynamic suffix / QUICK_REPLY payload)
                            if (Array.isArray(template.buttons) && template.buttons.length > 0) {
                                template.buttons.forEach((btn, btnIdx) => {
                                    if (btn.type === 'URL') {
                                        const overrideUrl = userParams[`btn_${btnIdx}_url`];
                                        if (overrideUrl) {
                                            components.push({
                                                type: 'button',
                                                sub_type: 'url',
                                                index: String(btnIdx),
                                                parameters: [{ type: 'text', text: overrideUrl }]
                                            });
                                        }
                                    } else if (btn.type === 'QUICK_REPLY') {
                                        components.push({
                                            type: 'button',
                                            sub_type: 'quick_reply',
                                            index: String(btnIdx),
                                            parameters: [{ type: 'payload', payload: btn.text || 'reply' }]
                                        });
                                    }
                                    // PHONE_NUMBER / COPY_CODE buttons need no runtime parameters
                                });
                            }

                            if (components.length > 0) {
                                payload.template.components = components;
                            }
                        }

                        await this.dispatchToMeta(payload, `[Template Sent] ${template.name}`, 'template');
                    } else {
                        console.error(`[FLOW RUNNER] Template ${templateName} not found.`);
                    }
                }
                break;
            }

            case 'conditionNode': {
                const state = await ContactFlowState.findOne({ where: { contactId } });
                const variableRaw = node.data?.variable || '';
                
                let actualValue = variableRaw;
                if (variableRaw.startsWith('{{vars.') && variableRaw.endsWith('}}')) {
                    const varName = variableRaw.slice(7, -2);
                    actualValue = state?.variables?.[varName] !== undefined ? state.variables[varName] : '';
                }

                let targetValue = node.data?.value || '';
                if (targetValue.startsWith('{{vars.') && targetValue.endsWith('}}')) {
                    const varName = targetValue.slice(7, -2);
                    targetValue = state?.variables?.[varName] !== undefined ? state.variables[varName] : '';
                }

                const operator = node.data?.operator || '==';
                let conditionMet = false;

                const a = String(actualValue).toLowerCase();
                const b = String(targetValue).toLowerCase();
                
                if (operator === '==') conditionMet = a === b;
                if (operator === '!=') conditionMet = a !== b;
                if (operator === 'contains') conditionMet = a.includes(b);
                if (operator === '>') conditionMet = parseFloat(actualValue) > parseFloat(targetValue);
                if (operator === '<') conditionMet = parseFloat(actualValue) < parseFloat(targetValue);

                console.log(`[FLOW RUNNER] Condition Node eval: "${actualValue}" ${operator} "${targetValue}" => ${conditionMet}`);
                node._evalResult = conditionMet;
                break;
            }

            case 'jumpNode': {
                const targetFlowId = node.data?.targetFlowId;
                if (targetFlowId) {
                    const Flow = require('../models/Flow');
                    const targetFlow = await Flow.findByPk(targetFlowId);
                    if (targetFlow && targetFlow.isActive) {
                        console.log(`[FLOW RUNNER] Jumping to Flow: ${targetFlow.name}`);
                        await new Promise(r => setTimeout(r, 500)); 
                        // Start the new flow from its trigger node
                        await this.executeFlow(targetFlow, contactId);
                        // Stop execution of the current flow path
                        return;
                    } else {
                        console.error('[FLOW RUNNER] Target flow not found or inactive for jumpNode');
                    }
                }
                break;
            }
        }

        // 2. If it's not a pausing node, find the next node and recurse
        if (!pauseHere) {
            // Find edges where source is this node
            const outgoingEdges = flow.edges.filter(e => e.source === node.id);
            let nextEdge = null;

            if (node.type === 'splitNode') {
                const ratioA = parseInt(node.data?.splitRatio || 50, 10);
                const roll = Math.random() * 100;
                const selectedPath = roll < ratioA ? 'a' : 'b';
                
                nextEdge = outgoingEdges.find(e => e.sourceHandle === selectedPath);
                console.log(`[FLOW RUNNER] Split node rolled ${roll.toFixed(1)} against ${ratioA}. Path ${selectedPath} selected.`);
            } else if (node.type === 'conditionNode') {
                const selectedPath = node._evalResult ? 'true' : 'false';
                nextEdge = outgoingEdges.find(e => e.sourceHandle === selectedPath);
                console.log(`[FLOW RUNNER] Condition node routing to path: ${selectedPath}`);
            } else {
                // Default: just take the first edge
                nextEdge = outgoingEdges[0];
            }
            
            if (nextEdge) {
                const nextNodeId = nextEdge.target;
                const nextNode = flow.nodes.find(n => n.id === nextNodeId);
                
                if (nextNode) {
                    // Small delay to simulate human typing between blocks
                    await new Promise(r => setTimeout(r, 1000));
                    await this.traverseNode(nextNode, flow, contactId);
                }
            } else {
                console.log('[FLOW RUNNER] End of flow reached.');
                await this.clearContactState(contactId); // Clean up if flow naturally ends
                // Mark execution as completed
                await this._finalizeLog('completed');
            }
        } else {
            console.log('[FLOW RUNNER] Flow paused, waiting for user input.');
        }
    }

    async saveContactState(contactId, flowId, nodeId) {
        const [state, created] = await ContactFlowState.findOrCreate({
            where: { contactId },
            defaults: { flowId, currentNodeId: nodeId }
        });
        
        if (!created) {
            state.flowId = flowId;
            state.currentNodeId = nodeId;
            await state.save();
        }

        if (this.conversation) {
            getIo().to(this.userId).emit('conversation_flow_state', {
                conversationId: this.conversation.id,
                inFlow: true
            });
        }
    }

    async clearContactState(contactId) {
        await ContactFlowState.destroy({ where: { contactId } });

        if (this.conversation) {
            getIo().to(this.userId).emit('conversation_flow_state', {
                conversationId: this.conversation.id,
                inFlow: false
            });
        }
    }

    // --- WhatsApp API Helpers ---
    
    async sendWhatsAppText(text) {
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.conversation.phoneNumber,
            type: "text",
            text: { preview_url: false, body: text }
        };
        await this.dispatchToMeta(payload, text, 'text');
    }

    async sendWhatsAppButtons(bodyText, buttonLabels) {
        const buttons = buttonLabels.map((btn, index) => ({
            type: "reply",
            reply: {
                id: `btn_${index}`,
                title: btn.substring(0, 20) // Meta max length
            }
        }));

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.conversation.phoneNumber,
            type: "interactive",
            interactive: {
                type: "button",
                body: { text: bodyText },
                action: { buttons }
            }
        };
        await this.dispatchToMeta(payload, `[Buttons] ${bodyText}`, 'interactive');
    }

    async sendWhatsAppList(bodyText, title, rows) {
        const items = rows.map((row, index) => ({
            id: `row_${index}`,
            title: String(row).substring(0, 24) // Meta max length
        }));

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.conversation.phoneNumber,
            type: "interactive",
            interactive: {
                type: "list",
                body: { text: bodyText },
                action: {
                    button: title.substring(0, 20), // The button that opens the list
                    sections: [{
                        title: title.substring(0, 24),
                        rows: items
                    }]
                }
            }
        };
        await this.dispatchToMeta(payload, `[List] ${bodyText}`, 'interactive');
    }

    async interpolate(text, contactId) {
        if (!text) return '';
        let res = String(text);
        
        const state = await ContactFlowState.findOne({ where: { contactId } });
        const variables = (state && state.variables) ? state.variables : {};

        // Support {{vars.variable_name}} with flexible whitespace
        res = res.replace(/\{\{\s*vars\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
            const val = variables[varName];
            if (val === undefined || val === null) return ''; // Return empty string for missing vars
            return Array.isArray(val) ? val.join(', ') : String(val);
        });
        
        // Also support direct {{variable_name}} as a shortcut
        res = res.replace(/\{\{\s*(?!(?:vars|name)\s*\}\})([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
            const val = variables[varName];
            if (val === undefined || val === null) return match; // Keep as is if unknown
            return Array.isArray(val) ? val.join(', ') : String(val);
        });

        // Also support {{name}}
        const Contact = require('../models/Contact');
        const contact = await Contact.findByPk(contactId);
        if (contact) {
            res = res.replace(/\{\{\s*name\s*\}\}/gi, contact.name || 'Customer');
        }
        
        return res;
    }

    async sendWhatsAppMedia(mediaType, mediaUrl, caption, filename) {
        let mediaPayload;
        const mediaObj = caption ? { link: mediaUrl, caption } : { link: mediaUrl };

        if (mediaType === 'image') {
            mediaPayload = { type: 'image', image: mediaObj };
        } else if (mediaType === 'video') {
            mediaPayload = { type: 'video', video: mediaObj };
        } else if (mediaType === 'audio') {
            // Audio does not support captions
            mediaPayload = { type: 'audio', audio: { link: mediaUrl } };
        } else { // document
            mediaPayload = { type: 'document', document: { link: mediaUrl, caption, filename: filename || caption || 'file' } };
        }

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.conversation.phoneNumber,
            ...mediaPayload
        };
        await this.dispatchToMeta(payload, `[${mediaType}] ${caption || mediaUrl}`, mediaType);
    }

    async sendWhatsAppLocationRequest(bodyText) {
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.conversation.phoneNumber,
            type: "interactive",
            interactive: {
                type: "location_request_message",
                body: { text: bodyText },
                action: { name: "send_location" }
            }
        };
        await this.dispatchToMeta(payload, `[Location Request] ${bodyText}`, 'interactive');
    }

    async dispatchToMeta(payload, logBody, logType) {
        try {
            const res = await fetch(`https://graph.facebook.com/v21.0/${this.settings.metaPhoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.metaAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const metaRes = await res.json();
            
            if (metaRes.messages && metaRes.messages.length > 0) {
                const outMsg = await ChatMessage.create({
                    conversationId: this.conversation.id,
                    messageId: metaRes.messages[0].id,
                    direction: 'OUTBOUND',
                    type: logType,
                    body: logBody,
                    status: 'sent',
                    timestamp: new Date()
                });
                this.conversation.lastMessage = logBody;
                this.conversation.lastMessageAt = new Date();
                await this.conversation.save();

                getIo().to(this.userId).emit('new_message', { conversation: this.conversation, message: outMsg });
            } else {
                console.error('[FLOW RUNNER] Meta API Error:', metaRes);
            }
        } catch (err) {
            console.error('[FLOW RUNNER] Network dispatch failed:', err);
        }
    }
    /**
     * Finalize the execution log with status and node count.
     * @param {'completed'|'dropped'} status
     */
    async _finalizeLog(status) {
        if (!this.currentLogId) return;
        try {
            await FlowExecutionLog.update(
                {
                    status,
                    nodesExecuted: this.nodesExecuted,
                    completedAt: new Date()
                },
                { where: { id: this.currentLogId } }
            );
            console.log(`[FLOW RUNNER] Execution ${this.currentLogId} finalized as ${status} (${this.nodesExecuted} nodes)`);
        } catch (err) {
            console.error('[FLOW RUNNER] Failed to finalize execution log:', err.message);
        }
    }
}

module.exports = FlowRunner;
