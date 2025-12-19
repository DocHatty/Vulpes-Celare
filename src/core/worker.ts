
import { parentPort, isMainThread } from "worker_threads";
import { FilterRegistry } from "../filters/FilterRegistry";
import { RedactionContext } from "../context/RedactionContext";
import { vulpesLogger as log } from "../utils/VulpesLogger";

// Simple RedactionContext mock for workers
// We can't pass the full context object as it contains methods/state that isn't serializable
// and we don't want workers modifying the main context state directly anyway.
const mockContext = {
    getMemo: () => undefined,
    setMemo: () => { },
    createToken: () => "TOKEN_PLACEHOLDER",
    // Add other methods if filters crash accessing them, but usually they shouldn't in detect()
} as unknown as RedactionContext;

if (!isMainThread && parentPort) {
    // Initialize registry on worker startup
    // This loads all filter classes
    FilterRegistry.initialize().catch(err => {
        log.error("Worker initialization failed", { error: String(err) });
        process.exit(1);
    });

    parentPort.on("message", async (message: { taskId: string, filterName: string, text: string, config: any }) => {
        const { taskId, filterName, text, config } = message;

        try {
            // Ensure registry is ready
            if (!FilterRegistry.isReady()) {
                await FilterRegistry.initialize();
            }

            // Find the filter instance
            const filters = FilterRegistry.getAllSpanFilters();
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

            parentPort?.postMessage({
                taskId,
                success: true,
                spans: serializedSpans
            });

        } catch (error) {
            parentPort?.postMessage({
                taskId,
                success: false,
                error: String(error)
            });
        }
    });
}
