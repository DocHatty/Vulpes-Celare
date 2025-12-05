/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - COMPREHENSIVE MEDICAL DOCUMENT TEMPLATES                    ║
 * ║  Real-world clinical documents with authentic formatting & structure         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * These templates are designed to:
 * - Mirror ACTUAL clinical documentation from EMR systems
 * - Include edge cases that challenge regex-based detection
 * - Test boundary conditions (PHI vs non-PHI in context)
 * - Include realistic document noise (headers, footers, tables, lists)
 * - Challenge the engine with complex multi-PHI scenarios
 */

const { random, randomInt } = require("../generators/phi");
const { chance } = require("../generators/seeded-random");

// ============================================================================
// TEMPLATE 1: DETAILED HISTORY & PHYSICAL (H&P)
// The most comprehensive clinical document - tests EVERYTHING
// ============================================================================
function generateHistoryAndPhysical(phi) {
  return `
════════════════════════════════════════════════════════════════════════════════
                    ${phi.hospital}
                 HISTORY AND PHYSICAL EXAMINATION
════════════════════════════════════════════════════════════════════════════════

PATIENT INFORMATION
────────────────────────────────────────────────────────────────────────────────
Name:                   ${phi.patientName}
Date of Birth:          ${phi.dob}
Medical Record #:       ${phi.mrn}
Social Security #:      ${phi.ssn}
Admission Date:         ${phi.admitDate}
Attending Physician:    ${phi.attendingName}
Primary Care Provider:  ${phi.pcpName}

DEMOGRAPHIC INFORMATION
────────────────────────────────────────────────────────────────────────────────
Age:                    ${phi.age} years old
Sex:                    ${phi.sex}
Race:                   ${random(["Caucasian", "African American", "Hispanic", "Asian", "Other"])}
Marital Status:         ${random(["Single", "Married", "Divorced", "Widowed"])}
Address:                ${phi.address}
Home Phone:             ${phi.phone}
Cell Phone:             ${phi.phone2}
Email:                  ${phi.email}

EMERGENCY CONTACT
────────────────────────────────────────────────────────────────────────────────
Name:                   ${phi.emergencyContact}
Relationship:           ${random(["Spouse", "Parent", "Child", "Sibling", "Partner"])}
Phone:                  ${phi.emergencyPhone}

INSURANCE INFORMATION
────────────────────────────────────────────────────────────────────────────────
Primary Insurance:      ${phi.insuranceName}
Member ID:              ${phi.healthPlanId}
Group Number:           ${phi.groupNumber}
Secondary Insurance:    ${phi.secondaryInsurance || "None"}

CHIEF COMPLAINT
────────────────────────────────────────────────────────────────────────────────
"${random([
    "I've had chest pain for 3 days",
    "My breathing has gotten worse",
    "I've been having severe headaches",
    "I can't keep anything down",
    "My leg has been swollen and painful",
  ])}"

HISTORY OF PRESENT ILLNESS
────────────────────────────────────────────────────────────────────────────────
${phi.patientName.split(",")[0] || phi.patientName.split(" ")[0]} is a ${phi.age}-year-old ${phi.sex.toLowerCase()} with past medical history significant for ${phi.diagnosis1} and ${phi.diagnosis2} who presents to the emergency department with ${random(["acute onset", "gradual worsening", "sudden", "progressive"])} ${random(["chest pain", "shortness of breath", "abdominal pain", "altered mental status", "weakness"])} beginning ${random(["today", "yesterday", "3 days ago", "1 week ago"])}.

The patient reports that symptoms started ${random(["at rest", "during exertion", "while sleeping", "after meals"])}. ${random(
    [
      "Pain is described as sharp and stabbing.",
      "Symptoms are intermittent but worsening.",
      "No relieving factors have been identified.",
      "Over-the-counter medications provided minimal relief.",
    ],
  )}

Associated symptoms include:
• ${random(["Nausea and vomiting", "Diaphoresis", "Lightheadedness", "Palpitations"])}
• ${random(["Fatigue", "Dyspnea on exertion", "Orthopnea", "Paroxysmal nocturnal dyspnea"])}
• ${random(["No fever or chills", "Low-grade fever", "Night sweats", "Weight loss"])}

The patient denies ${random([
    "recent travel, sick contacts, or COVID-19 exposure",
    "chest pain, palpitations, or syncope",
    "hematuria, dysuria, or urinary frequency",
    "melena, hematochezia, or hematemesis",
  ])}.

PAST MEDICAL HISTORY
────────────────────────────────────────────────────────────────────────────────
1. ${phi.diagnosis1}
2. ${phi.diagnosis2}
3. ${phi.diagnosis3}
4. ${random(["Hyperlipidemia", "Obesity", "Osteoarthritis", "Anemia"])}

PAST SURGICAL HISTORY
────────────────────────────────────────────────────────────────────────────────
1. ${phi.procedure1} - ${phi.surgeryDate1}
2. ${random(["Appendectomy", "Cholecystectomy", "Hernia repair", "Knee arthroscopy"])} - ${phi.surgeryDate2}

MEDICATIONS
────────────────────────────────────────────────────────────────────────────────
1. ${phi.medication1} ${randomInt(5, 100)}mg ${random(["daily", "twice daily", "three times daily"])}
2. ${phi.medication2} ${randomInt(5, 50)}mg ${random(["daily", "at bedtime", "as needed"])}
3. ${phi.medication3} ${randomInt(5, 200)}mg ${random(["daily", "twice daily"])}
4. ${random(["Aspirin 81mg daily", "Vitamin D 2000 IU daily", "Fish oil 1000mg daily"])}

ALLERGIES
────────────────────────────────────────────────────────────────────────────────
1. ${random(["Penicillin", "Sulfa drugs", "Codeine", "Iodine contrast"])} - ${random(["Rash", "Hives", "Anaphylaxis", "GI upset"])}
2. ${random(["Latex", "NKDA", "Morphine", "Shellfish"])} - ${random(["Contact dermatitis", "N/A", "Nausea", "Anaphylaxis"])}

FAMILY HISTORY
────────────────────────────────────────────────────────────────────────────────
Father: ${random(["Coronary artery disease", "Diabetes", "Hypertension"])} - ${random(["deceased age 72", "alive with disease", "deceased age 65"])}
Mother: ${random(["Breast cancer", "Stroke", "COPD"])} - ${random(["deceased age 78", "alive", "deceased age 70"])}
Siblings: ${random(["Brother with diabetes", "Sister with hypertension", "None", "2 brothers - healthy"])}

SOCIAL HISTORY
────────────────────────────────────────────────────────────────────────────────
Tobacco:         ${random(["Never smoker", "Former smoker (quit 5 years ago)", "Active smoker 1 PPD x 30 years", "Occasional cigars"])}
Alcohol:         ${random(["Denies", "Social - 1-2 drinks/week", "Former heavy drinker", "2-3 beers daily"])}
Illicit Drugs:   ${random(["Denies", "Remote marijuana use", "Denies IV drug use", "Former cocaine use"])}
Occupation:      ${random(["Retired teacher", "Accountant", "Nurse", "Construction worker", "Disabled"])}
Living Situation: ${random(["Lives alone", "Lives with spouse", "Lives with adult children", "Assisted living facility"])}

REVIEW OF SYSTEMS
────────────────────────────────────────────────────────────────────────────────
Constitutional:  ${random(["Fatigue, no fever", "Weight loss of 10 lbs", "Night sweats", "No constitutional symptoms"])}
HEENT:           ${random(["No vision changes", "Mild hearing loss", "Denies sore throat", "No headache"])}
Cardiovascular:  ${random(["Chest pain as above", "Palpitations", "Lower extremity edema", "No chest pain"])}
Respiratory:     ${random(["Dyspnea on exertion", "Productive cough", "No hemoptysis", "Wheezing"])}
GI:              ${random(["Nausea without vomiting", "Constipation", "No abdominal pain", "Heartburn"])}
GU:              ${random(["No dysuria", "Nocturia x2", "No hematuria", "Urinary frequency"])}
MSK:             ${random(["Chronic low back pain", "Bilateral knee pain", "No joint swelling", "Limited ROM shoulder"])}
Neurological:    ${random(["No weakness", "Occasional dizziness", "No numbness", "No headaches"])}
Psychiatric:     ${random(["Anxiety controlled", "Denies depression", "Chronic insomnia", "No suicidal ideation"])}
Skin:            ${random(["No rashes", "Dry skin", "Chronic eczema", "No lesions"])}

PHYSICAL EXAMINATION
────────────────────────────────────────────────────────────────────────────────
VITAL SIGNS:
  Blood Pressure:      ${randomInt(90, 180)}/${randomInt(50, 110)} mmHg
  Heart Rate:          ${randomInt(50, 120)} bpm
  Respiratory Rate:    ${randomInt(12, 28)} /min
  Temperature:         ${(random() * 3 + 97).toFixed(1)}°F
  Oxygen Saturation:   ${randomInt(88, 100)}% on ${random(["room air", "2L NC", "4L NC", "NRB 15L"])}
  Height:              ${randomInt(60, 76)} inches
  Weight:              ${randomInt(100, 300)} lbs
  BMI:                 ${(random() * 20 + 18).toFixed(1)} kg/m²

GENERAL:          ${random(["Alert, oriented, no acute distress", "Appears ill, mildly distressed", "Comfortable, well-appearing", "Anxious but cooperative"])}

HEENT:
  Head:            Normocephalic, atraumatic
  Eyes:            PERRL, EOMI, no scleral icterus
  Ears:            TMs clear bilaterally
  Nose:            No rhinorrhea or congestion
  Throat:          Oropharynx clear, no erythema or exudate

NECK:             ${random(["Supple, no JVD", "No lymphadenopathy", "Full ROM", "Mild JVD present"])}

CARDIOVASCULAR:   ${random([
    "Regular rate and rhythm, no murmurs/rubs/gallops",
    "Irregular rhythm, systolic murmur grade II/VI at apex",
    "Tachycardic, S1 S2 normal, no murmur",
    "Bradycardic, S1 S2 normal, no murmur",
  ])}

LUNGS:            ${random([
    "Clear to auscultation bilaterally, no wheezes/rales/rhonchi",
    "Decreased breath sounds at bases bilaterally",
    "Scattered wheezes, no rales",
    "Bibasilar crackles, no wheezes",
  ])}

ABDOMEN:          ${random([
    "Soft, non-tender, non-distended, normoactive bowel sounds",
    "Mild epigastric tenderness, no rebound/guarding",
    "Obese, difficult to assess, no obvious masses",
    "RUQ tenderness, positive Murphy's sign",
  ])}

EXTREMITIES:      ${random([
    "No cyanosis, clubbing, or edema",
    "2+ bilateral lower extremity edema",
    "Left calf swelling and tenderness",
    "Warm, well-perfused, no edema",
  ])}

NEUROLOGICAL:     ${random([
    "Alert, oriented x4, CN II-XII intact",
    "Mild confusion, otherwise grossly intact",
    "Strength 5/5 all extremities, sensation intact",
    "No focal deficits, gait steady",
  ])}

SKIN:             ${random(["Warm, dry, no rashes or lesions", "Mild diaphoresis", "Pale but no cyanosis", "Stage II pressure ulcer sacrum"])}

LABORATORY DATA
────────────────────────────────────────────────────────────────────────────────
CBC:
  WBC:             ${(random() * 12 + 4).toFixed(1)} K/uL      (4.5-11.0)
  Hemoglobin:      ${(random() * 6 + 10).toFixed(1)} g/dL      (12.0-17.5)
  Hematocrit:      ${(random() * 20 + 30).toFixed(1)} %        (36-50)
  Platelets:       ${randomInt(100, 450)} K/uL     (150-400)

CMP:
  Sodium:          ${randomInt(130, 150)} mEq/L     (136-145)
  Potassium:       ${(random() * 2 + 3.3).toFixed(1)} mEq/L     (3.5-5.0)
  Chloride:        ${randomInt(95, 110)} mEq/L     (98-106)
  CO2:             ${randomInt(18, 32)} mEq/L      (22-29)
  BUN:             ${randomInt(8, 40)} mg/dL       (7-20)
  Creatinine:      ${(random() * 2 + 0.6).toFixed(2)} mg/dL     (0.7-1.3)
  Glucose:         ${randomInt(70, 300)} mg/dL     (70-100)
  eGFR:            ${randomInt(30, 120)} mL/min    (>60)

Cardiac Markers:
  Troponin I:      ${(random() * 0.5).toFixed(3)} ng/mL    (<0.04)
  BNP:             ${randomInt(50, 2000)} pg/mL    (<100)

IMAGING
────────────────────────────────────────────────────────────────────────────────
${phi.imagingType} (${phi.admitDate}):
${random([
  "No acute cardiopulmonary abnormality. Heart size normal. Lungs clear.",
  "Cardiomegaly with mild pulmonary vascular congestion. No focal consolidation.",
  "Right lower lobe infiltrate concerning for pneumonia. No pleural effusion.",
  "Stable chronic changes. No acute abnormality identified.",
])}

ECG (${phi.admitDate}):
${random([
  "Normal sinus rhythm at 78 bpm. No acute ST-T wave changes.",
  "Atrial fibrillation with RVR. Non-specific ST-T wave abnormalities.",
  "Sinus tachycardia. ST depressions in V4-V6.",
  "Normal sinus rhythm. Old inferior infarct pattern.",
])}

ASSESSMENT AND PLAN
────────────────────────────────────────────────────────────────────────────────
${phi.age}-year-old ${phi.sex.toLowerCase()} with ${phi.diagnosis1} and ${phi.diagnosis2} presenting with ${random(["acute chest pain", "shortness of breath", "altered mental status", "abdominal pain"])}.

PROBLEM LIST:

1. ${phi.diagnosis1}
   - ${random(["Continue home medications", "Start IV diuresis", "Obtain cardiology consult", "Serial troponins q8h"])}
   - ${random(["Monitor telemetry", "Echocardiogram ordered", "Stress test as outpatient", "Cardiac catheterization if indicated"])}

2. ${phi.diagnosis2}
   - ${random(["Continue current management", "Adjust medications as needed", "Specialist follow-up", "Labs to monitor"])}

3. ${phi.diagnosis3}
   - ${random(["Stable, continue current therapy", "Address as outpatient", "Consult ordered", "No acute intervention needed"])}

4. Prophylaxis:
   - DVT prophylaxis: ${random(["Heparin SQ", "SCDs", "Lovenox", "Ambulation"])}
   - GI prophylaxis: ${random(["Pantoprazole", "Famotidine", "None indicated", "Sucralfate"])}

5. Disposition:
   - ${random(["Admit to telemetry", "Admit to ICU", "Observation status", "Admit to medicine floor"])}
   - Code Status: ${random(["Full Code", "DNR/DNI", "DNR - okay to intubate", "Comfort measures only"])}
   - Goals of Care: ${random(["Discussed with patient and family", "Patient understands plan", "Family meeting scheduled", "Palliative care consulted"])}

────────────────────────────────────────────────────────────────────────────────
Attending Physician: ${phi.attendingName}
Date/Time:          ${phi.admitDate}

Electronically signed by: ${phi.attendingName}
NPI: ${phi.attendingNpi}
════════════════════════════════════════════════════════════════════════════════
                         CONFIDENTIAL PATIENT INFORMATION
           This document contains Protected Health Information (PHI)
════════════════════════════════════════════════════════════════════════════════
`;
}

