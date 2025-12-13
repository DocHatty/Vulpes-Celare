"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_CONTEXT_CREDENTIAL_AFTER_NAME_PATTERN = exports.PROVIDER_CREDENTIAL_AFTER_NAME_PATTERN = exports.TITLE_PLUS_TRAILING_WORD_PATTERN = exports.TITLE_TRAILING_PATTERN = exports.TITLED_NAME_LOOKBACK_PATTERN = exports.TITLE_PREFIX_PATTERN = void 0;
const NameDetectionUtils_1 = require("../../utils/NameDetectionUtils");
exports.TITLE_PREFIX_PATTERN = new RegExp(`(?:${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`, "i");
exports.TITLED_NAME_LOOKBACK_PATTERN = new RegExp(`(?:${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Z][a-zA-Z'-]+(?:\\s+[A-Z][a-zA-Z'-]+)*\\s*$`, "i");
exports.TITLE_TRAILING_PATTERN = new RegExp(`\\b(${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`, "i");
exports.TITLE_PLUS_TRAILING_WORD_PATTERN = new RegExp(`\\b(${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`, "i");
exports.PROVIDER_CREDENTIAL_AFTER_NAME_PATTERN = /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|EdD|DrPH|DC|ND|JD|RN|NP|BSN|MSN|DNP|APRN|CRNA|CNS|CNM|LPN|LVN|CNA|PA|PA-C|PT|DPT|OT|OTR|SLP|RT|RRT|RD|RDN|LCSW|LMFT|LPC|LCPC|FACS|FACP|FACC|FACOG|FASN|FAAN|FAAP|FACHE|Esq|CPA|MBA|MPH|MHA|MHSA|ACNP-BC|FNP-BC|ANP-BC|PNP-BC|PMHNP-BC)\b/i;
exports.PROVIDER_CONTEXT_CREDENTIAL_AFTER_NAME_PATTERN = /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|EdD|DrPH|DC|ND|JD|RN|NP|BSN|MSN|DNP|APRN|CRNA|CNS|CNM|LPN|LVN|CNA|PA|PA-C|PT|DPT|OT|OTR|SLP|RT|RRT|RD|RDN|LCSW|LMFT|LPC|LCPC|FACS|FACP|FACC|FACOG|FASN|FAAN|FAAP|FACHE|FCCP|FAHA|Esq|CPA|MBA|MPH|MHA|MHSA|ACNP-BC|FNP-BC|ANP-BC|PNP-BC|PMHNP-BC|AGNP-C|OTR\/L)\b/i;
//# sourceMappingURL=TitledNamePatterns.js.map