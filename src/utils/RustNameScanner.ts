import { loadNativeBinding } from "../native/binding";
import { NameDictionary } from "../dictionaries/NameDictionary";

export type RustNameDetection = {
  characterStart: number;
  characterEnd: number;
  text: string;
  confidence: number;
  pattern: string;
};

let cachedScanner:
  | {
      initialize(firstNames: string[], surnames: string[]): void;
      detectLastFirst(text: string): RustNameDetection[];
      detectFirstLast?(text: string): RustNameDetection[];
      detectSmart?(text: string): RustNameDetection[];
      isInitialized(): boolean;
    }
  | null
  | undefined = undefined;

let cachedInitialized = false;

function getScanner() {
  if (cachedScanner !== undefined) return cachedScanner;
  try {
    const binding = loadNativeBinding({ configureOrt: false });
    if (binding.VulpesNameScanner) {
      cachedScanner = new (binding.VulpesNameScanner as any)();
      return cachedScanner;
    }
  } catch {
    // ignore
  }
  cachedScanner = null;
  return cachedScanner;
}

function ensureInitialized() {
  if (cachedInitialized) return;
  const scanner = getScanner();
  if (!scanner) return;

  // Load dictionaries once from disk; they already live in src/dictionaries/.
  const { firstNames, surnames } = NameDictionary.getNameLists();

  scanner.initialize(firstNames, surnames);
  cachedInitialized = true;
}

export const RustNameScanner = {
  isAvailable(): boolean {
    return Boolean(getScanner());
  },

  detectLastFirst(text: string): RustNameDetection[] {
    const scanner = getScanner();
    if (!scanner) return [];
    ensureInitialized();
    if (!cachedInitialized) return [];
    try {
      return scanner.detectLastFirst(text);
    } catch {
      return [];
    }
  },

  detectFirstLast(text: string): RustNameDetection[] {
    const scanner = getScanner();
    if (!scanner?.detectFirstLast) return [];
    ensureInitialized();
    if (!cachedInitialized) return [];
    try {
      return scanner.detectFirstLast(text);
    } catch {
      return [];
    }
  },

  detectSmart(text: string): RustNameDetection[] {
    const scanner = getScanner();
    if (!scanner?.detectSmart) return [];
    ensureInitialized();
    if (!cachedInitialized) return [];
    try {
      return scanner.detectSmart(text);
    } catch {
      return [];
    }
  },
};
