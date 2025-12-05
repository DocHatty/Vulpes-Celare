/**
 * MASTER TEST SUITE - Error Simulation
 * Realistic OCR errors, typos, and data corruption patterns
 *
 * SEEDED RANDOM: Uses seeded RNG for reproducible error generation.
 */

const { random, randomInt, chance } = require("./seeded-random");

// OCR character substitutions (scanner/fax errors)
const OCR_SUBSTITUTIONS = {
  // Number/letter confusion
  O: ["0"],
  0: ["O", "o"],
  I: ["1", "l", "|"],
  1: ["I", "l", "|", "!"],
  l: ["1", "I", "|"],
  "|": ["1", "I", "l"],
  S: ["5", "$"],
  5: ["S"],
  B: ["8", "6"],
  8: ["B"],
  G: ["6", "C"],
  6: ["G", "b"],
  Z: ["2", "7"],
  2: ["Z"],
  Q: ["O", "0"],
  D: ["0", "O"],
  g: ["9", "q"],
  9: ["g", "q"],
  q: ["9", "g"],

  // Letter shape confusion
  m: ["rn", "nn"],
  rn: ["m"],
  w: ["vv"],
  vv: ["w"],
  c: ["e", "("],
  e: ["c"],
  a: ["o", "@"],
  o: ["a"],
  h: ["b"],
  b: ["h", "6"],
  n: ["r", "h"],
  r: ["n"],
  u: ["v", "n"],
  v: ["u", "v"],
  f: ["t"],
  t: ["f"],

  // Case confusion
  C: ["c", "("],
  E: ["e", "F"],
  U: ["V", "u"],
  V: ["U", "v"],
};

// Keyboard adjacency map for typos
const TYPO_ADJACENTS = {
  // Row 1
  q: ["w", "a", "1", "2"],
  w: ["q", "e", "a", "s", "2", "3"],
  e: ["w", "r", "s", "d", "3", "4"],
  r: ["e", "t", "d", "f", "4", "5"],
  t: ["r", "y", "f", "g", "5", "6"],
  y: ["t", "u", "g", "h", "6", "7"],
  u: ["y", "i", "h", "j", "7", "8"],
  i: ["u", "o", "j", "k", "8", "9"],
  o: ["i", "p", "k", "l", "9", "0"],
  p: ["o", "l", "0"],

  // Row 2
  a: ["q", "w", "s", "z"],
  s: ["a", "w", "e", "d", "z", "x"],
  d: ["s", "e", "r", "f", "x", "c"],
  f: ["d", "r", "t", "g", "c", "v"],
  g: ["f", "t", "y", "h", "v", "b"],
  h: ["g", "y", "u", "j", "b", "n"],
  j: ["h", "u", "i", "k", "n", "m"],
  k: ["j", "i", "o", "l", "m"],
  l: ["k", "o", "p"],

  // Row 3
  z: ["a", "s", "x"],
  x: ["z", "s", "d", "c"],
  c: ["x", "d", "f", "v"],
  v: ["c", "f", "g", "b"],
  b: ["v", "g", "h", "n"],
  n: ["b", "h", "j", "m"],
  m: ["n", "j", "k"],
};

// Common double letter patterns
const DOUBLE_LETTERS = [
  "ll",
  "tt",
  "nn",
  "ss",
  "mm",
  "rr",
  "pp",
  "ff",
  "cc",
  "ee",
  "oo",
  "dd",
  "gg",
  "bb",
  "zz",
];

