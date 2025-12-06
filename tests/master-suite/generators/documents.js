/**
 * MASTER TEST SUITE - Document Generators
 * Generate realistic medical documents with proper PHI expectations
 *
 * @deprecated This file is LEGACY CODE. Use `documents/templates.js` instead.
 *             The templates.js module provides the same functionality with:
 *             - Consistent PHI type naming (aligned with PHI_TYPES constants)
 *             - Better integration with the assessment system
 *             - Unified API via generateCompletePHIDataset()
 *
 *             Migration: Replace require('./generators/documents') with
 *                        require('./documents/templates')
 *
 * HIPAA COMPLIANCE NOTES:
 * - Patient names, SSN, MRN, DOB, addresses, phones, emails = PHI (MUST redact)
 * - Ages 90+ = PHI (MUST redact), Ages under 90 = NOT PHI
 * - Hospital names, provider names, diagnoses, medications = NOT PHI
 */

const {
  DIAGNOSES,
  PROCEDURES,
  MEDICATIONS,
  HOSPITALS,
  SPECIALTIES,
} = require("../data/medical");
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
} = require("./phi");
const { chance } = require("./seeded-random");

// ============================================================================
// DOCUMENT TYPE 1: Radiology Report (Imaging)
// ============================================================================
function generateRadiologyReport(id, errorLevel) {
  const patient = generatePatientName("random", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const examDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const accession = `ACC-${randomInt(2023, 2024)}-${randomInt(100000, 999999)}`;

  const hospital = random(HOSPITALS);
  const procedure = random(
    PROCEDURES.filter((p) => /CT|MRI|X-Ray|Ultrasound|PET|Mammo|DEXA/.test(p)),
  );
  const diagnosis = random(DIAGNOSES);
  const providerName = generateProviderName("titled").formatted;
  const radiologistName = generateProviderName("titled_suffix").formatted;

  const content = `${hospital}
RADIOLOGY REPORT

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
ACCESSION #: ${accession}
EXAM DATE: ${examDate}
PATIENT PHONE: ${phone}

EXAMINATION: ${procedure}
ORDERING PHYSICIAN: ${providerName}

CLINICAL INDICATION:
${diagnosis} - ${random(["evaluate", "rule out", "follow-up", "staging", "surveillance"])}

TECHNIQUE:
${procedure} performed per standard protocol. ${chance(0.5) ? "IV contrast administered." : "Without contrast."}

COMPARISON:
${chance(0.6) ? `Prior study dated ${generateDate(2022, 2023, false)}.` : "No prior studies available."}

FINDINGS:
${random([
  "No acute cardiopulmonary abnormality identified. Heart size is normal.",
  "Findings consistent with known " + diagnosis + ". No new abnormalities.",
  "Mild degenerative changes noted. No acute osseous abnormality.",
  "Stable appearance compared to prior examination. No interval change.",
  "Small pleural effusion noted. Clinical correlation recommended.",
])}

IMPRESSION:
1. ${random(["Normal study", "No acute findings", "Stable examination", "Findings as above"])}
${chance(0.5) ? "2. " + random(["Recommend clinical correlation", "Follow-up as clinically indicated", "No further imaging needed"]) : ""}

Electronically signed by: ${radiologistName}
Date/Time: ${examDate}`;

  return {
    id,
    type: "Radiology Report",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: examDate },
      { type: "MRN", value: mrn },
      { type: "MRN", value: accession },
      { type: "PHONE", value: phone },
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "PROCEDURE", value: procedure },
      { type: "DIAGNOSIS", value: diagnosis },
    ],
  };
}

