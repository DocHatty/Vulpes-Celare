"use strict";
/**
 * ONNXInference - Base Class for ONNX Model Inference
 *
 * Provides common functionality for running inference with ONNX models,
 * including tensor creation, batch processing, and output parsing.
 *
 * @module ml/ONNXInference
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
exports.SimpleWordPieceTokenizer = exports.ONNXInference = void 0;
const ort = __importStar(require("onnxruntime-node"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("ONNXInference");
/**
 * Base class for ONNX inference operations
 */
class ONNXInference {
    session;
    tokenizer = null;
    constructor(session) {
        this.session = session;
    }
    /**
     * Get input names for the model
     */
    getInputNames() {
        return this.session.inputNames;
    }
    /**
     * Get output names for the model
     */
    getOutputNames() {
        return this.session.outputNames;
    }
    /**
     * Create a tensor from a 1D array
     */
    createTensor1D(data, dtype = "int64") {
        if (dtype === "int64") {
            const bigIntData = data instanceof BigInt64Array
                ? data
                : BigInt64Array.from(data.map(n => BigInt(n)));
            return new ort.Tensor("int64", bigIntData, [bigIntData.length]);
        }
        else if (dtype === "float32") {
            return new ort.Tensor("float32", Float32Array.from(data), [data.length]);
        }
        else {
            return new ort.Tensor("int32", Int32Array.from(data), [data.length]);
        }
    }
    /**
     * Create a tensor from a 2D array (batch)
     */
    createTensor2D(data, dtype = "int64") {
        const batchSize = data.length;
        const seqLength = data[0]?.length || 0;
        const flat = data.flat();
        if (dtype === "int64") {
            const bigIntData = BigInt64Array.from(flat.map(n => BigInt(n)));
            return new ort.Tensor("int64", bigIntData, [batchSize, seqLength]);
        }
        else if (dtype === "float32") {
            return new ort.Tensor("float32", Float32Array.from(flat), [batchSize, seqLength]);
        }
        else {
            return new ort.Tensor("int32", Int32Array.from(flat), [batchSize, seqLength]);
        }
    }
    /**
     * Create a tensor from a 3D array
     */
    createTensor3D(data, dtype = "float32") {
        const dim0 = data.length;
        const dim1 = data[0]?.length || 0;
        const dim2 = data[0]?.[0]?.length || 0;
        const flat = data.flat(2);
        if (dtype === "float32") {
            return new ort.Tensor("float32", Float32Array.from(flat), [dim0, dim1, dim2]);
        }
        else {
            return new ort.Tensor("int32", Int32Array.from(flat), [dim0, dim1, dim2]);
        }
    }
    /**
     * Run inference with the given inputs
     */
    async runInference(feeds) {
        try {
            return await this.session.run(feeds);
        }
        catch (error) {
            logger.error(`Inference failed: ${error}`);
            throw error;
        }
    }
    /**
     * Extract float array from output tensor
     */
    extractFloatArray(output) {
        return output.data;
    }
    /**
     * Extract 2D float array from output tensor
     */
    extract2DFloatArray(output) {
        const data = output.data;
        const [batchSize, seqLength] = output.dims;
        const result = [];
        for (let i = 0; i < batchSize; i++) {
            const row = [];
            for (let j = 0; j < seqLength; j++) {
                row.push(data[i * seqLength + j]);
            }
            result.push(row);
        }
        return result;
    }
    /**
     * Extract 3D float array from output tensor
     */
    extract3DFloatArray(output) {
        const data = output.data;
        const [dim0, dim1, dim2] = output.dims;
        const result = [];
        for (let i = 0; i < dim0; i++) {
            const matrix = [];
            for (let j = 0; j < dim1; j++) {
                const row = [];
                for (let k = 0; k < dim2; k++) {
                    row.push(data[i * dim1 * dim2 + j * dim2 + k]);
                }
                matrix.push(row);
            }
            result.push(matrix);
        }
        return result;
    }
    /**
     * Get argmax along last dimension
     */
    argmax(scores) {
        let maxIdx = 0;
        let maxVal = scores[0];
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] > maxVal) {
                maxVal = scores[i];
                maxIdx = i;
            }
        }
        return maxIdx;
    }
    /**
     * Apply softmax to scores
     */
    softmax(scores) {
        const maxScore = Math.max(...scores);
        const exp = scores.map(s => Math.exp(s - maxScore));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(e => e / sum);
    }
    /**
     * Apply sigmoid to a single value
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    /**
     * Dispose of resources
     */
    async dispose() {
        // Session is managed by ModelManager, don't release here
    }
}
exports.ONNXInference = ONNXInference;
/**
 * Simple word-piece tokenizer for BERT-style models
 * This is a basic implementation - production should use a proper tokenizer
 */
