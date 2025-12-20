"use strict";
/**
 * Cache Module - Semantic Document Caching for PHI Redaction
 *
 * This module provides high-performance caching for the redaction pipeline:
 *
 * - SemanticRedactionCache: Main cache with exact and structure-based matching
 * - StructureExtractor: Document structure extraction for template matching
 * - TemplateSpanMapper: Maps cached spans to new documents
 *
 * @module cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSpanMapper = exports.DocumentType = exports.StructureExtractor = exports.clearSemanticCache = exports.initializeSemanticCache = exports.getSemanticCache = exports.SemanticRedactionCache = void 0;
var SemanticRedactionCache_1 = require("./SemanticRedactionCache");
Object.defineProperty(exports, "SemanticRedactionCache", { enumerable: true, get: function () { return SemanticRedactionCache_1.SemanticRedactionCache; } });
Object.defineProperty(exports, "getSemanticCache", { enumerable: true, get: function () { return SemanticRedactionCache_1.getSemanticCache; } });
Object.defineProperty(exports, "initializeSemanticCache", { enumerable: true, get: function () { return SemanticRedactionCache_1.initializeSemanticCache; } });
Object.defineProperty(exports, "clearSemanticCache", { enumerable: true, get: function () { return SemanticRedactionCache_1.clearSemanticCache; } });
var StructureExtractor_1 = require("./StructureExtractor");
Object.defineProperty(exports, "StructureExtractor", { enumerable: true, get: function () { return StructureExtractor_1.StructureExtractor; } });
Object.defineProperty(exports, "DocumentType", { enumerable: true, get: function () { return StructureExtractor_1.DocumentType; } });
var TemplateSpanMapper_1 = require("./TemplateSpanMapper");
Object.defineProperty(exports, "TemplateSpanMapper", { enumerable: true, get: function () { return TemplateSpanMapper_1.TemplateSpanMapper; } });
//# sourceMappingURL=index.js.map