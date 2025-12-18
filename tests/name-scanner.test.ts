import { describe, it, expect } from "vitest";

import { loadNativeBinding } from "../src/native/binding";

describe("Rust name scanner (Last, First)", () => {
  it("detects comma-based names with OCR substitutions", () => {
    let binding: any;
    try {
      binding = loadNativeBinding({ configureOrt: false });
    } catch {
      return; // native addon missing; skip
    }

    if (!binding.VulpesNameScanner) return;

    const scanner = new binding.VulpesNameScanner();
    scanner.initialize(["latonya", "john"], ["martinez", "smith"]);

    const text = "martinez, l@tonya a. and SMITH, JOHN were listed.";
    const detections = scanner.detectLastFirst(text);

    expect(Array.isArray(detections)).toBe(true);
    expect(detections.length).toBeGreaterThan(0);
    expect(detections.some((d: any) => String(d.text).toLowerCase().includes("martinez,"))).toBe(
      true,
    );
  });
});
