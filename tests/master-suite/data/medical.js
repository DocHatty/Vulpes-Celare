/**
 * MASTER TEST SUITE - Medical Data
 * Medical terms that should NOT be redacted (non-PHI)
 */

// Diagnoses - extensive list
const DIAGNOSES = [
  // Cardiovascular
  "Hypertension", "Essential Hypertension", "Secondary Hypertension",
  "Coronary Artery Disease", "Acute Myocardial Infarction", "STEMI", "NSTEMI",
  "Congestive Heart Failure", "Heart Failure with Reduced EF", "Heart Failure with Preserved EF",
  "Atrial Fibrillation", "Atrial Flutter", "Ventricular Tachycardia", "Supraventricular Tachycardia",
  "Cardiomyopathy", "Dilated Cardiomyopathy", "Hypertrophic Cardiomyopathy",
  "Mitral Valve Prolapse", "Aortic Stenosis", "Mitral Regurgitation",
  "Deep Vein Thrombosis", "Pulmonary Embolism", "Peripheral Artery Disease",
  "Aortic Aneurysm", "Carotid Artery Stenosis", "Endocarditis", "Pericarditis",
  
  // Endocrine
  "Type 1 Diabetes Mellitus", "Type 2 Diabetes Mellitus", "Diabetic Ketoacidosis",
  "Hypoglycemia", "Hyperglycemia", "Prediabetes", "Metabolic Syndrome",
  "Hypothyroidism", "Hyperthyroidism", "Graves Disease", "Hashimoto Thyroiditis",
  "Thyroid Nodule", "Thyroid Cancer", "Cushing Syndrome", "Addison Disease",
  "Hyperlipidemia", "Hypercholesterolemia", "Hypertriglyceridemia",
  "Obesity", "Morbid Obesity", "PCOS",
  
  // Pulmonary
  "COPD", "Chronic Obstructive Pulmonary Disease", "Emphysema", "Chronic Bronchitis",
  "Asthma", "Acute Asthma Exacerbation", "Status Asthmaticus",
  "Community-Acquired Pneumonia", "Hospital-Acquired Pneumonia", "Aspiration Pneumonia",
  "Pulmonary Fibrosis", "Idiopathic Pulmonary Fibrosis", "Interstitial Lung Disease",
  "Pleural Effusion", "Pneumothorax", "Hemothorax", "Pulmonary Hypertension",
  "Sleep Apnea", "Obstructive Sleep Apnea", "Central Sleep Apnea",
  "Lung Cancer", "Non-Small Cell Lung Cancer", "Small Cell Lung Cancer",
  
  // Gastrointestinal
  "GERD", "Gastroesophageal Reflux Disease", "Barrett Esophagus",
  "Peptic Ulcer Disease", "Gastric Ulcer", "Duodenal Ulcer", "H. pylori Infection",
  "Gastritis", "Gastroparesis", "Esophagitis", "Esophageal Varices",
  "Cirrhosis", "Hepatic Encephalopathy", "Portal Hypertension", "Ascites",
  "Hepatitis A", "Hepatitis B", "Hepatitis C", "Alcoholic Liver Disease", "NAFLD",
  "Pancreatitis", "Acute Pancreatitis", "Chronic Pancreatitis",
  "Crohn Disease", "Ulcerative Colitis", "Inflammatory Bowel Disease",
  "Diverticulitis", "Diverticulosis", "Appendicitis", "Cholecystitis",
  "Cholelithiasis", "Choledocholithiasis", "Cholangitis",
  "Colon Cancer", "Colorectal Cancer", "Rectal Cancer", "Gastric Cancer",
  "Celiac Disease", "IBS", "Irritable Bowel Syndrome",
  
  // Renal/Urologic
  "Chronic Kidney Disease", "CKD Stage 3", "CKD Stage 4", "CKD Stage 5",
  "Acute Kidney Injury", "End Stage Renal Disease", "Nephrotic Syndrome",
  "Urinary Tract Infection", "Pyelonephritis", "Cystitis",
  "Kidney Stone", "Nephrolithiasis", "Ureterolithiasis",
  "Benign Prostatic Hyperplasia", "BPH", "Prostate Cancer",
  "Bladder Cancer", "Renal Cell Carcinoma", "Glomerulonephritis",
  
  // Neurologic
  "Stroke", "Ischemic Stroke", "Hemorrhagic Stroke", "TIA",
  "Epilepsy", "Seizure Disorder", "Status Epilepticus",
  "Multiple Sclerosis", "Parkinson Disease", "Alzheimer Disease",
  "Dementia", "Vascular Dementia", "Lewy Body Dementia",
  "Migraine", "Migraine with Aura", "Migraine without Aura", "Tension Headache",
  "Trigeminal Neuralgia", "Bell Palsy", "Carpal Tunnel Syndrome",
  "Peripheral Neuropathy", "Diabetic Neuropathy", "Guillain-Barre Syndrome",
  "Myasthenia Gravis", "ALS", "Amyotrophic Lateral Sclerosis",
  "Brain Tumor", "Glioblastoma", "Meningioma", "Pituitary Adenoma",
  
  // Psychiatric
  "Major Depressive Disorder", "Persistent Depressive Disorder", "Bipolar Disorder",
  "Generalized Anxiety Disorder", "Panic Disorder", "Social Anxiety Disorder",
  "PTSD", "Post-Traumatic Stress Disorder", "OCD", "Obsessive-Compulsive Disorder",
  "Schizophrenia", "Schizoaffective Disorder", "Psychosis",
  "ADHD", "Attention Deficit Hyperactivity Disorder", "Autism Spectrum Disorder",
  "Anorexia Nervosa", "Bulimia Nervosa", "Binge Eating Disorder",
  "Substance Use Disorder", "Alcohol Use Disorder", "Opioid Use Disorder",
  
  // Musculoskeletal
  "Osteoarthritis", "Rheumatoid Arthritis", "Psoriatic Arthritis", "Gout",
  "Osteoporosis", "Osteopenia", "Pathologic Fracture",
  "Chronic Low Back Pain", "Lumbar Radiculopathy", "Sciatica",
  "Cervical Radiculopathy", "Cervical Spondylosis", "Spinal Stenosis",
  "Rotator Cuff Tear", "ACL Tear", "Meniscus Tear",
  "Fibromyalgia", "Systemic Lupus Erythematosus", "Scleroderma",
  "Polymyalgia Rheumatica", "Giant Cell Arteritis", "Ankylosing Spondylitis",
  
  // Infectious
  "Sepsis", "Severe Sepsis", "Septic Shock", "Bacteremia",
  "Cellulitis", "Abscess", "Osteomyelitis", "Endocarditis",
  "Meningitis", "Encephalitis", "COVID-19", "Influenza",
  "HIV", "AIDS", "Tuberculosis", "Pneumocystis Pneumonia",
  "MRSA Infection", "C. diff Infection", "VRE Infection",
  
  // Hematologic/Oncologic
  "Anemia", "Iron Deficiency Anemia", "B12 Deficiency", "Folate Deficiency",
  "Sickle Cell Disease", "Thalassemia", "Polycythemia Vera",
  "Leukemia", "Acute Myeloid Leukemia", "Chronic Lymphocytic Leukemia",
  "Lymphoma", "Hodgkin Lymphoma", "Non-Hodgkin Lymphoma",
  "Multiple Myeloma", "Myelodysplastic Syndrome", "Aplastic Anemia",
  "Breast Cancer", "Lung Cancer", "Prostate Cancer", "Colon Cancer",
  "Pancreatic Cancer", "Ovarian Cancer", "Cervical Cancer", "Uterine Cancer",
  "Melanoma", "Basal Cell Carcinoma", "Squamous Cell Carcinoma"
];

