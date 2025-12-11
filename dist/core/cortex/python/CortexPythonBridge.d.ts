/**
 * CortexPythonBridge - Bridge to Python Intelligence Services
 *
 * This module enables Vulpes Celare to leverage Python's superior
 * data science ecosystem for offline tasks:
 *
 * - Training and fine-tuning OCR/detection models
 * - Large-scale audit log analysis (Pandas/PyArrow)
 * - ONNX model export for deployment back to Node.js
 *
 * Architecture:
 * - Spawns Python as a sidecar process on-demand
 * - Communicates via IPC (stdin/stdout JSON) or Parquet files
 * - Python process is NOT in the hot path (offline only)
 *
 * @module core/cortex/python/CortexPythonBridge
 */
import { EventEmitter } from 'events';
/**
 * Python task types
 */
export type CortexTask = 'ANALYZE_AUDIT_LOGS' | 'TRAIN_OCR_MODEL' | 'CALIBRATE_THRESHOLDS' | 'EXPORT_ONNX' | 'CUSTOM';
/**
 * Task request to send to Python
 */
export interface CortexTaskRequest {
    /** Task type */
    task: CortexTask;
    /** Input data or file paths */
    input: Record<string, any>;
    /** Task-specific options */
    options?: Record<string, any>;
}
/**
 * Response from Python task
 */
export interface CortexTaskResponse {
    /** Whether task succeeded */
    success: boolean;
    /** Result data */
    result?: Record<string, any>;
    /** Error message if failed */
    error?: string;
    /** Execution time in milliseconds */
    executionTimeMs?: number;
}
/**
 * Configuration for the Python bridge
 */
export interface CortexBridgeConfig {
    /** Path to Python executable */
    pythonPath?: string;
    /** Path to the Cortex Python script */
    cortexScriptPath?: string;
    /** Working directory for Python */
    workingDirectory?: string;
    /** Timeout for task execution (ms) */
    taskTimeout?: number;
    /** Virtual environment path (optional) */
    venvPath?: string;
}
/**
 * CortexPythonBridge - Interface to Python intelligence services
 *
 * @example
 * ```typescript
 * const bridge = new CortexPythonBridge();
 *
 * // Check if Python is available
 * const pythonReady = await bridge.checkPythonAvailable();
 * if (!pythonReady) {
 *     console.log('Python not available - install Python 3.9+ and dependencies');
 * }
 *
 * // Run analysis on audit logs
 * const result = await bridge.executeTask({
 *     task: 'ANALYZE_AUDIT_LOGS',
 *     input: {
 *         logPath: './audit_logs.parquet',
 *         lookbackDays: 30,
 *     },
 * });
 *
 * console.log('Analysis result:', result);
 * ```
 */
export declare class CortexPythonBridge extends EventEmitter {
    private config;
    private pythonProcess;
    private pythonAvailable;
    constructor(config?: Partial<CortexBridgeConfig>);
    /**
     * Check if Python and required dependencies are available
     */
    checkPythonAvailable(): Promise<boolean>;
    /**
     * Execute a task in Python
     */
    executeTask(request: CortexTaskRequest): Promise<CortexTaskResponse>;
    /**
     * Analyze audit logs for missed PHI patterns
     */
    analyzeAuditLogs(logPath: string, options?: {
        lookbackDays?: number;
        sampleSize?: number;
    }): Promise<CortexTaskResponse>;
    /**
     * Train/fine-tune an OCR model on custom data
     */
    trainOCRModel(options: {
        trainingDataPath: string;
        baseModel?: string;
        epochs?: number;
        outputPath?: string;
    }): Promise<CortexTaskResponse>;
    /**
     * Calibrate confidence thresholds based on validation data
     */
    calibrateThresholds(options: {
        validationDataPath: string;
        targetSensitivity?: number;
        targetSpecificity?: number;
    }): Promise<CortexTaskResponse>;
    /**
     * Export a trained model to ONNX format
     */
    exportToONNX(options: {
        modelPath: string;
        outputPath: string;
        optimize?: boolean;
    }): Promise<CortexTaskResponse>;
    /**
     * Run a command and return stdout
     */
    private runCommand;
    /**
     * Run a Python task with JSON input/output
     */
    private runPythonTask;
    /**
     * Resolve the Python executable path
     */
    private resolvePythonPath;
    /**
     * Get the status of the Python environment
     */
    getStatus(): Promise<{
        available: boolean;
        pythonVersion?: string;
        packages?: string[];
    }>;
}
export default CortexPythonBridge;
//# sourceMappingURL=CortexPythonBridge.d.ts.map