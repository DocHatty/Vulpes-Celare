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

import { VulpesCelare, RedactionResult, VulpesCelareConfig } from './VulpesCelare';

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
export class StreamingRedactor {
  private engine: VulpesCelare;
  private buffer: string;
  private position: number;
  private config: Required<Omit<StreamingRedactorConfig, 'engineConfig'>> & { engineConfig?: VulpesCelareConfig };
  private flushTimer: NodeJS.Timeout | null;
  private sentenceBuffer: string;
  private totalRedactionCount: number;

  constructor(config: StreamingRedactorConfig = {}) {
    this.config = {
      bufferSize: config.bufferSize ?? 100,
      flushTimeout: config.flushTimeout ?? 500,
      engineConfig: config.engineConfig,
      mode: config.mode ?? 'sentence'
    };

    this.engine = new VulpesCelare(this.config.engineConfig || {});
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
  async *redactStream(
    stream: AsyncIterable<string>
  ): AsyncIterable<StreamingChunk> {
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
  async processChunk(chunk: string): Promise<StreamingChunk | null> {
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
    } else {
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
  async flush(): Promise<StreamingChunk | null> {
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
  getStats(): { totalRedactionCount: number; position: number } {
    return {
      totalRedactionCount: this.totalRedactionCount,
      position: this.position
    };
  }

  /**
   * Reset the redactor state
   * Useful for starting a new stream
   */
  reset(): void {
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

  private shouldFlushSentence(): boolean {
    // Flush on sentence endings: . ! ? followed by space or newline
    const sentenceEnd = /[.!?][\s\n]/.test(this.sentenceBuffer);
    
    // Also flush if buffer gets too large (safety)
    const tooLarge = this.buffer.length >= this.config.bufferSize * 2;
    
    return sentenceEnd || tooLarge;
  }

  private async flushBuffer(): Promise<StreamingChunk> {
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

  private resetFlushTimer(): void {
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
export class WebSocketRedactionHandler {
  private redactor: StreamingRedactor;
  private ws: any; // WebSocket type (avoiding dependency)

  constructor(ws: any, config?: StreamingRedactorConfig) {
    this.ws = ws;
    this.redactor = new StreamingRedactor(config);
  }

  /**
   * Handle incoming message from WebSocket
   */
  async handleMessage(message: string): Promise<void> {
    try {
      const chunk = await this.redactor.processChunk(message);
      
      if (chunk) {
        this.sendChunk(chunk);
      }
    } catch (error) {
      this.sendError(error);
    }
  }

  /**
   * Flush remaining buffer and close
   */
  async close(): Promise<void> {
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
    } catch (error) {
      this.sendError(error);
    }
  }

  private sendChunk(chunk: StreamingChunk): void {
    this.ws.send(JSON.stringify({
      type: 'chunk',
      data: chunk
    }));
  }

  private sendError(error: any): void {
    this.ws.send(JSON.stringify({
      type: 'error',
      message: error.message || 'Redaction error'
    }));
  }
}
