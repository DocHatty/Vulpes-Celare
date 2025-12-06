/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   CORTEX REST API SERVER                                                      ║
 * ║   Express.js API for Database Operations & Test Streaming                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This REST API provides:
 * - Database-backed queries (patterns, decisions, metrics)
 * - Async test execution with progress streaming
 * - Experiment management endpoints
 * - WebSocket support for real-time updates
 *
 * Port: 3101 (3100 is MCP health endpoint)
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const { getDatabase } = require("../db/database");
const { getJobQueue } = require("./queue");
const { getExperimentService } = require("./experiments");
const { getRetentionService } = require("./retention");

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.CORTEX_API_PORT || 3101;

// ============================================================================
// APP SETUP
// ============================================================================

const app = express();
app.use(express.json());

// Database instance
let db = null;
let jobQueue = null;
let experimentService = null;
let retentionService = null;

// WebSocket clients for test streaming
const testStreamClients = new Map(); // testId -> Set<WebSocket>

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS for local development
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    next();
});

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    console.error(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get("/", (req, res) => {
    res.json({
        name: "Vulpes Cortex API",
        version: "1.0.0",
        status: "running",
        endpoints: {
            health: "/health",
            patterns: "/api/patterns",
            decisions: "/api/decisions",
            metrics: "/api/metrics",
            tests: "/api/tests",
            queue: "/api/queue",
            experiments: "/api/experiments",
            retention: "/api/retention",
            knowledge: "/api/knowledge",
        },
    });
});

app.get("/health", (req, res) => {
    const stats = db ? db.getStats() : {};
    res.json({
        status: "healthy",
        uptime: process.uptime(),
        database: stats,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// PATTERNS ENDPOINTS
// ============================================================================

// GET /api/patterns - Query patterns with filters
app.get("/api/patterns", (req, res) => {
    try {
        const filters = {
            phiType: req.query.phiType,
            category: req.query.category,
            patternType: req.query.patternType,
            severity: req.query.severity,
            since: req.query.since,
            minCount: req.query.minCount ? parseInt(req.query.minCount) : undefined,
        };

        const options = {
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            sortBy: req.query.sortBy || "count",
            sortOrder: req.query.sortOrder || "DESC",
        };

        const patterns = db.queryPatterns(filters, options);
        res.json({ success: true, count: patterns.length, patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/patterns/trending - Get trending patterns
app.get("/api/patterns/trending", (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const patterns = db.getTrendingPatterns(limit);
        res.json({ success: true, count: patterns.length, patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/patterns/:phiType - Get patterns for specific PHI type
app.get("/api/patterns/:phiType", (req, res) => {
    try {
        const patterns = db.getPatternsByPhiType(req.params.phiType);
        res.json({ success: true, count: patterns.length, patterns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/patterns - Record a pattern
app.post("/api/patterns", (req, res) => {
    try {
        const id = db.recordPattern(req.body);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DECISIONS ENDPOINTS
// ============================================================================

// GET /api/decisions - Query decisions
app.get("/api/decisions", (req, res) => {
    try {
        const filters = {
            interventionId: req.query.interventionId,
            type: req.query.type,
            outcome: req.query.outcome,
            since: req.query.since,
            until: req.query.until,
        };

        const options = {
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };

        const decisions = db.queryDecisions(filters, options);
        res.json({ success: true, count: decisions.length, decisions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/decisions/:id - Get specific decision
app.get("/api/decisions/:id", (req, res) => {
    try {
        const decision = db.getDecision(req.params.id);
        if (!decision) {
            return res.status(404).json({ success: false, error: "Decision not found" });
        }
        res.json({ success: true, decision });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/decisions - Record a decision
app.post("/api/decisions", (req, res) => {
    try {
        const id = db.recordDecision(req.body);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

// GET /api/metrics - Get latest metrics
app.get("/api/metrics", (req, res) => {
    try {
        const metrics = db.getLatestMetrics();
        res.json({ success: true, metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/metrics/trend/:metricName - Get metric trend
app.get("/api/metrics/trend/:metricName", (req, res) => {
    try {
        const options = {
            since: req.query.since,
            until: req.query.until,
            profile: req.query.profile,
            limit: req.query.limit ? parseInt(req.query.limit) : 100,
        };

        const trend = db.getMetricsTrend(req.params.metricName, options);
        res.json({ success: true, metricName: req.params.metricName, count: trend.length, trend });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/metrics - Record metrics
app.post("/api/metrics", (req, res) => {
    try {
        const { runId, metrics, context } = req.body;
        db.recordMetrics(runId, metrics, context);
        res.json({ success: true, runId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/metrics/compare - Compare two periods
app.get("/api/metrics/compare", (req, res) => {
    try {
        const period1 = { start: req.query.period1Start, end: req.query.period1End };
        const period2 = { start: req.query.period2Start, end: req.query.period2End };
        const comparison = db.compareMetricsPeriods(period1, period2);
        res.json({ success: true, comparison });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TEST EXECUTION ENDPOINTS
// ============================================================================

// POST /api/tests/run - Start async test execution
app.post("/api/tests/run", (req, res) => {
    try {
        const config = {
            profile: req.body.profile || "HIPAA_STRICT",
            documentCount: req.body.documentCount || 200,
            quick: req.body.quick || false,
        };

        const testId = db.enqueueTest(config);
        res.json({
            success: true,
            testId,
            status: "queued",
            message: `Test queued. Stream progress at ws://localhost:${PORT}/api/tests/${testId}/stream`,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/tests/:id - Get test status
app.get("/api/tests/:id", (req, res) => {
    try {
        const status = db.getTestStatus(req.params.id);
        if (!status) {
            return res.status(404).json({ success: false, error: "Test not found" });
        }
        res.json({ success: true, test: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// EXPERIMENTS ENDPOINTS
// ============================================================================

// GET /api/experiments - List experiments
app.get("/api/experiments", (req, res) => {
    try {
        const filters = { status: req.query.status };
        const options = { limit: req.query.limit ? parseInt(req.query.limit) : 20 };
        const experiments = db.queryExperiments(filters, options);
        res.json({ success: true, count: experiments.length, experiments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/experiments - Create experiment
app.post("/api/experiments", (req, res) => {
    try {
        const id = db.createExperiment(req.body);
        res.json({ success: true, id, status: "CREATED" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/experiments/:id - Get experiment details
app.get("/api/experiments/:id", (req, res) => {
    try {
        const experiment = db.getExperiment(req.params.id);
        if (!experiment) {
            return res.status(404).json({ success: false, error: "Experiment not found" });
        }
        res.json({ success: true, experiment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/experiments/:id - Update experiment
app.put("/api/experiments/:id", (req, res) => {
    try {
        db.updateExperiment(req.params.id, req.body);
        res.json({ success: true, id: req.params.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// INTERVENTIONS ENDPOINTS
// ============================================================================

// GET /api/interventions - Query interventions
app.get("/api/interventions", (req, res) => {
    try {
        const filters = { type: req.query.type, status: req.query.status };
        const options = { limit: req.query.limit ? parseInt(req.query.limit) : 50 };
        const interventions = db.queryInterventions(filters, options);
        res.json({ success: true, count: interventions.length, interventions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/interventions - Record intervention
app.post("/api/interventions", (req, res) => {
    try {
        const id = db.recordIntervention(req.body);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/interventions/:id - Update intervention
app.put("/api/interventions/:id", (req, res) => {
    try {
        db.updateIntervention(req.params.id, req.body);
        res.json({ success: true, id: req.params.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// KNOWLEDGE ENDPOINTS
// ============================================================================

// GET /api/knowledge/summary - Get knowledge summary
app.get("/api/knowledge/summary", (req, res) => {
    try {
        const stats = db.getStats();
        const latestMetrics = db.getLatestMetrics();
        const trendingPatterns = db.getTrendingPatterns(5);

        res.json({
            success: true,
            summary: {
                stats,
                latestMetrics,
                trendingPatterns,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/knowledge/search - Search knowledge base
app.get("/api/knowledge/search", (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ success: false, error: "Query parameter 'q' required" });
        }

        // Search across patterns and decisions
        const patternResults = db.queryPatterns({}, { limit: 20 }).filter(
            (p) =>
                p.description?.toLowerCase().includes(query.toLowerCase()) ||
                p.phi_type?.toLowerCase().includes(query.toLowerCase()) ||
                p.category?.toLowerCase().includes(query.toLowerCase())
        );

        res.json({
            success: true,
            query,
            results: {
                patterns: patternResults.slice(0, 10),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// AUDIT ENDPOINTS (BLOCKCHAIN TIER 1)
// ============================================================================

// GET /api/audit/verify/:id - Verify integrity of a record
app.get("/api/audit/verify/:id", (req, res) => {
    try {
        const { MerkleLog } = require("../core/merkle-log");
        const auditLog = new MerkleLog(db);
        const result = auditLog.verify(req.params.id);
        res.json({ success: true, verification: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/audit/head - Get current immutable head
app.get("/api/audit/head", (req, res) => {
    try {
        const { MerkleLog } = require("../core/merkle-log");
        const auditLog = new MerkleLog(db);
        const head = auditLog.getHead();
        res.json({ success: true, head });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// JOB QUEUE ENDPOINTS
// ============================================================================

// GET /api/queue/stats - Get queue statistics
app.get("/api/queue/stats", (req, res) => {
    try {
        const stats = jobQueue.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/queue/start - Start queue processing
app.post("/api/queue/start", (req, res) => {
    try {
        jobQueue.start();
        res.json({ success: true, message: "Queue processing started" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/queue/stop - Stop queue processing
app.post("/api/queue/stop", (req, res) => {
    try {
        jobQueue.stop();
        res.json({ success: true, message: "Queue processing stopped" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/queue/:id - Cancel a queued job
app.delete("/api/queue/:id", (req, res) => {
    try {
        jobQueue.cancel(req.params.id);
        res.json({ success: true, message: "Job cancelled" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// EXPERIMENT WORKFLOW ENDPOINTS
// ============================================================================

// POST /api/experiments/:id/start-baseline - Start baseline phase
app.post("/api/experiments/:id/start-baseline", async (req, res) => {
    try {
        const testId = await experimentService.startBaseline(req.params.id);
        res.json({ success: true, experimentId: req.params.id, testId, phase: "baseline" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/experiments/:id/baseline-results - Record baseline results
app.post("/api/experiments/:id/baseline-results", (req, res) => {
    try {
        experimentService.recordBaselineResults(req.params.id, req.body);
        res.json({ success: true, experimentId: req.params.id, phase: "baseline_complete" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/experiments/:id/start-treatment - Start treatment phase
app.post("/api/experiments/:id/start-treatment", async (req, res) => {
    try {
        const testId = await experimentService.startTreatment(req.params.id);
        res.json({ success: true, experimentId: req.params.id, testId, phase: "treatment" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/experiments/:id/treatment-results - Record treatment results and analyze
app.post("/api/experiments/:id/treatment-results", (req, res) => {
    try {
        const analysis = experimentService.recordTreatmentResults(req.params.id, req.body);
        res.json({ success: true, experimentId: req.params.id, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/experiments/:id/analyze - Analyze experiment results
app.post("/api/experiments/:id/analyze", (req, res) => {
    try {
        const analysis = experimentService.analyzeResults(req.params.id);
        res.json({ success: true, experimentId: req.params.id, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/experiments/:id/summary - Get experiment summary for LLM
app.get("/api/experiments/:id/summary", (req, res) => {
    try {
        const summary = experimentService.getSummaryForLLM(req.params.id);
        if (!summary) {
            return res.status(404).json({ success: false, error: "Experiment not found" });
        }
        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// RETENTION ENDPOINTS
// ============================================================================

// GET /api/retention/stats - Get retention statistics
app.get("/api/retention/stats", (req, res) => {
    try {
        const stats = retentionService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/retention/run - Run retention policies
app.post("/api/retention/run", (req, res) => {
    try {
        const dryRun = req.query.dryRun === "true" || req.body.dryRun === true;
        const results = retentionService.runAll(dryRun);
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/retention/compact - Compact database
app.post("/api/retention/compact", (req, res) => {
    try {
        retentionService.compactDatabase();
        res.json({ success: true, message: "Database compacted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// WEBSOCKET SETUP FOR TEST STREAMING
// ============================================================================

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server, path: "/ws" });

    wss.on("connection", (ws, req) => {
        console.error("[WebSocket] Client connected");

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === "subscribe" && data.testId) {
                    // Subscribe to test updates
                    if (!testStreamClients.has(data.testId)) {
                        testStreamClients.set(data.testId, new Set());
                    }
                    testStreamClients.get(data.testId).add(ws);
                    ws.send(JSON.stringify({ type: "subscribed", testId: data.testId }));
                }
            } catch (e) {
                ws.send(JSON.stringify({ type: "error", message: e.message }));
            }
        });

        ws.on("close", () => {
            // Remove from all subscriptions
            for (const [testId, clients] of testStreamClients) {
                clients.delete(ws);
                if (clients.size === 0) {
                    testStreamClients.delete(testId);
                }
            }
        });
    });

    return wss;
}

/**
 * Broadcast test progress to subscribed clients
 */
function broadcastTestProgress(testId, progress) {
    const clients = testStreamClients.get(testId);
    if (!clients) return;

    const message = JSON.stringify({
        type: "progress",
        testId,
        ...progress,
        timestamp: new Date().toISOString(),
    });

    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

function start() {
    // Initialize database
    db = getDatabase();
    console.error("[Cortex API] Database connected");

    // Initialize services
    jobQueue = getJobQueue({ database: db });
    experimentService = getExperimentService({ database: db, queue: jobQueue });
    retentionService = getRetentionService({ database: db });
    console.error("[Cortex API] Services initialized (queue, experiments, retention)");

    // Create HTTP server
    const server = http.createServer(app);

    // Setup WebSocket
    const wss = setupWebSocket(server);
    console.error("[Cortex API] WebSocket server initialized");

    // Start listening
    server.listen(PORT, () => {
        console.error("═══════════════════════════════════════════════════════════════");
        console.error("  VULPES CORTEX REST API SERVER");
        console.error("═══════════════════════════════════════════════════════════════");
        console.error(`  Status:    RUNNING`);
        console.error(`  Port:      ${PORT}`);
        console.error(`  PID:       ${process.pid}`);
        console.error(`  Endpoints: http://localhost:${PORT}/`);
        console.error(`  WebSocket: ws://localhost:${PORT}/ws`);
        console.error("═══════════════════════════════════════════════════════════════\n");
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.error("\n[Cortex API] Shutting down...");
        wss.close();
        server.close();
        db.close();
        process.exit(0);
    });
}

// Run if called directly
if (require.main === module) {
    start();
}

module.exports = { app, start, broadcastTestProgress };
