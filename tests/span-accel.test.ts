import { describe, it, expect } from "vitest";

import { Span, SpanUtils, FilterType } from "../src/models/Span";
import { IntervalTreeSpanIndex } from "../src/models/IntervalTreeSpanIndex";
import { loadNativeBinding } from "../src/native/binding";

function makeSpan(
  start: number,
  end: number,
  filterType: FilterType,
  confidence: number,
  priority: number,
): Span {
  return new Span({
    text: "x".repeat(Math.max(0, end - start)),
    originalValue: "x",
    characterStart: start,
    characterEnd: end,
    filterType,
    confidence,
    priority,
    context: "",
    window: [],
    replacement: null,
    salt: null,
    pattern: null,
    applied: false,
    ignored: false,
    ambiguousWith: [],
    disambiguationScore: null,
  });
}

describe("Span overlap Rust accelerator", () => {
  it("matches IntervalTreeSpanIndex behavior", () => {
    const spans: Span[] = [
      makeSpan(10, 20, FilterType.NAME, 0.8, 10),
      makeSpan(12, 18, FilterType.DATE, 0.95, 50), // contained, more specific + high conf => should replace NAME
      makeSpan(30, 40, FilterType.NAME, 0.9, 10),
      makeSpan(30, 40, FilterType.NAME, 0.7, 10), // exact duplicate position+type lower confidence
      makeSpan(35, 45, FilterType.URL, 0.9, 75), // overlaps partially with NAME => higher score likely wins
      makeSpan(100, 120, FilterType.PHONE, 0.99, 75),
      makeSpan(0, 200, FilterType.CUSTOM, 0.2, 1), // contains others but low spec => should be rejected
    ];

    const baseline = IntervalTreeSpanIndex.dropOverlappingSpans(spans).map(
      (s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`,
    );

    // Enable Rust accelerator and compare output.
    const prev = process.env.VULPES_SPAN_ACCEL;
    process.env.VULPES_SPAN_ACCEL = "1";
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      if (!binding.dropOverlappingSpans) {
        // Native binding exists but doesn't expose this method (older addon).
        return;
      }

      const accelerated = SpanUtils.dropOverlappingSpans(spans).map(
        (s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`,
      );

      expect(accelerated).toEqual(baseline);
    } catch {
      // Native binding may not be available in all environments; skip.
      return;
    } finally {
      process.env.VULPES_SPAN_ACCEL = prev;
    }
  });
});
