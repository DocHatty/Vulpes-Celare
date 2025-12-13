import { loadNativeBinding } from "../native/binding";
import { NameDictionary } from "../dictionaries/NameDictionary";

export type RustStreamingNameDetection = {
  characterStart: number;
  characterEnd: number;
  text: string;
  confidence: number;
  pattern: string;
};

export class RustStreamingNameScanner {
  private scanner:
    | {
        initialize(firstNames: string[], surnames: string[]): void;
        isInitialized(): boolean;
        reset(): void;
        push(textChunk: string): RustStreamingNameDetection[];
      }
    | null = null;

  private initialized = false;

  constructor(overlapUtf16 = 32) {
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      if (binding.VulpesStreamingNameScanner) {
        this.scanner = new (binding.VulpesStreamingNameScanner as any)(
          overlapUtf16,
        );
      }
    } catch {
      this.scanner = null;
    }
  }

  isAvailable(): boolean {
    return Boolean(this.scanner);
  }

  reset(): void {
    this.scanner?.reset();
  }

  push(chunk: string): RustStreamingNameDetection[] {
    if (!this.scanner) return [];
    if (!this.initialized) {
      const { firstNames, surnames } = NameDictionary.getNameLists();
      this.scanner.initialize(firstNames, surnames);
      this.initialized = true;
    }
    try {
      return this.scanner.push(chunk);
    } catch {
      return [];
    }
  }
}
