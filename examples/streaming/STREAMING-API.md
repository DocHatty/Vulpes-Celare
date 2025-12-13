# Streaming Redaction API

Real-time PHI redaction for streaming clinical documentation and dictation.

## Basic Usage

```ts
import { StreamingRedactor } from "vulpes-celare";

const redactor = new StreamingRedactor({
  bufferSize: 100,
  flushTimeout: 500,
  mode: "sentence",
});

for await (const chunk of redactor.redactStream(myAsyncIterableOfText)) {
  console.log(chunk.text);
}
```

## Native Streaming Kernel (Optional)

The repo includes an optional Rust streaming kernel that tracks sentence/whitespace boundaries incrementally and keeps an overlap tail buffered to reduce rescans on long streams.

Enable it by setting:

```bash
set VULPES_STREAM_KERNEL=1
```

## Native Streaming Detections (Optional)

You can also attach native streaming detections (rolling identifier + name detections) to each emitted chunk for profiling/telemetry. This does not change redaction output.

Enable it via config:

```ts
const redactor = new StreamingRedactor({ emitDetections: true });
```

Or via environment variable:

```bash
set VULPES_STREAM_DETECTIONS=1
```

## Manual Chunk Processing

```ts
import { StreamingRedactor } from "vulpes-celare";

const redactor = new StreamingRedactor({ mode: "immediate" });

await redactor.processChunk("Patient John");
await redactor.processChunk(" Smith arrived at");

const final = await redactor.flush();
if (final) console.log(final.text);
```

## WebSocket Handler

`WebSocketRedactionHandler` wraps `StreamingRedactor` and sends JSON messages:

- `type: "chunk"`: `{ text, containsRedactions, redactionCount, position }`
- `type: "stats"`: session totals on close
- `type: "error"`: error message
