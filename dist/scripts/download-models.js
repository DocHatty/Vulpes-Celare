#!/usr/bin/env npx ts-node
"use strict";
/**
 * Model Download Script for Vulpes Celare ML Features
 *
 * Downloads pre-trained ONNX models from HuggingFace Hub:
 * - GLiNER: Zero-shot NER for name detection
 * - TinyBERT: Confidence re-ranking
 * - FP Classifier: False positive detection
 *
 * Usage:
 *   npm run models:download              # Download all models
 *   npm run models:download -- --model gliner    # Download specific model
 *   npm run models:download -- --force           # Re-download existing models
 *
 * @module scripts/download-models
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
const MODELS = {
    gliner: {
        name: "GLiNER",
        description: "Zero-shot Named Entity Recognition for PHI detection",
        directory: "gliner",
        files: [
            {
                filename: "model.onnx",
                url: "https://huggingface.co/urchade/gliner_multi-v2.1/resolve/main/onnx/model.onnx",
                required: true,
            },
            {
                filename: "tokenizer.json",
                url: "https://huggingface.co/urchade/gliner_multi-v2.1/resolve/main/tokenizer.json",
                required: true,
            },
            {
                filename: "config.json",
                url: "https://huggingface.co/urchade/gliner_multi-v2.1/resolve/main/config.json",
                required: false,
            },
        ],
        sizeEstimate: "~100MB",
    },
    tinybert: {
        name: "TinyBERT",
        description: "4-layer distilled BERT for confidence re-ranking",
        directory: "tinybert",
        files: [
            {
                filename: "model.onnx",
                url: "https://huggingface.co/huawei-noah/TinyBERT_General_4L_312D/resolve/main/onnx/model.onnx",
                required: true,
            },
            {
                filename: "vocab.json",
                url: "https://huggingface.co/huawei-noah/TinyBERT_General_4L_312D/resolve/main/vocab.txt",
                required: true,
            },
            {
                filename: "config.json",
                url: "https://huggingface.co/huawei-noah/TinyBERT_General_4L_312D/resolve/main/config.json",
                required: false,
            },
        ],
        sizeEstimate: "~60MB",
    },
    fp_classifier: {
        name: "FP Classifier",
        description: "False positive detection classifier",
        directory: "fp_classifier",
        files: [
            {
                filename: "model.onnx",
                // This would typically be a custom-trained model hosted on HuggingFace
                // Using a placeholder URL - replace with actual model location
                url: "https://huggingface.co/vulpes-celare/fp-classifier/resolve/main/model.onnx",
                required: true,
            },
        ],
        sizeEstimate: "~5MB",
    },
};
// Console styling
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
};
const COMPONENT = "ModelDownloader";
function log(message) {
    RadiologyLogger_1.RadiologyLogger.info(COMPONENT, message);
}
function logSuccess(message) {
    RadiologyLogger_1.RadiologyLogger.info(COMPONENT, `${colors.green}✓${colors.reset} ${message}`);
}
function logWarning(message) {
    RadiologyLogger_1.RadiologyLogger.warn(COMPONENT, `${colors.yellow}⚠${colors.reset} ${message}`);
}
function logError(message) {
    RadiologyLogger_1.RadiologyLogger.error(COMPONENT, `${colors.red}✗${colors.reset} ${message}`);
}
function logInfo(message) {
    RadiologyLogger_1.RadiologyLogger.info(COMPONENT, `${colors.blue}ℹ${colors.reset} ${message}`);
}
/**
 * Get the models directory path
 */
function getModelsDir() {
    const envDir = process.env.VULPES_MODELS_DIR;
    if (envDir)
        return envDir;
    // Default to ./models at package root
    return path.resolve(__dirname, "../models");
}
/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
/**
 * Check if file exists
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
/**
 * Download a file with progress reporting
 */
async function downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === "https:" ? https : http;
        const request = protocol.get(url, { timeout: 60000 }, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadFile(redirectUrl, destPath, onProgress)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            const totalSize = parseInt(response.headers["content-length"] || "0", 10);
            let downloadedSize = 0;
            const fileStream = fs.createWriteStream(destPath);
            response.on("data", (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize > 0 && onProgress) {
                    onProgress(Math.round((downloadedSize / totalSize) * 100));
                }
            });
            response.pipe(fileStream);
            fileStream.on("finish", () => {
                fileStream.close();
                resolve();
            });
            fileStream.on("error", (err) => {
                fs.unlink(destPath, () => { }); // Delete partial file
                reject(err);
            });
        });
        request.on("error", (err) => {
            reject(err);
        });
        request.on("timeout", () => {
            request.destroy();
            reject(new Error("Request timed out"));
        });
    });
}
/**
 * Convert vocab.txt to vocab.json (BERT format)
 */
