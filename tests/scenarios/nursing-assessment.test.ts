import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateNursingAssessment } from "../utils/document-generators";

describe("Nursing Assessment Redaction", () => {
    it("should redact clean nursing assessments correctly", async () => {
        const doc = generateNursingAssessment("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Nurse, [2] Supervisor, [3] DOB, [4] Date, [5] Phone
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[1].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(6);
    });

    it("should handle error-filled nursing assessments", async () => {
        const doc = generateNursingAssessment("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
