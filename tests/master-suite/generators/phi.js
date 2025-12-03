/**
 * MASTER TEST SUITE - PHI Generators
 * Generate realistic Protected Health Information for testing
 */

const { FIRST_NAMES, LAST_NAMES, MIDDLE_NAMES, TITLES, SUFFIXES_PATIENT, SUFFIXES_PROVIDER } = require("../data/names");
const { CITIES, STATES, STREET_TYPES, STREET_NAMES, UNIT_TYPES } = require("../data/locations");
const { applyErrors } = require("./errors");

// Utility functions
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/**
 * Generate a patient name in various formats
 */
function generatePatientName(format = "random", errorLevel = "medium") {
  const first = random(FIRST_NAMES);
  const middle = random(MIDDLE_NAMES);
  const last = random(LAST_NAMES);
  const suffix = Math.random() < 0.08 ? ", " + random(SUFFIXES_PATIENT) : "";
  
  const formats = {
    first_last: `${first} ${last}${suffix}`,
    first_middle_last: `${first} ${middle} ${last}${suffix}`,
    last_first: `${last}, ${first}${suffix}`,
    last_first_middle: `${last}, ${first} ${middle}${suffix}`,
    last_space_comma_first: `${last} , ${first}`, // Spacing variant
    all_caps: `${first.toUpperCase()} ${last.toUpperCase()}${suffix.toUpperCase()}`,
    all_caps_last_first: `${last.toUpperCase()}, ${first.toUpperCase()}${suffix.toUpperCase()}`,
    all_caps_full: `${last.toUpperCase()}, ${first.toUpperCase()} ${middle.toUpperCase()}`,
    first_initial_last: `${first} ${middle[0]}. ${last}`,
    last_first_initial: `${last}, ${first} ${middle[0]}.`
  };
  
  const formatKeys = Object.keys(formats);
  if (format === "random") format = formatKeys[randomInt(0, formatKeys.length - 1)];
  
  const clean = formats[format] || formats.first_last;
  const { text: formatted, hasErrors } = applyErrors(clean, errorLevel);
  
  return { first, middle, last, clean, formatted, hasErrors, format };
}

/**
 * Generate a provider name (NOT PHI, but included for document realism)
 */
function generateProviderName(format = "titled", errorLevel = "none") {
  const first = random(FIRST_NAMES);
  const last = random(LAST_NAMES);
  const title = random(TITLES);
  const suffix = random(SUFFIXES_PROVIDER);
  
  const formats = {
    titled: `${title} ${first} ${last}`,
    titled_last: `${title} ${last}`,
    titled_suffix: `${title} ${first} ${last}, ${suffix}`,
    first_last_suffix: `${first} ${last}, ${suffix}`,
    last_suffix: `${last}, ${suffix}`
  };
  
  const formatKeys = Object.keys(formats);
  if (format === "random") format = formatKeys[randomInt(0, formatKeys.length - 1)];
  
  const clean = formats[format] || formats.titled;
  // Provider names generally don't get errors since they're typed by staff
  const { text: formatted } = applyErrors(clean, errorLevel);
  
  return { first, last, clean, formatted, isProvider: true };
}

/**
 * Generate Social Security Number
 */
function generateSSN(applyErr = true, errorLevel = "medium") {
  const area = String(randomInt(100, 899)).padStart(3, "0");
  const group = String(randomInt(10, 99));
  const serial = String(randomInt(1000, 9999));
  
  // Various SSN formats
  const formats = [
    `${area}-${group}-${serial}`,
    `${area} ${group} ${serial}`,
    `${area}${group}${serial}`,
    `***-**-${serial}`, // Partially masked
    `XXX-XX-${serial}`, // Partially masked
  ];
  
  const clean = random(formats);
  if (!applyErr) return clean;
  
  const { text } = applyErrors(clean, errorLevel);
  return text;
}

/**
 * Generate Medical Record Number
 */
function generateMRN(applyErr = true, errorLevel = "medium") {
  const prefixes = ["MRN", "PAT", "PT", "MED", "ACC", "REC", "ID", ""];
  const prefix = random(prefixes);
  const year = randomInt(2018, 2024);
  const num = randomInt(10000, 9999999);
  
  let mrn;
  if (prefix) {
    const separators = ["-", " ", ": ", ""];
    const sep = random(separators);
    mrn = Math.random() < 0.5 
      ? `${prefix}${sep}${year}-${num}`
      : `${prefix}${sep}${num}`;
  } else {
    mrn = String(num);
  }
  
  if (!applyErr) return mrn;
  const { text } = applyErrors(mrn, errorLevel);
  return text;
}

