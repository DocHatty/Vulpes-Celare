import {
    generateName,
    generateDate,
    generateMRN,
    generateSSN,
    generatePhone,
    generateAddress,
    generateEmail,
    applyErrors,
} from "./generators";

export function generateProgressNote(docId: any, errorLevel: string) {
    const patient = generateName("last_first_middle");
    const provider = generateName("titled");
    const dob = generateDate();
    const visitDate = generateDate();
    const mrn = generateMRN();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const providerErr = applyErrors(provider, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const visitErr = applyErrors(visitDate, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: provider,
        value: providerErr.text,
        hasErrors: providerErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: visitDate,
        value: visitErr.text,
        hasErrors: visitErr.hasErrors,
    });
    expectedPHI.push({
        type: "MRN",
        original: mrn,
        value: mrn,
        hasErrors: false,
    });

    const text = `PROGRESS NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
MRN: ${mrn}
VISIT DATE: ${visitErr.text}

SUBJECTIVE:
Patient presents for follow-up. Reports feeling better overall.

OBJECTIVE:
Vitals stable. Physical exam unremarkable.

ASSESSMENT/PLAN:
Continue current medications. Follow up in 4 weeks.

Signed: ${providerErr.text}`;

    return {
        docId,
        type: "Progress Note",
        text,
        expectedPHI,
        expectedNonPHI: ["subjective", "objective"],
        errorLevel,
    };
}


export function generateLabReport(docId: any, errorLevel: string) {
    const patient = generateName("last_first");
    const provider = generateName("titled");
    const dob = generateDate();
    const collectionDate = generateDate();
    const ssn = generateSSN();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const providerErr = applyErrors(provider, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const collErr = applyErrors(collectionDate, errorLevel);
    const ssnErr = applyErrors(ssn, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: provider,
        value: providerErr.text,
        hasErrors: providerErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: collectionDate,
        value: collErr.text,
        hasErrors: collErr.hasErrors,
    });
    expectedPHI.push({
        type: "SSN",
        original: ssn,
        value: ssnErr.text,
        hasErrors: ssnErr.hasErrors,
    });

    const text = `LABORATORY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
SSN: ${ssnErr.text}
COLLECTION DATE: ${collErr.text}

COMPLETE BLOOD COUNT:
WBC: 7.2 x10^9/L (4.5-11.0)
RBC: 4.8 x10^12/L (4.2-5.4)
Hemoglobin: 14.2 g/dL (12.0-16.0)
Hematocrit: 42% (36-46)
Platelets: 245 x10^9/L (150-400)

ORDERING PHYSICIAN: ${providerErr.text}`;

    return {
        docId,
        type: "Lab Report",
        text,
        expectedPHI,
        expectedNonPHI: ["hemoglobin", "platelets"],
        errorLevel,
    };
}

export function generateRadiologyReport(docId: any, errorLevel: string) {
    const patient = generateName("full_middle");
    const radiologist = generateName("titled_suffix");
    const referring = generateName("titled");
    const dob = generateDate();
    const examDate = generateDate();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const radErr = applyErrors(radiologist, errorLevel);
    const refErr = applyErrors(referring, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const examErr = applyErrors(examDate, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: radiologist,
        value: radErr.text,
        hasErrors: radErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: referring,
        value: refErr.text,
        hasErrors: refErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: examDate,
        value: examErr.text,
        hasErrors: examErr.hasErrors,
    });

    const text = `RADIOLOGY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
EXAM DATE: ${examErr.text}

REFERRING PHYSICIAN: ${refErr.text}
RADIOLOGIST: ${radErr.text}

EXAMINATION: CT Chest with contrast

FINDINGS:
Lungs are clear. No focal consolidation. Heart size normal.
No pleural effusion. Mediastinum unremarkable.

IMPRESSION:
Normal CT chest.`;

    return {
        docId,
        type: "Radiology Report",
        text,
        expectedPHI,
        expectedNonPHI: ["lungs", "mediastinum"],
        errorLevel,
    };
}

