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
