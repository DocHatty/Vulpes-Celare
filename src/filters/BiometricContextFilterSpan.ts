/**
 * BiometricContextFilterSpan - Biometric Identifier Reference Detection (Span-Based)
 *
 * Detects textual references to biometric identifiers per HIPAA requirements.
 * This filter captures mentions of biometric data, not the data itself.
 *
 * Covered biometric identifiers:
 * - Fingerprints and voiceprints
 * - Retinal and iris scans
 * - Facial photographs/recognition
 * - DNA and genetic markers
 * - Any unique identifying characteristic
 *
 * Production-grade with sentence-level context awareness
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanFactory } from "../core/SpanFactory";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class BiometricContextFilterSpan extends SpanBasedFilter {
  /**
   * Comprehensive biometric keywords
   */
  private readonly BIOMETRIC_KEYWORDS = [
    "fingerprint",
    "thumbprint",
    "voiceprint",
    "voice print",
    "retinal scan",
    "retina scan",
    "iris scan",
    "eye scan",
    "facial recognition",
    "face recognition",
    "facial photo",
    "facial image",
    "photograph of patient",
    "photo of patient",
    "patient photo",
    "full face photo",
    "full face photograph",
    "face photograph",
    "dna",
    "genetic marker",
    "genetic test",
    "genome",
    "genomic",
    "biometric",
    "biometric id",
    "biometric identifier",
    "hand geometry",
    "palm print",
    "vein pattern",
    "gait analysis",
    "signature dynamic",
    "keystroke dynamic",
    "tattoo",
    "scar",
    "birthmark",
    "identifying mark",
  ];

  getType(): string {
    return "BIOMETRIC";
  }

  getPriority(): number {
    return FilterPriority.BIOMETRIC;
  }

  detect(text: string, _config: any, context: RedactionContext): Span[] {
    // Try Rust acceleration first
    const accelerated = RustScanKernel.getDetections(
      context,
      text,
      "BIOMETRIC",
    );
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, FilterType.BIOMETRIC, {
          confidence: d.confidence,
          priority: this.getPriority(),
          pattern: d.pattern,
        });
      });
    }

    // TypeScript fallback
    const spans: Span[] = [];

    // Pattern 1: Sentence-level detection with biometric keywords
    this.detectBiometricSentences(text, spans);

    // Pattern 2: Explicit descriptor phrases (tattoo, scar, birthmark)
    this.detectDescriptorPhrases(text, spans);

    // Pattern 3: Photograph/Image references
    this.detectPhotographReferences(text, spans);

    // Pattern 4: DNA/Genetic test results
    this.detectGeneticTests(text, spans);

    // Pattern 5: Biometric ID codes (IRIS-123456, DNA-ABC123, FP-987654, etc.)
    this.detectBiometricIdCodes(text, spans);

    return spans;
  }

  /**
   * Pattern 1: Sentence-level detection with biometric keywords
   */
  private detectBiometricSentences(text: string, spans: Span[]): void {
    const keywordPattern = this.BIOMETRIC_KEYWORDS.map((keyword) =>
      keyword.replace(/\s+/g, "\\s+"),
    ).join("|");

    // Handle plurals by adding optional 's' after word boundaries
    const pattern = new RegExp(
      `[^.!?\\n\\r]*\\b(?:${keywordPattern})s?\\b[^.!?\\n\\r]{0,200}[.!?\\n\\r]?`,
      "gi",
    );
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const sentence = match[0];

      if (this.isBiometricReference(sentence)) {
        const span = SpanFactory.fromPosition(text, match.index, match.index + sentence.length, FilterType.BIOMETRIC, {
          confidence: 0.9,
          priority: this.getPriority(),
          pattern: "Sentence with biometric keyword",
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 2: Explicit descriptor phrases
   */
  private detectDescriptorPhrases(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:shows|has|displays|visible|noted|observed)\s+(?:tattoo|scar|birthmark|identifying\s+mark)[^.!?]{0,50}[.!?]/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[0];

      const span = SpanFactory.fromPosition(text, match.index, match.index + phrase.length, FilterType.BIOMETRIC, {
        confidence: 0.92,
        priority: this.getPriority(),
        pattern: "Biometric descriptor phrase",
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 3: Photograph/Image references
   */
  private detectPhotographReferences(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:photograph|photo|image|picture)\s+(?:of|shows|depicts|displaying)?\s*(?:patient|individual|subject)['']?s?\s+(?:face|features|appearance)[^.!?]{0,50}[.!?]/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[0];

      const span = SpanFactory.fromPosition(text, match.index, match.index + phrase.length, FilterType.BIOMETRIC, {
        confidence: 0.93,
        priority: this.getPriority(),
        pattern: "Patient photograph reference",
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 4: DNA/Genetic test results
   */
  private detectGeneticTests(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:dna|genetic|genomic)\s+(?:test|testing|analysis|screening|marker|profile)[^.!?]{0,100}[.!?]/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[0];

      if (this.isBiometricReference(phrase)) {
        const span = SpanFactory.fromPosition(text, match.index, match.index + phrase.length, FilterType.BIOMETRIC, {
          confidence: 0.91,
          priority: this.getPriority(),
          pattern: "Genetic test reference",
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 5: Biometric ID codes
   * Detects formatted biometric identifiers like:
   * - IRIS-129384, IRIS-ABC123 (iris scan IDs)
   * - DNA-3928475, DNA-SAMPLE-123 (DNA sample IDs)
   * - RET-847392, RETINAL-ID-456 (retinal scan IDs)
   * - FP-392847, FINGERPRINT-789 (fingerprint IDs)
   * - VP-847392, VOICEPRINT-321 (voiceprint IDs)
   * - BIOID-123456, BIO-ID-789 (generic biometric IDs)
   * - PALM-123456, HAND-GEO-789 (palm/hand geometry IDs)
   * - FACE-ID-123, FACIAL-REC-456 (facial recognition IDs)
   */
  private detectBiometricIdCodes(text: string, spans: Span[]): void {
    // Biometric ID prefixes - comprehensive list
    const biometricPrefixes = [
      // Iris/Eye
      "IRIS",
      "EYE",
      "RETINAL",
      "RET",
      "RETINA",
      // DNA/Genetic
      "DNA",
      "GENETIC",
      "GENOME",
      "GENO",
      "GEN",
      // Fingerprint
      "FP",
      "FINGERPRINT",
      "FINGER",
      "THUMB",
      "THUMBPRINT",
      // Voiceprint
      "VP",
      "VOICEPRINT",
      "VOICE",
      "VOCAL",
      // Palm/Hand
      "PALM",
      "HAND",
      "HANDGEO",
      "PALMPRINT",
      // Face
      "FACE",
      "FACIAL",
      "FACEREC",
      // Generic biometric
      "BIO",
      "BIOID",
      "BIOMETRIC",
      "BIOIDENT",
      // Vein patterns
      "VEIN",
      "VEINPAT",
    ];

    // Build regex pattern for PREFIX-ALPHANUMERIC format
    // Matches: PREFIX-NUMBER, PREFIX-ALPHANUMERIC, PREFIX-WORD-NUMBER
    const prefixPattern = biometricPrefixes.join("|");

    // Pattern: PREFIX-ID where ID is alphanumeric (at least 4 chars)
    // Also handles compound prefixes like DNA-SAMPLE-123
    const pattern = new RegExp(
      `\\b((?:${prefixPattern})(?:-[A-Z0-9]+){1,3})\\b`,
      "gi",
    );

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const idCode = match[1];

      // Validate: Must have at least one numeric component or be sufficiently long
      const hasNumeric = /\d{3,}/.test(idCode);
      const isLongEnough = idCode.length >= 8;

      if (!hasNumeric && !isLongEnough) {
        continue; // Skip short non-numeric matches like "DNA-TEST"
      }

      // Skip common false positives
      const lowerCode = idCode.toLowerCase();
      if (
        lowerCode.includes("-test") ||
        lowerCode.includes("-result") ||
        lowerCode.includes("-type") ||
        lowerCode.includes("-analysis")
      ) {
        continue;
      }

      const span = SpanFactory.fromPosition(text, match.index, match.index + idCode.length, FilterType.BIOMETRIC, {
        confidence: 0.95,
        priority: this.getPriority(),
        pattern: "Biometric ID code",
      });
      spans.push(span);
    }

    // Additional pattern: Labeled biometric IDs
    // Matches: "Iris Scan ID: ABC123", "Fingerprint ID: 12345", etc.
    const labeledPattern = new RegExp(
      `\\b(?:iris|retinal?|dna|genetic|fingerprint|voiceprint|biometric|palm|facial?)\\s*(?:scan)?\\s*(?:id|identifier|code|number|#|no\\.?)\\s*[:\\-]?\\s*([A-Z0-9][A-Z0-9\\-]{4,})\\b`,
      "gi",
    );

    labeledPattern.lastIndex = 0;

    while ((match = labeledPattern.exec(text)) !== null) {
      const fullMatch = match[0];

      const span = SpanFactory.fromPosition(text, match.index, match.index + fullMatch.length, FilterType.BIOMETRIC, {
        confidence: 0.96,
        priority: this.getPriority(),
        pattern: "Labeled biometric identifier",
      });
      spans.push(span);
    }
  }

  /**
   * Validation: Check if text is a valid biometric reference (filters false positives)
   */
  private isBiometricReference(text: string): boolean {
    const lowerText = text.toLowerCase();

    // False positive filters
    const falsePositives = [
      "generic test",
      "routine screening",
      "standard procedure",
      "common finding",
      "typical appearance",
      "normal variation",
    ];

    if (falsePositives.some((fp) => lowerText.includes(fp))) {
      return false;
    }

    // Must contain at least one biometric keyword
    const hasBiometricKeyword = this.BIOMETRIC_KEYWORDS.some((keyword) =>
      lowerText.includes(keyword.toLowerCase()),
    );

    if (!hasBiometricKeyword) {
      return false;
    }

    // Must be substantial (avoid single words)
    if (text.trim().split(/\s+/).length < 3) {
      return false;
    }

    return true;
  }
}
