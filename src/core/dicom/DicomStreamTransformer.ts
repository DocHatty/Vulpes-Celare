/**
 * DicomStreamTransformer - Real-time DICOM Redaction Proxy
 *
 * This is the "DICOM Firewall" - a streaming transformer that processes
 * DICOM data in-flight, applying both metadata and pixel-level redaction.
 *
 * @module core/dicom/DicomStreamTransformer
 */

import { Transform, TransformCallback, TransformOptions } from "stream";
import * as dicomParser from "dicom-parser";
import * as crypto from "crypto";
import * as dcmjs from "dcmjs";
import { loadNativeBinding } from "../../native/binding";

/**
 * DICOM tag anonymization rule
 */
export interface DicomAnonymizationRule {
  /** DICOM tag (e.g., 'x00100010' or '00100010' for PatientName) */
  tag: string;
  /** Action: 'REMOVE', 'REPLACE', 'HASH' */
  action: "REMOVE" | "REPLACE" | "HASH";
  /** Replacement value (for REPLACE action) */
  replacement?: string;
  /** VR (Value Representation) for the tag */
  vr?: string;
}

/**
 * Standard HIPAA Safe Harbor tags to anonymize
 */
export const HIPAA_DICOM_TAGS: DicomAnonymizationRule[] = [
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
  onProgress?: (progress: { bytesProcessed: number; stage: string }) => void;
}

const DEFAULT_CONFIG: DicomTransformerConfig = {
  anonymizationRules: HIPAA_DICOM_TAGS,
  enablePixelRedaction: false, // Disabled by default, requires ImageRedactor
  hashSalt: "vulpes-celare-default-salt",
};

/**
 * DicomStreamTransformer - Transform stream for real-time DICOM anonymization
 */
export class DicomStreamTransformer extends Transform {
  private config: DicomTransformerConfig;
  private chunks: Buffer[] = [];
  private bytesProcessed = 0;
  private imageRedactor: any = null;
  private nativeBindingCache:
    | ReturnType<typeof loadNativeBinding>
    | null
    | undefined = undefined;

