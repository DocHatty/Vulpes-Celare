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
import { EventEmitter } from "events";
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertType = "unusual_volume" | "bulk_export" | "off_hours_access" | "unusual_phi_type" | "failed_operations" | "config_change" | "integrity_violation" | "rate_limit_exceeded" | "suspicious_pattern" | "system_error";
export interface SecurityAlert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    timestamp: string;
    title: string;
    description: string;
    details: AlertDetails;
    source: AlertSource;
    recommendations: string[];
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
}
export interface AlertDetails {
    /** Affected PHI types */
    phiTypes?: string[];
    /** Number of records affected */
    recordCount?: number;
    /** Time window of the anomaly */
    timeWindow?: {
        start: string;
        end: string;
    };
    /** Baseline vs actual comparison */
    comparison?: {
        baseline: number;
        actual: number;
        deviation: number;
    };
    /** Related document IDs */
    documentIds?: string[];
    /** User/session that triggered alert */
    sessionId?: string;
    /** Additional context */
    context?: Record<string, unknown>;
}
export interface AlertSource {
    component: string;
    operation: string;
    correlationId?: string;
}
export interface AlertChannel {
    type: "slack" | "webhook" | "email" | "console" | "file";
    enabled: boolean;
    config: SlackConfig | WebhookConfig | EmailConfig | FileConfig | ConsoleConfig;
    severityFilter?: AlertSeverity[];
}
export interface SlackConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
}
export interface WebhookConfig {
    url: string;
    method?: "POST" | "PUT";
    headers?: Record<string, string>;
    authToken?: string;
}
export interface EmailConfig {
    smtpHost: string;
    smtpPort: number;
    from: string;
    to: string[];
    username?: string;
    password?: string;
    secure?: boolean;
}
export interface FileConfig {
    path: string;
    format: "json" | "ndjson";
    rotateSize?: number;
}
export interface ConsoleConfig {
    colorize?: boolean;
}
export interface AlertRule {
    id: string;
    name: string;
    enabled: boolean;
    type: AlertType;
    severity: AlertSeverity;
    condition: AlertCondition;
    cooldownMinutes: number;
    description: string;
}
export interface AlertCondition {
    metric: string;
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    threshold: number;
    timeWindowMinutes: number;
}
export interface SecurityMetrics {
    operationsPerMinute: number;
    operationsPerHour: number;
    failureRate: number;
    uniquePhiTypes: Set<string>;
    lastOperationTime: number;
    hourlyBaseline: number[];
}
export interface SecurityAlertEngineConfig {
    enabled?: boolean;
    channels?: AlertChannel[];
    rules?: AlertRule[];
    businessHours?: {
        start: number;
        end: number;
        timezone?: string;
    };
    baselineWindowDays?: number;
    alertStoragePath?: string;
}
export declare class SecurityAlertEngine extends EventEmitter {
    private static instance;
    private enabled;
    private channels;
    private rules;
    private businessHours;
    private alertStoragePath;
    private metrics;
    private operationHistory;
    private alertHistory;
    private activeAlerts;
    private constructor();
    static getInstance(config?: SecurityAlertEngineConfig): SecurityAlertEngine;
    /**
     * Record an operation for monitoring
     */
    recordOperation(operation: {
        success: boolean;
        phiTypes: string[];
        documentId?: string;
        sessionId?: string;
        batchSize?: number;
    }): void;
    /**
     * Check if current time is outside business hours
     */
    private isOffHours;
    /**
     * Update calculated metrics
     */
    private updateMetrics;
    /**
     * Evaluate all alert rules
     */
    private evaluateRules;
    /**
     * Evaluate a single condition
     */
    private evaluateCondition;
    /**
     * Trigger an alert
     */
    private triggerAlert;
    /**
     * Get metric value by name
     */
    private getMetricValue;
    /**
     * Calculate deviation from baseline
     */
    private calculateDeviation;
    /**
     * Get recommendations based on alert type
     */
    private getRecommendations;
    /**
     * Send alert to all configured channels
     */
    private sendAlert;
    /**
     * Send alert to Slack
     */
    private sendSlackAlert;
    /**
     * Send alert to generic webhook
     */
    private sendWebhookAlert;
    /**
     * Send alert to console
     */
    private sendConsoleAlert;
    /**
     * Send alert to file
     */
    private sendFileAlert;
    /**
     * Persist alert to storage
     */
    private persistAlert;
    /**
     * Load default channels from environment
     */
    private loadDefaultChannels;
    /**
     * Ensure storage directory exists
     */
    private ensureStorageDirectory;
    /**
     * Start periodic metrics cleanup
     */
    private startMetricsCleanup;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean;
    /**
     * Get all active (unacknowledged) alerts
     */
    getActiveAlerts(): SecurityAlert[];
    /**
     * Get all alerts
     */
    getAllAlerts(): SecurityAlert[];
    /**
     * Add a custom alert rule
     */
    addRule(rule: AlertRule): void;
    /**
     * Add an alert channel
     */
    addChannel(channel: AlertChannel): void;
    /**
     * Enable or disable the engine
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get current metrics
     */
    getMetrics(): Readonly<SecurityMetrics>;
    /**
     * Manually trigger a test alert
     */
    triggerTestAlert(): Promise<SecurityAlert>;
}
export declare const securityAlertEngine: SecurityAlertEngine;
export declare function recordSecurityOperation(operation: {
    success: boolean;
    phiTypes: string[];
    documentId?: string;
    sessionId?: string;
    batchSize?: number;
}): void;
//# sourceMappingURL=SecurityAlertEngine.d.ts.map