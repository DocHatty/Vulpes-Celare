"use strict";
/**
 * DicomStreamTransformer - Real-time DICOM Redaction Proxy
 *
 * This is the "DICOM Firewall" - a streaming transformer that processes
 * DICOM data in-flight, applying both metadata and pixel-level redaction.
 *
 * @module core/dicom/DicomStreamTransformer
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DicomStreamTransformer = exports.HIPAA_DICOM_TAGS = void 0;
exports.anonymizeDicomBuffer = anonymizeDicomBuffer;
const stream_1 = require("stream");
const dicomParser = __importStar(require("dicom-parser"));
const crypto = __importStar(require("crypto"));
/**
 * Standard HIPAA Safe Harbor tags to anonymize
 */
exports.HIPAA_DICOM_TAGS = [
    { tag: 'x00100010', action: 'HASH', vr: 'PN' }, // PatientName
    { tag: 'x00100020', action: 'HASH', vr: 'LO' }, // PatientID
    { tag: 'x00100030', action: 'REMOVE', vr: 'DA' }, // PatientBirthDate
    { tag: 'x00100032', action: 'REMOVE', vr: 'TM' }, // PatientBirthTime
    { tag: 'x00100040', action: 'REMOVE', vr: 'CS' }, // PatientSex
    { tag: 'x00101000', action: 'REMOVE', vr: 'LO' }, // OtherPatientIDs
    { tag: 'x00101001', action: 'REMOVE', vr: 'PN' }, // OtherPatientNames
    { tag: 'x00080080', action: 'HASH', vr: 'LO' }, // InstitutionName
    { tag: 'x00080081', action: 'REMOVE', vr: 'ST' }, // InstitutionAddress
    { tag: 'x00080090', action: 'HASH', vr: 'PN' }, // ReferringPhysicianName
    { tag: 'x00081050', action: 'HASH', vr: 'PN' }, // PerformingPhysicianName
    { tag: 'x00081070', action: 'HASH', vr: 'PN' }, // OperatorsName
    { tag: 'x00080050', action: 'HASH', vr: 'SH' }, // AccessionNumber
    { tag: 'x00200010', action: 'HASH', vr: 'SH' }, // StudyID
    { tag: 'x00080018', action: 'HASH', vr: 'UI' }, // SOPInstanceUID
    { tag: 'x0020000D', action: 'HASH', vr: 'UI' }, // StudyInstanceUID
    { tag: 'x0020000E', action: 'HASH', vr: 'UI' }, // SeriesInstanceUID
    { tag: 'x00100021', action: 'REMOVE', vr: 'LO' }, // IssuerOfPatientID
    { tag: 'x00104000', action: 'REMOVE', vr: 'LT' }, // PatientComments
    { tag: 'x00102160', action: 'REMOVE', vr: 'SH' }, // EthnicGroup
    { tag: 'x00081030', action: 'REMOVE', vr: 'LO' }, // StudyDescription (may contain PHI)
];
const DEFAULT_CONFIG = {
    anonymizationRules: exports.HIPAA_DICOM_TAGS,
    enablePixelRedaction: false, // Disabled by default, requires ImageRedactor
    hashSalt: 'vulpes-celare-default-salt',
};
/**
 * DicomStreamTransformer - Transform stream for real-time DICOM anonymization
 */
