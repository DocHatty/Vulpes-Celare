import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generatePathologyReport } from "../utils/document-generators";

describe("Pathology Report Redaction", () => {
    it("should redact clean pathology reports correctly", async () => {
        const doc = generatePathologyReport("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Pathologist, [2] Surgeon, [3] DOB, [4] Date
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[1].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled pathology reports", async () => {
        const doc = generatePathologyReport("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