// Procedures - extensive list
const PROCEDURES = [
  // Imaging
  "CT Scan", "CT Scan of Chest", "CT Scan of Abdomen", "CT Scan of Head",
  "CT Angiography", "CTA of Chest", "CTA of Coronary Arteries",
  "MRI", "MRI of Brain", "MRI of Spine", "MRI of Knee", "MRI of Shoulder",
  "MRA", "MRA of Head and Neck", "MRCP",
  "X-Ray", "Chest X-Ray", "Abdominal X-Ray", "KUB",
  "Ultrasound", "Abdominal Ultrasound", "Pelvic Ultrasound", "Renal Ultrasound",
  "Echocardiogram", "Transthoracic Echo", "Transesophageal Echo",
  "PET Scan", "PET-CT", "Bone Scan", "V/Q Scan",
  "Mammogram", "Breast Ultrasound", "Breast MRI",
  "DEXA Scan", "Bone Density Scan",
  
  // Cardiac
  "Cardiac Catheterization", "Coronary Angiography", "PCI", "Angioplasty",
  "CABG", "Coronary Artery Bypass Grafting", "Valve Replacement",
  "Pacemaker Insertion", "ICD Implantation", "Cardiac Ablation",
  "Stress Test", "Nuclear Stress Test", "Exercise Stress Test",
  "Holter Monitor", "Event Monitor", "Loop Recorder Implantation",
  
  // GI
  "Colonoscopy", "Upper Endoscopy", "EGD", "ERCP", "Capsule Endoscopy",
  "Flexible Sigmoidoscopy", "Liver Biopsy", "Paracentesis",
  "Cholecystectomy", "Appendectomy", "Hernia Repair",
  "Gastric Bypass", "Sleeve Gastrectomy", "Lap Band",
  "Colectomy", "Bowel Resection", "Whipple Procedure",
  
  // Orthopedic
  "Total Knee Replacement", "Total Hip Replacement", "Shoulder Replacement",
  "ACL Reconstruction", "Rotator Cuff Repair", "Meniscectomy",
  "Spinal Fusion", "Laminectomy", "Discectomy", "Vertebroplasty",
  "Carpal Tunnel Release", "Trigger Finger Release",
  "ORIF", "Open Reduction Internal Fixation", "Joint Aspiration",
  
  // Pulmonary
  "Bronchoscopy", "Thoracentesis", "Chest Tube Placement",
  "Pulmonary Function Test", "PFT", "Spirometry",
  "Lobectomy", "Pneumonectomy", "VATS", "Pleurodesis",
  
  // Neurologic
  "Lumbar Puncture", "Spinal Tap", "EMG", "Nerve Conduction Study",
  "EEG", "Electroencephalogram", "Brain Biopsy",
  "Craniotomy", "VP Shunt Placement", "Deep Brain Stimulation",
  "Carotid Endarterectomy", "Thrombectomy",
  
  // Urologic
  "Cystoscopy", "Ureteroscopy", "TURP", "Prostatectomy",
  "Nephrectomy", "Kidney Transplant", "Lithotripsy",
  "Bladder Biopsy", "Prostate Biopsy",
  
  // Other
  "Dialysis", "Hemodialysis", "Peritoneal Dialysis",
  "Central Line Placement", "PICC Line Placement", "Port Placement",
  "Intubation", "Mechanical Ventilation", "Tracheostomy",
  "Thyroidectomy", "Parathyroidectomy", "Adrenalectomy",
  "Mastectomy", "Lumpectomy", "Sentinel Node Biopsy",
  "Hysterectomy", "Oophorectomy", "C-Section", "D&C",
  "Skin Biopsy", "Excisional Biopsy", "Mohs Surgery",
  "Cataract Surgery", "LASIK", "Vitrectomy"
];

