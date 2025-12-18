"use strict";
/**
 * SmartNameFilterSpan - Context-Aware Name Detection (Span-Based)
 *
 * Detects names with role/demographic context and returns Spans with metadata.
 * This filter can attach additional context to spans for smart redaction.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartNameFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
const NameFilterConstants_1 = require("./constants/NameFilterConstants");
const HospitalDictionary_1 = require("../dictionaries/HospitalDictionary");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
const NameDetectionUtils_1 = require("../utils/NameDetectionUtils");
const OcrChaosDetector_1 = require("../utils/OcrChaosDetector");
const RadiologyLogger_1 = require("../utils/RadiologyLogger"); // Added Import
const OcrTolerancePatterns_1 = require("./name-patterns/OcrTolerancePatterns");
const TitledNamePatterns_1 = require("./name-patterns/TitledNamePatterns");
const NameDetectionCoordinator_1 = require("./name-patterns/NameDetectionCoordinator");
class SmartNameFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC CACHED REGEX PATTERNS - Compiled once at class load, not per-call
    // This is a MAJOR performance optimization (~5-15ms savings per document)
    // ═══════════════════════════════════════════════════════════════════════════
    /** Pattern for title prefix at end of lookback text */
    static TITLE_PREFIX_PATTERN = new RegExp(`(?:${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`, "i");
    /** Pattern for titled name in lookback text */
    static TITLED_NAME_LOOKBACK_PATTERN = new RegExp(`(?:${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Z][a-zA-Z'-]+(?:\\s+[A-Z][a-zA-Z'-]+)*\\s*$`, "i");
    /** Pattern for name suffixes (Jr., Sr., III, etc.) */
    static NAME_SUFFIX_PATTERN = new RegExp(`(?:${NameFilterConstants_1.NAME_SUFFIXES.join("|")})\\.?\\b`, "gi");
    /** Pattern for title before name in text */
    static TITLE_BEFORE_NAME_PATTERN = new RegExp(`\\b(${Array.from(NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`, "i");
    /** Pattern for particle names (van Gogh, de Silva, etc.) */
    static PARTICLE_NAME_PATTERN = new RegExp(`\\b([A-Z][a-z]+\\s+(?:van|de|von|di|da|du|del|della|la|le|el|al|bin|ibn|af|av|ten|ter|vander|vanden)\\s+[A-Z][a-z]+)\\b`, "gi");
    /** Credential pattern after name */
    static CREDENTIAL_AFTER_NAME_PATTERN = /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|EdD|DrPH|DC|ND|JD|RN|NP|BSN|MSN|DNP|APRN|CRNA|CNS|CNM|LPN|LVN|CNA|PA|PA-C|PT|DPT|OT|OTR|SLP|RT|RRT|RD|RDN|LCSW|LMFT|LPC|LCPC|FACS|FACP|FACC|FACOG|FASN|FAAN|FAAP|FACHE|FCCP|FAHA|Esq|CPA|MBA|MPH|MHA|MHSA|ACNP-BC|FNP-BC|ANP-BC|PNP-BC|PMHNP-BC|AGNP-C|OTR\/L)\b/i;
    // ═══════════════════════════════════════════════════════════════════════════
    getType() {
        return "NAME";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.NAME;
    }
    detect(text, config, context) {
        const spans = [];
        const rustAvailable = NameDetectionCoordinator_1.nameDetectionCoordinator.isRustAvailable();
        if (rustAvailable) {
            // -----------------------------------------------------------------------
            // RUST PRIMARY SCANNING (using coordinator for cached results)
            // -----------------------------------------------------------------------
            // Pattern 0: Last, First format (Rust) - uses coordinator cache
            const lastFirstDets = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustLastFirst();
            for (const d of lastFirstDets) {
                const fullName = d.text;
                const start = d.characterStart;
                const end = d.characterEnd;
                // Match exclusions
                if (TitledNamePatterns_1.TITLE_PLUS_TRAILING_WORD_PATTERN.test(text.substring(Math.max(0, start - 30), start)))
                    continue;
                const parts = fullName.split(/\s*,\s*/);
                if (parts.length === 2) {
                    const secondPart = parts[1].split(/\s+/)[0];
                    if (NameDetectionUtils_1.PROVIDER_CREDENTIALS.has(secondPart.toUpperCase()))
                        continue;
                }
                const needsStrictValidation = d.pattern === "Rust Last, First";
                if (!this.isWhitelisted(fullName, text) &&
                    (!needsStrictValidation || this.validateLastFirst(fullName))) {
                    spans.push(new Span_1.Span({
                        text: fullName,
                        originalValue: fullName,
                        characterStart: start,
                        characterEnd: end,
                        filterType: Span_1.FilterType.NAME,
                        confidence: d.confidence,
                        priority: this.getPriority(),
                        context: this.getContext(text, start, end - start),
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
            // Pattern 0c: First Last (Rust) - uses coordinator cache
            const firstLastDets = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustFirstLast();
            for (const d of firstLastDets) {
                const fullName = d.text;
                const start = d.characterStart;
                const end = d.characterEnd;
                if (TitledNamePatterns_1.TITLE_TRAILING_PATTERN.test(text.substring(Math.max(0, start - 30), start)))
                    continue;
                if (TitledNamePatterns_1.PROVIDER_CONTEXT_CREDENTIAL_AFTER_NAME_PATTERN.test(text.substring(end, Math.min(text.length, end + 40))))
                    continue;
                if (!this.isWhitelisted(fullName, text) &&
                    this.isLikelyPersonName(fullName, text)) {
                    spans.push(new Span_1.Span({
                        text: fullName,
                        originalValue: fullName,
                        characterStart: start,
                        characterEnd: end,
                        filterType: Span_1.FilterType.NAME,
                        confidence: d.confidence,
                        priority: this.getPriority(),
                        context: this.getContext(text, start, end - start),
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
            // Rust "Smart" Scanner - uses coordinator cache
            const smartDets = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustSmart();
            for (const d of smartDets) {
                const fullName = d.text;
                if (!this.isWhitelisted(fullName, text) &&
                    this.isLikelyPersonName(fullName, text)) {
                    spans.push(new Span_1.Span({
                        text: fullName,
                        originalValue: fullName,
                        characterStart: d.characterStart,
                        characterEnd: d.characterEnd,
                        filterType: Span_1.FilterType.NAME,
                        confidence: d.confidence,
                        priority: this.getPriority(),
                        context: this.getContext(text, d.characterStart, d.characterEnd - d.characterStart),
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
        else {
            RadiologyLogger_1.RadiologyLogger.warn("SMART_NAME", "Rust scanner unavailable - relying on simplified fallback.");
        }
        // -----------------------------------------------------------------------
        // SECONDARY / FALLBACK / SPECIFIC TS PATTERNS
        // -----------------------------------------------------------------------
        // When Rust is available, it handles many patterns but TS has more sophisticated
        // validation (whitelisting, provider context, etc.). We still run most TS patterns
        // but skip only the patterns that are TRULY duplicated with no additional value.
        // Pattern 0a: OCR-tolerant Last, First format
        // If Rust is available, we skip strict comma patterns (Rust handles them).
        // If Rust is NOT available, we enable them as fallback.
        this.detectOcrLastFirstNames(text, spans, {
            skipCommaPatterns: rustAvailable,
        });
        // Pattern 0b: Chaos-case Last, First with OCR substitutions
        // TS-ONLY: Rust doesn't have the full chaos-case handling with OCR normalization
        this.detectChaosLastFirstNames(text, spans);
        // Pattern 1: Title + Name (disabled - TitledNameFilterSpan handles this)
        this.detectTitledNames(text, spans);
        // Pattern 2: Patient + Name patterns
        // TS has stricter capitalization validation than Rust
        this.detectPatientNames(text, spans);
        // Pattern 3: ALL CAPS NAME patterns
        // TS has additional excluded acronym checks
        this.detectPatientAllCapsNames(text, spans);
        // Pattern 4: Standalone ALL CAPS names
        // TS has whitespace limits to prevent greedy matching
        this.detectStandaloneAllCapsNames(text, spans);
        // Pattern 5: Family member names
        // TS handles nicknames/preferred names which Rust doesn't
        this.detectFamilyNames(text, spans);
        // Pattern 6: Name with suffix
        // TS has provider credential checking that Rust doesn't
        this.detectNamesWithSuffix(text, spans);
        // Pattern 7: Age/gender descriptors with names
        // TS has additional word validation
        this.detectAgeGenderNames(text, spans);
        // Pattern 8: Possessive forms
        // TS has isLikelyName validation
        this.detectPossessiveNames(text, spans);
        // Pattern 9a: Labeled names with OCR/noisy spacing (Patient: MAR1A G0NZ ALEZ)
        // TS has provider context checking
        this.detectLabeledOcrNames(text, spans);
        // Pattern 10: Hyphenated names (Mary-Ann Johnson)
        // TS has provider context checking
        this.detectHyphenatedNames(text, spans);
        // Pattern 11: Apostrophe names (O'Brien, D'Angelo)
        // TS has provider context checking
        this.detectApostropheNames(text, spans);
        // Pattern 12: Accented/international names (José García)
        // TS has provider context and whitelist checking
        this.detectAccentedNames(text, spans);
        // Pattern 13: Names with particles (van Gogh, de Silva)
        // TS has provider context checking
        this.detectParticleNames(text, spans);
        // Pattern 14: Team member list names (- Jessica Weber, Oncology)
        // TS has non-person structure term checking
        this.detectTeamMemberNames(text, spans);
        // Pattern 15: CHAOS-AWARE labeled names with adaptive confidence
        // TS-ONLY: Complex chaos detection with OcrChaosDetector - Rust doesn't have this
        this.detectChaosAwareLabeledNames(text, spans, context);
        // Pattern 16: Concatenated names (no space between first and last)
        // TS has overlap checking and dictionary validation
        this.detectConcatenatedNames(text, spans);
        // Pattern 17: OCR-corrupted names with digits/symbols in the middle
        // TS-ONLY: Deep OCR normalization with dictionary lookup - Rust doesn't have this
        this.detectOcrCorruptedNames(text, spans);
        return spans;
    }
    // PROVIDER_TITLE_PREFIXES imported from NameDetectionUtils
    /**
     * Check if a titled name is a PROVIDER name (should NOT be redacted)
     * Provider names with professional titles or credentials are NOT patient PHI
     */
    isProviderName(matchedText, fullContext) {
        const trimmed = matchedText.trim();
        // Extract the title (first word)
        const titleMatch = trimmed.match(/^([A-Za-z]+)\.?\s+/);
        if (!titleMatch)
            return false;
        const title = titleMatch[1];
        // Check if this is a provider title
        if (NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES.has(title)) {
            return true;
        }
        // Also check if the name has professional credentials (e.g., "John Smith, MD")
        // Check the context after the name for credentials
        const nameEnd = fullContext.indexOf(trimmed) + trimmed.length;
        if (nameEnd < fullContext.length) {
            const afterName = fullContext.substring(nameEnd, nameEnd + 30); // Look ahead 30 chars
            // Check for credentials pattern: ", MD" or ", DDS" or ", PhD" etc.
            if (TitledNamePatterns_1.PROVIDER_CREDENTIAL_AFTER_NAME_PATTERN.test(afterName)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if a name (without title) appears in a provider context
     * This catches cases where "Sergei Hernandez" is detected but it's actually
     * part of "Prof. Sergei Hernandez" which is a provider name
     *
     * Also catches partial matches like "O'Neill" which is part of "Dame Ananya O'Neill"
     *
     * @param name - The matched name text (e.g., "Sergei Hernandez" or "O'Neill")
     * @param matchIndex - The position in the full text where this name was found
     * @param fullContext - The full document text
     * @returns true if this name appears to be part of a provider name
     */
    isInProviderContext(name, matchIndex, fullContext) {
        // Look backwards from the match to see if there's a title prefix
        // Use a larger lookback distance to catch "Dame Ananya O'Neill" where O'Neill
        // is separated from Dame by the first name
        const lookBackDistance = 40; // Enough for "Title FirstName MiddleName "
        const startLook = Math.max(0, matchIndex - lookBackDistance);
        const beforeText = fullContext.substring(startLook, matchIndex);
        // Check if text before the name ends with a title prefix (immediate)
        // Pattern: title possibly followed by period and space(s)
        if (TitledNamePatterns_1.TITLE_PREFIX_PATTERN.test(beforeText)) {
            return true;
        }
        // ALSO check if there's a title anywhere in the lookback followed by name-like words
        // This catches "Dame Ananya O'Neill" where O'Neill is matched separately
        // Pattern: Title + period? + space + CapitalizedWord(s) + space at end
        if (TitledNamePatterns_1.TITLED_NAME_LOOKBACK_PATTERN.test(beforeText)) {
            return true;
        }
        // Also check if this name is followed by professional credentials
        const nameEnd = matchIndex + name.length;
        if (nameEnd < fullContext.length) {
            const afterName = fullContext.substring(nameEnd, nameEnd + 30);
            if (TitledNamePatterns_1.PROVIDER_CONTEXT_CREDENTIAL_AFTER_NAME_PATTERN.test(afterName)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
     *
     * IMPORTANT: Names with professional titles (Dr., Prof., Hon., Dame, Sir, etc.)
     * are PROVIDER names under HIPAA Safe Harbor and should NOT be redacted.
     * Only patient names should be redacted.
     */
    detectTitledNames(text, spans) {
        // DISABLED: TitledNameFilterSpan now handles all titled names with PROVIDER_NAME type
        // This prevents duplicate detection and ensures consistent labeling
        return;
    }
    /**
     * Pattern 2: Patient + Name patterns
     *
     * CRITICAL: The name capture MUST require proper capitalization (First Last)
     * to avoid matching things like "patient was seen by" as a name.
     * We use case-insensitive for the prefix (Patient/Pt/etc.) but the name
     * itself must be properly capitalized.
     */
    detectPatientNames(text, spans) {
        // First find potential matches with case-insensitive prefix
        const prefixPattern = /\b(?:Patient|Pt|Subject|Individual|Client)[ \t:]+/gi;
        let prefixMatch;
        while ((prefixMatch = prefixPattern.exec(text)) !== null) {
            const afterPrefix = text.substring(prefixMatch.index + prefixMatch[0].length);
            // Now match the name with STRICT capitalization (case-sensitive)
            // Name must be: Capital + lowercase, optionally with middle initial and last name
            const namePattern = /^([A-Z][a-z]{2,}(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][a-z]{2,}){1,2})\b/;
            const nameMatch = afterPrefix.match(namePattern);
            if (nameMatch) {
                const name = nameMatch[1];
                const fullMatch = prefixMatch[0] + name;
                const matchPos = prefixMatch.index;
                if (!this.isHeading(fullMatch)) {
                    const nameStart = matchPos + prefixMatch[0].length;
                    const nameEnd = nameStart + name.length;
                    const span = new Span_1.Span({
                        text: name,
                        originalValue: name,
                        characterStart: nameStart,
                        characterEnd: nameEnd,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.92,
                        priority: this.getPriority(),
                        context: this.getContext(text, matchPos, fullMatch.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Patient name",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Pattern 3: Patient + ALL CAPS NAME
     * Matches: PATIENT: JOHN SMITH, Patient: JOHN SMITH, etc.
     */
    detectPatientAllCapsNames(text, spans) {
        // More flexible pattern: allows colon directly after keyword, various spacing
        const pattern = /\b(?:Patient|Pt|Subject|Individual|Client|PATIENT|PT|SUBJECT|INDIVIDUAL|CLIENT)\s*[:]\s*([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b/gi;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            const words = name.trim().split(/\s+/);
            if (words.length >= 2 &&
                words.length <= 3 &&
                words.every((w) => w.length >= 2 && /^[A-Z]+$/.test(w))) {
                const excludedAcronyms = new Set([
                    "CT",
                    "MRI",
                    "PET",
                    "EKG",
                    "ECG",
                    "CBC",
                    "USA",
                    "FBI",
                    "CIA",
                    "ER",
                    "IV",
                ]);
                // Check if any word is an excluded acronym
                const hasExcludedWord = words.some((w) => excludedAcronyms.has(w));
                if (!hasExcludedWord && !this.isHeading(name)) {
                    const fullMatch = match[0];
                    const matchPos = match.index;
                    const nameStart = matchPos + fullMatch.indexOf(name);
                    const nameEnd = nameStart + name.length;
                    const span = new Span_1.Span({
                        text: name,
                        originalValue: name,
                        characterStart: nameStart,
                        characterEnd: nameEnd,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.92,
                        priority: this.getPriority(),
                        context: this.getContext(text, matchPos, fullMatch.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Patient all caps",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Pattern 4: Standalone ALL CAPS names
     *
     * IMPORTANT: Limit whitespace to 1-3 chars between words to avoid greedy matching
     * that captures field labels like "PEDRO LINDBERG       DOB" as a single name.
     */
    detectStandaloneAllCapsNames(text, spans) {
        // Use {1,3} for whitespace to prevent greedy over-matching across field boundaries
        const pattern = /\b([A-Z]{2,}[ \t]{1,3}[A-Z]{2,}(?:[ \t]{1,3}[A-Z]{2,})?)\b/g;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            const words = name.trim().split(/\s+/);
            if (words.length >= 2 &&
                words.length <= 3 &&
                words.every((w) => w.length >= 2 && /^[A-Z]+$/.test(w))) {
                if (!(0, NameFilterConstants_1.isExcludedAllCaps)(name.trim()) && !this.isHeading(name)) {
                    const span = this.createSpanFromMatch(text, match, Span_1.FilterType.NAME, 0.75);
                    span.context = this.getContext(text, match.index, name.length);
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Pattern 5: Family member names and nicknames/preferred names
     */
    detectFamilyNames(text, spans) {
        // Family member pattern
        const pattern = /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)?)\b/gi;
        // Also detect nicknames and preferred names - these can be single words
        const nicknamePattern = /\b(?:Preferred[ \t]+Name|Nickname|Also[ \t]+Known[ \t]+As|AKA|Goes[ \t]+By)[ \t]*:[ \t]*([A-Z][a-z]+)\b/gi;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            const fullMatch = match[0];
            const matchPos = match.index;
            if (name && name.length >= 2 && /^[A-Z][a-z]/.test(name)) {
                const nameStart = matchPos + fullMatch.indexOf(name);
                const nameEnd = nameStart + name.length;
                const span = new Span_1.Span({
                    text: name.trim(),
                    originalValue: name.trim(),
                    characterStart: nameStart,
                    characterEnd: nameEnd,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.9,
                    priority: this.getPriority(),
                    context: this.getContext(text, matchPos, fullMatch.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Family member",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // Process nickname pattern
        nicknamePattern.lastIndex = 0;
        while ((match = nicknamePattern.exec(text)) !== null) {
            const name = match[1];
            const fullMatch = match[0];
            const matchPos = match.index;
            if (name && name.length >= 2) {
                const nameStart = matchPos + fullMatch.indexOf(name);
                const nameEnd = nameStart + name.length;
                const span = new Span_1.Span({
                    text: name.trim(),
                    originalValue: name.trim(),
                    characterStart: nameStart,
                    characterEnd: nameEnd,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.92, // High confidence for explicitly labeled nicknames
                    priority: this.getPriority(),
                    context: this.getContext(text, matchPos, fullMatch.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Nickname/Preferred name",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
    }
    // PROVIDER_CREDENTIALS imported from NameDetectionUtils
    /**
     * Pattern 6: Name with suffix (Jr., Sr., III, etc.)
     *
     * IMPORTANT: Names with PROFESSIONAL CREDENTIALS (MD, DDS, RN, etc.) are PROVIDERS
     * and should NOT be redacted. Names with GENERATIONAL suffixes (Jr., Sr., III)
     * ARE patient names and SHOULD be redacted.
     *
     * CRITICAL: Must use case-SENSITIVE matching for the name part to avoid
     * matching lowercase words like "seen by" as names.
     */
    detectNamesWithSuffix(text, spans) {
        // STRICT pattern: Name must have proper capitalization (case-sensitive)
        // Only the suffix matching is case-insensitive
        const suffixPattern = new RegExp(`(?:${NameFilterConstants_1.NAME_SUFFIXES.join("|")})\\.?\\b`, "gi");
        // Find all suffix occurrences
        let suffixMatch;
        while ((suffixMatch = suffixPattern.exec(text)) !== null) {
            // Look backwards from the suffix to find the name
            const beforeSuffix = text.substring(0, suffixMatch.index);
            // Match name with STRICT capitalization (case-sensitive)
            // Pattern: "First Last ,?" at the end of beforeSuffix
            const namePattern = /([A-Z][a-z]+(?:[ \t]+[A-Z]\.?)?[ \t]+[A-Z][a-z]+)[ \t]*,?[ \t]*$/;
            const nameMatch = beforeSuffix.match(namePattern);
            if (!nameMatch || nameMatch.index === undefined)
                continue;
            const name = nameMatch[1];
            const nameMatchIndex = nameMatch.index;
            const fullMatch = name +
                beforeSuffix.substring(nameMatchIndex + name.length) +
                suffixMatch[0];
            // Only skip for non-person structure terms, NOT medical terms
            // Names with suffix are explicitly person names
            if (this.isNonPersonStructureTerm(name)) {
                continue;
            }
            // Skip if name is too short (likely a false positive like "QHS P")
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.some((part) => part.length < 2)) {
                continue;
            }
            // Calculate the actual position of the name in the text
            const nameStartPos = nameMatchIndex;
            const nameEndPos = nameStartPos + name.length;
            // CRITICAL: Skip if this name appears in a provider context
            // (preceded by a title like Dr., Prof., Mr., etc.)
            if (this.isInProviderContext(name, nameStartPos, text)) {
                continue;
            }
            // CRITICAL: Check if this is a PROVIDER with professional credentials
            // Extract the suffix from the full match
            const extractedSuffix = suffixMatch[0].replace(/\.$/, "").toUpperCase();
            // If suffix is a provider credential, skip - this is a provider name
            if (NameDetectionUtils_1.PROVIDER_CREDENTIALS.has(extractedSuffix)) {
                continue;
            }
            const nameStart = nameStartPos;
            const nameEnd = nameEndPos;
            const span = new Span_1.Span({
                text: name,
                originalValue: name,
                characterStart: nameStart,
                characterEnd: nameEnd,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.92, // Higher confidence for suffix-qualified names
                priority: this.getPriority(),
                context: this.getContext(text, nameStart, fullMatch.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Name with suffix",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Check if text is a non-person structure term (document sections, etc.)
     * Delegates to shared NameDetectionUtils
     */
    isNonPersonStructureTerm(text) {
        return NameDetectionUtils_1.NameDetectionUtils.isNonPersonStructureTerm(text);
    }
    /**
     * Pattern 7: Age/gender descriptors with names
     */
    detectAgeGenderNames(text, spans) {
        const pattern = /\b\d+[ \t]+year[ \t]+old[ \t]+(?:woman|man|male|female|patient|person|individual)[ \t]+([A-Z][a-zA-Z]+(?:[ \t]+[A-Z][a-zA-Z]+){1,2})\b/gi;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1].trim();
            const fullMatch = match[0];
            const matchPos = match.index;
            const nameStart = matchPos + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            const span = new Span_1.Span({
                text: name,
                originalValue: name,
                characterStart: nameStart,
                characterEnd: nameEnd,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.91,
                priority: this.getPriority(),
                context: this.getContext(text, matchPos, fullMatch.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Age/gender descriptor",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Pattern 8: Possessive forms
     */
    detectPossessiveNames(text, spans) {
        const pattern = /\b([A-Z][a-z]+[ \t]+[A-Z][a-z]+)'s\b/g;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            if (this.isLikelyName(name)) {
                const matchPos = match.index;
                const span = new Span_1.Span({
                    text: name,
                    originalValue: name,
                    characterStart: matchPos,
                    characterEnd: matchPos + name.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.87,
                    priority: this.getPriority(),
                    context: this.getContext(text, matchPos, name.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Possessive name",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
    }
    /**
     * Pattern 0a: OCR-Tolerant Last, First format
     *
     * Handles real-world OCR failures seen in testing:
     * - "Wals,h Ali V." (comma in wrong place)
     * - "elena sanchez" (all lowercase)
     * - "nilsson, elena ann" (lowercase Last, First)
     * - "Hajid,R aj" (comma + space issues)
     * - "Ronald J0nse" (0 instead of o)
     * - "Dborah Oe" (missing chars)
     * - "Alii KelIy" (double i, capital I instead of l)
     * - "ZHAN6, SUSAN" (digit instead of letter)
     */
    detectOcrLastFirstNames(text, spans, options = {}) {
        const patterns = (0, OcrTolerancePatterns_1.getOcrLastFirstPatternDefs)();
        const skipCommaPatterns = options.skipCommaPatterns ?? false;
        for (const patternObj of patterns) {
            if (skipCommaPatterns) {
                // Rust scanner currently covers comma-based Last, First variants; skip those to avoid duplicate work.
                if (patternObj.regex.source.includes(",")) {
                    continue;
                }
            }
            const pattern = patternObj.regex;
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let fullName;
                // Handle different capture group patterns
                if (match[3]) {
                    // Pattern with comma in wrong place: group1,group2 group3
                    fullName = `${match[1]},${match[2]} ${match[3]}`;
                }
                else {
                    fullName = match[0];
                }
                // Normalize for dictionary check
                const normalized = this.normalizeNameOcr(fullName);
                // Check if this looks like a name (not a medication, diagnosis, etc.)
                if (this.isLikelyOcrName(normalized, text, match.index)) {
                    // Check against whitelist
                    if (!this.isWhitelisted(fullName, text)) {
                        const span = new Span_1.Span({
                            text: fullName,
                            originalValue: fullName,
                            characterStart: match.index,
                            characterEnd: match.index + fullName.length,
                            filterType: Span_1.FilterType.NAME,
                            confidence: patternObj.confidence,
                            priority: this.getPriority(),
                            context: this.getContext(text, match.index, fullName.length),
                            window: [],
                            replacement: null,
                            salt: null,
                            pattern: `Last, First OCR (${patternObj.note})`,
                            applied: false,
                            ignored: false,
                            ambiguousWith: [],
                            disambiguationScore: null,
                        });
                        spans.push(span);
                    }
                }
            }
        }
    }
    /**
     * Pattern 0b: Chaos-Case Last, First with OCR Substitutions
     *
     * Catches names that have:
     * - Chaotic capitalization (any case mix): "gOLdbeeRg", "marTinA"
     * - OCR character substitutions: "@" for "a", "0" for "o", "1" for "l"
     * - Comma placement issues: space before comma, space after
     *
     * Examples:
     * - "martinez, l@tonya a."
     * - "gOLdbeeRg ,marTinA"
     * - "5mith , j0hn"
     * - "NAKAMUR@ ,K3VIN"
     */
    detectChaosLastFirstNames(text, spans) {
        // Ultra-permissive patterns for chaos-case names
        const chaosPatterns = (0, OcrTolerancePatterns_1.getChaosLastFirstPatternDefs)();
        // Track detected positions to avoid duplicates
        const detectedPositions = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        for (const patternObj of chaosPatterns) {
            const pattern = patternObj.regex;
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullName = match[0];
                const lastName = match[1];
                const firstName = match[2];
                const posKey = `${match.index}-${match.index + fullName.length}`;
                // Skip if already detected at this position
                if (detectedPositions.has(posKey))
                    continue;
                // Normalize OCR characters for validation
                const normalizedLast = this.normalizeOcrChars(lastName).toLowerCase();
                const normalizedFirst = this.normalizeOcrChars(firstName)
                    .split(/[\s.]+/)[0]
                    .toLowerCase();
                // Validate: each part should look like a plausible name
                // - Has letters (after normalization)
                // - Length is reasonable
                // - Not obviously a medical/clinical term
                if (!this.isValidChaosPart(normalizedLast))
                    continue;
                if (!this.isValidChaosPart(normalizedFirst))
                    continue;
                // Check dictionary - at least one part should match
                const lastInDict = NameDictionary_1.NameDictionary.isSurname(normalizedLast);
                const firstInDict = NameDictionary_1.NameDictionary.isFirstName(normalizedFirst);
                // STRICT: Require at least one part to be in dictionary
                // This prevents false positives on medical terms like "diagnosis, treatment"
                let confidence = patternObj.confidence;
                if (lastInDict && firstInDict) {
                    confidence = Math.min(0.95, confidence + 0.1);
                }
                else if (lastInDict || firstInDict) {
                    confidence = Math.min(0.92, confidence + 0.05);
                }
                else {
                    // Neither in dictionary - SKIP to avoid false positives
                    // Even in chaotic documents, we need some anchor
                    continue;
                }
                // Check against whitelist
                if (this.isWhitelisted(fullName, text))
                    continue;
                const span = new Span_1.Span({
                    text: fullName,
                    originalValue: fullName,
                    characterStart: match.index,
                    characterEnd: match.index + fullName.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: confidence,
                    priority: this.getPriority(),
                    context: this.getContext(text, match.index, fullName.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: `Chaos Last, First (${patternObj.note})`,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
                detectedPositions.add(posKey);
            }
        }
    }
    /**
     * Validate a chaos-case name part (after OCR normalization)
     */
    isValidChaosPart(normalized) {
        // Must have letters
        if (!/[a-z]/.test(normalized))
            return false;
        // Reasonable length (2-20 chars)
        if (normalized.length < 2 || normalized.length > 20)
            return false;
        // Not a common medical term or whitelisted term
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(normalized, Span_1.FilterType.NAME))
            return false;
        return true;
    }
    /**
     * Normalize OCR errors in names (basic version for validation)
     */
    normalizeNameOcr(name) {
        return name
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/6/g, "G")
            .replace(/5/g, "S")
            .replace(/8/g, "B")
            .toUpperCase();
    }
    /**
     * Comprehensive OCR character normalization for name detection
     * Based on research: common OCR confusions from scanning medical documents
     *
     * NOTE: Some digits map to multiple possible letters. We use the most common:
     * - 4 → a (but could also be e in some fonts)
     * - 1 → l (but could also be i)
     */
    normalizeOcrChars(text) {
        return (text
            // Digit-to-letter substitutions
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/\|/g, "l")
            .replace(/!/g, "i")
            .replace(/5/g, "s")
            .replace(/@/g, "a")
            .replace(/\$/g, "s")
            .replace(/8/g, "b")
            .replace(/6/g, "g")
            .replace(/9/g, "g")
            .replace(/3/g, "e")
            .replace(/4/g, "a")
            .replace(/7/g, "t")
            .replace(/2/g, "z"));
    }
    /**
     * Alternative OCR normalization treating 4 as 'e' instead of 'a'
     * Some OCR engines confuse 4 with e (especially in fonts where e has a horizontal bar)
     * Examples: "Charl4s" → "Charles", "H4nry" → "Henry"
     */
    normalizeOcrCharsAlt(text) {
        return text
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/\|/g, "l")
            .replace(/!/g, "i")
            .replace(/5/g, "s")
            .replace(/@/g, "a")
            .replace(/\$/g, "s")
            .replace(/8/g, "b")
            .replace(/6/g, "g")
            .replace(/9/g, "g")
            .replace(/3/g, "e")
            .replace(/4/g, "e") // KEY DIFFERENCE: 4 → e
            .replace(/7/g, "t")
            .replace(/2/g, "z");
    }
    /**
     * Quick heuristic to check if a string is likely a person name
     */
    isLikelyOcrName(normalized, text, position) {
        const clean = normalized.replace(/[,.\s]/g, "").toUpperCase();
        if (clean.length < 4)
            return false;
        // PHASE 1: Dictionary validation - check EACH word
        const words = normalized.split(/\s+/).filter((w) => w.length > 2);
        for (const word of words) {
            const cleanWord = word.replace(/[^a-zA-Z]/g, "");
            // Check against unified whitelist (medical terms, field labels, etc.)
            if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(cleanWord, Span_1.FilterType.NAME)) {
                return false;
            }
        }
        // Check full phrase against whitelist
        const cleanPhrase = normalized.replace(/[^a-zA-Z\s]/g, "").trim();
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(cleanPhrase, Span_1.FilterType.NAME)) {
            return false;
        }
        // Original checks (keep as backup)
        const medPatterns = /^(MG|MCG|ML|TABLET|CAPSULE|PILL)$|^[A-Z]+IN$|^[A-Z]+OL$|^[A-Z]+AL$/;
        if (medPatterns.test(clean))
            return false;
        // Check context
        const contextStart = Math.max(0, position - 30);
        const contextEnd = Math.min(text.length, position + normalized.length + 30);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        if (/\b(diagnosis|medication|procedure|condition|disease|symptom|treatment|prescribed|taking|drug)[\s:]/i.test(context)) {
            return false;
        }
        return true;
    }
    /**
     * Pattern 9a: Labeled names with noisy/OCR spelling
     *
     * Captures names that follow common patient/contact labels even when
     * separators are distorted (extra spaces, colons, dashes) or characters are
     * OCR-substituted (0/O, 1/l, 5/S).
     *
     * Examples:
     * - "Patient: MAR1A G0NZ ALEZ"
     * - "Emergency Contact - RlCK   SANTOS"
     * - "Pt Name  LOPEZ  DE LA  CRUZ"
     */
    detectLabeledOcrNames(text, spans) {
        const labeledPattern = /\b(?:patient(?:\s+name)?|pt(?:\s*name)?|emergency\s+contact|next\s+of\s+kin|contact|guardian|spouse|mother|father|daughter|son|caregiver)[\s:;#-]*([A-Z0-9][A-Za-z0-9'`’.-]{1,40}(?:\s+[A-Z0-9][A-Za-z0-9'`’.-]{1,40}){0,2})/gi;
        labeledPattern.lastIndex = 0;
        let match;
        while ((match = labeledPattern.exec(text)) !== null) {
            const rawName = match[1];
            const normalizedName = this.normalizeOcrName(rawName);
            if (!this.isNoisyNameCandidate(normalizedName)) {
                continue;
            }
            // Skip provider contexts (Dr., Prof., credentials) even if labeled
            if (this.isInProviderContext(normalizedName, match.index, text)) {
                continue;
            }
            const nameStart = match.index + match[0].indexOf(rawName);
            const span = new Span_1.Span({
                text: rawName,
                originalValue: rawName,
                characterStart: nameStart,
                characterEnd: nameStart + rawName.length,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.91,
                priority: this.getPriority(),
                context: this.getContext(text, nameStart, rawName.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Labeled noisy name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Normalize common OCR substitutions in names
     * Handles: digit-for-letter (1→l, 0→O, 7→u), case issues, extra spaces
     */
    normalizeOcrName(name) {
        // Extended OCR substitution map for names
        const cleaned = name
            .replace(/0/g, "o") // 0 → o
            .replace(/1/g, "l") // 1 → l
            .replace(/\|/g, "l") // | → l
            .replace(/7/g, "u") // 7 → u (common in scans: La7rent → Laurent)
            .replace(/4/g, "a") // 4 → a
            .replace(/5/g, "s") // 5 → s
            .replace(/8/g, "b") // 8 → b
            .replace(/6/g, "g") // 6 → g
            .replace(/9/g, "g") // 9 → g
            .replace(/3/g, "e") // 3 → e
            .replace(/2/g, "z") // 2 → z
            .replace(/\$/g, "s") // $ → s
            .replace(/@/g, "a") // @ → a
            .replace(/!/g, "i"); // ! → i
        // Collapse multiple spaces and normalize
        return cleaned
            .split(/\s+/)
            .filter((part) => part.length > 0)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }
    /**
     * Check if a string contains OCR-style digit substitutions that look like name corruption
     */
    hasOcrDigitSubstitution(text) {
        // Check for digits that commonly substitute for letters in OCR
        // Must be surrounded by letters to be likely OCR error (not a real number)
        return (/[a-zA-Z][0-9][a-zA-Z]/.test(text) || /[a-zA-Z][|$@!][a-zA-Z]/.test(text));
    }
    /**
     * Validate whether an OCR-normalized candidate looks like a person name
     */
    isNoisyNameCandidate(name) {
        const pieces = name.split(/\s+/).filter((p) => p.length > 1);
        if (pieces.length === 0)
            return false;
        const allLookLikeNames = pieces.every((piece) => /^[A-Z][a-z'`’.-]{1,}$/.test(piece));
        return allLookLikeNames && this.isLikelyPersonName(name);
    }
    /**
     * Helper methods - Delegates to shared NameDetectionUtils
     */
    validateLastFirst(name) {
        return NameDetectionUtils_1.NameDetectionUtils.validateLastFirstStrict(name);
    }
    isLikelyPersonName(text, fullContext) {
        if (this.isWhitelisted(text, fullContext))
            return false;
        return NameDetectionUtils_1.NameDetectionUtils.isLikelyPersonName(text, fullContext);
    }
    getContext(text, offset, length) {
        return NameDetectionUtils_1.NameDetectionUtils.extractContext(text, offset, length, 150);
    }
    isHeading(text) {
        const trimmed = text.trim();
        // Check if it's ALL CAPS with multiple words (section headers)
        const isAllCaps = /^[A-Z0-9\s:]+$/.test(trimmed) &&
            /[A-Z]/.test(trimmed) &&
            trimmed.split(/\s+/).length >= 2;
        // Check if it ends with a colon (labels)
        if (isAllCaps || trimmed.endsWith(":"))
            return true;
        // Check for common medical document section patterns
        const sectionPatterns = [
            /^(History|Physical|Medical|Surgical|Social|Family|Patient|Provider|Billing|Assessment|Plan|Review|Examination)/i,
            /\b(Information|History|Source|Complaint|Comments|Define)\b/i,
        ];
        for (const pattern of sectionPatterns) {
            if (pattern.test(trimmed)) {
                // Additional check: if it's a two-word phrase starting with these terms, likely a header
                const words = trimmed.split(/\s+/);
                if (words.length === 2 || words.length === 3) {
                    return true;
                }
            }
        }
        return false;
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
    /**
     * Pattern 10: Hyphenated names (Mary-Ann Johnson, Jean-Claude Dupont)
     */
    detectHyphenatedNames(text, spans) {
        // Hyphenated first name with optional last name: Mary-Ann, Mary-Ann Johnson
        const pattern = /\b([A-Z][a-z]+-[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            // Skip provider names (preceded by title or followed by credentials)
            if (this.isInProviderContext(name, match.index, text)) {
                continue;
            }
            if (!this.isWhitelisted(name, text)) {
                const span = new Span_1.Span({
                    text: name,
                    originalValue: name,
                    characterStart: match.index,
                    characterEnd: match.index + name.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.9,
                    priority: this.getPriority(),
                    context: this.getContext(text, match.index, name.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Hyphenated name",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
    }
    /**
     * Pattern 11: Apostrophe names (O'Brien, D'Angelo, O'Malley)
     */
    detectApostropheNames(text, spans) {
        // Irish/Italian style names: O'Brien, D'Angelo, etc.
        // Also handles: McDonald, MacArthur (Mc/Mac prefix)
        const patterns = [
            /\b([A-Z][''][A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g, // O'Brien, D'Angelo
            /\b((?:Mc|Mac)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g, // McDonald, MacArthur
        ];
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1];
                // Skip provider names (preceded by title or followed by credentials)
                if (this.isInProviderContext(name, match.index, text)) {
                    continue;
                }
                if (!this.isWhitelisted(name, text)) {
                    const span = new Span_1.Span({
                        text: name,
                        originalValue: name,
                        characterStart: match.index,
                        characterEnd: match.index + name.length,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.92,
                        priority: this.getPriority(),
                        context: this.getContext(text, match.index, name.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Apostrophe/prefix name",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Pattern 12: Accented/international names (José García, François Müller)
     */
    detectAccentedNames(text, spans) {
        // Extended Latin characters for international names
        // Covers: á é í ó ú à è ì ò ù ä ë ï ö ü ñ ç ø å æ
        const accentedPattern = /\b([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ][a-záéíóúàèìòùäëïöüñçøå]+(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ][a-záéíóúàèìòùäëïöüñçøå]+){0,2})\b/gu;
        accentedPattern.lastIndex = 0;
        let match;
        while ((match = accentedPattern.exec(text)) !== null) {
            const name = match[1];
            // Skip provider names (preceded by title or followed by credentials)
            if (this.isInProviderContext(name, match.index, text)) {
                continue;
            }
            // Only process if it actually contains accented characters
            if (/[áéíóúàèìòùäëïöüñçøåÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ]/.test(name)) {
                const words = name.split(/\s+/);
                // Must be 1-3 words, each starting with capital
                if (words.length >= 1 &&
                    words.length <= 3 &&
                    !this.isWhitelisted(name, text)) {
                    const span = new Span_1.Span({
                        text: name,
                        originalValue: name,
                        characterStart: match.index,
                        characterEnd: match.index + name.length,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.88,
                        priority: this.getPriority(),
                        context: this.getContext(text, match.index, name.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Accented/international name",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Pattern 13: Names with particles (van Gogh, de Silva, von Neumann)
     */
    detectParticleNames(text, spans) {
        // Common name particles: van, de, von, di, da, du, del, la, le, el, etc.
        const particles = "van|de|von|di|da|du|del|della|la|le|el|al|bin|ibn|af|av|ten|ter|vander|vanden";
        const pattern = new RegExp(`\\b([A-Z][a-z]+\\s+(?:${particles})\\s+[A-Z][a-z]+)\\b`, "gi");
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const name = match[1];
            // Skip provider names (preceded by title or followed by credentials)
            if (this.isInProviderContext(name, match.index, text)) {
                continue;
            }
            if (!this.isWhitelisted(name, text)) {
                const span = new Span_1.Span({
                    text: name,
                    originalValue: name,
                    characterStart: match.index,
                    characterEnd: match.index + name.length,
                    filterType: Span_1.FilterType.NAME,
                    confidence: 0.89,
                    priority: this.getPriority(),
                    context: this.getContext(text, match.index, name.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Name with particle",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // NOTE: We intentionally DO NOT detect "Dr. van Gogh", "Prof. de Silva" etc.
        // These are explicitly titled names = provider names = NOT PHI
    }
    /**
     * Pattern 14: Team member list names
     * Matches names in team member lists like:
     * - Jessica Weber, Oncology
     * - Dr. Samuel Green, Oncology (attending)
     * TEAM MEMBERS PRESENT:
     * - Kim Clark
     */
    detectTeamMemberNames(text, spans) {
        // Pattern: bullet/dash + optional title + First Last + optional role
        const teamPattern = /(?:^|\n)\s*[-•*]\s*(?:Dr\.?\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s*,|\s*\(|\s*$)/gm;
        let match;
        while ((match = teamPattern.exec(text)) !== null) {
            const name = match[1].trim();
            // Skip if obviously not a name
            if (this.isNonPersonStructureTerm(name)) {
                continue;
            }
            const fullMatch = match[0];
            const nameStart = match.index + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            const span = new Span_1.Span({
                text: name,
                originalValue: name,
                characterStart: nameStart,
                characterEnd: nameEnd,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.91,
                // High priority - team member context confirms this is a person
                priority: 150,
                context: this.getContext(text, match.index, fullMatch.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Team member name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
        // Also detect names after "FAMILY PRESENT:" or similar headers
        const familyPresentPattern = /(?:FAMILY\s+PRESENT|FAMILY\s+MEMBERS|CONTACTS?)[\s:]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi;
        while ((match = familyPresentPattern.exec(text)) !== null) {
            const name = match[1].trim();
            if (this.isNonPersonStructureTerm(name)) {
                continue;
            }
            const fullMatch = match[0];
            const nameStart = match.index + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            const span = new Span_1.Span({
                text: name,
                originalValue: name,
                characterStart: nameStart,
                characterEnd: nameEnd,
                filterType: Span_1.FilterType.NAME,
                confidence: 0.92,
                priority: 150,
                context: this.getContext(text, match.index, fullMatch.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Family present name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Pattern 15: Chaos-Aware Labeled Name Detection
     *
     * DESIGN: When we see a label like "Patient Name:", "Member Name:", etc.,
     * we can be much more aggressive about capturing whatever follows as a name,
     * even if it has chaotic capitalization like "pATriCIA L. jOHNsOn".
     *
     * The chaos detector analyzes the document quality and adjusts confidence
     * accordingly - if the doc is chaotic, we EXPECT weird patterns.
     *
     * Examples caught:
     * - "Patient Name:           5antiaqo U. oNwak"
     * - "Member Name:             Nguyen , 4icrdo"
     * - "Name:                   kevin louise liu"
     * - "Legal Name (Last, First Middle):     pATriCIA L. jOHNsOn"
     */
    detectChaosAwareLabeledNames(text, spans, context) {
        // Analyze document for chaos level
        const chaosAnalysis = OcrChaosDetector_1.OcrChaosDetector.analyze(text, context);
        // Comprehensive label patterns that indicate a name follows
        // These are HIGH CONFIDENCE contextual markers
        const labelPatterns = [
            // Direct name labels
            /(?:Patient\s+Name|Member\s+Name|Client\s+Name|Subject\s+Name)[:\s]+/gi,
            /(?:Legal\s+Name)[^:]*:[:\s]+/gi,
            /\bName\s*:[\s]+/gi,
            // Structured labels with colons
            /(?:First\s+Name|Last\s+Name|Middle\s+Name|Full\s+Name)\s*:[\s]+/gi,
            // Contact/relationship labels
            /(?:Emergency\s+Contact|Next\s+of\s+Kin|Guarantor|Responsible\s+Party)\s*:[\s]+/gi,
            // RE: Patient: format (common in medical letters)
            /RE:\s*Patient:\s*/gi,
            // Standalone Patient: or Pt: followed by content (catches OCR chaos)
            /\b(?:Patient|Pt|Subject|Client)\s*:\s+/gi,
            // CONTACT #N: Name: patterns
            /CONTACT\s+#?\d*:?\s*Name:\s*/gi,
        ];
        // Track already-detected positions to avoid duplicates
        const detectedPositions = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        for (const labelPattern of labelPatterns) {
            labelPattern.lastIndex = 0;
            let match;
            while ((match = labelPattern.exec(text)) !== null) {
                const labelEnd = match.index + match[0].length;
                // Capture whatever follows the label - be VERY permissive
                // Allow: letters, numbers (OCR), apostrophes, hyphens, periods, commas, spaces
                const afterLabel = text.substring(labelEnd);
                // Match 1-4 "words" that could be name parts
                // Ultra permissive: includes digits (0-9), @, $, ! for OCR substitutions
                // Examples: Sh@pira (@ for a), PENEL0PE (0 for O), 5mith (5 for S)
                const nameMatch = afterLabel.match(/^([a-zA-Z0-9@$!][a-zA-Z0-9@$!'`'.-]{1,25}(?:[\s,]+[a-zA-Z0-9@$!][a-zA-Z0-9@$!'`'.-]{1,25}){0,3})/);
                if (!nameMatch)
                    continue;
                const capturedName = nameMatch[1].trim();
                const nameStart = labelEnd;
                const nameEnd = labelEnd + capturedName.length;
                const posKey = `${nameStart}-${nameEnd}`;
                // Skip if already detected
                if (detectedPositions.has(posKey))
                    continue;
                // Skip if too short
                if (capturedName.replace(/[\s,.'-]/g, "").length < 3)
                    continue;
                // Calculate confidence based on chaos level and case pattern
                const confidence = OcrChaosDetector_1.OcrChaosDetector.calculateNameConfidence(capturedName, chaosAnalysis.score, true);
                // Skip if confidence too low (even with label boost)
                if (confidence < 0.55)
                    continue;
                // Additional validation: skip obvious non-names
                const normalized = capturedName.toLowerCase();
                if (this.isObviousNonName(normalized))
                    continue;
                const span = new Span_1.Span({
                    text: capturedName,
                    originalValue: capturedName,
                    characterStart: nameStart,
                    characterEnd: nameEnd,
                    filterType: Span_1.FilterType.NAME,
                    confidence: confidence,
                    priority: 160, // High priority - label context is strong signal
                    context: this.getContext(text, match.index, match[0].length + capturedName.length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: `Chaos-aware labeled (quality: ${chaosAnalysis.quality})`,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
                detectedPositions.add(posKey);
            }
        }
    }
    /**
     * Quick check for obvious non-name patterns that should never be captured
     */
    isObviousNonName(text) {
        const lower = text.toLowerCase();
        // Medical/clinical terms
        if (/\b(diagnosis|medication|procedure|treatment|assessment|plan|history)\b/.test(lower)) {
            return true;
        }
        // Document structure
        if (/\b(section|page|form|date|time|signed|undefined|null|n\/a)\b/.test(lower)) {
            return true;
        }
        // Numbers without letters (pure dates, IDs)
        if (/^[\d\s\-\/.:]+$/.test(text)) {
            return true;
        }
        return false;
    }
    /**
     * Enhanced whitelist check using UnifiedMedicalWhitelist.
     *
     * WHITELIST PRIORITY (things that should NOT be redacted):
     * 1. Medical terms (diagnoses, procedures, medications)
     * 2. Field labels and document structure
     * 3. Hospital names (NOT patient PHI under HIPAA Safe Harbor)
     * 4. Insurance companies
     * 5. Geographic terms
     *
     * All consolidated in UnifiedMedicalWhitelist for single source of truth.
     */
    isWhitelisted(text, context) {
        const normalized = text.trim();
        // Use unified whitelist - single source of truth
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(normalized, Span_1.FilterType.NAME, context)) {
            return true;
        }
        // Check individual words
        const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
        for (const word of words) {
            if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(word, Span_1.FilterType.NAME, context)) {
                return true;
            }
        }
        // HOSPITAL WHITELIST: Check if this is part of a hospital name
        // Hospital names are NOT patient PHI under HIPAA Safe Harbor
        if (context &&
            HospitalDictionary_1.HospitalDictionary.isPartOfHospitalName(normalized, context)) {
            return true;
        }
        return false;
    }
    /**
     * Detect concatenated names without spaces (OCR error: spaces removed)
     * Examples: "DeborahHarris", "JohnSmith", "MaryJohnson"
     *
     * Strategy:
     * 1. Find patterns with 2+ capitalized words concatenated
     * 2. Try splitting at capital letters
     * 3. Check if both parts are in name dictionaries
     * 4. If yes, mark as potential name with high confidence
     */
    detectConcatenatedNames(text, spans) {
        // Pattern: Two or more capitalized words concatenated (minimum 3 chars each part)
        // Matches: "DeborahHarris", "JohnSmith", but not "USB" or "MRI"
        const pattern = /\b([A-Z][a-z]{2,})([A-Z][a-z]{2,}(?:[A-Z][a-z]{2,})?)\b/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const part1 = match[1]; // First capitalized word
            const part2 = match[2]; // Second+ capitalized word(s)
            // Check if both parts could be names using dictionary
            const part1IsName = NameDictionary_1.NameDictionary.isFirstName(part1) || NameDictionary_1.NameDictionary.isSurname(part1);
            const part2IsName = NameDictionary_1.NameDictionary.isSurname(part2) || NameDictionary_1.NameDictionary.isFirstName(part2);
            if (part1IsName && part2IsName) {
                // Both parts are in name dictionaries - high confidence this is a name
                const start = match.index;
                const end = start + fullMatch.length;
                // Don't overlap with existing spans
                if (!this.overlapsExisting(start, end, spans)) {
                    const span = new Span_1.Span({
                        text: fullMatch,
                        originalValue: fullMatch,
                        characterStart: start,
                        characterEnd: end,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.95, // High confidence when both parts in dictionary
                        priority: this.getPriority(),
                        context: this.getContext(text, start, fullMatch.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Concatenated names (OCR: missing space)",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
            else if (part1IsName || part2IsName) {
                // One part is a name - medium confidence
                // This catches cases where one part is a rare name not in dictionary
                const start = match.index;
                const end = start + fullMatch.length;
                if (!this.overlapsExisting(start, end, spans)) {
                    const span = new Span_1.Span({
                        text: fullMatch,
                        originalValue: fullMatch,
                        characterStart: start,
                        characterEnd: end,
                        filterType: Span_1.FilterType.NAME,
                        confidence: 0.75, // Medium confidence
                        priority: this.getPriority(),
                        context: this.getContext(text, start, fullMatch.length),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Concatenated names (possible OCR: missing space)",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
    }
    /**
     * Check if a span overlaps with existing spans
     */
    overlapsExisting(start, end, spans) {
        for (const span of spans) {
            if ((start >= span.characterStart && start < span.characterEnd) ||
                (end > span.characterStart && end <= span.characterEnd) ||
                (start <= span.characterStart && end >= span.characterEnd)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Pattern 17: OCR-Corrupted Names with Digits/Symbols in Middle
     *
     * Catches names where OCR has substituted digits or symbols for letters:
     * - "Charl4s" → "Charles" (4 for e)
     * - "Muel1er" → "Mueller" (1 for l)
     * - "M@ria" → "Maria" (@ for a)
     * - "Jennif3r" → "Jennifer" (3 for e)
     * - "Hernandcz" → "Hernandez" (c for e - letter confusion)
     * - "Y0ussef" → "Youssef" (0 for o)
     *
     * Strategy:
     * 1. Find words that look like names but have OCR corruption (digit/symbol inside)
     * 2. Normalize using both OCR mappings (4→a and 4→e variants)
     * 3. Check if normalized version matches a known name
     * 4. If match, capture the original corrupted version
     */
    detectOcrCorruptedNames(text, spans) {
        // Pattern: Capital letter, then mix of letters/digits/symbols that could be OCR errors
        // Must have at least one digit or symbol in the middle (not just letters)
        // Examples: "Charl4s", "M@ria", "Muel1er", "Y0ussef"
        const ocrNamePattern = /\b([A-Z][a-zA-Z0-9@$!|]{2,}(?:\s+[A-Za-z0-9@$!|][a-zA-Z0-9@$!|]{1,}){0,2})\b/g;
        let match;
        while ((match = ocrNamePattern.exec(text)) !== null) {
            const candidate = match[0];
            const start = match.index;
            const end = start + candidate.length;
            // Must contain at least one OCR-suspicious character (digit or symbol in letter position)
            if (!/[0-9@$!|]/.test(candidate))
                continue;
            // Skip if already detected
            if (this.overlapsExisting(start, end, spans))
                continue;
            // Skip if in provider context
            if (this.isInProviderContext(candidate, start, text))
                continue;
            // Try both OCR normalizations
            const normalized1 = this.normalizeOcrChars(candidate);
            const normalized2 = this.normalizeOcrCharsAlt(candidate);
            // Check each word in the candidate
            const words = candidate.split(/\s+/);
            const normalizedWords1 = normalized1.split(/\s+/);
            const normalizedWords2 = normalized2.split(/\s+/);
            let matchCount = 0;
            let totalWords = words.length;
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const norm1 = normalizedWords1[i]?.toLowerCase() || "";
                const norm2 = normalizedWords2[i]?.toLowerCase() || "";
                // Skip very short words
                if (word.length < 2)
                    continue;
                // Check if normalized version is a known name
                const isFirstName1 = NameDictionary_1.NameDictionary.isFirstName(norm1);
                const isFirstName2 = NameDictionary_1.NameDictionary.isFirstName(norm2);
                const isSurname1 = NameDictionary_1.NameDictionary.isSurname(norm1);
                const isSurname2 = NameDictionary_1.NameDictionary.isSurname(norm2);
                if (isFirstName1 || isFirstName2 || isSurname1 || isSurname2) {
                    matchCount++;
                }
            }
            // Require at least one word to match a known name after normalization
            if (matchCount === 0)
                continue;
            // Calculate confidence based on match ratio
            const confidence = matchCount === totalWords ? 0.92 : 0.82;
            // Skip whitelisted terms
            if (this.isWhitelisted(candidate, text))
                continue;
            if (this.isWhitelisted(normalized1, text))
                continue;
            if (this.isWhitelisted(normalized2, text))
                continue;
            const span = new Span_1.Span({
                text: candidate,
                originalValue: candidate,
                characterStart: start,
                characterEnd: end,
                filterType: Span_1.FilterType.NAME,
                confidence: confidence,
                priority: this.getPriority(),
                context: this.getContext(text, start, candidate.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "OCR-corrupted name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
}
exports.SmartNameFilterSpan = SmartNameFilterSpan;
//# sourceMappingURL=SmartNameFilterSpan.js.map