export function generateDischargeSummary(docId: any, errorLevel: string) {
    const patient = generateName("last_first_middle");
    const attending = generateName("titled_suffix");
    const dob = generateDate();
    const admitDate = generateDate();
    const dischargeDate = generateDate();
    const ssn = generateSSN();
    const phone = generatePhone();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const attendErr = applyErrors(attending, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const admitErr = applyErrors(admitDate, errorLevel);
    const dischErr = applyErrors(dischargeDate, errorLevel);
    const ssnErr = applyErrors(ssn, errorLevel);
    const phoneErr = applyErrors(phone, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: attending,
        value: attendErr.text,
        hasErrors: attendErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: admitDate,
        value: admitErr.text,
        hasErrors: admitErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dischargeDate,
        value: dischErr.text,
        hasErrors: dischErr.hasErrors,
    });
    expectedPHI.push({
        type: "SSN",
        original: ssn,
        value: ssnErr.text,
        hasErrors: ssnErr.hasErrors,
    });
    expectedPHI.push({
        type: "PHONE",
        original: phone,
        value: phoneErr.text,
        hasErrors: phoneErr.hasErrors,
    });

    const text = `DISCHARGE SUMMARY

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
SSN: ${ssnErr.text}
PHONE: ${phoneErr.text}

ADMISSION DATE: ${admitErr.text}
DISCHARGE DATE: ${dischErr.text}
ATTENDING: ${attendErr.text}

PRINCIPAL DIAGNOSIS: Community-acquired pneumonia

HOSPITAL COURSE:
Patient admitted with fever and cough. Chest X-ray showed infiltrate.
Started on IV antibiotics. Improved over 3 days. Discharged home.

DISCHARGE MEDICATIONS:
1. Amoxicillin 500mg TID x 7 days
2. Acetaminophen PRN

FOLLOW-UP: PCP in 1 week`;

    return {
        docId,
        type: "Discharge Summary",
        text,
        expectedPHI,
        expectedNonPHI: ["pneumonia", "antibiotics"],
        errorLevel,
    };
}

export function generateEmergencyNote(docId: any, errorLevel: string) {
    const patient = generateName("first_last");
    const epProvider = generateName("titled");
    const dob = generateDate();
    const visitDate = generateDate();
    const phone = generatePhone("dashes");

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const provErr = applyErrors(epProvider, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const visitErr = applyErrors(visitDate, errorLevel);
    const phoneErr = applyErrors(phone, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: epProvider,
        value: provErr.text,
        hasErrors: provErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: visitDate,
        value: visitErr.text,
        hasErrors: visitErr.hasErrors,
    });
    expectedPHI.push({
        type: "PHONE",
        original: phone,
        value: phoneErr.text,
        hasErrors: phoneErr.hasErrors,
    });

    const text = `EMERGENCY DEPARTMENT NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${visitErr.text}
CALLBACK: ${phoneErr.text}

CHIEF COMPLAINT: Chest pain

HPI: Patient presents with 2 hours of substernal chest pain.

EXAM: Alert, vitals stable. Lungs clear. Heart regular.

WORKUP: EKG normal. Troponin negative.

DISPOSITION: Discharged home with cardiology follow-up.

PROVIDER: ${provErr.text}`;

    return {
        docId,
        type: "Emergency Note",
        text,
        expectedPHI,
        expectedNonPHI: ["chest pain", "troponin"],
        errorLevel,
    };
}

export function generateOperativeReport(docId: any, errorLevel: string) {
    const patient = generateName("last_first");
    const surgeon = generateName("titled_suffix");
    const anesthesia = generateName("titled");
    const dob = generateDate();
    const surgDate = generateDate();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const surgErr = applyErrors(surgeon, errorLevel);
    const anesthErr = applyErrors(anesthesia, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const surgDateErr = applyErrors(surgDate, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: surgeon,
        value: surgErr.text,
        hasErrors: surgErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: anesthesia,
        value: anesthErr.text,
        hasErrors: anesthErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: surgDate,
        value: surgDateErr.text,
        hasErrors: surgDateErr.hasErrors,
    });

    const text = `OPERATIVE REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE OF SURGERY: ${surgDateErr.text}

SURGEON: ${surgErr.text}
ANESTHESIOLOGIST: ${anesthErr.text}

PROCEDURE: Laparoscopic cholecystectomy

FINDINGS: Chronically inflamed gallbladder with stones.

PROCEDURE DETAILS:
General anesthesia induced. Abdomen prepped. Pneumoperitoneum established.
Gallbladder dissected and removed. Hemostasis confirmed.

EBL: Minimal
COMPLICATIONS: None`;

    return {
        docId,
        type: "Operative Report",
        text,
        expectedPHI,
        expectedNonPHI: ["cholecystectomy", "hemostasis"],
        errorLevel,
    };
}

