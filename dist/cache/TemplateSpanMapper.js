"use strict";
/**
 * TemplateSpanMapper - Maps Cached Spans to New Documents
 *
 * When a cache hit is found for a document structure, this module maps
 * the cached span positions to the new document's actual positions.
 *
 * ALGORITHM:
 * 1. Compare field labels between cached and new document
 * 2. For each cached span, find the corresponding field in the new document
 * 3. Calculate position offset based on field position differences
 * 4. Verify mapped span text matches expected PHI type patterns
 *
 * SECURITY:
 * - All mapped spans are validated before use
 * - Confidence is reduced for mapped spans (vs direct detection)
 * - Mapping failures result in full pipeline execution
 *
 * @module cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSpanMapper = void 0;
const Span_1 = require("../models/Span");
const SpanFactory_1 = require("../core/SpanFactory");
const StructureExtractor_1 = require("./StructureExtractor");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    minMappingConfidence: 0.7,
    minOverallConfidence: 0.8,
    maxFailedRatio: 0.1,
    validatePatterns: true,
    mappedConfidencePenalty: 0.05,
};
/**
 * Validation patterns for PHI types
 */
const PHI_VALIDATION_PATTERNS = {
    [Span_1.FilterType.SSN]: /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/,
    [Span_1.FilterType.PHONE]: /^[\d\s\-\(\)\.+]{10,20}$/,
    [Span_1.FilterType.EMAIL]: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    [Span_1.FilterType.DATE]: /^[\d\/\-\.]+$/,
    [Span_1.FilterType.MRN]: /^[\dA-Z\-]+$/i,
    [Span_1.FilterType.ZIPCODE]: /^\d{5}(-\d{4})?$/,
    [Span_1.FilterType.AGE]: /^\d{1,3}$/,
};
/**
 * TemplateSpanMapper - Maps cached spans to new documents
 */
