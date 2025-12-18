"use strict";
/**
 * Vulpes Celare - Errors Module
 *
 * Structured error handling with codes, resolution steps, and documentation links.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntegrationError = exports.createPipelineError = exports.createDetectionError = exports.createComplianceError = exports.createSecurityError = exports.createFileError = exports.createValidationError = exports.createConfigError = exports.ERROR_CODES = exports.ErrorAggregator = exports.VulpesError = void 0;
var VulpesError_1 = require("./VulpesError");
Object.defineProperty(exports, "VulpesError", { enumerable: true, get: function () { return VulpesError_1.VulpesError; } });
Object.defineProperty(exports, "ErrorAggregator", { enumerable: true, get: function () { return VulpesError_1.ErrorAggregator; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return VulpesError_1.ERROR_CODES; } });
Object.defineProperty(exports, "createConfigError", { enumerable: true, get: function () { return VulpesError_1.createConfigError; } });
Object.defineProperty(exports, "createValidationError", { enumerable: true, get: function () { return VulpesError_1.createValidationError; } });
Object.defineProperty(exports, "createFileError", { enumerable: true, get: function () { return VulpesError_1.createFileError; } });
Object.defineProperty(exports, "createSecurityError", { enumerable: true, get: function () { return VulpesError_1.createSecurityError; } });
Object.defineProperty(exports, "createComplianceError", { enumerable: true, get: function () { return VulpesError_1.createComplianceError; } });
Object.defineProperty(exports, "createDetectionError", { enumerable: true, get: function () { return VulpesError_1.createDetectionError; } });
Object.defineProperty(exports, "createPipelineError", { enumerable: true, get: function () { return VulpesError_1.createPipelineError; } });
Object.defineProperty(exports, "createIntegrationError", { enumerable: true, get: function () { return VulpesError_1.createIntegrationError; } });
//# sourceMappingURL=index.js.map