// ============================================================================
// DOCUMENT TYPE 2: Laboratory Report
// ============================================================================
function generateLabReport(id, errorLevel) {
  const patient = generatePatientName("last_first_middle", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const collDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const npi = generateNPI();
  const phone = generatePhone(true, errorLevel);
  const ssn = generateSSN(true, errorLevel);
  const accession = `LAB-${randomInt(100000, 999999)}`;

  const hospital = random(HOSPITALS);
  const providerName = generateProviderName("titled").formatted;
  const labDirectorName = generateProviderName("titled_suffix").formatted;

  const content = `${hospital}
CLINICAL LABORATORY REPORT

PATIENT IDENTIFICATION
Name: ${patient.formatted}
MRN: ${mrn}
SSN: ${ssn}
Date of Birth: ${dob}
Phone: ${phone}

SPECIMEN DETAILS
Accession #: ${accession}
Collection Date: ${collDate}
Specimen Type: ${random(["Serum", "Whole Blood", "Plasma", "Urine", "CSF"])}
Fasting Status: ${random(["Yes", "No", "Unknown"])}

ORDERING PROVIDER
${providerName}
NPI: ${npi}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE BLOOD COUNT (CBC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test                 Result        Reference Range     Flag
WBC                  ${(random() * 10 + 4).toFixed(1)}          4.5-11.0 K/uL
RBC                  ${(random() * 2 + 4).toFixed(2)}          4.0-5.5 M/uL
Hemoglobin           ${(random() * 5 + 12).toFixed(1)}          12.0-17.5 g/dL
Hematocrit           ${(random() * 15 + 36).toFixed(1)}          36-50 %
Platelets            ${randomInt(150, 400)}           150-400 K/uL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPREHENSIVE METABOLIC PANEL (CMP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Glucose              ${randomInt(70, 200)}           70-100 mg/dL        ${randomInt(70, 200) > 100 ? "H" : ""}
BUN                  ${randomInt(7, 30)}            7-20 mg/dL
Creatinine           ${(random() * 1.5 + 0.6).toFixed(2)}          0.7-1.3 mg/dL
Sodium               ${randomInt(135, 148)}          136-145 mEq/L
Potassium            ${(random() * 2 + 3.5).toFixed(1)}          3.5-5.0 mEq/L
eGFR                 ${randomInt(60, 120)}           >60 mL/min/1.73m2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Laboratory Director: ${labDirectorName}
Report Generated: ${collDate}`;

  return {
    id,
    type: "Lab Report",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: collDate },
      { type: "MRN", value: mrn },
      { type: "MRN", value: accession },
      { type: "NPI", value: npi },
      { type: "PHONE", value: phone },
      { type: "SSN", value: ssn },
    ],
    shouldNotRedact: [{ type: "HOSPITAL", value: hospital }],
  };
}

// ============================================================================
// DOCUMENT TYPE 3: Progress Note (Office Visit)
// ============================================================================
function generateProgressNote(id, errorLevel) {
  const patient = generatePatientName("first_middle_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const visitDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const address = generateAddress(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const ageData = generateAge();

  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const medication = random(MEDICATIONS);
  const providerName = generateProviderName("titled").formatted;

  const content = `${hospital}
OUTPATIENT PROGRESS NOTE

═══════════════════════════════════════════════════════════════
PATIENT INFORMATION
═══════════════════════════════════════════════════════════════
Name: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Age: ${ageData.age} years
Date of Service: ${visitDate}
Provider: ${providerName}

Contact Information:
Address: ${address.full}
Phone: ${phone}
Email: ${email}

═══════════════════════════════════════════════════════════════
VISIT DETAILS
═══════════════════════════════════════════════════════════════

CHIEF COMPLAINT:
${random(["Follow-up for chronic conditions", "Medication refill", "New symptom evaluation", "Annual wellness visit", "Post-procedure follow-up"])}

HISTORY OF PRESENT ILLNESS:
Patient is a ${ageData.age}-year-old ${random(["male", "female"])} with history of ${diagnosis} presenting for ${random(["routine follow-up", "symptom management", "medication review"])}. Patient reports ${random(["symptoms well controlled", "occasional mild symptoms", "improvement since last visit", "no new concerns"])}.

CURRENT MEDICATIONS:
1. ${medication} ${randomInt(5, 100)}mg ${random(["daily", "twice daily", "as needed"])}
2. ${random(MEDICATIONS)} ${randomInt(5, 50)}mg ${random(["daily", "at bedtime"])}

REVIEW OF SYSTEMS:
Constitutional: ${random(["Negative", "Fatigue reported"])}
Cardiovascular: ${random(["Negative", "Occasional palpitations"])}
Respiratory: ${random(["Negative", "Mild dyspnea on exertion"])}
GI: ${random(["Negative", "Occasional heartburn"])}

PHYSICAL EXAMINATION:
Vitals: BP ${randomInt(100, 160)}/${randomInt(60, 100)}, HR ${randomInt(55, 100)}, Temp ${(random() * 2 + 97).toFixed(1)}°F, SpO2 ${randomInt(94, 100)}%
General: Well-appearing, no acute distress
${random(["HEENT: Normocephalic, atraumatic", "CV: Regular rate and rhythm", "Lungs: Clear bilaterally", "Abdomen: Soft, non-tender"])}

ASSESSMENT:
${diagnosis} - ${random(["stable", "improving", "well-controlled", "needs adjustment"])}

PLAN:
1. Continue ${medication}
2. ${random(["Labs ordered", "Imaging scheduled", "Referral placed", "Continue current regimen"])}
3. Return to clinic in ${randomInt(4, 12)} weeks

═══════════════════════════════════════════════════════════════
Electronically signed by ${providerName}
${visitDate}`;

  const expectedPHI = [
    {
      type: "NAME",
      value: patient.clean,
      actual: patient.formatted,
      hasErrors: patient.hasErrors,
    },
    { type: "DATE", value: dob },
    { type: "DATE", value: visitDate },
    { type: "MRN", value: mrn },
    { type: "ADDRESS", value: address.street },
    { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone },
    { type: "EMAIL", value: email },
  ];

  // Only add age if 90+ per HIPAA
  if (ageData.needsRedaction) {
    expectedPHI.push({ type: "AGE_90_PLUS", value: String(ageData.age) });
  }

  return {
    id,
    type: "Progress Note",
    errorLevel,
    content,
    expectedPHI,
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis },
      { type: "MEDICATION", value: medication },
      ...(ageData.needsRedaction
        ? []
        : [{ type: "AGE_UNDER_90", value: String(ageData.age) }]),
    ],
    ageInfo: ageData,
  };
}

