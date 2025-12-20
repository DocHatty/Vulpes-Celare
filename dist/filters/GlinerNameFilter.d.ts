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
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
/**
 * GLiNER-based name detection filter
 */
export declare class GlinerNameFilter extends SpanBasedFilter {
    private inference;
    private loadingPromise;
    private loadFailed;
    getType(): string;
    getPriority(): number;
    /**
     * Check if this filter should run based on configuration
     */
    private shouldRun;
    /**
     * Lazy-load the GLiNER model
     */
    private ensureModelLoaded;
    /**
     * Load the GLiNER model
     */
    private loadModel;
    /**
     * Detect names using GLiNER
     */
    detect(text: string, _config: any, _context: RedactionContext): Promise<Span[]>;
    /**
     * Check if text should be whitelisted (not treated as PHI)
     */
    private isWhitelisted;
    /**
     * Create a Span from a GLiNER entity
     */
    private createSpanFromEntity;
}
export default GlinerNameFilter;
//# sourceMappingURL=GlinerNameFilter.d.ts.map