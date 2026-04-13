const { Op } = require('sequelize');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');

/**
 * Fetch the user's current plan limits from the DB dynamically.
 * Always reads from DB so plan upgrades/downgrades take effect immediately.
 *
 * Returns:
 *   { messageLimit, contactLimit, templateLimit, planName }
 *   -1 means unlimited for any field.
 */
const getUserPlanLimits = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Superadmins are exempt from all plan limits
    if (user.isAdmin) {
        return {
            planName: 'Superadmin',
            messageLimit: -1,
            contactLimit: -1,
            templateLimit: -1,
            quickReplyLimit: -1,
            tagLimit: -1,
            groupLimit: -1
        };
    }

    const planName = user.plan || 'Free';
    const plan = await Plan.findOne({ where: { name: planName } });

    return {
        planName,
        messageLimit: plan?.messageLimit ?? 30,
        contactLimit: plan?.contactLimit ?? 10,
        templateLimit: plan?.templateLimit ?? 2,
        quickReplyLimit: plan?.quickReplyLimit ?? 10,
        tagLimit: plan?.tagLimit ?? 10,
        groupLimit: plan?.groupLimit ?? 5
    };
};

/**
 * Generic limit check helper.
 * @param {number} used   - Current usage count
 * @param {number} limit  - Plan limit (-1 = unlimited)
 * @returns {{ allowed: boolean, used: number, limit: number }}
 */
const checkLimit = (used, limit) => ({
    allowed: limit === -1 || used < limit,
    used,
    limit
});

/**
 * Count outbound messages sent by userId in the current calendar month.
 */
const getMonthlyMessageCount = async (userId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return ChatMessage.count({
        where: {
            direction: 'OUTBOUND',
            createdAt: { [Op.gte]: startOfMonth },
            '$Conversation.userId$': userId
        },
        include: [{ model: Conversation, attributes: [] }]
    });
};

/**
 * Count contacts belonging to a user.
 */
const getContactCount = async (userId) => {
    return Contact.count({ where: { userId } });
};

/**
 * Count templates belonging to a user.
 */
const getTemplateCount = async (userId) => {
    return Template.count({ where: { userId } });
};

/**
 * Count quick replies belonging to a user/workspace.
 */
const getQuickReplyCount = async (userId) => {
    const QuickReply = require('../models/QuickReply');
    return QuickReply.count({ where: { userId } });
};

/**
 * Count tags/labels belonging to a user/workspace.
 */
const getTagCount = async (userId) => {
    const Label = require('../models/Label');
    return Label.count({ where: { userId } });
};

/**
 * Count groups belonging to a user/workspace.
 */
const getGroupCount = async (userId) => {
    const Group = require('../models/Group');
    return Group.count({ where: { userId } });
};

module.exports = {
    getUserPlanLimits,
    checkLimit,
    getMonthlyMessageCount,
    getContactCount,
    getTemplateCount,
    getQuickReplyCount,
    getTagCount,
    getGroupCount
};
