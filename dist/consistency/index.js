"use strict";
/**
 * Consistency Module - Referential Consistency Across Documents
 *
 * This module provides cross-document PHI token consistency:
 *
 * - ReferentialConsistencyManager: Maintains consistent tokens per entity
 * - BatchProcessor: Process multiple documents with shared consistency
 *
 * @module consistency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBatch = exports.BatchProcessor = exports.ConsoleAuditLogger = exports.resetConsistencyManager = exports.initializeConsistencyManager = exports.getConsistencyManager = exports.ReferentialConsistencyManager = void 0;
var ReferentialConsistencyManager_1 = require("./ReferentialConsistencyManager");
Object.defineProperty(exports, "ReferentialConsistencyManager", { enumerable: true, get: function () { return ReferentialConsistencyManager_1.ReferentialConsistencyManager; } });
Object.defineProperty(exports, "getConsistencyManager", { enumerable: true, get: function () { return ReferentialConsistencyManager_1.getConsistencyManager; } });
Object.defineProperty(exports, "initializeConsistencyManager", { enumerable: true, get: function () { return ReferentialConsistencyManager_1.initializeConsistencyManager; } });
Object.defineProperty(exports, "resetConsistencyManager", { enumerable: true, get: function () { return ReferentialConsistencyManager_1.resetConsistencyManager; } });
Object.defineProperty(exports, "ConsoleAuditLogger", { enumerable: true, get: function () { return ReferentialConsistencyManager_1.ConsoleAuditLogger; } });
var BatchProcessor_1 = require("./BatchProcessor");
Object.defineProperty(exports, "BatchProcessor", { enumerable: true, get: function () { return BatchProcessor_1.BatchProcessor; } });
Object.defineProperty(exports, "processBatch", { enumerable: true, get: function () { return BatchProcessor_1.processBatch; } });
//# sourceMappingURL=index.js.map