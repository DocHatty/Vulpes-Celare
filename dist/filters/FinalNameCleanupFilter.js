"use strict";
/**
 * Final Name Cleanup Filter
 *
 * Runs AFTER all name filters to clean up false positives
 * This is the Phileas Post-Filter Pipeline integrated as a final cleanup step
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalNameCleanupFilter = void 0;
const RedactionEngine_1 = require("../RedactionEngine");
class FinalNameCleanupFilter extends RedactionEngine_1.BaseFilter {
    getType() {
        return "NAME"; // Must return NAME to be applied with other NAME filters
    }
    /**
     * Clean up invalid NAME tokens detected by previous filters
     */
    apply(text, config, context) {
        // Extract all NAME tokens and validate them
        const tokenPattern = /\{\{NAME_[^}]+\}\}/g;
        let match;
        const invalidTokens = [];
        while ((match = tokenPattern.exec(text)) !== null) {
            const token = match[0];
            const originalValue = context.getOriginalValue(token);
            if (!originalValue)
                continue;
            // Validate the name
            if (this.shouldFilterOut(originalValue, text)) {
                invalidTokens.push(token);
            }
        }
        // Remove invalid tokens (restore original value)
        let result = text;
        for (const token of invalidTokens) {
            const originalValue = context.getOriginalValue(token);
            if (originalValue) {
                result = result.replace(new RegExp(this.escapeRegex(token), "g"), originalValue);
            }
        }
        return result;
    }
    /**
     * Determine if a detected name should be filtered out (false positive)
     */
    shouldFilterOut(name, fullText) {
        const normalized = name.trim();
        const upperName = normalized.toUpperCase();
        // Filter 0: Exact match false positive list (document structure phrases)
        const exactFalsePositives = new Set([
            // Document titles/types
            "Sample Body Radiology Report",
            "Radiology Report",
            "Progress Note",
            "Discharge Summary",
            "Consultation Report",
            "Operative Report",
            "Pathology Report",
            "Lab Report",
            // Facility types
            "Imaging Center",
            "Medical Center",
            "Health Center",
            "Regional Hospital",
            "Community Hospital",
            "Urgent Care",
            // Professional titles/descriptors
            "Board Certified Radiologist",
            "Board Certified",
            "Attending Physician",
            "Consulting Physician",
            "Primary Care",
            "Emergency Medicine",
            "Internal Medicine",
            "Family Medicine",
            // Signature/attestation
            "ELECTRONICALLY SIGNED",
            "Electronically Signed",
            "Digitally Signed",
            "Electronic Signature",
            // Other document structure
            "Main Street",
            "Street Address",
            "Mailing Address",
            "Physical Address",
        ]);
        if (exactFalsePositives.has(normalized)) {
            return true;
        }
        // Filter 0b: Case-insensitive exact matches
        const lowerName = normalized.toLowerCase();
        const lowerFalsePositives = new Set([
            "sample body radiology report",
            "imaging center",
            "board certified radiologist",
            "electronically signed",
            "main street",
        ]);
        if (lowerFalsePositives.has(lowerName)) {
            return true;
        }
        // Filter 1: All caps headings at start of line
        if (/^[A-Z\s]+$/.test(normalized)) {
            const lines = fullText.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === normalized || trimmed.startsWith(normalized)) {
                    return true; // This is a heading
                }
            }
        }
        // Filter 2: Contains document structure words
        const structureWords = [
            "RECORD",
            "INFORMATION",
            "SECTION",
            "NOTES",
            "HISTORY",
            "DEPARTMENT",
            "REPORT",
            "CENTER",
            "HOSPITAL",
            "CLINIC",
            "SIGNED",
            "CERTIFIED",
            "IMAGING",
        ];
        for (const word of structureWords) {
            if (upperName.includes(word)) {
                return true;
            }
        }
        // Filter 3: Too short (less than 5 chars) and not comma-separated
        if (normalized.length < 5 && !normalized.includes(",")) {
            return true;
        }
        // Filter 4: Starts with article, preposition, or common word
        const invalidStarts = [
            "The ",
            "A ",
            "An ",
            "To ",
            "From ",
            "In ",
            "On ",
            "At ",
            "Is ",
            "Was ",
            "Are ",
            "Sample ",
            "Board ",
        ];
        for (const start of invalidStarts) {
            if (normalized.startsWith(start)) {
                return true;
            }
        }
        // Filter 5: Ends with trailing words (captured too much)
        const invalidEndings = [
            " the",
            " at",
            " in",
            " on",
            " to",
            " from",
            " reviewed",
            " case",
            " was",
            " is",
            " are",
            " patient",
            " doctor",
            " nurse",
            " staff",
            " center",
            " hospital",
            " clinic",
            " report",
            " signed",
            " street",
        ];
        for (const ending of invalidEndings) {
            if (lowerName.endsWith(ending)) {
                return true;
            }
        }
        // Filter 6: Common medical/clinical phrases
        const medicalPhrases = [
            "The patient",
            "The doctor",
            "Emergency Department",
            "Intensive Care",
            "Medical History",
            "Physical Examination",
            "Radiology Report",
            "Progress Note",
        ];
        for (const phrase of medicalPhrases) {
            if (normalized === phrase || lowerName === phrase.toLowerCase()) {
                return true;
            }
        }
        return false;
    }
    /**
     * Escape regex special characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
exports.FinalNameCleanupFilter = FinalNameCleanupFilter;
//# sourceMappingURL=FinalNameCleanupFilter.js.map