"use strict";
/**
 * Validation Module
 *
 * Provides automated validation capabilities:
 * - LLM-as-Judge for PHI detection validation
 * - False positive identification
 * - Confidence calibration
 *
 * @module validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmJudge = exports.LLMJudge = void 0;
var LLMJudge_1 = require("./LLMJudge");
Object.defineProperty(exports, "LLMJudge", { enumerable: true, get: function () { return LLMJudge_1.LLMJudge; } });
Object.defineProperty(exports, "llmJudge", { enumerable: true, get: function () { return LLMJudge_1.llmJudge; } });
//# sourceMappingURL=index.js.map