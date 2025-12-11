/**
 * OCRService - High-Performance Text Extraction using PaddleOCR via ONNX Runtime
 * 
 * This service provides state-of-the-art OCR capabilities using PaddleOCR models
 * exported to ONNX format. Runs entirely locally with no cloud dependencies.
 * 
 * Architecture:
 * - Detection Model: Identifies text regions (outputs probability map)
 * - Recognition Model: Converts text regions to strings (CTC decoder)
 * - ONNX Runtime for native C++ performance
 * 
 * @module core/images/OCRService
 */

import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { getLogger, withErrorBoundary, withTimeout } from './logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Bounding box for detected text regions
 */
export interface TextBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Result of OCR detection on an image
 */
export interface OCRResult {
    /** Extracted text content */
    text: string;
    /** Bounding box coordinates */
    box: TextBox;
    /** Confidence score (0-1) */
    confidence: number;
    /** Character-level positions if available */
    charPositions?: { char: string; x: number; y: number }[];
}

/**
 * Configuration options for OCRService
 */
export interface OCRServiceConfig {
    /** Path to the detection model (.onnx) */
    detectionModelPath?: string;
    /** Path to the recognition model (.onnx) */
    recognitionModelPath?: string;
    /** Path to character dictionary */
    dictionaryPath?: string;
    /** Minimum confidence threshold for results (0-1) */
    confidenceThreshold?: number;
    /** Whether to use GPU acceleration if available */
    useGPU?: boolean;
    /** Maximum image dimension (larger images will be scaled) */
    maxImageDimension?: number;
    /** Detection threshold for text probability map */
    detectionThreshold?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Timeout for inference operations (ms) */
    inferenceTimeoutMs?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_NAME = 'OCRService';

const DEFAULT_CONFIG: Required<OCRServiceConfig> = {
    detectionModelPath: path.join(__dirname, '../../../models/ocr/det.onnx'),
    recognitionModelPath: path.join(__dirname, '../../../models/ocr/rec.onnx'),
    dictionaryPath: path.join(__dirname, '../../../models/ocr/dict.txt'),
    confidenceThreshold: 0.5,
    useGPU: false,
    maxImageDimension: 960,
    detectionThreshold: 0.3,
    debug: false,
    inferenceTimeoutMs: 30000,
};

// PaddleOCR default character set
const DEFAULT_CHARSET = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * OCRService - Extracts text and bounding boxes from images
 */
export class OCRService {
    private config: Required<OCRServiceConfig>;
    private detectionSession: ort.InferenceSession | null = null;
    private recognitionSession: ort.InferenceSession | null = null;
    private initialized = false;
    private initializing = false;  // Prevents race conditions
    private charset: string[] = [];
    private initError: Error | null = null;
    private logger = getLogger();

