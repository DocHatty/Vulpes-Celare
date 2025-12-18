/**
 * Streaming + Text Redaction Benchmarks
 *
 * Run with: npm run build && npm run test:bench
 */

import { describe, bench, beforeAll } from "vitest";

let VulpesCelare: any;
let StreamingRedactor: any;

const SAMPLE_NOTE = [
  "Patient: John Smith",
  "MRN: 12345678",
  "DOB: 01/15/1980",
  "Phone: (555) 123-4567",
  "Address: 742 Evergreen Terrace, Springfield, IL 62704",
  "Assessment: Chest pain, rule out MI.",
  "Plan: EKG, troponins, cardiology consult.",
].join("\n");

const LARGE_NOTE = Array.from({ length: 200 }, () => SAMPLE_NOTE).join("\n\n");

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

describe("Text Redaction", () => {
  beforeAll(async () => {
    try {
      const m = await import("../../dist/VulpesCelare.js");
      VulpesCelare = m.VulpesCelare;
    } catch {
      // Bench suite is often run after build; skip if dist missing.
    }
  });

  bench("VulpesCelare.redactWithDetails (single note)", async () => {
    if (!VulpesCelare) return;
    await VulpesCelare.redactWithDetails(SAMPLE_NOTE);
  });

  bench("VulpesCelare.redactWithDetails (large note)", async () => {
    if (!VulpesCelare) return;
    await VulpesCelare.redactWithDetails(LARGE_NOTE);
  });
});

describe("Streaming Redaction", () => {
  beforeAll(async () => {
    try {
      const m = await import("../../dist/StreamingRedactor.js");
      StreamingRedactor = m.StreamingRedactor;
    } catch {
      // Bench suite is often run after build; skip if dist missing.
    }
  });

  bench("StreamingRedactor.processChunk (small chunks)", async () => {
    if (!StreamingRedactor) return;
    const redactor = new StreamingRedactor({ bufferSize: 100, mode: "sentence" });
    const chunks = chunkText(LARGE_NOTE, 40);
    for (const chunk of chunks) {
      await redactor.processChunk(chunk);
    }
    await redactor.flush();
  });

  bench("StreamingRedactor.processChunk (larger chunks)", async () => {
    if (!StreamingRedactor) return;
    const redactor = new StreamingRedactor({ bufferSize: 200, mode: "sentence" });
    const chunks = chunkText(LARGE_NOTE, 200);
    for (const chunk of chunks) {
      await redactor.processChunk(chunk);
    }
    await redactor.flush();
  });
});
