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

import { RadiologyLogger } from "../utils/RadiologyLogger";
import { ConfigLoader } from "../utils/ConfigLoader";
import type { BaseFilter } from "../RedactionEngine";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

/**
 * Filter Registry - manages all Span-based redaction filters for parallel execution
 */
export class FilterRegistry {
  private static spanFilters: SpanBasedFilter[] = [];
  private static isInitialized: boolean = false;

  /**
   * Initialize all Span-based filters for parallel execution
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    RadiologyLogger.loading(
      "REDACTION",
      "Loading Span-based filters for parallel execution...",
    );

    try {
      // Load all Span-based filters
      const [
        { EmailFilterSpan },
        { PhoneFilterSpan },
        { SSNFilterSpan },
        { DateFilterSpan },
        { URLFilterSpan },
        { IPAddressFilterSpan },
        { CreditCardFilterSpan },
        { ZipCodeFilterSpan },
        { AddressFilterSpan },
        { MRNFilterSpan },
        { AccountNumberFilterSpan },
        { NPIFilterSpan },
        { DEAFilterSpan },
        { LicenseNumberFilterSpan },
        { HealthPlanNumberFilterSpan },
        { TitledNameFilterSpan },
        { FamilyNameFilterSpan },
        { FormattedNameFilterSpan },
        { SmartNameFilterSpan },
        { FaxNumberFilterSpan },
        { VehicleIdentifierFilterSpan },
        { DeviceIdentifierFilterSpan },
        { BiometricContextFilterSpan },
        { PassportNumberFilterSpan },
        { UniqueIdentifierFilterSpan },
        { AgeFilterSpan },
        // Context-aware filters DISABLED - causing too many false positives
        // The ContextualConfidenceModifier provides the WIN-WIN without new pattern matches
        // { ContextAwareNameFilter },
        // { ContextAwareAddressFilter },
        // { RelativeDateFilterSpan },
        // HospitalFilterSpan removed - hospital names are NOT patient PHI under HIPAA Safe Harbor
        // Hospital names should be PROTECTED (whitelisted), not redacted
        // See SmartNameFilterSpan which uses HospitalDictionary for whitelisting
      ] = await Promise.all([
        import("./EmailFilterSpan"),
        import("./PhoneFilterSpan"),
        import("./SSNFilterSpan"),
        import("./DateFilterSpan"),
        import("./URLFilterSpan"),
        import("./IPAddressFilterSpan"),
        import("./CreditCardFilterSpan"),
        import("./ZipCodeFilterSpan"),
        import("./AddressFilterSpan"),
        import("./MRNFilterSpan"),
        import("./AccountNumberFilterSpan"),
        import("./NPIFilterSpan"),
        import("./DEAFilterSpan"),
        import("./LicenseNumberFilterSpan"),
        import("./HealthPlanNumberFilterSpan"),
        import("./TitledNameFilterSpan"),
        import("./FamilyNameFilterSpan"),
        import("./FormattedNameFilterSpan"),
        import("./SmartNameFilterSpan"),
        import("./FaxNumberFilterSpan"),
        import("./VehicleIdentifierFilterSpan"),
        import("./DeviceIdentifierFilterSpan"),
        import("./BiometricContextFilterSpan"),
        import("./PassportNumberFilterSpan"),
        import("./UniqueIdentifierFilterSpan"),
        import("./AgeFilterSpan"),
        // Context-aware filter imports DISABLED - causing too many false positives
        // import("./ContextAwareNameFilter"),
        // import("./ContextAwareAddressFilter"),
        // import("./RelativeDateFilterSpan"),
        // HospitalFilterSpan import removed - hospitals are whitelisted, not redacted
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
        new NPIFilterSpan(),
        new DEAFilterSpan(),
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
        new UniqueIdentifierFilterSpan(),
        new AgeFilterSpan(),
        // Context-aware filters DISABLED - causing too many false positives
        // new ContextAwareNameFilter(),
        // new ContextAwareAddressFilter(),
        // new RelativeDateFilterSpan(),
        // HospitalFilterSpan removed from pipeline - hospitals are NOT PHI
      ];

      RadiologyLogger.success(
        "REDACTION",
        `Parallel Span-based redaction ready: ${this.spanFilters.length} filters loaded (includes FAX, VEHICLE, DEVICE, BIOMETRIC, PASSPORT, UNIQUE_ID, AGE)`,
      );

      this.isInitialized = true;
    } catch (error) {
      RadiologyLogger.error(
        "REDACTION",
        "Fatal error during initialization",
        error,
      );
      throw error;
    }
  }

  /**
   * Get all Span-based filters for parallel execution
   */
  static getAllSpanFilters(): SpanBasedFilter[] {
    return this.spanFilters;
  }

  /**
   * Check if initialized
   */
  static isReady(): boolean {
    return this.isInitialized;
  }
}
