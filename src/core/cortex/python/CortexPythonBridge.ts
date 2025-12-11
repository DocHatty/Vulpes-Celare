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

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

/**
 * Python task types
 */
export type CortexTask =
    | 'ANALYZE_AUDIT_LOGS'
    | 'TRAIN_OCR_MODEL'
    | 'CALIBRATE_THRESHOLDS'
    | 'EXPORT_ONNX'
    | 'CUSTOM';

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

const DEFAULT_CONFIG: Required<CortexBridgeConfig> = {
    pythonPath: 'python',
    cortexScriptPath: path.join(__dirname, '../../../../python/cortex_brain.py'),
    workingDirectory: path.join(__dirname, '../../../../'),
    taskTimeout: 300000, // 5 minutes
    venvPath: '',
};

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
export class CortexPythonBridge extends EventEmitter {
    private config: Required<CortexBridgeConfig>;
    private pythonProcess: ChildProcess | null = null;
    private pythonAvailable: boolean | null = null;

    constructor(config: Partial<CortexBridgeConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Check if Python and required dependencies are available
     */
    async checkPythonAvailable(): Promise<boolean> {
        if (this.pythonAvailable !== null) {
            return this.pythonAvailable;
        }

        try {
            const pythonPath = this.resolvePythonPath();

            // Check Python version
            const versionResult = await this.runCommand(pythonPath, ['--version']);
            const version = versionResult.trim();

            if (!version.startsWith('Python 3')) {
                console.warn('[CortexBridge] Python 3.x required, found:', version);
                this.pythonAvailable = false;
                return false;
            }

            // Check for required packages
            const checkPackages = await this.runCommand(pythonPath, [
                '-c',
                'import pandas; import numpy; import torch; print("OK")'
            ]).catch(() => null);

            if (checkPackages?.trim() !== 'OK') {
                console.warn('[CortexBridge] Required Python packages not installed.');
                console.warn('[CortexBridge] Install: pip install pandas numpy torch');
                // We still mark as available - some tasks may work
            }

            this.pythonAvailable = true;
            return true;
        } catch (error) {
            console.warn('[CortexBridge] Python not available:', error);
            this.pythonAvailable = false;
            return false;
        }
    }

    /**
     * Execute a task in Python
     */
    async executeTask(request: CortexTaskRequest): Promise<CortexTaskResponse> {
        const startTime = Date.now();

        // Ensure Python is available
        const available = await this.checkPythonAvailable();
        if (!available) {
            return {
                success: false,
                error: 'Python is not available. Install Python 3.9+ with: pip install pandas numpy torch',
            };
        }

        // Check if cortex script exists
        if (!fs.existsSync(this.config.cortexScriptPath)) {
            return {
                success: false,
                error: `Cortex script not found at: ${this.config.cortexScriptPath}`,
            };
        }

        try {
            const pythonPath = this.resolvePythonPath();
            const requestJson = JSON.stringify(request);

            // Run Python script with task as input
            const result = await this.runPythonTask(pythonPath, requestJson);

            return {
                success: true,
                result: JSON.parse(result),
                executionTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Analyze audit logs for missed PHI patterns
     */
    async analyzeAuditLogs(logPath: string, options?: {
        lookbackDays?: number;
        sampleSize?: number;
    }): Promise<CortexTaskResponse> {
        return this.executeTask({
            task: 'ANALYZE_AUDIT_LOGS',
            input: { logPath },
            options,
        });
    }

    /**
     * Train/fine-tune an OCR model on custom data
     */
    async trainOCRModel(options: {
        trainingDataPath: string;
        baseModel?: string;
        epochs?: number;
        outputPath?: string;
    }): Promise<CortexTaskResponse> {
        return this.executeTask({
            task: 'TRAIN_OCR_MODEL',
            input: options,
        });
    }

    /**
     * Calibrate confidence thresholds based on validation data
     */
    async calibrateThresholds(options: {
        validationDataPath: string;
        targetSensitivity?: number;
        targetSpecificity?: number;
    }): Promise<CortexTaskResponse> {
        return this.executeTask({
            task: 'CALIBRATE_THRESHOLDS',
            input: options,
        });
    }

    /**
     * Export a trained model to ONNX format
     */
    async exportToONNX(options: {
        modelPath: string;
        outputPath: string;
        optimize?: boolean;
    }): Promise<CortexTaskResponse> {
        return this.executeTask({
            task: 'EXPORT_ONNX',
            input: options,
        });
    }

    /**
     * Run a command and return stdout
     */
    private runCommand(command: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, {
                cwd: this.config.workingDirectory,
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(stderr || `Process exited with code ${code}`));
                }
            });

            proc.on('error', reject);

            // Timeout
            setTimeout(() => {
                proc.kill();
                reject(new Error('Command timed out'));
            }, this.config.taskTimeout);
        });
    }

    /**
     * Run a Python task with JSON input/output
     */
    private runPythonTask(pythonPath: string, inputJson: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const proc = spawn(pythonPath, [this.config.cortexScriptPath], {
                cwd: this.config.workingDirectory,
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
                this.emit('log', { level: 'stderr', message: data.toString() });
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(stderr || `Python exited with code ${code}`));
                }
            });

            proc.on('error', reject);

            // Send input
            proc.stdin?.write(inputJson);
            proc.stdin?.end();

            // Timeout
            const timeout = setTimeout(() => {
                proc.kill();
                reject(new Error('Python task timed out'));
            }, this.config.taskTimeout);

            proc.on('close', () => clearTimeout(timeout));
        });
    }

    /**
     * Resolve the Python executable path
     */
    private resolvePythonPath(): string {
        if (this.config.venvPath) {
            const isWindows = process.platform === 'win32';
            const venvPython = path.join(
                this.config.venvPath,
                isWindows ? 'Scripts/python.exe' : 'bin/python'
            );
            if (fs.existsSync(venvPython)) {
                return venvPython;
            }
        }
        return this.config.pythonPath;
    }

    /**
     * Get the status of the Python environment
     */
    async getStatus(): Promise<{
        available: boolean;
        pythonVersion?: string;
        packages?: string[];
    }> {
        const available = await this.checkPythonAvailable();
        if (!available) {
            return { available: false };
        }

        try {
            const pythonPath = this.resolvePythonPath();
            const version = await this.runCommand(pythonPath, ['--version']);

            const packagesOutput = await this.runCommand(pythonPath, [
                '-c',
                'import pkg_resources; print([p.project_name for p in pkg_resources.working_set])'
            ]).catch(() => '[]');

            return {
                available: true,
                pythonVersion: version.trim(),
                packages: JSON.parse(packagesOutput.replace(/'/g, '"')),
            };
        } catch {
            return { available: true };
        }
    }
}

export default CortexPythonBridge;
