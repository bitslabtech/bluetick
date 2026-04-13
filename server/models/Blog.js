const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // Assuming blogs are linked to Admin users

const Blog = sequelize.define('Blog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    content: {
        type: DataTypes.TEXT('long'), // For raw HTML from react-quill
        allowNull: true
    },
    excerpt: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaDescription: {
        type: DataTypes.STRING,
        allowNull: true
    },
    keywords: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
        defaultValue: []
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    authorId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'blogs',
    timestamps: true
});

Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

module.exports = Blog;
