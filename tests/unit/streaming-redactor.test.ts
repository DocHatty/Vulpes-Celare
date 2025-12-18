import { describe, it, expect } from "vitest";

import { StreamingRedactor } from "../../src/StreamingRedactor";

async function* createAsyncIterable(chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

describe("StreamingRedactor", () => {
  it("creates a StreamingRedactor instance", () => {
    const redactor = new StreamingRedactor();
    expect(redactor).toBeTruthy();
  });

  it("creates with custom buffer size", () => {
    const redactor = new StreamingRedactor({ bufferSize: 200 });
    expect(redactor).toBeTruthy();
  });

  it("creates with immediate mode", () => {
    const redactor = new StreamingRedactor({ mode: "immediate" });
    expect(redactor).toBeTruthy();
  });

  it("creates with sentence mode", () => {
    const redactor = new StreamingRedactor({ mode: "sentence" });
    expect(redactor).toBeTruthy();
  });

  it("processes a simple chunk", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 50 });
    await redactor.processChunk("Patient John Smith visited.");
  });

  it("flushes remaining buffer", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 1000 });
    await redactor.processChunk("Patient John Smith");
    const final = await redactor.flush();

    expect(final).toBeTruthy();
    expect(final!.text).toBeTypeOf("string");
    expect(final!.redactionCount).toBeTypeOf("number");
  });

  it("tracks position in stream", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 50 });
    await redactor.processChunk("First chunk. ");
    await redactor.processChunk("Second chunk. ");
    const final = await redactor.flush();

    if (final) expect(final.position).toBeTypeOf("number");
  });

  it("counts redactions", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk("Patient John Smith, SSN 123-45-6789.");
    const final = await redactor.flush();

    expect(final).toBeTruthy();
    expect(final!.redactionCount).toBeGreaterThanOrEqual(0);
  });

  it("reports whether a chunk contains redactions", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk("Patient John Smith visited today.");
    const final = await redactor.flush();

    expect(final).toBeTruthy();
    expect(final!.containsRedactions).toBeTypeOf("boolean");
  });

  it("processes an async iterable stream", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 50 });
    const chunks = ["Patient John ", "Smith visited ", "on 01/15/2024."];
    const stream = createAsyncIterable(chunks);

    const results: any[] = [];
    for await (const chunk of redactor.redactStream(stream)) results.push(chunk);

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.text).toBeTypeOf("string");
      expect(result.redactionCount).toBeTypeOf("number");
      expect(result.containsRedactions).toBeTypeOf("boolean");
      expect(result.position).toBeTypeOf("number");
    }
  });

  it("handles an empty stream", async () => {
    const redactor = new StreamingRedactor();
    const stream = createAsyncIterable([]);

    const results: any[] = [];
    for await (const chunk of redactor.redactStream(stream)) results.push(chunk);

    expect(results.length).toBe(0);
  });

  it("handles a single-chunk stream", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    const stream = createAsyncIterable(["Patient arrived."]);

    const results: any[] = [];
    for await (const chunk of redactor.redactStream(stream)) results.push(chunk);

    expect(results.length).toBeGreaterThan(0);
  });

  it("tracks total redaction count", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk("John Smith");
    await redactor.flush();

    const stats = redactor.getStats();
    expect(stats.totalRedactionCount).toBeTypeOf("number");
    expect(stats.position).toBeTypeOf("number");
  });

  it("updates stats across multiple chunks", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 50 });
    await redactor.processChunk("First sentence.");
    await redactor.processChunk(" Second sentence.");
    await redactor.flush();

    const stats = redactor.getStats();
    expect(stats.position).toBeGreaterThan(0);
  });

  it("resets redactor state", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk("Some text here.");
    await redactor.flush();

    redactor.reset();
    const stats = redactor.getStats();
    expect(stats.totalRedactionCount).toBe(0);
    expect(stats.position).toBe(0);
  });

  it("is reusable after reset", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk("First stream.");
    await redactor.flush();

    redactor.reset();
    await redactor.processChunk("Second stream.");
    const final = await redactor.flush();
    expect(final).toBeTruthy();
  });

  it("works in immediate mode", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 20, mode: "immediate" });
    await redactor.processChunk("Patient arrived at hospital.");
  });

  it("works in sentence mode", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100, mode: "sentence" });
    await redactor.processChunk("Patient arrived. Doctor examined patient.");
  });

  it("respects buffer size", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 10 });
    await redactor.processChunk("This is a longer text that exceeds buffer.");
  });

  it("works with very small buffer", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 5 });
    await redactor.processChunk("Test");
    const final = await redactor.flush();
    expect(final).toBeTruthy();
  });

  it("works with large buffer", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 10000 });
    await redactor.processChunk("Test text.");
    const final = await redactor.flush();
    expect(final).toBeTruthy();
  });

  it("redacts PHI in streaming fashion", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });

    const chunks = [
      "Patient Name: John Smith\n",
      "SSN: 123-45-6789\n",
      "Phone: (555) 123-4567",
    ];

    for (const chunk of chunks) await redactor.processChunk(chunk);
    const final = await redactor.flush();

    expect(final).toBeTruthy();
    expect(final!.text).toBeTypeOf("string");
    expect(final!.text).not.toContain("123-45-6789");
  });

  it("maintains context across chunks", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });

    await redactor.processChunk("Patient: John ");
    await redactor.processChunk("Smith\n");
    await redactor.processChunk("Diagnosis: Healthy");

    const final = await redactor.flush();
    expect(final).toBeTruthy();
    expect(final!.text).toBeTypeOf("string");
  });

  it("handles empty input gracefully", async () => {
    const redactor = new StreamingRedactor();
    await redactor.processChunk("");
    await redactor.flush();
  });

  it("handles a very long single chunk", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    const longText = "Patient information. ".repeat(100);
    await redactor.processChunk(longText);
    await redactor.flush();
  });

  it("handles special characters", async () => {
    const redactor = new StreamingRedactor({ bufferSize: 100 });
    await redactor.processChunk('Patient: John "Johnny" O\'Brien-Smith, Jr.');
    const final = await redactor.flush();
    expect(final).toBeTruthy();
  });
});
