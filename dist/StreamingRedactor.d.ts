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
import { VulpesCelareConfig } from './VulpesCelare';
export interface StreamingRedactorConfig {
    /**
     * Buffer size in characters before flushing to redaction engine
     * Larger = better context, more latency
     * Smaller = lower latency, less context
     * Default: 100 characters
     */
    bufferSize?: number;
    /**
     * Time in ms to wait before flushing incomplete buffer
     * Prevents hanging on slow input
     * Default: 500ms
     */
    flushTimeout?: number;
    /**
     * VulpesCelare configuration for redaction engine
     */
    engineConfig?: VulpesCelareConfig;
    /**
     * Whether to emit redacted tokens immediately or wait for sentence completion
     * 'immediate' = lower latency, may split PHI tokens
     * 'sentence' = better accuracy, higher latency
     * Default: 'sentence'
     */
    mode?: 'immediate' | 'sentence';
}
export interface StreamingChunk {
    /**
     * The redacted text chunk
     */
    text: string;
    /**
     * Whether this chunk contains redactions
     */
    containsRedactions: boolean;
    /**
     * Number of PHI elements redacted in this chunk
     */
    redactionCount: number;
    /**
     * Position in the overall stream
     */
    position: number;
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
export declare class StreamingRedactor {
    private engine;
    private buffer;
    private position;
    private config;
    private flushTimer;
    private sentenceBuffer;
    private totalRedactionCount;
    constructor(config?: StreamingRedactorConfig);
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
    redactStream(stream: AsyncIterable<string>): AsyncIterable<StreamingChunk>;
    /**
     * Process a single text chunk
     *
     * @param chunk - Text chunk to process
     * @returns Redacted chunk if buffer is ready to flush, null otherwise
     */
    processChunk(chunk: string): Promise<StreamingChunk | null>;
    /**
     * Force flush of current buffer
     * Call this at end of stream or when forcing output
     */
    flush(): Promise<StreamingChunk | null>;
    /**
     * Get total redaction statistics
     */
    getStats(): {
        totalRedactionCount: number;
        position: number;
    };
    /**
     * Reset the redactor state
     * Useful for starting a new stream
     */
    reset(): void;
    private shouldFlushSentence;
    private flushBuffer;
    private resetFlushTimer;
}
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
export declare class WebSocketRedactionHandler {
    private redactor;
    private ws;
    constructor(ws: any, config?: StreamingRedactorConfig);
    /**
     * Handle incoming message from WebSocket
     */
    handleMessage(message: string): Promise<void>;
    /**
     * Flush remaining buffer and close
     */
    close(): Promise<void>;
    private sendChunk;
    private sendError;
}
//# sourceMappingURL=StreamingRedactor.d.ts.map