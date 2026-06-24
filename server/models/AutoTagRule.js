const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AutoTagRule — Defines a rule that automatically applies a tag (Group) to a contact
 * when an incoming WhatsApp message matches the specified pattern.
 *
 * Rule Types:
 *   - 'keyword'   : Exact word/phrase match (case-insensitive) in incoming message body
 *   - 'contains'  : Substring match in incoming message body
 *   - 'regex'     : Advanced regular expression match (use with care)
 *   - 'ctwa'      : Tag applied when contact originates from a Click-to-WhatsApp ad
 *   - 'first_message' : Tag applied only on the very first message from a new contact
 *
 * Actions:
 *   - applyTag    : The name of the Group/Tag to apply to the contact
 *   - expiresInHours : Optional. If set, the tag will auto-expire after N hours.
 *
 * Example Rule:
 *   { type: 'keyword', pattern: 'pricing', applyTag: 'Interested: Pricing' }
 *   → When a user says "pricing", they get tagged "Interested: Pricing"
 */
const AutoTagRule = sequelize.define('AutoTagRule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Owner of this rule (the business account)'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Friendly display name, e.g. "Tag price inquirers"'
    },
    type: {
        type: DataTypes.ENUM('keyword', 'contains', 'regex', 'ctwa', 'first_message'),
        allowNull: false,
        defaultValue: 'keyword'
    },
    pattern: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'The keyword, substring, or regex pattern to match. Null for ctwa/first_message types.'
    },
    applyTag: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The Group name (tag) to apply to the contact when this rule fires'
    },
    expiresInHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'If set, the applied tag will auto-expire after this many hours. Null = permanent.'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Enable or disable this rule without deleting it'
    },
    matchCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'How many times this rule has fired (analytics)'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['userId', 'isActive'] }
    ]
});

module.exports = AutoTagRule;