// ============================================================================
// DOCUMENT TYPE 4: Emergency Department Note
// ============================================================================
function generateEmergencyNote(id, errorLevel) {
  const patient = generatePatientName("all_caps_last_first", errorLevel);
  const emergencyContact = generatePatientName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const arrivalDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = `ED-${randomInt(2023, 2024)}${randomInt(10000, 99999)}`;
  const ssn = generateSSN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const address = generateAddress(true, errorLevel);

  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const attendingName = generateProviderName("titled").formatted;
  const residentName = generateProviderName("titled").formatted;

  const content = `${hospital}
═══════════════════════════════════════════════════════════════
           EMERGENCY DEPARTMENT ENCOUNTER
═══════════════════════════════════════════════════════════════

PATIENT IDENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
SSN: ${ssn}
Address: ${address.full}
Phone: ${phone}

ARRIVAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date/Time: ${arrivalDate}
Mode: ${random(["Ambulance", "Walk-in", "Private vehicle", "Police transport"])}
Acuity Level: ${random(["1 - Resuscitation", "2 - Emergent", "3 - Urgent", "4 - Less Urgent", "5 - Non-urgent"])}

EMERGENCY CONTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${emergencyContact.formatted}
Relationship: ${random(["Spouse", "Parent", "Child", "Sibling", "Partner"])}

CARE TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Attending: ${attendingName}
Resident: ${residentName}

CHIEF COMPLAINT:
${random(["Chest pain", "Shortness of breath", "Abdominal pain", "Trauma", "Syncope", "Severe headache", "Altered mental status"])}

HISTORY OF PRESENT ILLNESS:
Patient is a ${randomInt(18, 90)}-year-old ${random(["male", "female"])} presenting with ${random(["acute onset", "sudden", "progressive", "worsening"])} symptoms starting ${random(["today", "yesterday", randomInt(2, 72) + " hours ago"])}.

TRIAGE VITAL SIGNS:
BP: ${randomInt(80, 200)}/${randomInt(40, 120)} mmHg
HR: ${randomInt(40, 150)} bpm
RR: ${randomInt(12, 30)} /min
Temp: ${(random() * 4 + 96).toFixed(1)}°F
SpO2: ${randomInt(85, 100)}% on ${random(["room air", "2L NC", "4L NC", "NRB"])}

PHYSICAL EXAMINATION:
General: ${random(["Alert, oriented x3", "Moderate distress", "Appears ill"])}
${random(["CV: Tachycardic, regular rhythm", "Lungs: Decreased breath sounds", "Abdomen: Tender to palpation", "Neuro: No focal deficits"])}

ED COURSE:
${random(["IV access obtained, labs drawn", "Imaging completed", "Specialty consulted", "Medications administered"])}

DIAGNOSIS:
${diagnosis}

DISPOSITION:
${random(["Admitted to Medicine", "Admitted to Surgery", "Admitted to ICU", "Discharged home", "Observation unit"])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Electronically signed: ${attendingName}
Date/Time: ${arrivalDate}`;

  return {
    id,
    type: "Emergency Note",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      {
        type: "NAME",
        value: emergencyContact.clean,
        actual: emergencyContact.formatted,
        hasErrors: emergencyContact.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: arrivalDate },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis },
    ],
  };
}

