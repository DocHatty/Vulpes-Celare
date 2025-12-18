"use strict";
/**
 * ============================================================================
 * STATISTICAL TESTS
 * ============================================================================
 *
 * Rigorous statistical testing for comparing detection backends.
 * Implements tests recommended in NLP/NER evaluation literature.
 *
 * Tests included:
 * - McNemar's test (paired binary classifications)
 * - Paired t-test (parametric comparison)
 * - Wilcoxon signed-rank test (non-parametric)
 * - Effect size calculations (Cohen's d, rank-biserial)
 *
 * Reference: Berg-Kirkpatrick et al. (2012) "An empirical investigation of
 *            statistical significance in NLP"
 *
 * @module benchmark/statistical/StatisticalTests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticalTests = void 0;
exports.createStatisticalTests = createStatisticalTests;
/**
 * StatisticalTests - Comprehensive statistical testing for NER evaluation
 */
class StatisticalTests {
    alpha;
    useContinuityCorrection;
    constructor(options = {}) {
        this.alpha = options.alpha ?? 0.05;
        this.useContinuityCorrection = options.useContinuityCorrection ?? true;
    }
    /**
     * McNemar's test for paired binary classifications
     *
     * Compares two classifiers on the same data.
     * Null hypothesis: The disagreements are symmetric.
     *
     * @param table - Contingency table
     * @returns Test result
     */
    mcnemarsTest(table) {
        const b = table.aCorrectBIncorrect;
        const c = table.aIncorrectBCorrect;
        // Use exact binomial test for small samples
        if (b + c < 25) {
            return this.mcnemarsExact(b, c);
        }
        // Chi-square approximation with continuity correction
        let statistic;
        if (this.useContinuityCorrection) {
            // Yates' continuity correction
            statistic = Math.pow(Math.abs(b - c) - 1, 2) / (b + c);
        }
        else {
            statistic = Math.pow(b - c, 2) / (b + c);
        }
        // P-value from chi-square distribution with 1 df
        const pValue = 1 - this.chiSquareCDF(statistic, 1);
        // Effect size: Odds ratio
        const oddsRatio = c > 0 ? b / c : b > 0 ? Infinity : 1;
        const effectSize = Math.log(oddsRatio);
        return {
            testName: "McNemar's Test",
            statistic,
            pValue,
            effectSize: Math.abs(effectSize),
            effectSizeInterpretation: this.interpretEffectSize(Math.abs(effectSize), 'log_odds'),
            significant: pValue < this.alpha,
            degreesOfFreedom: 1,
            additional: {
                b,
                c,
                oddsRatio,
                totalDiscordant: b + c,
            },
        };
    }
    /**
     * Exact McNemar's test using binomial distribution
     */
    mcnemarsExact(b, c) {
        const n = b + c;
        if (n === 0) {
            return {
                testName: "McNemar's Exact Test",
                statistic: 0,
                pValue: 1,
                effectSize: 0,
                effectSizeInterpretation: 'negligible',
                significant: false,
                additional: { b, c, totalDiscordant: 0 },
            };
        }
        // Two-tailed binomial test
        const k = Math.min(b, c);
        let pValue = 0;
        for (let i = 0; i <= k; i++) {
            pValue += this.binomialPMF(n, i, 0.5);
        }
        pValue *= 2; // Two-tailed
        pValue = Math.min(pValue, 1);
        const oddsRatio = c > 0 ? b / c : b > 0 ? Infinity : 1;
        const effectSize = Math.log(oddsRatio);
        return {
            testName: "McNemar's Exact Test",
            statistic: k,
            pValue,
            effectSize: Math.abs(effectSize),
            effectSizeInterpretation: this.interpretEffectSize(Math.abs(effectSize), 'log_odds'),
            significant: pValue < this.alpha,
            additional: { b, c, totalDiscordant: n, oddsRatio },
        };
    }
    /**
     * Paired t-test for comparing means
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B (paired)
     * @returns Test result
     */
    pairedTTest(samplesA, samplesB) {
        if (samplesA.length !== samplesB.length) {
            throw new Error('Samples must have equal length for paired t-test');
        }
        const n = samplesA.length;
        if (n < 2) {
            throw new Error('Need at least 2 samples for paired t-test');
        }
        // Calculate differences
        const differences = samplesA.map((a, i) => a - samplesB[i]);
        // Mean and standard deviation of differences
        const meanDiff = this.mean(differences);
        const stdDiff = this.standardDeviation(differences);
        // T-statistic
        const standardError = stdDiff / Math.sqrt(n);
        const tStatistic = meanDiff / standardError;
        // Degrees of freedom
        const df = n - 1;
        // Two-tailed p-value
        const pValue = 2 * (1 - this.tCDF(Math.abs(tStatistic), df));
        // Cohen's d effect size
        const cohenD = meanDiff / stdDiff;
        return {
            testName: 'Paired t-Test',
            statistic: tStatistic,
            pValue,
            effectSize: Math.abs(cohenD),
            effectSizeInterpretation: this.interpretEffectSize(Math.abs(cohenD), 'cohens_d'),
            significant: pValue < this.alpha,
            degreesOfFreedom: df,
            additional: {
                meanDifference: meanDiff,
                stdDifference: stdDiff,
                standardError,
                cohenD,
                sampleSize: n,
            },
        };
    }
    /**
     * Wilcoxon signed-rank test (non-parametric)
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B (paired)
     * @returns Test result
     */
    wilcoxonSignedRank(samplesA, samplesB) {
        if (samplesA.length !== samplesB.length) {
            throw new Error('Samples must have equal length for Wilcoxon test');
        }
        const n = samplesA.length;
        // Calculate differences and remove zeros
        const differences = [];
        const signs = [];
        for (let i = 0; i < n; i++) {
            const diff = samplesA[i] - samplesB[i];
            if (diff !== 0) {
                differences.push(Math.abs(diff));
                signs.push(diff > 0 ? 1 : -1);
            }
        }
        const nNonZero = differences.length;
        if (nNonZero < 5) {
            // Not enough data for meaningful test
            return {
                testName: 'Wilcoxon Signed-Rank Test',
                statistic: 0,
                pValue: 1,
                effectSize: 0,
                effectSizeInterpretation: 'negligible',
                significant: false,
                additional: { warning: 'Too few non-zero differences' },
            };
        }
        // Rank the absolute differences
        const ranks = this.rankData(differences);
        // Sum of positive and negative ranks
        let wPlus = 0;
        let wMinus = 0;
        for (let i = 0; i < nNonZero; i++) {
            if (signs[i] > 0) {
                wPlus += ranks[i];
            }
            else {
                wMinus += ranks[i];
            }
        }
        const wStatistic = Math.min(wPlus, wMinus);
        // Normal approximation for large n
        const expectedW = (nNonZero * (nNonZero + 1)) / 4;
        const varW = (nNonZero * (nNonZero + 1) * (2 * nNonZero + 1)) / 24;
        const zStatistic = (wStatistic - expectedW) / Math.sqrt(varW);
        // Two-tailed p-value
        const pValue = 2 * this.normalCDF(-Math.abs(zStatistic));
        // Rank-biserial correlation as effect size
        const rankBiserial = 1 - (2 * wStatistic) / (nNonZero * (nNonZero + 1) / 2);
        return {
            testName: 'Wilcoxon Signed-Rank Test',
            statistic: wStatistic,
            pValue,
            effectSize: Math.abs(rankBiserial),
            effectSizeInterpretation: this.interpretEffectSize(Math.abs(rankBiserial), 'correlation'),
            significant: pValue < this.alpha,
            additional: {
                wPlus,
                wMinus,
                zStatistic,
                rankBiserial,
                nNonZero,
            },
        };
    }
    /**
     * Permutation test for comparing two systems
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B
     * @param nPermutations - Number of permutations
     * @returns Test result
     */
    permutationTest(samplesA, samplesB, nPermutations = 10000) {
        if (samplesA.length !== samplesB.length) {
            throw new Error('Samples must have equal length for permutation test');
        }
        const n = samplesA.length;
        const observedDiff = this.mean(samplesA) - this.mean(samplesB);
        // Generate permutation distribution
        let extremeCount = 0;
        for (let i = 0; i < nPermutations; i++) {
            // Randomly swap pairs
            let permutedDiff = 0;
            for (let j = 0; j < n; j++) {
                if (Math.random() < 0.5) {
                    permutedDiff += samplesA[j] - samplesB[j];
                }
                else {
                    permutedDiff += samplesB[j] - samplesA[j];
                }
            }
            permutedDiff /= n;
            if (Math.abs(permutedDiff) >= Math.abs(observedDiff)) {
                extremeCount++;
            }
        }
        const pValue = (extremeCount + 1) / (nPermutations + 1);
        // Effect size: standardized mean difference
        const pooledStd = Math.sqrt((this.variance(samplesA) + this.variance(samplesB)) / 2);
        const effectSize = pooledStd > 0 ? Math.abs(observedDiff) / pooledStd : 0;
        return {
            testName: 'Permutation Test',
            statistic: observedDiff,
            pValue,
            effectSize,
            effectSizeInterpretation: this.interpretEffectSize(effectSize, 'cohens_d'),
            significant: pValue < this.alpha,
            additional: {
                nPermutations,
                extremeCount,
                observedDifference: observedDiff,
            },
        };
    }
    /**
     * Build McNemar table from predictions
     *
     * @param predictionsA - Predictions from system A
     * @param predictionsB - Predictions from system B
     * @param groundTruth - Ground truth labels
     * @returns McNemar contingency table
     */
    buildMcNemarTable(predictionsA, predictionsB, groundTruth) {
        if (predictionsA.length !== predictionsB.length ||
            predictionsA.length !== groundTruth.length) {
            throw new Error('All arrays must have equal length');
        }
        let bothCorrect = 0;
        let aCorrectBIncorrect = 0;
        let aIncorrectBCorrect = 0;
        let bothIncorrect = 0;
        for (let i = 0; i < groundTruth.length; i++) {
            const aCorrect = predictionsA[i] === groundTruth[i];
            const bCorrect = predictionsB[i] === groundTruth[i];
            if (aCorrect && bCorrect)
                bothCorrect++;
            else if (aCorrect && !bCorrect)
                aCorrectBIncorrect++;
            else if (!aCorrect && bCorrect)
                aIncorrectBCorrect++;
            else
                bothIncorrect++;
        }
        return { bothCorrect, aCorrectBIncorrect, aIncorrectBCorrect, bothIncorrect };
    }
    // ============================================================================
    // Statistical helper functions
    // ============================================================================
    mean(arr) {
        if (arr.length === 0)
            return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    variance(arr) {
        if (arr.length < 2)
            return 0;
        const m = this.mean(arr);
        return arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (arr.length - 1);
    }
    standardDeviation(arr) {
        return Math.sqrt(this.variance(arr));
    }
    rankData(data) {
        const indexed = data.map((val, idx) => ({ val, idx }));
        indexed.sort((a, b) => a.val - b.val);
        const ranks = new Array(data.length);
        let i = 0;
        while (i < indexed.length) {
            let j = i;
            // Find ties
            while (j < indexed.length && indexed[j].val === indexed[i].val) {
                j++;
            }
            // Average rank for ties
            const avgRank = (i + j + 1) / 2;
            for (let k = i; k < j; k++) {
                ranks[indexed[k].idx] = avgRank;
            }
            i = j;
        }
        return ranks;
    }
    /**
     * Binomial probability mass function
     */
    binomialPMF(n, k, p) {
        const coefficient = this.binomialCoefficient(n, k);
        return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    binomialCoefficient(n, k) {
        if (k > n - k)
            k = n - k;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = (result * (n - i)) / (i + 1);
        }
        return result;
    }
    /**
     * Standard normal CDF (approximation)
     */
    normalCDF(z) {
        // Abramowitz and Stegun approximation
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 -
            ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        return 0.5 * (1.0 + sign * y);
    }
    /**
     * Chi-square CDF (approximation using normal)
     */
    chiSquareCDF(x, df) {
        if (x <= 0)
            return 0;
        // Wilson-Hilferty approximation
        const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df)) / Math.sqrt(2 / (9 * df));
        return this.normalCDF(z);
    }
    /**
     * Student's t CDF (approximation)
     */
    tCDF(t, df) {
        // Use normal approximation for large df
        if (df > 100) {
            return this.normalCDF(t);
        }
        // Numerical approximation for smaller df
        const x = df / (df + t * t);
        return 1 - 0.5 * this.incompleteBeta(df / 2, 0.5, x);
    }
    /**
     * Incomplete beta function (simple approximation)
     */
    incompleteBeta(a, b, x) {
        // Simple numerical integration
        const n = 1000;
        let sum = 0;
        const dx = x / n;
        for (let i = 1; i <= n; i++) {
            const xi = i * dx;
            sum += Math.pow(xi, a - 1) * Math.pow(1 - xi, b - 1);
        }
        // Normalize (approximate)
        const beta = (this.gamma(a) * this.gamma(b)) / this.gamma(a + b);
        return (sum * dx) / beta;
    }
    /**
     * Gamma function (Stirling approximation)
     */
    gamma(z) {
        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        }
        z -= 1;
        const g = 7;
        const c = [
            0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
        ];
        let x = c[0];
        for (let i = 1; i < g + 2; i++) {
            x += c[i] / (z + i);
        }
        const t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
    /**
     * Interpret effect size
     */
    interpretEffectSize(value, type) {
        const thresholds = {
            cohens_d: [0.2, 0.5, 0.8],
            correlation: [0.1, 0.3, 0.5],
            log_odds: [0.2, 0.5, 0.8],
        };
        const [small, medium, large] = thresholds[type];
        if (value < small)
            return 'negligible';
        if (value < medium)
            return 'small';
        if (value < large)
            return 'medium';
        return 'large';
    }
    /**
     * Generate summary for multiple tests
     */
    static summarize(results) {
        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════════╗');
        lines.push('║                   STATISTICAL TEST RESULTS                    ║');
        lines.push('╚══════════════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push('┌───────────────────────────┬──────────┬──────────┬────────────┐');
        lines.push('│ Test                      │ p-value  │ Effect   │ Signif.    │');
        lines.push('├───────────────────────────┼──────────┼──────────┼────────────┤');
        for (const result of results) {
            const name = result.testName.substring(0, 25).padEnd(25);
            const pVal = result.pValue.toExponential(2).padStart(8);
            const effect = result.effectSize.toFixed(3).padStart(8);
            const sig = (result.significant ? '✓ Yes' : '✗ No').padStart(10);
            lines.push(`│ ${name} │${pVal} │${effect} │${sig} │`);
        }
        lines.push('└───────────────────────────┴──────────┴──────────┴────────────┘');
        lines.push('');
        lines.push('Effect size interpretations:');
        lines.push('  negligible < small < medium < large');
        return lines.join('\n');
    }
}
exports.StatisticalTests = StatisticalTests;
/**
 * Create statistical tests instance
 */
function createStatisticalTests(options) {
    return new StatisticalTests(options);
}
//# sourceMappingURL=StatisticalTests.js.map