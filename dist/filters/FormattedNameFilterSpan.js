"use strict";
/**
 * FormattedNameFilterSpan - Formatted Name Detection (Span-Based)
 *
 * Detects standard formatted names in various patterns and returns Spans.
 * This is the most complex name filter with extensive validation.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormattedNameFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
const NameFilterConstants_1 = require("./constants/NameFilterConstants");
const HospitalDictionary_1 = require("../dictionaries/HospitalDictionary");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
const NameDetectionUtils_1 = require("../utils/NameDetectionUtils");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
const NameDetectionCoordinator_1 = require("./name-patterns/NameDetectionCoordinator");
class FormattedNameFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "NAME";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.NAME;
    }
    detect(text, _config, _context) {
        const spans = [];
        // =========================================================================
        // UNIQUE PATTERNS (only in FormattedNameFilterSpan)
        // These patterns are NOT duplicated in SmartNameFilterSpan
        // =========================================================================
        // Pattern -1: Labeled name fields ("Name:", "Patient:", "Member Name:", etc.)
        // High-sensitivity, high-precision for explicit name fields
        this.detectLabeledNameFields(text, spans);
        // Pattern 0: Last, First format with Rust acceleration
        // Uses Rust scanner for performance, with TS fallback
        const accelMode = RustAccelConfig_1.RustAccelConfig.getNameAccelMode();
        if (accelMode >= 1) {
            this.detectRustLastFirstNames(text, spans);
        }
        else {
            this.detectLastFirstNames(text, spans);
        }
        // Pattern 5: First Initial + Last Name (J. Smith)
        // Unique to FormattedNameFilterSpan
        this.detectInitialLastNames(text, spans);
        // Pattern 8: General full names with Rust acceleration
        if (accelMode >= 2) {
            this.detectRustFirstLastNames(text, spans);
        }
        else {
            this.detectGeneralFullNames(text, spans);
        }
        // =========================================================================
        // DISABLED PATTERNS (handled by SmartNameFilterSpan)
        // SmartNameFilterSpan has more sophisticated implementations with:
        // - Better OCR/chaos handling
        // - Rust acceleration via detectSmart()
        // - More comprehensive validation
        // =========================================================================
        // detectTitledNames - disabled (TitledNameFilterSpan handles this)
        // detectFamilyRelationshipNames - SmartNameFilterSpan.detectFamilyNames
        // detectPatientNames - SmartNameFilterSpan.detectPatientNames
        // detectPatientAllCapsNames - SmartNameFilterSpan.detectPatientAllCapsNames
        // detectStandaloneAllCapsNames - SmartNameFilterSpan.detectStandaloneAllCapsNames
        // detectNamesWithSuffix - SmartNameFilterSpan.detectNamesWithSuffix
        // detectPossessiveNames - SmartNameFilterSpan.detectPossessiveNames
        // detectAgeGenderNames - SmartNameFilterSpan.detectAgeGenderNames
        // detectNamesWithCredentials - disabled (providers, not patients)
        return spans;
    }
    /**
     * Detect explicit "name field" values.
     * These are very high-signal contexts in clinical/admin documents and should not be missed.
     */
    detectLabeledNameFields(text, spans) {
        const pattern = /\b(?:name|patient\s+name|member\s+name|legal\s+name(?:\s*\([^)]*\))?|patient)\s*:\s*([^\r\n]{2,120})/gim;
        // Terminators: field labels OR sentence/clause markers that indicate end of name
        const terminator = /\b(?:preferred\s+name|date\s+of\s+birth|dob|medical\s+record|member\s+id|group|mrn|id|arrived|presented|presents|was\s+seen|is\s+a|is\s+an|came|visited|scheduled|admitted|discharged|referred|transferred|diagnosed|complains|reports|states|denies|has\s+been|will\s+be|for\s+(?:consultation|evaluation|follow|treatment|surgery|procedure|review|assessment))\b/i;
        // Additional sentence boundary markers
        const sentenceBoundary = /[.!?;]|\s{2,}|\t/;
        const covered = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
            const rawFieldValue = match[1];
            // Find the earliest terminator (field label, sentence marker, or verb phrase)
            const terminatorMatch = rawFieldValue.search(terminator);
            const sentenceMatch = rawFieldValue.search(sentenceBoundary);
            let cutAt = -1;
            if (terminatorMatch >= 0 && sentenceMatch >= 0) {
                cutAt = Math.min(terminatorMatch, sentenceMatch);
            }
            else if (terminatorMatch >= 0) {
                cutAt = terminatorMatch;
            }
            else if (sentenceMatch >= 0) {
                cutAt = sentenceMatch;
            }
            const rawCandidate = (cutAt >= 0 ? rawFieldValue.slice(0, cutAt) : rawFieldValue).replace(/\s+$/g, "");
            const trimmedLeft = rawCandidate.length - rawCandidate.trimStart().length;
            const trimmedRight = rawCandidate.length - rawCandidate.trimEnd().length;
            const start = match.index + match[0].indexOf(rawFieldValue) + trimmedLeft;
            const end = start + rawCandidate.length - trimmedLeft - trimmedRight;
            if (start < 0 || end <= start || end > text.length)
                continue;
            const candidateText = text.substring(start, end).trim();
            if (candidateText.length < 3)
                continue;
            if (/^(?:n\/a|none|unknown)$/i.test(candidateText))
                continue;
            // Must look like a person name: either multiple tokens, or a strong punctuation marker.
            const tokens = candidateText.split(/\s+/).filter(Boolean);
            const hasStrongMarker = /[,.'-]/.test(candidateText);
            if (tokens.length < 2 && !hasStrongMarker)
                continue;
            // Names should be 2-4 tokens max (First Last, First M. Last, First Middle Last)
            if (tokens.length > 4)
                continue;
            // Avoid swallowing the next label if we accidentally included it.
            if (terminator.test(candidateText))
                continue;
            const posKey = `${start}-${end}`;
            if (covered.has(posKey))
                continue;
            covered.add(posKey);
            spans.push(new Span_1.Span({
                text: text.substring(start, end),
                originalValue: text.substring(start, end),
                characterStart: start,
                characterEnd: end,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.98,
                priority: 180,
                context: this.extractContext(text, start, end),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Labeled name field",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            }));
        }
    }
    /**
     * Pattern 0: Last, First format (both mixed case and ALL CAPS)
     * STREET-SMART: "Last, First" and "Last, First Middle" formats are highly specific
     * to person names in medical documents. Don't whitelist based on individual words.
     */
    detectLastFirstNames(text, spans) {
        // Mixed case: Smith, John (with optional space after comma)
        // Also supports hyphenated surnames: Johanssen-Schmidt, Carlos
        const mixedCasePattern = /\b([A-Z][a-z]{2,}(?:-[A-Z][a-z]{2,})?,[ \t]*[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
        mixedCasePattern.lastIndex = 0;
        let match;
        while ((match = mixedCasePattern.exec(text)) !== null) {
            const fullName = match[1];
            // CRITICAL: Check if name is PRECEDED by a provider title
            // "Hon. Rosen, Javier" -> should NOT be redacted
            const lookbackStart = Math.max(0, match.index - 10);
            const textBefore = text.substring(lookbackStart, match.index);
            const titleBeforeMatch = textBefore.match(/\b([A-Za-z]+)\.?\s*$/);
            if (titleBeforeMatch) {
                const possibleTitle = titleBeforeMatch[1];
                let isPrecededByTitle = false;
                for (const prefix of NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES) {
                    if (possibleTitle.toLowerCase() === prefix.toLowerCase()) {
                        isPrecededByTitle = true;
                        break;
                    }
                }
                if (isPrecededByTitle) {
                    continue;
                }
            }
            // STREET-SMART: For "Last, First [Middle]" format, only check if the ENTIRE
            // phrase is a medical term, not individual words. "Clark, Patricia Ann" should
            // NOT be blocked just because "Ann" is in Ann Arbor staging.
            if (!this.isWhitelistedLastFirst(fullName) &&
                this.validateLastFirst(fullName)) {
                const span = new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: match.index,
                    characterEnd: match.index + fullName.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.93,
                    // STREET-SMART: Priority 150+ bypasses individual word whitelist filtering
                    // "Last, First [Middle]" format is highly specific to person names
                    priority: 150,
                    context: this.extractContext(text, match.index, match.index + fullName.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Last, First format",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // OCR variant: comma with space before it "Garcia ,Charles"
        const spaceBeforeCommaPattern = /\b([A-Z][a-z]{2,})\s*,\s*([A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
        spaceBeforeCommaPattern.lastIndex = 0;
        while ((match = spaceBeforeCommaPattern.exec(text)) !== null) {
            const fullName = match[0];
            const normalized = `${match[1]}, ${match[2]}`;
            if (!this.isWhitelistedLastFirst(normalized) &&
                this.validateLastFirst(normalized)) {
                const span = new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: match.index,
                    characterEnd: match.index + fullName.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.9,
                    // STREET-SMART: Priority 150+ bypasses individual word whitelist filtering
                    priority: 150,
                    context: this.extractContext(text, match.index, match.index + fullName.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Last, First format (spacing variant)",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // ALL CAPS: SMITH, JOHN or NAKAMURA, YUKI
        const allCapsPattern = /\b([A-Z]{2,},[ \t]+[A-Z]{2,}(?:[ \t]+[A-Z]{2,})?)\b/g;
        allCapsPattern.lastIndex = 0;
        while ((match = allCapsPattern.exec(text)) !== null) {
            const fullName = match[1];
            const parts = fullName.split(",");
            // Validate it looks like a name, not an acronym or heading
            if (parts.length === 2) {
                const lastName = parts[0].trim();
                const firstName = parts[1].trim();
                // Each part should be 2+ chars and not be excluded
                if (lastName.length >= 2 &&
                    firstName.length >= 2 &&
                    !(0, NameFilterConstants_1.isExcludedAllCaps)(lastName) &&
                    !(0, NameFilterConstants_1.isExcludedAllCaps)(firstName) &&
                    !this.isWhitelisted(fullName, true, text) // STREET-SMART: use ALL CAPS mode with context
                ) {
                    const span = new Span_1.Span({
                        text: fullName,
                        originalValue: fullName,
                        characterStart: match.index,
                        characterEnd: match.index + fullName.length,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.91,
                        // STREET-SMART: High priority for ALL CAPS LAST, FIRST format
                        // This format is almost always a patient name in medical documents
                        priority: 150,
                        context: this.extractContext(text, match.index, match.index + fullName.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Last, First ALL CAPS format",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
        // Case-insensitive: lowercase/mixed case variations like "smith, john" or "SMITH, john"
        const caseInsensitivePattern = /\b([a-zA-Z]{2,},[ \t]+[a-zA-Z]{2,}(?:[ \t]+[a-zA-Z]{2,})?)\b/g;
        caseInsensitivePattern.lastIndex = 0;
        // Track positions already covered
        const coveredPositions = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        while ((match = caseInsensitivePattern.exec(text)) !== null) {
            const fullName = match[1];
            const posKey = `${match.index}-${match.index + fullName.length}`;
            // Skip if already detected
            if (coveredPositions.has(posKey)) {
                continue;
            }
            // CRITICAL: Check if preceded by a provider title (with name in between)
            // "Hon. Javier Rosen, AGNP" -> "Rosen, AGNP" should NOT be detected
            const lookbackStart = Math.max(0, match.index - 30);
            const textBefore = text.substring(lookbackStart, match.index);
            // Check for title followed by name(s) at end of lookback
            const titleNamePattern = new RegExp(`\\b(${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`, "i");
            if (titleNamePattern.test(textBefore)) {
                continue;
            }
            const parts = fullName.split(",");
            if (parts.length !== 2)
                continue;
            const lastName = parts[0].trim();
            const firstName = parts[1].trim();
            // CRITICAL: Skip if "firstName" is actually a credential (AGNP, RN, MD, etc.)
            const credentials = new Set([
                "MD",
                "DO",
                "PhD",
                "DDS",
                "DMD",
                "RN",
                "NP",
                "PA",
                "LPN",
                "APRN",
                "CRNA",
                "CNS",
                "CNM",
                "BSN",
                "MSN",
                "DNP",
                "PT",
                "OT",
                "SLP",
                "RT",
                "LCSW",
                "LMFT",
                "LPC",
                "AGNP",
                "FNP",
                "ANP",
                "PNP",
                "PMHNP",
            ]);
            if (credentials.has(firstName.toUpperCase())) {
                continue;
            }
            // Validate: each part 2+ chars, looks like a name
            if (lastName.length >= 2 &&
                firstName.length >= 2 &&
                !this.isWhitelisted(fullName, false, text) &&
                this.validateLastFirst(fullName)) {
                const span = new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: match.index,
                    characterEnd: match.index + fullName.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.85, // Lower confidence for non-standard case
                    priority: 140, // High priority for Last, First format
                    context: this.extractContext(text, match.index, match.index + fullName.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Last, First case-insensitive",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
                coveredPositions.add(posKey);
            }
        }
    }
    /**
     * Pattern 5: First Initial + Last Name
     */
    detectInitialLastNames(text, spans) {
        const pattern = /\b([A-Z]\.[ \t]+[A-Z][a-z]{2,})\b/g;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            if (this.isLikelyName(name)) {
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.NAME, 0.85);
                spans.push(span);
            }
        }
    }
    /**
     * Pattern 8: General full names (most permissive)
     */
    detectGeneralFullNames(text, spans) {
        const pattern = /\b([A-Z][a-z]{2,}[ \t]+[A-Z][a-z]{2,}(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)\b/g;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            // CRITICAL: Check if FIRST word of name is a provider title
            // "Dame Joshua" should NOT be detected because "Dame" is a title
            const firstWord = name.split(/\s+/)[0];
            if (NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES.has(firstWord)) {
                continue;
            }
            // CRITICAL: Check if name is PRECEDED by a provider title
            // "Dr. Hassan Lindberg" -> "Hassan Lindberg" should NOT be redacted
            const lookbackStart = Math.max(0, match.index - 10);
            const textBefore = text.substring(lookbackStart, match.index);
            const titleBeforeMatch = textBefore.match(/\b([A-Za-z]+)\.?\s*$/);
            if (titleBeforeMatch) {
                const possibleTitle = titleBeforeMatch[1];
                let isPrecededByTitle = false;
                for (const prefix of NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES) {
                    if (possibleTitle.toLowerCase() === prefix.toLowerCase()) {
                        isPrecededByTitle = true;
                        break;
                    }
                }
                if (isPrecededByTitle) {
                    continue;
                }
            }
            if (!this.isWhitelisted(name, false, text) &&
                this.isLikelyPersonName(name)) {
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.NAME, 0.8);
                spans.push(span);
            }
        }
    }
    /**
     * Validation helpers - Delegates to shared NameDetectionUtils
     */
    validateLastFirst(name) {
        return NameDetectionUtils_1.NameDetectionUtils.validateLastFirst(name);
    }
    /**
     * STREET-SMART: Special whitelist check for "Last, First [Middle]" format.
     * Only whitelist if the ENTIRE phrase is a known non-person term.
     * Do NOT whitelist based on individual words like "Ann" (Ann Arbor staging).
     */
    isWhitelistedLastFirst(text) {
        const normalized = text.trim().toLowerCase();
        // STREET-SMART: Check if ALL words are medical terms.
        // This prevents "Invasive Ductal Carcinoma" or "Hypertension, Hyperlipidemia"
        // from being detected as "Last, First" names.
        const words = text.split(/[\s,]+/).filter((w) => w.length > 1);
        if (words.length > 0) {
            const allMedical = words.every((word) => (0, UnifiedMedicalWhitelist_1.isMedicalTerm)(word));
            if (allMedical)
                return true;
        }
        // Only whitelist complete phrases that are definitely not person names
        const nonPersonPhrases = [
            "emergency department",
            "intensive care",
            "medical record",
            "health plan",
            "ann arbor", // Ann Arbor staging - but only as complete phrase
        ];
        return nonPersonPhrases.some((phrase) => normalized.includes(phrase));
    }
    isLikelyName(text) {
        if (this.isWhitelisted(text))
            return false;
        const nonNames = ["U.S.", "P.O.", "A.M.", "P.M.", "E.R.", "I.V."];
        if (nonNames.includes(text))
            return false;
        if (!/[a-z]/.test(text))
            return false;
        if (!/^[A-Z]/.test(text))
            return false;
        return true;
    }
    isLikelyPersonName(text) {
        if (this.isWhitelisted(text))
            return false;
        const trimmed = text.trim();
        const isAllCaps = /^[A-Z0-9\s]+$/.test(trimmed) &&
            /[A-Z]/.test(trimmed) &&
            trimmed.length > 6;
        if (isAllCaps && trimmed.split(/\s+/).length >= 2)
            return false;
        if (trimmed.endsWith(":"))
            return false;
        const words = trimmed.split(/\s+/);
        if (words.length < 2 || words.length > 3)
            return false;
        // PRIMARY CHECK: Use dictionary validation
        // If the first word is NOT a known first name, this is likely not a person name
        // This eliminates false positives like "Timeline Narrative", "Physical Therapy"
        const nameConfidence = NameDictionary_1.NameDictionary.getNameConfidence(trimmed);
        if (nameConfidence < 0.5) {
            // Not a recognized name pattern - reject it
            return false;
        }
        // Check if any word is whitelisted (document terms, geographic, etc.)
        for (const word of words) {
            if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(word, Span_1.FilterType.NAME))
                return false;
        }
        if (!words.every((w) => w.length >= 2))
            return false;
        for (const word of words) {
            if (!["Jr", "Jr.", "Sr", "Sr.", "II", "III", "IV"].includes(word) &&
                !/^[A-Z][a-z]+$/.test(word)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Enhanced whitelist check using UnifiedMedicalWhitelist.
     * STREET-SMART: For ALL CAPS LAST, FIRST format, be more permissive -
     * these are almost always patient names in medical documents
     */
    isWhitelisted(text, isAllCapsLastFirst = false, context) {
        const normalized = text.trim();
        // Check unified whitelist
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(normalized, Span_1.FilterType.NAME, context)) {
            return true;
        }
        // HOSPITAL WHITELIST: Check if this is part of a hospital name
        // Hospital names are NOT patient PHI under HIPAA Safe Harbor
        if (context &&
            HospitalDictionary_1.HospitalDictionary.isPartOfHospitalName(normalized, context)) {
            return true;
        }
        // STREET-SMART: For ALL CAPS "LAST, FIRST" format names, don't whitelist
        // based on individual word medical term matching. These are patient names.
        if (isAllCapsLastFirst) {
            // STREET-SMART: For ALL CAPS "LAST, FIRST" format, we usually assume it's a patient name.
            // HOWEVER, if ALL parts of the "name" are medical terms (e.g. "HTN, HLD" or "INVASIVE, DUCTAL"),
            // then it is likely a list of conditions, not a person.
            const words = normalized.split(/[\s,]+/).filter((w) => w.length > 1);
            const allWordsAreMedical = words.every((word) => (0, UnifiedMedicalWhitelist_1.isMedicalTerm)(word));
            if (allWordsAreMedical && words.length > 0) {
                return true; // Whitelist it (it's a list of medical terms)
            }
            // Only whitelist if the ENTIRE name is a known non-person structure term
            const structureTerms = [
                "emergency department",
                "intensive care",
                "medical record",
                "health plan",
            ];
            const lower = normalized.toLowerCase();
            return structureTerms.some((term) => lower.includes(term));
        }
        // Check individual words
        const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
        for (const word of words) {
            if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(word, Span_1.FilterType.NAME, context)) {
                return true;
            }
        }
        return false;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // RUST ACCELERATOR METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Rust-accelerated Last, First detection
     * Uses coordinator for cached results to avoid duplicate FFI calls
     */
    detectRustLastFirstNames(text, spans) {
        const detections = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustLastFirst(text);
        if (!detections.length)
            return;
        for (const d of detections) {
            const fullName = d.text;
            const start = d.characterStart;
            const end = d.characterEnd;
            // Apply same provider-title exclusion as TS path
            const lookbackStart = Math.max(0, start - 30);
            const textBefore = text.substring(lookbackStart, start);
            const titleNamePattern = new RegExp(`\\b(${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`, "i");
            if (titleNamePattern.test(textBefore)) {
                continue;
            }
            // Skip if second part is a credential
            const parts = fullName.split(/\s*,\s*/);
            if (parts.length === 2) {
                const secondPart = parts[1].split(/\s+/)[0];
                if (NameDetectionUtils_1.PROVIDER_CREDENTIALS.has(secondPart.toUpperCase())) {
                    continue;
                }
            }
            if (!this.isWhitelistedLastFirst(fullName)) {
                spans.push(new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: start,
                    characterEnd: end,
                    filterType: Span_1.FilterType.NAME,
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, start, end),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: d.pattern,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                }));
            }
        }
    }
    /**
     * Rust-accelerated First Last detection
     * Uses coordinator for cached results to avoid duplicate FFI calls
     */
    detectRustFirstLastNames(text, spans) {
        const detections = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustFirstLast(text);
        if (!detections.length)
            return;
        for (const d of detections) {
            const fullName = d.text;
            const start = d.characterStart;
            const end = d.characterEnd;
            // Exclude provider-title contexts
            const lookbackStart = Math.max(0, start - 30);
            const textBefore = text.substring(lookbackStart, start);
            const titlePattern = new RegExp(`(?:${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`, "i");
            if (titlePattern.test(textBefore)) {
                continue;
            }
            // Exclude credentials immediately after the match
            const after = text.substring(end, Math.min(text.length, end + 40));
            const credentialPattern = /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|RN|NP|PA|PA-C|FACS|FACP|FACC)\b/i;
            if (credentialPattern.test(after)) {
                continue;
            }
            if (!this.isWhitelisted(fullName, false, text) &&
                this.isLikelyPersonName(fullName)) {
                spans.push(new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: start,
                    characterEnd: end,
                    filterType: Span_1.FilterType.NAME,
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, start, end),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: d.pattern,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                }));
            }
        }
    }
}
exports.FormattedNameFilterSpan = FormattedNameFilterSpan;
//# sourceMappingURL=FormattedNameFilterSpan.js.map