// ============================================================================
// DOCUMENT TYPE 5: Discharge Summary
// ============================================================================
function generateDischargeSummary(id, errorLevel) {
  const patient = generatePatientName("last_first", errorLevel);
  const familyContact = generatePatientName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const admitDate = generateDate(2023, 2024, true, errorLevel);
  const dischargeDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone1 = generatePhone(true, errorLevel);
  const phone2 = generatePhone(true, errorLevel);

  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const procedure = random(PROCEDURES);
  const medication1 = random(MEDICATIONS);
  const medication2 = random(MEDICATIONS);
  const attendingName = generateProviderName("titled").formatted;
  const pcpName = generateProviderName("titled").formatted;

  const content = `${hospital}
╔══════════════════════════════════════════════════════════════╗
║                    DISCHARGE SUMMARY                          ║
╚══════════════════════════════════════════════════════════════╝

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
ADMISSION DATE: ${admitDate}
DISCHARGE DATE: ${dischargeDate}
LENGTH OF STAY: ${randomInt(1, 14)} days

ATTENDING PHYSICIAN: ${attendingName}

══════════════════════════════════════════════════════════════
DIAGNOSES
══════════════════════════════════════════════════════════════
Principal Diagnosis:
  ${diagnosis}

Secondary Diagnoses:
  ${random(DIAGNOSES)}
  ${random(DIAGNOSES)}

══════════════════════════════════════════════════════════════
PROCEDURES PERFORMED
══════════════════════════════════════════════════════════════
  ${procedure}

══════════════════════════════════════════════════════════════
HOSPITAL COURSE
══════════════════════════════════════════════════════════════
Patient was admitted with ${random(["acute exacerbation of", "new diagnosis of", "complications from"])} ${diagnosis}. Hospital course was ${random(["uncomplicated", "complicated by minor issues", "notable for rapid improvement"])}. Patient responded well to ${random(["medical management", "surgical intervention", "combination therapy"])}.

══════════════════════════════════════════════════════════════
DISCHARGE MEDICATIONS
══════════════════════════════════════════════════════════════
1. ${medication1} ${randomInt(5, 100)}mg ${random(["daily", "twice daily", "three times daily"])}
2. ${medication2} ${randomInt(5, 50)}mg ${random(["daily", "at bedtime", "as needed"])}
3. ${random(MEDICATIONS)} ${randomInt(5, 200)}mg ${random(["daily", "twice daily"])}

══════════════════════════════════════════════════════════════
DISCHARGE INSTRUCTIONS
══════════════════════════════════════════════════════════════
Activity: ${random(["No restrictions", "Light activity only", "No heavy lifting > 10 lbs"])}
Diet: ${random(["Regular", "Low sodium", "Diabetic", "Cardiac"])}
Wound Care: ${random(["Keep incision clean and dry", "N/A", "Dressing changes daily"])}

══════════════════════════════════════════════════════════════
FOLLOW-UP
══════════════════════════════════════════════════════════════
Primary Care: ${pcpName}
Appointment: Within ${randomInt(3, 14)} days
Phone: ${phone1}

Emergency Contact: ${familyContact.formatted}
Phone: ${phone2}

══════════════════════════════════════════════════════════════
Dictated by: ${attendingName}
Date: ${dischargeDate}`;

  return {
    id,
    type: "Discharge Summary",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      {
        type: "NAME",
        value: familyContact.clean,
        actual: familyContact.formatted,
        hasErrors: familyContact.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: admitDate },
      { type: "DATE", value: dischargeDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis },
      { type: "PROCEDURE", value: procedure },
      { type: "MEDICATION", value: medication1 },
      { type: "MEDICATION", value: medication2 },
    ],
  };
}

