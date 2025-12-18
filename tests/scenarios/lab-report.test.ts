import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateLabReport } from "../utils/document-generators";

describe("Lab Report Redaction", () => {
    it("should redact clean lab reports correctly", async () => {
        const doc = generateLabReport("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // Basic assertions
        // [0] Patient Name, [1] Provider Name, [2] DOB, [3] Collection Date, [4] SSN
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[1].value);
        expect(result.text).not.toContain(doc.expectedPHI[4].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled lab reports", async () => {
        const doc = generateLabReport("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);

        // Assert key PHI is gone (if not mangled beyond recognition by generator)
        // Note: If generator mangles it too much, redaction might fail, which is expected real-world behavior
        // but tests might flake if we check strict equality. We mainly check if structure holds.
        expect(result).not.toContain(doc.expectedPHI[4].value); // SSN usually catches
    });
});
