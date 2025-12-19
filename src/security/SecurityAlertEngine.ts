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
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { out as output } from "../utils/VulpesOutput";

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AlertType =
  | "unusual_volume"        // Spike in PHI access/redaction
  | "bulk_export"           // Large batch operations
  | "off_hours_access"      // Access outside business hours
  | "unusual_phi_type"      // Accessing PHI types not normally accessed
  | "failed_operations"     // High failure rate
  | "config_change"         // Policy or filter configuration modified
  | "integrity_violation"   // Trust bundle verification failed
  | "rate_limit_exceeded"   // Too many operations in time window
  | "suspicious_pattern"    // ML-detected suspicious behavior
  | "system_error";         // System-level errors

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
    start: number;  // 0-23
    end: number;    // 0-23
    timezone?: string;
  };
  baselineWindowDays?: number;
  alertStoragePath?: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_RULES: AlertRule[] = [
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
  start: 8,   // 8 AM
  end: 18,    // 6 PM
  timezone: "America/New_York",
};

// ============================================================================
// SECURITY ALERT ENGINE
// ============================================================================

export class SecurityAlertEngine extends EventEmitter {
  private static instance: SecurityAlertEngine;

  private enabled: boolean;
  private channels: AlertChannel[] = [];
  private rules: AlertRule[] = [];
  private businessHours: { start: number; end: number; timezone?: string };
  private alertStoragePath: string;

  // Metrics tracking
  private metrics: SecurityMetrics;
  private operationHistory: Array<{ timestamp: number; success: boolean; phiTypes: string[] }> = [];
  private alertHistory: Map<string, number> = new Map(); // ruleId -> lastAlertTime

  // Alert storage
  private activeAlerts: Map<string, SecurityAlert> = new Map();

  private constructor(config: SecurityAlertEngineConfig = {}) {
    super();

    this.enabled = config.enabled ?? (process.env.VULPES_SECURITY_ALERTS !== "0");
    this.channels = config.channels ?? this.loadDefaultChannels();
    this.rules = config.rules ?? DEFAULT_RULES;
    this.businessHours = config.businessHours ?? DEFAULT_BUSINESS_HOURS;
    this.alertStoragePath = config.alertStoragePath ??
      path.join(process.cwd(), "logs", "security-alerts");

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

    log.info("SecurityAlertEngine initialized", {
      component: "SecurityAlertEngine",
      enabled: this.enabled,
      channels: this.channels.length,
      rules: this.rules.length,
    });
  }

  static getInstance(config?: SecurityAlertEngineConfig): SecurityAlertEngine {
    if (!SecurityAlertEngine.instance) {
      SecurityAlertEngine.instance = new SecurityAlertEngine(config);
    }
    return SecurityAlertEngine.instance;
  }

  /**
   * Record an operation for monitoring
   */
  recordOperation(operation: {
    success: boolean;
    phiTypes: string[];
    documentId?: string;
    sessionId?: string;
    batchSize?: number;
  }): void {
    if (!this.enabled) return;

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
  private isOffHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour < this.businessHours.start || hour >= this.businessHours.end;
  }

