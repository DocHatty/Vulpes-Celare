# Streaming Redaction API - Examples

Real-time PHI redaction for streaming clinical documentation, live dictation, and scribe applications.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Live Dictation System](#live-dictation-system)
- [WebSocket Server](#websocket-server)
- [Voice-to-Text Integration](#voice-to-text-integration)
- [Real-time Chat/Scribe](#real-time-chatscribe)
- [Performance Tuning](#performance-tuning)

---

## Basic Usage

### Simple Stream Processing

```typescript
import { StreamingRedactor } from 'vulpes-celare';

const redactor = new StreamingRedactor({
  bufferSize: 100,        // Characters to buffer before redacting
  flushTimeout: 500,      // Auto-flush after 500ms of inactivity
  mode: 'sentence'        // Wait for sentence completion
});

// Process an async iterable stream
async function processStream(textStream: AsyncIterable<string>) {
  for await (const chunk of redactor.redactStream(textStream)) {
    console.log('Safe text:', chunk.text);
    console.log('Redactions:', chunk.redactionCount);
    console.log('Contains PHI:', chunk.containsRedactions);
  }
}
```

### Manual Chunk Processing

```typescript
import { StreamingRedactor } from 'vulpes-celare';

const redactor = new StreamingRedactor();

// Process chunks as they arrive
const chunk1 = await redactor.processChunk("Patient John");
// null - buffering for context

const chunk2 = await redactor.processChunk(" Smith arrived at");
// null - still buffering

const chunk3 = await redactor.processChunk(" 3pm. ");
// Returns redacted chunk: "Patient [NAME-1] arrived at [TIME-1]. "

// Force flush remaining buffer
const final = await redactor.flush();
```

---

## Live Dictation System

### Real-time Speech-to-Text with PHI Redaction

```typescript
import { StreamingRedactor } from 'vulpes-celare';
import { createClient } from '@deepgram/sdk';

// Initialize speech-to-text
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Initialize streaming redactor
const redactor = new StreamingRedactor({
  bufferSize: 50,     // Lower buffer for faster response
  mode: 'immediate',  // Don't wait for sentences
  policy: 'maximum'   // HIPAA Safe Harbor
});

async function liveDictation(audioStream: NodeJS.ReadableStream) {
  // Start speech recognition
  const recognition = deepgram.listen.live({
    model: 'nova-2-medical',
    language: 'en',
    smart_format: true
  });

  // Pipe audio
  audioStream.pipe(recognition);

  // Process transcription in real-time
  recognition.on('Results', async (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    
    if (transcript) {
      const chunk = await redactor.processChunk(transcript + ' ');
      
      if (chunk) {
        // Display safe text immediately
        displayToUI(chunk.text);
        
        // Alert if PHI detected
        if (chunk.containsRedactions) {
          console.log(`⚠️ Redacted ${chunk.redactionCount} PHI elements`);
        }
      }
    }
  });

  recognition.on('close', async () => {
    // Flush any remaining text
    const final = await redactor.flush();
    if (final) {
      displayToUI(final.text);
    }
    
    // Show stats
    const stats = redactor.getStats();
    console.log(`Total redactions: ${stats.totalRedactionCount}`);
  });
}

function displayToUI(text: string) {
  // Update UI with safe text
  document.getElementById('transcript').textContent += text;
}
```

---

## WebSocket Server

### Real-time Redaction Service

```typescript
import WebSocket from 'ws';
import { WebSocketRedactionHandler } from 'vulpes-celare';
import express from 'express';

const app = express();
const server = app.listen(3000);

// WebSocket server for real-time redaction
const wss = new WebSocket.Server({ 
  server,
  path: '/redact'
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Create handler for this connection
  const handler = new WebSocketRedactionHandler(ws, {
    bufferSize: 100,
    mode: 'sentence'
  });
  
  // Handle incoming text chunks
  ws.on('message', async (data) => {
    await handler.handleMessage(data.toString());
  });
  
  // Clean up on disconnect
  ws.on('close', async () => {
    await handler.close();
    console.log('Client disconnected');
  });
  
  // Error handling
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('Streaming redaction server running on ws://localhost:3000/redact');
```

### Client-Side Usage

```typescript
// Browser or Node.js client
const ws = new WebSocket('ws://localhost:3000/redact');

ws.onopen = () => {
  console.log('Connected to redaction service');
  
  // Send text chunks as user types
  const textInput = document.getElementById('input');
  let buffer = '';
  
  textInput.addEventListener('input', (e) => {
    const newText = e.target.value;
    const chunk = newText.slice(buffer.length);
    
    if (chunk) {
      ws.send(chunk);
      buffer = newText;
    }
  });
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'chunk') {
    // Display redacted text
    const { text, containsRedactions, redactionCount } = message.data;
    document.getElementById('output').textContent += text;
    
    if (containsRedactions) {
      console.log(`Redacted ${redactionCount} PHI elements`);
    }
  }
  
  if (message.type === 'stats') {
    console.log('Session stats:', message.data);
  }
  
  if (message.type === 'error') {
    console.error('Redaction error:', message.message);
  }
};
```

---

## Performance Tuning

### Buffer Size Guidelines

```typescript
// Low latency (live chat, immediate feedback)
const lowLatency = new StreamingRedactor({
  bufferSize: 20,
  mode: 'immediate'
});
// Latency: ~50ms, Accuracy: Good

// Balanced (most use cases)
const balanced = new StreamingRedactor({
  bufferSize: 100,
  mode: 'sentence'
});
// Latency: ~200ms, Accuracy: Excellent

// High accuracy (complex medical dictation)
const highAccuracy = new StreamingRedactor({
  bufferSize: 300,
  mode: 'sentence'
});
// Latency: ~500ms, Accuracy: Maximum
```

### Mode Comparison

| Mode | Latency | Accuracy | Use Case |
|------|---------|----------|----------|
| `immediate` | Low (~50ms) | Good | Live chat, instant feedback |
| `sentence` | Medium (~200ms) | Excellent | Dictation, documentation |

---

## Support

For questions or issues:
- 📖 [Main Documentation](../../README.md)
- 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
- 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues)

---

**Built for real-time healthcare. Validated through streaming. 🦊**
