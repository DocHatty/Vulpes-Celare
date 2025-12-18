import { loadNativeBinding } from "../native/binding";

export type RustStreamingIdentifierDetection = {
  filterType: string;
  characterStart: number;
  characterEnd: number;
  text: string;
  confidence: number;
  pattern: string;
};

export class RustStreamingIdentifierScanner {
  private scanner:
    | {
        reset(): void;
        push(textChunk: string): RustStreamingIdentifierDetection[];
      }
    | null = null;

  constructor(overlapUtf16 = 64) {
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      if (binding.VulpesStreamingIdentifierScanner) {
        this.scanner = new (binding.VulpesStreamingIdentifierScanner as any)(
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

  push(chunk: string): RustStreamingIdentifierDetection[] {
    if (!this.scanner) return [];
    try {
      return this.scanner.push(chunk);
    } catch {
      return [];
    }
  }
}
