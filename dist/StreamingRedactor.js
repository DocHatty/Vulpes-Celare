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
            mode: config.mode ?? 'sentence'
        };
        this.engine = new VulpesCelare_1.VulpesCelare(this.config.engineConfig || {});
        this.buffer = '';
        this.position = 0;
        this.flushTimer = null;
        this.sentenceBuffer = '';
        this.totalRedactionCount = 0;
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
        // Add to buffer
        this.buffer += chunk;
        this.sentenceBuffer += chunk;
        // Reset flush timer
        this.resetFlushTimer();
        // Check if we should flush based on mode
        if (this.config.mode === 'sentence') {
            // Flush on sentence boundaries
            if (this.shouldFlushSentence()) {
                return await this.flushBuffer();
            }
        }
        else {
            // Flush when buffer reaches size limit
            if (this.buffer.length >= this.config.bufferSize) {
                return await this.flushBuffer();
            }
        }
        return null;
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
            position: this.position
        };
    }
    /**
     * Reset the redactor state
     * Useful for starting a new stream
     */
    reset() {
        this.buffer = '';
        this.sentenceBuffer = '';
        this.position = 0;
        this.totalRedactionCount = 0;
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
        this.buffer = '';
        this.sentenceBuffer = '';
        return {
            text: result.text,
            containsRedactions: result.redactionCount > 0,
            redactionCount: result.redactionCount,
            position: startPosition
        };
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
                type: 'stats',
                data: this.redactor.getStats()
            }));
        }
        catch (error) {
            this.sendError(error);
        }
    }
    sendChunk(chunk) {
        this.ws.send(JSON.stringify({
            type: 'chunk',
            data: chunk
        }));
    }
    sendError(error) {
        this.ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Redaction error'
        }));
    }
}
exports.WebSocketRedactionHandler = WebSocketRedactionHandler;
//# sourceMappingURL=StreamingRedactor.js.map