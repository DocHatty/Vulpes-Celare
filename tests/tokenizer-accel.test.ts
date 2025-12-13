import { describe, it, expect } from "vitest";

import { loadNativeBinding } from "../src/native/binding";

function jsTokenizeWithPositions(text: string, includePunctuation: boolean) {
  const pattern = includePunctuation ? /\w+|[^\w\s]/g : /\w+/g;
  const out: Array<{ text: string; start: number; end: number }> = [];
  for (const match of text.matchAll(pattern)) {
    out.push({
      text: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return out;
}

describe("Rust tokenizer accelerator", () => {
  it("matches JS tokenization on ASCII text", () => {
    let binding: any;
    try {
      binding = loadNativeBinding({ configureOrt: false });
    } catch {
      return; // skip when native addon isn't present
    }
    if (typeof binding.tokenizeWithPositions !== "function") return;

    const text = "Patient: John_Smith, MRN 12O-45!  \nNext.";

    for (const includePunctuation of [false, true]) {
      const js = jsTokenizeWithPositions(text, includePunctuation);
      const native = binding.tokenizeWithPositions(text, includePunctuation);
      expect(native).toEqual(js);
    }
  });
});