export function generatePrescription(docId: any, errorLevel: string) {
    const patient = generateName("last_first_middle");
    const prescriber = generateName("titled_suffix");
    const dob = generateDate();
    const rxDate = generateDate();
    const phone = generatePhone();
    const address = generateAddress();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const prescriberErr = applyErrors(prescriber, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const rxErr = applyErrors(rxDate, errorLevel);
    const phoneErr = applyErrors(phone, errorLevel);
    const addrErr = applyErrors(address, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: prescriber,
        value: prescriberErr.text,
        hasErrors: prescriberErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: rxDate,
        value: rxErr.text,
        hasErrors: rxErr.hasErrors,
    });
    expectedPHI.push({
        type: "PHONE",
        original: phone,
        value: phoneErr.text,
        hasErrors: phoneErr.hasErrors,
    });
    expectedPHI.push({
        type: "ADDRESS",
        original: address,
        value: addrErr.text,
        hasErrors: addrErr.hasErrors,
    });

    const text = `PRESCRIPTION

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
ADDRESS: ${addrErr.text}
PHONE: ${phoneErr.text}

DATE: ${rxErr.text}

Rx: Lisinopril 10mg
Sig: Take one tablet daily
Disp: #30
Refills: 3

PRESCRIBER: ${prescriberErr.text}`;

    return {
        docId,
        type: "Prescription",
        text,
        expectedPHI,
        expectedNonPHI: ["lisinopril"],
        errorLevel,
    };
}

export function generateConsultNote(docId: any, errorLevel: string) {
    const patient = generateName("full_middle");
    const consultant = generateName("titled_suffix");
    const referring = generateName("titled");
    const dob = generateDate();
    const consultDate = generateDate();
    const email = generateEmail();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const consultErr = applyErrors(consultant, errorLevel);
    const refErr = applyErrors(referring, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const dateErr = applyErrors(consultDate, errorLevel);
    const emailErr = applyErrors(email, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: consultant,
        value: consultErr.text,
        hasErrors: consultErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: referring,
        value: refErr.text,
        hasErrors: refErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: consultDate,
        value: dateErr.text,
        hasErrors: dateErr.hasErrors,
    });
    expectedPHI.push({
        type: "EMAIL",
        original: email,
        value: emailErr.text,
        hasErrors: emailErr.hasErrors,
    });

    const text = `CONSULTATION NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${dateErr.text}
EMAIL: ${emailErr.text}

REFERRING: ${refErr.text}
CONSULTANT: ${consultErr.text}

REASON: Evaluation for rheumatoid arthritis

ASSESSMENT: Seropositive RA with active disease.

RECOMMENDATIONS:
1. Start methotrexate 15mg weekly
2. Follow-up in 6 weeks`;

    return {
        docId,
        type: "Consultation Note",
        text,
        expectedPHI,
        expectedNonPHI: ["rheumatoid arthritis", "methotrexate"],
        errorLevel,
    };
}

export function generateNursingAssessment(docId: any, errorLevel: string) {
    const patient = generateName("last_first");
    const nurse = generateName("with_suffix");
    const supervisor = generateName("titled_short");
    const dob = generateDate();
    const assessDate = generateDate();
    const phone = generatePhone("spaces");

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const nurseErr = applyErrors(nurse, errorLevel);
    const supErr = applyErrors(supervisor, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const assessErr = applyErrors(assessDate, errorLevel);
    const phoneErr = applyErrors(phone, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: nurse,
        value: nurseErr.text,
        hasErrors: nurseErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: supervisor,
        value: supErr.text,
        hasErrors: supErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: assessDate,
        value: assessErr.text,
        hasErrors: assessErr.hasErrors,
    });
    expectedPHI.push({
        type: "PHONE",
        original: phone,
        value: phoneErr.text,
        hasErrors: phoneErr.hasErrors,
    });

    const text = `NURSING ASSESSMENT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${assessErr.text}
PHONE: ${phoneErr.text}

NURSE: ${nurseErr.text}
SUPERVISOR: ${supErr.text}

VITALS: BP 128/82, HR 76, Temp 98.6F, RR 16, SpO2 98%

ASSESSMENT:
Fall risk: Low
Pain: 3/10
Skin: Intact

PLAN: Continue monitoring. Ambulate TID.`;

    return {
        docId,
        type: "Nursing Assessment",
        text,
        expectedPHI,
        expectedNonPHI: ["fall risk", "vitals"],
        errorLevel,
    };
}

