const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MediaFile — Registry for the Media Gallery.
 * Tracks every file uploaded through the WaStore or vCard upload endpoints.
 * Used for quota enforcement, gallery browsing, and selective deletion.
 */
const MediaFile = sequelize.define('MediaFile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Owner of this media file'
    },
    source: {
        type: DataTypes.ENUM('wastore', 'vcard', 'general_media'),
        defaultValue: 'general_media',
        comment: 'Which module created this file'
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Public URL of the file'
    },
    fileKey: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3/R2 object key, or local relative path — used for deletion'
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Original filename (after compression / webp conversion)'
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'MIME type of the stored file'
    },
    sizeBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: 'Final size in bytes (post-compression)'
    },
    folder: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Storage folder/prefix, e.g. wastore-products'
    },
    mediaType: {
        type: DataTypes.ENUM('image', 'video', 'document', 'other'),
        defaultValue: 'other',
        comment: 'Classified type of media for tabbed gallery filtering'
    }
}, {
    timestamps: true,
    tableName: 'MediaFiles'
});

module.exports = MediaFile;
