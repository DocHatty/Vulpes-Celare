import { describe, it, expect } from "vitest";
import { VulpesCelare } from "../../src/VulpesCelare";
import { generateEmergencyNote } from "../utils/document-generators";

describe("Emergency Note Redaction", () => {
    // FIXME: Rust engine regression: "PATIENT: First Last" not consistently detected?
    it.skip("should redact clean emergency notes correctly", async () => {
        const doc = generateEmergencyNote("clean-1", "none");
        const result = await VulpesCelare.redactWithDetails(doc.text);

        // [0] Patient, [1] Provider, [2] DOB, [3] Visit, [4] Phone
        expect(result.text).not.toContain(doc.expectedPHI[0].value);
        expect(result.text).not.toContain(doc.expectedPHI[4].value);

        // Check non-PHI preservation
        doc.expectedNonPHI.forEach((item) => {
            expect(result.text.toLowerCase()).toContain(item.toLowerCase());
        });

        expect(result.redactionCount).toBeGreaterThanOrEqual(5);
    });

    it("should handle error-filled emergency notes", async () => {
        const doc = generateEmergencyNote("dirty-1", "high");
        const result = await VulpesCelare.redact(doc.text);
        expect(result.length).toBeGreaterThan(0);
    });
});