class DicomStreamTransformer extends stream_1.Transform {
    constructor(config = {}, options) {
        super(options);
        this.chunks = [];
        this.bytesProcessed = 0;
        this.imageRedactor = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Set the image redactor for pixel-level processing
     */
    setImageRedactor(redactor) {
        this.imageRedactor = redactor;
    }
    _transform(chunk, encoding, callback) {
        this.chunks.push(chunk);
        this.bytesProcessed += chunk.length;
        if (this.config.onProgress) {
            this.config.onProgress({ bytesProcessed: this.bytesProcessed, stage: 'buffering' });
        }
        callback();
    }
    async _flush(callback) {
        try {
            const inputBuffer = Buffer.concat(this.chunks);
            if (this.config.onProgress) {
                this.config.onProgress({ bytesProcessed: this.bytesProcessed, stage: 'processing' });
            }
            const outputBuffer = await this.processDicom(inputBuffer);
            this.push(outputBuffer);
            callback();
        }
        catch (error) {
            callback(error);
        }
    }
    /**
     * Process a complete DICOM file buffer
     */
    async processDicom(inputBuffer) {
        // Parse DICOM
        let dataSet;
        try {
            dataSet = dicomParser.parseDicom(inputBuffer);
        }
        catch (error) {
            console.error('[DicomStreamTransformer] Failed to parse DICOM:', error);
            throw error;
        }
        // Create a mutable copy of the buffer
        const outputBuffer = Buffer.from(inputBuffer);
        // Step 1: Anonymize metadata tags
        for (const rule of this.config.anonymizationRules) {
            const element = dataSet.elements[rule.tag];
            if (!element)
                continue;
            const offset = element.dataOffset;
            const length = element.length;
            if (length <= 0 || offset < 0)
                continue;
            switch (rule.action) {
                case 'REMOVE':
                    // Zero out the value
                    this.zeroOutBytes(outputBuffer, offset, length);
                    break;
                case 'REPLACE':
                    const replacement = rule.replacement || '';
                    this.replaceValue(outputBuffer, offset, length, replacement, rule.vr);
                    break;
                case 'HASH':
                    const originalValue = this.getStringValue(inputBuffer, offset, length);
                    if (originalValue) {
                        const hashedValue = this.hashValue(originalValue);
                        this.replaceValue(outputBuffer, offset, length, hashedValue, rule.vr);
                    }
                    break;
            }
        }
        // Step 2: Process pixel data if enabled and redactor available
        if (this.config.enablePixelRedaction && this.imageRedactor) {
            await this.processPixelData(dataSet, outputBuffer);
        }
        if (this.config.onProgress) {
            this.config.onProgress({ bytesProcessed: this.bytesProcessed, stage: 'complete' });
        }
        return outputBuffer;
    }
    /**
     * Zero out bytes in buffer (for REMOVE action)
     */
    zeroOutBytes(buffer, offset, length) {
        for (let i = 0; i < length && offset + i < buffer.length; i++) {
            buffer[offset + i] = 0x20; // Space character (valid for most VRs)
        }
    }
    /**
     * Replace value in buffer
     */
    replaceValue(buffer, offset, length, value, vr) {
        // Pad or truncate value to fit the original length
        let paddedValue = value;
        const padChar = (vr === 'UI') ? '\0' : ' '; // UI uses null padding
        if (paddedValue.length < length) {
            paddedValue = paddedValue.padEnd(length, padChar);
        }
        else if (paddedValue.length > length) {
            paddedValue = paddedValue.substring(0, length);
        }
        // Write to buffer
        for (let i = 0; i < length && offset + i < buffer.length; i++) {
            buffer[offset + i] = paddedValue.charCodeAt(i);
        }
    }
    /**
     * Get string value from buffer
     */
    getStringValue(buffer, offset, length) {
        if (offset < 0 || offset + length > buffer.length)
            return null;
        return buffer.toString('utf8', offset, offset + length).trim();
    }
    /**
     * Hash a value for pseudonymization
     */
    hashValue(value) {
        const salt = this.config.hashSalt || 'vulpes-default-salt';
        const hash = crypto.createHmac('sha256', salt)
            .update(value)
            .digest('hex')
            .substring(0, 16)
            .toUpperCase();
        return `ANON${hash}`;
    }
    /**
     * Process pixel data for visual PHI
     */
    async processPixelData(dataSet, buffer) {
        if (!this.imageRedactor)
            return;
        // Find PixelData element (7FE0,0010)
        const pixelDataElement = dataSet.elements['x7fe00010'];
        if (!pixelDataElement) {
            console.log('[DicomStreamTransformer] No PixelData found');
            return;
        }
        try {
            // Get image parameters
            const rows = dataSet.uint16('x00280010') || 0;
            const cols = dataSet.uint16('x00280011') || 0;
            const bitsAllocated = dataSet.uint16('x00280100') || 8;
            const samplesPerPixel = dataSet.uint16('x00280002') || 1;
            const photometric = dataSet.string('x00280004') || 'MONOCHROME2';
            if (rows === 0 || cols === 0) {
                console.log('[DicomStreamTransformer] Invalid image dimensions');
                return;
            }
            // Extract pixel data
            const pixelOffset = pixelDataElement.dataOffset;
            const pixelLength = pixelDataElement.length;
            if (pixelOffset < 0 || pixelLength <= 0)
                return;
            // Convert to image buffer (simplified - works for uncompressed 8-bit)
            if (bitsAllocated === 8 && samplesPerPixel === 1) {
                const pixelData = buffer.slice(pixelOffset, pixelOffset + pixelLength);
                // Convert grayscale to RGB PNG for processing
                const sharp = require('sharp');
                const rgbData = Buffer.alloc(rows * cols * 3);
                for (let i = 0; i < rows * cols && i < pixelData.length; i++) {
                    rgbData[i * 3 + 0] = pixelData[i];
                    rgbData[i * 3 + 1] = pixelData[i];
                    rgbData[i * 3 + 2] = pixelData[i];
                }
                const pngBuffer = await sharp(rgbData, { raw: { width: cols, height: rows, channels: 3 } })
                    .png()
                    .toBuffer();
                // Run through image redactor
                await this.imageRedactor.initialize();
                const result = await this.imageRedactor.redact(pngBuffer);
                // Convert back to grayscale and write to pixel data
                if (result.redactions.length > 0) {
                    const { data } = await sharp(result.buffer)
                        .grayscale()
                        .raw()
                        .toBuffer({ resolveWithObject: true });
                    // Write redacted pixels back
                    for (let i = 0; i < rows * cols && i < data.length; i++) {
                        buffer[pixelOffset + i] = data[i];
                    }
                    console.log(`[DicomStreamTransformer] Applied ${result.redactions.length} pixel redactions`);
                }
            }
            else {
                console.log('[DicomStreamTransformer] Pixel format not supported for redaction:', {
                    bitsAllocated,
                    samplesPerPixel,
                    photometric
                });
            }
        }
        catch (error) {
            console.error('[DicomStreamTransformer] Pixel processing error:', error);
        }
    }
}
exports.DicomStreamTransformer = DicomStreamTransformer;
/**
 * Convenience function to process a DICOM buffer
 */
async function anonymizeDicomBuffer(buffer, config) {
    const transformer = new DicomStreamTransformer(config);
    return transformer.processDicom(buffer);
}
exports.default = DicomStreamTransformer;
//# sourceMappingURL=DicomStreamTransformer.js.map