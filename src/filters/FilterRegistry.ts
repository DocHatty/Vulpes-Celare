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
import { SpanBasedFilter } from "../core/SpanBasedFilter";

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
        { LicenseNumberFilterSpan },
        { HealthPlanNumberFilterSpan },
        { TitledNameFilterSpan },
        { FamilyNameFilterSpan },
        { FormattedNameFilterSpan },
        { SmartNameFilterSpan },
        { GlinerNameFilter },
        { FaxNumberFilterSpan },
        { VehicleIdentifierFilterSpan },
        { DeviceIdentifierFilterSpan },
        { BiometricContextFilterSpan },
        { PassportNumberFilterSpan },
        { AgeFilterSpan },

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
        import("./LicenseNumberFilterSpan"),
        import("./HealthPlanNumberFilterSpan"),
        import("./TitledNameFilterSpan"),
        import("./FamilyNameFilterSpan"),
        import("./FormattedNameFilterSpan"),
        import("./SmartNameFilterSpan"),
        import("./GlinerNameFilter"),
        import("./FaxNumberFilterSpan"),
        import("./VehicleIdentifierFilterSpan"),
        import("./DeviceIdentifierFilterSpan"),
        import("./BiometricContextFilterSpan"),
        import("./PassportNumberFilterSpan"),
        import("./AgeFilterSpan"),
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
        new GlinerNameFilter(),
        new FaxNumberFilterSpan(),
        new VehicleIdentifierFilterSpan(),
        new DeviceIdentifierFilterSpan(),
        new BiometricContextFilterSpan(),
        new PassportNumberFilterSpan(),
        new AgeFilterSpan(),
      ];

      RadiologyLogger.success(
        "REDACTION",
        `Parallel Span-based redaction ready: ${this.spanFilters.length} filters loaded`,
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
