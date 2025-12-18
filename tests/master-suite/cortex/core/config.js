/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   CONFIGURATION                                                               ║
 * ║   Central configuration for the self-learning test intelligence system        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const path = require("path");
const fs = require("fs");

// ============================================================================
// PATHS - Everything stays in tests/master-suite/cortex/storage
// ============================================================================
const CORTEX_ROOT = path.join(__dirname, "..");
const STORAGE_ROOT = path.join(CORTEX_ROOT, "storage");

const PATHS = {
  root: CORTEX_ROOT,
  storage: STORAGE_ROOT,
  knowledge: path.join(STORAGE_ROOT, "knowledge"),
  snapshots: path.join(STORAGE_ROOT, "snapshots"),
  experiments: path.join(STORAGE_ROOT, "experiments"),
  checkpoints: path.join(STORAGE_ROOT, "checkpoints"),
};

// ============================================================================
// ENSURE DIRECTORIES EXIST
// ============================================================================
function ensureDirectories() {
  for (const [key, dirPath] of Object.entries(PATHS)) {
    if (key !== "root" && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// ============================================================================
// METRICS - Industry Gold Standards for PHI Redaction
// ============================================================================
const METRICS_CONFIG = {
  // Primary metrics (most important for PHI redaction)
  primary: {
    sensitivity: {
      name: "Sensitivity (Recall/TPR)",
      description: "PHI correctly identified / All actual PHI",
      formula: "TP / (TP + FN)",
      importance: "CRITICAL", // Missing PHI = HIPAA violation
      weight: 0.4,
      thresholds: {
        excellent: 99.5,
        good: 98,
        acceptable: 95,
        poor: 90,
        failing: 85,
      },
    },
    specificity: {
      name: "Specificity (TNR)",
      description: "Non-PHI correctly preserved / All actual non-PHI",
      formula: "TN / (TN + FP)",
      importance: "HIGH", // Over-redaction frustrates users
      weight: 0.2,
      thresholds: {
        excellent: 99,
        good: 95,
        acceptable: 90,
        poor: 85,
        failing: 80,
      },
    },
    f1Score: {
      name: "F1 Score",
      description: "Harmonic mean of precision and recall",
      formula: "2 * (Precision * Recall) / (Precision + Recall)",
      importance: "HIGH",
      weight: 0.15,
      thresholds: {
        excellent: 99,
        good: 97,
        acceptable: 95,
        poor: 90,
        failing: 85,
      },
    },
    mcc: {
      name: "Matthews Correlation Coefficient",
      description: "Best single metric for imbalanced binary classification",
      formula: "(TP*TN - FP*FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))",
      importance: "HIGH", // Gold standard for imbalanced data
      weight: 0.15,
      thresholds: {
        excellent: 0.95,
        good: 0.9,
        acceptable: 0.8,
        poor: 0.7,
        failing: 0.6,
      },
    },
  },

  // Secondary metrics (important for detailed analysis)
  secondary: {
    precision: {
      name: "Precision (PPV)",
      description: "Correctly redacted / All redacted",
      formula: "TP / (TP + FP)",
      importance: "MEDIUM",
      weight: 0.05,
    },
    npv: {
      name: "Negative Predictive Value",
      description: "Correctly preserved / All preserved",
      formula: "TN / (TN + FN)",
      importance: "MEDIUM",
      weight: 0.05,
    },
    balancedAccuracy: {
      name: "Balanced Accuracy",
      description: "Average of sensitivity and specificity",
      formula: "(Sensitivity + Specificity) / 2",
      importance: "MEDIUM",
      weight: 0.0, // Informational, not weighted
    },
    falsePositiveRate: {
      name: "False Positive Rate (FPR)",
      description: "Over-redaction rate",
      formula: "FP / (FP + TN)",
      importance: "MEDIUM",
      direction: "lower_is_better",
    },
    falseNegativeRate: {
      name: "False Negative Rate (FNR)",
      description: "PHI leakage rate - CRITICAL",
      formula: "FN / (FN + TP)",
      importance: "CRITICAL",
      direction: "lower_is_better",
    },
  },
};

// ============================================================================
// EXPERIMENT CONFIGURATION
// ============================================================================
const EXPERIMENT_CONFIG = {
  // Minimum documents for statistically valid comparison
  minDocuments: 200,

  // Default document count for experiments
  defaultDocuments: 200,

  // Significance thresholds for declaring improvement/regression
  significanceThresholds: {
    improvement: 0.5, // +0.5% sensitivity = improvement
    regression: -0.3, // -0.3% sensitivity = regression (more sensitive to drops)
    majorImprovement: 2.0,
    majorRegression: -1.0,
  },

  // Auto-rollback triggers
  autoRollback: {
    enabled: true,
    triggers: {
      sensitivityDrop: -1.0, // Auto-rollback if sensitivity drops 1%+
      mccDrop: -0.05, // Auto-rollback if MCC drops 0.05+
      criticalPHIMissed: true, // Auto-rollback if any SSN/DOB missed that wasn't before
    },
  },

  // Snapshot retention
  snapshots: {
    keepLast: 10, // Keep last 10 experiment snapshots
    compressOlderThan: 7, // Compress snapshots older than 7 days
  },
};

// ============================================================================
// DECISION ENGINE CONFIGURATION
// ============================================================================
const DECISION_CONFIG = {
  // History consultation is MANDATORY
  requireHistoryConsultation: true,

  // Minimum historical data points before making recommendations
  minHistoricalRuns: 3,

  // How far back to look for relevant history
  historyLookback: {
    recent: 5, // Last 5 runs for trend analysis
    relevant: 20, // Last 20 runs for pattern matching
    all: Infinity, // All time for "what worked before"
  },

  // Confidence thresholds for recommendations
  confidence: {
    high: 0.8, // Strong historical evidence
    medium: 0.5, // Some evidence
    low: 0.3, // Speculative
  },

  // Priority scoring weights
  priorityWeights: {
    historicalSuccess: 0.35, // Did this work before?
    potentialImpact: 0.3, // How many failures could it fix?
    riskLevel: 0.2, // Could it cause regressions?
    effort: 0.15, // How complex is the change?
  },
};

// ============================================================================
// PATTERN RECOGNITION CONFIGURATION
// ============================================================================
const PATTERN_CONFIG = {
  // Known failure archetypes
  archetypes: {
    OCR_CONFUSION: {
      name: "OCR Character Confusion",
      description: "Characters that look similar when scanned",
      indicators: ["0/O", "1/l/I", "5/S", "8/B", "6/G", "2/Z"],
      severity: "HIGH",
      commonFixes: [
        "Add character substitution patterns",
        "Implement fuzzy matching with edit distance",
        "Create OCR normalization preprocessing",
      ],
    },
    CASE_VARIATION: {
      name: "Case Sensitivity Issues",
      description: "Mixed case or unusual casing not recognized",
      severity: "MEDIUM",
      commonFixes: [
        "Add case-insensitive matching",
        "Normalize to lowercase before matching",
      ],
    },
    FORMAT_VARIATION: {
      name: "Format Not Recognized",
      description: "Valid data in unexpected format",
      severity: "HIGH",
      commonFixes: [
        "Add additional format patterns",
        "Use more flexible regex",
        "Implement format normalization",
      ],
    },
    SPACING_ISSUES: {
      name: "Whitespace Problems",
      description: "Extra spaces, missing spaces, unusual spacing",
      severity: "MEDIUM",
      commonFixes: [
        "Normalize whitespace before matching",
        "Allow flexible spacing in patterns",
      ],
    },
    CONTEXT_BLINDNESS: {
      name: "Missing Context Recognition",
      description: "Failed to use surrounding context",
      severity: "CRITICAL",
      commonFixes: [
        "Add field label detection",
        "Implement context windows",
        "Use semantic context clues",
      ],
    },
    TRUNCATION: {
      name: "Truncated Values",
      description: "PHI cut off or incomplete",
      severity: "HIGH",
      commonFixes: [
        "Detect partial matches",
        "Use prefix/suffix matching",
        "Extend boundary detection",
      ],
    },
  },

  // Clustering thresholds
  clustering: {
    minClusterSize: 3, // Minimum failures to form a pattern
    similarityThreshold: 0.7, // How similar failures must be to cluster
  },
};

// ============================================================================
// MCP SERVER CONFIGURATION
// ============================================================================
const MCP_CONFIG = {
  // Server identification
  name: "vulpes-learning-brain",
  version: "1.0.0",
  description:
    "Self-learning test intelligence for Vulpes Celare PHI redaction",

  // Supported transports
  transports: {
    stdio: true, // Default, maximum compatibility
    http: false, // Enable for networked operation
  },

  // Tool risk levels (for user consent)
  toolRiskLevels: {
    readOnly: [
      "get_current_state",
      "get_history",
      "get_recommendations",
      "get_llm_context",
    ],
    write: ["run_experiment", "record_intervention", "validate_hypothesis"],
    dangerous: ["rollback_intervention", "reset_knowledge_base"],
  },

  // Auto-injection of system prompts
  autoInjectPrompts: true,

  // Handshake timeout
  handshakeTimeout: 5000,
};

// ============================================================================
// BI-TEMPORAL CONFIGURATION
// ============================================================================
const TEMPORAL_CONFIG = {
  // Time dimensions tracked
  dimensions: {
    t_occurred: "When the event actually happened",
    t_recorded: "When we learned about it",
    t_valid_from: "When this knowledge became applicable",
    t_valid_until:
      "When this knowledge stopped being applicable (null = still valid)",
  },

  // Retention policy
  retention: {
    keepAllHistory: true, // Never delete, just mark invalid
    compactAfterDays: 30, // Compact old records after 30 days
    archiveAfterDays: 90, // Archive to cold storage after 90 days
  },
};

// ============================================================================
// GRADING PROFILES
// ============================================================================
const GRADING_PROFILES = {
  HIPAA_STRICT: {
    name: "HIPAA Strict",
    description: "Production-readiness evaluation",
    penaltyMode: "LINEAR",
    hardCaps: { sensitivity_90: "F", sensitivity_95: "C", sensitivity_98: "B" },
  },
  DEVELOPMENT: {
    name: "Development",
    description: "Balanced scoring for development progress",
    penaltyMode: "DIMINISHING",
    hardCaps: null,
    bonuses: { improvement: 5, noRegression: 3, perfectCategory: 3 },
  },
  RESEARCH: {
    name: "Research",
    description: "Focus on understanding, minimal penalties",
    penaltyMode: "CAPPED",
    penaltyCap: 20,
    hardCaps: null,
  },
  OCR_TOLERANT: {
    name: "OCR Tolerant",
    description: "Adjusted for high OCR error rates",
    penaltyMode: "OCR_WEIGHTED",
    ocrDiscounts: {
      none: 1.0,
      low: 0.8,
      medium: 0.5,
      high: 0.25,
      extreme: 0.1,
    },
  },
};

// ============================================================================
// EXPORT ALL CONFIGURATION
// ============================================================================
module.exports = {
  PATHS,
  METRICS_CONFIG,
  EXPERIMENT_CONFIG,
  DECISION_CONFIG,
  PATTERN_CONFIG,
  MCP_CONFIG,
  TEMPORAL_CONFIG,
  GRADING_PROFILES,

  // Utility functions
  ensureDirectories,

  // Convenience: default profile
  DEFAULT_GRADING_PROFILE: "DEVELOPMENT",

  // Convenience: is this a production check?
  isProductionCheck: (profile) => profile === "HIPAA_STRICT",
};