    constructor(config: OCRServiceConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger.debug(SERVICE_NAME, 'constructor', 'OCRService created', {
            detectionModel: this.config.detectionModelPath,
            recognitionModel: this.config.recognitionModelPath,
        });
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Initialize the ONNX models. Must be called before extractText().
     * Safe to call multiple times - will only initialize once.
     */
    async initialize(): Promise<void> {
        // Already initialized
        if (this.initialized) return;

        // Already initializing (prevent race conditions)
        if (this.initializing) {
            // Wait for initialization to complete
            while (this.initializing) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (this.initError) throw this.initError;
            return;
        }

        this.initializing = true;
        const complete = this.logger.startOperation(SERVICE_NAME, 'initialize');

        try {
            await this.loadCharacterDictionary();
            await this.loadModels();
            this.initialized = true;
            complete(true);
            this.logger.info(SERVICE_NAME, 'initialize', 'OCRService initialized successfully', {
                detectionLoaded: this.detectionSession !== null,
                recognitionLoaded: this.recognitionSession !== null,
                charsetSize: this.charset.length,
            });
        } catch (error) {
            this.initError = error instanceof Error ? error : new Error(String(error));
            complete(false, this.initError.message);
            this.logger.error(SERVICE_NAME, 'initialize', 'Initialization failed', this.initError);
            throw this.initError;
        } finally {
            this.initializing = false;
        }
    }

    /**
     * Extract text and bounding boxes from an image buffer
     */
    async extractText(imageBuffer: Buffer, width?: number, height?: number): Promise<OCRResult[]> {
        // Validate input
        if (!imageBuffer || imageBuffer.length === 0) {
            this.logger.warn(SERVICE_NAME, 'extractText', 'Empty image buffer provided');
            return [];
        }

        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.detectionSession || !this.recognitionSession) {
            this.logger.warn(SERVICE_NAME, 'extractText', 'Models not loaded, returning empty results');
            return [];
        }

        const complete = this.logger.startOperation(SERVICE_NAME, 'extractText');

        try {
            // Get image metadata
            const metadata = await this.getImageMetadata(imageBuffer);
            const imgWidth = width || metadata.width || 640;
            const imgHeight = height || metadata.height || 480;

            this.logger.debug(SERVICE_NAME, 'extractText', 'Processing image', {
                width: imgWidth,
                height: imgHeight,
                bufferSize: imageBuffer.length,
            });

            // Step 1: Detect text regions with timeout
            const boxes = await withTimeout(
                SERVICE_NAME,
                'detectTextRegions',
                () => this.detectTextRegions(imageBuffer, imgWidth, imgHeight),
                this.config.inferenceTimeoutMs
            );

            this.logger.debug(SERVICE_NAME, 'extractText', `Detected ${boxes.length} text regions`);

            // Step 2: Recognize text in each region
            const results: OCRResult[] = [];
            for (let i = 0; i < boxes.length; i++) {
                const box = boxes[i];

                try {
                    const result = await this.recognizeText(imageBuffer, box);

                    if (result.confidence >= this.config.confidenceThreshold && result.text.trim().length > 0) {
                        results.push(result);
                    }
                } catch (error) {
                    this.logger.warn(SERVICE_NAME, 'extractText', `Failed to recognize region ${i}`, {
                        box,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    // Continue with other boxes
                }
            }

            complete(true);
            this.logger.info(SERVICE_NAME, 'extractText', `Extracted ${results.length} text segments`, {
                totalBoxes: boxes.length,
                recognizedSegments: results.length,
            });

            return results;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, 'extractText', 'Text extraction failed', err);
            return [];
        }
    }

    /**
     * Check if models are loaded
     */
    isModelLoaded(): boolean {
        return this.detectionSession !== null && this.recognitionSession !== null;
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.initialized && this.isModelLoaded();
    }

    /**
     * Get service status for debugging
     */
    getStatus(): {
        initialized: boolean;
        modelsLoaded: boolean;
        charsetSize: number;
        config: Omit<Required<OCRServiceConfig>, 'detectionModelPath' | 'recognitionModelPath' | 'dictionaryPath'>;
    } {
        return {
            initialized: this.initialized,
            modelsLoaded: this.isModelLoaded(),
            charsetSize: this.charset.length,
            config: {
                confidenceThreshold: this.config.confidenceThreshold,
                useGPU: this.config.useGPU,
                maxImageDimension: this.config.maxImageDimension,
                detectionThreshold: this.config.detectionThreshold,
                debug: this.config.debug,
                inferenceTimeoutMs: this.config.inferenceTimeoutMs,
            },
        };
    }

    /**
     * Release ONNX sessions and free memory
     */
    async dispose(): Promise<void> {
        const complete = this.logger.startOperation(SERVICE_NAME, 'dispose');

        try {
            if (this.detectionSession) {
                await this.detectionSession.release();
                this.detectionSession = null;
            }
            if (this.recognitionSession) {
                await this.recognitionSession.release();
                this.recognitionSession = null;
            }
            this.initialized = false;
            this.initError = null;
            complete(true);
            this.logger.info(SERVICE_NAME, 'dispose', 'OCRService disposed');
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, 'dispose', 'Disposal failed', err);
        }
    }

    // ========================================================================
    // PRIVATE METHODS - INITIALIZATION
    // ========================================================================

    private async loadCharacterDictionary(): Promise<void> {
        if (fs.existsSync(this.config.dictionaryPath)) {
            const dictContent = fs.readFileSync(this.config.dictionaryPath, 'utf-8');
            this.charset = ['<blank>', ...dictContent.split('\n').filter(c => c.length > 0)];
            this.logger.debug(SERVICE_NAME, 'loadCharacterDictionary', 'Loaded dictionary', {
                path: this.config.dictionaryPath,
                characters: this.charset.length,
            });
        } else {
            this.charset = ['<blank>', ...DEFAULT_CHARSET.split('')];
            this.logger.debug(SERVICE_NAME, 'loadCharacterDictionary', 'Using default charset', {
                characters: this.charset.length,
            });
        }
    }

