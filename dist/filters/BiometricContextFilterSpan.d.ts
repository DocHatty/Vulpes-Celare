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
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class BiometricContextFilterSpan extends SpanBasedFilter {
    /**
     * Comprehensive biometric keywords
     */
    private readonly BIOMETRIC_KEYWORDS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Pattern 1: Sentence-level detection with biometric keywords
     */
    private detectBiometricSentences;
    /**
     * Pattern 2: Explicit descriptor phrases
     */
    private detectDescriptorPhrases;
    /**
     * Pattern 3: Photograph/Image references
     */
    private detectPhotographReferences;
    /**
     * Pattern 4: DNA/Genetic test results
     */
    private detectGeneticTests;
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
    private detectBiometricIdCodes;
    /**
     * Validation: Check if text is a valid biometric reference (filters false positives)
     */
    private isBiometricReference;
}
//# sourceMappingURL=BiometricContextFilterSpan.d.ts.map