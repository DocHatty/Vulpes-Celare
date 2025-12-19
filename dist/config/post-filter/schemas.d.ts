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
import { z } from "zod";
/**
 * Valid categories for post-filter term lists
 */
export declare const PostFilterCategorySchema: z.ZodEnum<{
    section_headings: "section_headings";
    single_word_headings: "single_word_headings";
    structure_words: "structure_words";
    medical_phrases: "medical_phrases";
    geo_terms: "geo_terms";
    field_labels: "field_labels";
    invalid_endings: "invalid_endings";
}>;
export type PostFilterCategory = z.infer<typeof PostFilterCategorySchema>;
/**
 * Metadata about the config file
 */
export declare const PostFilterMetadataSchema: z.ZodObject<{
    lastUpdated: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    maintainer: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PostFilterMetadata = z.infer<typeof PostFilterMetadataSchema>;
/**
 * Schema for post-filter term configuration files
 */
export declare const PostFilterTermsSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    version: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<{
        section_headings: "section_headings";
        single_word_headings: "single_word_headings";
        structure_words: "structure_words";
        medical_phrases: "medical_phrases";
        geo_terms: "geo_terms";
        field_labels: "field_labels";
        invalid_endings: "invalid_endings";
    }>;
    terms: z.ZodArray<z.ZodString>;
    metadata: z.ZodOptional<z.ZodObject<{
        lastUpdated: z.ZodString;
        source: z.ZodOptional<z.ZodString>;
        maintainer: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PostFilterTerms = z.infer<typeof PostFilterTermsSchema>;
/**
 * Schema for the combined config (all categories)
 */
export declare const PostFilterConfigSchema: z.ZodObject<{
    sectionHeadings: z.ZodSet<z.ZodString>;
    singleWordHeadings: z.ZodSet<z.ZodString>;
    structureWords: z.ZodSet<z.ZodString>;
    medicalPhrases: z.ZodSet<z.ZodString>;
    geoTerms: z.ZodSet<z.ZodString>;
    fieldLabels: z.ZodSet<z.ZodString>;
    invalidEndings: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type PostFilterConfig = z.infer<typeof PostFilterConfigSchema>;
//# sourceMappingURL=schemas.d.ts.map