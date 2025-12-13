import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generatePrescription } from "../utils/document-generators";

describe("Prescription Redaction", () => {
    it("should redact clean prescriptions correctly", async () => {
        const doc = generatePrescription("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Prescriber, [2] DOB, [3] Date, [4] Phone, [5] Address
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[4].value);
        expect(result.text).not.toContain(doc.expectedPHI[5].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(6);
    });

    it("should handle error-filled prescriptions", async () => {
        const doc = generatePrescription("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