class TemplateSpanMapper {
    config;
    structureExtractor;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.structureExtractor = new StructureExtractor_1.StructureExtractor();
    }
    /**
     * Convert detected spans to cacheable format
     */
    toCachedSpans(spans, structure) {
        return spans.map((span) => {
            // Find which field this span belongs to
            const { fieldIndex, offset } = this.findFieldForSpan(span, structure.fields);
            return {
                filterType: span.filterType,
                confidence: span.confidence,
                priority: span.priority,
                pattern: span.pattern,
                fieldIndex,
                offsetFromFieldStart: offset,
                length: span.text.length,
                originalText: span.text,
            };
        });
    }
    /**
     * Find which field a span belongs to and calculate offset
     */
    findFieldForSpan(span, fields) {
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (span.characterStart >= field.valueStart &&
                span.characterEnd <= field.valueEnd) {
                return {
                    fieldIndex: i,
                    offset: span.characterStart - field.valueStart,
                };
            }
        }
        // Span doesn't belong to any field
        return { fieldIndex: -1, offset: span.characterStart };
    }
    /**
     * Map cached spans to a new document
     */
    mapSpans(newText, cachedResult) {
        // Extract structure from new document
        const newStructure = this.structureExtractor.extract(newText);
        // Compare structures
        const structureSimilarity = StructureExtractor_1.StructureExtractor.compare(cachedResult.structure, newStructure);
        // If structures are too different, mapping is unreliable
        if (structureSimilarity < 0.7) {
            return {
                mappedSpans: [],
                failedMappings: cachedResult.spans.length,
                overallConfidence: structureSimilarity,
                isReliable: false,
                failureReason: `Structure similarity too low: ${(structureSimilarity * 100).toFixed(1)}%`,
            };
        }
        // Build field mapping between cached and new structures
        const fieldMapping = this.buildFieldMapping(cachedResult.structure.fields, newStructure.fields);
        // Map each cached span
        const mappedSpans = [];
        let failedMappings = 0;
        for (const cachedSpan of cachedResult.spans) {
            const mapped = this.mapSingleSpan(cachedSpan, newText, newStructure.fields, fieldMapping);
            if (mapped) {
                mappedSpans.push(mapped);
            }
            else {
                failedMappings++;
            }
        }
        // Calculate overall reliability
        const totalSpans = cachedResult.spans.length;
        const successRatio = totalSpans > 0 ? (totalSpans - failedMappings) / totalSpans : 0;
        const avgMappingConfidence = mappedSpans.length > 0
            ? mappedSpans.reduce((sum, m) => sum + m.mappingConfidence, 0) / mappedSpans.length
            : 0;
        const overallConfidence = structureSimilarity * 0.4 + successRatio * 0.3 + avgMappingConfidence * 0.3;
        const failedRatio = totalSpans > 0 ? failedMappings / totalSpans : 0;
        const isReliable = overallConfidence >= this.config.minOverallConfidence &&
            failedRatio <= this.config.maxFailedRatio;
        return {
            mappedSpans,
            failedMappings,
            overallConfidence,
            isReliable,
            failureReason: isReliable
                ? undefined
                : `Mapping not reliable: confidence=${(overallConfidence * 100).toFixed(1)}%, failed=${failedMappings}/${totalSpans}`,
        };
    }
    /**
     * Build mapping between cached fields and new fields
     */
    buildFieldMapping(cachedFields, newFields) {
        const mapping = new Map();
        for (let i = 0; i < cachedFields.length; i++) {
            const cachedField = cachedFields[i];
            // Find matching field in new document by label
            const matchIndex = newFields.findIndex((newField) => newField.label.toUpperCase() === cachedField.label.toUpperCase() &&
                newField.expectedType === cachedField.expectedType);
            if (matchIndex >= 0) {
                mapping.set(i, matchIndex);
            }
        }
        return mapping;
    }
    /**
     * Map a single cached span to the new document
     */
    mapSingleSpan(cachedSpan, newText, newFields, fieldMapping) {
        let newStart;
        let newEnd;
        let mappingConfidence = 1.0;
        if (cachedSpan.fieldIndex >= 0) {
            // Span belongs to a field - use field mapping
            const newFieldIndex = fieldMapping.get(cachedSpan.fieldIndex);
            if (newFieldIndex === undefined) {
                return null; // Field not found in new document
            }
            const newField = newFields[newFieldIndex];
            newStart = newField.valueStart + cachedSpan.offsetFromFieldStart;
            newEnd = newStart + cachedSpan.length;
            // Adjust if new field value is shorter
            if (newEnd > newField.valueEnd) {
                // Try to find actual value end
                const valueRegion = newText.substring(newField.valueStart, newField.valueEnd);
                const trimmedLength = valueRegion.trim().length;
                if (trimmedLength > 0) {
                    newEnd = Math.min(newEnd, newField.valueStart + trimmedLength);
                    mappingConfidence *= 0.9; // Reduce confidence for adjusted mapping
                }
                else {
                    return null; // No value in field
                }
            }
        }
        else {
            // Standalone span - use absolute position with adjustment
            // This is less reliable as document structure may have shifted
            newStart = cachedSpan.offsetFromFieldStart;
            newEnd = newStart + cachedSpan.length;
            mappingConfidence *= 0.7; // Lower confidence for absolute positioning
            // Bounds check
            if (newEnd > newText.length) {
                return null;
            }
        }
        // Validate positions before proceeding
        if (newStart < 0 || newEnd < 0 || newStart >= newEnd || newEnd > newText.length) {
            return null; // Invalid positions - cannot map this span
        }
        // Extract mapped text
        const mappedText = newText.substring(newStart, newEnd);
        // Validate the mapped text
        let validated = false;
        if (this.config.validatePatterns) {
            validated = this.validateMappedText(mappedText, cachedSpan.filterType);
            if (!validated) {
                mappingConfidence *= 0.5; // Significant penalty for failed validation
            }
        }
        // Create the mapped span
        const span = SpanFactory_1.SpanFactory.fromPosition(newText, newStart, newEnd, cachedSpan.filterType, {
            confidence: cachedSpan.confidence * (1 - this.config.mappedConfidencePenalty),
            priority: cachedSpan.priority,
            pattern: cachedSpan.pattern ? `cached:${cachedSpan.pattern}` : "cached",
        });
        return {
            span,
            mappingConfidence,
            validated,
        };
    }
    /**
     * Validate that mapped text matches expected PHI pattern
     */
    validateMappedText(text, filterType) {
        const pattern = PHI_VALIDATION_PATTERNS[filterType];
        if (!pattern) {
            // No validation pattern for this type - assume valid
            return true;
        }
        return pattern.test(text.trim());
    }
    /**
     * Estimate memory usage of a cached result
     */
    static estimateMemoryUsage(result) {
        let bytes = 0;
        // Structure
        bytes += result.structure.skeleton.length * 2; // UTF-16
        bytes += result.structure.hash.length;
        bytes += result.structure.fields.length * 100; // Estimate per field
        // Spans
        for (const span of result.spans) {
            bytes += span.originalText.length * 2;
            bytes += (span.pattern?.length || 0) * 2;
            bytes += 50; // Fixed overhead per span
        }
        return bytes;
    }
}
exports.TemplateSpanMapper = TemplateSpanMapper;
//# sourceMappingURL=TemplateSpanMapper.js.map