// ============================================================================
// DOCUMENT TYPE 6: Operative Report
// ============================================================================
function generateOperativeReport(id, errorLevel) {
  const patient = generatePatientName("all_caps_last_first", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const surgeryDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);

  const hospital = random(HOSPITALS);
  const procedure = random(
    PROCEDURES.filter(
      (p) => !/CT|MRI|X-Ray|Ultrasound|PET|Echo|EEG|EMG/.test(p),
    ),
  );
  const diagnosis = random(DIAGNOSES);
  const surgeonName = generateProviderName("titled_suffix").formatted;
  const assistantName = generateProviderName("titled").formatted;
  const anesthesiologistName = generateProviderName("titled").formatted;

  const content = `${hospital}
┌──────────────────────────────────────────────────────────────┐
│                     OPERATIVE REPORT                          │
└──────────────────────────────────────────────────────────────┘

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
DATE OF SURGERY: ${surgeryDate}

SURGICAL TEAM:
  Surgeon: ${surgeonName}
  First Assistant: ${assistantName}
  Anesthesiologist: ${anesthesiologistName}

──────────────────────────────────────────────────────────────
PREOPERATIVE DIAGNOSIS:
  ${diagnosis}

POSTOPERATIVE DIAGNOSIS:
  ${diagnosis}

PROCEDURE PERFORMED:
  ${procedure}

ANESTHESIA:
  ${random(["General endotracheal", "Spinal anesthesia", "Regional block", "MAC sedation", "Combined spinal-epidural"])}

──────────────────────────────────────────────────────────────
INDICATIONS:
Patient with ${diagnosis} requiring surgical intervention. Risks, benefits, and alternatives discussed. Informed consent obtained.

PROCEDURE DESCRIPTION:
Patient was brought to the operating room and placed in ${random(["supine", "lateral decubitus", "prone", "lithotomy", "Trendelenburg"])} position. After induction of anesthesia, the surgical site was prepped and draped in standard sterile fashion.

${random([
  "A standard midline incision was made and dissection carried through subcutaneous tissues.",
  "Laparoscopic ports were placed under direct visualization.",
  "Standard surgical approach was utilized with adequate exposure obtained.",
  "Arthroscopic examination performed followed by therapeutic intervention.",
])}

${random([
  "The procedure was completed without complication.",
  "All surgical goals were achieved.",
  "Excellent hemostasis was obtained throughout.",
  "All anatomical structures were clearly identified and preserved.",
])}

Wound closure performed in layers. Sterile dressing applied.

──────────────────────────────────────────────────────────────
FINDINGS:
  ${random(["Findings consistent with preoperative diagnosis", "Pathology sent for analysis", "Anatomy as expected", "Successful intervention"])}

ESTIMATED BLOOD LOSS:
  ${randomInt(5, 500)} mL

SPECIMENS:
  ${random(["Sent to pathology", "None", "Tissue sample for culture", "Lymph nodes for analysis"])}

COMPLICATIONS:
  ${random(["None", "None - routine case", "None encountered"])}

DISPOSITION:
  ${random(["PACU in stable condition", "Recovery room", "ICU for monitoring", "Same day surgery unit"])}

──────────────────────────────────────────────────────────────
Electronically signed: ${surgeonName}
Date: ${surgeryDate}`;

  return {
    id,
    type: "Operative Report",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: surgeryDate },
      { type: "MRN", value: mrn },
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "PROCEDURE", value: procedure },
      { type: "DIAGNOSIS", value: diagnosis },
    ],
  };
}

// ============================================================================
// DOCUMENT TYPE 7: Prescription
// ============================================================================
function generatePrescription(id, errorLevel) {
  const patient = generatePatientName("last_first_middle", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const rxDate = generateDate(2023, 2024, true, errorLevel);
  const address = generateAddress(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const npi = generateNPI();
  const dea = generateDEA();
  const medication = random(MEDICATIONS);
  const prescriberName = generateProviderName("titled_suffix").formatted;

  const content = `
┌─────────────────────────────────────────────────────────────┐
│                      PRESCRIPTION                            │
├─────────────────────────────────────────────────────────────┤
│ Date: ${rxDate}                                              │
└─────────────────────────────────────────────────────────────┘

PATIENT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${patient.formatted}
DOB: ${dob}
Address: ${address.full}
Phone: ${phone}

PRESCRIBER INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${prescriberName}
NPI: ${npi}
DEA: ${dea}

═══════════════════════════════════════════════════════════════
                            Rx
═══════════════════════════════════════════════════════════════

${medication} ${randomInt(5, 100)}mg tablets

Sig: Take ${random(["one", "two", "one-half"])} tablet(s) by mouth
     ${random(["once daily", "twice daily", "three times daily", "every 8 hours", "at bedtime", "as needed for pain"])}

Disp: ${randomInt(30, 90)} tablets
Refills: ${randomInt(0, 11)} ${chance(0.5) ? "" : "(No refills)"}

${random(["", "Brand medically necessary", "Generic substitution permitted", "Dispense as written"])}
${chance(0.3) ? "WARNING: May cause drowsiness. Use caution when operating machinery." : ""}

═══════════════════════════════════════════════════════════════

Prescriber Signature: _________________________________

${prescriberName}
Date: ${rxDate}`;

  return {
    id,
    type: "Prescription",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: rxDate },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "NPI", value: npi },
      { type: "DEA", value: dea },
    ],
    shouldNotRedact: [{ type: "MEDICATION", value: medication }],
  };
}

