
const { ParallelRedactionEngine } = require("../dist/core/ParallelRedactionEngine");
const { RedactionContext } = require("../dist/context/RedactionContext");
const { FilterRegistry } = require("../dist/filters/FilterRegistry");
const { DocumentVocabulary } = require("../dist/vocabulary/DocumentVocabulary");

async function debugEngine() {
    console.log("Debugging ParallelRedactionEngine...");

    // Initialize filters
    await FilterRegistry.initialize();
    const filters = FilterRegistry.getAllSpanFilters();
    const context = new RedactionContext();
    const policy = { identifiers: {} }; // Enable all

    const texts = [
        "Diagnosis: Invasive Ductal Carcinoma",
        "History of HTN and HLD.",
        "Call Button: 555",
        "Serial: 8849-221-00"
    ];

    for (const text of texts) {
        console.log(`\nProcessing: "${text}"`);
        const redacted = await ParallelRedactionEngine.redactParallel(text, filters, policy, context);
        console.log(`Redacted: "${redacted}"`);

        // Check if medical terms are detected
        if (text.includes("Invasive")) {
            console.log("Is 'Invasive Ductal Carcinoma' a medical term?", DocumentVocabulary.isMedicalTerm("Invasive Ductal Carcinoma"));
        }
    }
}

debugEngine();