function convertVocabTxtToJson(txtPath, jsonPath) {
    if (!fs.existsSync(txtPath))
        return;
    const content = fs.readFileSync(txtPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    const vocab = {};
    lines.forEach((token, index) => {
        vocab[token.trim()] = index;
    });
    fs.writeFileSync(jsonPath, JSON.stringify(vocab, null, 2));
    fs.unlinkSync(txtPath); // Remove original txt file
}
/**
 * Download a single model
 */
async function downloadModel(modelId, force = false) {
    const model = MODELS[modelId];
    if (!model) {
        logError(`Unknown model: ${modelId}`);
        return false;
    }
    const modelsDir = getModelsDir();
    const modelDir = path.join(modelsDir, model.directory);
    log("");
    log(`${colors.bright}${colors.cyan}Downloading ${model.name}${colors.reset}`);
    log(`${colors.dim}${model.description}${colors.reset}`);
    log(`${colors.dim}Estimated size: ${model.sizeEstimate}${colors.reset}`);
    ensureDir(modelDir);
    let allSuccess = true;
    for (const file of model.files) {
        const destPath = path.join(modelDir, file.filename);
        // Check if file already exists
        if (fileExists(destPath) && !force) {
            logInfo(`${file.filename} already exists, skipping`);
            continue;
        }
        log(`  Downloading ${file.filename}...`);
        try {
            // Show progress
            let lastPercent = -1;
            await downloadFile(file.url, destPath, (percent) => {
                if (percent !== lastPercent && percent % 10 === 0) {
                    process.stdout.write(`\r  Downloading ${file.filename}... ${percent}%`);
                    lastPercent = percent;
                }
            });
            process.stdout.write("\r" + " ".repeat(60) + "\r"); // Clear progress line
            // Handle vocab.txt to vocab.json conversion
            if (file.filename === "vocab.json" && destPath.endsWith(".txt")) {
                const jsonPath = destPath.replace(".txt", ".json");
                convertVocabTxtToJson(destPath, jsonPath);
            }
            logSuccess(`${file.filename} downloaded successfully`);
        }
        catch (error) {
            process.stdout.write("\r" + " ".repeat(60) + "\r"); // Clear progress line
            if (file.required) {
                logError(`Failed to download ${file.filename}: ${error}`);
                allSuccess = false;
            }
            else {
                logWarning(`Optional file ${file.filename} not available: ${error}`);
            }
        }
    }
    if (allSuccess) {
        logSuccess(`${model.name} ready at ${modelDir}`);
    }
    else {
        logWarning(`${model.name} partially downloaded`);
    }
    return allSuccess;
}
/**
 * List available models and their status
 */
function listModels() {
    const modelsDir = getModelsDir();
    log("");
    log(`${colors.bright}Available Models:${colors.reset}`);
    log("");
    for (const [id, model] of Object.entries(MODELS)) {
        const modelDir = path.join(modelsDir, model.directory);
        const mainModel = path.join(modelDir, "model.onnx");
        const installed = fileExists(mainModel);
        const status = installed
            ? `${colors.green}[INSTALLED]${colors.reset}`
            : `${colors.dim}[NOT INSTALLED]${colors.reset}`;
        log(`  ${colors.cyan}${id.padEnd(15)}${colors.reset} ${status}`);
        log(`  ${colors.dim}${model.description}${colors.reset}`);
        log(`  ${colors.dim}Size: ${model.sizeEstimate}${colors.reset}`);
        log("");
    }
    log(`Models directory: ${modelsDir}`);
}
/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        models: [],
        force: false,
        list: false,
        help: false,
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--help" || arg === "-h") {
            result.help = true;
        }
        else if (arg === "--force" || arg === "-f") {
            result.force = true;
        }
        else if (arg === "--list" || arg === "-l") {
            result.list = true;
        }
        else if (arg === "--model" || arg === "-m") {
            const nextArg = args[++i];
            if (nextArg && !nextArg.startsWith("-")) {
                result.models.push(nextArg);
            }
        }
        else if (!arg.startsWith("-")) {
            result.models.push(arg);
        }
    }
    return result;
}
/**
 * Print help message
 */
function printHelp() {
    log(`
${colors.bright}Vulpes Celare Model Download Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run models:download              Download all models
  npm run models:download -- --model gliner    Download specific model
  npm run models:download -- --list    List available models
  npm run models:download -- --force   Re-download existing models
  npm run models:download -- --help    Show this help

${colors.cyan}Available Models:${colors.reset}
  gliner          GLiNER zero-shot NER (~100MB)
  tinybert        TinyBERT confidence ranker (~60MB)
  fp_classifier   False positive classifier (~5MB)

${colors.cyan}Environment Variables:${colors.reset}
  VULPES_MODELS_DIR    Override default models directory

${colors.cyan}Examples:${colors.reset}
  npm run models:download
  npm run models:download -- --model gliner
  npm run models:download -- --model gliner --model tinybert
  npm run models:download -- --force
`);
}
/**
 * Main entry point
 */
async function main() {
    const args = parseArgs();
    if (args.help) {
        printHelp();
        process.exit(0);
    }
    if (args.list) {
        listModels();
        process.exit(0);
    }
    log("");
    log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    log(`${colors.bright}${colors.cyan}║     Vulpes Celare - Model Download Script             ║${colors.reset}`);
    log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
    const modelsDir = getModelsDir();
    log(`${colors.dim}Models directory: ${modelsDir}${colors.reset}`);
    ensureDir(modelsDir);
    // Determine which models to download
    const modelsToDownload = args.models.length > 0 ? args.models : Object.keys(MODELS);
    let allSuccess = true;
    for (const modelId of modelsToDownload) {
        const success = await downloadModel(modelId, args.force);
        if (!success)
            allSuccess = false;
    }
    log("");
    if (allSuccess) {
        logSuccess("All models downloaded successfully!");
        log("");
        log(`${colors.dim}To enable ML features, set environment variables:${colors.reset}`);
        log(`  VULPES_USE_GLINER=1          # Enable GLiNER name detection`);
        log(`  VULPES_USE_ML_CONFIDENCE=1   # Enable TinyBERT confidence re-ranking`);
        log(`  VULPES_USE_ML_FP_FILTER=1    # Enable ML false positive filtering`);
        log(`  VULPES_ML_DEVICE=cuda        # Use GPU acceleration (optional)`);
    }
    else {
        logWarning("Some models failed to download. Check errors above.");
        logInfo("You can retry with: npm run models:download -- --force");
        process.exit(1);
    }
}
// Run
main().catch((error) => {
    logError(`Download failed: ${error}`);
    process.exit(1);
});
//# sourceMappingURL=download-models.js.map