require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('./config/database');
const Conversation = require('./models/Conversation');

async function test() {
    const convs = await Conversation.findAll({
        order: [['lastMessageAt', 'DESC']],
        limit: 5
    });
    console.log(convs.map(c => ({
        id: c.id,
        phone: c.phoneNumber,
        lastInbound: c.lastInboundMessageAt,
        lastMessage: c.lastMessageAt
    })));
    process.exit(0);
}

test();
