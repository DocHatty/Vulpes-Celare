import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateDischargeSummary } from "../utils/document-generators";

describe("Discharge Summary Redaction", () => {
    it("should redact clean discharge summaries correctly", async () => {
        const doc = generateDischargeSummary("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Attending, [2] DOB, [3] Admit, [4] Discharge, [5] SSN, [6] Phone
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[5].value);
        expect(result.text).not.toContain(doc.expectedPHI[6].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(7);
    });

    it("should handle error-filled discharge summaries", async () => {
        const doc = generateDischargeSummary("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result).not.toContain(doc.expectedPHI[5].value); // SSN
    });
});
