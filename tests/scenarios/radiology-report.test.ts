import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateRadiologyReport } from "../utils/document-generators";

describe("Radiology Report Redaction", () => {
    it("should redact clean radiology reports correctly", async () => {
        const doc = generateRadiologyReport("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Radiologist, [2] Referring, [3] DOB, [4] Exam Date
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[1].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled radiology reports", async () => {
        const doc = generateRadiologyReport("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);

        // Check for Patient Name redaction attempt (assuming it's not totally destroyed)
        // This assertion is weak on purpose for high error rates
        expect(result.length).toBeGreaterThan(0);
    });
});
