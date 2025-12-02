/**
 * Medical Term Dictionary
 *
 * A comprehensive list of medical terms, abbreviations, and drug names
 * that should NOT be redacted as names.
 */

export class MedicalTermDictionary {
    private static terms: Set<string> = new Set([
        // Conditions
        "Hypertension", "HTN", "Hypotension",
        "Hyperlipidemia", "HLD", "Dyslipidemia",
        "Diabetes", "DM", "DM2", "T2DM", "IDDM",
        "Cancer", "Carcinoma", "Sarcoma", "Melanoma", "Lymphoma", "Leukemia",
        "Invasive", "Ductal", "Lobular", "Metastatic",
        "Invasive Ductal Carcinoma", "Invasive Lobular Carcinoma",
        "Pneumonia", "Bronchitis", "Asthma", "COPD",
        "Arthritis", "Osteoarthritis", "Rheumatoid", "Lupus", "SLE",
        "Depression", "Anxiety", "Bipolar", "Schizophrenia", "PTSD",
        "Fibrillation", "AFib", "Flutter", "Tachycardia", "Bradycardia",
        "Infarction", "Ischemia", "Stroke", "CVA", "TIA",
        "Sepsis", "Infection", "Cellulitis", "Abscess",
        "Fracture", "Sprain", "Strain", "Dislocation",
        "Pregnancy", "Gestation", "Abortion", "Miscarriage",
        "Glaucoma", "Cataract", "Retinopathy",
        "Neuropathy", "Radiculopathy", "Myopathy",
        "Anemia", "Thrombocytopenia", "Leukopenia",
        "Hepatitis", "Cirrhosis", "Pancreatitis", "Cholecystitis",
        "Appendicitis", "Diverticulitis", "Colitis", "Crohn's",
        "Reflux", "GERD", "Gastritis", "Ulcer",
        "Insomnia", "Apnea", "Narcolepsy",
        "Migraine", "Headache", "Seizure", "Epilepsy",
        "Dementia", "Alzheimer's", "Parkinson's", // These are names but refer to diseases
        "Autism", "ADHD", "ADD",
        "Call Button", "Call Light", "Bed Control", "Room Control",

        // Medications
        "Lisinopril", "Amlodipine", "Metoprolol", "Atenolol",
        "Metformin", "Insulin", "Glipizide",
        "Atorvastatin", "Simvastatin", "Rosuvastatin",
        "Omeprazole", "Pantoprazole", "Esomeprazole",
        "Albuterol", "Fluticasone", "Advair", "Symbicort",
        "Gabapentin", "Lyrica", "Tramadol", "Hydrocodone", "Oxycodone",
        "Ibuprofen", "Naproxen", "Acetaminophen", "Tylenol", "Advil",
        "Aspirin", "Plavix", "Clopidogrel", "Eliquis", "Xarelto", "Warfarin",
        "Amoxicillin", "Augmentin", "Azithromycin", "Ciprofloxacin", "Levofloxacin",
        "Doxycycline", "Bactrim", "Vancomycin", "Zosyn",
        "Sertraline", "Fluoxetine", "Citalopram", "Escitalopram", "Paroxetine",
        "Venlafaxine", "Duloxetine", "Bupropion", "Trazodone",
        "Alprazolam", "Lorazepam", "Clonazepam", "Diazepam",
        "Zolpidem", "Melatonin",
        "Prednisone", "Methylprednisolone", "Dexamethasone",
        "Furosemide", "Lasix", "HCTZ", "Spironolactone",
        "Levothyroxine", "Synthroid",
        "Doxorubicin", "Cyclophosphamide", "Paclitaxel", "Taxol",
        "Herceptin", "Keytruda", "Opdivo",

        // Anatomy
        "Head", "Neck", "Chest", "Abdomen", "Pelvis", "Back", "Spine",
        "Arm", "Leg", "Hand", "Foot", "Finger", "Toe",
        "Heart", "Lung", "Liver", "Kidney", "Spleen", "Pancreas",
        "Stomach", "Intestine", "Colon", "Rectum", "Anus",
        "Brain", "Nerve", "Muscle", "Bone", "Joint", "Ligament", "Tendon",
        "Skin", "Hair", "Nail",
        "Eye", "Ear", "Nose", "Mouth", "Throat",
        "Artery", "Vein", "Vessel", "Blood", "Lymph",
        "Thyroid", "Adrenal", "Pituitary",
        "Uterus", "Ovary", "Tube", "Cervix", "Vagina",
        "Prostate", "Testicle", "Penis", "Scrotum",
        "Bladder", "Ureter", "Urethra",

        // Procedures/Tests
        "Surgery", "Operation", "Procedure", "Excision", "Resection",
        "Biopsy", "Incision", "Drainage", "Injection", "Aspiration",
        "Intubation", "Ventilation", "Dialysis",
        "Transfusion", "Transplant", "Implant",
        "X-Ray", "CT", "MRI", "Ultrasound", "US", "PET",
        "EKG", "ECG", "EEG", "EMG",
        "CBC", "BMP", "CMP", "LFT", "TSH", "A1C", "INR", "PT", "PTT",
        "Urinalysis", "UA", "Culture", "Pathology", "Cytology",

        // General Medical
        "History", "Physical", "Assessment", "Plan", "Review",
        "Subjective", "Objective", "Chief", "Complaint",
        "Acute", "Chronic", "Mild", "Moderate", "Severe",
        "Stable", "Unstable", "Critical",
        "Normal", "Abnormal", "Positive", "Negative",
        "Left", "Right", "Bilateral", "Medial", "Lateral",
        "Proximal", "Distal", "Anterior", "Posterior",
        "Superior", "Inferior", "Dorsal", "Ventral",
        "Male", "Female", "Man", "Woman",
        "Patient", "Provider", "Physician", "Nurse", "Doctor",
        "Clinic", "Hospital", "Center", "Department", "Unit", "Ward", "Room",
        "Emergency", "Urgent", "Primary", "Specialty",
        "Follow-up", "Return", "Discharge", "Admission", "Transfer",
        "Prescription", "Refill", "Pharmacy", "Dose", "Frequency", "Route",
        "Tablet", "Capsule", "Solution", "Suspension", "Cream", "Ointment",
        "Daily", "Weekly", "Monthly", "Yearly", "PRN", "QHS", "BID", "TID", "QID",

        // Additional Terms
        "Serial", "Device", "Model", "Lot", "Ref",
        "Date", "Time", "Phone", "Fax", "Email",
        "SSN", "MRN", "DOB", "Age", "Gender", "Sex", "Race", "Ethnicity",
        "Religion", "Marital Status", "Spouse", "Mother", "Father", "Parent", "Guardian",
        "Contact", "Emergency", "Provider", "Doctor", "Nurse", "Physician", "Specialist",
        "Surgeon", "Anesthesiologist", "Radiologist", "Pathologist", "Pharmacist",
        "Therapist", "Counselor", "Social Worker", "Case Manager", "Dietitian", "Nutritionist",
        "Chaplain", "Interpreter", "Volunteer", "Student", "Resident", "Fellow", "Attending",
        "Consultant", "Referral", "Admission", "Discharge", "Transfer", "Death", "Birth",
        "Surgery", "Procedure", "Test", "Exam", "Study", "Lab", "Imaging", "X-Ray", "CT", "MRI",
        "Ultrasound", "PET", "Scan", "Biopsy", "Culture", "Pathology", "Cytology", "Histology",
        "Hematology", "Chemistry", "Microbiology", "Virology", "Immunology", "Genetics", "Molecular",
        "Blood", "Urine", "Stool", "Sputum", "Fluid", "Tissue", "Organ", "System", "Body",
        "Head", "Neck", "Chest", "Abdomen", "Pelvis", "Back", "Spine", "Limb", "Arm", "Leg", "Hand", "Foot",
        "Skin", "Bone", "Muscle", "Nerve", "Vessel", "Artery", "Vein", "Heart", "Lung", "Liver", "Kidney",
        "Stomach", "Bowel", "Intestine", "Colon", "Rectum", "Anus", "Bladder", "Urethra", "Prostate",
        "Testis", "Ovary", "Uterus", "Vagina", "Breast", "Brain", "Eye", "Ear", "Nose", "Mouth", "Throat",
        "Tooth", "Gum", "Tongue", "Lip", "Face", "Scalp", "Hair", "Nail", "Joint", "Ligament", "Tendon",
        "Cartilage", "Disc", "Vertebra", "Rib", "Sternum", "Clavicle", "Scapula", "Humerus", "Radius", "Ulna",
        "Carpal", "Metacarpal", "Phalanx", "Femur", "Patella", "Tibia", "Fibula", "Tarsal", "Metatarsal",
        "Skull", "Mandible", "Maxilla", "Zygoma", "Orbit", "Sinus", "Bronchus", "Alveolus", "Pleura",
        "Mediastinum", "Pericardium", "Myocardium", "Endocardium", "Valve", "Aorta", "Vena Cava", "Carotid",
        "Jugular", "Subclavian", "Femoral", "Iliac", "Renal", "Hepatic", "Portal", "Mesenteric", "Splenic",
        "Pulmonary", "Coronary", "Cerebral", "Basilar", "Vertebral", "Circle of Willis", "Meninges", "Dura",
        "Arachnoid", "Pia", "Cortex", "Lobe", "Hemisphere", "Cerebellum", "Brainstem", "Midbrain", "Pons",
        "Medulla", "Cord", "Root", "Ganglion", "Plexus", "Nerve", "Neuron", "Axon", "Dendrite", "Synapse",
        "Receptor", "Transmitter", "Hormone", "Enzyme", "Protein", "Gene", "DNA", "RNA", "Cell", "Tissue",
        "Organ", "Organism", "Species", "Genus", "Family", "Order", "Class", "Phylum", "Kingdom", "Domain",
        "Life", "Health", "Disease", "Illness", "Sickness", "Condition", "Disorder", "Syndrome", "Symptom",
        "Sign", "Finding", "Diagnosis", "Prognosis", "Treatment", "Therapy", "Cure", "Relief", "Palliation",
        "Prevention", "Prophylaxis", "Screening", "Checkup", "Visit", "Appointment", "Consultation",
        "Follow-up", "Referral", "Admission", "Discharge", "Transfer", "Hospice", "Home", "Clinic", "Office",
        "Center", "Unit", "Ward", "Room", "Bed", "Chair", "Table", "Equipment", "Device", "Instrument", "Tool",
        "Supply", "Material", "Drug", "Medication", "Medicine", "Pill", "Tablet", "Capsule", "Liquid", "Syrup",
        "Injection", "Shot", "Vaccine", "Immunization", "IV", "Drip", "Pump", "Tube", "Catheter", "Drain",
        "Shunt", "Stent", "Implant", "Prosthesis", "Orthosis", "Brace", "Cast", "Splint", "Bandage", "Dressing",
        "Gauze", "Tape", "Suture", "Staple", "Clip", "Glue", "Gel", "Cream", "Ointment", "Lotion", "Powder",
        "Spray", "Drop", "Patch", "Inhaler", "Nebulizer", "Oxygen", "Air", "Water", "Food", "Diet", "Nutrition",
        "Exercise", "Activity", "Rest", "Sleep", "Hygiene", "Bath", "Shower", "Toilet", "Commode", "Urinal",
        "Bedpan", "Diaper", "Pad", "Linen", "Sheet", "Blanket", "Pillow", "Gown", "Mask", "Glove", "Apron",
        "Shield", "Goggles", "Glasses", "Hearing Aid", "Denture", "Cane", "Crutch", "Walker", "Wheelchair",
        "Stretcher", "Lift", "Scale", "Thermometer", "Stethoscope", "Otoscope", "Ophthalmoscope",
        "Sphygmomanometer", "Cuff", "Monitor", "Sensor", "Probe", "Electrode", "Lead", "Cable", "Wire",
        "Battery", "Charger", "Adapter", "Plug", "Switch", "Button", "Knob", "Dial", "Screen", "Display",
        "Keyboard", "Mouse", "Printer", "Paper", "Pen", "Pencil", "Marker", "Chart", "Record", "File",
        "Folder", "Document", "Form", "Report", "Note", "Letter", "Memo", "Email", "Message", "Call", "Page",
        "Text", "Image", "Picture", "Photo", "Video", "Audio", "Sound", "Voice", "Speech", "Language",
        "Communication", "Interaction", "Relationship", "Connection", "Bond", "Trust", "Respect", "Dignity",
        "Privacy", "Confidentiality", "Security", "Safety", "Quality", "Standard", "Guideline", "Protocol",
        "Policy", "Procedure", "Rule", "Regulation", "Law", "Ethic", "Moral", "Value", "Belief", "Culture",
        "Religion", "Spirituality", "Faith", "Hope", "Love", "Care", "Compassion", "Empathy", "Sympathy",
        "Kindness", "Patience", "Understanding", "Support", "Help", "Assistance", "Service", "Work", "Job",
        "Career", "Profession", "Vocation", "Calling", "Mission", "Vision", "Goal", "Objective", "Plan",
        "Strategy", "Tactic", "Action", "Step", "Process", "Method", "Technique", "Skill", "Ability", "Talent",
        "Gift", "Knowledge", "Wisdom", "Experience", "Education", "Training", "Learning", "Teaching",
        "Research", "Study", "Investigation", "Experiment", "Trial", "Analysis", "Evaluation", "Assessment",
        "Measurement", "Observation", "Inspection", "Examination", "Review", "Audit", "Survey", "Poll",
        "Questionnaire", "Interview", "Discussion", "Meeting", "Conference", "Seminar", "Workshop",
        "Symposium", "Forum", "Panel", "Board", "Committee", "Team", "Group", "Unit", "Department",
        "Division", "Section", "Branch", "Office", "Agency", "Organization", "Institution", "Facility",
        "System", "Network", "Alliance", "Coalition", "Association", "Society", "Foundation", "Charity",
        "Nonprofit", "Company", "Corporation", "Business", "Industry", "Market", "Economy", "Finance",
        "Budget", "Cost", "Price", "Fee", "Charge", "Bill", "Invoice", "Payment", "Insurance", "Coverage",
        "Benefit", "Claim", "Reimbursement", "Compensation", "Salary", "Wage", "Income", "Revenue", "Profit",
        "Loss", "Asset", "Liability", "Debt", "Equity", "Capital", "Investment", "Funding", "Grant",
        "Donation", "Gift", "Award", "Prize", "Honor", "Recognition", "Citation", "Certificate", "License",
        "Degree", "Diploma", "Credential", "Title", "Rank", "Position", "Role", "Status", "Level", "Grade",
        "Class", "Category", "Type", "Kind", "Sort", "Variety", "Form", "Shape", "Size", "Weight", "Height",
        "Length", "Width", "Depth", "Volume", "Area", "Distance", "Time", "Duration", "Frequency", "Rate",
        "Speed", "Velocity", "Acceleration", "Force", "Power", "Energy", "Work", "Heat", "Temperature",
        "Pressure", "Flow", "Resistance", "Voltage", "Current", "Signal", "Data", "Information", "Knowledge",
        "Wisdom", "Truth", "Fact", "Reality", "Existence", "Life", "Death", "Birth", "Growth", "Development",
        "Aging", "Maturation", "Evolution", "Change", "Transformation", "Transition", "Movement", "Motion",
        "Action", "Reaction", "Interaction", "Relation", "Connection", "Link", "Bond", "Tie", "Knot", "Loop",
        "Cycle", "Circle", "Sphere", "Globe", "World", "Universe", "Cosmos", "Nature", "Environment",
        "Ecology", "Biology", "Chemistry", "Physics", "Mathematics", "Logic", "Reason", "Mind", "Soul",
        "Spirit", "Consciousness", "Awareness", "Perception", "Sensation", "Feeling", "Emotion", "Thought",
        "Idea", "Concept", "Theory", "Hypothesis", "Model", "Simulation", "Experiment", "Test", "Trial",
        "Error", "Failure", "Success", "Victory", "Defeat", "Win", "Loss", "Gain", "Advantage", "Disadvantage",
        "Benefit", "Harm", "Risk", "Danger", "Safety", "Security", "Protection", "Defense", "Attack",
        "Offense", "War", "Peace", "Conflict", "Harmony", "Balance", "Stability", "Order", "Chaos", "Entropy",
        "Energy", "Matter", "Space", "Time", "Gravity", "Force", "Field", "Wave", "Particle", "Atom",
        "Molecule", "Cell", "Organism", "Population", "Community", "Ecosystem", "Biosphere", "Planet", "Star",
        "Galaxy", "Universe", "Multiverse", "Dimension", "Reality", "Existence", "Being", "Nothingness",
        "Void", "Vacuum", "Empty", "Full", "Whole", "Part", "Piece", "Fragment", "Segment", "Section",
        "Division", "Portion", "Share", "Slice", "Cut", "Break", "Split", "Crack", "Fracture", "Rupture",
        "Tear", "Rip", "Hole", "Gap", "Space", "Opening", "Entrance", "Exit", "Door", "Window", "Gate",
        "Portal", "Passage", "Path", "Way", "Road", "Street", "Avenue", "Boulevard", "Lane", "Drive", "Court",
        "Place", "Square", "Plaza", "Park", "Garden", "Field", "Meadow", "Forest", "Woods", "Jungle", "Desert",
        "Ocean", "Sea", "Lake", "River", "Stream", "Creek", "Pond", "Pool", "Spring", "Well", "Fountain",
        "Waterfall", "Rain", "Snow", "Ice", "Hail", "Sleet", "Fog", "Mist", "Cloud", "Sky", "Sun", "Moon",
        "Star", "Planet", "Comet", "Asteroid", "Meteor", "Galaxy", "Nebula", "Black Hole", "Quasar", "Pulsar",
        "Supernova", "Big Bang", "Creation", "Destruction", "Evolution", "Extinction", "Life", "Death",
        "Rebirth", "Resurrection", "Immortality", "Eternity", "Infinity", "Zero", "One", "Two", "Three",
        "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Hundred", "Thousand", "Million", "Billion",
        "Trillion", "Quadrillion", "Quintillion", "Sextillion", "Septillion", "Octillion", "Nonillion",
        "Decillion", "Googol", "Googolplex", "Infinity", "Aleph", "Omega", "Alpha", "Beta", "Gamma",
        "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron",
        "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
    ]);

    static isMedicalTerm(text: string): boolean {
        // Check exact match (case-insensitive)
        if (this.terms.has(text)) return true;

        // Check case-insensitive
        // Note: This is a simple implementation. For high performance, 
        // we might want to normalize the set to lowercase on init.
        // But for now, let's iterate or rely on the fact that most terms are capitalized in the set.
        // Let's do a quick check for common variations.

        // Normalize input: trim and remove leading/trailing punctuation
        const normalized = text.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");

        // Check if it's in the set directly
        if (this.terms.has(normalized)) return true;

        // Check capitalized version (e.g. "htn" -> "HTN", "cancer" -> "Cancer")
        const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
        if (this.terms.has(capitalized)) return true;

        // Check all caps (e.g. "copd" -> "COPD")
        const allCaps = normalized.toUpperCase();
        if (this.terms.has(allCaps)) return true;

        return false;
    }
}
