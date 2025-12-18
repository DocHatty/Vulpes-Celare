import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateConsultNote } from "../utils/document-generators";

describe("Consultation Note Redaction", () => {
    it("should redact clean consultation notes correctly", async () => {
        const doc = generateConsultNote("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Consultant, [2] Referring, [3] DOB, [4] Date, [5] Email
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[5].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(6);
    });

    it("should handle error-filled consultation notes", async () => {
        const doc = generateConsultNote("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