/**
 * Generate phone number
 */
function generatePhone(applyErr = true, errorLevel = "medium") {
  const area = String(randomInt(201, 989));
  const exchange = String(randomInt(200, 999));
  const subscriber = String(randomInt(1000, 9999));
  
  const formats = [
    `(${area}) ${exchange}-${subscriber}`,
    `${area}-${exchange}-${subscriber}`,
    `${area}.${exchange}.${subscriber}`,
    `${area}${exchange}${subscriber}`,
    `+1 ${area}-${exchange}-${subscriber}`,
    `1-${area}-${exchange}-${subscriber}`,
    `+1 (${area}) ${exchange}-${subscriber}`,
    `${area} ${exchange} ${subscriber}`
  ];
  
  const clean = random(formats);
  if (!applyErr) return clean;
  
  const { text } = applyErrors(clean, errorLevel);
  return text;
}

/**
 * Generate fax number (labeled)
 */
function generateFax(applyErr = true, errorLevel = "medium") {
  const phone = generatePhone(false);
  const labels = ["Fax:", "FAX:", "F:", "Fax", "FAX", "Facsimile:"];
  const fax = `${random(labels)} ${phone}`;
  
  if (!applyErr) return fax;
  const { text } = applyErrors(fax, errorLevel);
  return text;
}

/**
 * Generate email address
 */
function generateEmail(first, last) {
  const domains = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
    "icloud.com", "mail.com", "protonmail.com", "live.com", "msn.com"
  ];
  
  const cleanFirst = first.toLowerCase().replace(/[^a-z]/g, "");
  const cleanLast = last.toLowerCase().replace(/[^a-z]/g, "");
  const num = Math.random() < 0.3 ? String(randomInt(1, 99)) : "";
  
  const patterns = [
    `${cleanFirst}.${cleanLast}${num}@${random(domains)}`,
    `${cleanFirst}${cleanLast}${num}@${random(domains)}`,
    `${cleanFirst[0]}${cleanLast}${num}@${random(domains)}`,
    `${cleanLast}.${cleanFirst}${num}@${random(domains)}`,
    `${cleanFirst}_${cleanLast}${num}@${random(domains)}`,
    `${cleanFirst}${cleanLast[0]}${num}@${random(domains)}`
  ];
  
  return random(patterns);
}

/**
 * Generate date in various formats
 */
function generateDate(yearMin = 2020, yearMax = 2024, applyErr = true, errorLevel = "medium") {
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  const year = randomInt(yearMin, yearMax);
  
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const yy = String(year).slice(-2);
  
  const formats = [
    `${mm}/${dd}/${year}`,
    `${mm}-${dd}-${year}`,
    `${year}-${mm}-${dd}`,
    `${month}/${day}/${year}`,
    `${mm}/${dd}/${yy}`,
    `${month}/${day}/${yy}`
  ];
  
  const clean = random(formats);
  if (!applyErr) return clean;
  
  const { text } = applyErrors(clean, errorLevel);
  return text;
}

/**
 * Generate date of birth
 */
function generateDOB(applyErr = true, errorLevel = "medium") {
  return generateDate(1930, 2010, applyErr, errorLevel);
}

/**
 * Generate full address
 */
function generateAddress(applyErr = true, errorLevel = "medium") {
  const num = randomInt(1, 9999);
  const street = `${random(STREET_NAMES)} ${random(STREET_TYPES)}`;
  
  // Optional unit
  let unit = "";
  if (Math.random() < 0.25) {
    const unitType = random(UNIT_TYPES);
    const unitNum = randomInt(1, 999);
    unit = `, ${unitType} ${unitNum}`;
  }
  
  const city = random(CITIES);
  const state = random(STATES);
  const zip = String(randomInt(10000, 99999));
  const zip4 = Math.random() < 0.2 ? `-${String(randomInt(1000, 9999))}` : "";
  
  const streetLine = `${num} ${street}${unit}`;
  const full = `${streetLine}, ${city}, ${state} ${zip}${zip4}`;
  
  if (!applyErr) {
    return { street: streetLine, city, state, zip: zip + zip4, full };
  }
  
  const { text: streetErr } = applyErrors(streetLine, errorLevel);
  const { text: fullErr } = applyErrors(full, errorLevel);
  
  return { street: streetErr, city, state, zip: zip + zip4, full: fullErr };
}

