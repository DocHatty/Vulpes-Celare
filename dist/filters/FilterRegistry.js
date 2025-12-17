"use strict";
/**
 * Filter Registry
 *
 * Manages registration and initialization of all redaction filters:
 * - Filter registration by type
 * - Filter initialization (lazy loading)
 * - NER filter management
 * - Filter application orchestration
 *
 * @module redaction/filters
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterRegistry = void 0;
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
/**
 * Filter Registry - manages all Span-based redaction filters for parallel execution
 */
class FilterRegistry {
    static spanFilters = [];
    static isInitialized = false;
    /**
     * Initialize all Span-based filters for parallel execution
     */
    static async initialize() {
        if (this.isInitialized)
            return;
        RadiologyLogger_1.RadiologyLogger.loading("REDACTION", "Loading Span-based filters for parallel execution...");
        try {
            // Load all Span-based filters
            const [{ EmailFilterSpan }, { PhoneFilterSpan }, { SSNFilterSpan }, { DateFilterSpan }, { URLFilterSpan }, { IPAddressFilterSpan }, { CreditCardFilterSpan }, { ZipCodeFilterSpan }, { AddressFilterSpan }, { MRNFilterSpan }, { AccountNumberFilterSpan }, { LicenseNumberFilterSpan }, { HealthPlanNumberFilterSpan }, { TitledNameFilterSpan }, { FamilyNameFilterSpan }, { FormattedNameFilterSpan }, { SmartNameFilterSpan }, { FaxNumberFilterSpan }, { VehicleIdentifierFilterSpan }, { DeviceIdentifierFilterSpan }, { BiometricContextFilterSpan }, { PassportNumberFilterSpan }, { AgeFilterSpan },
            // REMOVED FILTERS:
            // - NPIFilterSpan: Provider identifier, not patient PHI
            // - DEAFilterSpan: Provider identifier, not patient PHI
            // - UniqueIdentifierFilterSpan: Gym/airline/loyalty - not medical PHI
            ] = await Promise.all([
                Promise.resolve().then(() => __importStar(require("./EmailFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./PhoneFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./SSNFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./DateFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./URLFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./IPAddressFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./CreditCardFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./ZipCodeFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./AddressFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./MRNFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./AccountNumberFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./LicenseNumberFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./HealthPlanNumberFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./TitledNameFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./FamilyNameFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./FormattedNameFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./SmartNameFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./FaxNumberFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./VehicleIdentifierFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./DeviceIdentifierFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./BiometricContextFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./PassportNumberFilterSpan"))),
                Promise.resolve().then(() => __importStar(require("./AgeFilterSpan"))),
            ]);
            // Register all Span-based filters
            this.spanFilters = [
                new EmailFilterSpan(),
                new PhoneFilterSpan(),
                new SSNFilterSpan(),
                new DateFilterSpan(),
                new URLFilterSpan(),
                new IPAddressFilterSpan(),
                new CreditCardFilterSpan(),
                new ZipCodeFilterSpan(),
                new AddressFilterSpan(),
                new MRNFilterSpan(),
                new AccountNumberFilterSpan(),
                new LicenseNumberFilterSpan(),
                new HealthPlanNumberFilterSpan(),
                new TitledNameFilterSpan(),
                new FamilyNameFilterSpan(),
                new FormattedNameFilterSpan(),
                new SmartNameFilterSpan(),
                new FaxNumberFilterSpan(),
                new VehicleIdentifierFilterSpan(),
                new DeviceIdentifierFilterSpan(),
                new BiometricContextFilterSpan(),
                new PassportNumberFilterSpan(),
                new AgeFilterSpan(),
            ];
            RadiologyLogger_1.RadiologyLogger.success("REDACTION", `Parallel Span-based redaction ready: ${this.spanFilters.length} filters loaded`);
            this.isInitialized = true;
        }
        catch (error) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", "Fatal error during initialization", error);
            throw error;
        }
    }
    /**
     * Get all Span-based filters for parallel execution
     */
    static getAllSpanFilters() {
        return this.spanFilters;
    }
    /**
     * Check if initialized
     */
    static isReady() {
        return this.isInitialized;
    }
}
exports.FilterRegistry = FilterRegistry;
//# sourceMappingURL=FilterRegistry.js.map