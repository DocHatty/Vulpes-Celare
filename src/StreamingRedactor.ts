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

import {
  VulpesCelare,
  RedactionResult,
  VulpesCelareConfig,
} from "./VulpesCelare";
import { loadNativeBinding } from "./native/binding";
import {
  RustStreamingIdentifierScanner,
  RustStreamingIdentifierDetection,
} from "./utils/RustStreamingIdentifierScanner";
import {
  RustStreamingNameScanner,
  RustStreamingNameDetection,
} from "./utils/RustStreamingNameScanner";

let cachedStreamingBinding:
  | ReturnType<typeof loadNativeBinding>
  | null
  | undefined = undefined;

function getStreamingBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedStreamingBinding !== undefined) return cachedStreamingBinding;
  try {
    cachedStreamingBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedStreamingBinding = null;
  }
  return cachedStreamingBinding;
}

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
  mode?: "immediate" | "sentence";

  /**
   * Keep this many characters buffered as overlap when using the native streaming kernel.
   * Larger overlap improves cross-chunk continuity at the cost of re-processing a small tail.
   * Default: 32
   */
  overlapSize?: number;

  /**
   * Emit native streaming detections (identifiers + rolling name scan) alongside redacted chunks.
   * This does not change redaction output; it is intended for profiling/telemetry and safe rollout.
   *
   * Can also be enabled with `VULPES_STREAM_DETECTIONS=1`.
   * Default: false
   */
  emitDetections?: boolean;
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

  /**
   * Optional native detections that fall fully within this emitted chunk.
   * Indices are relative to this chunk (0..chunk.text.length in UTF-16 code units).
   */
  nativeDetections?: {
    filterType: string;
    start: number;
    end: number;
    text: string;
    confidence: number;
    pattern: string;
  }[];
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
  private config: Required<Omit<StreamingRedactorConfig, "engineConfig">> & {
    engineConfig?: VulpesCelareConfig;
  };
  private flushTimer: NodeJS.Timeout | null;
  private sentenceBuffer: string;
  private totalRedactionCount: number;
  private nativeKernel: {
    push(chunk: string): void;
    popSegment(force?: boolean): string | null;
    reset(): void;
  } | null;
  private pendingChunks: StreamingChunk[];
  private emitDetections: boolean;
  private identifierScanner: RustStreamingIdentifierScanner | null;
  private nameScanner: RustStreamingNameScanner | null;
  private pendingNativeDetections: {
    filterType: string;
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
  }[];

  constructor(config: StreamingRedactorConfig = {}) {
    this.config = {
      bufferSize: config.bufferSize ?? 100,
      flushTimeout: config.flushTimeout ?? 500,
      engineConfig: config.engineConfig,
      mode: config.mode ?? "sentence",
      overlapSize: config.overlapSize ?? 32,
      emitDetections:
        config.emitDetections ?? process.env.VULPES_STREAM_DETECTIONS === "1",
    };

    this.engine = new VulpesCelare(this.config.engineConfig || {});
    this.buffer = "";
    this.position = 0;
    this.flushTimer = null;
    this.sentenceBuffer = "";
    this.totalRedactionCount = 0;
    this.pendingChunks = [];
    this.emitDetections = this.config.emitDetections;
    this.identifierScanner = this.emitDetections
      ? new RustStreamingIdentifierScanner(
          Math.max(64, this.config.overlapSize),
        )
      : null;
    this.nameScanner = this.emitDetections
      ? new RustStreamingNameScanner(Math.max(32, this.config.overlapSize))
      : null;
    this.pendingNativeDetections = [];

    // Rust streaming kernel is now DEFAULT (promoted from opt-in).
    // Set VULPES_STREAM_KERNEL=0 to disable and use pure TypeScript.
    const streamKernelEnv = process.env.VULPES_STREAM_KERNEL;
    const wantsKernel =
      streamKernelEnv === undefined || streamKernelEnv === "1";
    const binding = wantsKernel ? getStreamingBinding() : null;
    if (wantsKernel && binding?.VulpesStreamingKernel) {
      this.nativeKernel = new binding.VulpesStreamingKernel(
        this.config.mode,
        this.config.bufferSize,
        this.config.overlapSize,
      );
    } else {
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
  async *redactStream(
    stream: AsyncIterable<string>,
  ): AsyncIterable<StreamingChunk> {
    for await (const chunk of stream) {
      const result = await this.processChunk(chunk);
      if (result) {
        yield result;
        while (this.pendingChunks.length > 0) {
          yield this.pendingChunks.shift()!;
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
  async processChunk(chunk: string): Promise<StreamingChunk | null> {
    const pendingFirst =
      this.pendingChunks.length > 0 ? this.pendingChunks.shift()! : null;

    if (this.emitDetections) {
      const identifierDetections = this.identifierScanner?.push(chunk) ?? [];
      const nameDetections = this.nameScanner?.push(chunk) ?? [];

      if (identifierDetections.length > 0) {
        this.pendingNativeDetections.push(
          ...identifierDetections.map((d) => ({
            filterType: d.filterType,
            characterStart: d.characterStart,
            characterEnd: d.characterEnd,
            text: d.text,
            confidence: d.confidence,
            pattern: d.pattern,
          })),
        );
      }
      if (nameDetections.length > 0) {
        this.pendingNativeDetections.push(
          ...nameDetections.map((d) => ({
            filterType: "NAME",
            characterStart: d.characterStart,
            characterEnd: d.characterEnd,
            text: d.text,
            confidence: d.confidence,
            pattern: d.pattern,
          })),
        );
      }

      if (this.pendingNativeDetections.length > 1) {
        this.pendingNativeDetections.sort(
          (a, b) => a.characterStart - b.characterStart,
        );
      }
    }

    // Add to buffer
    if (this.nativeKernel) {
      this.nativeKernel.push(chunk);
    } else {
      this.buffer += chunk;
      this.sentenceBuffer += chunk;
    }

    // Reset flush timer
    this.resetFlushTimer();

    // Check if we should flush based on mode
    if (this.nativeKernel) {
      let firstProduced: StreamingChunk | null = null;
      while (true) {
        const segment = this.nativeKernel.popSegment(false);
        if (!segment) break;
        const produced = await this.redactAndAdvance(segment);
        if (!firstProduced) firstProduced = produced;
        else this.pendingChunks.push(produced);
      }

      if (pendingFirst) {
        if (firstProduced) this.pendingChunks.unshift(firstProduced);
        return pendingFirst;
      }

      return firstProduced;
    } else {
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
      } else {
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
  async flush(): Promise<StreamingChunk | null> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.nativeKernel) {
      const segment = this.nativeKernel.popSegment(true);
      if (!segment) return null;
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
  getStats(): { totalRedactionCount: number; position: number } {
    return {
      totalRedactionCount: this.totalRedactionCount,
      position: this.position,
    };
  }

  /**
   * Reset the redactor state
   * Useful for starting a new stream
   */
  reset(): void {
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
    this.buffer = "";
    this.sentenceBuffer = "";

    return {
      text: result.text,
      containsRedactions: result.redactionCount > 0,
      redactionCount: result.redactionCount,
      position: startPosition,
    };
  }

  private async redactAndAdvance(
    textToRedact: string,
  ): Promise<StreamingChunk> {
    const startPosition = this.position;
    const result = await this.engine.process(textToRedact);

    this.position += textToRedact.length;
    this.totalRedactionCount += result.redactionCount;

    const chunk: StreamingChunk = {
      text: result.text,
      containsRedactions: result.redactionCount > 0,
      redactionCount: result.redactionCount,
      position: startPosition,
    };

    if (this.emitDetections && this.pendingNativeDetections.length > 0) {
      const endPosition = startPosition + textToRedact.length;
      const ready: StreamingChunk["nativeDetections"] = [];
      const remaining: typeof this.pendingNativeDetections = [];

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
      this.ws.send(
        JSON.stringify({
          type: "stats",
          data: this.redactor.getStats(),
        }),
      );
    } catch (error) {
      this.sendError(error);
    }
  }

  private sendChunk(chunk: StreamingChunk): void {
    this.ws.send(
      JSON.stringify({
        type: "chunk",
        data: chunk,
      }),
    );
  }

  private sendError(error: any): void {
    this.ws.send(
      JSON.stringify({
        type: "error",
        message: error.message || "Redaction error",
      }),
    );
  }
}