// Medications - extensive list
const MEDICATIONS = [
  // Cardiovascular
  "Lisinopril", "Enalapril", "Ramipril", "Benazepril", "Captopril",
  "Losartan", "Valsartan", "Irbesartan", "Olmesartan", "Telmisartan",
  "Amlodipine", "Nifedipine", "Diltiazem", "Verapamil",
  "Metoprolol", "Atenolol", "Carvedilol", "Propranolol", "Bisoprolol",
  "Hydrochlorothiazide", "Chlorthalidone", "Furosemide", "Bumetanide", "Torsemide",
  "Spironolactone", "Eplerenone", "Triamterene",
  "Atorvastatin", "Rosuvastatin", "Simvastatin", "Pravastatin", "Lovastatin",
  "Warfarin", "Apixaban", "Rivaroxaban", "Dabigatran", "Edoxaban",
  "Aspirin", "Clopidogrel", "Prasugrel", "Ticagrelor",
  "Amiodarone", "Flecainide", "Sotalol", "Dronedarone",
  "Nitroglycerin", "Isosorbide Mononitrate", "Isosorbide Dinitrate",
  "Digoxin", "Hydralazine", "Minoxidil",
  
  // Diabetes
  "Metformin", "Glipizide", "Glyburide", "Glimepiride",
  "Sitagliptin", "Saxagliptin", "Linagliptin", "Alogliptin",
  "Pioglitazone", "Rosiglitazone",
  "Empagliflozin", "Dapagliflozin", "Canagliflozin",
  "Liraglutide", "Semaglutide", "Dulaglutide", "Exenatide",
  "Insulin Glargine", "Insulin Detemir", "Insulin Degludec",
  "Insulin Lispro", "Insulin Aspart", "Insulin Glulisine",
  "NPH Insulin", "Regular Insulin",
  
  // Psychiatric
  "Sertraline", "Escitalopram", "Fluoxetine", "Paroxetine", "Citalopram",
  "Venlafaxine", "Duloxetine", "Desvenlafaxine",
  "Bupropion", "Mirtazapine", "Trazodone",
  "Amitriptyline", "Nortriptyline", "Doxepin",
  "Aripiprazole", "Quetiapine", "Olanzapine", "Risperidone", "Ziprasidone",
  "Lithium", "Valproic Acid", "Lamotrigine", "Carbamazepine",
  "Alprazolam", "Lorazepam", "Clonazepam", "Diazepam",
  "Zolpidem", "Eszopiclone", "Ramelteon", "Suvorexant",
  "Methylphenidate", "Amphetamine", "Lisdexamfetamine", "Atomoxetine",
  
  // Pain/Neuro
  "Gabapentin", "Pregabalin", "Topiramate",
  "Tramadol", "Oxycodone", "Hydrocodone", "Morphine", "Fentanyl",
  "Acetaminophen", "Ibuprofen", "Naproxen", "Meloxicam", "Celecoxib",
  "Sumatriptan", "Rizatriptan", "Eletriptan", "Zolmitriptan",
  "Levetiracetam", "Phenytoin", "Oxcarbazepine", "Lacosamide",
  "Levodopa-Carbidopa", "Pramipexole", "Ropinirole", "Rasagiline",
  "Donepezil", "Memantine", "Rivastigmine", "Galantamine",
  
  // GI
  "Omeprazole", "Pantoprazole", "Esomeprazole", "Lansoprazole", "Rabeprazole",
  "Famotidine", "Ranitidine",
  "Ondansetron", "Promethazine", "Metoclopramide", "Prochlorperazine",
  "Lactulose", "Polyethylene Glycol", "Docusate", "Bisacodyl",
  "Loperamide", "Diphenoxylate-Atropine",
  "Mesalamine", "Sulfasalazine", "Infliximab", "Adalimumab",
  
  // Respiratory
  "Albuterol", "Levalbuterol", "Ipratropium", "Tiotropium",
  "Fluticasone", "Budesonide", "Beclomethasone", "Mometasone",
  "Montelukast", "Zafirlukast",
  "Prednisone", "Methylprednisolone", "Dexamethasone", "Hydrocortisone",
  "Benzonatate", "Dextromethorphan", "Guaifenesin",
  
  // Antibiotics
  "Amoxicillin", "Amoxicillin-Clavulanate", "Ampicillin", "Penicillin VK",
  "Cephalexin", "Cefdinir", "Ceftriaxone", "Cefepime",
  "Azithromycin", "Clarithromycin", "Erythromycin",
  "Doxycycline", "Minocycline", "Tetracycline",
  "Ciprofloxacin", "Levofloxacin", "Moxifloxacin",
  "Trimethoprim-Sulfamethoxazole", "Nitrofurantoin",
  "Metronidazole", "Clindamycin", "Vancomycin",
  
  // Thyroid
  "Levothyroxine", "Liothyronine", "Methimazole", "Propylthiouracil",
  
  // Other
  "Allopurinol", "Febuxostat", "Colchicine",
  "Methotrexate", "Hydroxychloroquine", "Sulfasalazine",
  "Finasteride", "Tamsulosin", "Alfuzosin", "Silodosin"
];

