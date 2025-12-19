"use strict";
/**
 * GlinerNameFilter - ML-Based Name Detection using GLiNER
 *
 * This filter uses the GLiNER (Generalist and Lightweight NER) model
 * for zero-shot name detection. It can run alongside SmartNameFilterSpan
 * (hybrid mode) or as the sole name detector (gliner mode).
 *
 * Features:
 * - Zero-shot detection of patient/provider/family names
 * - Better OCR error tolerance via learned representations
 * - Lower maintenance than regex patterns
 * - Configurable entity labels
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlinerNameFilter = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const GlinerInference_1 = require("../ml/GlinerInference");
const ModelManager_1 = require("../ml/ModelManager");
const FeatureToggles_1 = require("../config/FeatureToggles");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("GlinerNameFilter");
/**
 * Entity labels recognized by GLiNER for PHI detection
 */
const PHI_ENTITY_LABELS = [
    "patient_name",
    "provider_name",
    "person_name",
    "family_member",
];
/**
 * Map GLiNER labels to Span patterns for tracking
 */
const LABEL_TO_PATTERN = {
    patient_name: "GLiNER-patient",
    provider_name: "GLiNER-provider",
    person_name: "GLiNER-person",
    family_member: "GLiNER-family",
};
/**
 * Minimum confidence thresholds by label type
 */
const LABEL_THRESHOLDS = {
    patient_name: 0.60,
    provider_name: 0.65,
    person_name: 0.70,
    family_member: 0.65,
};
/**
 * GLiNER-based name detection filter
 */
class GlinerNameFilter extends SpanBasedFilter_1.SpanBasedFilter {
    inference = null;
    loadingPromise = null;
    loadFailed = false;
    getType() {
        return "NAME";
    }
    getPriority() {
        // Slightly lower priority than SmartNameFilterSpan
        // In hybrid mode, rule-based detections win overlaps
        return SpanBasedFilter_1.FilterPriority.NAME - 5;
    }
    /**
     * Check if this filter should run based on configuration
     */
    shouldRun() {
        const mode = FeatureToggles_1.FeatureToggles.getNameDetectionMode();
        // Skip if in rules-only mode
        if (mode === "rules") {
            return false;
        }
        // Skip if GLiNER feature is disabled
        if (!FeatureToggles_1.FeatureToggles.isGlinerEnabled()) {
            return false;
        }
        // Skip if model already failed to load
        if (this.loadFailed) {
            return false;
        }
        return true;
    }
    /**
     * Lazy-load the GLiNER model
     */
    async ensureModelLoaded() {
        if (this.inference) {
            return true;
        }
        if (this.loadFailed) {
            return false;
        }
        if (this.loadingPromise) {
            await this.loadingPromise;
            return this.inference !== null;
        }
        // Check if model is available
        if (!ModelManager_1.ModelManager.modelAvailable("gliner")) {
            logger.warn("GLiNER model not found. Run 'npm run models:download' to download.");
            this.loadFailed = true;
            return false;
        }
        // Start loading
        this.loadingPromise = this.loadModel();
        await this.loadingPromise;
        return this.inference !== null;
    }
    /**
     * Load the GLiNER model
     */
    async loadModel() {
        try {
            logger.info("Loading GLiNER model...");
            this.inference = await GlinerInference_1.GlinerInference.create();
            logger.info("GLiNER model loaded successfully");
        }
        catch (error) {
            logger.error(`Failed to load GLiNER model: ${error}`);
            this.loadFailed = true;
            this.inference = null;
        }
    }
    /**
     * Detect names using GLiNER
     */
    async detect(text, _config, _context) {
        // Check if we should run
        if (!this.shouldRun()) {
            return [];
        }
        // Ensure model is loaded
        const modelReady = await this.ensureModelLoaded();
        if (!modelReady || !this.inference) {
            return [];
        }
        // Run GLiNER inference
        const entities = await this.inference.predict(text, PHI_ENTITY_LABELS, 0.5 // Use lower threshold, we'll filter by label-specific thresholds
        );
        // Convert entities to spans with filtering
        const spans = [];
        for (const entity of entities) {
            // Apply label-specific threshold
            const threshold = LABEL_THRESHOLDS[entity.label] || 0.65;
            if (entity.score < threshold) {
                continue;
            }
            // Skip if it's a medical term or whitelisted
            if (this.isWhitelisted(entity.text, text)) {
                continue;
            }
            // Skip very short matches (likely false positives)
            if (entity.text.length < 2) {
                continue;
            }
            // Skip if it looks like a number or code
            if (/^\d+$/.test(entity.text) || /^[A-Z]{1,3}\d+$/.test(entity.text)) {
                continue;
            }
            // Create span
            const span = this.createSpanFromEntity(entity, text);
            spans.push(span);
        }
        logger.debug(`GLiNER detected ${spans.length} name spans`);
        return spans;
    }
    /**
     * Check if text should be whitelisted (not treated as PHI)
     */
    isWhitelisted(text, fullText) {
        const lowerText = text.toLowerCase();
        // Use unified whitelist
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(text, Span_1.FilterType.NAME, fullText)) {
            return true;
        }
        // Check if it's a medical term
        if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(lowerText)) {
            return true;
        }
        // Skip common non-name words
        const commonWords = new Set([
            "the", "and", "for", "with", "from", "that", "this",
            "have", "has", "had", "been", "were", "was", "are",
            "patient", "doctor", "nurse", "hospital", "clinic",
            "diagnosis", "treatment", "medication", "history",
            "assessment", "plan", "findings", "impression",
            "review", "systems", "examination", "physical",
        ]);
        if (commonWords.has(lowerText)) {
            return true;
        }
        // Skip ALL CAPS that look like section headers
        if (text === text.toUpperCase() &&
            text.length > 3 &&
            !text.includes(" ")) {
            return true;
        }
        return false;
    }
    /**
     * Create a Span from a GLiNER entity
     */
    createSpanFromEntity(entity, text) {
        const pattern = LABEL_TO_PATTERN[entity.label] || "GLiNER-unknown";
        // Adjust confidence based on entity characteristics
        let adjustedConfidence = entity.score;
        // Boost confidence for multi-word names
        if (entity.text.includes(" ") && entity.text.split(/\s+/).length >= 2) {
            adjustedConfidence = Math.min(0.98, adjustedConfidence + 0.10);
        }
        // Boost confidence for capitalized names
        if (/^[A-Z][a-z]+/.test(entity.text)) {
            adjustedConfidence = Math.min(0.98, adjustedConfidence + 0.05);
        }
        // Reduce confidence for very short names
        if (entity.text.length < 4) {
            adjustedConfidence *= 0.9;
        }
        return new Span_1.Span({
            text: entity.text,
            originalValue: entity.text,
            characterStart: entity.start,
            characterEnd: entity.end,
            filterType: Span_1.FilterType.NAME,
            confidence: adjustedConfidence,
            priority: this.getPriority(),
            context: this.getContext(text, entity.start, entity.end - entity.start),
            window: [],
            replacement: null,
            salt: null,
            pattern,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
        });
    }
    /**
     * Extract context around a match
     */
    getContext(text, start, length) {
        const contextSize = 50;
        const contextStart = Math.max(0, start - contextSize);
        const contextEnd = Math.min(text.length, start + length + contextSize);
        return text.slice(contextStart, contextEnd);
    }
}
exports.GlinerNameFilter = GlinerNameFilter;
exports.default = GlinerNameFilter;
//# sourceMappingURL=GlinerNameFilter.js.map