// ============================================================================
// TEMPLATE 2: OPERATIVE REPORT - Complex Procedure Documentation
// ============================================================================
function generateOperativeReport(phi) {
  const procedure = phi.procedure1;
  const duration = randomInt(45, 240);

  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                             ${phi.hospital}
║                            OPERATIVE REPORT
╚══════════════════════════════════════════════════════════════════════════════╝

══════════════════════════════════════════════════════════════════════════════
PATIENT IDENTIFICATION
══════════════════════════════════════════════════════════════════════════════

Patient Name:           ${phi.patientName}
Medical Record #:       ${phi.mrn}
Date of Birth:          ${phi.dob}
Date of Surgery:        ${phi.surgeryDate1}
Account Number:         ${phi.accountNumber}

══════════════════════════════════════════════════════════════════════════════
SURGICAL TEAM
══════════════════════════════════════════════════════════════════════════════

Primary Surgeon:        ${phi.surgeonName}
                        NPI: ${phi.surgeonNpi}
                        DEA: ${phi.surgeonDea}

First Assistant:        ${phi.assistantName}
Anesthesiologist:       ${phi.anesthesiologistName}
Scrub Nurse:            ${phi.scrubNurseName}
Circulating Nurse:      ${phi.circNurseName}

══════════════════════════════════════════════════════════════════════════════
PROCEDURE INFORMATION
══════════════════════════════════════════════════════════════════════════════

Preoperative Diagnosis: ${phi.diagnosis1}
Postoperative Diagnosis: ${phi.diagnosis1}

Procedure Performed:    ${procedure}

Anesthesia:             ${random([
    "General endotracheal anesthesia",
    "Spinal anesthesia with IV sedation",
    "Regional nerve block with MAC",
    "Combined spinal-epidural",
  ])}

Duration of Surgery:    ${duration} minutes
Estimated Blood Loss:   ${randomInt(10, 500)} mL
Fluids Administered:    ${randomInt(500, 3000)} mL crystalloid
Urine Output:           ${randomInt(100, 600)} mL

Specimens:              ${random([
    "Tissue sent to pathology for analysis",
    "None",
    "Gallbladder with stones - pathology",
    "Lymph nodes x3 - pathology",
  ])}

Drains/Tubes:           ${random([
    "JP drain x1 to bulb suction",
    "Foley catheter to gravity",
    "None",
    "NGT to low intermittent suction",
  ])}

Implants:               ${random([
    "None",
    "Mesh - Bard 3D Max, 15x10cm, Lot #BR2024-8847",
    "Screws x4, Plate x1 - Synthes titanium",
    "Stent - Boston Scientific 6Fr x 24cm",
  ])}

Complications:          None

══════════════════════════════════════════════════════════════════════════════
INDICATIONS FOR SURGERY
══════════════════════════════════════════════════════════════════════════════

${phi.patientName.split(",")[0] || phi.patientName.split(" ")[1]} is a ${phi.age}-year-old ${phi.sex.toLowerCase()} with ${phi.diagnosis1} who has failed conservative management. After discussion of risks, benefits, and alternatives, the patient elected to proceed with surgical intervention. Informed consent was obtained and documented.

══════════════════════════════════════════════════════════════════════════════
OPERATIVE DESCRIPTION
══════════════════════════════════════════════════════════════════════════════

The patient was brought to the operating room and placed in the ${random([
    "supine position",
    "lateral decubitus position",
    "prone position",
    "lithotomy position",
    "beach chair position",
  ])} on the operating table. After successful induction of anesthesia, the patient was prepped and draped in the standard sterile fashion. A timeout was performed confirming the correct patient, procedure, and site.

${random([
  "A standard midline incision was made and carried through subcutaneous tissue using electrocautery.",
  "Laparoscopic ports were placed under direct visualization: 12mm umbilical, 5mm bilateral subcostal.",
  "The standard approach was utilized with adequate exposure obtained throughout.",
  "An arthroscopic examination was performed revealing the pathology as expected.",
])}

The procedure proceeded as follows:

${random([
  "Careful dissection was performed identifying all relevant anatomical structures. The critical view of safety was achieved and documented photographically.",
  "The lesion was identified and circumferentially dissected. Adequate margins were obtained and confirmed with intraoperative pathology.",
  "Systematic exploration revealed the expected findings. All pathology was addressed without difficulty.",
  "The affected tissue was mobilized and resected. Hemostasis was achieved with electrocautery and suture ligation.",
])}

${random([
  "The specimen was removed and sent to pathology.",
  "Final inspection confirmed excellent hemostasis.",
  "Irrigation was performed and all counts were correct.",
  "The wound was copiously irrigated with antibiotic saline.",
])}

Closure was performed in layers:
- ${random(["Fascia closed with #1 Vicryl in running fashion", "Peritoneum closed with 2-0 Vicryl", "No fascial closure required for port sites"])}
- ${random(["Subcutaneous tissue approximated with 3-0 Vicryl", "Deep dermal closure with 3-0 Monocryl", "Subcuticular closure with 4-0 Monocryl"])}
- ${random(["Skin closed with staples", "Skin closed with running subcuticular 4-0 Monocryl", "Dermabond applied to all incisions", "Steri-strips applied"])}

The patient tolerated the procedure well and was transferred to the PACU in stable condition.

══════════════════════════════════════════════════════════════════════════════
FINDINGS
══════════════════════════════════════════════════════════════════════════════

${random([
  "Findings consistent with preoperative diagnosis. No unexpected pathology encountered.",
  "Moderate adhesions from prior surgery, lysed without difficulty. Primary pathology as expected.",
  "Advanced disease state noted. Complete resection achieved despite technical challenges.",
  "Findings exactly as predicted by imaging. Straightforward case.",
])}

══════════════════════════════════════════════════════════════════════════════
DISPOSITION
══════════════════════════════════════════════════════════════════════════════

The patient was extubated in the operating room and transferred to the Post-Anesthesia Care Unit in stable condition. Vital signs were stable throughout. The patient will be admitted to the ${random(["surgical floor", "step-down unit", "ICU for overnight monitoring", "same day surgery unit"])} for postoperative monitoring.

══════════════════════════════════════════════════════════════════════════════

Dictated by: ${phi.surgeonName}
Date/Time: ${phi.surgeryDate1}
Authenticated by: ${phi.surgeonName}

══════════════════════════════════════════════════════════════════════════════
                         CONFIDENTIAL MEDICAL RECORD
                    Patient: ${phi.patientName} | MRN: ${phi.mrn}
══════════════════════════════════════════════════════════════════════════════
`;
}

// ============================================================================
// TEMPLATE 3: COMPREHENSIVE REGISTRATION FORM - ALL PHI TYPES
// ============================================================================
function generateRegistrationForm(phi) {
  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    ${phi.hospital}                                           ┃
┃              COMPREHENSIVE PATIENT REGISTRATION FORM                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Form ID: REG-${Date.now()}-${randomInt(1000, 9999)}
Registration Date: ${phi.admitDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: PATIENT DEMOGRAPHICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Legal Name (Last, First Middle):     ${phi.patientName}
Preferred Name:                      ${phi.preferredName || "N/A"}
Date of Birth (MM/DD/YYYY):          ${phi.dob}
Social Security Number:              ${phi.ssn}
Age:                                 ${phi.age} years

Sex Assigned at Birth:               ${phi.sex}
Gender Identity:                     ${random(["Male", "Female", "Non-binary", "Prefer not to say"])}
Pronouns:                            ${random(["He/Him", "She/Her", "They/Them", "Prefer not to say"])}

Race (select all that apply):        ${random(["White", "Black or African American", "Asian", "American Indian", "Native Hawaiian"])}
Ethnicity:                           ${random(["Hispanic or Latino", "Not Hispanic or Latino"])}
Primary Language:                    ${random(["English", "Spanish", "Mandarin", "Vietnamese", "Arabic"])}
Interpreter Needed:                  ${random(["Yes", "No"])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT ADDRESS:
Street Address:                      ${phi.streetAddress}
Apartment/Unit:                      ${phi.unit || "N/A"}
City, State ZIP:                     ${phi.city}, ${phi.state} ${phi.zip}
Country:                             United States

MAILING ADDRESS (if different):
Street Address:                      ${phi.mailingAddress || "Same as above"}
City, State ZIP:                     ${phi.mailingCityStateZip || "Same as above"}

PHONE NUMBERS:
Home Phone:                          ${phi.phone}
Cell Phone:                          ${phi.phone2}
Work Phone:                          ${phi.workPhone || "N/A"}

ELECTRONIC CONTACT:
Primary Email:                       ${phi.email}
Secondary Email:                     ${phi.email2 || "N/A"}
Fax Number:                          ${phi.fax}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: EMERGENCY CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMERGENCY CONTACT #1:
Name:                                ${phi.emergencyContact}
Relationship:                        ${random(["Spouse", "Parent", "Child", "Sibling", "Partner", "Friend"])}
Phone (Primary):                     ${phi.emergencyPhone}
Phone (Alternate):                   ${phi.emergencyPhone2 || "N/A"}
Address:                             ${phi.emergencyAddress || "On file"}

EMERGENCY CONTACT #2:
Name:                                ${phi.emergencyContact2}
Relationship:                        ${random(["Spouse", "Parent", "Child", "Sibling", "Partner", "Friend"])}
Phone:                               ${phi.emergencyPhone3}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: INSURANCE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMARY INSURANCE:
Insurance Company:                   ${phi.insuranceName}
Member ID:                           ${phi.healthPlanId}
Group Number:                        ${phi.groupNumber}
Policy Holder Name:                  ${phi.policyHolderName || phi.patientName}
Policy Holder DOB:                   ${phi.policyHolderDob || phi.dob}
Relationship to Patient:             ${random(["Self", "Spouse", "Parent", "Other"])}
Phone Number:                        ${phi.insurancePhone}
Authorization Phone:                 ${phi.authPhone || phi.insurancePhone}

SECONDARY INSURANCE (if applicable):
Insurance Company:                   ${phi.secondaryInsurance || "None"}
Member ID:                           ${phi.secondaryId || "N/A"}
Group Number:                        ${phi.secondaryGroup || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: BILLING INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GUARANTOR INFORMATION (if different from patient):
Name:                                ${phi.guarantorName || "Self"}
Relationship:                        ${random(["Self", "Spouse", "Parent", "Guardian"])}
SSN:                                 ${phi.guarantorSsn || phi.ssn}
Phone:                               ${phi.guarantorPhone || phi.phone}

PAYMENT METHOD ON FILE:
Credit Card Type:                    ${random(["Visa", "Mastercard", "American Express", "Discover"])}
Card Number:                         ${phi.creditCard}
Expiration:                          ${phi.ccExpiry}
Name on Card:                        ${phi.ccName || phi.patientName}
Billing ZIP:                         ${phi.ccZip || phi.zip}

Account Number:                      ${phi.accountNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: PATIENT PORTAL & ELECTRONIC ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Patient Portal URL:                  ${phi.portalUrl}
Username:                            ${phi.portalUsername || phi.email}
Last Login IP:                       ${phi.ipAddress}
Mobile App Device ID:                ${phi.deviceId || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: VEHICLE INFORMATION (for valet/parking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vehicle Make/Model:                  ${random(["Toyota Camry", "Honda Accord", "Ford F-150", "BMW 3 Series", "Tesla Model 3"])}
Year:                                ${randomInt(2015, 2024)}
Color:                               ${random(["White", "Black", "Silver", "Blue", "Red", "Gray"])}
License Plate:                       ${phi.licensePlate}
State:                               ${phi.state}
VIN (for motor vehicle accident claims): ${phi.vin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: PRIMARY CARE PROVIDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PCP Name:                            ${phi.pcpName}
Practice Name:                       ${phi.pcpPractice || "Primary Care Associates"}
NPI:                                 ${phi.pcpNpi}
Phone:                               ${phi.pcpPhone}
Fax:                                 ${phi.pcpFax}
Address:                             ${phi.pcpAddress || "On file"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9: REFERRING PROVIDER (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Referring Provider Name:             ${phi.referringName || "Self-referral"}
NPI:                                 ${phi.referringNpi || "N/A"}
Phone:                               ${phi.referringPhone || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10: PHARMACY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preferred Pharmacy:                  ${random(["CVS", "Walgreens", "Rite Aid", "Walmart", "Kroger"])}
Pharmacy Phone:                      ${phi.pharmacyPhone}
Pharmacy Address:                    ${phi.pharmacyAddress || "On file"}
NPI:                                 ${phi.pharmacyNpi || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11: CONSENT AND SIGNATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☑ I consent to treatment at ${phi.hospital}
☑ I authorize release of medical information as required for treatment
☑ I have received the Notice of Privacy Practices
☑ I consent to electronic communications
☑ I authorize billing to my insurance
☑ I accept financial responsibility for services not covered

Patient/Guardian Signature: _________________________________ Date: ${phi.admitDate}

For Office Use Only:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Registration Completed By:           ${phi.registrarName}
Employee ID:                         ${phi.employeeId}
Date/Time:                           ${phi.admitDate}
Verification Completed:              ☑ ID Verified  ☑ Insurance Verified  ☑ Consent Signed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MRN: ${phi.mrn}                                         Account: ${phi.accountNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    CONFIDENTIAL PATIENT INFORMATION
               Do Not Copy, Fax, or Distribute Without Authorization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ============================================================================
// TEMPLATE 4: MULTI-PROVIDER REFERRAL LETTER
// Tests provider name detection (which should NOT be redacted)
// ============================================================================
function generateReferralLetter(phi) {
  return `
${phi.hospital}
Department of ${phi.specialty}

Date: ${phi.admitDate}

${phi.referringName}
${phi.referringPractice}
${phi.referringAddress}

RE:   Patient: ${phi.patientName}
      DOB: ${phi.dob}
      MRN: ${phi.mrn}

Dear ${phi.referringName.split(",")[0] || phi.referringName.split(" ")[0]},

Thank you for referring ${phi.patientName.split(",")[0] || phi.patientName.split(" ")[0]} to our ${phi.specialty} clinic for evaluation and management of ${phi.diagnosis1}.

PATIENT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:           ${phi.patientName}
Date of Birth:  ${phi.dob}
Age:            ${phi.age} years
Phone:          ${phi.phone}
Address:        ${phi.address}

CLINICAL SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I had the pleasure of evaluating your patient on ${phi.admitDate}. As you know, ${phi.patientName.split(",")[0] || phi.patientName.split(" ")[0]} is a ${phi.age}-year-old ${phi.sex.toLowerCase()} with a history of ${phi.diagnosis1}, ${phi.diagnosis2}, and ${phi.diagnosis3}.

The patient reports ${random([
    "progressive symptoms over the past several months",
    "recent worsening despite conservative management",
    "new symptoms concerning for disease progression",
    "stable symptoms but seeking specialist opinion",
  ])}.

On examination, I found:
• ${random(["Findings consistent with the diagnosis", "Evidence of moderate disease activity", "Mild abnormalities as expected", "More advanced disease than anticipated"])}
• ${random(["No new concerning findings", "Some improvement from prior visit", "Stable from previous examination", "Findings warrant further workup"])}

DIAGNOSTIC WORKUP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I have ordered the following studies:
1. ${phi.imagingType}
2. ${random(["Laboratory panel including CBC, CMP, and disease-specific markers", "Specialized testing as indicated", "Repeat baseline studies for comparison"])}
3. ${random(["Biopsy if indicated by imaging results", "Additional imaging as needed", "Functional testing"])}

TREATMENT PLAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Based on my evaluation, I recommend:
1. ${random(["Initiate therapy with " + phi.medication1, "Continue current medications", "Modify treatment regimen"])}
2. ${random(["Close follow-up in 4-6 weeks", "Return after completion of workup", "Schedule intervention if indicated"])}
3. ${random(["Lifestyle modifications as discussed", "Physical therapy referral", "Additional specialist consultation"])}

I will continue to follow ${phi.patientName.split(",")[0] || phi.patientName.split(" ")[0]} in my clinic and will keep you updated on ${random(["his", "her", "their"])} progress. Please do not hesitate to contact me if you have any questions or concerns.

Thank you again for this interesting referral.

Sincerely,

${phi.attendingName}
${phi.specialty}
${phi.hospital}

Phone: ${phi.hospitalPhone}
Fax: ${phi.hospitalFax}
NPI: ${phi.attendingNpi}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cc: ${phi.pcpName}, Primary Care Provider
    ${phi.patientName} (via Patient Portal)
    Medical Records
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         CONFIDENTIAL MEDICAL CORRESPONDENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ============================================================================
// TEMPLATE 5: PATHOLOGY REPORT - Technical Medical Document
// ============================================================================
function generatePathologyReport(phi) {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ANATOMIC PATHOLOGY REPORT
║                    ${phi.hospital}
╚══════════════════════════════════════════════════════════════════════════════╝

══════════════════════════════════════════════════════════════════════════════
CASE INFORMATION
══════════════════════════════════════════════════════════════════════════════
Accession Number:        PATH-${Date.now()}-${randomInt(1000, 9999)}
Case Type:               ${random(["Surgical Pathology", "Cytology", "Autopsy", "Dermatopathology"])}
Priority:                ${random(["Routine", "Rush", "STAT"])}

PATIENT INFORMATION
══════════════════════════════════════════════════════════════════════════════
Patient Name:            ${phi.patientName}
Medical Record #:        ${phi.mrn}
Date of Birth:           ${phi.dob}
Age:                     ${phi.age} years
Sex:                     ${phi.sex}
Account Number:          ${phi.accountNumber}

CLINICAL INFORMATION
══════════════════════════════════════════════════════════════════════════════
Date of Collection:      ${phi.surgeryDate1}
Date Received:           ${phi.surgeryDate1}
Date of Report:          ${phi.admitDate}
Requesting Physician:    ${phi.surgeonName}
                         NPI: ${phi.surgeonNpi}

CLINICAL HISTORY
══════════════════════════════════════════════════════════════════════════════
${phi.age}-year-old ${phi.sex.toLowerCase()} with ${phi.diagnosis1}. ${random([
    "Patient presents for tissue diagnosis.",
    "Evaluate for malignancy.",
    "Staging procedure.",
    "Follow-up from abnormal imaging.",
  ])}

SPECIMEN(S) RECEIVED
══════════════════════════════════════════════════════════════════════════════
A. ${random(["Right breast, lumpectomy", "Colon, segmental resection", "Thyroid, total thyroidectomy", "Lymph node, excisional biopsy", "Skin, excision"])}
B. ${random(["Sentinel lymph node, right axilla", "Omentum, biopsy", "Adjacent soft tissue margin", "Regional lymph nodes"])}

GROSS DESCRIPTION
══════════════════════════════════════════════════════════════════════════════
Specimen A:
Received fresh, oriented with a short suture at 12 o'clock and a long suture laterally, is a ${randomInt(20, 80)} x ${randomInt(15, 60)} x ${randomInt(10, 40)} mm specimen of tan-pink ${random(["fibrofatty tissue", "soft tissue", "rubbery tissue"])} weighing ${randomInt(5, 150)} grams. On sectioning, there is a ${randomInt(5, 30)} x ${randomInt(5, 25)} x ${randomInt(5, 20)} mm ${random(["firm, white", "tan-yellow", "hemorrhagic", "necrotic appearing"])} lesion located ${randomInt(1, 10)} mm from the closest margin (${random(["superior", "inferior", "medial", "lateral"])}). Representative sections submitted.

Specimen B:
Received in formalin is a ${randomInt(5, 20)} x ${randomInt(5, 15)} x ${randomInt(3, 10)} mm ${random(["lymph node", "soft tissue fragment", "fibrofatty tissue"])}. Entirely submitted.

MICROSCOPIC DESCRIPTION
══════════════════════════════════════════════════════════════════════════════
Sections of specimen A demonstrate ${random([
    "invasive ductal carcinoma, moderately differentiated",
    "adenocarcinoma, well to moderately differentiated",
    "papillary carcinoma",
    "squamous cell carcinoma, moderately differentiated",
  ])}. ${random([
    "The tumor forms irregular glands infiltrating fibrous stroma.",
    "Sheets and nests of atypical cells are identified.",
    "Papillary architecture with fibrovascular cores is seen.",
    "Nuclear pleomorphism and increased mitotic activity are present.",
  ])}

Specimen B shows ${random([
    "reactive lymphoid hyperplasia, no evidence of metastatic carcinoma",
    "metastatic carcinoma in 1 of 3 lymph nodes (1/3)",
    "benign lymph node tissue",
    "micrometastasis identified (< 2mm)",
  ])}.

DIAGNOSIS
══════════════════════════════════════════════════════════════════════════════

A. ${random(["RIGHT BREAST, LUMPECTOMY", "COLON, SEGMENTAL RESECTION", "THYROID, TOTAL THYROIDECTOMY"])}:
   - ${random([
     "INVASIVE DUCTAL CARCINOMA, MODERATELY DIFFERENTIATED",
     "ADENOCARCINOMA, MODERATELY DIFFERENTIATED",
     "PAPILLARY THYROID CARCINOMA",
     "SQUAMOUS CELL CARCINOMA",
   ])}
   - Tumor size: ${randomInt(5, 30)} mm in greatest dimension
   - Margins: ${random(["Negative (closest margin: " + randomInt(1, 10) + " mm)", "Positive at superior margin", "Close (< 1mm) at deep margin"])}
   - Lymphovascular invasion: ${random(["Present", "Not identified"])}
   - Perineural invasion: ${random(["Present", "Not identified"])}

B. ${random(["SENTINEL LYMPH NODE, RIGHT AXILLA", "REGIONAL LYMPH NODES"])}:
   - ${random([
     "REACTIVE LYMPHOID HYPERPLASIA, NO EVIDENCE OF METASTASIS",
     "METASTATIC CARCINOMA (1 of 3 nodes positive)",
     "BENIGN LYMPH NODE TISSUE",
   ])}

STAGING (AJCC 8th Edition):
   pT${randomInt(1, 3)} pN${randomInt(0, 2)} cM${random(["0", "X"])}

ANCILLARY STUDIES
══════════════════════════════════════════════════════════════════════════════
Immunohistochemistry (performed on block A3):
  ER:          ${random(["Positive (>95% of tumor cells, strong)", "Negative", "Positive (70% of tumor cells, moderate)"])}
  PR:          ${random(["Positive (85% of tumor cells, strong)", "Negative", "Positive (50% of tumor cells, weak)"])}
  HER2:        ${random(["Negative (0)", "Equivocal (2+) - FISH pending", "Positive (3+)"])}
  Ki-67:       ${randomInt(5, 60)}%

══════════════════════════════════════════════════════════════════════════════

This report was electronically signed by:
${phi.pathologistName}
Board Certified Anatomic and Clinical Pathology

NPI: ${phi.pathologistNpi}
Date: ${phi.admitDate}

══════════════════════════════════════════════════════════════════════════════
                         ${phi.hospital}
              Department of Pathology and Laboratory Medicine
══════════════════════════════════════════════════════════════════════════════
Patient: ${phi.patientName}                              MRN: ${phi.mrn}
DOB: ${phi.dob}                                          Accession: PATH-${Date.now()}
══════════════════════════════════════════════════════════════════════════════
`;
}

// ============================================================================
// TEMPLATE 6: INSURANCE CLAIM / EOB DOCUMENT
// ============================================================================
function generateInsuranceDocument(phi) {
  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   EXPLANATION OF BENEFITS (EOB)                              ┃
┃                   This is NOT a bill                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${phi.insuranceName}
PO Box ${randomInt(10000, 99999)}
${phi.insuranceCity}, ${phi.insuranceState} ${phi.insuranceZip}

Statement Date:          ${phi.admitDate}
Claim Number:            CLM-${Date.now()}-${randomInt(1000, 9999)}
Member Services:         1-800-${randomInt(100, 999)}-${randomInt(1000, 9999)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMBER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Member Name:             ${phi.patientName}
Member ID:               ${phi.healthPlanId}
Group Number:            ${phi.groupNumber}
Date of Birth:           ${phi.dob}
Member Address:          ${phi.address}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provider Name:           ${phi.attendingName}
Provider NPI:            ${phi.attendingNpi}
Provider Tax ID:         ${phi.providerTaxId}
Facility:                ${phi.hospital}
Facility NPI:            ${phi.hospitalNpi}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAIM DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date of Service:         ${phi.serviceDate || phi.admitDate}
Place of Service:        ${random(["Office", "Outpatient Hospital", "Inpatient Hospital", "Emergency Room"])}
Diagnosis Codes:         ${random(["I10", "E11.9", "J18.9", "K80.20"])} - ${phi.diagnosis1}

┌────────────────────────────────────────────────────────────────────────────┐
│ Service                  │ Billed    │ Allowed   │ Paid     │ You Owe    │
├────────────────────────────────────────────────────────────────────────────┤
│ Office Visit (99214)     │ $${randomInt(150, 300)}.00   │ $${randomInt(100, 200)}.00   │ $${randomInt(70, 150)}.00   │ $${randomInt(20, 50)}.00    │
│ Lab - CBC (85025)        │ $${randomInt(30, 80)}.00    │ $${randomInt(20, 50)}.00    │ $${randomInt(15, 40)}.00   │ $${randomInt(5, 15)}.00     │
│ Lab - CMP (80053)        │ $${randomInt(40, 100)}.00   │ $${randomInt(25, 60)}.00    │ $${randomInt(20, 50)}.00   │ $${randomInt(5, 15)}.00     │
│ ${phi.imagingType}       │ $${randomInt(200, 800)}.00  │ $${randomInt(150, 500)}.00  │ $${randomInt(100, 400)}.00 │ $${randomInt(30, 100)}.00   │
└────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Billed:            $${randomInt(500, 1500)}.00
Network Discount:        -$${randomInt(100, 400)}.00
Plan Paid:               $${randomInt(300, 800)}.00
────────────────────────────────────────────────────────────────────────────
Your Responsibility:     $${randomInt(50, 200)}.00

Deductible Applied:      $${randomInt(0, 100)}.00
Copayment Applied:       $${randomInt(20, 50)}.00
Coinsurance Applied:     $${randomInt(0, 50)}.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BENEFIT INFORMATION (Calendar Year ${new Date().getFullYear()})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Individual Deductible:   $${randomInt(500, 3000)}.00 Met / $${randomInt(2000, 5000)}.00 Total
Family Deductible:       $${randomInt(1000, 6000)}.00 Met / $${randomInt(4000, 10000)}.00 Total
Out-of-Pocket Maximum:   $${randomInt(2000, 10000)}.00 Met / $${randomInt(6000, 15000)}.00 Total

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT NOTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is not a bill. You may receive a bill from your provider for the amount
shown in "You Owe" above. If you have questions about this EOB, please call
Member Services at 1-800-${randomInt(100, 999)}-${randomInt(1000, 9999)}.

To appeal this decision, submit a written appeal within 180 days to:
${phi.insuranceName} Appeals Department
PO Box ${randomInt(10000, 99999)}
${phi.insuranceCity}, ${phi.insuranceState} ${phi.insuranceZip}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    KEEP THIS DOCUMENT FOR YOUR RECORDS
              ${phi.patientName} | Member ID: ${phi.healthPlanId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================
module.exports = {
  generateHistoryAndPhysical,
  generateOperativeReport,
  generateRegistrationForm,
  generateReferralLetter,
  generatePathologyReport,
  generateInsuranceDocument,

  // Template list for random selection
  // Each template declares which non-PHI fields it uses for accurate ground truth validation
  TEMPLATES: [
    {
      name: "History & Physical",
      generator: generateHistoryAndPhysical,
      complexity: "high",
      // Non-PHI fields this template uses (for ground truth validation)
      usesNonPHI: {
        hospital: true,
        attendingName: true,
        pcpName: true,
        diagnosis1: true,
        diagnosis2: true,
        diagnosis3: true,
        procedure1: true,
        medication1: true,
        medication2: true,
        medication3: true,
        insuranceName: true,
        age: true,
      },
    },
    {
      name: "Operative Report",
      generator: generateOperativeReport,
      complexity: "high",
      usesNonPHI: {
        hospital: true,
        surgeonName: true,
        assistantName: true,
        anesthesiologistName: true,
        diagnosis1: true,
        procedure1: true,
        age: true,
      },
    },
    {
      name: "Registration Form",
      generator: generateRegistrationForm,
      complexity: "extreme",
      usesNonPHI: {
        hospital: true,
        pcpName: true,
        insuranceName: true,
        age: true,
      },
    },
    {
      name: "Referral Letter",
      generator: generateReferralLetter,
      complexity: "medium",
      usesNonPHI: {
        hospital: true,
        attendingName: true,
        pcpName: true,
        diagnosis1: true,
        diagnosis2: true,
        diagnosis3: true,
        medication1: true,
        age: true,
      },
    },
    {
      name: "Pathology Report",
      generator: generatePathologyReport,
      complexity: "high",
      usesNonPHI: {
        hospital: true,
        surgeonName: true,
        pathologistName: true,
        diagnosis1: true,
        age: true,
      },
    },
    {
      name: "Insurance EOB",
      generator: generateInsuranceDocument,
      complexity: "high",
      usesNonPHI: {
        hospital: true,
        attendingName: true,
        diagnosis1: true,
        insuranceName: true,
        // Note: age is NOT in Insurance EOB template
      },
    },
  ],
};