export function generatePathologyReport(docId: any, errorLevel: string) {
    const patient = generateName("last_first_middle");
    const pathologist = generateName("titled_suffix");
    const surgeon = generateName("titled");
    const dob = generateDate();
    const collDate = generateDate();

    const expectedPHI: any[] = [];
    const patientErr = applyErrors(patient, errorLevel);
    const pathErr = applyErrors(pathologist, errorLevel);
    const surgErr = applyErrors(surgeon, errorLevel);
    const dobErr = applyErrors(dob, errorLevel);
    const collErr = applyErrors(collDate, errorLevel);

    expectedPHI.push({
        type: "NAME",
        original: patient,
        value: patientErr.text,
        hasErrors: patientErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: pathologist,
        value: pathErr.text,
        hasErrors: pathErr.hasErrors,
    });
    expectedPHI.push({
        type: "NAME",
        original: surgeon,
        value: surgErr.text,
        hasErrors: surgErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: dob,
        value: dobErr.text,
        hasErrors: dobErr.hasErrors,
    });
    expectedPHI.push({
        type: "DATE",
        original: collDate,
        value: collErr.text,
        hasErrors: collErr.hasErrors,
    });

    const text = `PATHOLOGY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
COLLECTION DATE: ${collErr.text}

SURGEON: ${surgErr.text}
PATHOLOGIST: ${pathErr.text}

SPECIMEN: Gallbladder

GROSS: Gallbladder measures 8.5 x 3.2 cm. Multiple stones present.

MICROSCOPIC: Chronic cholecystitis. No malignancy.

DIAGNOSIS: Chronic cholecystitis with cholelithiasis.`;

    return {
        docId,
        type: "Pathology Report",
        text,
        expectedPHI,
        expectedNonPHI: ["cholecystitis", "malignancy"],
        errorLevel,
    };
}

