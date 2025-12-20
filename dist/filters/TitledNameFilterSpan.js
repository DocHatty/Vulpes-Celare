"use strict";
/**
 * TitledNameFilterSpan - Titled Name Detection (Span-Based)
 *
 * Detects names with formal titles (Dr., Mr., Mrs., etc.) and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TitledNameFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanFactory_1 = require("../core/SpanFactory");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
const NameDetectionUtils_1 = require("../utils/NameDetectionUtils");
const NameDetectionCoordinator_1 = require("./name-patterns/NameDetectionCoordinator");
class TitledNameFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Common formal name prefixes
     */
    PREFIXES = [
        "Mr",
        "Mrs",
        "Ms",
        "Miss",
        "Dr",
        "Prof",
        "Rev",
        "Hon",
        "Capt",
        "Lt",
        "Sgt",
        "Col",
        "Gen",
    ];
    /**
     * Name suffixes for complete name patterns
     */
    SUFFIXES = [
        "Jr",
        "Sr",
        "II",
        "III",
        "IV",
        "MD",
        "PhD",
        "DDS",
        "Esq",
        "RN",
        "NP",
        "PA",
    ];
    // WHITELIST functionality now provided by NameDetectionUtils.isNonPersonStructureTerm()
    getType() {
        return "PROVIDER_NAME"; // Titled names are provider names - redacted but labeled differently
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.NAME;
    }
    detect(text, _config, _context) {
        const spans = [];
        // Try Rust acceleration first - detectSmart includes titled names
        // Uses coordinator for cached results to avoid duplicate FFI calls
        const rustDetections = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustSmart(text);
        if (rustDetections.length > 0) {
            // Filter for titled name patterns only
            const titledPatterns = rustDetections.filter((d) => d.pattern.includes("Titled") ||
                d.pattern.includes("Family") ||
                d.pattern.includes("Patient"));
            for (const d of titledPatterns) {
                spans.push(SpanFactory_1.SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, Span_1.FilterType.PROVIDER_NAME, {
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    pattern: d.pattern,
                }));
            }
        }
        // ALWAYS run TypeScript detection for patterns Rust doesn't cover
        // (e.g., provider role names like "NURSE: Patrick Thompson, NP")
        // Previously, this was skipped if Rust returned ANY detections,
        // causing provider role names to be missed.
        this.detectTitledNames(text, spans);
        this.detectTitledNamesWithSuffix(text, spans);
        this.detectLastFirstNames(text, spans);
        this.detectGeneralFullNames(text, spans);
        this.detectFamilyRelationshipNames(text, spans);
        this.detectProviderRoleNames(text, spans);
        return spans;
    }
    /**
     * Pattern 6: Names after provider role labels
     * Matches: "Referring: Dr. John Smith", "Sonographer: Sarah Mitchell, RDMS"
     *
     * NEW APPROACH: Redact as PROVIDER_NAME for consistency and context
     * Names after role labels like "Attending:", "Surgeon:", etc. are providers
     */
    detectProviderRoleNames(text, spans) {
        // FIXED: Use [ \t] instead of \s to prevent greedy matching across newlines
        // The pattern was previously matching "Patrick Thompson, NP\nSUPERVISOR" as one name
        // because \s includes newlines. Now we explicitly use space/tab only.
        const rolePattern = /\b(?:Referring|Consulting|Ordering|Sonographer|Interpreting|Radiologist|Pathologist|Surgeon|Anesthesiologist|Attending|Resident|Nurse|Therapist|Technician|Technologist|Endoscopist|Assistant|Cardiologist|Neurologist|Oncologist|Provider|Physician|Psychiatrist|Psychologist|Dentist|Hygienist|Charge Nurse|Primary Nurse|Supervising|Laboratory Director)(?:[ \t]+(?:Physician|Provider|Doctor|Nurse|Specialist))?[ \t]*:[ \t]*(?:Dr\.?[ \t]+)?([A-Z][a-z]+(?:[, \t]+[A-Z][a-z]+)*(?:[, \t]+(?:MD|DO|PhD|RN|NP|PA|DPT|OT|PT|LCSW|MSN|BSN))?)/gi;
        let match;
        while ((match = rolePattern.exec(text)) !== null) {
            const name = match[1].trim();
            const fullMatch = match[0];
            if (this.isNonPersonStructureTerm(name)) {
                continue;
            }
            const matchPos = match.index;
            const nameStart = matchPos + fullMatch.lastIndexOf(name);
            const nameEnd = nameStart + name.length;
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, nameStart, nameEnd, Span_1.FilterType.PROVIDER_NAME, {
                confidence: 0.92,
                priority: 150,
                pattern: "Provider role name",
            }));
        }
    }
    /**
     * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
     * Matches: Dr. Smith, Dr. John Smith, Mr. Robert Jones, etc.
     *
     * NEW APPROACH: Redact ALL names but label titled names as PROVIDER_NAME
     * This maintains context ("Dr. Smith" -> "{{PROVIDER_1}}") while ensuring
     * consistent redaction and document coherence.
     */
    detectTitledNames(text, spans) {
        // Extended prefixes to catch all titled names
        const allPrefixes = [
            ...this.PREFIXES,
            "Dame",
            "Sir",
            "Lord",
            "Lady",
            "Baron",
            "Count",
            "Duke",
            "Earl",
            "Msgr",
            "Fr",
            "Br",
            "Rabbi",
            "Imam",
            "Pastor",
            "Bishop",
            "Archbishop",
            "Cardinal",
            "Deacon",
            "Elder",
            "Atty",
            "Judge",
            "Justice",
            "Cmdr",
            "Adm",
            "Maj",
            "Chief",
            "Cpl",
            "Pvt",
            "Officer",
        ];
        const titlePattern = new RegExp(`\\b(?:${allPrefixes.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`, "gi");
        let match;
        while ((match = titlePattern.exec(text)) !== null) {
            const matchedText = match[0];
            // Skip document structure terms
            if (this.isWhitelisted(matchedText)) {
                continue;
            }
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, match.index, match.index + matchedText.length, Span_1.FilterType.PROVIDER_NAME, {
                confidence: 0.92,
                priority: 150,
                pattern: "Titled provider name",
            }));
        }
    }
    /**
     * Pattern 2: Title + Name + Suffix (Dr. John Smith Jr., Prof. Jane Doe MD)
     *
     * NEW APPROACH: Redact as PROVIDER_NAME for consistency
     */
    detectTitledNamesWithSuffix(text, spans) {
        const allPrefixes = [
            ...this.PREFIXES,
            "Dame",
            "Sir",
            "Lord",
            "Lady",
            "Baron",
            "Count",
            "Duke",
            "Earl",
        ];
        const allSuffixes = [
            ...this.SUFFIXES,
            "DO",
            "DPM",
            "DVM",
            "OD",
            "PsyD",
            "PharmD",
            "EdD",
            "DrPH",
            "DC",
            "ND",
            "BSN",
            "DNP",
            "APRN",
            "CRNA",
            "CNS",
            "CNM",
            "LPN",
            "LVN",
            "CNA",
            "PA-C",
            "PT",
            "DPT",
            "OT",
            "OTR",
            "SLP",
            "RT",
            "RRT",
            "RD",
            "RDN",
            "LCSW",
            "LMFT",
            "LPC",
            "LCPC",
            "FACS",
            "FACP",
            "FACC",
            "FACOG",
            "FASN",
            "FAAN",
            "FAAP",
            "FACHE",
            "FCCP",
            "FAHA",
            "CPA",
            "MBA",
            "MPH",
        ];
        const titleSuffixPattern = new RegExp(`\\b(?:${allPrefixes.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*[ \\t]*,?[ \\t]*(?:${allSuffixes.join("|")})\\.?\\b`, "gi");
        let match;
        while ((match = titleSuffixPattern.exec(text)) !== null) {
            const matchedText = match[0];
            if (!this.isWhitelisted(matchedText)) {
                spans.push(SpanFactory_1.SpanFactory.fromPosition(text, match.index, match.index + matchedText.length, Span_1.FilterType.PROVIDER_NAME, {
                    confidence: 0.95,
                    priority: 155, // Higher priority for more complete matches
                    pattern: "Titled provider name with credentials",
                }));
            }
        }
    }
    /**
     * Pattern 3: Last, First format (Smith, John)
     * Detects "Last, First" or "Last, First Middle" patterns
     *
     * CRITICAL: This pattern is DISABLED because SmartNameFilterSpan handles
     * Last, First detection with proper validation to avoid false positives.
     */
    detectLastFirstNames(_text, _spans) {
        // DISABLED: SmartNameFilterSpan handles this pattern with proper validation.
        return;
    }
    /**
     * Pattern 4: General Full Names (First Last or First Middle Last)
     * Detects standard full name patterns without titles
     *
     * IMPORTANT: Names starting with provider titles (Dame, Sir, Mr, Mrs, etc.)
     * are provider names and should NOT be redacted under HIPAA Safe Harbor
     *
     * CRITICAL: This pattern is DISABLED because it's too aggressive and matches
     * medical diagnoses like "Trigeminal Neuralgia", "Bell Palsy", etc.
     * Name detection should be handled by SmartNameFilterSpan which has proper
     * dictionary validation.
     */
    detectGeneralFullNames(_text, _spans) {
        // DISABLED: This pattern matches too many false positives (medical diagnoses,
        // procedures, etc.) because it just looks for 2-4 capitalized words.
        // SmartNameFilterSpan handles general name detection with proper validation.
        return;
    }
    /**
     * Pattern 5: Family relationship names (Daughter: Emma, Wife: Mary, etc.)
     *
     * STREET-SMART: When a name appears after a family relationship label
     * (Son:, Daughter:, Wife:, etc.), it's ALWAYS a person name.
     * Don't whitelist based on eponymous disease names (Bell's palsy, Wilson's disease).
     */
    detectFamilyRelationshipNames(text, spans) {
        const relationshipPattern = /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)/gi;
        let match;
        while ((match = relationshipPattern.exec(text)) !== null) {
            const name = match[1];
            const fullMatch = match[0];
            // STREET-SMART: Only skip obvious non-person terms, NOT medical eponyms
            // Context (Son:, Daughter:, etc.) makes it clear this is a person
            if (this.isNonPersonStructureTerm(name)) {
                continue;
            }
            // Find position of name within full match
            const matchPos = match.index;
            const nameStart = matchPos + fullMatch.indexOf(name);
            const nameEnd = nameStart + name.length;
            // STREET-SMART: High priority (150+) = protected from vocabulary filtering
            // Family relationship context is strong evidence this is a person name
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, nameStart, nameEnd, Span_1.FilterType.NAME, {
                confidence: 0.92,
                priority: 150,
                pattern: "Family relationship name",
            }));
        }
    }
    /**
     * Check if text matches whitelist (case-insensitive)
     * Uses NameDetectionUtils + DocumentVocabulary for comprehensive coverage
     *
     * IMPORTANT: If text starts with a person title (Dr., Mr., etc.), we should NOT
     * whitelist based on eponymous disease names. "Dr. Wilson" is a person even though
     * "Wilson's disease" exists.
     */
    isWhitelisted(text) {
        const normalized = text.trim();
        // Check if this text starts with a person title - if so, it's a person reference
        // and should NOT be whitelisted based on disease name matches
        const hasTitlePrefix = NameDetectionUtils_1.NameDetectionUtils.startsWithTitle(normalized);
        // Check for non-person structure terms (always check these)
        if (NameDetectionUtils_1.NameDetectionUtils.isNonPersonStructureTerm(normalized)) {
            return true;
        }
        // If there's a title prefix, this is explicitly a person reference
        // Only whitelist for non-person terms like "Dr. Emergency Department"
        if (hasTitlePrefix) {
            // Only whitelist if the ENTIRE match (minus title) is a non-person term
            const withoutTitle = NameDetectionUtils_1.NameDetectionUtils.removeTitle(normalized);
            if (NameDetectionUtils_1.NameDetectionUtils.isNonPersonStructureTerm(withoutTitle)) {
                return true;
            }
            // Don't whitelist titled names based on medical term matching
            return false;
        }
        // For non-titled text, use unified whitelist
        if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(normalized, Span_1.FilterType.NAME)) {
            return true;
        }
        // Check individual words
        const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
        for (const word of words) {
            if ((0, UnifiedMedicalWhitelist_1.shouldWhitelist)(word, Span_1.FilterType.NAME)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if text is a non-person structure term.
     * Delegates to shared NameDetectionUtils
     */
    isNonPersonStructureTerm(text) {
        return NameDetectionUtils_1.NameDetectionUtils.isNonPersonStructureTerm(text);
    }
}
exports.TitledNameFilterSpan = TitledNameFilterSpan;
//# sourceMappingURL=TitledNameFilterSpan.js.map