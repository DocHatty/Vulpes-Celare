"use strict";
/**
 * ============================================================================
 * VULPES CELARE - SECURITY ALERT ENGINE
 * ============================================================================
 *
 * Real-time security monitoring and alerting for HIPAA compliance.
 *
 * Features:
 * - Anomaly detection for PHI access patterns
 * - Multi-channel alerting (Slack, Webhook, Email, Console)
 * - Configurable alert rules and thresholds
 * - Audit trail of all alerts
 * - Rate limiting to prevent alert fatigue
 *
 * HIPAA Requirements Addressed:
 * - § 164.312(b) - Audit controls
 * - § 164.308(a)(1)(ii)(D) - Information system activity review
 * - § 164.308(a)(6)(ii) - Response and reporting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityAlertEngine = exports.SecurityAlertEngine = void 0;
exports.recordSecurityOperation = recordSecurityOperation;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const DEFAULT_RULES = [
    {
        id: "unusual_volume",
        name: "Unusual Volume Spike",
        enabled: true,
        type: "unusual_volume",
        severity: "high",
        condition: {
            metric: "operationsPerMinute",
            operator: ">",
            threshold: 100,
            timeWindowMinutes: 5,
        },
        cooldownMinutes: 15,
        description: "Triggered when PHI operations exceed normal volume",
    },
    {
        id: "bulk_export",
        name: "Bulk Export Detected",
        enabled: true,
        type: "bulk_export",
        severity: "high",
        condition: {
            metric: "batchSize",
            operator: ">",
            threshold: 1000,
            timeWindowMinutes: 1,
        },
        cooldownMinutes: 30,
        description: "Triggered when a large batch operation is detected",
    },
    {
        id: "high_failure_rate",
        name: "High Failure Rate",
        enabled: true,
        type: "failed_operations",
        severity: "medium",
        condition: {
            metric: "failureRate",
            operator: ">",
            threshold: 0.1, // 10%
            timeWindowMinutes: 10,
        },
        cooldownMinutes: 15,
        description: "Triggered when failure rate exceeds threshold",
    },
    {
        id: "off_hours",
        name: "Off-Hours Access",
        enabled: true,
        type: "off_hours_access",
        severity: "medium",
        condition: {
            metric: "isOffHours",
            operator: "==",
            threshold: 1,
            timeWindowMinutes: 1,
        },
        cooldownMinutes: 60,
        description: "Triggered when PHI is accessed outside business hours",
    },
];
const DEFAULT_BUSINESS_HOURS = {
    start: 8, // 8 AM
    end: 18, // 6 PM
    timezone: "America/New_York",
};
// ============================================================================
// SECURITY ALERT ENGINE
// ============================================================================
class SecurityAlertEngine extends events_1.EventEmitter {
    static instance;
    enabled;
    channels = [];
    rules = [];
    businessHours;
    alertStoragePath;
    // Metrics tracking
    metrics;
    operationHistory = [];
    alertHistory = new Map(); // ruleId -> lastAlertTime
    // Alert storage
    activeAlerts = new Map();
    constructor(config = {}) {
        super();
        this.enabled = config.enabled ?? (process.env.VULPES_SECURITY_ALERTS !== "0");
        this.rules = config.rules ?? DEFAULT_RULES;
        this.businessHours = config.businessHours ?? DEFAULT_BUSINESS_HOURS;
        // CRITICAL: alertStoragePath MUST be assigned BEFORE loadDefaultChannels()
        // because loadDefaultChannels() uses this.alertStoragePath for file channel config
        this.alertStoragePath = config.alertStoragePath ??
            path.join(process.cwd(), "logs", "security-alerts");
        // Now safe to call loadDefaultChannels() which depends on alertStoragePath
        this.channels = config.channels ?? this.loadDefaultChannels();
        this.metrics = {
            operationsPerMinute: 0,
            operationsPerHour: 0,
            failureRate: 0,
            uniquePhiTypes: new Set(),
            lastOperationTime: 0,
            hourlyBaseline: new Array(24).fill(0),
        };
        // Ensure alert storage directory exists
        this.ensureStorageDirectory();
        // Start metrics cleanup interval
        this.startMetricsCleanup();
        VulpesLogger_1.vulpesLogger.info("SecurityAlertEngine initialized", {
            component: "SecurityAlertEngine",
            enabled: this.enabled,
            channels: this.channels.length,
            rules: this.rules.length,
        });
    }
    static getInstance(config) {
        if (!SecurityAlertEngine.instance) {
            SecurityAlertEngine.instance = new SecurityAlertEngine(config);
        }
        return SecurityAlertEngine.instance;
    }
    /**
     * Record an operation for monitoring
     */
    recordOperation(operation) {
        if (!this.enabled)
            return;
        const now = Date.now();
        // Add to history
        this.operationHistory.push({
            timestamp: now,
            success: operation.success,
            phiTypes: operation.phiTypes,
        });
        // Update PHI types
        operation.phiTypes.forEach(t => this.metrics.uniquePhiTypes.add(t));
        this.metrics.lastOperationTime = now;
        // Update metrics
        this.updateMetrics();
        // Check all rules
        this.evaluateRules({
            ...operation,
            isOffHours: this.isOffHours(),
        });
    }
    /**
     * Check if current time is outside business hours
     */
    isOffHours() {
        const now = new Date();
        const hour = now.getHours();
        return hour < this.businessHours.start || hour >= this.businessHours.end;
    }
    /**
     * Update calculated metrics
     */
    updateMetrics() {
        const now = Date.now();
        const oneMinuteAgo = now - 60_000;
        const oneHourAgo = now - 3600_000;
        // Clean old history
        this.operationHistory = this.operationHistory.filter(op => op.timestamp > oneHourAgo);
        // Calculate operations per minute
        const recentOps = this.operationHistory.filter(op => op.timestamp > oneMinuteAgo);
        this.metrics.operationsPerMinute = recentOps.length;
        // Calculate operations per hour
        this.metrics.operationsPerHour = this.operationHistory.length;
        // Calculate failure rate
        const failures = this.operationHistory.filter(op => !op.success).length;
        this.metrics.failureRate = this.operationHistory.length > 0
            ? failures / this.operationHistory.length
            : 0;
    }
    /**
     * Evaluate all alert rules
     */
    evaluateRules(context) {
        for (const rule of this.rules) {
            if (!rule.enabled)
                continue;
            // Check cooldown
            const lastAlert = this.alertHistory.get(rule.id);
            if (lastAlert && Date.now() - lastAlert < rule.cooldownMinutes * 60_000) {
                continue;
            }
            // Evaluate condition
            const triggered = this.evaluateCondition(rule.condition, context);
            if (triggered) {
                this.triggerAlert(rule, context);
            }
        }
    }
    /**
     * Evaluate a single condition
     */
    evaluateCondition(condition, context) {
        let value;
        // Get metric value
        switch (condition.metric) {
            case "operationsPerMinute":
                value = this.metrics.operationsPerMinute;
                break;
            case "operationsPerHour":
                value = this.metrics.operationsPerHour;
                break;
            case "failureRate":
                value = this.metrics.failureRate;
                break;
            case "batchSize":
                value = context.batchSize ?? 0;
                break;
            case "isOffHours":
                value = context.isOffHours ? 1 : 0;
                break;
            default:
                value = 0;
        }
        // Evaluate operator
        switch (condition.operator) {
            case ">": return value > condition.threshold;
            case "<": return value < condition.threshold;
            case ">=": return value >= condition.threshold;
            case "<=": return value <= condition.threshold;
            case "==": return value === condition.threshold;
            case "!=": return value !== condition.threshold;
            default: return false;
        }
    }
    /**
     * Trigger an alert
     */
    async triggerAlert(rule, context) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: rule.type,
            severity: rule.severity,
            timestamp: new Date().toISOString(),
            title: rule.name,
            description: rule.description,
            details: {
                phiTypes: context.phiTypes,
                recordCount: context.batchSize,
                sessionId: context.sessionId,
                comparison: {
                    baseline: rule.condition.threshold,
                    actual: this.getMetricValue(rule.condition.metric),
                    deviation: this.calculateDeviation(rule.condition.metric, rule.condition.threshold),
                },
                timeWindow: {
                    start: new Date(Date.now() - rule.condition.timeWindowMinutes * 60_000).toISOString(),
                    end: new Date().toISOString(),
                },
            },
            source: {
                component: "SecurityAlertEngine",
                operation: rule.type,
            },
            recommendations: this.getRecommendations(rule.type),
            acknowledged: false,
        };
        // Store alert
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.set(rule.id, Date.now());
        // Persist to storage
        await this.persistAlert(alert);
        // Send to all configured channels
        await this.sendAlert(alert);
        // Emit event for programmatic handling
        this.emit("alert", alert);
        VulpesLogger_1.vulpesLogger.warn(`Security alert triggered: ${alert.title}`, {
            component: "SecurityAlertEngine",
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
        });
    }
    /**
     * Get metric value by name
     */
    getMetricValue(metric) {
        switch (metric) {
            case "operationsPerMinute": return this.metrics.operationsPerMinute;
            case "operationsPerHour": return this.metrics.operationsPerHour;
            case "failureRate": return this.metrics.failureRate;
            default: return 0;
        }
    }
    /**
     * Calculate deviation from baseline
     */
    calculateDeviation(metric, threshold) {
        const actual = this.getMetricValue(metric);
        if (threshold === 0)
            return actual > 0 ? 100 : 0;
        return ((actual - threshold) / threshold) * 100;
    }
    /**
     * Get recommendations based on alert type
     */
    getRecommendations(type) {
        const recommendations = {
            unusual_volume: [
                "Review recent access logs for unauthorized activity",
                "Verify no automated scripts are running unexpectedly",
                "Check for batch jobs that may have triggered the spike",
            ],
            bulk_export: [
                "Verify the bulk operation was authorized",
                "Review the exported data for sensitive content",
                "Ensure proper data handling procedures are followed",
            ],
            off_hours_access: [
                "Verify the access was by an authorized user",
                "Review the purpose of the off-hours access",
                "Consider implementing stricter access controls",
            ],
            unusual_phi_type: [
                "Review why new PHI types are being accessed",
                "Verify role-based access controls are correct",
                "Update access policies if access is legitimate",
            ],
            failed_operations: [
                "Review error logs for root cause",
                "Check system health and resources",
                "Verify input data quality",
            ],
            config_change: [
                "Verify the configuration change was authorized",
                "Review the change for security implications",
                "Document the change in the audit trail",
            ],
            integrity_violation: [
                "Immediately investigate potential tampering",
                "Review trust bundle verification logs",
                "Consider isolating affected systems",
            ],
            rate_limit_exceeded: [
                "Identify the source of excessive requests",
                "Implement additional rate limiting if needed",
                "Review for potential denial of service",
            ],
            suspicious_pattern: [
                "Review detailed access patterns",
                "Compare against baseline behavior",
                "Consider additional authentication requirements",
            ],
            system_error: [
                "Review system logs for errors",
                "Check system resources and health",
                "Contact system administrator if persistent",
            ],
        };
        return recommendations[type] ?? ["Review the alert details and take appropriate action"];
    }
    /**
     * Send alert to all configured channels
     */
    async sendAlert(alert) {
        for (const channel of this.channels) {
            if (!channel.enabled)
                continue;
            // Check severity filter
            if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
                continue;
            }
            try {
                switch (channel.type) {
                    case "slack":
                        await this.sendSlackAlert(alert, channel.config);
                        break;
                    case "webhook":
                        await this.sendWebhookAlert(alert, channel.config);
                        break;
                    case "console":
                        this.sendConsoleAlert(alert, channel.config);
                        break;
                    case "file":
                        await this.sendFileAlert(alert, channel.config);
                        break;
                    case "email":
                        // Email implementation would require nodemailer or similar
                        VulpesLogger_1.vulpesLogger.info("Email alerts not yet implemented", { component: "SecurityAlertEngine" });
                        break;
                }
            }
            catch (error) {
                VulpesLogger_1.vulpesLogger.error(`Failed to send alert to ${channel.type}`, {
                    component: "SecurityAlertEngine",
                    error: error.message,
                });
            }
        }
    }
    /**
     * Send alert to Slack
     */
    async sendSlackAlert(alert, config) {
        const severityEmoji = {
            critical: "🚨",
            high: "⚠️",
            medium: "📢",
            low: "ℹ️",
            info: "📝",
        };
        const severityColor = {
            critical: "#FF0000",
            high: "#FF8C00",
            medium: "#FFD700",
            low: "#4169E1",
            info: "#808080",
        };
        const payload = {
            channel: config.channel,
            username: config.username ?? "Vulpes Security",
            icon_emoji: config.iconEmoji ?? ":fox_face:",
            attachments: [
                {
                    color: severityColor[alert.severity],
                    title: `${severityEmoji[alert.severity]} ${alert.title}`,
                    text: alert.description,
                    fields: [
                        { title: "Severity", value: alert.severity.toUpperCase(), short: true },
                        { title: "Type", value: alert.type, short: true },
                        { title: "Alert ID", value: alert.id, short: true },
                        { title: "Time", value: alert.timestamp, short: true },
                    ],
                    footer: "Vulpes Celare Security",
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };
        return new Promise((resolve, reject) => {
            const url = new URL(config.webhookUrl);
            const req = https.request({
                hostname: url.hostname,
                path: url.pathname,
                method: "POST",
                headers: { "Content-Type": "application/json" },
            }, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                }
                else {
                    reject(new Error(`Slack returned status ${res.statusCode}`));
                }
            });
            req.on("error", reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    }
    /**
     * Send alert to generic webhook
     */
    async sendWebhookAlert(alert, config) {
        return new Promise((resolve, reject) => {
            const url = new URL(config.url);
            const headers = {
                "Content-Type": "application/json",
                ...config.headers,
            };
            if (config.authToken) {
                headers["Authorization"] = `Bearer ${config.authToken}`;
            }
            const req = https.request({
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: config.method ?? "POST",
                headers,
            }, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                }
                else {
                    reject(new Error(`Webhook returned status ${res.statusCode}`));
                }
            });
            req.on("error", reject);
            req.write(JSON.stringify(alert));
            req.end();
        });
    }
    /**
     * Send alert to console
     */
    sendConsoleAlert(alert, _config) {
        // Use VulpesOutput for consistent formatting
        VulpesOutput_1.out.divider();
        if (alert.severity === "critical" || alert.severity === "high") {
            VulpesOutput_1.out.error(`SECURITY ALERT: ${alert.title}`);
        }
        else if (alert.severity === "medium") {
            VulpesOutput_1.out.warning(`SECURITY ALERT: ${alert.title}`);
        }
        else {
            VulpesOutput_1.out.info(`SECURITY ALERT: ${alert.title}`);
        }
        VulpesOutput_1.out.keyValue("Severity", alert.severity.toUpperCase());
        VulpesOutput_1.out.keyValue("Type", alert.type);
        VulpesOutput_1.out.keyValue("Time", alert.timestamp);
        VulpesOutput_1.out.keyValue("Description", alert.description);
        VulpesOutput_1.out.subheading("Recommendations");
        alert.recommendations.forEach((rec, i) => {
            VulpesOutput_1.out.numbered(i + 1, rec);
        });
        VulpesOutput_1.out.divider();
    }
    /**
     * Send alert to file
     */
    async sendFileAlert(alert, config) {
        const content = config.format === "ndjson"
            ? JSON.stringify(alert) + "\n"
            : JSON.stringify(alert, null, 2) + "\n";
        await fs.promises.appendFile(config.path, content);
    }
    /**
     * Persist alert to storage
     */
    async persistAlert(alert) {
        const date = new Date().toISOString().split("T")[0];
        const filePath = path.join(this.alertStoragePath, `alerts-${date}.ndjson`);
        try {
            await fs.promises.appendFile(filePath, JSON.stringify(alert) + "\n");
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to persist alert", {
                component: "SecurityAlertEngine",
                error: error.message,
            });
        }
    }
    /**
     * Load default channels from environment
     */
    loadDefaultChannels() {
        const channels = [
            // Console always enabled
            {
                type: "console",
                enabled: true,
                config: { colorize: true },
                severityFilter: ["critical", "high"],
            },
        ];
        // Slack webhook from environment
        if (process.env.VULPES_SLACK_WEBHOOK) {
            channels.push({
                type: "slack",
                enabled: true,
                config: {
                    webhookUrl: process.env.VULPES_SLACK_WEBHOOK,
                    channel: process.env.VULPES_SLACK_CHANNEL,
                },
                severityFilter: ["critical", "high", "medium"],
            });
        }
        // Generic webhook from environment
        if (process.env.VULPES_ALERT_WEBHOOK) {
            channels.push({
                type: "webhook",
                enabled: true,
                config: {
                    url: process.env.VULPES_ALERT_WEBHOOK,
                    authToken: process.env.VULPES_ALERT_WEBHOOK_TOKEN,
                },
            });
        }
        // File logging always enabled
        channels.push({
            type: "file",
            enabled: true,
            config: {
                path: path.join(this.alertStoragePath, "alerts.ndjson"),
                format: "ndjson",
            },
        });
        return channels;
    }
    /**
     * Ensure storage directory exists
     */
    ensureStorageDirectory() {
        try {
            if (!fs.existsSync(this.alertStoragePath)) {
                fs.mkdirSync(this.alertStoragePath, { recursive: true });
            }
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to create alert storage directory", {
                component: "SecurityAlertEngine",
                error: error.message,
            });
        }
    }
    /**
     * Start periodic metrics cleanup
     */
    startMetricsCleanup() {
        // Clean up old metrics every 5 minutes
        setInterval(() => {
            this.updateMetrics();
        }, 5 * 60_000);
    }
    // ============================================================================
    // PUBLIC API
    // ============================================================================
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return false;
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
        this.emit("acknowledged", alert);
        return true;
    }
    /**
     * Get all active (unacknowledged) alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged);
    }
    /**
     * Get all alerts
     */
    getAllAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    /**
     * Add a custom alert rule
     */
    addRule(rule) {
        this.rules.push(rule);
        VulpesLogger_1.vulpesLogger.info("Added security alert rule", {
            component: "SecurityAlertEngine",
            ruleId: rule.id,
            ruleName: rule.name,
        });
    }
    /**
     * Add an alert channel
     */
    addChannel(channel) {
        this.channels.push(channel);
        VulpesLogger_1.vulpesLogger.info("Added alert channel", {
            component: "SecurityAlertEngine",
            channelType: channel.type,
        });
    }
    /**
     * Enable or disable the engine
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        VulpesLogger_1.vulpesLogger.info(`SecurityAlertEngine ${enabled ? "enabled" : "disabled"}`, {
            component: "SecurityAlertEngine",
        });
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics, uniquePhiTypes: new Set(this.metrics.uniquePhiTypes) };
    }
    /**
     * Manually trigger a test alert
     */
    async triggerTestAlert() {
        const alert = {
            id: `test_alert_${Date.now()}`,
            type: "system_error",
            severity: "info",
            timestamp: new Date().toISOString(),
            title: "Test Alert",
            description: "This is a test alert to verify the alerting system is working correctly.",
            details: {},
            source: { component: "SecurityAlertEngine", operation: "test" },
            recommendations: ["No action needed - this is a test"],
            acknowledged: false,
        };
        await this.sendAlert(alert);
        return alert;
    }
}
exports.SecurityAlertEngine = SecurityAlertEngine;
// ============================================================================
// EXPORTS
// ============================================================================
exports.securityAlertEngine = SecurityAlertEngine.getInstance();
function recordSecurityOperation(operation) {
    exports.securityAlertEngine.recordOperation(operation);
}
//# sourceMappingURL=SecurityAlertEngine.js.map