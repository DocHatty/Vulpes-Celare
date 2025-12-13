"use strict";
/**
 * VULPES CELARE - STREAMING REDACTION API
 *
 * Real-time PHI redaction for streaming text applications:
 * - Live clinical dictation
 * - Voice-to-text scribe systems
 * - Real-time chat/messaging
 * - Streaming document processing
 *
 * Features:
 * - Token-by-token processing with context awareness
 * - Async iterator support for streams
 * - WebSocket compatibility
 * - Configurable buffer size for performance
 * - Maintains redaction accuracy across chunks
 *
 * @module StreamingRedactor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketRedactionHandler = exports.StreamingRedactor = void 0;
const VulpesCelare_1 = require("./VulpesCelare");
const binding_1 = require("./native/binding");
const RustStreamingIdentifierScanner_1 = require("./utils/RustStreamingIdentifierScanner");
const RustStreamingNameScanner_1 = require("./utils/RustStreamingNameScanner");
let cachedStreamingBinding = undefined;
function getStreamingBinding() {
    if (cachedStreamingBinding !== undefined)
        return cachedStreamingBinding;
    try {
        cachedStreamingBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedStreamingBinding = null;
    }
    return cachedStreamingBinding;
}
/**
 * StreamingRedactor - Real-time PHI redaction for streaming text
 *
 * @example
 * ```typescript
 * const redactor = new StreamingRedactor({ bufferSize: 100 });
 *
 * // From async iterable (speech-to-text stream)
 * for await (const chunk of redactor.redactStream(speechStream)) {
 *   console.log(chunk.text); // Safe to display in real-time
 * }
 *
 * // Manual chunk processing
 * const chunk1 = await redactor.processChunk("Patient John");
 * const chunk2 = await redactor.processChunk(" Smith arrived at");
 * const final = await redactor.flush(); // Process remaining buffer
 * ```
 */
