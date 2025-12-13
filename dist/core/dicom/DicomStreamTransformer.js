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
const dcmjs = __importStar(require("dcmjs"));
const binding_1 = require("../../native/binding");
/**
 * Standard HIPAA Safe Harbor tags to anonymize
 */
exports.HIPAA_DICOM_TAGS = [
    { tag: "x00100010", action: "HASH", vr: "PN" }, // PatientName
    { tag: "x00100020", action: "HASH", vr: "LO" }, // PatientID
    { tag: "x00100030", action: "REMOVE", vr: "DA" }, // PatientBirthDate
    { tag: "x00100032", action: "REMOVE", vr: "TM" }, // PatientBirthTime
    { tag: "x00100040", action: "REMOVE", vr: "CS" }, // PatientSex
    { tag: "x00101040", action: "REMOVE", vr: "LO" }, // PatientAddress
    { tag: "x00102154", action: "REMOVE", vr: "SH" }, // PatientTelephoneNumbers
    { tag: "x00101060", action: "REMOVE", vr: "PN" }, // PatientMotherBirthName
    { tag: "x00101000", action: "REMOVE", vr: "LO" }, // OtherPatientIDs
    { tag: "x00101001", action: "REMOVE", vr: "PN" }, // OtherPatientNames
    { tag: "x00101010", action: "REMOVE", vr: "AS" }, // PatientAge
    { tag: "x00080080", action: "HASH", vr: "LO" }, // InstitutionName
    { tag: "x00080081", action: "REMOVE", vr: "ST" }, // InstitutionAddress
    { tag: "x00080090", action: "HASH", vr: "PN" }, // ReferringPhysicianName
    { tag: "x00081050", action: "HASH", vr: "PN" }, // PerformingPhysicianName
    { tag: "x00081070", action: "HASH", vr: "PN" }, // OperatorsName
    { tag: "x00080050", action: "HASH", vr: "SH" }, // AccessionNumber
    { tag: "x00080020", action: "REMOVE", vr: "DA" }, // StudyDate
    { tag: "x00080030", action: "REMOVE", vr: "TM" }, // StudyTime
    { tag: "x00080021", action: "REMOVE", vr: "DA" }, // SeriesDate
    { tag: "x00080031", action: "REMOVE", vr: "TM" }, // SeriesTime
    { tag: "x00080022", action: "REMOVE", vr: "DA" }, // AcquisitionDate
    { tag: "x00080032", action: "REMOVE", vr: "TM" }, // AcquisitionTime
    { tag: "x00080023", action: "REMOVE", vr: "DA" }, // ContentDate
    { tag: "x00080033", action: "REMOVE", vr: "TM" }, // ContentTime
    { tag: "x00080012", action: "REMOVE", vr: "DA" }, // InstanceCreationDate
    { tag: "x00080013", action: "REMOVE", vr: "TM" }, // InstanceCreationTime
    { tag: "x00200010", action: "HASH", vr: "SH" }, // StudyID
    { tag: "x00080018", action: "HASH", vr: "UI" }, // SOPInstanceUID
    { tag: "x0020000D", action: "HASH", vr: "UI" }, // StudyInstanceUID
    { tag: "x0020000E", action: "HASH", vr: "UI" }, // SeriesInstanceUID
    { tag: "x00100021", action: "REMOVE", vr: "LO" }, // IssuerOfPatientID
    { tag: "x00104000", action: "REMOVE", vr: "LT" }, // PatientComments
    { tag: "x00102160", action: "REMOVE", vr: "SH" }, // EthnicGroup
    { tag: "x00081030", action: "REMOVE", vr: "LO" }, // StudyDescription (may contain PHI)
    { tag: "x0008103E", action: "REMOVE", vr: "LO" }, // SeriesDescription (may contain PHI)
    { tag: "x00181000", action: "HASH", vr: "LO" }, // DeviceSerialNumber
    { tag: "x00181030", action: "REMOVE", vr: "LO" }, // ProtocolName (may contain PHI)
];
const DEFAULT_CONFIG = {
    anonymizationRules: exports.HIPAA_DICOM_TAGS,
    enablePixelRedaction: false, // Disabled by default, requires ImageRedactor
    hashSalt: "vulpes-celare-default-salt",
};
/**
 * DicomStreamTransformer - Transform stream for real-time DICOM anonymization
 */
