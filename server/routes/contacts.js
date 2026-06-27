const express = require('express');
const router = require('express').Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getUserPlanLimits, checkLimit, getContactCount } = require('../utils/planLimits');
const { applyPrivacyMask } = require('../utils/privacy');
const SystemConfig = require('../models/SystemConfig');
const Group = require('../models/Group');

// GET /api/contacts/google/callback
// Google redirects here after user grants consent. No auth middleware (Google hits this directly).
router.get('/google/callback', async (req, res) => {
    console.log('[GOOGLE OAUTH] ===== CALLBACK HIT =====');
    console.log('[GOOGLE OAUTH] Query params:', JSON.stringify(req.query));
    console.log('[GOOGLE OAUTH] FRONTEND_URL env:', process.env.FRONTEND_URL || '(not set)');
    try {
        const { code, state: userId } = req.query;
        console.log('[GOOGLE OAUTH] Step 1 - code present:', !!code, '| userId from state:', userId);
        if (!code || !userId) {
            console.error('[GOOGLE OAUTH] MISSING code or userId - aborting');
            return res.redirect(`${process.env.FRONTEND_URL || ''}/contacts?import=google&error=missing_params`);
        }

        const config = await SystemConfig.getConfig();
        const g = config.integrations?.google || {};
        console.log('[GOOGLE OAUTH] Step 2 - Config: enabled=', g.enabled, '| hasClientId=', !!g.clientId, '| hasSecret=', !!g.clientSecret, '| redirectUri=', g.redirectUri);

        if (!g.clientId || !g.clientSecret || !g.redirectUri) {
            console.error('[GOOGLE OAUTH] Google OAuth NOT configured in admin panel');
            return res.redirect(`${process.env.FRONTEND_URL || ''}/contacts?import=google&error=not_configured`);
        }

        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2(g.clientId, g.clientSecret, g.redirectUri);
        console.log('[GOOGLE OAUTH] Step 3 - Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log('[GOOGLE OAUTH] Step 3 OK - hasAccessToken:', !!tokens.access_token);

        const people = google.people({ version: 'v1', auth: oauth2Client });
        let allConnections = [];
        let pageToken;
        let pageNum = 0;
        console.log('[GOOGLE OAUTH] Step 4 - Fetching contacts from Google People API...');

        // Paginate through all contacts (Google returns max 1000/page)
        do {
            const result = await people.people.connections.list({
                resourceName: 'people/me',
                pageSize: 1000,
                pageToken,
                personFields: 'names,phoneNumbers,emailAddresses'
            });
            const batch = result.data.connections || [];
            allConnections = allConnections.concat(batch);
            pageToken = result.data.nextPageToken;
            pageNum++;
            console.log(`[GOOGLE OAUTH] Step 4 - Page ${pageNum}: ${batch.length} contacts fetched (running total: ${allConnections.length})`);
        } while (pageToken);
        console.log(`[GOOGLE OAUTH] Step 4 OK - Total raw contacts: ${allConnections.length}`);

        // Normalise to Contact schema
        const contactsToImport = allConnections
            .filter(p => p.phoneNumbers?.length)
            .map(p => ({
                name: p.names?.[0]?.displayName || 'Unknown',
                phone: (p.phoneNumbers[0].value || '').replace(/[\s\-\(\)]/g, ''),
                email: p.emailAddresses?.[0]?.value || '',
                tags: ['Google Contacts'],
                userId
            }))
            .filter(c => c.phone);
        console.log(`[GOOGLE OAUTH] Step 5 - Contacts with valid phone numbers: ${contactsToImport.length}`);

        // Plan limit check
        const limits = await getUserPlanLimits(userId);
        const currentCount = await getContactCount(userId);
        console.log(`[GOOGLE OAUTH] Step 6 - Plan contactLimit: ${limits.contactLimit}, currentCount: ${currentCount}`);
        if (limits.contactLimit !== -1 && currentCount >= limits.contactLimit) {
            return res.redirect(`${process.env.FRONTEND_URL || ''}/contacts?import=google&count=0&error=limit_reached`);
        }

        // Bulk insert in chunks of 1000
        const CHUNK = 1000;
        let totalCreated = 0;
        for (let i = 0; i < contactsToImport.length; i += CHUNK) {
            const chunk = contactsToImport.slice(i, i + CHUNK).map(c => ({
                ...c,
                phone: String(c.phone).replace(/\D/g, '')
            }));
            const created = await Contact.bulkCreate(chunk, { ignoreDuplicates: true, validate: true });
            totalCreated += created.length;
            console.log(`[GOOGLE OAUTH] Step 7 - Chunk ${Math.floor(i/CHUNK)+1} saved: ${created.length} contacts`);
        }

        const finalUrl = `${process.env.FRONTEND_URL || ''}/contacts?import=google&count=${totalCreated}`;
        console.log(`[GOOGLE OAUTH] SUCCESS - Imported ${totalCreated} contacts. Redirecting to: ${finalUrl}`);
        res.redirect(finalUrl);
    } catch (err) {
        console.error('[GOOGLE OAUTH] FATAL ERROR:', err.message);
        console.error('[GOOGLE OAUTH] Stack:', err.stack);
        const errUrl = `${process.env.FRONTEND_URL || ''}/contacts?import=google&error=${encodeURIComponent(err.message)}`;
        console.log('[GOOGLE OAUTH] Redirecting to error URL:', errUrl);
        res.redirect(errUrl);
    }
});

// Apply auth middleware to all other routes
router.use(auth);

// GET unique groups (tags)
router.get('/groups', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            attributes: ['tags'],
            where: { userId: req.user.id },
            raw: true
        });

        // Flatten tags and get unique values
        const allTags = contacts.flatMap(c => c.tags || []);
        const uniqueGroups = [...new Set(allTags)].sort();

        res.json(uniqueGroups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET campaign selection summary (groups with counts + total contacts)
router.get('/campaign-summary', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;

        const totalContacts = await Contact.count({
            where: { userId: ownerId, status: { [Op.or]: [{ [Op.ne]: 'Invalid' }, { [Op.is]: null }] } }
        });

        const contacts = await Contact.findAll({
            attributes: ['tags'],
            where: { userId: ownerId, status: { [Op.or]: [{ [Op.ne]: 'Invalid' }, { [Op.is]: null }] } },
            raw: true
        });

        // 1. Calculate tag counts from contacts
        const allTags = contacts.flatMap(c => c.tags || []);
        const tagCounts = {};
        for (const tag of allTags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }

        // 2. Fetch all defined groups for this user
        const definedGroups = await Group.findAll({
            where: { userId: ownerId },
            raw: true
        });

        // 3. Merge them: defined groups + implicit tags (just in case they have a tag without a Group record)
        const mergedGroupsMap = {};
        
        // Add defined groups first (count defaults to 0)
        for (const g of definedGroups) {
            mergedGroupsMap[g.name] = {
                id: g.name, // The UI currently uses name as id for groups
                name: g.name,
                count: (tagCounts[g.name] || 0).toString(),
                updated: 'Just now'
            };
        }

        // Add any implicit tags that don't have a defined Group record
        for (const tag of Object.keys(tagCounts)) {
            if (!mergedGroupsMap[tag]) {
                mergedGroupsMap[tag] = {
                    id: tag,
                    name: tag,
                    count: tagCounts[tag].toString(),
                    updated: 'Just now'
                };
            }
        }

        const groups = Object.values(mergedGroupsMap).sort((a, b) => a.name.localeCompare(b.name));

        console.log(`[DEBUG] campaign-summary for ${ownerId}: found ${definedGroups.length} definedGroups, returning ${groups.length} groups total.`);

        res.json({
            totalContacts: totalContacts.toString(),
            groups
        });
    } catch (err) {
        console.error('[DEBUG] campaign-summary error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/contacts/field-coverage
// Returns how many contacts in the selected audience are missing a dynamic field.
// Used by the campaign wizard to show "X contacts have no email — will use fallback" warnings.
router.post('/field-coverage', async (req, res) => {
    try {
        const { recipients, field } = req.body;
        const userId = req.user.parentUserId || req.user.id;

        const validFields = ['name', 'first_name', 'phone', 'email', 'tags'];
        if (!validFields.includes(field)) {
            return res.json({ total: 0, missing: 0 });
        }

        // phone is always present — short-circuit
        if (field === 'phone') {
            const total = await Contact.count({
                where: { userId, status: { [Op.or]: [{ [Op.ne]: 'Invalid' }, { [Op.is]: null }] } }
            });
            return res.json({ total, missing: 0 });
        }

        const allContacts = await Contact.findAll({
            where: { userId, status: { [Op.or]: [{ [Op.ne]: 'Invalid' }, { [Op.is]: null }] } },
            attributes: ['name', 'phone', 'email', 'tags'],
            raw: true
        });

        // Filter by selected audience
        let targets = allContacts;
        if (Array.isArray(recipients) && !recipients.includes('all') && recipients.length > 0) {
            targets = allContacts.filter(c => c.tags && c.tags.some(t => recipients.includes(t)));
        }

        // Count missing per field
        let missing = 0;
        if (field === 'email') {
            missing = targets.filter(c => !c.email || !c.email.trim()).length;
        } else if (field === 'name' || field === 'first_name') {
            missing = targets.filter(c => !c.name || !c.name.trim()).length;
        } else if (field === 'tags') {
            missing = targets.filter(c => !c.tags || c.tags.length === 0).length;
        }

        res.json({ total: targets.length, missing });
    } catch (err) {
        console.error('[field-coverage] error:', err);
        res.status(500).json({ error: err.message });
    }
});



// GET contact by phone number
router.get('/by-phone/:phone', async (req, res) => {
    try {
        const cleanPhone = req.params.phone.replace(/\D/g, '');
        const contact = await Contact.findOne({
            where: { phone: cleanPhone, userId: req.user.id }
        });
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json(applyPrivacyMask(contact, req.user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all contacts for logged in user (Paginated)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', status = 'All', group = 'All', label = 'All' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Build Where Clause
        const whereClause = { userId: req.user.id };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status !== 'All') {
            whereClause.status = status;
        }

        if (group !== 'All') {
            whereClause.tags = { [Op.contains]: [group] };
        }

        let includeClause = [];
        // If label is specified and it's an ID, we only fetch contacts with that label
        // We will just filter client side or handle labels dynamically. Since labels is a JSON field in Contact, we can cast it if needed, or query it.
        // Assume label filtering is complex if JSON, but we can roughly search it
        if (label !== 'All') {
            whereClause[Op.and] = whereClause[Op.and] || [];
            whereClause[Op.and].push(
                sequelize.where(
                    sequelize.cast(sequelize.col('labels'), 'VARCHAR'),
                    { [Op.like]: `%"id":"${label}"%` }
                )
            );
        }

        const { count, rows } = await Contact.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limitNum,
            offset: offset
        });

        res.json({
            contacts: applyPrivacyMask(rows, req.user),
            total: count,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IMPORT contacts (Bulk Create)
router.post('/import', async (req, res) => {
    try {
        const { contacts } = req.body; // Expects array of { name, phone, email, tags }

        if (!Array.isArray(contacts)) {
            return res.status(400).json({ error: 'Contacts must be an array' });
        }

        // Check if user is ALREADY at or over the limit
        const limits = await getUserPlanLimits(req.user.id);
        const currentCount = await getContactCount(req.user.id);

        // If they are already at the limit, block everything.
        if (limits.contactLimit !== -1 && currentCount >= limits.contactLimit) {
            return res.status(429).json({
                error: `Contact limit reached (${currentCount}/${limits.contactLimit}). Upgrade your plan to add more contacts.`,
                code: 'CONTACT_LIMIT_REACHED',
                used: currentCount,
                limit: limits.contactLimit
            });
        }

        // If they have space (even 1 slot), allow the ENTIRE batch (Overflow Batch)
        // This is the "Grace Period" requested by the user.
        let allowedContacts = contacts;

        // Add userId to each contact and clean phone
        const contactsWithUser = allowedContacts.map(c => ({
            ...c,
            phone: c.phone ? String(c.phone).replace(/\D/g, '') : '',
            userId: req.user.id
        }));

        // Break into chunks of 1000 to prevent database query limits / timeouts
        const CHUNK_SIZE = 1000;
        let totalCreated = 0;

        for (let i = 0; i < contactsWithUser.length; i += CHUNK_SIZE) {
            const chunk = contactsWithUser.slice(i, i + CHUNK_SIZE);
            const created = await Contact.bulkCreate(chunk, {
                ignoreDuplicates: true,
                validate: true
            });
            totalCreated += created.length;
        }

        const overflow = (currentCount + totalCreated) > limits.contactLimit && limits.contactLimit !== -1;
        const message = overflow
            ? `Imported ${totalCreated} contacts. You have reached your plan's contact limit (${limits.contactLimit}). Some contacts will be locked.`
            : `Successfully imported ${totalCreated} contacts`;

        res.json({ message, count: totalCreated, overflow });

        // Log Activity
        if (created.length > 0) {
            await logActivity(req, 'Contacts Imported', `Imported ${created.length} contacts`);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD contact
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, tags } = req.body;

        // 1. Validations
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and Phone are required' });
        }

        // 2. Check contact limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(req.user.id);
        const currentCount = await getContactCount(req.user.id);

        if (limits.contactLimit !== -1 && currentCount >= limits.contactLimit) {
            return res.status(429).json({
                error: `Contact limit reached (${currentCount}/${limits.contactLimit}). Upgrade your plan to add more contacts.`,
                code: 'CONTACT_LIMIT_REACHED',
                used: currentCount,
                limit: limits.contactLimit
            });
        }

        const cleanPhone = String(phone).replace(/\D/g, '');

        // 3. Check phone overlap for THIS user only
        const existing = await Contact.findOne({
            where: {
                phone: cleanPhone,
                userId: req.user.id
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Contact with this phone number already exists in your list.' });
        }

        // 4. Create
        const newContact = await Contact.create({
            name,
            phone: cleanPhone,
            email,
            tags,
            userId: req.user.id,
            createdById: req.user.realId || req.user.id
        });

        // Log Activity
        await logActivity(req, 'Contact Created', `Added contact ${name} (${cleanPhone})`);

        res.json(newContact);
    } catch (err) {
        console.error("Create Contact Error:", err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            const constraintName = err.parent?.constraint || 'unknown';
            console.log("Violated Constraint:", constraintName);
            return res.status(400).json({ error: `Database error: Unique constraint violated (${constraintName})` });
        }
        res.status(400).json({ error: err.message });
    }
});

// UPDATE contact
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, tags, labels } = req.body;
        const contact = await Contact.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        let cleanPhone = undefined;
        // Check phone overlap if phone is changed
        if (phone) {
            cleanPhone = String(phone).replace(/\D/g, '');
            // Safeguard: If the phone looks like a mask (e.g. starts with ****), skip updating it.
            // This prevents restricted users from accidentally overwriting real numbers with masks.
            if (phone.toString().startsWith('****')) {
                cleanPhone = contact.phone; // Keep original
            } else if (cleanPhone !== contact.phone) {
                const existing = await Contact.findOne({
                    where: { phone: cleanPhone, userId: req.user.id }
                });
                if (existing && existing.id !== contact.id) {
                    return res.status(400).json({ error: 'Another contact with this phone number already exists.' });
                }
            }
        }

        await contact.update({
            name: name !== undefined ? name : contact.name,
            phone: cleanPhone !== undefined ? cleanPhone : contact.phone,
            email: email !== undefined ? email : contact.email,
            tags: tags !== undefined ? tags : contact.tags,
            labels: labels !== undefined ? labels : contact.labels
        });

        // Log Activity
        await logActivity(req, 'Contact Updated', `Updated contact ID: ${contact.id}`);

        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
    try {
        const result = await Contact.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!result) return res.status(404).json({ error: 'Contact not found' });

        // Log Activity
        await logActivity(req, 'Contact Deleted', `Deleted contact ID: ${req.params.id}`);

        res.json({ message: 'Contact deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BULK DELETE
router.post('/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }
        await Contact.destroy({
            where: {
                id: ids,
                userId: req.user.id
            }
        });

        // Log Activity
        await logActivity(req, 'Contacts Bulk Deleted', `Deleted ${ids.length} contacts`);

        res.json({ message: 'Contacts deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BULK TAG (Add to Group)
router.post('/bulk-tag', async (req, res) => {
    try {
        const { ids, tag } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || !tag) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const contacts = await Contact.findAll({
            where: {
                id: ids,
                userId: req.user.id
            }
        });

        const updates = contacts.map(contact => {
            const currentTags = contact.tags || [];
            if (!currentTags.includes(tag)) {
                return contact.update({ tags: [...currentTags, tag] });
            }
            return Promise.resolve();
        });

        await Promise.all(updates);
        await Promise.all(updates);

        // Log Activity
        await logActivity(req, 'Contacts Bulk Tagged', `Added tag "${tag}" to ${ids.length} contacts`);

        res.json({ message: 'Contacts updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Google OAuth Contact Import ──────────────────────────────────

// GET /api/contacts/google/auth-url
// Returns the Google OAuth consent URL. Credentials come from SystemConfig.
router.get('/google/auth-url', async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        const g = config.integrations?.google || {};

        if (!g.enabled || !g.clientId || !g.clientSecret || !g.redirectUri) {
            return res.status(503).json({ error: 'Google OAuth is not configured. Enable it in Admin → System Controls → Integrations.' });
        }

        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2(g.clientId, g.clientSecret, g.redirectUri);

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/contacts.readonly'],
            state: req.user.id // pass userId through so callback knows who to import for
        });

        res.json({ url });
    } catch (err) {
        console.error('Google auth-url error:', err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
