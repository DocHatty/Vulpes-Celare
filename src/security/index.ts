/**
 * Vulpes Celare - Security Module
 *
 * Real-time security monitoring and alerting for HIPAA compliance.
 */

export {
  SecurityAlertEngine,
  securityAlertEngine,
  recordSecurityOperation,
  type SecurityAlert,
  type AlertSeverity,
  type AlertType,
  type AlertChannel,
  type AlertRule,
  type AlertDetails,
  type AlertSource,
  type AlertCondition,
  type SecurityMetrics,
  type SecurityAlertEngineConfig,
  type SlackConfig,
  type WebhookConfig,
  type EmailConfig,
  type FileConfig,
  type ConsoleConfig,
} from "./SecurityAlertEngine";
