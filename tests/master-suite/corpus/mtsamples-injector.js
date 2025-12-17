/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MTSAMPLES PHI INJECTOR                                     ║
 * ║                                                                               ║
 * ║   Injects synthetic PHI into real clinical text to create validation         ║
 * ║   corpus with known ground truth annotations.                                 ║
 * ║                                                                               ║
 * ║   Methodology: "PHI Resynthesis" - South et al. (2014)                        ║
 * ║   Reference: The Validation Void - Composite Validation Schema               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const {
  generatePatientName,
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

const { setSeed, random, randomInt, chance } = require("../generators/seeded-random");
const { applyErrors } = require("../generators/errors");

/**
 * PHI Annotation structure
 * @typedef {Object} PHIAnnotation
 * @property {number} start - Start character offset
 * @property {number} end - End character offset
 * @property {string} type - PHI type (NAME, SSN, DATE, etc.)
 * @property {string} text - The injected PHI text
 * @property {string} subtype - Optional subtype (PATIENT_NAME, DOB, etc.)
 * @property {string} errorLevel - Error level applied (none, low, medium, high, extreme)
 * @property {boolean} hasErrors - Whether OCR/typo errors were applied
 */

/**
 * Injected Document structure
 * @typedef {Object} InjectedDocument
 * @property {string} id - Unique document ID
 * @property {string} sourceCorpus - Source corpus name (mtsamples)
 * @property {string} specialty - Medical specialty
 * @property {string} originalText - Original text before injection
 * @property {string} injectedText - Text with PHI injected
 * @property {PHIAnnotation[]} annotations - Ground truth annotations
 * @property {Object} injectionConfig - Configuration used for injection
 * @property {number} injectionTimestamp - Unix timestamp of injection
 */

/**
 * Injection site patterns - where to inject PHI based on clinical context
 */
const INJECTION_PATTERNS = {
  // Patient name injection points
  PATIENT_NAME: [
    { pattern: /\bpatient\b/gi, position: "after", separator: " ", subtype: "PATIENT_NAME" },
    { pattern: /\bthe patient,?\s*/gi, position: "replace", separator: "", subtype: "PATIENT_NAME" },
    { pattern: /\b(Mr\.|Mrs\.|Ms\.|Miss)\s*\b/gi, position: "after", separator: " ", subtype: "PATIENT_NAME" },
    { pattern: /^PATIENT:?\s*/gm, position: "after", separator: " ", subtype: "PATIENT_NAME" },
    { pattern: /\bThis is (a|an)\s+\d+[- ]year[- ]old\b/gi, position: "after", separator: " ", subtype: "PATIENT_NAME" },
  ],
  
  // Date injection points
  DATE: [
    { pattern: /\b(admitted|seen|evaluated|presented|discharged)\s+(on)?\s*/gi, position: "after", separator: " ", subtype: "SERVICE_DATE" },
    { pattern: /\bDATE:?\s*/gi, position: "after", separator: " ", subtype: "SERVICE_DATE" },
    { pattern: /\bDate of (Service|Procedure|Surgery|Visit):?\s*/gi, position: "after", separator: " ", subtype: "SERVICE_DATE" },
    { pattern: /\bon\s+$/gm, position: "after", separator: "", subtype: "SERVICE_DATE" },
  ],
  
  // DOB injection points  
  DOB: [
    { pattern: /\bDOB:?\s*/gi, position: "after", separator: " ", subtype: "DOB" },
    { pattern: /\bDate of Birth:?\s*/gi, position: "after", separator: " ", subtype: "DOB" },
    { pattern: /\bborn\s+(on)?\s*/gi, position: "after", separator: " ", subtype: "DOB" },
    { pattern: /\bbirthdate:?\s*/gi, position: "after", separator: " ", subtype: "DOB" },
  ],
  
  // Address injection points
  ADDRESS: [
    { pattern: /\bAddress:?\s*/gi, position: "after", separator: " ", subtype: "STREET_ADDRESS" },
    { pattern: /\bresides at\s*/gi, position: "after", separator: " ", subtype: "STREET_ADDRESS" },
    { pattern: /\blives at\s*/gi, position: "after", separator: " ", subtype: "STREET_ADDRESS" },
    { pattern: /\bHome Address:?\s*/gi, position: "after", separator: " ", subtype: "STREET_ADDRESS" },
  ],
  
  // Phone injection points
  PHONE: [
    { pattern: /\bPhone:?\s*/gi, position: "after", separator: " ", subtype: "PHONE" },
    { pattern: /\bTelephone:?\s*/gi, position: "after", separator: " ", subtype: "PHONE" },
    { pattern: /\bContact:?\s*/gi, position: "after", separator: " ", subtype: "PHONE" },
    { pattern: /\bCell:?\s*/gi, position: "after", separator: " ", subtype: "CELL_PHONE" },
  ],
  
  // MRN injection points
  MRN: [
    { pattern: /\bMRN:?\s*/gi, position: "after", separator: " ", subtype: "MRN" },
    { pattern: /\bMedical Record( Number| #)?:?\s*/gi, position: "after", separator: " ", subtype: "MRN" },
    { pattern: /\bChart( Number| #)?:?\s*/gi, position: "after", separator: " ", subtype: "MRN" },
    { pattern: /\bRecord #:?\s*/gi, position: "after", separator: " ", subtype: "MRN" },
  ],
  
  // SSN injection points
  SSN: [
    { pattern: /\bSSN:?\s*/gi, position: "after", separator: " ", subtype: "SSN" },
    { pattern: /\bSocial Security( Number| #)?:?\s*/gi, position: "after", separator: " ", subtype: "SSN" },
    { pattern: /\bSS#:?\s*/gi, position: "after", separator: " ", subtype: "SSN" },
  ],
  
  // Email injection points
  EMAIL: [
    { pattern: /\bEmail:?\s*/gi, position: "after", separator: " ", subtype: "EMAIL" },
    { pattern: /\bE-?mail Address:?\s*/gi, position: "after", separator: " ", subtype: "EMAIL" },
  ],
  
  // Account number injection points
  ACCOUNT: [
    { pattern: /\bAccount( Number| #)?:?\s*/gi, position: "after", separator: " ", subtype: "ACCOUNT_NUMBER" },
    { pattern: /\bAcct( #)?:?\s*/gi, position: "after", separator: " ", subtype: "ACCOUNT_NUMBER" },
  ],
  
  // Insurance ID injection points
  HEALTH_PLAN_ID: [
    { pattern: /\bMember ID:?\s*/gi, position: "after", separator: " ", subtype: "HEALTH_PLAN_ID" },
    { pattern: /\bPolicy( Number| #)?:?\s*/gi, position: "after", separator: " ", subtype: "HEALTH_PLAN_ID" },
    { pattern: /\bInsurance ID:?\s*/gi, position: "after", separator: " ", subtype: "HEALTH_PLAN_ID" },
    { pattern: /\bSubscriber ID:?\s*/gi, position: "after", separator: " ", subtype: "HEALTH_PLAN_ID" },
  ],
};

/**
 * Get error level based on probability distribution
 * Matches realistic OCR/transcription error rates
 */
function getErrorLevel() {
  const r = random();
  if (r < 0.05) return "none";      // 5% clean
  if (r < 0.30) return "low";       // 25% minor errors
  if (r < 0.70) return "medium";    // 40% realistic OCR
  if (r < 0.95) return "high";      // 25% heavy corruption
  return "extreme";                  // 5% severe degradation
}

/**
 * Generate PHI value by type
 * @param {string} type - PHI type
 * @param {string} subtype - PHI subtype
 * @param {string} errorLevel - Error level to apply
 * @returns {Object} Generated PHI with metadata
 */
function generatePHI(type, subtype, errorLevel) {
  let value, metadata = {};
  
  switch (type) {
    case "PATIENT_NAME":
    case "NAME":
      const nameResult = generatePatientName("random", errorLevel);
      value = nameResult.formatted;
      metadata = { clean: nameResult.clean, hasErrors: nameResult.hasErrors, format: nameResult.format };
      break;
      
    case "DATE":
      value = generateDate(2020, 2024, true, errorLevel);
      break;
      
    case "DOB":
      value = generateDOB(true, errorLevel);
      break;
      
    case "ADDRESS":
      const addr = generateAddress(true, errorLevel);
      value = addr.full;
      metadata = { street: addr.street, city: addr.city, state: addr.state, zip: addr.zip };
      break;
      
    case "PHONE":
      value = generatePhone(true, errorLevel);
      break;
      
    case "FAX":
      value = generateFax(true, errorLevel);
      break;
      
    case "MRN":
      value = generateMRN(true, errorLevel);
      break;
      
    case "SSN":
      value = generateSSN(true, errorLevel);
      break;
      
    case "EMAIL":
      const name = generatePatientName("first_last", "none");
      value = generateEmail(name.first, name.last);
      break;
      
    case "ACCOUNT":
    case "ACCOUNT_NUMBER":
      value = generateAccountNumber();
      break;
      
    case "HEALTH_PLAN_ID":
      value = generateHealthPlanID();
      break;
      
    // Note: NPI and DEA are provider identifiers, NOT patient PHI under HIPAA Safe Harbor
    // They are intentionally not generated as PHI for testing purposes
      
    case "IP":
      value = generateIP();
      break;
      
    case "URL":
      value = generateURL();
      break;
      
    case "CREDIT_CARD":
      value = generateCreditCard();
      break;
      
    case "VIN":
      value = generateVIN();
      break;
      
    case "LICENSE_PLATE":
      value = generateLicensePlate();
      break;
      
    case "AGE_90_PLUS":
      const ageResult = generateAge();
      value = ageResult.age >= 90 ? `${ageResult.age}` : `${randomInt(90, 105)}`;
      metadata = { needsRedaction: true };
      break;
      
    default:
      throw new Error(`Unknown PHI type: ${type}`);
  }
  
  return { value, metadata, errorLevel };
}

/**
 * Find injection opportunities in text
 * @param {string} text - Text to analyze
 * @returns {Array} Array of injection opportunities
 */
function findInjectionOpportunities(text) {
  const opportunities = [];
  
  for (const [phiType, patterns] of Object.entries(INJECTION_PATTERNS)) {
    for (const patternDef of patterns) {
      const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        opportunities.push({
          phiType,
          subtype: patternDef.subtype,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
          matchText: match[0],
          position: patternDef.position,
          separator: patternDef.separator,
        });
      }
    }
  }
  
  // Sort by position (earliest first) and remove overlaps
  opportunities.sort((a, b) => a.matchStart - b.matchStart);
  
  const filtered = [];
  let lastEnd = -1;
  
  for (const opp of opportunities) {
    if (opp.matchStart >= lastEnd) {
      filtered.push(opp);
      lastEnd = opp.matchEnd;
    }
  }
  
  return filtered;
}

/**
 * Inject additional PHI types that may not have natural injection points
 * Creates synthetic sentences with PHI
 * @param {string} text - Current text
 * @param {PHIAnnotation[]} annotations - Current annotations
 * @param {Object} config - Injection config
 * @returns {Object} Updated text and annotations
 */
function injectAdditionalPHI(text, annotations, config) {
  const additionalTypes = [];
  const existingTypes = new Set(annotations.map(a => a.type));
  
  // Determine which PHI types to add based on config
  if (config.ensureAllTypes) {
    const requiredTypes = [
      "SSN", "MRN", "PHONE", "EMAIL", "ADDRESS", "ACCOUNT_NUMBER", 
      "HEALTH_PLAN_ID", "CREDIT_CARD", "IP", "VIN", "LICENSE_PLATE"
    ];
    
    for (const type of requiredTypes) {
      if (!existingTypes.has(type) && chance(config.additionalPHIProbability || 0.3)) {
        additionalTypes.push(type);
      }
    }
  }
  
  // Add synthetic sentences with additional PHI at the end
  if (additionalTypes.length > 0) {
    const additionalText = [];
    const newAnnotations = [];
    let currentOffset = text.length;
    
    // Add a separator
    const separator = "\n\n--- ADMINISTRATIVE INFORMATION ---\n";
    currentOffset += separator.length;
    additionalText.push(separator);
    
    for (const type of additionalTypes) {
      const errorLevel = getErrorLevel();
      const phi = generatePHI(type, type, errorLevel);
      
      // Create contextual sentence
      let sentence;
      switch (type) {
        case "SSN":
          sentence = `Patient SSN: ${phi.value}\n`;
          break;
        case "MRN":
          sentence = `Medical Record Number: ${phi.value}\n`;
          break;
        case "PHONE":
          sentence = `Contact Phone: ${phi.value}\n`;
          break;
        case "EMAIL":
          sentence = `Email Address: ${phi.value}\n`;
          break;
        case "ACCOUNT_NUMBER":
          sentence = `Account Number: ${phi.value}\n`;
          break;
        case "HEALTH_PLAN_ID":
          sentence = `Insurance Member ID: ${phi.value}\n`;
          break;
        case "CREDIT_CARD":
          sentence = `Payment Card on File: ${phi.value}\n`;
          break;
        case "IP":
          sentence = `Patient Portal Login IP: ${phi.value}\n`;
          break;
        case "VIN":
          sentence = `Vehicle VIN (MVA case): ${phi.value}\n`;
          break;
        case "LICENSE_PLATE":
          sentence = `Vehicle Plate: ${phi.value}\n`;
          break;
        case "ADDRESS":
          sentence = `Mailing Address: ${phi.value}\n`;
          break;
        default:
          sentence = `${type}: ${phi.value}\n`;
      }
      
      // Find position of PHI value in the sentence
      const valueStart = sentence.indexOf(phi.value);
      const annotation = {
        start: currentOffset + valueStart,
        end: currentOffset + valueStart + phi.value.length,
        type: type,
        text: phi.value,
        subtype: type,
        errorLevel: errorLevel,
        hasErrors: phi.metadata?.hasErrors || false,
        injectionMethod: "synthetic_append",
      };
      
      newAnnotations.push(annotation);
      additionalText.push(sentence);
      currentOffset += sentence.length;
    }
    
    return {
      text: text + additionalText.join(""),
      annotations: [...annotations, ...newAnnotations],
    };
  }
  
  return { text, annotations };
}

/**
 * Main injection function - inject PHI into MTSamples document
 * @param {Object} doc - MTSamples document
 * @param {Object} config - Injection configuration
 * @returns {InjectedDocument} Document with injected PHI and annotations
 */
function injectPHI(doc, config = {}) {
  const {
    seed = Date.now(),
    maxInjections = 20,
    minInjections = 5,
    ensureAllTypes = false,
    additionalPHIProbability = 0.3,
    ambiguityLevel = "standard", // standard, high, extreme
  } = config;
  
  // Set seed for reproducibility
  setSeed(seed);
  
  const originalText = doc.transcription;
  const annotations = [];
  
  // Find natural injection opportunities
  const opportunities = findInjectionOpportunities(originalText);
  
  // Limit and randomize opportunities
  const targetInjections = randomInt(minInjections, Math.min(maxInjections, opportunities.length));
  const selectedOpps = opportunities
    .sort(() => random() - 0.5)
    .slice(0, targetInjections);
  
  // Sort selected opportunities by position (reverse order for injection)
  selectedOpps.sort((a, b) => b.matchStart - a.matchStart);
  
  let injectedText = originalText;
  let offsetAdjustment = 0;
  
  // Track which types we've injected
  const injectedTypes = new Set();
  
  // Inject PHI at each selected opportunity
  for (const opp of selectedOpps) {
    const errorLevel = getErrorLevel();
    
    // Map opportunity type to PHI generator type
    let phiType = opp.phiType;
    if (phiType === "PATIENT_NAME") phiType = "NAME";
    if (phiType === "ACCOUNT") phiType = "ACCOUNT_NUMBER";
    
    const phi = generatePHI(phiType, opp.subtype, errorLevel);
    
    // Calculate injection position
    let insertPosition, newText;
    
    if (opp.position === "after") {
      insertPosition = opp.matchEnd;
      newText = opp.separator + phi.value;
    } else if (opp.position === "replace") {
      // Replace but keep any meaningful prefix
      insertPosition = opp.matchStart;
      newText = phi.value;
      // Remove the matched text
      injectedText = 
        injectedText.slice(0, insertPosition) + 
        injectedText.slice(opp.matchEnd);
    } else {
      insertPosition = opp.matchStart;
      newText = phi.value + opp.separator;
    }
    
    // Inject the PHI
    injectedText = 
      injectedText.slice(0, insertPosition) + 
      newText + 
      injectedText.slice(insertPosition);
    
    // Calculate annotation position (accounting for previous injections)
    const annotationStart = insertPosition + (opp.position === "after" ? opp.separator.length : 0);
    const annotationEnd = annotationStart + phi.value.length;
    
    // Create annotation
    annotations.push({
      start: annotationStart,
      end: annotationEnd,
      type: phiType === "NAME" ? "NAME" : phiType,
      text: phi.value,
      subtype: opp.subtype,
      errorLevel: errorLevel,
      hasErrors: phi.metadata?.hasErrors || false,
      injectionMethod: "pattern_match",
      metadata: phi.metadata,
    });
    
    injectedTypes.add(phiType);
  }
  
  // Sort annotations by start position
  annotations.sort((a, b) => a.start - b.start);
  
  // Recalculate annotation positions (they may have shifted)
  // This is necessary because we inject from the end, but positions are tracked from start
  const result = recalculateAnnotations(injectedText, annotations);
  
  // Add additional PHI types if configured
  const finalResult = injectAdditionalPHI(
    result.text, 
    result.annotations, 
    { ensureAllTypes, additionalPHIProbability }
  );
  
  return {
    id: `mtsamples-${doc.specialty.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${doc.index}`,
    sourceCorpus: "mtsamples",
    specialty: doc.specialty,
    sampleName: doc.sampleName,
    originalText: originalText,
    injectedText: finalResult.text,
    annotations: finalResult.annotations,
    injectionConfig: {
      seed,
      maxInjections,
      minInjections,
      ensureAllTypes,
      additionalPHIProbability,
      ambiguityLevel,
    },
    injectionTimestamp: Date.now(),
    phiCounts: countPHITypes(finalResult.annotations),
    wordCount: finalResult.text.split(/\s+/).length,
    charCount: finalResult.text.length,
  };
}

/**
 * Recalculate annotation positions to ensure they match actual text positions
 */
function recalculateAnnotations(text, annotations) {
  const verified = [];
  
  for (const ann of annotations) {
    // Search for the annotated text near the expected position
    const searchStart = Math.max(0, ann.start - 50);
    const searchEnd = Math.min(text.length, ann.end + 50);
    const searchRegion = text.slice(searchStart, searchEnd);
    
    const foundIndex = searchRegion.indexOf(ann.text);
    
    if (foundIndex !== -1) {
      verified.push({
        ...ann,
        start: searchStart + foundIndex,
        end: searchStart + foundIndex + ann.text.length,
      });
    } else {
      // Text might have been modified by errors, try fuzzy match
      console.warn(`[PHI Injector] Could not verify annotation: ${ann.text}`);
    }
  }
  
  return { text, annotations: verified };
}

/**
 * Count PHI types in annotations
 */
function countPHITypes(annotations) {
  const counts = {};
  for (const ann of annotations) {
    counts[ann.type] = (counts[ann.type] || 0) + 1;
  }
  return counts;
}

/**
 * Inject adversarial/ambiguous PHI for stress testing
 * Uses names that could be mistaken for other things
 * @param {Object} doc - MTSamples document  
 * @param {Object} config - Injection config
 * @returns {InjectedDocument} Document with adversarial PHI
 */
function injectAdversarialPHI(doc, config = {}) {
  // Ambiguous names that look like:
  // - Months: April, May, June, August
  // - Locations: Florence, London, Austin, Dallas, Phoenix
  // - Medical terms: Rose, Violet, Iris, Lily (flowers/anatomy)
  // - Common words: Grace, Hope, Faith, Joy
  const ambiguousNames = [
    "April Johnson", "May Williams", "June Anderson", "August Smith",
    "Florence Martinez", "London Brown", "Austin Garcia", "Dallas Wilson",
    "Phoenix Taylor", "Madison Lee", "Brooklyn Chen", "Savannah Moore",
    "Rose Thompson", "Violet Davis", "Iris Rodriguez", "Lily Kim",
    "Grace Miller", "Hope Jackson", "Faith White", "Joy Harris",
    "Christian Turner", "Angel Lopez", "Trinity Clark", "Destiny Green",
  ];
  
  // Run normal injection first
  const result = injectPHI(doc, config);
  
  // Replace some names with ambiguous ones
  if (config.ambiguityLevel === "high" || config.ambiguityLevel === "extreme") {
    const nameAnnotations = result.annotations.filter(a => a.type === "NAME");
    const replaceCount = config.ambiguityLevel === "extreme" ? nameAnnotations.length : Math.ceil(nameAnnotations.length / 2);
    
    let text = result.injectedText;
    
    for (let i = 0; i < replaceCount && i < nameAnnotations.length; i++) {
      const ann = nameAnnotations[i];
      const ambiguousName = ambiguousNames[randomInt(0, ambiguousNames.length - 1)];
      
      // Replace the name in text
      text = text.slice(0, ann.start) + ambiguousName + text.slice(ann.end);
      
      // Update annotation
      const lengthDiff = ambiguousName.length - ann.text.length;
      ann.text = ambiguousName;
      ann.end = ann.start + ambiguousName.length;
      ann.metadata = { ...ann.metadata, isAmbiguous: true, ambiguityType: "name_like_other" };
      
      // Adjust subsequent annotation positions
      for (let j = i + 1; j < result.annotations.length; j++) {
        result.annotations[j].start += lengthDiff;
        result.annotations[j].end += lengthDiff;
      }
    }
    
    result.injectedText = text;
  }
  
  return result;
}

/**
 * Batch inject PHI into multiple documents
 * @param {Array} documents - MTSamples documents
 * @param {Object} config - Injection configuration
 * @returns {InjectedDocument[]} Array of injected documents
 */
function batchInjectPHI(documents, config = {}) {
  const { baseSeed = 42 } = config;
  
  return documents.map((doc, index) => {
    const docConfig = {
      ...config,
      seed: baseSeed + index, // Deterministic per-document seed
    };
    
    return config.adversarial 
      ? injectAdversarialPHI(doc, docConfig)
      : injectPHI(doc, docConfig);
  });
}

module.exports = {
  injectPHI,
  injectAdversarialPHI,
  batchInjectPHI,
  findInjectionOpportunities,
  generatePHI,
  INJECTION_PATTERNS,
};
