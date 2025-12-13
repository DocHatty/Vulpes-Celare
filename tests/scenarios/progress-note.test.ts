import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateProgressNote } from "../utils/document-generators";

describe("Progress Note Redaction", () => {
    it("should redact clean progress notes correctly", async () => {
        const doc = generateProgressNote("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // Basic assertions
        expect(result.text).not.toContain(doc.expectedPHI[0].value); // Patient Name
        expect(result.text).not.toContain(doc.expectedPHI[2].value); // DOB
        expect(result.text).not.toContain(doc.expectedPHI[4].value); // MRN

        // Snapshot for regression testing
        // We replace dynamic values with placeholders to make snapshots stable IF we were mocking RNG,
        // but since we aren't mocking RNG yet, snapshots might be flaky unless seeded.
        // For now, let's just assert on the redactions found.

        // Check redaction count
        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled progress notes", async () => {
        const doc = generateProgressNote("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);

        // Should still redact the MRN at least
        expect(result).not.toContain("MRN: " + doc.expectedPHI[4].value + "\n");
    });
});