/**
 * Generate NPI (National Provider Identifier)
 */
function generateNPI() {
  return String(randomInt(1000000000, 9999999999));
}

/**
 * Generate DEA number
 */
function generateDEA() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const prefix = letters[randomInt(0, letters.length - 1)] + letters[randomInt(0, letters.length - 1)];
  return prefix + String(randomInt(1000000, 9999999));
}

/**
 * Generate IP address
 */
function generateIP() {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

/**
 * Generate patient portal URL
 */
function generateURL() {
  const subdomains = ["patient-portal", "myhealth", "health-records", "medportal", "mycare", "healthlink"];
  const tlds = [".com", ".org", ".net", ".health", ".care"];
  const patientId = randomInt(10000, 9999999);
  
  return `https://${random(subdomains)}${random(tlds)}/patient/${patientId}`;
}

/**
 * Generate credit card number
 */
function generateCreditCard() {
  // Card types and their prefixes
  const cardTypes = [
    { prefix: "4", length: 16, name: "Visa" },
    { prefix: "5", length: 16, name: "Mastercard" },
    { prefix: "34", length: 15, name: "Amex" },
    { prefix: "37", length: 15, name: "Amex" },
    { prefix: "6011", length: 16, name: "Discover" }
  ];
  
  const card = random(cardTypes);
  let num = card.prefix;
  
  while (num.length < card.length) {
    num += String(randomInt(0, 9));
  }
  
  // Format options
  if (card.length === 15) {
    // AMEX format: xxxx xxxxxx xxxxx
    const formats = [
      num,
      `${num.slice(0,4)}-${num.slice(4,10)}-${num.slice(10)}`,
      `${num.slice(0,4)} ${num.slice(4,10)} ${num.slice(10)}`
    ];
    return random(formats);
  } else {
    // Standard 16-digit format
    const formats = [
      num,
      `${num.slice(0,4)}-${num.slice(4,8)}-${num.slice(8,12)}-${num.slice(12)}`,
      `${num.slice(0,4)} ${num.slice(4,8)} ${num.slice(8,12)} ${num.slice(12)}`
    ];
    return random(formats);
  }
}

/**
 * Generate VIN (Vehicle Identification Number)
 */
function generateVIN() {
  // VIN excludes I, O, Q
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let vin = "";
  for (let i = 0; i < 17; i++) {
    vin += chars[randomInt(0, chars.length - 1)];
  }
  return vin;
}

/**
 * Generate license plate
 */
function generateLicensePlate() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  
  const formats = [
    // Standard formats
    () => `${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}-${randomInt(1000, 9999)}`,
    () => `${randomInt(100, 999)} ${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}`,
    () => `${randomInt(1, 9)}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${randomInt(100, 999)}`,
    () => `${letters[randomInt(0,25)]}${randomInt(10,99)} ${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}`,
    // Vanity style
    () => `${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${letters[randomInt(0,25)]}${randomInt(10,99)}`
  ];
  
  return random(formats)();
}

/**
 * Generate age (with HIPAA consideration - ages 90+ are PHI)
 */
function generateAge() {
  // 15% chance of age 90+ which IS PHI under HIPAA
  if (Math.random() < 0.15) {
    return { age: randomInt(90, 105), needsRedaction: true };
  }
  // 85% chance of age under 90 which is NOT PHI
  return { age: randomInt(18, 89), needsRedaction: false };
}

/**
 * Generate account number
 */
function generateAccountNumber() {
  const prefixes = ["ACCT", "ACC", "Account", ""];
  const prefix = random(prefixes);
  const num = randomInt(100000, 99999999);
  
  if (prefix) {
    return `${prefix}: ${num}`;
  }
  return String(num);
}

/**
 * Generate health plan ID
 */
function generateHealthPlanID() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const prefix = letters[randomInt(0,25)] + letters[randomInt(0,25)] + letters[randomInt(0,25)];
  return `${prefix}${randomInt(100000000, 999999999)}`;
}

module.exports = {
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
  generateHealthPlanID
};
