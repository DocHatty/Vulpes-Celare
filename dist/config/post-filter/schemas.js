"use strict";
/**
 * ============================================================================
 * VULPES CELARE - POST-FILTER CONFIG SCHEMAS
 * ============================================================================
 *
 * Zod schemas for validating externalized post-filter configuration files.
 * These schemas ensure type safety and runtime validation of JSON config files.
 *
 * @module config/post-filter/schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostFilterConfigSchema = exports.PostFilterTermsSchema = exports.PostFilterMetadataSchema = exports.PostFilterCategorySchema = void 0;
const zod_1 = require("zod");
/**
 * Valid categories for post-filter term lists
 */
exports.PostFilterCategorySchema = zod_1.z.enum([
    "section_headings",
    "single_word_headings",
    "structure_words",
    "medical_phrases",
    "geo_terms",
    "field_labels",
    "invalid_endings",
]);
/**
 * Metadata about the config file
 */
exports.PostFilterMetadataSchema = zod_1.z.object({
    lastUpdated: zod_1.z.string(),
    source: zod_1.z.string().optional(),
    maintainer: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
/**
 * Schema for post-filter term configuration files
 */
exports.PostFilterTermsSchema = zod_1.z.object({
    $schema: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    category: exports.PostFilterCategorySchema,
    terms: zod_1.z.array(zod_1.z.string()).min(1),
    metadata: exports.PostFilterMetadataSchema.optional(),
});
/**
 * Schema for the combined config (all categories)
 */
exports.PostFilterConfigSchema = zod_1.z.object({
    sectionHeadings: zod_1.z.set(zod_1.z.string()),
    singleWordHeadings: zod_1.z.set(zod_1.z.string()),
    structureWords: zod_1.z.set(zod_1.z.string()),
    medicalPhrases: zod_1.z.set(zod_1.z.string()),
    geoTerms: zod_1.z.set(zod_1.z.string()),
    fieldLabels: zod_1.z.set(zod_1.z.string()),
    invalidEndings: zod_1.z.array(zod_1.z.string()),
});
//# sourceMappingURL=schemas.js.map