    private async loadModels(): Promise<void> {
        const sessionOptions: ort.InferenceSession.SessionOptions = {
            executionProviders: this.config.useGPU ? ['cuda', 'cpu'] : ['cpu'],
        };

        // Load detection model
        if (fs.existsSync(this.config.detectionModelPath)) {
            try {
                this.detectionSession = await ort.InferenceSession.create(
                    this.config.detectionModelPath,
                    sessionOptions
                );
                this.logger.info(SERVICE_NAME, 'loadModels', 'Detection model loaded', {
                    path: this.config.detectionModelPath,
                    inputNames: this.detectionSession.inputNames,
                    outputNames: this.detectionSession.outputNames,
                });
            } catch (error) {
                this.logger.error(SERVICE_NAME, 'loadModels', 'Failed to load detection model',
                    error instanceof Error ? error : new Error(String(error)));
            }
        } else {
            this.logger.warn(SERVICE_NAME, 'loadModels', 'Detection model not found', {
                path: this.config.detectionModelPath,
            });
        }

        // Load recognition model
        if (fs.existsSync(this.config.recognitionModelPath)) {
            try {
                this.recognitionSession = await ort.InferenceSession.create(
                    this.config.recognitionModelPath,
                    sessionOptions
                );
                this.logger.info(SERVICE_NAME, 'loadModels', 'Recognition model loaded', {
                    path: this.config.recognitionModelPath,
                    inputNames: this.recognitionSession.inputNames,
                    outputNames: this.recognitionSession.outputNames,
                });
            } catch (error) {
                this.logger.error(SERVICE_NAME, 'loadModels', 'Failed to load recognition model',
                    error instanceof Error ? error : new Error(String(error)));
            }
        } else {
            this.logger.warn(SERVICE_NAME, 'loadModels', 'Recognition model not found', {
                path: this.config.recognitionModelPath,
            });
        }
    }

    // ========================================================================
    // PRIVATE METHODS - IMAGE PROCESSING
    // ========================================================================

    private async getImageMetadata(imageBuffer: Buffer): Promise<sharp.Metadata> {
        try {
            return await sharp(imageBuffer).metadata();
        } catch (error) {
            this.logger.warn(SERVICE_NAME, 'getImageMetadata', 'Failed to read image metadata', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { width: 640, height: 480 } as sharp.Metadata;
        }
    }

    private async detectTextRegions(imageBuffer: Buffer, origW: number, origH: number): Promise<TextBox[]> {
        if (!this.detectionSession) return [];

        // Calculate resize dimensions
        const maxDim = this.config.maxImageDimension;
        const scale = Math.min(maxDim / origW, maxDim / origH, 1);
        const resizedW = Math.ceil((origW * scale) / 32) * 32;
        const resizedH = Math.ceil((origH * scale) / 32) * 32;

        // Preprocess image
        const { data, info } = await sharp(imageBuffer)
            .resize(resizedW, resizedH, { fit: 'fill' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Normalize to CHW format
        const pixels = info.width * info.height;
        const floatData = new Float32Array(3 * pixels);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < pixels; i++) {
            floatData[0 * pixels + i] = (data[i * 3 + 0] / 255.0 - mean[0]) / std[0];
            floatData[1 * pixels + i] = (data[i * 3 + 1] / 255.0 - mean[1]) / std[1];
            floatData[2 * pixels + i] = (data[i * 3 + 2] / 255.0 - mean[2]) / std[2];
        }

        // Run inference
        const tensor = new ort.Tensor('float32', floatData, [1, 3, resizedH, resizedW]);
        const inputName = this.detectionSession.inputNames[0] || 'x';
        const results = await this.detectionSession.run({ [inputName]: tensor });

        return this.parseDetectionOutput(results, origW, origH, resizedW, resizedH);
    }

    private parseDetectionOutput(
        results: ort.InferenceSession.OnnxValueMapType,
        origW: number, origH: number, resizedW: number, resizedH: number
    ): TextBox[] {
        const boxes: TextBox[] = [];
        const output = results[Object.keys(results)[0]];
        if (!output) return boxes;

        const data = output.data as Float32Array;
        const dims = output.dims as number[];
        const mapH = dims[2] || resizedH;
        const mapW = dims[3] || resizedW;
        const scaleX = origW / mapW;
        const scaleY = origH / mapH;
        const threshold = this.config.detectionThreshold;
        const visited = new Set<number>();

        // Flood fill connected components
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const idx = y * mapW + x;
                if (data[idx] >= threshold && !visited.has(idx)) {
                    const region = this.floodFill(data, mapW, mapH, x, y, threshold, visited);
                    if (region.length >= 10) {
                        const box = this.regionToBox(region, scaleX, scaleY);
                        if (box.width >= 5 && box.height >= 5) boxes.push(box);
                    }
                }
            }
        }

        return this.mergeBoxes(boxes);
    }

    private floodFill(
        data: Float32Array, w: number, h: number,
        sx: number, sy: number, t: number, v: Set<number>
    ): { x: number; y: number }[] {
        const pixels: { x: number; y: number }[] = [];
        const stack = [{ x: sx, y: sy }];

        while (stack.length > 0) {
            const { x, y } = stack.pop()!;
            const idx = y * w + x;

            if (x < 0 || x >= w || y < 0 || y >= h || v.has(idx) || data[idx] < t) continue;

            v.add(idx);
            pixels.push({ x, y });
            stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
        }

        return pixels;
    }

