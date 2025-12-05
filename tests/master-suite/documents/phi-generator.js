/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - COMPREHENSIVE PHI DATA GENERATOR                            ║
 * ║  Generate complete PHI datasets for document templates                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This generator creates COMPLETE PHI datasets including:
 * - All 18 HIPAA Safe Harbor identifiers
 * - Multiple instances of each PHI type per document
 * - Realistic relationships between PHI elements
 * - Ground truth tracking for precise evaluation
 */

const {
  random,
  randomInt,
  generatePatientName,
  generateProviderName,
  generateSSN,
  generateMRN,
  generatePhone,
  generateFax,
  generateEmail,
  generateDate,
  generateDOB,
  generateAddress,
  generateNPI,
  generateDEA,
  generateIP,
  generateURL,
  generateCreditCard,
  generateVIN,
  generateLicensePlate,
  generateAge,
  generateAccountNumber,
  generateHealthPlanID,
} = require("../generators/phi");
const { chance } = require("../generators/seeded-random");

const { applyErrors } = require("../generators/errors");
const {
  DIAGNOSES,
  PROCEDURES,
  MEDICATIONS,
  HOSPITALS,
  SPECIALTIES,
} = require("../data/medical");

/**
 * Generate a complete PHI dataset for document templates
 * Returns both the formatted values (possibly with errors) and the ground truth
 *
 * @param {string} errorLevel - "none", "low", "medium", "high", "extreme"
 * @returns {object} - Complete PHI dataset with ground truth tracking
 */
