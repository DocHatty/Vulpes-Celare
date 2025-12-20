/**
 * Adversarial Defense Module
 *
 * Provides protection against adversarial attacks on PHI detection:
 * - Unicode homoglyph attacks (Cyrillic/Greek lookalikes)
 * - Zero-width character insertion
 * - Mixed script obfuscation
 *
 * @module adversarial
 */

export { UnicodeNormalizer, type NormalizationResult, type FlaggedChar } from './UnicodeNormalizer';
