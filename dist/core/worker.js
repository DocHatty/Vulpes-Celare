"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const FilterRegistry_1 = require("../filters/FilterRegistry");
const VulpesLogger_1 = require("../utils/VulpesLogger");
// Simple RedactionContext mock for workers
// We can't pass the full context object as it contains methods/state that isn't serializable
// and we don't want workers modifying the main context state directly anyway.
const mockContext = {
    getMemo: () => undefined,
    setMemo: () => { },
    createToken: () => "TOKEN_PLACEHOLDER",
    // Add other methods if filters crash accessing them, but usually they shouldn't in detect()
};
if (!worker_threads_1.isMainThread && worker_threads_1.parentPort) {
    // Initialize registry on worker startup
    // This loads all filter classes
    FilterRegistry_1.FilterRegistry.initialize().catch(err => {
        VulpesLogger_1.vulpesLogger.error("Worker initialization failed", { error: String(err) });
        process.exit(1);
    });
    worker_threads_1.parentPort.on("message", async (message) => {
        const { taskId, filterName, text, config } = message;
        try {
            // Ensure registry is ready
            if (!FilterRegistry_1.FilterRegistry.isReady()) {
                await FilterRegistry_1.FilterRegistry.initialize();
            }
            // Find the filter instance
            const filters = FilterRegistry_1.FilterRegistry.getAllSpanFilters();
            const filter = filters.find(f => f.constructor.name === filterName);
            if (!filter) {
                throw new Error(`Filter not found: ${filterName}`);
            }
            // Execute detection
            const spans = await Promise.resolve(filter.detect(text, config, mockContext));
            // Return serialized spans (worker_threads handles basic cloning, but we want pure JSON for performance/safety)
            const serializedSpans = spans.map(s => ({
                ...s,
                // Ensure no hidden non-serializable properties (like methods usually on prototype, which clone nicely)
                // Span object properties are mostly primitives/objects.
            }));
            worker_threads_1.parentPort?.postMessage({
                taskId,
                success: true,
                spans: serializedSpans
            });
        }
        catch (error) {
            worker_threads_1.parentPort?.postMessage({
                taskId,
                success: false,
                error: String(error)
            });
        }
    });
}
//# sourceMappingURL=worker.js.map