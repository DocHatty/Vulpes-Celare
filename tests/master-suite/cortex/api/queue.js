/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   TEST JOB QUEUE                                                              ║
 * ║   Concurrent Test Execution with Progress Tracking                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Manages a queue of test jobs with:
 * - Configurable concurrency (default: 3 parallel tests)
 * - Progress tracking via database + WebSocket broadcast
 * - Job lifecycle management (pending → running → completed/failed)
 */

const { EventEmitter } = require("events");
const { spawn } = require("child_process");
const path = require("path");

const { getDatabase } = require("../db/database");

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONCURRENCY = 3;
const POLL_INTERVAL_MS = 1000;

// ============================================================================
// JOB QUEUE CLASS
// ============================================================================

class TestJobQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        this.db = options.database || getDatabase();
        this.concurrency = options.concurrency || DEFAULT_CONCURRENCY;
        this.running = new Map(); // jobId -> process
        this.isProcessing = false;
        this.pollInterval = null;
    }

    /**
     * Start the queue processor
     */
    start() {
        if (this.pollInterval) return;

        console.error(`[JobQueue] Started with concurrency: ${this.concurrency}`);
        this.isProcessing = true;
        this.pollInterval = setInterval(() => this.processQueue(), POLL_INTERVAL_MS);
        this.processQueue(); // Immediate first check
    }

    /**
     * Stop the queue processor
     */
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isProcessing = false;
        console.error("[JobQueue] Stopped");
    }

    /**
     * Add a test job to the queue
     */
    enqueue(config) {
        const jobId = this.db.enqueueTest(config);
        console.error(`[JobQueue] Enqueued job: ${jobId}`);
        this.emit("enqueued", { jobId, config });
        return jobId;
    }

    /**
     * Get job status
     */
    getStatus(jobId) {
        return this.db.getTestStatus(jobId);
    }

    /**
     * Cancel a job
     */
    cancel(jobId) {
        const process = this.running.get(jobId);
        if (process) {
            process.kill("SIGTERM");
            this.running.delete(jobId);
        }
        this.db.completeTest(jobId, null, "Cancelled by user");
        this.emit("cancelled", { jobId });
        return true;
    }

    /**
     * Process pending jobs
     */
    async processQueue() {
        if (!this.isProcessing) return;
        if (this.running.size >= this.concurrency) return;

        // Get next pending job
        const job = this.db.getNextPendingTest();
        if (!job) return;

        // Start the job
        await this.startJob(job);
    }

    /**
     * Start a test job
     */
    async startJob(job) {
        const jobId = job.id;
        console.error(`[JobQueue] Starting job: ${jobId}`);

        // Update status to running
        this.db.run(
            "UPDATE test_queue SET status = 'running', started_at = ? WHERE id = ?",
            [new Date().toISOString(), jobId]
        );

        this.emit("started", { jobId, job });

        try {
            // Execute the test
            const result = await this.executeTest(job);

            // Complete successfully
            this.db.completeTest(jobId, result, null);
            this.emit("completed", { jobId, result });
            console.error(`[JobQueue] Completed job: ${jobId}`);
        } catch (error) {
            // Failed
            this.db.completeTest(jobId, null, error.message);
            this.emit("failed", { jobId, error: error.message });
            console.error(`[JobQueue] Failed job: ${jobId} - ${error.message}`);
        } finally {
            this.running.delete(jobId);
        }
    }

    /**
     * Execute a test using the existing test infrastructure
     */
    async executeTest(job) {
        return new Promise((resolve, reject) => {
            const cortexPath = path.join(__dirname, "..", "index.js");

            // Build command arguments
            const args = ["--run-tests"];
            if (job.profile) args.push("--profile", job.profile);
            if (job.document_count) args.push("--documents", job.document_count.toString());
            if (job.quick) args.push("--quick");

            const child = spawn("node", [cortexPath, ...args], {
                cwd: path.join(__dirname, ".."),
                stdio: ["ignore", "pipe", "pipe"],
            });

            this.running.set(job.id, child);

            let stdout = "";
            let stderr = "";
            let lastProgress = 0;

            child.stdout.on("data", (data) => {
                stdout += data.toString();

                // Try to parse progress updates
                const lines = data.toString().split("\n");
                for (const line of lines) {
                    if (line.includes("Progress:")) {
                        const match = line.match(/Progress:\s*(\d+)%/);
                        if (match) {
                            const progress = parseInt(match[1]);
                            if (progress !== lastProgress) {
                                lastProgress = progress;
                                this.updateProgress(job.id, { percent: progress });
                            }
                        }
                    }
                }
            });

            child.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            child.on("close", (code) => {
                this.running.delete(job.id);

                if (code === 0) {
                    // Try to parse result from stdout
                    try {
                        // Look for JSON result in output
                        const jsonMatch = stdout.match(/\{[\s\S]*"metrics"[\s\S]*\}/);
                        if (jsonMatch) {
                            resolve(JSON.parse(jsonMatch[0]));
                        } else {
                            resolve({ stdout, exitCode: code });
                        }
                    } catch {
                        resolve({ stdout, exitCode: code });
                    }
                } else {
                    reject(new Error(`Test exited with code ${code}: ${stderr.slice(-500)}`));
                }
            });

            child.on("error", (err) => {
                this.running.delete(job.id);
                reject(err);
            });
        });
    }

    /**
     * Update job progress
     */
    updateProgress(jobId, progress) {
        this.db.updateTestProgress(jobId, progress);
        this.emit("progress", { jobId, ...progress });
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const pending = this.db.query(
            "SELECT COUNT(*) as count FROM test_queue WHERE status = 'pending'"
        )[0].count;

        const running = this.db.query(
            "SELECT COUNT(*) as count FROM test_queue WHERE status = 'running'"
        )[0].count;

        const completed = this.db.query(
            "SELECT COUNT(*) as count FROM test_queue WHERE status = 'completed'"
        )[0].count;

        const failed = this.db.query(
            "SELECT COUNT(*) as count FROM test_queue WHERE status = 'failed'"
        )[0].count;

        return {
            pending,
            running,
            completed,
            failed,
            concurrency: this.concurrency,
            isProcessing: this.isProcessing,
        };
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

let queueInstance = null;

function getJobQueue(options) {
    if (!queueInstance) {
        queueInstance = new TestJobQueue(options);
    }
    return queueInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    TestJobQueue,
    getJobQueue,
};
