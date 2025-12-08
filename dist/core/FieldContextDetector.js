"use strict";
/**
 * Field Context Detector - Pre-Pass Document Analysis
 *
 * Parses document structure to identify field-label/value relationships
 * BEFORE filters run. This enables context-aware redaction:
 *
 * - "PATIENT: JOHN SMITH" → NAME expected after PATIENT label
 * - "FILE #: 12345" → MRN expected after FILE # label
 * - "DOB: 5/5/1955" → DATE expected after DOB label
 *
 * Handles multi-line field/value patterns common in medical forms.
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldContextDetector = void 0;
class FieldContextDetector {
    /**
     * Detect all field contexts in text
     *
     * @param text - Full document text
     * @returns Array of detected field contexts
     */
    static detect(text) {
        const contexts = [];
        for (const fieldDef of this.FIELD_DEFINITIONS) {
            for (const pattern of fieldDef.patterns) {
                // Reset regex state
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const labelStart = match.index;
                    const labelEnd = labelStart + match[0].length;
                    const label = match[1];
                    // Find the value region (after the colon)
                    const valueRegion = this.findValueRegion(text, labelEnd);
                    if (valueRegion) {
                        contexts.push({
                            label: label,
                            labelStart: labelStart,
                            labelEnd: labelEnd,
                            expectedType: fieldDef.expectedType,
                            valueStart: valueRegion.start,
                            valueEnd: valueRegion.end,
                            value: valueRegion.value,
                            confidence: fieldDef.confidence,
                            isMultiLine: valueRegion.isMultiLine,
                        });
                    }
                }
            }
        }
        return contexts;
    }
    /**
     * Find the value region after a field label
     * Handles both same-line and multi-line values
     */
    static findValueRegion(text, afterLabel) {
        // Skip whitespace after colon
        let pos = afterLabel;
        while (pos < text.length && /\s/.test(text[pos]) && text[pos] !== "\n") {
            pos++;
        }
        // Check if we hit a newline (multi-line case)
        const isMultiLine = text[pos] === "\n";
        if (isMultiLine) {
            // Skip the newline and any leading whitespace on next line
            pos++;
            while (pos < text.length && /[ \t]/.test(text[pos])) {
                pos++;
            }
        }
        const valueStart = pos;
        // Find end of value (next newline or next field label)
        let valueEnd = pos;
        while (valueEnd < text.length) {
            // Stop at newline
            if (text[valueEnd] === "\n") {
                break;
            }
            // Stop if we hit another field label pattern
            if (this.isFieldLabel(text.substring(valueEnd))) {
                break;
            }
            valueEnd++;
        }
        // Trim trailing whitespace
        while (valueEnd > valueStart && /\s/.test(text[valueEnd - 1])) {
            valueEnd--;
        }
        if (valueEnd <= valueStart) {
            return null;
        }
        return {
            start: valueStart,
            end: valueEnd,
            value: text.substring(valueStart, valueEnd),
            isMultiLine: isMultiLine,
        };
    }
    /**
     * Check if text starts with a field label pattern
     */
    static isFieldLabel(text) {
        const labelPattern = /^[A-Z][A-Z\s]*:/;
        return labelPattern.test(text);
    }
    /**
     * Get expected type for a position in text
     * Returns the expected PHI type if position falls within a field's value region
     */
    static getExpectedTypeAtPosition(contexts, position) {
        for (const ctx of contexts) {
            if (position >= ctx.valueStart && position < ctx.valueEnd) {
                return ctx.expectedType;
            }
        }
        return null;
    }
    /**
     * Check if a span's position matches an expected field type
     * Used for boosting confidence when span type matches expected type
     */
    static matchesExpectedType(contexts, spanStart, spanEnd, spanType) {
        for (const ctx of contexts) {
            // Check if span overlaps with value region
            const overlaps = spanStart < ctx.valueEnd && spanEnd > ctx.valueStart;
            if (overlaps) {
                if (ctx.expectedType === spanType) {
                    return { matches: true, confidence: ctx.confidence };
                }
                else {
                    // Type mismatch - might be wrong detection
                    return { matches: false, confidence: 0.5 };
                }
            }
        }
        // No context found
        return { matches: false, confidence: 0.7 };
    }
    /**
     * Create a context map for quick position lookups
     */
    static createContextMap(text) {
        const contexts = this.detect(text);
        const map = new Map();
        for (const ctx of contexts) {
            // Mark all positions in value region
            for (let pos = ctx.valueStart; pos < ctx.valueEnd; pos++) {
                map.set(pos, {
                    expectedType: ctx.expectedType,
                    confidence: ctx.confidence,
                });
            }
        }
        return map;
    }
    /**
     * Detect FILE # values in columnar layouts
     * Handles the pattern where FILE #: is on one line and the value is below
     */
    static detectMultiLineFileNumbers(text) {
        const results = [];
        // Check if document has FILE # label
        const fileLabels = /\b(FILE\s*#|File\s*#)\s*:/gi;
        let match;
        while ((match = fileLabels.exec(text)) !== null) {
            const labelEnd = match.index + match[0].length;
            // Look ahead for a standalone number (MRN/file number)
            const lookahead = text.substring(labelEnd, labelEnd + 300);
            // Match: a line containing just a number (possibly with dashes)
            // Common MRN formats: 12345, 123456, 12345-67, etc.
            const numberPattern = /(?:^|\n)\s*(\d{4,14}(?:-\d+)?)\s*(?:\n|$)/m;
            const numberMatch = numberPattern.exec(lookahead);
            if (numberMatch) {
                const value = numberMatch[1].trim();
                const valueStart = labelEnd + lookahead.indexOf(value);
                const valueEnd = valueStart + value.length;
                results.push({
                    value: value,
                    start: valueStart,
                    end: valueEnd,
                    confidence: 0.92,
                });
            }
        }
        return results;
    }
    /**
     * Detect ALL CAPS names that appear after patient-like labels
     * Handles multiple patterns:
     *   1. PATIENT: JOHN SMITH (same line)
     *   2. PATIENT:\n JOHN SMITH (next line)
     *   3. Columnar layout where PATIENT: is followed by other labels, then values
     */
    static detectMultiLinePatientNames(text) {
        const results = [];
        // Strategy 1: Look for ALL CAPS names (2-3 words) that stand alone on a line
        // and appear near a PATIENT: label in the document
        const hasPatientLabel = /\bPATIENT\s*:/i.test(text);
        if (hasPatientLabel) {
            // Find standalone ALL CAPS names (likely patient names in columnar layouts)
            const allCapsNamePattern = /^([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\s*$/gm;
            let match;
            while ((match = allCapsNamePattern.exec(text)) !== null) {
                const name = match[1].trim();
                const words = name.split(/\s+/);
                // Validate: 2-3 words, each word 2+ chars, not medical acronyms or headers
                const excludedWords = new Set([
                    "CT",
                    "MRI",
                    "PET",
                    "EKG",
                    "ECG",
                    "CBC",
                    "USA",
                    "DOB",
                    "MRN",
                    "SSN",
                    "CLINICAL",
                    "INFORMATION",
                    "COMPARISON",
                    "CONTRAST",
                    "TECHNIQUE",
                    "FINDINGS",
                    "IMPRESSION",
                    "HISTORY",
                    "EXAMINATION",
                    "PATIENT",
                    "PHYSICIAN",
                    "EXAM",
                    "DATE",
                    "REFERRING",
                    "FILE",
                    "REPORT",
                ]);
                // Check if any word is excluded
                const hasExcludedWord = words.some((w) => excludedWords.has(w));
                // Additional validation
                const isValid = words.length >= 2 &&
                    words.length <= 3 &&
                    words.every((w) => w.length >= 2) &&
                    !hasExcludedWord &&
                    // Not a section header (those are usually single words or end with colon nearby)
                    !text
                        .substring(match.index, match.index + name.length + 5)
                        .includes(":");
                if (isValid) {
                    // Check context - is this near the top of the document (header area)?
                    // Patient names in headers are usually in the first 500 chars
                    const isInHeaderArea = match.index < 500;
                    if (isInHeaderArea) {
                        results.push({
                            name: name,
                            start: match.index,
                            end: match.index + name.length,
                            confidence: 0.9,
                        });
                    }
                }
            }
        }
        // Strategy 2: Direct pattern - PATIENT: followed by name on same or next line
        const patientLabels = /\b(PATIENT|Patient|Pt|PT|SUBJECT|Subject)\s*:/g;
        let match2;
        while ((match2 = patientLabels.exec(text)) !== null) {
            const labelEnd = match2.index + match2[0].length;
            // Look ahead for ALL CAPS name
            const lookahead = text.substring(labelEnd, labelEnd + 300);
            // Match: whitespace/newlines, possibly other field labels, then ALL CAPS name on its own line
            const namePattern = /(?:^|\n)\s*([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\s*(?:\n|$)/m;
            const nameMatch = namePattern.exec(lookahead);
            if (nameMatch) {
                const name = nameMatch[1].trim();
                const words = name.split(/\s+/);
                const excludedWords = new Set([
                    "CT",
                    "MRI",
                    "PET",
                    "EKG",
                    "ECG",
                    "CBC",
                    "USA",
                    "DOB",
                    "MRN",
                    "SSN",
                    "CLINICAL",
                    "INFORMATION",
                    "COMPARISON",
                    "CONTRAST",
                    "TECHNIQUE",
                    "FINDINGS",
                    "IMPRESSION",
                    "HISTORY",
                    "EXAMINATION",
                    "REFERRING",
                ]);
                const hasExcludedWord = words.some((w) => excludedWords.has(w));
                const isValid = words.length >= 2 &&
                    words.length <= 3 &&
                    words.every((w) => w.length >= 2) &&
                    !hasExcludedWord;
                if (isValid) {
                    const nameStart = labelEnd + lookahead.indexOf(nameMatch[1]);
                    const nameEnd = nameStart + name.length;
                    // Avoid duplicates
                    const isDuplicate = results.some((r) => r.start === nameStart && r.end === nameEnd);
                    if (!isDuplicate) {
                        results.push({
                            name: name,
                            start: nameStart,
                            end: nameEnd,
                            confidence: 0.92,
                        });
                    }
                }
            }
        }
        return results;
    }
}
exports.FieldContextDetector = FieldContextDetector;
/**
 * Field label patterns mapped to expected value types
 */
FieldContextDetector.FIELD_DEFINITIONS = [
    // NAME fields - expanded coverage
    {
        patterns: [
            /\b(PATIENT|Patient|Pt|PT)\s*:/gi,
            /\b(PATIENT\s+NAME|Patient\s+Name)\s*:/gi,
            /\b(NAME|Name)\s*:/gi,
            /\b(FULL\s+NAME|Full\s+Name)\s*:/gi,
            /\b(PHYSICIAN|Physician|Doctor|Dr)\s*:/gi,
            /\b(ATTENDING\s+PHYSICIAN|Attending\s+Physician)\s*:/gi,
            /\b(ORDERING\s+PHYSICIAN|Ordering\s+Physician)\s*:/gi,
            /\b(PRIMARY\s+CARE|Primary\s+Care)\s*:/gi,
            /\b(REFERRING|Referring)\s*:/gi,
            /\b(REFERRING\s+PHYSICIAN|Referring\s+Physician)\s*:/gi,
            /\b(RADIOLOGIST|Radiologist)\s*:/gi,
            /\b(READ\s+BY|Read\s+By)\s*:/gi,
            /\b(INTERPRETED\s+BY|Interpreted\s+By)\s*:/gi,
            /\b(DICTATED\s+BY|Dictated\s+By)\s*:/gi,
            /\b(TRANSCRIBED\s+BY|Transcribed\s+By)\s*:/gi,
            /\b(SIGNED\s+BY|Signed\s+By)\s*:/gi,
            /\b(ELECTRONICALLY\s+SIGNED|Electronically\s+Signed)\s*:/gi,
            /\b(SPOUSE|Spouse|Wife|Husband)\s*:/gi,
            /\b(NEXT\s+OF\s+KIN|Next\s+of\s+Kin)\s*:/gi,
            /\b(GUARDIAN|Guardian)\s*:/gi,
            /\b(POWER\s+OF\s+ATTORNEY|Power\s+of\s+Attorney)\s*:/gi,
            /\b(EMERGENCY\s+CONTACT|Emergency\s+Contact)\s*:/gi,
            /\b(CONTACT\s+NAME|Contact\s+Name)\s*:/gi,
            /\b(MOTHER|Mother|FATHER|Father)\s*:/gi,
            /\b(PARENT|Parent)\s*:/gi,
            /\b(SUBSCRIBER|Subscriber)\s*:/gi,
            /\b(INSURED|Insured)\s*:/gi,
            /\b(POLICYHOLDER|Policyholder|Policy\s+Holder)\s*:/gi,
            /\b(BENEFICIARY|Beneficiary)\s*:/gi,
            /\b(NURSE|Nurse|RN|LPN)\s*:/gi,
            /\b(CAREGIVER|Caregiver)\s*:/gi,
            /\b(WITNESS|Witness)\s*:/gi,
            /\b(NOTARIZED\s+BY|Notarized\s+By)\s*:/gi,
        ],
        expectedType: "NAME",
        confidence: 0.95,
    },
    // MRN fields - expanded coverage
    {
        patterns: [
            /\b(FILE\s*#|File\s*#|FILE\s+NUMBER|File\s+Number)\s*:/gi,
            /\b(MRN|Mrn)\s*:/gi,
            /\b(MEDICAL\s+RECORD|Medical\s+Record)\s*(?:NUMBER|Number|#)?\s*:/gi,
            /\b(CHART\s*#|Chart\s*#|CHART\s+NUMBER)\s*:/gi,
            /\b(ACCOUNT\s*#|Account\s*#|ACCOUNT\s+NUMBER)\s*:/gi,
            /\b(PATIENT\s+ID|Patient\s+ID)\s*:/gi,
            /\b(PATIENT\s+NUMBER|Patient\s+Number)\s*:/gi,
            /\b(ACCESSION\s*#?|Accession)\s*:/gi,
            /\b(ACCESSION\s+NUMBER|Accession\s+Number)\s*:/gi,
            /\b(CASE\s*#|Case\s*#|CASE\s+NUMBER|Case\s+Number)\s*:/gi,
            /\b(ENCOUNTER\s*#?|Encounter)\s*:/gi,
            /\b(ENCOUNTER\s+NUMBER|Encounter\s+Number)\s*:/gi,
            /\b(VISIT\s*#|Visit\s*#|VISIT\s+NUMBER)\s*:/gi,
            /\b(ADMISSION\s*#|Admission\s*#)\s*:/gi,
            /\b(UNIT\s+NUMBER|Unit\s+Number)\s*:/gi,
            /\b(STUDY\s+ID|Study\s+ID)\s*:/gi,
            /\b(SPECIMEN\s*#?|Specimen)\s*:/gi,
            /\b(LAB\s*#|Lab\s*#)\s*:/gi,
            /\b(REQ\s*#|Req\s*#|REQUISITION)\s*:/gi,
            /\b(ORDER\s*#|Order\s*#|ORDER\s+NUMBER)\s*:/gi,
            /\b(CLAIM\s*#|Claim\s*#|CLAIM\s+NUMBER)\s*:/gi,
            /\b(INVOICE\s*#|Invoice\s*#)\s*:/gi,
            /\b(AUTHORIZATION\s*#?|Authorization)\s*:/gi,
            /\b(REFERENCE\s*#|Reference\s*#)\s*:/gi,
            /\b(CONTROL\s*#|Control\s*#)\s*:/gi,
        ],
        expectedType: "MRN",
        confidence: 0.95,
    },
    // DATE fields - expanded coverage
    {
        patterns: [
            /\b(DOB|Dob|DATE\s+OF\s+BIRTH|Date\s+of\s+Birth)\s*:/gi,
            /\b(BIRTH\s+DATE|Birth\s+Date|BIRTHDATE)\s*:/gi,
            /\b(DATE|Date)\s*:/gi,
            /\b(SERVICE\s+DATE|Service\s+Date)\s*:/gi,
            /\b(EXAM\s+DATE|Exam\s+Date)\s*:/gi,
            /\b(STUDY\s+DATE|Study\s+Date)\s*:/gi,
            /\b(PROCEDURE\s+DATE|Procedure\s+Date)\s*:/gi,
            /\b(ADMISSION\s+DATE|Admission\s+Date)\s*:/gi,
            /\b(DISCHARGE\s+DATE|Discharge\s+Date)\s*:/gi,
            /\b(VISIT\s+DATE|Visit\s+Date)\s*:/gi,
            /\b(ORDER\s+DATE|Order\s+Date)\s*:/gi,
            /\b(REPORT\s+DATE|Report\s+Date)\s*:/gi,
            /\b(SIGNED\s+DATE|Signed\s+Date)\s*:/gi,
            /\b(EFFECTIVE\s+DATE|Effective\s+Date)\s*:/gi,
            /\b(EXPIRATION\s+DATE|Expiration\s+Date)\s*:/gi,
            /\b(ONSET\s+DATE|Onset\s+Date)\s*:/gi,
            /\b(DATE\s+OF\s+SERVICE|Date\s+of\s+Service)\s*:/gi,
            /\b(DOS)\s*:/gi,
            /\b(DATE\s+OF\s+DEATH|Date\s+of\s+Death)\s*:/gi,
            /\b(SURGERY\s+DATE|Surgery\s+Date)\s*:/gi,
            /\b(SPECIMEN\s+DATE|Specimen\s+Date)\s*:/gi,
            /\b(COLLECTION\s+DATE|Collection\s+Date)\s*:/gi,
            /\b(RECEIVED\s+DATE|Received\s+Date)\s*:/gi,
            /\b(REPORTED\s+DATE|Reported\s+Date)\s*:/gi,
            /\b(APPOINTMENT\s+DATE|Appointment\s+Date)\s*:/gi,
            /\b(SCHEDULED\s+DATE|Scheduled\s+Date)\s*:/gi,
        ],
        expectedType: "DATE",
        confidence: 0.9,
    },
    // ADDRESS fields - expanded coverage
    {
        patterns: [
            /\b(ADDRESS|Address)\s*:/gi,
            /\b(HOME\s+ADDRESS|Home\s+Address)\s*:/gi,
            /\b(MAILING\s+ADDRESS|Mailing\s+Address)\s*:/gi,
            /\b(STREET\s+ADDRESS|Street\s+Address)\s*:/gi,
            /\b(RESIDENTIAL\s+ADDRESS|Residential\s+Address)\s*:/gi,
            /\b(BILLING\s+ADDRESS|Billing\s+Address)\s*:/gi,
            /\b(SHIPPING\s+ADDRESS|Shipping\s+Address)\s*:/gi,
            /\b(WORK\s+ADDRESS|Work\s+Address)\s*:/gi,
            /\b(EMPLOYER\s+ADDRESS|Employer\s+Address)\s*:/gi,
            /\b(FACILITY\s+ADDRESS|Facility\s+Address)\s*:/gi,
            /\b(LOCATION|Location)\s*:/gi,
            /\b(CITY|City)\s*:/gi,
            /\b(STATE|State)\s*:/gi,
            /\b(ZIP|Zip|ZIP\s+CODE|Zip\s+Code)\s*:/gi,
            /\b(POSTAL\s+CODE|Postal\s+Code)\s*:/gi,
            /\b(COUNTY|County)\s*:/gi,
            /\b(COUNTRY|Country)\s*:/gi,
        ],
        expectedType: "ADDRESS",
        confidence: 0.9,
    },
    // PHONE fields - expanded coverage
    {
        patterns: [
            /\b(PHONE|Phone)\s*:/gi,
            /\b(PHONE\s+NUMBER|Phone\s+Number)\s*:/gi,
            /\b(TELEPHONE|Telephone|Tel)\s*:/gi,
            /\b(CELL|Cell|MOBILE|Mobile)\s*:/gi,
            /\b(CELL\s+PHONE|Cell\s+Phone)\s*:/gi,
            /\b(MOBILE\s+PHONE|Mobile\s+Phone)\s*:/gi,
            /\b(HOME\s+PHONE|Home\s+Phone)\s*:/gi,
            /\b(WORK\s+PHONE|Work\s+Phone)\s*:/gi,
            /\b(OFFICE\s+PHONE|Office\s+Phone)\s*:/gi,
            /\b(PAGER|Pager)\s*:/gi,
            /\b(FAX|Fax)\s*:/gi,
            /\b(FAX\s+NUMBER|Fax\s+Number)\s*:/gi,
            /\b(CONTACT\s+NUMBER|Contact\s+Number)\s*:/gi,
            /\b(CALLBACK\s+NUMBER|Callback\s+Number)\s*:/gi,
            /\b(EMERGENCY\s+PHONE|Emergency\s+Phone)\s*:/gi,
        ],
        expectedType: "PHONE",
        confidence: 0.9,
    },
    // SSN fields
    {
        patterns: [
            /\b(SSN|Ssn|SOCIAL\s+SECURITY|Social\s+Security)\s*(?:NUMBER|Number|#)?\s*:/gi,
            /\b(SOCIAL\s+SECURITY\s+NUMBER|Social\s+Security\s+Number)\s*:/gi,
            /\b(SS\s*#|SS\s+NUMBER)\s*:/gi,
        ],
        expectedType: "SSN",
        confidence: 0.98,
    },
    // EMAIL fields
    {
        patterns: [
            /\b(EMAIL|Email|E-MAIL|E-mail)\s*:/gi,
            /\b(EMAIL\s+ADDRESS|Email\s+Address)\s*:/gi,
            /\b(ELECTRONIC\s+MAIL|Electronic\s+Mail)\s*:/gi,
        ],
        expectedType: "EMAIL",
        confidence: 0.9,
    },
    // INSURANCE fields - treat as MRN (policy numbers are identifiers)
    {
        patterns: [
            /\b(INSURANCE\s+ID|Insurance\s+ID)\s*:/gi,
            /\b(MEMBER\s+ID|Member\s+ID)\s*:/gi,
            /\b(MEMBER\s+NUMBER|Member\s+Number)\s*:/gi,
            /\b(GROUP\s+NUMBER|Group\s+Number)\s*:/gi,
            /\b(GROUP\s*#|Group\s*#)\s*:/gi,
            /\b(POLICY\s+NUMBER|Policy\s+Number)\s*:/gi,
            /\b(POLICY\s*#|Policy\s*#)\s*:/gi,
            /\b(SUBSCRIBER\s+ID|Subscriber\s+ID)\s*:/gi,
            /\b(PLAN\s+ID|Plan\s+ID)\s*:/gi,
            /\b(PLAN\s+NUMBER|Plan\s+Number)\s*:/gi,
            /\b(CERTIFICATE\s+NUMBER|Certificate\s+Number)\s*:/gi,
            /\b(RX\s+BIN|Rx\s+Bin)\s*:/gi,
            /\b(RX\s+PCN|Rx\s+PCN)\s*:/gi,
            /\b(RX\s+GROUP|Rx\s+Group)\s*:/gi,
            /\b(BIN)\s*:/gi,
            /\b(PCN)\s*:/gi,
        ],
        expectedType: "MRN",
        confidence: 0.9,
    },
    // HEALTH PLAN fields - treat as ORGANIZATION (plan names)
    {
        patterns: [
            /\b(INSURANCE\s+COMPANY|Insurance\s+Company)\s*:/gi,
            /\b(INSURANCE\s+CARRIER|Insurance\s+Carrier)\s*:/gi,
            /\b(HEALTH\s+PLAN|Health\s+Plan)\s*:/gi,
            /\b(PAYER|Payer)\s*:/gi,
            /\b(CARRIER|Carrier)\s*:/gi,
            /\b(EMPLOYER|Employer)\s*:/gi,
        ],
        expectedType: "ORGANIZATION",
        confidence: 0.85,
    },
    // AGE/SEX fields - useful for context (these are often demographics, not sensitive)
    {
        patterns: [
            /\b(AGE|Age)\s*:/gi,
            /\b(SEX|Sex|GENDER|Gender)\s*:/gi,
            /\b(RACE|Race)\s*:/gi,
            /\b(ETHNICITY|Ethnicity)\s*:/gi,
            /\b(MARITAL\s+STATUS|Marital\s+Status)\s*:/gi,
            /\b(OCCUPATION|Occupation)\s*:/gi,
        ],
        expectedType: "DEMOGRAPHIC",
        confidence: 0.8,
    },
];
//# sourceMappingURL=FieldContextDetector.js.map