function generateCompletePHIDataset(errorLevel = "medium") {
  // ========================================
  // PATIENT IDENTITY
  // ========================================
  const patientNameData = generatePatientName("random", errorLevel);
  const patient2Data = generatePatientName("first_last", errorLevel); // Emergency contact
  const patient3Data = generatePatientName("first_last", errorLevel); // Second emergency contact

  // Age with HIPAA consideration
  const ageData = generateAge();

  // ========================================
  // GOVERNMENT IDENTIFIERS
  // ========================================
  const ssn = generateSSN(true, errorLevel);
  const guarantorSsn = generateSSN(true, errorLevel);

  // ========================================
  // DATES
  // ========================================
  const dob = generateDOB(true, errorLevel);
  const admitDate = generateDate(2023, 2024, true, errorLevel);
  const surgeryDate1 = generateDate(2020, 2023, true, errorLevel);
  const surgeryDate2 = generateDate(2018, 2022, true, errorLevel);

  // ========================================
  // MEDICAL RECORD NUMBERS
  // ========================================
  const mrn = generateMRN(true, errorLevel);
  const accountNumber = generateAccountNumber();

  // ========================================
  // ADDRESSES
  // ========================================
  const addressData = generateAddress(true, errorLevel);
  const emergencyAddressData = generateAddress(true, errorLevel);

  // ========================================
  // PHONE NUMBERS (multiple types)
  // ========================================
  const phone = generatePhone(true, errorLevel);
  const phone2 = generatePhone(true, errorLevel);
  const workPhone = generatePhone(true, errorLevel);
  const emergencyPhone = generatePhone(true, errorLevel);
  const emergencyPhone2 = generatePhone(true, errorLevel);
  const emergencyPhone3 = generatePhone(true, errorLevel);
  const pharmacyPhone = generatePhone(true, errorLevel);
  const hospitalPhone = generatePhone(true, errorLevel);
  const insurancePhone = generatePhone(true, errorLevel);

  // ========================================
  // FAX NUMBERS
  // ========================================
  const fax = generateFax(true, errorLevel);
  const hospitalFax = generateFax(true, errorLevel);
  const pcpFax = generateFax(true, errorLevel);

  // ========================================
  // EMAIL ADDRESSES
  // ========================================
  const email = generateEmail(patientNameData.first, patientNameData.last);
  const email2 = chance(0.5)
    ? generateEmail(patientNameData.first, patientNameData.last)
    : null;

  // ========================================
  // PROVIDER NAMES (NOT PHI - should NOT be redacted)
  // ========================================
  const attendingNameData = generateProviderName("titled", "none");
  const pcpNameData = generateProviderName("titled", "none");
  const surgeonNameData = generateProviderName("titled_suffix", "none");
  const assistantNameData = generateProviderName("titled", "none");
  const anesthesiologistNameData = generateProviderName("titled", "none");
  const pathologistNameData = generateProviderName("titled_suffix", "none");
  const referringNameData = generateProviderName("titled", "none");
  const scrubNurseData = generateProviderName("first_last_suffix", "none");
  const circNurseData = generateProviderName("first_last_suffix", "none");
  const registrarData = generateProviderName("first_last_suffix", "none");

  // ========================================
  // PROVIDER IDENTIFIERS (PHI if patient-specific context)
  // ========================================
  const attendingNpi = generateNPI();
  const pcpNpi = generateNPI();
  const surgeonNpi = generateNPI();
  const surgeonDea = generateDEA();
  const pathologistNpi = generateNPI();
  const referringNpi = generateNPI();
  const hospitalNpi = generateNPI();
  const pharmacyNpi = generateNPI();

  // ========================================
  // INSURANCE IDENTIFIERS
  // ========================================
  const healthPlanId = generateHealthPlanID();
  const groupNumber = `GRP-${randomInt(10000, 99999)}`;
  const secondaryId = chance(0.3) ? generateHealthPlanID() : null;
  const secondaryGroup = secondaryId ? `GRP-${randomInt(10000, 99999)}` : null;

  // ========================================
  // FINANCIAL IDENTIFIERS
  // ========================================
  const creditCard = generateCreditCard();
  const ccExpiry = `${String(randomInt(1, 12)).padStart(2, "0")}/${randomInt(24, 29)}`;
  const providerTaxId = `${randomInt(10, 99)}-${randomInt(1000000, 9999999)}`;

  // ========================================
  // TECHNICAL IDENTIFIERS
  // ========================================
  const ipAddress = generateIP();
  const portalUrl = generateURL();
  const deviceId = `DEV-${randomInt(100000, 999999)}-${random(["IOS", "AND", "WEB"])}`;

  // ========================================
  // VEHICLE IDENTIFIERS
  // ========================================
  const vin = generateVIN();
  const licensePlate = generateLicensePlate();

  // ========================================
  // MEDICAL CONTENT (NOT PHI)
  // ========================================
  const hospital = random(HOSPITALS);
  const specialty = random(SPECIALTIES);
  const diagnosis1 = random(DIAGNOSES);
  const diagnosis2 = random(DIAGNOSES.filter((d) => d !== diagnosis1));
  const diagnosis3 = random(
    DIAGNOSES.filter((d) => d !== diagnosis1 && d !== diagnosis2),
  );
  const procedure1 = random(PROCEDURES);
  const medication1 = random(MEDICATIONS);
  const medication2 = random(MEDICATIONS.filter((m) => m !== medication1));
  const medication3 = random(
    MEDICATIONS.filter((m) => m !== medication1 && m !== medication2),
  );
  const imagingType = random([
    "Chest X-Ray",
    "CT Scan of Abdomen/Pelvis",
    "MRI of Brain",
    "CT Angiography",
    "Echocardiogram",
  ]);

  // ========================================
  // INSURANCE COMPANY INFO (NOT PHI)
  // ========================================
  const insuranceNames = [
    "Blue Cross Blue Shield",
    "Aetna",
    "United Healthcare",
    "Cigna",
    "Humana",
    "Kaiser Permanente",
    "Medicare",
    "Medicaid",
  ];
  const insuranceName = random(insuranceNames);
  const secondaryInsurance = chance(0.3)
    ? random(insuranceNames.filter((i) => i !== insuranceName))
    : null;

  // ========================================
  // COMPILE THE DATASET
  // ========================================
  const dataset = {
    // Patient Identity
    patientName: patientNameData.formatted,
    preferredName: chance(0.3) ? patientNameData.first : null,
    dob,
    age: ageData.age,
    ageNeedsRedaction: ageData.needsRedaction,
    sex: random(["Male", "Female"]),
    ssn,
    guarantorSsn,

    // Medical Identifiers
    mrn,
    accountNumber,

    // Addresses
    address: addressData.full,
    streetAddress: addressData.street,
    city: addressData.city,
    state: addressData.state,
    zip: addressData.zip,
    unit: chance(0.3) ? `Apt ${randomInt(1, 999)}` : null,

    // Contact Info
    phone,
    phone2,
    workPhone,
    fax,
    email,
    email2,

    // Emergency Contacts
    emergencyContact: patient2Data.formatted,
    emergencyPhone,
    emergencyPhone2,
    emergencyAddress: emergencyAddressData.full,
    emergencyContact2: patient3Data.formatted,
    emergencyPhone3,

    // Insurance
    insuranceName,
    healthPlanId,
    groupNumber,
    insurancePhone,
    authPhone: insurancePhone,
    secondaryInsurance,
    secondaryId,
    secondaryGroup,
    policyHolderName: chance(0.2)
      ? generatePatientName("first_last", errorLevel).formatted
      : null,
    policyHolderDob: chance(0.2) ? generateDOB(false) : null,
    insuranceCity: random([
      "Atlanta",
      "Chicago",
      "Dallas",
      "Phoenix",
      "Indianapolis",
    ]),
    insuranceState: random(["GA", "IL", "TX", "AZ", "IN"]),
    insuranceZip: String(randomInt(10000, 99999)),

    // Billing
    creditCard,
    ccExpiry,
    ccName: chance(0.5) ? patientNameData.clean : null,
    ccZip: addressData.zip,
    guarantorName: chance(0.2)
      ? generatePatientName("first_last", "none").formatted
      : null,
    guarantorPhone: chance(0.2) ? generatePhone(false) : null,

    // Portal / Technical
    portalUrl,
    portalUsername: email,
    ipAddress,
    deviceId,

    // Vehicle
    vin,
    licensePlate,

    // Providers (NOT PHI)
    attendingName: attendingNameData.formatted,
    attendingNpi,
    pcpName: pcpNameData.formatted,
    pcpNpi,
    pcpPhone: generatePhone(false),
    pcpFax,
    pcpPractice: random([
      "Primary Care Associates",
      "Family Medicine Group",
      "Internal Medicine Clinic",
    ]),
    pcpAddress: generateAddress(false).full,
    surgeonName: surgeonNameData.formatted,
    surgeonNpi,
    surgeonDea,
    assistantName: assistantNameData.formatted,
    anesthesiologistName: anesthesiologistNameData.formatted,
    pathologistName: pathologistNameData.formatted,
    pathologistNpi,
    scrubNurseName: scrubNurseData.formatted,
    circNurseName: circNurseData.formatted,
    registrarName: registrarData.formatted,
    employeeId: `EMP-${randomInt(10000, 99999)}`,
    referringName: referringNameData.formatted,
    referringNpi,
    referringPhone: generatePhone(false),
    referringPractice: random([
      "Specialty Associates",
      "Medical Group",
      "Health Partners",
    ]),
    referringAddress: generateAddress(false).full,

    // Hospital Info (NOT PHI)
    hospital,
    hospitalPhone,
    hospitalFax,
    hospitalNpi,
    providerTaxId,
    pharmacyPhone,
    pharmacyAddress: generateAddress(false).full,
    pharmacyNpi,

    // Medical Content (NOT PHI)
    specialty,
    diagnosis1,
    diagnosis2,
    diagnosis3,
    procedure1,
    medication1,
    medication2,
    medication3,
    imagingType,

    // Dates
    admitDate,
    surgeryDate1,
    surgeryDate2,
    serviceDate: admitDate,

    // ========================================
    // GROUND TRUTH - PHI items that MUST be redacted
    // ========================================
    _groundTruthPHI: [
      // Patient names
      {
        type: "NAME",
        value: patientNameData.formatted,
        clean: patientNameData.clean,
        source: "patient",
      },
      {
        type: "NAME",
        value: patient2Data.formatted,
        clean: patient2Data.clean,
        source: "emergency_contact_1",
      },
      {
        type: "NAME",
        value: patient3Data.formatted,
        clean: patient3Data.clean,
        source: "emergency_contact_2",
      },

      // SSN
      { type: "SSN", value: ssn, source: "patient_ssn" },
      ...(guarantorSsn !== ssn
        ? [{ type: "SSN", value: guarantorSsn, source: "guarantor_ssn" }]
        : []),

      // Dates
      { type: "DATE", value: dob, source: "dob" },
      { type: "DATE", value: admitDate, source: "admit_date" },
      { type: "DATE", value: surgeryDate1, source: "surgery_date_1" },
      { type: "DATE", value: surgeryDate2, source: "surgery_date_2" },

      // Age 90+
      ...(ageData.needsRedaction
        ? [{ type: "AGE_90_PLUS", value: String(ageData.age), source: "age" }]
        : []),

      // MRN/Account
      { type: "MRN", value: mrn, source: "mrn" },
      {
        type: "ACCOUNT_NUMBER",
        value: accountNumber,
        source: "account_number",
      },

      // Address components
      { type: "ADDRESS", value: addressData.street, source: "street_address" },
      { type: "ZIPCODE", value: addressData.zip, source: "zip" },

      // Phone numbers
      { type: "PHONE", value: phone, source: "phone" },
      { type: "PHONE", value: phone2, source: "phone2" },
      { type: "PHONE", value: workPhone, source: "work_phone" },
      { type: "PHONE", value: emergencyPhone, source: "emergency_phone" },
      { type: "PHONE", value: emergencyPhone2, source: "emergency_phone2" },
      { type: "PHONE", value: emergencyPhone3, source: "emergency_phone3" },

      // Fax
      { type: "FAX", value: fax, source: "fax" },

      // Email
      { type: "EMAIL", value: email, source: "email" },
      ...(email2 ? [{ type: "EMAIL", value: email2, source: "email2" }] : []),

      // Insurance IDs
      { type: "HEALTH_PLAN_ID", value: healthPlanId, source: "health_plan_id" },
      ...(secondaryId
        ? [
            {
              type: "HEALTH_PLAN_ID",
              value: secondaryId,
              source: "secondary_health_plan_id",
            },
          ]
        : []),

      // Financial
      { type: "CREDIT_CARD", value: creditCard, source: "credit_card" },

      // Technical
      { type: "IP", value: ipAddress, source: "ip_address" },
      { type: "URL", value: portalUrl, source: "portal_url" },

      // Vehicle
      { type: "VIN", value: vin, source: "vin" },
      { type: "LICENSE_PLATE", value: licensePlate, source: "license_plate" },

      // NPIs in patient context
      { type: "NPI", value: attendingNpi, source: "attending_npi" },
      { type: "NPI", value: pcpNpi, source: "pcp_npi" },
      { type: "NPI", value: surgeonNpi, source: "surgeon_npi" },
      { type: "NPI", value: pathologistNpi, source: "pathologist_npi" },

      // DEA
      { type: "DEA", value: surgeonDea, source: "surgeon_dea" },
    ],

    // ========================================
    // GROUND TRUTH - Items that should NOT be redacted
    // ========================================
    _groundTruthNonPHI: [
      // Hospital names
      { type: "HOSPITAL", value: hospital, source: "hospital_name" },

      // Provider names (in professional capacity)
      {
        type: "PROVIDER_NAME",
        value: attendingNameData.formatted,
        source: "attending_name",
      },
      {
        type: "PROVIDER_NAME",
        value: pcpNameData.formatted,
        source: "pcp_name",
      },
      {
        type: "PROVIDER_NAME",
        value: surgeonNameData.formatted,
        source: "surgeon_name",
      },
      {
        type: "PROVIDER_NAME",
        value: pathologistNameData.formatted,
        source: "pathologist_name",
      },

      // Medical terms
      { type: "DIAGNOSIS", value: diagnosis1, source: "diagnosis1" },
      { type: "DIAGNOSIS", value: diagnosis2, source: "diagnosis2" },
      { type: "DIAGNOSIS", value: diagnosis3, source: "diagnosis3" },
      { type: "PROCEDURE", value: procedure1, source: "procedure" },
      { type: "MEDICATION", value: medication1, source: "medication1" },
      { type: "MEDICATION", value: medication2, source: "medication2" },
      { type: "MEDICATION", value: medication3, source: "medication3" },

      // Age under 90
      ...(!ageData.needsRedaction
        ? [
            {
              type: "AGE_UNDER_90",
              value: String(ageData.age),
              source: "age_under_90",
            },
          ]
        : []),

      // Insurance company name
      {
        type: "INSURANCE_COMPANY",
        value: insuranceName,
        source: "insurance_name",
      },
    ],

    // Error level for tracking
    _errorLevel: errorLevel,
  };

  return dataset;
}

module.exports = {
  generateCompletePHIDataset,
};