// ============================================================================
// DOCUMENT TYPE 8: Consultation Note
// ============================================================================
function generateConsultationNote(id, errorLevel) {
  const patient = generatePatientName("all_caps_full", errorLevel);
  const familyContact = generatePatientName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const consultDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const ageData = generateAge();

  const hospital = random(HOSPITALS);
  const specialty = random(SPECIALTIES);
  const diagnosis = random(DIAGNOSES);
  const medication = random(MEDICATIONS);
  const requestingName = generateProviderName("titled").formatted;
  const consultingName = generateProviderName("titled_suffix").formatted;

  const content = `${hospital}
══════════════════════════════════════════════════════════════
               CONSULTATION NOTE - ${specialty.toUpperCase()}
══════════════════════════════════════════════════════════════

RE: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
DATE: ${consultDate}

Requesting Physician: ${requestingName}
Consulting Physician: ${consultingName}
Specialty: ${specialty}

──────────────────────────────────────────────────────────────
REASON FOR CONSULTATION:
${random(["Evaluation and management", "Pre-operative clearance", "Diagnostic workup", "Second opinion"])} for ${diagnosis}

──────────────────────────────────────────────────────────────
HISTORY OF PRESENT ILLNESS:
Thank you for this interesting consultation. ${patient.first} is a ${ageData.age}-year-old ${random(["male", "female"])} with a history of ${diagnosis} and ${random(DIAGNOSES)} referred for ${specialty.toLowerCase()} evaluation.

Patient reports ${random(["symptoms for several weeks", "gradual onset of symptoms", "recent worsening", "new concerns"])}. Current medications include ${medication} and ${random(MEDICATIONS)}.

Family Contact: ${familyContact.formatted}
Phone: ${phone}
Email: ${email}

──────────────────────────────────────────────────────────────
PHYSICAL EXAMINATION:
Vitals: Stable
General: ${random(["Well-appearing", "Comfortable", "No acute distress"])}
${random([
  "Cardiovascular: Regular rate and rhythm, no murmurs",
  "Respiratory: Clear to auscultation bilaterally",
  "Neurological: Alert, oriented, no focal deficits",
  "Musculoskeletal: No joint effusions, full range of motion",
])}

──────────────────────────────────────────────────────────────
ASSESSMENT:
${ageData.age}-year-old with ${diagnosis}. ${random(["Findings consistent with", "Differential includes", "Most likely represents"])} ${random(["primary diagnosis", "expected disease course", "treatable condition"])}.

──────────────────────────────────────────────────────────────
RECOMMENDATIONS:
1. ${random(["Initiate " + medication, "Adjust current medications", "Continue current regimen"])}
2. ${random(["Obtain " + random(PROCEDURES), "Labs as ordered", "Imaging as indicated"])}
3. Follow up in ${randomInt(2, 8)} weeks

Thank you for this consultation. Please contact us with any questions.

──────────────────────────────────────────────────────────────
${consultingName}
Board Certified ${specialty}
${consultDate}`;

  const expectedPHI = [
    {
      type: "NAME",
      value: patient.clean,
      actual: patient.formatted,
      hasErrors: patient.hasErrors,
    },
    {
      type: "NAME",
      value: familyContact.clean,
      actual: familyContact.formatted,
      hasErrors: familyContact.hasErrors,
    },
    { type: "DATE", value: dob },
    { type: "DATE", value: consultDate },
    { type: "MRN", value: mrn },
    { type: "PHONE", value: phone },
    { type: "EMAIL", value: email },
  ];

  if (ageData.needsRedaction) {
    expectedPHI.push({ type: "AGE_90_PLUS", value: String(ageData.age) });
  }

  return {
    id,
    type: "Consultation Note",
    errorLevel,
    content,
    expectedPHI,
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "SPECIALTY", value: specialty },
      { type: "DIAGNOSIS", value: diagnosis },
      { type: "MEDICATION", value: medication },
      ...(ageData.needsRedaction
        ? []
        : [{ type: "AGE_UNDER_90", value: String(ageData.age) }]),
    ],
    ageInfo: ageData,
  };
}

