/**
 * DicomStreamTransformer - Real-time DICOM Redaction Proxy
 *
 * This is the "DICOM Firewall" - a streaming transformer that processes
 * DICOM data in-flight, applying both metadata and pixel-level redaction.
 *
 * @module core/dicom/DicomStreamTransformer
 */
import { Transform, TransformCallback, TransformOptions } from 'stream';
/**
 * DICOM tag anonymization rule
 */
export interface DicomAnonymizationRule {
    /** DICOM tag (e.g., 'x00100010' for PatientName) */
    tag: string;
    /** Action: 'REMOVE', 'REPLACE', 'HASH' */
    action: 'REMOVE' | 'REPLACE' | 'HASH';
    /** Replacement value (for REPLACE action) */
    replacement?: string;
    /** VR (Value Representation) for the tag */
    vr?: string;
}
/**
 * Standard HIPAA Safe Harbor tags to anonymize
 */
export declare const HIPAA_DICOM_TAGS: DicomAnonymizationRule[];
/**
 * Configuration for the DICOM transformer
 */
export interface DicomTransformerConfig {
    /** Tags to anonymize */
    anonymizationRules: DicomAnonymizationRule[];
    /** Enable pixel-level redaction (requires ImageRedactor) */
    enablePixelRedaction: boolean;
    /** Salt for hashing operations */
    hashSalt?: string;
    /** Callback for progress updates */
    onProgress?: (progress: {
        bytesProcessed: number;
        stage: string;
    }) => void;
}
/**
 * DicomStreamTransformer - Transform stream for real-time DICOM anonymization
 */
export declare class DicomStreamTransformer extends Transform {
    private config;
    private chunks;
    private bytesProcessed;
    private imageRedactor;
    constructor(config?: Partial<DicomTransformerConfig>, options?: TransformOptions);
    /**
     * Set the image redactor for pixel-level processing
     */
    setImageRedactor(redactor: any): void;
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void;
    _flush(callback: TransformCallback): Promise<void>;
    /**
     * Process a complete DICOM file buffer
     */
    processDicom(inputBuffer: Buffer): Promise<Buffer>;
    /**
     * Zero out bytes in buffer (for REMOVE action)
     */
    private zeroOutBytes;
    /**
     * Replace value in buffer
     */
    private replaceValue;
    /**
     * Get string value from buffer
     */
    private getStringValue;
    /**
     * Hash a value for pseudonymization
     */
    private hashValue;
    /**
     * Process pixel data for visual PHI
     */
    private processPixelData;
}
/**
 * Convenience function to process a DICOM buffer
 */
export declare function anonymizeDicomBuffer(buffer: Buffer, config?: Partial<DicomTransformerConfig>): Promise<Buffer>;
export default DicomStreamTransformer;
//# sourceMappingURL=DicomStreamTransformer.d.ts.map