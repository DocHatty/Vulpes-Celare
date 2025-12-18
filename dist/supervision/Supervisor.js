"use strict";
/**
 * Supervisor - Elixir/OTP-Style Process Supervision
 *
 * Implements fault-tolerant supervision patterns inspired by Erlang/OTP:
 * - one_for_one: Restart only the failed child
 * - one_for_all: Restart all children if one fails
 * - rest_for_one: Restart failed child and all children started after it
 *
 * SUPERVISION TREE EXAMPLE:
 *   RootSupervisor (one_for_one)
 *   ├── StreamSupervisor (one_for_one)
 *   │   ├── StreamWorker[0]
 *   │   └── StreamWorker[1]
 *   ├── FilterSupervisor (one_for_all)
 *   │   ├── FilterProcess[SSN]
 *   │   └── FilterProcess[PHONE]
 *   └── MetricsSupervisor (one_for_one)
 *       └── HealthMonitor
 *
 * RESTART STRATEGIES:
 * - permanent: Always restart (default for critical processes)
 * - temporary: Never restart (for one-shot tasks)
 * - transient: Restart only on abnormal exit
 *
 * @module redaction/supervision
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Supervisor = void 0;
const events_1 = require("events");
// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
class Supervisor extends events_1.EventEmitter {
    config;
    children = new Map();
    childOrder = [];
    restartHistory = [];
    running = false;
    shuttingDown = false;
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Start the supervisor and all children
     */
    async start() {
        if (this.running)
            return;
        this.running = true;
        this.shuttingDown = false;
        this.emit("starting");
        // Start children in order
        for (const spec of this.config.children) {
            await this.startChild(spec);
        }
        this.emit("started");
    }
    /**
     * Stop the supervisor and all children
     */
    async stop() {
        if (!this.running)
            return;
        this.shuttingDown = true;
        this.emit("stopping");
        // Stop children in reverse order
        const childIds = [...this.childOrder].reverse();
        for (const id of childIds) {
            await this.stopChild(id);
        }
        this.running = false;
        this.emit("stopped");
    }
    /**
     * Start a single child process
     */
    async startChild(spec) {
        try {
            const process = await Promise.resolve(spec.start());
            const managed = {
                spec,
                process,
                startTime: Date.now(),
                restartCount: 0,
            };
            this.children.set(spec.id, managed);
            if (!this.childOrder.includes(spec.id)) {
                this.childOrder.push(spec.id);
            }
            // Run the process and handle exit
            this.runWithSupervision(spec.id, process);
            this.emit("child_started", spec.id);
        }
        catch (error) {
            this.emit("child_start_failed", spec.id, error);
            throw error;
        }
    }
    /**
     * Stop a single child process
     */
    async stopChild(id) {
        const managed = this.children.get(id);
        if (!managed || !managed.process)
            return;
        try {
            // Create timeout for graceful shutdown
            const shutdownPromise = managed.process.stop();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Shutdown timeout")), managed.spec.shutdown);
            });
            await Promise.race([shutdownPromise, timeoutPromise]);
        }
        catch {
            // Force stop on timeout
            this.emit("child_forced_stop", id);
        }
        managed.process = null;
        this.emit("child_stopped", id);
    }
    /**
     * Run a process with supervision (handle failures)
     */
    async runWithSupervision(id, process) {
        try {
            await process.run();
            // Process exited normally
            this.handleChildExit(id, 0);
        }
        catch (error) {
            // Process exited with error
            this.handleChildExit(id, 1, error);
        }
    }
    /**
     * Handle child process exit
     */
    handleChildExit(id, code, error) {
        if (this.shuttingDown)
            return;
        const managed = this.children.get(id);
        if (!managed)
            return;
        this.emit("child_exited", id, code, error);
        // Determine if we should restart
        const shouldRestart = this.shouldRestart(managed.spec, code);
        if (!shouldRestart) {
            managed.process = null;
            return;
        }
        // Check restart limits
        if (!this.checkRestartLimits(id)) {
            this.emit("max_restarts_exceeded", id);
            this.escalate(id);
            return;
        }
        // Apply restart strategy
        this.applyRestartStrategy(id);
    }
    /**
     * Check if a child should be restarted based on its spec
     */
    shouldRestart(spec, exitCode) {
        switch (spec.restart) {
            case "permanent":
                return true;
            case "temporary":
                return false;
            case "transient":
                return exitCode !== 0;
        }
    }
    /**
     * Check if restart limits have been exceeded
     */
    checkRestartLimits(childId) {
        const now = Date.now();
        const cutoff = now - this.config.maxSeconds * 1000;
        // Record this restart
        this.restartHistory.push({ time: now, childId });
        // Clean old records
        this.restartHistory = this.restartHistory.filter((r) => r.time >= cutoff);
        // Count restarts in window
        const restartsInWindow = this.restartHistory.filter((r) => r.childId === childId).length;
        return restartsInWindow <= this.config.maxRestarts;
    }
    /**
     * Apply the configured restart strategy
     */
    async applyRestartStrategy(failedId) {
        switch (this.config.strategy) {
            case "one_for_one":
                await this.restartChild(failedId);
                break;
            case "one_for_all":
                // Stop all children
                for (const id of [...this.childOrder].reverse()) {
                    if (id !== failedId) {
                        await this.stopChild(id);
                    }
                }
                // Restart all children
                for (const spec of this.config.children) {
                    await this.startChild(spec);
                }
                break;
            case "rest_for_one":
                // Find index of failed child
                const failedIndex = this.childOrder.indexOf(failedId);
                // Stop failed child and all after it
                for (let i = this.childOrder.length - 1; i >= failedIndex; i--) {
                    await this.stopChild(this.childOrder[i]);
                }
                // Restart failed child and all after it
                for (let i = failedIndex; i < this.config.children.length; i++) {
                    await this.startChild(this.config.children[i]);
                }
                break;
        }
    }
    /**
     * Restart a single child
     */
    async restartChild(id) {
        const managed = this.children.get(id);
        if (!managed)
            return;
        managed.restartCount++;
        this.emit("child_restarting", id, managed.restartCount);
        await this.stopChild(id);
        await this.startChild(managed.spec);
    }
    /**
     * Escalate failure to parent supervisor or terminate
     */
    escalate(childId) {
        this.emit("escalate", childId);
        // In a full implementation, this would notify parent supervisor
        // For now, we stop the failed child permanently
        const managed = this.children.get(childId);
        if (managed) {
            managed.process = null;
        }
    }
    /**
     * Get supervisor statistics
     */
    getStats() {
        let activeChildren = 0;
        let totalRestarts = 0;
        for (const managed of this.children.values()) {
            if (managed.process?.isRunning())
                activeChildren++;
            totalRestarts += managed.restartCount;
        }
        return {
            running: this.running,
            childCount: this.children.size,
            activeChildren,
            totalRestarts,
            strategy: this.config.strategy,
        };
    }
    /**
     * Get child process by ID
     */
    getChild(id) {
        return this.children.get(id)?.process || null;
    }
    /**
     * Get all child IDs
     */
    getChildIds() {
        return [...this.childOrder];
    }
}
exports.Supervisor = Supervisor;
//# sourceMappingURL=Supervisor.js.map