// ============================================================================
// DOCUMENT TYPE 9: Nursing Assessment
// ============================================================================
function generateNursingAssessment(id, errorLevel) {
  const patient = generatePatientName("all_caps_full", errorLevel);
  const emergContact1 = generatePatientName("first_last", errorLevel);
  const emergContact2 = generatePatientName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const admitDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone1 = generatePhone(true, errorLevel);
  const phone2 = generatePhone(true, errorLevel);
  const phone3 = generatePhone(true, errorLevel);

  const hospital = random(HOSPITALS);
  const pcpName = generateProviderName("titled").formatted;
  const nurseName =
    generateProviderName("first_last_suffix").formatted + ", RN";
  const chargeNurseName =
    generateProviderName("first_last_suffix").formatted + ", RN";

  const content = `${hospital}
╔══════════════════════════════════════════════════════════════╗
║           NURSING ADMISSION ASSESSMENT                        ║
╚══════════════════════════════════════════════════════════════╝

PATIENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Admission Date: ${admitDate}
Room/Bed: ${randomInt(100, 999)}${random(["A", "B", ""])}

NURSING STAFF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Nurse: ${nurseName}
Charge Nurse: ${chargeNurseName}

EMERGENCY CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ${emergContact1.formatted}
   Relationship: ${random(["Spouse", "Partner", "Parent"])}
   Phone: ${phone1}

2. ${emergContact2.formatted}
   Relationship: ${random(["Son", "Daughter", "Sibling", "Child"])}
   Phone: ${phone2}

PRIMARY CARE PHYSICIAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pcpName}
Phone: ${phone3}

ADMISSION VITAL SIGNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Blood Pressure: ${randomInt(90, 180)}/${randomInt(50, 110)} mmHg
Heart Rate: ${randomInt(50, 120)} bpm
Respiratory Rate: ${randomInt(12, 28)} /min
Temperature: ${(random() * 3 + 97).toFixed(1)}°F
SpO2: ${randomInt(90, 100)}% on ${random(["room air", "2L NC", "4L NC", "NRB"])}
Pain Scale: ${randomInt(0, 10)}/10 - ${random(["none", "mild", "moderate", "severe"])}
Weight: ${randomInt(100, 300)} lbs
Height: ${randomInt(60, 76)} inches

ALLERGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${random(["NKDA (No Known Drug Allergies)", "Penicillin - rash", "Sulfa drugs - hives", "Morphine - nausea/vomiting", "Iodine contrast - anaphylaxis", "Latex - contact dermatitis"])}

FALL RISK ASSESSMENT (Morse Scale)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Score: ${randomInt(0, 125)}
Risk Level: ${random(["Low (0-24)", "Moderate (25-50)", "High (>50)"])}

SKIN ASSESSMENT (Braden Scale)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Score: ${randomInt(6, 23)}
Risk Level: ${random(["No Risk (19-23)", "Mild Risk (15-18)", "Moderate Risk (13-14)", "High Risk (10-12)", "Very High Risk (<9)"])}
Skin Integrity: ${random(["Intact", "Impaired - see wound care notes"])}

FUNCTIONAL STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mobility: ${random(["Independent", "Requires assistance", "Bedbound", "Wheelchair dependent"])}
ADLs: ${random(["Independent", "Partial assistance", "Total care required"])}
Mental Status: ${random(["Alert and oriented x4", "Alert and oriented x3", "Confused but redirectable", "Sedated"])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assessment completed by: ${nurseName}
Date/Time: ${admitDate}`;

  return {
    id,
    type: "Nursing Assessment",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      {
        type: "NAME",
        value: emergContact1.clean,
        actual: emergContact1.formatted,
        hasErrors: emergContact1.hasErrors,
      },
      {
        type: "NAME",
        value: emergContact2.clean,
        actual: emergContact2.formatted,
        hasErrors: emergContact2.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: admitDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
      { type: "PHONE", value: phone3 },
    ],
    shouldNotRedact: [{ type: "HOSPITAL", value: hospital }],
  };
}

