"use strict";
/**
 * Adversarial Defense Module
 *
 * Provides protection against adversarial attacks on PHI detection:
 * - Unicode homoglyph attacks (Cyrillic/Greek lookalikes)
 * - Zero-width character insertion
 * - Mixed script obfuscation
 *
 * @module adversarial
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnicodeNormalizer = void 0;
var UnicodeNormalizer_1 = require("./UnicodeNormalizer");
Object.defineProperty(exports, "UnicodeNormalizer", { enumerable: true, get: function () { return UnicodeNormalizer_1.UnicodeNormalizer; } });
//# sourceMappingURL=index.js.map