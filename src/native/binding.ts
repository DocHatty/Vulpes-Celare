import { resolve } from "path";

export type VulpesNativeBinding = {
  VulpesEngine: new (
    detPath: string,
    recPath: string,
  ) => {
    detectText(
      buffer: Buffer,
    ): { text: string; confidence: number; boxPoints: number[][] }[];
  };
  VulpesPhoneticMatcher?: new () => {
    initialize(firstNames: string[], surnames: string[]): void;
    matchFirstName(input: string): {
      original: string;
      matched: string;
      confidence: number;
      matchType: string;
    } | null;
    matchSurname(input: string): {
      original: string;
      matched: string;
      confidence: number;
      matchType: string;
    } | null;
    matchAnyName(input: string): {
      original: string;
      matched: string;
      confidence: number;
      matchType: string;
    } | null;
    isInitialized(): boolean;
    getStats(): {
      firstNames: number;
      surnames: number;
      primaryCodes: number;
      secondaryCodes: number;
    };
  };
  initCore: () => string;
  detectFaces: (
    buffer: Buffer,
    modelPath: string,
    confidenceThreshold?: number,
    nmsThreshold?: number,
  ) => {
    type: "FACE" | "SIGNATURE" | "FINGERPRINT" | "OTHER";
    box: { x: number; y: number; width: number; height: number };
    confidence: number;
  }[];
  normalizeOcr?: (text: string) => string;
  extractDigits?: (text: string) => string;
  extractDigitsWithOcr?: (text: string) => string;
  extractAlphanumeric?: (text: string, preserveCase?: boolean) => string;
  passesLuhn?: (text: string) => boolean;

  // Span/overlap helpers (Rust accelerator)
  dropOverlappingSpans?: (
    spans: {
      characterStart: number;
      characterEnd: number;
      filterType: string;
      confidence: number;
      priority: number;
    }[],
  ) => number[];

  // Tokenization helpers (Rust accelerator)
  tokenizeWithPositions?: (
    text: string,
    includePunctuation: boolean,
  ) => { text: string; start: number; end: number }[];

  // Crypto / provenance helpers (implemented in Rust for correctness and performance)
  sha256Hex?: (buffer: Buffer) => string;
  sha256HexString?: (text: string) => string;
  hmacSha256Hex?: (key: string, message: string) => string;
  merkleRootSha256Hex?: (leafHashesHex: string[]) => string;
  dicomHashToken?: (salt: string, value: string) => string;
  dicomHashUid?: (salt: string, value: string) => string;
};

type LoadOptions = {
  configureOrt?: boolean;
};

/**
 * Loads the platform-specific NAPI binding from `native/`.
 *
 * `configureOrt=true` sets `ORT_DYLIB_PATH` to the bundled DLL by default (Windows),
 * unless the user already provided `VULPES_ORT_PATH`/`ORT_DYLIB_PATH`.
 *
 * Keep this separate so text-only accelerators can load the addon without forcing ORT.
 */
export function loadNativeBinding(
  options: LoadOptions = {},
): VulpesNativeBinding {
  const configureOrt = options.configureOrt ?? false;

  if (configureOrt) {
    if (process.env.VULPES_ORT_PATH && !process.env.ORT_DYLIB_PATH) {
      process.env.ORT_DYLIB_PATH = resolve(process.env.VULPES_ORT_PATH);
    }
    if (!process.env.ORT_DYLIB_PATH) {
      process.env.ORT_DYLIB_PATH = resolve(
        __dirname,
        "../../native/onnxruntime.dll",
      );
    }
  }

  const platform = process.platform;
  const arch = process.arch;

  try {
    if (platform === "win32" && arch === "x64") {
      return require("../../native/vulpes_core.win32-x64-msvc.node");
    }
    if (platform === "darwin" && arch === "x64") {
      return require("../../native/vulpes_core.darwin-x64.node");
    }
    if (platform === "darwin" && arch === "arm64") {
      return require("../../native/vulpes_core.darwin-arm64.node");
    }
    if (platform === "linux" && arch === "x64") {
      return require("../../native/vulpes_core.linux-x64-gnu.node");
    }

    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  } catch (e) {
    throw new Error(
      "Vulpes native binding not found. Ensure the Rust core is built. " +
        "Run: cd src/rust && cargo build --release",
    );
  }
}
