/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗███████╗██╗      █████╗ ██████╗ ███████╗                          ║
 * ║     ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝                          ║
 * ║     ██║     █████╗  ██║     ███████║██████╔╝█████╗                            ║
 * ║     ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝                            ║
 * ║     ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗                          ║
 * ║      ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                          ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   SEEDED RANDOM NUMBER GENERATOR                                              ║
 * ║   Deterministic randomness for reproducible test document generation          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * WHY THIS MATTERS:
 * ─────────────────────────────────────────────────────────────────────────────────
 * For valid A/B experiments, baseline and treatment MUST test the exact same
 * documents. If documents differ, we can't know if metric changes are from
 * our parameter tweaks or just random document variation.
 *
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────────
 *   const { SeededRandom } = require('./seeded-random');
 *
 *   // Create with seed for reproducibility
 *   const rng = new SeededRandom(12345);
 *
 *   // Use like Math.random()
 *   rng.random();           // 0.0 to 1.0
 *   rng.randomInt(1, 100);  // Integer in range
 *   rng.randomFrom(array);  // Pick from array
 *
 *   // Reset to regenerate same sequence
 *   rng.reset();
 *
 * ALGORITHM: Mulberry32 (fast, good distribution, 32-bit state)
 */

class SeededRandom {
  constructor(seed = null) {
    this.initialSeed = seed !== null ? seed : Date.now();
    this.state = this.initialSeed;
  }

  /**
   * Generate next random number (0.0 to 1.0)
   * Uses Mulberry32 algorithm - fast and high quality for non-crypto use
   */
  random() {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in range [min, max] (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  randomFrom(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(this.random() * arr.length)];
  }

  /**
   * Return true with given probability (0.0 to 1.0)
   */
  chance(probability) {
    return this.random() < probability;
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Reset to initial seed (regenerate same sequence)
   */
  reset() {
    this.state = this.initialSeed;
  }

  /**
   * Get current seed for logging/debugging
   */
  getSeed() {
    return this.initialSeed;
  }

  /**
   * Set new seed
   */
  setSeed(seed) {
    this.initialSeed = seed;
    this.state = seed;
  }
}

// ============================================================================
// GLOBAL INSTANCE (for backward compatibility)
// ============================================================================

// Global instance - can be seeded for experiments or left random for normal use
let globalRng = new SeededRandom();

/**
 * Get the global RNG instance
 */
function getGlobalRng() {
  return globalRng;
}

/**
 * Seed the global RNG for reproducible generation
 */
function seedGlobal(seed) {
  globalRng.setSeed(seed);
}

/**
 * Reset global RNG to its seed
 */
function resetGlobal() {
  globalRng.reset();
}

/**
 * Drop-in replacement for Math.random() OR array selection
 * - If no argument: returns 0-1 float (like Math.random())
 * - If array argument: returns random element from array
 */
function random(arr) {
  if (arr && Array.isArray(arr)) {
    return globalRng.randomFrom(arr);
  }
  return globalRng.random();
}

/**
 * Drop-in replacement for randomInt using global seeded RNG
 */
function randomInt(min, max) {
  return globalRng.randomInt(min, max);
}

/**
 * Drop-in replacement for random array selection
 */
function randomFrom(arr) {
  return globalRng.randomFrom(arr);
}

/**
 * Check if value passes probability threshold
 */
function chance(probability) {
  return globalRng.chance(probability);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SeededRandom,
  getGlobalRng,
  seedGlobal,
  resetGlobal,
  random,
  randomInt,
  randomFrom,
  chance,
};
