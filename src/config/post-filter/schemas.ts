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
export const PostFilterCategorySchema = z.enum([
  "section_headings",
  "single_word_headings",
  "structure_words",
  "medical_phrases",
  "geo_terms",
  "field_labels",
  "invalid_endings",
]);

export type PostFilterCategory = z.infer<typeof PostFilterCategorySchema>;

/**
 * Metadata about the config file
 */
export const PostFilterMetadataSchema = z.object({
  lastUpdated: z.string(),
  source: z.string().optional(),
  maintainer: z.string().optional(),
  notes: z.string().optional(),
});

export type PostFilterMetadata = z.infer<typeof PostFilterMetadataSchema>;

/**
 * Schema for post-filter term configuration files
 */
export const PostFilterTermsSchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  description: z.string(),
  category: PostFilterCategorySchema,
  terms: z.array(z.string()).min(1),
  metadata: PostFilterMetadataSchema.optional(),
});

export type PostFilterTerms = z.infer<typeof PostFilterTermsSchema>;

/**
 * Schema for the combined config (all categories)
 */
export const PostFilterConfigSchema = z.object({
  sectionHeadings: z.set(z.string()),
  singleWordHeadings: z.set(z.string()),
  structureWords: z.set(z.string()),
  medicalPhrases: z.set(z.string()),
  geoTerms: z.set(z.string()),
  fieldLabels: z.set(z.string()),
  invalidEndings: z.array(z.string()),
});

export type PostFilterConfig = z.infer<typeof PostFilterConfigSchema>;