  /**
   * Update calculated metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3600_000;

    // Clean old history
    this.operationHistory = this.operationHistory.filter(
      op => op.timestamp > oneHourAgo
    );

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
  private evaluateRules(context: {
    success: boolean;
    phiTypes: string[];
    documentId?: string;
    sessionId?: string;
    batchSize?: number;
    isOffHours: boolean;
  }): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

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
  private evaluateCondition(
    condition: AlertCondition,
    context: Record<string, unknown>
  ): boolean {
    let value: number;

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
        value = (context.batchSize as number) ?? 0;
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
  private async triggerAlert(
    rule: AlertRule,
    context: Record<string, unknown>
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: rule.type,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      title: rule.name,
      description: rule.description,
      details: {
        phiTypes: context.phiTypes as string[],
        recordCount: context.batchSize as number,
        sessionId: context.sessionId as string,
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

    log.warn(`Security alert triggered: ${alert.title}`, {
      component: "SecurityAlertEngine",
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
    });
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metric: string): number {
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
  private calculateDeviation(metric: string, threshold: number): number {
    const actual = this.getMetricValue(metric);
    if (threshold === 0) return actual > 0 ? 100 : 0;
    return ((actual - threshold) / threshold) * 100;
  }

  /**
   * Get recommendations based on alert type
   */
  private getRecommendations(type: AlertType): string[] {
    const recommendations: Record<AlertType, string[]> = {
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
  private async sendAlert(alert: SecurityAlert): Promise<void> {
    for (const channel of this.channels) {
      if (!channel.enabled) continue;

      // Check severity filter
      if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      try {
        switch (channel.type) {
          case "slack":
            await this.sendSlackAlert(alert, channel.config as SlackConfig);
            break;
          case "webhook":
            await this.sendWebhookAlert(alert, channel.config as WebhookConfig);
            break;
          case "console":
            this.sendConsoleAlert(alert, channel.config as ConsoleConfig);
            break;
          case "file":
            await this.sendFileAlert(alert, channel.config as FileConfig);
            break;
          case "email":
            // Email implementation would require nodemailer or similar
            log.info("Email alerts not yet implemented", { component: "SecurityAlertEngine" });
            break;
        }
      } catch (error) {
        log.error(`Failed to send alert to ${channel.type}`, {
          component: "SecurityAlertEngine",
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendSlackAlert(alert: SecurityAlert, config: SlackConfig): Promise<void> {
    const severityEmoji: Record<AlertSeverity, string> = {
      critical: "🚨",
      high: "⚠️",
      medium: "📢",
      low: "ℹ️",
      info: "📝",
    };

    const severityColor: Record<AlertSeverity, string> = {
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
        } else {
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
  private async sendWebhookAlert(alert: SecurityAlert, config: WebhookConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(config.url);
      const headers: Record<string, string> = {
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
        } else {
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
  private sendConsoleAlert(alert: SecurityAlert, _config: ConsoleConfig): void {
    // Use VulpesOutput for consistent formatting
    output.divider();

    if (alert.severity === "critical" || alert.severity === "high") {
      output.error(`SECURITY ALERT: ${alert.title}`);
    } else if (alert.severity === "medium") {
      output.warning(`SECURITY ALERT: ${alert.title}`);
    } else {
      output.info(`SECURITY ALERT: ${alert.title}`);
    }

    output.keyValue("Severity", alert.severity.toUpperCase());
    output.keyValue("Type", alert.type);
    output.keyValue("Time", alert.timestamp);
    output.keyValue("Description", alert.description);

    output.subheading("Recommendations");
    alert.recommendations.forEach((rec, i) => {
      output.numbered(i + 1, rec);
    });

    output.divider();
  }

  /**
   * Send alert to file
   */
  private async sendFileAlert(alert: SecurityAlert, config: FileConfig): Promise<void> {
    const content = config.format === "ndjson"
      ? JSON.stringify(alert) + "\n"
      : JSON.stringify(alert, null, 2) + "\n";

    await fs.promises.appendFile(config.path, content);
  }

  /**
   * Persist alert to storage
   */
  private async persistAlert(alert: SecurityAlert): Promise<void> {
    const date = new Date().toISOString().split("T")[0];
    const filePath = path.join(this.alertStoragePath, `alerts-${date}.ndjson`);

    try {
      await fs.promises.appendFile(filePath, JSON.stringify(alert) + "\n");
    } catch (error) {
      log.error("Failed to persist alert", {
        component: "SecurityAlertEngine",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Load default channels from environment
   */
  private loadDefaultChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [
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
  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.alertStoragePath)) {
        fs.mkdirSync(this.alertStoragePath, { recursive: true });
      }
    } catch (error) {
      log.error("Failed to create alert storage directory", {
        component: "SecurityAlertEngine",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Start periodic metrics cleanup
   */
  private startMetricsCleanup(): void {
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
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    this.emit("acknowledged", alert);
    return true;
  }

  /**
   * Get all active (unacknowledged) alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): SecurityAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Add a custom alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    log.info("Added security alert rule", {
      component: "SecurityAlertEngine",
      ruleId: rule.id,
      ruleName: rule.name,
    });
  }

  /**
   * Add an alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.push(channel);
    log.info("Added alert channel", {
      component: "SecurityAlertEngine",
      channelType: channel.type,
    });
  }

  /**
   * Enable or disable the engine
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    log.info(`SecurityAlertEngine ${enabled ? "enabled" : "disabled"}`, {
      component: "SecurityAlertEngine",
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): Readonly<SecurityMetrics> {
    return { ...this.metrics, uniquePhiTypes: new Set(this.metrics.uniquePhiTypes) };
  }

  /**
   * Manually trigger a test alert
   */
  async triggerTestAlert(): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
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

// ============================================================================
// EXPORTS
// ============================================================================

export const securityAlertEngine = SecurityAlertEngine.getInstance();

export function recordSecurityOperation(operation: {
  success: boolean;
  phiTypes: string[];
  documentId?: string;
  sessionId?: string;
  batchSize?: number;
}): void {
  securityAlertEngine.recordOperation(operation);
}
