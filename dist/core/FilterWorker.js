"use strict";
/**
 * FilterWorker - Worker Thread for Parallel Filter Execution
 *
 * This file runs in a separate worker thread to execute filter detection
 * on a different CPU core from the main thread.
 *
 * IMPORTANT: This worker is compiled to FilterWorker.js and run via worker_threads.
 * It cannot import filters directly due to worker serialization constraints.
 * Instead, it uses a filter registry to look up filter implementations.
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
// Import all filters (they'll be loaded in the worker's context)
const SmartNameFilterSpan_1 = require("../filters/SmartNameFilterSpan");
const FormattedNameFilterSpan_1 = require("../filters/FormattedNameFilterSpan");
const TitledNameFilterSpan_1 = require("../filters/TitledNameFilterSpan");
const FamilyNameFilterSpan_1 = require("../filters/FamilyNameFilterSpan");
const SSNFilterSpan_1 = require("../filters/SSNFilterSpan");
const PhoneFilterSpan_1 = require("../filters/PhoneFilterSpan");
const EmailFilterSpan_1 = require("../filters/EmailFilterSpan");
const AddressFilterSpan_1 = require("../filters/AddressFilterSpan");
const DateFilterSpan_1 = require("../filters/DateFilterSpan");
const MRNFilterSpan_1 = require("../filters/MRNFilterSpan");
const NPIFilterSpan_1 = require("../filters/NPIFilterSpan");
const IPAddressFilterSpan_1 = require("../filters/IPAddressFilterSpan");
const URLFilterSpan_1 = require("../filters/URLFilterSpan");
const CreditCardFilterSpan_1 = require("../filters/CreditCardFilterSpan");
const AccountNumberFilterSpan_1 = require("../filters/AccountNumberFilterSpan");
const HealthPlanNumberFilterSpan_1 = require("../filters/HealthPlanNumberFilterSpan");
const LicenseNumberFilterSpan_1 = require("../filters/LicenseNumberFilterSpan");
const PassportNumberFilterSpan_1 = require("../filters/PassportNumberFilterSpan");
const VehicleIdentifierFilterSpan_1 = require("../filters/VehicleIdentifierFilterSpan");
const DeviceIdentifierFilterSpan_1 = require("../filters/DeviceIdentifierFilterSpan");
const BiometricContextFilterSpan_1 = require("../filters/BiometricContextFilterSpan");
const UniqueIdentifierFilterSpan_1 = require("../filters/UniqueIdentifierFilterSpan");
const ZipCodeFilterSpan_1 = require("../filters/ZipCodeFilterSpan");
const FaxNumberFilterSpan_1 = require("../filters/FaxNumberFilterSpan");
const AgeFilterSpan_1 = require("../filters/AgeFilterSpan");
const DEAFilterSpan_1 = require("../filters/DEAFilterSpan");
const RedactionContext_1 = require("../context/RedactionContext");
// ============================================================================
// FILTER REGISTRY
// ============================================================================
const FILTER_REGISTRY = new Map();
function initializeFilters() {
    const filters = [
        new SmartNameFilterSpan_1.SmartNameFilterSpan(),
        new FormattedNameFilterSpan_1.FormattedNameFilterSpan(),
        new TitledNameFilterSpan_1.TitledNameFilterSpan(),
        new FamilyNameFilterSpan_1.FamilyNameFilterSpan(),
        new SSNFilterSpan_1.SSNFilterSpan(),
        new PhoneFilterSpan_1.PhoneFilterSpan(),
        new EmailFilterSpan_1.EmailFilterSpan(),
        new AddressFilterSpan_1.AddressFilterSpan(),
        new DateFilterSpan_1.DateFilterSpan(),
        new MRNFilterSpan_1.MRNFilterSpan(),
        new NPIFilterSpan_1.NPIFilterSpan(),
        new IPAddressFilterSpan_1.IPAddressFilterSpan(),
        new URLFilterSpan_1.URLFilterSpan(),
        new CreditCardFilterSpan_1.CreditCardFilterSpan(),
        new AccountNumberFilterSpan_1.AccountNumberFilterSpan(),
        new HealthPlanNumberFilterSpan_1.HealthPlanNumberFilterSpan(),
        new LicenseNumberFilterSpan_1.LicenseNumberFilterSpan(),
        new PassportNumberFilterSpan_1.PassportNumberFilterSpan(),
        new VehicleIdentifierFilterSpan_1.VehicleIdentifierFilterSpan(),
        new DeviceIdentifierFilterSpan_1.DeviceIdentifierFilterSpan(),
        new BiometricContextFilterSpan_1.BiometricContextFilterSpan(),
        new UniqueIdentifierFilterSpan_1.UniqueIdentifierFilterSpan(),
        new ZipCodeFilterSpan_1.ZipCodeFilterSpan(),
        new FaxNumberFilterSpan_1.FaxNumberFilterSpan(),
        new AgeFilterSpan_1.AgeFilterSpan(),
        new DEAFilterSpan_1.DEAFilterSpan(),
    ];
    for (const filter of filters) {
        FILTER_REGISTRY.set(filter.constructor.name, filter);
    }
}
// Initialize filters when worker starts
initializeFilters();
// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on("message", async (task) => {
        const startTime = Date.now();
        const result = {
            taskId: task.taskId,
            filterName: task.filterName,
            filterType: task.filterType,
            success: false,
            spans: [],
            executionTimeMs: 0,
        };
        try {
            const filter = FILTER_REGISTRY.get(task.filterName);
            if (!filter) {
                throw new Error(`Filter not found: ${task.filterName}`);
            }
            // Create a minimal context for the worker
            const context = new RedactionContext_1.RedactionContext();
            // Execute the filter
            const spans = await Promise.resolve(filter.detect(task.text, task.config, context));
            // Serialize spans (can't pass Span objects directly through worker boundary)
            result.spans = spans.map(serializeSpan);
            result.success = true;
        }
        catch (error) {
            result.success = false;
            result.error = error instanceof Error ? error.message : String(error);
        }
        result.executionTimeMs = Date.now() - startTime;
        worker_threads_1.parentPort.postMessage(result);
    });
}
/**
 * Serialize a Span object for transfer across worker boundary
 */
function serializeSpan(span) {
    return {
        text: span.text,
        originalValue: span.text, // originalValue is same as text in Span class
        characterStart: span.characterStart,
        characterEnd: span.characterEnd,
        filterType: span.filterType,
        confidence: span.confidence,
        priority: span.priority,
        context: span.context,
        pattern: span.pattern,
    };
}
//# sourceMappingURL=FilterWorker.js.map