    private regionToBox(region: { x: number; y: number }[], scaleX: number, scaleY: number): TextBox {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const p of region) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        return {
            x: minX * scaleX,
            y: minY * scaleY,
            width: (maxX - minX + 1) * scaleX,
            height: (maxY - minY + 1) * scaleY,
        };
    }

    private mergeBoxes(boxes: TextBox[]): TextBox[] {
        if (boxes.length <= 1) return boxes;

        const merged: TextBox[] = [];
        const used = new Set<number>();

        for (let i = 0; i < boxes.length; i++) {
            if (used.has(i)) continue;

            let cur = { ...boxes[i] };
            used.add(i);

            for (let j = i + 1; j < boxes.length; j++) {
                if (!used.has(j) && this.overlap(cur, boxes[j])) {
                    cur = this.merge(cur, boxes[j]);
                    used.add(j);
                }
            }

            merged.push(cur);
        }

        return merged;
    }

    private overlap(a: TextBox, b: TextBox): boolean {
        return !(a.x + a.width < b.x || b.x + b.width < a.x ||
            a.y + a.height < b.y || b.y + b.height < a.y);
    }

    private merge(a: TextBox, b: TextBox): TextBox {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        return {
            x, y,
            width: Math.max(a.x + a.width, b.x + b.width) - x,
            height: Math.max(a.y + a.height, b.y + b.height) - y,
        };
    }

    // ========================================================================
    // PRIVATE METHODS - TEXT RECOGNITION
    // ========================================================================

    private async recognizeText(imageBuffer: Buffer, box: TextBox): Promise<OCRResult> {
        if (!this.recognitionSession) {
            return { text: '', box, confidence: 0 };
        }

        // Crop region
        const cropBuffer = await sharp(imageBuffer)
            .extract({
                left: Math.max(0, Math.round(box.x)),
                top: Math.max(0, Math.round(box.y)),
                width: Math.max(1, Math.round(box.width)),
                height: Math.max(1, Math.round(box.height)),
            })
            .toBuffer();

        // Resize to recognition input size
        const recHeight = 48;
        const cropMeta = await sharp(cropBuffer).metadata();
        const aspectRatio = (cropMeta.width || 100) / (cropMeta.height || 32);
        const recWidth = Math.min(Math.round(recHeight * aspectRatio), 320);

        const { data, info } = await sharp(cropBuffer)
            .resize(recWidth, recHeight, { fit: 'fill' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Normalize
        const pixels = info.width * info.height;
        const floatData = new Float32Array(3 * pixels);

        for (let i = 0; i < pixels; i++) {
            floatData[0 * pixels + i] = (data[i * 3 + 0] / 255.0 - 0.5) / 0.5;
            floatData[1 * pixels + i] = (data[i * 3 + 1] / 255.0 - 0.5) / 0.5;
            floatData[2 * pixels + i] = (data[i * 3 + 2] / 255.0 - 0.5) / 0.5;
        }

        // Run inference
        const tensor = new ort.Tensor('float32', floatData, [1, 3, recHeight, recWidth]);
        const inputName = this.recognitionSession.inputNames[0] || 'x';
        const results = await this.recognitionSession.run({ [inputName]: tensor });

        // CTC decode
        const { text, confidence } = this.ctcDecode(results);
        return { text, box, confidence };
    }

    private ctcDecode(results: ort.InferenceSession.OnnxValueMapType): { text: string; confidence: number } {
        const output = results[Object.keys(results)[0]];
        if (!output) return { text: '', confidence: 0 };

        const data = output.data as Float32Array;
        const dims = output.dims as number[];
        const seqLen = dims.length === 3 ? dims[1] : dims[0];
        const numClasses = dims.length === 3 ? dims[2] : dims[1];

        let text = '';
        let totalConf = 0;
        let prevIdx = -1;
        let charCount = 0;

        for (let t = 0; t < seqLen; t++) {
            let maxProb = -Infinity;
            let maxIdx = 0;

            for (let c = 0; c < numClasses; c++) {
                const prob = data[t * numClasses + c];
                if (prob > maxProb) {
                    maxProb = prob;
                    maxIdx = c;
                }
            }

            if (maxIdx !== 0 && maxIdx !== prevIdx && maxIdx < this.charset.length) {
                text += this.charset[maxIdx];
                totalConf += Math.exp(maxProb);
                charCount++;
            }

            prevIdx = maxIdx;
        }

        return {
            text,
            confidence: charCount > 0 ? Math.min(totalConf / charCount, 1) : 0,
        };
    }
}

export default OCRService;
