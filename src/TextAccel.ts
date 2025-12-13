import { loadNativeBinding } from "./native/binding";

type TextAccelNative = {
  normalizeOcr?: (text: string) => string;
  extractDigits?: (text: string) => string;
  extractDigitsWithOcr?: (text: string) => string;
  extractAlphanumeric?: (text: string, preserveCase?: boolean) => string;
  passesLuhn?: (text: string) => boolean;
};

let cachedNative: TextAccelNative | null | undefined;

function getNative(): TextAccelNative | null {
  if (cachedNative !== undefined) return cachedNative;

  try {
    const binding = loadNativeBinding({ configureOrt: false });
    cachedNative = {
      normalizeOcr:
        typeof binding.normalizeOcr === "function"
          ? binding.normalizeOcr
          : undefined,
      extractDigits:
        typeof binding.extractDigits === "function"
          ? binding.extractDigits
          : undefined,
      extractDigitsWithOcr:
        typeof binding.extractDigitsWithOcr === "function"
          ? binding.extractDigitsWithOcr
          : undefined,
      extractAlphanumeric:
        typeof binding.extractAlphanumeric === "function"
          ? binding.extractAlphanumeric
          : undefined,
      passesLuhn:
        typeof binding.passesLuhn === "function"
          ? binding.passesLuhn
          : undefined,
    };
    return cachedNative;
  } catch {
    cachedNative = null;
    return null;
  }
}

export const TextAccel = {
  isEnabled(): boolean {
    // Rust text acceleration is now DEFAULT (promoted from opt-in).
    // Set VULPES_TEXT_ACCEL=0 to disable and use pure TypeScript.
    const val = process.env.VULPES_TEXT_ACCEL;
    return val === undefined || val === "1";
  },

  /**
   * Normalizes common OCR substitutions (O->0, l/I/|->1, S->5, etc.) in Rust.
   *
   * Disabled by default to avoid forcing the native addon for text-only users.
   * Enable via `VULPES_TEXT_ACCEL=1`.
   */
  normalizeOCR(text: string): string {
    if (!this.isEnabled()) return text;
    const native = getNative();
    if (!native?.normalizeOcr) return text;
    return native.normalizeOcr(text);
  },

  extractDigits(text: string): string | null {
    if (!this.isEnabled()) return null;
    const native = getNative();
    if (!native?.extractDigits) return null;
    return native.extractDigits(text);
  },

  extractDigitsWithOCR(text: string): string | null {
    if (!this.isEnabled()) return null;
    const native = getNative();
    if (!native?.extractDigitsWithOcr) return null;
    return native.extractDigitsWithOcr(text);
  },

  extractAlphanumeric(
    text: string,
    preserveCase: boolean = true,
  ): string | null {
    if (!this.isEnabled()) return null;
    const native = getNative();
    if (!native?.extractAlphanumeric) return null;
    return native.extractAlphanumeric(text, preserveCase);
  },

  passesLuhn(text: string): boolean | null {
    if (!this.isEnabled()) return null;
    const native = getNative();
    if (!native?.passesLuhn) return null;
    return native.passesLuhn(text);
  },
};