// Hospital names (NOT PHI - should not be redacted)
const HOSPITALS = [
  // Generic types
  "Memorial Hospital", "St. Mary's Medical Center", "University Hospital",
  "Regional Medical Center", "Community General Hospital", "Sacred Heart Hospital",
  "Presbyterian Hospital", "Baptist Medical Center", "Methodist Hospital",
  "Children's Hospital", "Veterans Affairs Medical Center", "County General Hospital",
  
  // Famous named hospitals
  "Mount Sinai Hospital", "Johns Hopkins Hospital", "Mayo Clinic",
  "Cleveland Clinic", "Massachusetts General Hospital", "Cedars-Sinai Medical Center",
  "Duke University Hospital", "Stanford Health Care", "UCSF Medical Center",
  "Northwestern Memorial Hospital", "NYU Langone Health", "Emory University Hospital",
  "Vanderbilt University Medical Center", "UCLA Medical Center", "Penn Medicine",
  "Brigham and Women's Hospital", "Beth Israel Deaconess", "NewYork-Presbyterian",
  "Houston Methodist", "Baylor University Medical Center", "UT Southwestern",
  "Memorial Sloan Kettering", "MD Anderson Cancer Center", "Dana-Farber Cancer Institute",
  "Children's Hospital of Philadelphia", "Boston Children's Hospital",
  "Seattle Children's Hospital", "Nationwide Children's Hospital",
  "Rush University Medical Center", "Advocate Christ Medical Center",
  "Providence Health", "Kaiser Permanente", "Ascension Health",
  "HCA Healthcare", "CommonSpirit Health", "Trinity Health"
];

// Medical specialties (NOT PHI)
const SPECIALTIES = [
  "Internal Medicine", "Family Medicine", "Pediatrics", "Geriatrics",
  "Cardiology", "Pulmonology", "Gastroenterology", "Nephrology",
  "Neurology", "Psychiatry", "Endocrinology", "Rheumatology",
  "Infectious Disease", "Oncology", "Hematology", "Dermatology",
  "Ophthalmology", "Otolaryngology", "Urology", "Obstetrics and Gynecology",
  "General Surgery", "Orthopedic Surgery", "Neurosurgery", "Cardiothoracic Surgery",
  "Vascular Surgery", "Plastic Surgery", "Trauma Surgery",
  "Anesthesiology", "Radiology", "Pathology", "Emergency Medicine",
  "Critical Care Medicine", "Palliative Care", "Physical Medicine and Rehabilitation",
  "Allergy and Immunology", "Sports Medicine", "Pain Management"
];

module.exports = {
  DIAGNOSES,
  PROCEDURES,
  MEDICATIONS,
  HOSPITALS,
  SPECIALTIES
};
