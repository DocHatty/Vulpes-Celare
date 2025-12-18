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
/**
 * Test result with interpretation
 */
export interface TestResult {
    /** Test name */
    testName: string;
    /** Test statistic value */
    statistic: number;
    /** P-value */
    pValue: number;
    /** Effect size */
    effectSize: number;
    /** Effect size interpretation */
    effectSizeInterpretation: 'negligible' | 'small' | 'medium' | 'large';
    /** Whether difference is significant at alpha=0.05 */
    significant: boolean;
    /** Degrees of freedom (if applicable) */
    degreesOfFreedom?: number;
    /** Additional statistics */
    additional?: Record<string, number | string>;
}
/**
 * McNemar contingency table
 */
export interface McNemarTable {
    /** Both correct */
    bothCorrect: number;
    /** A correct, B incorrect */
    aCorrectBIncorrect: number;
    /** A incorrect, B correct */
    aIncorrectBCorrect: number;
    /** Both incorrect */
    bothIncorrect: number;
}
/**
 * StatisticalTests - Comprehensive statistical testing for NER evaluation
 */
export declare class StatisticalTests {
    private readonly alpha;
    private readonly useContinuityCorrection;
    constructor(options?: {
        alpha?: number;
        useContinuityCorrection?: boolean;
    });
    /**
     * McNemar's test for paired binary classifications
     *
     * Compares two classifiers on the same data.
     * Null hypothesis: The disagreements are symmetric.
     *
     * @param table - Contingency table
     * @returns Test result
     */
    mcnemarsTest(table: McNemarTable): TestResult;
    /**
     * Exact McNemar's test using binomial distribution
     */
    private mcnemarsExact;
    /**
     * Paired t-test for comparing means
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B (paired)
     * @returns Test result
     */
    pairedTTest(samplesA: number[], samplesB: number[]): TestResult;
    /**
     * Wilcoxon signed-rank test (non-parametric)
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B (paired)
     * @returns Test result
     */
    wilcoxonSignedRank(samplesA: number[], samplesB: number[]): TestResult;
    /**
     * Permutation test for comparing two systems
     *
     * @param samplesA - Samples from system A
     * @param samplesB - Samples from system B
     * @param nPermutations - Number of permutations
     * @returns Test result
     */
    permutationTest(samplesA: number[], samplesB: number[], nPermutations?: number): TestResult;
    /**
     * Build McNemar table from predictions
     *
     * @param predictionsA - Predictions from system A
     * @param predictionsB - Predictions from system B
     * @param groundTruth - Ground truth labels
     * @returns McNemar contingency table
     */
    buildMcNemarTable(predictionsA: boolean[], predictionsB: boolean[], groundTruth: boolean[]): McNemarTable;
    private mean;
    private variance;
    private standardDeviation;
    private rankData;
    /**
     * Binomial probability mass function
     */
    private binomialPMF;
    private binomialCoefficient;
    /**
     * Standard normal CDF (approximation)
     */
    private normalCDF;
    /**
     * Chi-square CDF (approximation using normal)
     */
    private chiSquareCDF;
    /**
     * Student's t CDF (approximation)
     */
    private tCDF;
    /**
     * Incomplete beta function (simple approximation)
     */
    private incompleteBeta;
    /**
     * Gamma function (Stirling approximation)
     */
    private gamma;
    /**
     * Interpret effect size
     */
    private interpretEffectSize;
    /**
     * Generate summary for multiple tests
     */
    static summarize(results: TestResult[]): string;
}
/**
 * Create statistical tests instance
 */
export declare function createStatisticalTests(options?: {
    alpha?: number;
    useContinuityCorrection?: boolean;
}): StatisticalTests;
