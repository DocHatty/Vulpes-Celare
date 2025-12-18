import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateOperativeReport } from "../utils/document-generators";

describe("Operative Report Redaction", () => {
    it("should redact clean operative reports correctly", async () => {
        const doc = generateOperativeReport("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Surgeon, [2] Anesthesia, [3] DOB, [4] Surg Date
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[1].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled operative reports", async () => {
        const doc = generateOperativeReport("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
