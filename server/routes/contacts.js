const express = require('express');
const router = require('express').Router();
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getUserPlanLimits, checkLimit, getContactCount } = require('../utils/planLimits');

// Apply auth middleware to all routes
router.use(auth);

// GET unique groups (tags)
router.get('/groups', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            attributes: ['tags'],
            where: { userId: req.user.id }
        });

        // Flatten tags and get unique values
        const allTags = contacts.flatMap(c => c.tags || []);
        const uniqueGroups = [...new Set(allTags)].sort();

        res.json(uniqueGroups);
    } catch (err) {
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
        res.json(contact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all contacts for logged in user
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(contacts);
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

        // Note: Sequelize ignoreDuplicates depends on dialect. Postgres uses ON CONFLICT DO NOTHING
        const created = await Contact.bulkCreate(contactsWithUser, {
            ignoreDuplicates: true,
            validate: true
        });

        const overflow = (currentCount + created.length) > limits.contactLimit && limits.contactLimit !== -1;
        const message = overflow
            ? `Imported ${created.length} contacts. You have reached your plan's contact limit (${limits.contactLimit}). Some contacts will be locked.`
            : `Successfully imported ${created.length} contacts`;

        res.json({ message, count: created.length, overflow });

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
            userId: req.user.id
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
            if (cleanPhone !== contact.phone) {
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

module.exports = router;
