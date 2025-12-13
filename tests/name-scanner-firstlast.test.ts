import { describe, expect, it } from "vitest";
import { RustNameScanner } from "../src/utils/RustNameScanner";

describe("RustNameScanner.detectFirstLast", () => {
  it("detects basic First Last names", () => {
    if (!RustNameScanner.isAvailable()) return;
    const text = "Patient is John Smith and will follow up.";
    const spans = RustNameScanner.detectFirstLast(text);
    expect(spans.some((s) => s.text === "John Smith")).toBe(true);
  });

  it("detects middle-initial First M. Last", () => {
    if (!RustNameScanner.isAvailable()) return;
    const text = "Seen by Mary J. Johnson yesterday.";
    const spans = RustNameScanner.detectFirstLast(text);
    expect(spans.some((s) => s.text === "Mary J. Johnson")).toBe(true);
  });
});