// ============================================================================
// DOCUMENT TYPE 10: Special Registration (All PHI Types)
// ============================================================================
function generateSpecialDocument(id, errorLevel) {
  const patient = generatePatientName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const regDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const ssn = generateSSN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const fax = generateFax(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const address = generateAddress(true, errorLevel);
  const ip = generateIP();
  const url = generateURL();
  const cc = generateCreditCard();
  const vin = generateVIN();
  const plate = generateLicensePlate();
  const accountNum = generateAccountNumber();
  const healthPlanID = generateHealthPlanID();

  const hospital = random(HOSPITALS);
  const providerName = generateProviderName("titled").formatted;

  const content = `${hospital}
══════════════════════════════════════════════════════════════
            COMPREHENSIVE PATIENT REGISTRATION
══════════════════════════════════════════════════════════════

PATIENT DEMOGRAPHICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${patient.formatted}
Date of Birth: ${dob}
Social Security Number: ${ssn}
Medical Record Number: ${mrn}
Registration Date: ${regDate}

CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address: ${address.full}
Phone: ${phone}
${fax}
Email: ${email}

PRIMARY CARE PROVIDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${providerName}

PATIENT PORTAL ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portal URL: ${url}
Last Login IP Address: ${ip}
Account Number: ${accountNum}

INSURANCE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Insurance: ${random(["Blue Cross Blue Shield", "Aetna", "United Healthcare", "Cigna", "Humana", "Medicare", "Medicaid"])}
Member ID: ${healthPlanID}
Group Number: ${randomInt(10000, 99999)}

BILLING INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Credit Card on File: ${cc}
Billing Address: Same as above

VEHICLE INFORMATION (For Valet/Parking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vehicle Identification Number: ${vin}
License Plate: ${plate}

ACKNOWLEDGMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☑ I acknowledge receipt of the Notice of Privacy Practices
☑ I authorize release of information for treatment/payment
☑ I consent to electronic communications

Patient Signature: _________________________ Date: ${regDate}

══════════════════════════════════════════════════════════════
Form completed by: Registration Staff
System timestamp: ${regDate}`;

  return {
    id,
    type: "Special Document",
    errorLevel,
    content,
    expectedPHI: [
      {
        type: "NAME",
        value: patient.clean,
        actual: patient.formatted,
        hasErrors: patient.hasErrors,
      },
      { type: "DATE", value: dob },
      { type: "DATE", value: regDate },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "FAX", value: fax },
      { type: "EMAIL", value: email },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "IP", value: ip },
      { type: "URL", value: url },
      { type: "CREDIT_CARD", value: cc },
      { type: "VIN", value: vin },
      { type: "LICENSE_PLATE", value: plate },
      { type: "ACCOUNT_NUMBER", value: accountNum },
      { type: "HEALTH_PLAN_ID", value: healthPlanID },
    ],
    shouldNotRedact: [{ type: "HOSPITAL", value: hospital }],
  };
}

// ============================================================================
// MASTER GENERATOR
// ============================================================================
const DOCUMENT_GENERATORS = [
  generateRadiologyReport,
  generateLabReport,
  generateProgressNote,
  generateEmergencyNote,
  generateDischargeSummary,
  generateOperativeReport,
  generatePrescription,
  generateConsultationNote,
  generateNursingAssessment,
  generateSpecialDocument,
];

/**
 * Generate a batch of test documents
 * @param {number} count - Number of documents to generate
 * @param {object} options - Configuration options
 * @returns {Array} - Array of document objects
 */
function generateDocuments(count, options = {}) {
  const {
    errorDistribution = {
      none: 0.05,
      low: 0.25,
      medium: 0.4,
      high: 0.25,
      extreme: 0.05,
    },
  } = options;

  const documents = [];
  const errorLevels = Object.keys(errorDistribution);
  const cumulative = [];
  let sum = 0;

  for (const level of errorLevels) {
    sum += errorDistribution[level];
    cumulative.push({ level, threshold: sum });
  }

  for (let i = 0; i < count; i++) {
    // Select document type (round-robin for even distribution)
    const generator = DOCUMENT_GENERATORS[i % DOCUMENT_GENERATORS.length];

    // Select error level based on distribution
    const rand = random();
    let errorLevel = "medium";
    for (const { level, threshold } of cumulative) {
      if (rand <= threshold) {
        errorLevel = level;
        break;
      }
    }

    documents.push(generator(i + 1, errorLevel));
  }

  // Shuffle documents
  for (let i = documents.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [documents[i], documents[j]] = [documents[j], documents[i]];
  }

  return documents;
}

module.exports = {
  generateRadiologyReport,
  generateLabReport,
  generateProgressNote,
  generateEmergencyNote,
  generateDischargeSummary,
  generateOperativeReport,
  generatePrescription,
  generateConsultationNote,
  generateNursingAssessment,
  generateSpecialDocument,
  generateDocuments,
  DOCUMENT_GENERATORS,
};
