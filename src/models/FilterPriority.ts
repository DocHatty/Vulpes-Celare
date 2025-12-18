/**
 * Shared priority/specificity rankings for filters and spans.
 *
 * - `FilterPriority` is used by `SpanBasedFilter.getPriority()` implementations
 *   for overlap resolution (higher wins).
 * - `TYPE_SPECIFICITY` is used by span disambiguation/scoring (higher wins).
 *
 * Keeping these rankings in one module prevents drift between subsystems.
 */

/**
 * Priority levels for common filter types (SpanBasedFilter.getType()).
 * Higher priority wins when spans overlap.
 */
export const FilterPriority = {
  // Highest priority - uniquely identifying
  SSN: 10,
  CREDITCARD: 10,

  // Medical identifiers
  MRN: 9,
  DEVICE: 9,

  // Financial and technical
  ACCOUNT: 8,
  LICENSE: 8,
  HEALTHPLAN: 8,

  // Temporal
  DATE: 8,

  // Contact info
  PHONE: 7,
  FAX: 7,
  EMAIL: 7,

  // Personal identifiers
  NAME: 6,

  // Location
  ADDRESS: 5,
  ZIPCODE: 4,

  // Context-dependent identifiers
  VEHICLE: 5,
  BIOMETRIC: 5,

  // Technical
  URL: 3,
  IP: 3,

  // Least priority
  OCCUPATION: 2,
} as Readonly<Record<string, number>>;

/**
 * Type specificity ranking for span disambiguation.
 * Higher values = more specific/trustworthy.
 */
export const TYPE_SPECIFICITY = {
  // High specificity - structured patterns
  SSN: 100,
  MRN: 95,
  CREDIT_CARD: 90,
  ACCOUNT: 85,
  LICENSE: 85,
  PASSPORT: 85,
  IBAN: 85,
  HEALTH_PLAN: 85,
  EMAIL: 80,
  PHONE: 75,
  FAX: 75,
  IP: 75,
  URL: 75,
  MAC_ADDRESS: 75,
  BITCOIN: 75,
  VEHICLE: 70,
  DEVICE: 70,
  BIOMETRIC: 70,
  // Medium specificity
  DATE: 60,
  ZIPCODE: 55,
  ADDRESS: 50,
  CITY: 45,
  STATE: 45,
  COUNTY: 45,
  // Lower specificity - context-dependent
  AGE: 40,
  RELATIVE_DATE: 40,
  PROVIDER_NAME: 36,
  NAME: 35,
  OCCUPATION: 30,
  CUSTOM: 20,
} as Readonly<Record<string, number>>;