/**
 * Apply OCR-style character substitution errors
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyOCRErrors(str, probability = 0.15) {
  if (!chance(probability)) return { text: str, hasErrors: false };

  let result = str;
  let hasErrors = false;

  for (let i = 0; i < result.length; i++) {
    if (chance(0.12)) {
      const char = result[i];
      if (OCR_SUBSTITUTIONS[char]) {
        const subs = OCR_SUBSTITUTIONS[char];
        const replacement = random(subs);
        result = result.slice(0, i) + replacement + result.slice(i + 1);
        hasErrors = true;
        // Adjust index if replacement is longer
        if (replacement.length > 1) i += replacement.length - 1;
      }
    }
  }

  return { text: result, hasErrors };
}

/**
 * Apply keyboard-based typo errors
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyTypos(str, probability = 0.2) {
  if (!chance(probability) || str.length < 2)
    return { text: str, hasErrors: false };

  const chars = str.split("");
  const idx = randomInt(0, chars.length - 1);
  const c = chars[idx].toLowerCase();

  if (TYPO_ADJACENTS[c]) {
    const adj = TYPO_ADJACENTS[c];
    const newChar = random(adj);
    // Preserve case
    chars[idx] =
      str[idx] === str[idx].toUpperCase() ? newChar.toUpperCase() : newChar;
    return { text: chars.join(""), hasErrors: true };
  }

  return { text: str, hasErrors: false };
}

/**
 * Apply character transposition errors
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyTransposition(str, probability = 0.1) {
  if (!chance(probability) || str.length < 3)
    return { text: str, hasErrors: false };

  const chars = str.split("");
  const idx = randomInt(0, chars.length - 2);
  [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];

  return { text: chars.join(""), hasErrors: true };
}

/**
 * Apply double letter errors (add or remove)
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyDoubleLetterError(str, probability = 0.15) {
  if (!chance(probability)) return { text: str, hasErrors: false };

  // 60% chance to remove a double letter, 40% to add one
  if (chance(0.6)) {
    // Remove double letter
    for (const d of DOUBLE_LETTERS) {
      if (str.toLowerCase().includes(d) && chance(0.5)) {
        const regex = new RegExp(d, "i");
        return { text: str.replace(regex, d[0]), hasErrors: true };
      }
    }
  } else {
    // Add double letter
    const vowels = ["a", "e", "i", "o", "u"];
    for (const v of vowels) {
      const idx = str.toLowerCase().indexOf(v);
      if (idx !== -1 && chance(0.3)) {
        const char = str[idx];
        return {
          text: str.slice(0, idx) + char + str.slice(idx),
          hasErrors: true,
        };
      }
    }
  }

  return { text: str, hasErrors: false };
}

/**
 * Apply case variation errors
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyCaseVariation(str, probability = 0.25) {
  if (!chance(probability)) return { text: str, hasErrors: false };

  const variant = random();
  let result;

  if (variant < 0.25) {
    // ALL CAPS
    result = str.toUpperCase();
  } else if (variant < 0.45) {
    // all lowercase
    result = str.toLowerCase();
  } else if (variant < 0.7) {
    // rAnDoM cAsE
    result = str
      .split("")
      .map((c) => (chance(0.5) ? c.toUpperCase() : c.toLowerCase()))
      .join("");
  } else if (variant < 0.85) {
    // First letter lowercase
    result = str[0].toLowerCase() + str.slice(1);
  } else {
    // Inverted case
    result = str
      .split("")
      .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
      .join("");
  }

  return { text: result, hasErrors: result !== str };
}

/**
 * Apply spacing errors (add/remove spaces)
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applySpacingError(str, probability = 0.12) {
  if (!chance(probability)) return { text: str, hasErrors: false };

  const words = str.split(" ");

  if (words.length >= 2 && chance(0.4)) {
    // Merge two words
    const idx = randomInt(0, words.length - 2);
    words[idx] = words[idx] + words[idx + 1];
    words.splice(idx + 1, 1);
    return { text: words.join(" "), hasErrors: true };
  } else if (words.length > 0) {
    // Split a word
    const idx = randomInt(0, words.length - 1);
    if (words[idx].length > 4) {
      const sp = Math.floor(words[idx].length / 2);
      words[idx] = words[idx].slice(0, sp) + " " + words[idx].slice(sp);
      return { text: words.join(" "), hasErrors: true };
    }
  }

  return { text: str, hasErrors: false };
}

/**
 * Apply character deletion
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyDeletion(str, probability = 0.08) {
  if (!chance(probability) || str.length < 4)
    return { text: str, hasErrors: false };

  const idx = randomInt(0, str.length - 1);
  return {
    text: str.slice(0, idx) + str.slice(idx + 1),
    hasErrors: true,
  };
}

/**
 * Apply character insertion
 * @param {string} str - Input string
 * @param {number} probability - Probability of applying errors (0-1)
 * @returns {object} - { text, hasErrors }
 */
function applyInsertion(str, probability = 0.08) {
  if (!chance(probability)) return { text: str, hasErrors: false };

  const idx = randomInt(0, str.length - 1);
  const char = str[idx];
  return {
    text: str.slice(0, idx) + char + str.slice(idx),
    hasErrors: true,
  };
}

/**
 * Apply all error types based on error level
 * @param {string} value - Input string
 * @param {string} errorLevel - "none", "low", "medium", "high", "extreme"
 * @returns {object} - { text, hasErrors }
 */
function applyErrors(value, errorLevel = "medium") {
  const probabilityMap = {
    none: {
      ocr: 0,
      typo: 0,
      trans: 0,
      double: 0,
      case: 0,
      space: 0,
      del: 0,
      ins: 0,
    },
    low: {
      ocr: 0.08,
      typo: 0.1,
      trans: 0.05,
      double: 0.08,
      case: 0.12,
      space: 0.05,
      del: 0.03,
      ins: 0.03,
    },
    medium: {
      ocr: 0.18,
      typo: 0.22,
      trans: 0.12,
      double: 0.18,
      case: 0.25,
      space: 0.1,
      del: 0.06,
      ins: 0.06,
    },
    high: {
      ocr: 0.32,
      typo: 0.38,
      trans: 0.22,
      double: 0.28,
      case: 0.4,
      space: 0.18,
      del: 0.1,
      ins: 0.1,
    },
    extreme: {
      ocr: 0.5,
      typo: 0.55,
      trans: 0.35,
      double: 0.4,
      case: 0.55,
      space: 0.25,
      del: 0.15,
      ins: 0.15,
    },
  };

  const p = probabilityMap[errorLevel] || probabilityMap.medium;
  let result = value;
  let hasErrors = false;

  // Apply errors in sequence
  let r = applyOCRErrors(result, p.ocr);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyTypos(result, p.typo);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyTransposition(result, p.trans);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyDoubleLetterError(result, p.double);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyCaseVariation(result, p.case);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applySpacingError(result, p.space);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyDeletion(result, p.del);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  r = applyInsertion(result, p.ins);
  result = r.text;
  hasErrors = hasErrors || r.hasErrors;

  return { text: result, hasErrors };
}

module.exports = {
  OCR_SUBSTITUTIONS,
  TYPO_ADJACENTS,
  DOUBLE_LETTERS,
  applyOCRErrors,
  applyTypos,
  applyTransposition,
  applyDoubleLetterError,
  applyCaseVariation,
  applySpacingError,
  applyDeletion,
  applyInsertion,
  applyErrors,
};
