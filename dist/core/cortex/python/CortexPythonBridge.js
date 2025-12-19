"use strict";
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
exports.CortexPythonBridge = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const events_1 = require("events");
const VulpesLogger_1 = require("../../../utils/VulpesLogger");
const DEFAULT_CONFIG = {
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
class CortexPythonBridge extends events_1.EventEmitter {
    config;
    pythonAvailable = null;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Check if Python and required dependencies are available
     */
    async checkPythonAvailable() {
        if (this.pythonAvailable !== null) {
            return this.pythonAvailable;
        }
        try {
            const pythonPath = this.resolvePythonPath();
            // Check Python version
            const versionResult = await this.runCommand(pythonPath, ['--version']);
            const version = versionResult.trim();
            if (!version.startsWith('Python 3')) {
                VulpesLogger_1.vulpesLogger.warn('Python 3.x required', { component: 'CortexBridge', found: version });
                this.pythonAvailable = false;
                return false;
            }
            // Check for required packages
            const checkPackages = await this.runCommand(pythonPath, [
                '-c',
                'import pandas; import numpy; import torch; print("OK")'
            ]).catch(() => null);
            if (checkPackages?.trim() !== 'OK') {
                VulpesLogger_1.vulpesLogger.warn('Required Python packages not installed. Install: pip install pandas numpy torch', { component: 'CortexBridge' });
                // We still mark as available - some tasks may work
            }
            this.pythonAvailable = true;
            return true;
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.warn('Python not available', { component: 'CortexBridge', error: String(error) });
            this.pythonAvailable = false;
            return false;
        }
    }
    /**
     * Execute a task in Python
     */
    async executeTask(request) {
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
        }
        catch (error) {
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
    async analyzeAuditLogs(logPath, options) {
        return this.executeTask({
            task: 'ANALYZE_AUDIT_LOGS',
            input: { logPath },
            options,
        });
    }
    /**
     * Train/fine-tune an OCR model on custom data
     */
    async trainOCRModel(options) {
        return this.executeTask({
            task: 'TRAIN_OCR_MODEL',
            input: options,
        });
    }
    /**
     * Calibrate confidence thresholds based on validation data
     */
    async calibrateThresholds(options) {
        return this.executeTask({
            task: 'CALIBRATE_THRESHOLDS',
            input: options,
        });
    }
    /**
     * Export a trained model to ONNX format
     */
    async exportToONNX(options) {
        return this.executeTask({
            task: 'EXPORT_ONNX',
            input: options,
        });
    }
    /**
     * Run a command and return stdout
     */
    runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(command, args, {
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
                }
                else {
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
    runPythonTask(pythonPath, inputJson) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(pythonPath, [this.config.cortexScriptPath], {
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
                }
                else {
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
    resolvePythonPath() {
        if (this.config.venvPath) {
            const isWindows = process.platform === 'win32';
            const venvPython = path.join(this.config.venvPath, isWindows ? 'Scripts/python.exe' : 'bin/python');
            if (fs.existsSync(venvPython)) {
                return venvPython;
            }
        }
        return this.config.pythonPath;
    }
    /**
     * Get the status of the Python environment
     */
    async getStatus() {
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
        }
        catch {
            return { available: true };
        }
    }
}
exports.CortexPythonBridge = CortexPythonBridge;
exports.default = CortexPythonBridge;
//# sourceMappingURL=CortexPythonBridge.js.map