class SimpleWordPieceTokenizer {
    vocab;
    idToToken;
    unkId;
    clsId;
    sepId;
    padId;
    maxLength;
    constructor(vocabData, options) {
        this.vocab = new Map(Object.entries(vocabData));
        this.idToToken = new Map();
        for (const [token, id] of this.vocab) {
            this.idToToken.set(id, token);
        }
        this.unkId = this.vocab.get("[UNK]") || 100;
        this.clsId = this.vocab.get("[CLS]") || 101;
        this.sepId = this.vocab.get("[SEP]") || 102;
        this.padId = this.vocab.get("[PAD]") || 0;
        this.maxLength = options?.maxLength || 512;
    }
    encode(text, options) {
        const addSpecial = options?.addSpecialTokens !== false;
        // Basic tokenization: lowercase and split on whitespace/punctuation
        const tokens = this.basicTokenize(text);
        // Convert tokens to IDs with word-piece splitting
        const ids = [];
        if (addSpecial) {
            ids.push(this.clsId);
        }
        for (const token of tokens) {
            const subTokens = this.wordPieceTokenize(token);
            for (const subToken of subTokens) {
                ids.push(this.vocab.get(subToken) ?? this.unkId);
            }
        }
        if (addSpecial) {
            ids.push(this.sepId);
        }
        // Truncate if necessary
        const truncatedIds = ids.slice(0, this.maxLength);
        // Create attention mask
        const attentionMask = new Array(truncatedIds.length).fill(1);
        return {
            input_ids: truncatedIds,
            attention_mask: attentionMask,
        };
    }
    decode(ids) {
        const tokens = ids
            .map(id => this.idToToken.get(id) || "[UNK]")
            .filter(t => !["[CLS]", "[SEP]", "[PAD]"].includes(t));
        // Reconstruct text from word-pieces
        let result = "";
        for (const token of tokens) {
            if (token.startsWith("##")) {
                result += token.slice(2);
            }
            else {
                result += (result ? " " : "") + token;
            }
        }
        return result;
    }
    basicTokenize(text) {
        // Lowercase
        text = text.toLowerCase();
        // Add spaces around punctuation
        text = text.replace(/([.,!?;:'"()\[\]{}])/g, " $1 ");
        // Split on whitespace
        return text.split(/\s+/).filter(t => t.length > 0);
    }
    wordPieceTokenize(token) {
        // If the whole token is in vocab, return it
        if (this.vocab.has(token)) {
            return [token];
        }
        // Otherwise, try to split into word pieces
        const subTokens = [];
        let start = 0;
        while (start < token.length) {
            let end = token.length;
            let found = false;
            while (start < end) {
                let substr = token.slice(start, end);
                if (start > 0) {
                    substr = "##" + substr;
                }
                if (this.vocab.has(substr)) {
                    subTokens.push(substr);
                    found = true;
                    break;
                }
                end--;
            }
            if (!found) {
                // Character not found in vocab, use [UNK]
                subTokens.push("[UNK]");
                break;
            }
            start = end;
        }
        return subTokens;
    }
}
exports.SimpleWordPieceTokenizer = SimpleWordPieceTokenizer;
exports.default = ONNXInference;
//# sourceMappingURL=ONNXInference.js.map