  constructor(
    config: Partial<DicomTransformerConfig> = {},
    options?: TransformOptions,
  ) {
    super(options);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the image redactor for pixel-level processing
   */
  setImageRedactor(redactor: any): void {
    this.imageRedactor = redactor;
  }

  private getNativeBinding(): ReturnType<typeof loadNativeBinding> | null {
    if (this.nativeBindingCache !== undefined) return this.nativeBindingCache;
    try {
      // DICOM hashing does not require ORT; avoid configuring it here.
      this.nativeBindingCache = loadNativeBinding({ configureOrt: false });
    } catch {
      this.nativeBindingCache = null;
    }
    return this.nativeBindingCache;
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
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

  async _flush(callback: TransformCallback): Promise<void> {
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
    } catch (error) {
      callback(error as Error);
    }
  }

  /**
   * Process a complete DICOM file buffer
   */
  async processDicom(inputBuffer: Buffer): Promise<Buffer> {
    // Parse and rewrite via dcmjs (avoids in-place truncation and invalid VR outputs).
    const { DicomMessage } = (dcmjs as any).data;

    let parsed: any;
    try {
      const arrayBuffer = inputBuffer.buffer.slice(
        inputBuffer.byteOffset,
        inputBuffer.byteOffset + inputBuffer.byteLength,
      );
      parsed = DicomMessage.readFile(arrayBuffer);
    } catch (error) {
      console.error("[DicomStreamTransformer] Failed to parse DICOM:", error);
      throw error;
    }

    const dict: Record<string, any> = parsed.dict || {};
    const meta: Record<string, any> = parsed.meta || {};

    const normalizeTag = (tag: string): string =>
      String(tag).replace(/^x/i, "").toUpperCase();

    const getElementByTag = (container: Record<string, any>, tag: string) => {
      const normalized = normalizeTag(tag);
      return (
        container[normalized] ??
        container[normalized.toLowerCase()] ??
        container[tag] ??
        container[tag.toLowerCase()] ??
        container[tag.toUpperCase()]
      );
    };

    const getFirstStringValue = (element: any): string => {
      const v = element?.Value;
      if (!v || !Array.isArray(v) || v.length === 0) return "";
      const first = v[0];
      if (first === null || first === undefined) return "";

      if (
        typeof first === "string" ||
        typeof first === "number" ||
        typeof first === "bigint" ||
        typeof first === "boolean"
      ) {
        return String(first);
      }

      // dcmjs PN values are often objects with multiple representations.
      if (typeof element?._rawValue === "string") {
        return element._rawValue;
      }

      if (typeof first === "object") {
        const pn = first as Record<string, unknown>;
        const parts = ["Alphabetic", "Ideographic", "Phonetic"].map((key) =>
          typeof pn[key] === "string" ? (pn[key] as string) : "",
        );
        while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
        if (parts.length > 0) return parts.join("=");
      }

      return String(first);
    };

    const setStringValue = (tag: string, value: string) => {
      const element = getElementByTag(dict, tag);
      if (!element) return;
      element.Value = value === "" ? [] : [value];
    };

    const hashToken = (value: string): string => {
      const salt = this.config.hashSalt || "vulpes-default-salt";
      const binding = this.getNativeBinding();
      if (binding?.dicomHashToken) {
        try {
          return binding.dicomHashToken(salt, value);
        } catch {
          // Fall back below.
        }
      }

      const hex =
        binding?.hmacSha256Hex?.(salt, value) ??
        crypto.createHmac("sha256", salt).update(value).digest("hex");
      return `ANON_${hex.substring(0, 24).toUpperCase()}`;
    };

    const hashUid = (value: string): string => {
      const salt = this.config.hashSalt || "vulpes-default-salt";
      const binding = this.getNativeBinding();
      if (binding?.dicomHashUid) {
        try {
          return binding.dicomHashUid(salt, value);
        } catch {
          // Fall back below.
        }
      }
      const hex = (
        binding?.hmacSha256Hex?.(salt, value) ??
        crypto.createHmac("sha256", salt).update(value).digest("hex")
      ).substring(0, 32);
      const u128 = BigInt("0x" + hex);
      return `2.25.${u128.toString(10)}`;
    };

    // Step 1: Anonymize metadata tags in the denaturalized dict.
    for (const rule of this.config.anonymizationRules) {
      const element = getElementByTag(dict, rule.tag);
      if (!element) continue;

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
        const replacement =
          vr === "UI" ? hashUid(originalValue) : hashToken(originalValue);
        element.Value = [replacement];
      }
    }

    // Keep meta header consistent when SOPInstanceUID is updated.
    try {
      const sop = getElementByTag(dict, "00080018")?.Value?.[0];
      const metaSop = getElementByTag(meta, "00020003");
      if (sop && metaSop) metaSop.Value = [String(sop)];
    } catch {
      // best-effort
    }

    const outputBuffer = Buffer.from(parsed.write());

    // Step 2: Process pixel data if enabled and redactor available (best-effort)
    if (this.config.enablePixelRedaction && this.imageRedactor) {
      try {
        const dataSet = dicomParser.parseDicom(outputBuffer);
        await this.processPixelData(dataSet, outputBuffer);
      } catch (error) {
        console.error(
          "[DicomStreamTransformer] Pixel redaction failed:",
          error,
        );
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
  private async processPixelData(
    dataSet: dicomParser.DataSet,
    buffer: Buffer,
  ): Promise<void> {
    if (!this.imageRedactor) return;

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

      if (pixelOffset < 0 || pixelLength <= 0) return;

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

          console.log(
            `[DicomStreamTransformer] Applied ${result.redactions.length} pixel redactions`,
          );
        }
      } else {
        console.log(
          "[DicomStreamTransformer] Pixel format not supported for redaction:",
          {
            bitsAllocated,
            samplesPerPixel,
            photometric,
          },
        );
      }
    } catch (error) {
      console.error("[DicomStreamTransformer] Pixel processing error:", error);
    }
  }
}

/**
 * Convenience function to process a DICOM buffer
 */
export async function anonymizeDicomBuffer(
  buffer: Buffer,
  config?: Partial<DicomTransformerConfig>,
): Promise<Buffer> {
  const transformer = new DicomStreamTransformer(config);
  return transformer.processDicom(buffer);
}

export default DicomStreamTransformer;
