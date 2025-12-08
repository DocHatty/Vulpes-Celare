/**
 * FilterWorker - Worker Thread for Parallel Filter Execution
 *
 * This file runs in a separate worker thread to execute filter detection
 * on a different CPU core from the main thread.
 *
 * IMPORTANT: This worker is compiled to FilterWorker.js and run via worker_threads.
 * It cannot import filters directly due to worker serialization constraints.
 * Instead, it uses a filter registry to look up filter implementations.
 *
 * @module redaction/core
 */
export {};
//# sourceMappingURL=FilterWorker.d.ts.map