class DicomStreamTransformer extends stream_1.Transform {
    config;
    chunks = [];
    bytesProcessed = 0;
    imageRedactor = null;
    nativeBindingCache = undefined;
    constructor(config = {}, options) {
        super(options);
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Set the image redactor for pixel-level processing
     */
    setImageRedactor(redactor) {
        this.imageRedactor = redactor;
    }
    getNativeBinding() {
        if (this.nativeBindingCache !== undefined)
            return this.nativeBindingCache;
        try {
            // DICOM hashing does not require ORT; avoid configuring it here.
            this.nativeBindingCache = (0, binding_1.loadNativeBinding)({ configureOrt: false });
        }
        catch {
            this.nativeBindingCache = null;
        }
        return this.nativeBindingCache;
    }
    _transform(chunk, encoding, callback) {
        this.chunks.push(chunk);
        this.bytesProcessed += chunk.length;
        if (this.config.onProgress) {
            this.config.onProgress({
                bytesProcessed: this.bytesProcessed,
                stage: "buffering",
            });
        }
        callback();
    }
    async _flush(callback) {
        try {
            const inputBuffer = Buffer.concat(this.chunks);
            if (this.config.onProgress) {
                this.config.onProgress({
                    bytesProcessed: this.bytesProcessed,
                    stage: "processing",
                });
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
        // Parse and rewrite via dcmjs (avoids in-place truncation and invalid VR outputs).
        const { DicomMessage } = dcmjs.data;
        let parsed;
        try {
            const arrayBuffer = inputBuffer.buffer.slice(inputBuffer.byteOffset, inputBuffer.byteOffset + inputBuffer.byteLength);
            parsed = DicomMessage.readFile(arrayBuffer);
        }
        catch (error) {
            console.error("[DicomStreamTransformer] Failed to parse DICOM:", error);
            throw error;
        }
        const dict = parsed.dict || {};
        const meta = parsed.meta || {};
        const normalizeTag = (tag) => String(tag).replace(/^x/i, "").toUpperCase();
        const getElementByTag = (container, tag) => {
            const normalized = normalizeTag(tag);
            return (container[normalized] ??
                container[normalized.toLowerCase()] ??
                container[tag] ??
                container[tag.toLowerCase()] ??
                container[tag.toUpperCase()]);
        };
        const getFirstStringValue = (element) => {
            const v = element?.Value;
            if (!v || !Array.isArray(v) || v.length === 0)
                return "";
            const first = v[0];
            if (first === null || first === undefined)
                return "";
            if (typeof first === "string" ||
                typeof first === "number" ||
                typeof first === "bigint" ||
                typeof first === "boolean") {
                return String(first);
            }
            // dcmjs PN values are often objects with multiple representations.
            if (typeof element?._rawValue === "string") {
                return element._rawValue;
            }
            if (typeof first === "object") {
                const pn = first;
                const parts = ["Alphabetic", "Ideographic", "Phonetic"].map((key) => typeof pn[key] === "string" ? pn[key] : "");
                while (parts.length > 0 && parts[parts.length - 1] === "")
                    parts.pop();
                if (parts.length > 0)
                    return parts.join("=");
            }
            return String(first);
        };
        const setStringValue = (tag, value) => {
            const element = getElementByTag(dict, tag);
            if (!element)
                return;
            element.Value = value === "" ? [] : [value];
        };
        const hashToken = (value) => {
            const salt = this.config.hashSalt || "vulpes-default-salt";
            const binding = this.getNativeBinding();
            if (binding?.dicomHashToken) {
                try {
                    return binding.dicomHashToken(salt, value);
                }
                catch {
                    // Fall back below.
                }
            }
            const hex = binding?.hmacSha256Hex?.(salt, value) ??
                crypto.createHmac("sha256", salt).update(value).digest("hex");
            return `ANON_${hex.substring(0, 24).toUpperCase()}`;
        };
        const hashUid = (value) => {
            const salt = this.config.hashSalt || "vulpes-default-salt";
            const binding = this.getNativeBinding();
            if (binding?.dicomHashUid) {
                try {
                    return binding.dicomHashUid(salt, value);
                }
                catch {
                    // Fall back below.
                }
            }
            const hex = (binding?.hmacSha256Hex?.(salt, value) ??
                crypto.createHmac("sha256", salt).update(value).digest("hex")).substring(0, 32);
            const u128 = BigInt("0x" + hex);
            return `2.25.${u128.toString(10)}`;
        };
        // Step 1: Anonymize metadata tags in the denaturalized dict.
        for (const rule of this.config.anonymizationRules) {
            const element = getElementByTag(dict, rule.tag);
            if (!element)
                continue;
            const vr = rule.vr || element.vr;
            const originalValue = getFirstStringValue(element);
            if (rule.action === "REMOVE") {
                element.Value = [];
                continue;
            }
            if (rule.action === "REPLACE") {
                const replacement = rule.replacement || "";
                element.Value = replacement === "" ? [] : [replacement];
                continue;
            }
            if (rule.action === "HASH") {
                if (!originalValue) {
                    element.Value = [];
                    continue;
                }
                const replacement = vr === "UI" ? hashUid(originalValue) : hashToken(originalValue);
                element.Value = [replacement];
            }
        }
        // Keep meta header consistent when SOPInstanceUID is updated.
        try {
            const sop = getElementByTag(dict, "00080018")?.Value?.[0];
            const metaSop = getElementByTag(meta, "00020003");
            if (sop && metaSop)
                metaSop.Value = [String(sop)];
        }
        catch {
            // best-effort
        }
        const outputBuffer = Buffer.from(parsed.write());
        // Step 2: Process pixel data if enabled and redactor available (best-effort)
        if (this.config.enablePixelRedaction && this.imageRedactor) {
            try {
                const dataSet = dicomParser.parseDicom(outputBuffer);
                await this.processPixelData(dataSet, outputBuffer);
            }
            catch (error) {
                console.error("[DicomStreamTransformer] Pixel redaction failed:", error);
            }
        }
        if (this.config.onProgress) {
            this.config.onProgress({
                bytesProcessed: this.bytesProcessed,
                stage: "complete",
            });
        }
        return outputBuffer;
    }
    // NOTE: DICOM value rewriting is done via dcmjs re-encoding in processDicom().
    /**
     * Process pixel data for visual PHI
     */
    async processPixelData(dataSet, buffer) {
        if (!this.imageRedactor)
            return;
        // Find PixelData element (7FE0,0010)
        const pixelDataElement = dataSet.elements["x7fe00010"];
        if (!pixelDataElement) {
            console.log("[DicomStreamTransformer] No PixelData found");
            return;
        }
        try {
            // Get image parameters
            const rows = dataSet.uint16("x00280010") || 0;
            const cols = dataSet.uint16("x00280011") || 0;
            const bitsAllocated = dataSet.uint16("x00280100") || 8;
            const samplesPerPixel = dataSet.uint16("x00280002") || 1;
            const photometric = dataSet.string("x00280004") || "MONOCHROME2";
            if (rows === 0 || cols === 0) {
                console.log("[DicomStreamTransformer] Invalid image dimensions");
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
                const sharp = require("sharp");
                const rgbData = Buffer.alloc(rows * cols * 3);
                for (let i = 0; i < rows * cols && i < pixelData.length; i++) {
                    rgbData[i * 3 + 0] = pixelData[i];
                    rgbData[i * 3 + 1] = pixelData[i];
                    rgbData[i * 3 + 2] = pixelData[i];
                }
                const pngBuffer = await sharp(rgbData, {
                    raw: { width: cols, height: rows, channels: 3 },
                })
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
                console.log("[DicomStreamTransformer] Pixel format not supported for redaction:", {
                    bitsAllocated,
                    samplesPerPixel,
                    photometric,
                });
            }
        }
        catch (error) {
            console.error("[DicomStreamTransformer] Pixel processing error:", error);
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