class StreamingRedactor {
    constructor(config = {}) {
        this.config = {
            bufferSize: config.bufferSize ?? 100,
            flushTimeout: config.flushTimeout ?? 500,
            engineConfig: config.engineConfig,
            mode: config.mode ?? "sentence",
            overlapSize: config.overlapSize ?? 32,
            emitDetections: config.emitDetections ?? process.env.VULPES_STREAM_DETECTIONS === "1",
        };
        this.engine = new VulpesCelare_1.VulpesCelare(this.config.engineConfig || {});
        this.buffer = "";
        this.position = 0;
        this.flushTimer = null;
        this.sentenceBuffer = "";
        this.totalRedactionCount = 0;
        this.pendingChunks = [];
        this.emitDetections = this.config.emitDetections;
        this.identifierScanner = this.emitDetections
            ? new RustStreamingIdentifierScanner_1.RustStreamingIdentifierScanner(Math.max(64, this.config.overlapSize))
            : null;
        this.nameScanner = this.emitDetections
            ? new RustStreamingNameScanner_1.RustStreamingNameScanner(Math.max(32, this.config.overlapSize))
            : null;
        this.pendingNativeDetections = [];
        const wantsKernel = process.env.VULPES_STREAM_KERNEL === "1";
        const binding = wantsKernel ? getStreamingBinding() : null;
        if (wantsKernel && binding?.VulpesStreamingKernel) {
            this.nativeKernel = new binding.VulpesStreamingKernel(this.config.mode, this.config.bufferSize, this.config.overlapSize);
        }
        else {
            this.nativeKernel = null;
        }
    }
    /**
     * Process an async iterable stream of text chunks
     *
     * @param stream - Async iterable of text chunks (e.g., from speech-to-text)
     * @yields Redacted chunks ready for display/storage
     *
     * @example
     * ```typescript
     * const redactor = new StreamingRedactor();
     * const speechStream = microphoneInput.pipe(speechToText);
     *
     * for await (const safeChunk of redactor.redactStream(speechStream)) {
     *   // Display in UI immediately - PHI is already redacted
     *   displayText.append(safeChunk.text);
     *
     *   if (safeChunk.containsRedactions) {
     *     console.log(`Redacted ${safeChunk.redactionCount} PHI elements`);
     *   }
     * }
     * ```
     */
    async *redactStream(stream) {
        for await (const chunk of stream) {
            const result = await this.processChunk(chunk);
            if (result) {
                yield result;
                while (this.pendingChunks.length > 0) {
                    yield this.pendingChunks.shift();
                }
            }
        }
        // Flush any remaining buffer
        const final = await this.flush();
        if (final) {
            yield final;
        }
    }
    /**
     * Process a single text chunk
     *
     * @param chunk - Text chunk to process
     * @returns Redacted chunk if buffer is ready to flush, null otherwise
     */
    async processChunk(chunk) {
        const pendingFirst = this.pendingChunks.length > 0 ? this.pendingChunks.shift() : null;
        if (this.emitDetections) {
            const identifierDetections = this.identifierScanner?.push(chunk) ?? [];
            const nameDetections = this.nameScanner?.push(chunk) ?? [];
            if (identifierDetections.length > 0) {
                this.pendingNativeDetections.push(...identifierDetections.map((d) => ({
                    filterType: d.filterType,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    text: d.text,
                    confidence: d.confidence,
                    pattern: d.pattern,
                })));
            }
            if (nameDetections.length > 0) {
                this.pendingNativeDetections.push(...nameDetections.map((d) => ({
                    filterType: "NAME",
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    text: d.text,
                    confidence: d.confidence,
                    pattern: d.pattern,
                })));
            }
            if (this.pendingNativeDetections.length > 1) {
                this.pendingNativeDetections.sort((a, b) => a.characterStart - b.characterStart);
            }
        }
        // Add to buffer
        if (this.nativeKernel) {
            this.nativeKernel.push(chunk);
        }
        else {
            this.buffer += chunk;
            this.sentenceBuffer += chunk;
        }
        // Reset flush timer
        this.resetFlushTimer();
        // Check if we should flush based on mode
        if (this.nativeKernel) {
            let firstProduced = null;
            while (true) {
                const segment = this.nativeKernel.popSegment(false);
                if (!segment)
                    break;
                const produced = await this.redactAndAdvance(segment);
                if (!firstProduced)
                    firstProduced = produced;
                else
                    this.pendingChunks.push(produced);
            }
            if (pendingFirst) {
                if (firstProduced)
                    this.pendingChunks.unshift(firstProduced);
                return pendingFirst;
            }
            return firstProduced;
        }
        else {
            if (this.config.mode === "sentence") {
                // Flush on sentence boundaries
                if (this.shouldFlushSentence()) {
                    const produced = await this.flushBuffer();
                    if (pendingFirst) {
                        this.pendingChunks.unshift(produced);
                        return pendingFirst;
                    }
                    return produced;
                }
            }
            else {
                // Flush when buffer reaches size limit
                if (this.buffer.length >= this.config.bufferSize) {
                    const produced = await this.flushBuffer();
                    if (pendingFirst) {
                        this.pendingChunks.unshift(produced);
                        return pendingFirst;
                    }
                    return produced;
                }
            }
        }
        return pendingFirst;
    }
    /**
     * Force flush of current buffer
     * Call this at end of stream or when forcing output
     */
    async flush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.nativeKernel) {
            const segment = this.nativeKernel.popSegment(true);
            if (!segment)
                return null;
            return await this.redactAndAdvance(segment);
        }
        if (this.buffer.length === 0) {
            return null;
        }
        return await this.flushBuffer();
    }
    /**
     * Get total redaction statistics
     */
    getStats() {
        return {
            totalRedactionCount: this.totalRedactionCount,
            position: this.position,
        };
    }
    /**
     * Reset the redactor state
     * Useful for starting a new stream
     */
    reset() {
        this.buffer = "";
        this.sentenceBuffer = "";
        this.position = 0;
        this.totalRedactionCount = 0;
        this.pendingChunks = [];
        this.nativeKernel?.reset();
        this.identifierScanner?.reset();
        this.nameScanner?.reset();
        this.pendingNativeDetections = [];
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }
    // Private methods
    shouldFlushSentence() {
        // Flush on sentence endings: . ! ? followed by space or newline
        const sentenceEnd = /[.!?][\s\n]/.test(this.sentenceBuffer);
        // Also flush if buffer gets too large (safety)
        const tooLarge = this.buffer.length >= this.config.bufferSize * 2;
        return sentenceEnd || tooLarge;
    }
    async flushBuffer() {
        const textToRedact = this.buffer;
        const startPosition = this.position;
        // Redact the buffered text
        const result = await this.engine.process(textToRedact);
        // Update state
        this.position += textToRedact.length;
        this.totalRedactionCount += result.redactionCount;
        this.buffer = "";
        this.sentenceBuffer = "";
        return {
            text: result.text,
            containsRedactions: result.redactionCount > 0,
            redactionCount: result.redactionCount,
            position: startPosition,
        };
    }
    async redactAndAdvance(textToRedact) {
        const startPosition = this.position;
        const result = await this.engine.process(textToRedact);
        this.position += textToRedact.length;
        this.totalRedactionCount += result.redactionCount;
        const chunk = {
            text: result.text,
            containsRedactions: result.redactionCount > 0,
            redactionCount: result.redactionCount,
            position: startPosition,
        };
        if (this.emitDetections && this.pendingNativeDetections.length > 0) {
            const endPosition = startPosition + textToRedact.length;
            const ready = [];
            const remaining = [];
            for (const d of this.pendingNativeDetections) {
                if (d.characterEnd <= startPosition) {
                    // Already emitted; drop.
                    continue;
                }
                if (d.characterEnd <= endPosition) {
                    const relStart = Math.max(0, d.characterStart - startPosition);
                    const relEnd = Math.max(0, d.characterEnd - startPosition);
                    if (relEnd > relStart) {
                        ready.push({
                            filterType: d.filterType,
                            start: relStart,
                            end: relEnd,
                            text: d.text,
                            confidence: d.confidence,
                            pattern: d.pattern,
                        });
                    }
                    continue;
                }
                remaining.push(d);
            }
            if (ready.length > 0) {
                chunk.nativeDetections = ready;
            }
            this.pendingNativeDetections = remaining;
        }
        return chunk;
    }
    resetFlushTimer() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flushTimer = setTimeout(async () => {
            if (this.buffer.length > 0) {
                // Auto-flush on timeout
                await this.flushBuffer();
            }
        }, this.config.flushTimeout);
    }
}
exports.StreamingRedactor = StreamingRedactor;
/**
 * WebSocket Handler for Streaming Redaction
 *
 * @example
 * ```typescript
 * // Server-side (Express + ws)
 * import WebSocket from 'ws';
 *
 * const wss = new WebSocket.Server({ port: 8080 });
 *
 * wss.on('connection', (ws) => {
 *   const handler = new WebSocketRedactionHandler(ws);
 *
 *   ws.on('message', async (data) => {
 *     await handler.handleMessage(data.toString());
 *   });
 *
 *   ws.on('close', () => {
 *     handler.close();
 *   });
 * });
 * ```
 */
class WebSocketRedactionHandler {
    constructor(ws, config) {
        this.ws = ws;
        this.redactor = new StreamingRedactor(config);
    }
    /**
     * Handle incoming message from WebSocket
     */
    async handleMessage(message) {
        try {
            const chunk = await this.redactor.processChunk(message);
            if (chunk) {
                this.sendChunk(chunk);
            }
        }
        catch (error) {
            this.sendError(error);
        }
    }
    /**
     * Flush remaining buffer and close
     */
    async close() {
        try {
            const final = await this.redactor.flush();
            if (final) {
                this.sendChunk(final);
            }
            // Send stats before closing
            this.ws.send(JSON.stringify({
                type: "stats",
                data: this.redactor.getStats(),
            }));
        }
        catch (error) {
            this.sendError(error);
        }
    }
    sendChunk(chunk) {
        this.ws.send(JSON.stringify({
            type: "chunk",
            data: chunk,
        }));
    }
    sendError(error) {
        this.ws.send(JSON.stringify({
            type: "error",
            message: error.message || "Redaction error",
        }));
    }
}
exports.WebSocketRedactionHandler = WebSocketRedactionHandler;
//# sourceMappingURL=StreamingRedactor.js.map