export function generateEdgeCases() {
    const docs: any[] = [];

    // Edge case 1: Name with apostrophe
    docs.push({
        docId: 9001,
        type: "Edge Case - Apostrophe Name",
        text: `Patient: O'Brien, Mary\nDOB: 03/15/1980\nProvider: Dr. O'Connor`,
        expectedPHI: [
            {
                type: "NAME",
                original: "O'Brien, Mary",
                value: "O'Brien, Mary",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "Dr. O'Connor",
                value: "Dr. O'Connor",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "03/15/1980",
                value: "03/15/1980",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 2: Name with hyphen
    docs.push({
        docId: 9002,
        type: "Edge Case - Hyphenated Name",
        text: `Patient: Garcia-Martinez, Juan Carlos\nDOB: 07/22/1975`,
        expectedPHI: [
            {
                type: "NAME",
                original: "Garcia-Martinez, Juan Carlos",
                value: "Garcia-Martinez, Juan Carlos",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "07/22/1975",
                value: "07/22/1975",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 3: Multiple credentials
    docs.push({
        docId: 9003,
        type: "Edge Case - Multiple Credentials",
        text: `Attending: Dr. Sarah Johnson, MD, PhD, FACS\nConsultant: Prof. Michael Chen, DO, MPH`,
        expectedPHI: [
            {
                type: "NAME",
                original: "Dr. Sarah Johnson, MD, PhD, FACS",
                value: "Dr. Sarah Johnson, MD, PhD, FACS",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "Prof. Michael Chen, DO, MPH",
                value: "Prof. Michael Chen, DO, MPH",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 4: International phone format
    docs.push({
        docId: 9004,
        type: "Edge Case - International Phone",
        text: `Patient contact: +1 (555) 123-4567\nAlternate: +44 20 7946 0958\nEmergency: 1-800-555-0199`,
        expectedPHI: [
            {
                type: "PHONE",
                original: "+1 (555) 123-4567",
                value: "+1 (555) 123-4567",
                hasErrors: false,
            },
            {
                type: "PHONE",
                original: "+44 20 7946 0958",
                value: "+44 20 7946 0958",
                hasErrors: false,
            },
            {
                type: "PHONE",
                original: "1-800-555-0199",
                value: "1-800-555-0199",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 5: Various date formats
    docs.push({
        docId: 9005,
        type: "Edge Case - Date Formats",
        text: `DOB: 03/15/1980\nAdmit: March 15, 2024\nDischarge: 15-Mar-2024\nFollow-up: 2024-03-22`,
        expectedPHI: [
            {
                type: "DATE",
                original: "03/15/1980",
                value: "03/15/1980",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "March 15, 2024",
                value: "March 15, 2024",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "15-Mar-2024",
                value: "15-Mar-2024",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "2024-03-22",
                value: "2024-03-22",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 6: Email variations
    docs.push({
        docId: 9006,
        type: "Edge Case - Email Formats",
        text: `Patient email: john.doe@gmail.com\nProvider: dr.smith@hospital.org\nContact: mary_jones123@yahoo.co.uk`,
        expectedPHI: [
            {
                type: "EMAIL",
                original: "john.doe@gmail.com",
                value: "john.doe@gmail.com",
                hasErrors: false,
            },
            {
                type: "EMAIL",
                original: "dr.smith@hospital.org",
                value: "dr.smith@hospital.org",
                hasErrors: false,
            },
            {
                type: "EMAIL",
                original: "mary_jones123@yahoo.co.uk",
                value: "mary_jones123@yahoo.co.uk",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 7: PHI adjacent to structure words (the "PHILIP" problem)
    docs.push({
        docId: 9007,
        type: "Edge Case - Philip Problem",
        text: `Patient: Philip Parker\nProvider: Dr. Philip Price\nNurse: Philip Phillips, RN`,
        expectedPHI: [
            {
                type: "NAME",
                original: "Philip Parker",
                value: "Philip Parker",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "Dr. Philip Price",
                value: "Dr. Philip Price",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "Philip Phillips, RN",
                value: "Philip Phillips, RN",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 8: ALL CAPS document
    docs.push({
        docId: 9008,
        type: "Edge Case - ALL CAPS",
        text: `PATIENT: JOHNSON, MARY ELIZABETH\nDOB: 04/22/1978\nPROVIDER: DR. ROBERT WILLIAMS`,
        expectedPHI: [
            {
                type: "NAME",
                original: "JOHNSON, MARY ELIZABETH",
                value: "JOHNSON, MARY ELIZABETH",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "04/22/1978",
                value: "04/22/1978",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "DR. ROBERT WILLIAMS",
                value: "DR. ROBERT WILLIAMS",
                hasErrors: false,
            },
        ],
        expectedNonPHI: [],
        errorLevel: "none",
    });

    // Edge case 9: Basic usage example from docs
    docs.push({
        docId: 9009,
        type: "Edge Case - Basic Usage Example",
        text: `RADIOLOGY REPORT

Patient: JOHNSON, MARY ELIZABETH
DOB: 04/22/1978
MRN: 7834921
SSN: 456-78-9012

Referring Physician: Dr. Robert Williams
Exam Date: 11/15/2024

CLINICAL HISTORY:
45-year-old female with chronic back pain.

FINDINGS:
Lumbar spine MRI demonstrates mild degenerative disc disease at L4-L5.`,
        expectedPHI: [
            {
                type: "NAME",
                original: "JOHNSON, MARY ELIZABETH",
                value: "JOHNSON, MARY ELIZABETH",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "04/22/1978",
                value: "04/22/1978",
                hasErrors: false,
            },
            {
                type: "MRN",
                original: "7834921",
                value: "7834921",
                hasErrors: false,
            },
            {
                type: "SSN",
                original: "456-78-9012",
                value: "456-78-9012",
                hasErrors: false,
            },
            {
                type: "NAME",
                original: "Dr. Robert Williams",
                value: "Dr. Robert Williams",
                hasErrors: false,
            },
            {
                type: "DATE",
                original: "11/15/2024",
                value: "11/15/2024",
                hasErrors: false,
            },
        ],
        expectedNonPHI: ["chronic back pain", "degenerative disc disease"],
        errorLevel: "none",
    });

    return docs;
}
