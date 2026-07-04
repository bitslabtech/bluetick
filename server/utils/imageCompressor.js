/**
 * Image Compressor Utility
 * 
 * Compresses JPEG, PNG, and WebP images using Sharp before they are saved
 * to local disk or S3. Reduces file sizes by 60-80% with negligible quality loss.
 * 
 * Safety:
 * - If Sharp is not installed, all images pass through uncompressed
 * - If compression fails, the original buffer is returned
 * - If the compressed output is LARGER than the original, the original is kept
 * - Non-image files (PDFs, videos, ZIPs) are never touched
 * - GIF/SVG files are excluded (Sharp can break animated GIFs)
 */

let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('[IMAGE COMPRESSOR] Sharp is not installed. Images will be saved without compression.');
    console.warn('[IMAGE COMPRESSOR] Install with: npm install sharp');
}

// Only these MIME types will be compressed
const COMPRESSIBLE_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

// Quality & resize settings per use case
const DEFAULT_CONFIG = {
    maxWidth: 2000,          // Max width in pixels (height auto-scales)
    maxHeight: 2000,         // Max height in pixels (width auto-scales)
    jpegQuality: 80,         // 80% = visually identical, ~60-70% smaller
    pngCompressionLevel: 8,  // 0-9, higher = more compression (lossless)
    webpQuality: 80,         // 80% quality for WebP
    withoutEnlargement: true, // Never upscale small images
    convertToWebp: false     // Force conversion to WebP if true
};

/**
 * Compresses an image buffer.
 * 
 * @param {Buffer} buffer - The raw image file buffer
 * @param {string} mimetype - The MIME type of the image (e.g. 'image/jpeg')
 * @param {Object} [config] - Optional override config
 * @returns {Object} { buffer, compressed, originalSize, compressedSize }
 */
async function compressImage(buffer, mimetype, config = {}) {
    // If Sharp isn't available, pass through
    if (!sharp) {
        return { buffer, compressed: false };
    }

    // Don't attempt to compress non-compressible types
    if (!buffer || !COMPRESSIBLE_MIMES.has(mimetype)) {
        return { buffer, compressed: false };
    }

    const opts = { ...DEFAULT_CONFIG, ...config };
    const originalSize = buffer.length;

    try {
        // Create the Sharp pipeline
        let pipeline = sharp(buffer, { failOn: 'none' }) // failOn: 'none' = don't crash on slightly corrupt images
            .rotate(); // Auto-rotate based on EXIF orientation

        // Resize if larger than max dimensions (maintains aspect ratio)
        pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
            fit: 'inside',
            withoutEnlargement: opts.withoutEnlargement
        });

        // Apply format-specific compression
        let outputBuffer;
        let finalFormat = mimetype.split('/')[1]; // e.g. 'jpeg', 'png', 'webp'

        if (opts.convertToWebp) {
            // Store as LOSSLESS WebP — this is the master copy on CDN.
            // imgProxy will re-encode to lossy WebP (q=92) at serve time,
            // so this must be lossless to avoid double lossy compression.
            // Lossless WebP is ~26% smaller than PNG and perfectly lossless.
            outputBuffer = await pipeline
                .webp({ lossless: true })
                .toBuffer();
            finalFormat = 'webp';
        } else if (mimetype === 'image/jpeg') {
            outputBuffer = await pipeline
                .jpeg({ quality: opts.jpegQuality, mozjpeg: true })
                .toBuffer();
        } else if (mimetype === 'image/png') {
            outputBuffer = await pipeline
                .png({ compressionLevel: opts.pngCompressionLevel, adaptiveFiltering: true })
                .toBuffer();
        } else if (mimetype === 'image/webp') {
            outputBuffer = await pipeline
                .webp({ quality: opts.webpQuality })
                .toBuffer();
        } else {
            // Should not reach here due to COMPRESSIBLE_MIMES check, but just in case
            return { buffer, compressed: false };
        }

        // Only use compressed version if it's actually smaller, OR if we explicitly converted to WebP
        if (outputBuffer.length < originalSize || opts.convertToWebp) {
            return {
                buffer: outputBuffer,
                compressed: true,
                originalSize,
                compressedSize: outputBuffer.length,
                format: finalFormat
            };
        }

        // Compressed was bigger (already-optimized image) — return original
        return { buffer, compressed: false, originalSize, compressedSize: outputBuffer.length, format: mimetype.split('/')[1] };

    } catch (err) {
        // If anything goes wrong, return the original unmodified buffer
        console.warn('[IMAGE COMPRESSOR] Compression failed, using original:', err.message);
        return { buffer, compressed: false };
    }
}

/**
 * Check if a given MIME type is a compressible image.
 * @param {string} mimetype
 * @returns {boolean}
 */
function isCompressibleImage(mimetype) {
    return COMPRESSIBLE_MIMES.has(mimetype);
}

module.exports = { compressImage, isCompressibleImage, COMPRESSIBLE_MIMES, DEFAULT_CONFIG };
