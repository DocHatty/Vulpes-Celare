
const path = require("path");
const { RedactionContext } = require("../dist/context/RedactionContext");
const { MRNFilterSpan } = require("../dist/filters/MRNFilterSpan");
const { PhoneFilterSpan } = require("../dist/filters/PhoneFilterSpan");
const { FormattedNameFilterSpan } = require("../dist/filters/FormattedNameFilterSpan");
const { SmartNameFilterSpan } = require("../dist/filters/SmartNameFilterSpan");
const { DeviceIdentifierFilterSpan } = require("../dist/filters/DeviceIdentifierFilterSpan");
const { DocumentVocabulary } = require("../dist/vocabulary/DocumentVocabulary");

async function debug() {
    console.log("Debugging Filters...");

    const context = new RedactionContext();

    // 1. Test MRN Filter
    const mrnFilter = new MRNFilterSpan();
    const mrnTexts = [
        "MRN: #123456",
        "MRN #123456",
        "MRN#123456",
        "Patient ID: #987654"
    ];
    console.log("\n--- MRN Filter ---");
    for (const text of mrnTexts) {
        const spans = mrnFilter.detect(text, {}, context);
        console.log(`Text: "${text}" -> Spans: ${spans.length}`);
        spans.forEach(s => console.log(`  - ${s.originalValue}`));
    }

    // 2. Test Phone Filter
    const phoneFilter = new PhoneFilterSpan();
    const phoneTexts = [
        "Call Button: 555",
        "Hospital Room: 404\nCall Button: 555",
        "555",
        "Phone: 555-1234"
    ];
    console.log("\n--- Phone Filter ---");
    for (const text of phoneTexts) {
        const spans = phoneFilter.detect(text, {}, context);
        console.log(`Text: "${text}" -> Spans: ${spans.length}`);
        spans.forEach(s => console.log(`  - ${s.originalValue}`));
    }

    // 3. Test Name Filters (Medical Terms)
    const nameFilter = new FormattedNameFilterSpan();
    const smartFilter = new SmartNameFilterSpan();
    const nameTexts = [
        "Invasive Ductal Carcinoma",
        "HTN",
        "HLD",
        "Patient: HTN",
        "Diagnosis: Invasive Ductal Carcinoma"
    ];
    console.log("\n--- Name Filters ---");
    for (const text of nameTexts) {
        const spans1 = nameFilter.detect(text, {}, context);
        const spans2 = smartFilter.detect(text, {}, context);
        console.log(`Text: "${text}"`);
        console.log(`  FormattedName: ${spans1.length} spans`);
        spans1.forEach(s => console.log(`    - ${s.originalValue}`));
        console.log(`  SmartName: ${spans2.length} spans`);
        spans2.forEach(s => console.log(`    - ${s.originalValue}`));
    }

    // 4. Test Device Filter
    const deviceFilter = new DeviceIdentifierFilterSpan();
    const deviceTexts = [
        "Serial: 8849-221-00",
        "Call Button: 555"
    ];
    console.log("\n--- Device Filter ---");
    for (const text of deviceTexts) {
        const spans = deviceFilter.detect(text, {}, context);
        console.log(`Text: "${text}" -> Spans: ${spans.length}`);
        spans.forEach(s => console.log(`  - ${s.originalValue}`));
    }
}

debug();
