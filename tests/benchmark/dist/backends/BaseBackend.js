"use strict";
/**
 * ============================================================================
 * BASE BACKEND
 * ============================================================================
 *
 * Abstract base class for all detection backends.
 * Provides common functionality and integrates with VulpesCelare core.
 *
 * @module benchmark/backends/BaseBackend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBackend = void 0;
// We'll dynamically require VulpesCelare to avoid module caching issues
// This allows HermeticEnvironment to work properly
/**
 * Abstract base class for detection backends
 */
class BaseBackend {
    initialized = false;
    initializationTime = null;
    lastError = null;
    /**
     * Initialize the backend
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Verify the environment is set correctly for this mode
            const expectedMode = this.getDetectionMode();
            const actualMode = process.env.VULPES_NAME_DETECTION_MODE;
            if (actualMode !== expectedMode) {
                console.warn(`[${this.id}] Warning: Expected VULPES_NAME_DETECTION_MODE=${expectedMode}, got ${actualMode}`);
            }
            // Perform any backend-specific initialization
            await this.doInitialize();
            this.initialized = true;
            this.initializationTime = new Date();
            this.lastError = null;
        }
        catch (error) {
            this.lastError = error instanceof Error ? error : new Error(String(error));
            throw error;
        }
    }
    /**
     * Backend-specific initialization (override in subclasses)
     */
    async doInitialize() {
        // Default: no-op
    }
    /**
     * Detect PHI in a document
     */
    async detect(document) {
        if (!this.initialized) {
            await this.initialize();
        }
        const startTime = performance.now();
        const warnings = [];
        try {
            // Dynamically require VulpesCelare to get fresh instance
            // This is important for HermeticEnvironment to work
            const vulpesPath = require.resolve('../../../dist/VulpesCelare.js');
            delete require.cache[vulpesPath];
            const { VulpesCelare } = require(vulpesPath);
            // Process document through VulpesCelare
            const result = await VulpesCelare.redactWithDetails(document.text);
            // Extract spans from the report
            const spans = this.extractSpans(document.text, result);
            const processingTimeMs = performance.now() - startTime;
            return {
                documentId: document.id,
                spans,
                processingTimeMs,
                filtersExecuted: result.report?.filterResults?.length,
                configuration: this.getConfiguration(),
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        }
        catch (error) {
            this.lastError = error instanceof Error ? error : new Error(String(error));
            throw error;
        }
    }
    /**
     * Extract detected spans from VulpesCelare result
     */
    extractSpans(originalText, result) {
        const spans = [];
        // If we have a detailed report, extract spans from it
        if (result.report?.filterResults) {
            for (const filterResult of result.report.filterResults) {
                if (filterResult.spans) {
                    for (const span of filterResult.spans) {
                        spans.push({
                            start: span.start ?? span.characterStart ?? 0,
                            end: span.end ?? span.characterEnd ?? 0,
                            text: span.text ?? originalText.slice(span.start, span.end),
                            type: this.normalizeType(span.type ?? filterResult.filterType),
                            confidence: span.confidence ?? 0.9,
                            source: filterResult.filterType,
                        });
                    }
                }
            }
        }
        // Fallback: parse redacted text to find spans
        if (spans.length === 0 && result.text) {
            const redactedSpans = this.parseRedactedText(originalText, result.text);
            spans.push(...redactedSpans);
        }
        return spans;
    }
    /**
     * Parse redacted text to extract spans by comparing with original
     */
    parseRedactedText(original, redacted) {
        const spans = [];
        // Find all [TYPE] tokens in redacted text
        const tokenRegex = /\[([A-Z_-]+)\]/g;
        let match;
        let redactedIndex = 0;
        let originalIndex = 0;
        while ((match = tokenRegex.exec(redacted)) !== null) {
            const type = match[1].toLowerCase().replace(/-/g, '_');
            const tokenStart = match.index;
            // Skip to find the original text that was redacted
            // This is approximate - we track positions to estimate
            const beforeToken = redacted.slice(redactedIndex, tokenStart);
            // Advance original text by same amount
            originalIndex += beforeToken.length;
            // Find end of original span (approximate)
            // Look for next non-redacted text alignment
            const afterToken = redacted.slice(match.index + match[0].length, match.index + match[0].length + 50);
            const afterInOriginal = original.indexOf(afterToken.trim(), originalIndex);
            let spanEnd = afterInOriginal > originalIndex ? afterInOriginal : originalIndex + 10;
            const spanStart = originalIndex;
            if (spanStart < original.length && spanEnd <= original.length) {
                spans.push({
                    start: spanStart,
                    end: spanEnd,
                    text: original.slice(spanStart, spanEnd),
                    type: this.normalizeType(type),
                    confidence: 0.9,
                    source: this.id,
                });
            }
            redactedIndex = match.index + match[0].length;
        }
        return spans;
    }
    /**
     * Normalize PHI type to standard format
     */
    normalizeType(type) {
        const typeMap = {
            'NAME': 'name',
            'SSN': 'ssn',
            'SOCIAL-SECURITY': 'ssn',
            'PHONE': 'phone',
            'EMAIL': 'email',
            'ADDRESS': 'address',
            'DATE': 'date',
            'DOB': 'date',
            'MRN': 'mrn',
            'IP': 'ip',
            'URL': 'url',
            'CREDIT-CARD': 'credit_card',
            'ACCOUNT': 'account',
            'HEALTH-PLAN': 'health_plan',
            'LICENSE': 'license',
            'PASSPORT': 'passport',
            'VEHICLE': 'vehicle',
            'DEVICE': 'device',
            'BIOMETRIC': 'biometric',
            'ZIP': 'zip',
            'FAX': 'fax',
            'AGE': 'age',
        };
        const normalized = type.toUpperCase().replace(/_/g, '-');
        return typeMap[normalized] || type.toLowerCase();
    }
    /**
     * Batch detection (default: sequential)
     */
    async detectBatch(documents) {
        const results = [];
        for (const doc of documents) {
            results.push(await this.detect(doc));
        }
        return results;
    }
    /**
     * Shutdown the backend
     */
    async shutdown() {
        this.initialized = false;
        this.initializationTime = null;
    }
    /**
     * Get current configuration
     */
    getConfiguration() {
        return {
            backendId: this.id,
            mode: this.getDetectionMode(),
            environmentVariables: {
                VULPES_NAME_DETECTION_MODE: process.env.VULPES_NAME_DETECTION_MODE,
                VULPES_USE_GLINER: process.env.VULPES_USE_GLINER,
                VULPES_USE_ML_CONFIDENCE: process.env.VULPES_USE_ML_CONFIDENCE,
                VULPES_USE_ML_FP_FILTER: process.env.VULPES_USE_ML_FP_FILTER,
                VULPES_RUST_ACCEL: process.env.VULPES_RUST_ACCEL,
                VULPES_DFA_SCAN: process.env.VULPES_DFA_SCAN,
            },
            featureToggles: this.getFeatureToggles(),
            version: this.getVersion(),
        };
    }
    /**
     * Get feature toggles snapshot
     */
    getFeatureToggles() {
        try {
            const togglesPath = require.resolve('../../../dist/config/FeatureToggles.js');
            delete require.cache[togglesPath];
            const { FeatureToggles } = require(togglesPath);
            return {
                glinerEnabled: FeatureToggles.isGlinerEnabled?.() ?? false,
                mlConfidenceEnabled: FeatureToggles.isMLConfidenceEnabled?.() ?? false,
                rustAccelEnabled: FeatureToggles.isRustAccelEnabled?.() ?? true,
                datalogEnabled: FeatureToggles.isDatalogEnabled?.() ?? true,
            };
        }
        catch {
            return {};
        }
    }
    /**
     * Get version information
     */
    getVersion() {
        try {
            const vulpesPath = require.resolve('../../../dist/VulpesCelare.js');
            delete require.cache[vulpesPath];
            const { VulpesCelare } = require(vulpesPath);
            return VulpesCelare.VERSION || '1.0.0';
        }
        catch {
            return 'unknown';
        }
    }
    /**
     * Get backend health
     */
    async getHealth() {
        const components = [];
        // Check initialization
        components.push({
            name: 'initialization',
            status: this.initialized ? 'healthy' : 'unhealthy',
            message: this.initialized
                ? `Initialized at ${this.initializationTime?.toISOString()}`
                : 'Not initialized',
        });
        // Check environment
        const expectedMode = this.getDetectionMode();
        const actualMode = process.env.VULPES_NAME_DETECTION_MODE;
        components.push({
            name: 'environment',
            status: actualMode === expectedMode ? 'healthy' : 'degraded',
            message: `Mode: ${actualMode} (expected: ${expectedMode})`,
        });
        // Check for recent errors
        if (this.lastError) {
            components.push({
                name: 'errors',
                status: 'degraded',
                message: this.lastError.message,
            });
        }
        const allHealthy = components.every((c) => c.status === 'healthy');
        const anyUnhealthy = components.some((c) => c.status === 'unhealthy');
        return {
            ready: allHealthy || (!anyUnhealthy && this.initialized),
            timestamp: new Date(),
            components,
            lastError: this.lastError || undefined,
        };
    }
    /**
     * Get backend capabilities
     */
    getCapabilities() {
        return {
            batchProcessing: true,
            streaming: false,
            gpuAcceleration: false,
            supportedPHITypes: [
                'name', 'ssn', 'phone', 'email', 'address', 'date', 'mrn',
                'ip', 'url', 'credit_card', 'account', 'health_plan', 'license',
                'passport', 'vehicle', 'device', 'biometric', 'zip', 'fax', 'age',
            ],
            maxDocumentLength: 1_000_000, // 1MB
        };
    }
}
exports.BaseBackend = BaseBackend;
//# sourceMappingURL=BaseBackend.js.map