/**
 * FDAExporter - FDA SaMD TPLC Documentation Generator
 *
 * Generates regulatory documentation for FDA submission of Vulpes Celare
 * as Software as a Medical Device (SaMD) under the Total Product Life Cycle
 * (TPLC) framework.
 *
 * Key documents generated:
 * - Pre-market Cyber Controls Plan (PCCP)
 * - Software Bill of Materials (SBOM)
 * - Validation Summary Report
 * - Risk Assessment Matrix
 *
 * @module compliance/FDAExporter
 */
export interface SBOMEntry {
    /** Package name */
    name: string;
    /** Package version */
    version: string;
    /** License type */
    license: string;
    /** Supplier/author */
    supplier: string;
    /** Known vulnerabilities */
    vulnerabilities: string[];
    /** Is critical component */
    isCritical: boolean;
}
export interface RiskEntry {
    /** Risk identifier */
    id: string;
    /** Risk category */
    category: 'SECURITY' | 'ACCURACY' | 'AVAILABILITY' | 'PRIVACY';
    /** Risk description */
    description: string;
    /** Severity (1-5) */
    severity: number;
    /** Likelihood (1-5) */
    likelihood: number;
    /** Risk score (severity * likelihood) */
    riskScore: number;
    /** Mitigation strategy */
    mitigation: string;
    /** Residual risk level */
    residualRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface ValidationResult {
    /** Test category */
    category: string;
    /** Number of tests */
    testCount: number;
    /** Tests passed */
    passed: number;
    /** Tests failed */
    failed: number;
    /** Pass rate percentage */
    passRate: number;
    /** Key findings */
    findings: string[];
}
export interface TPLCReport {
    /** Document version */
    version: string;
    /** Generation timestamp */
    generatedAt: string;
    /** Software version */
    softwareVersion: string;
    /** Product name */
    productName: string;
    /** Intended use statement */
    intendedUse: string;
    /** Device classification */
    deviceClass: 'I' | 'II' | 'III';
    /** Cybersecurity risk level */
    cyberRiskLevel: 'STANDARD' | 'ENHANCED';
    /** Software Bill of Materials */
    sbom: SBOMEntry[];
    /** Risk assessment */
    riskAssessment: RiskEntry[];
    /** Validation results */
    validation: ValidationResult[];
    /** Pre-market Cyber Controls Plan sections */
    pccp: {
        threatModel: string;
        vulnerabilityManagement: string;
        softwareUpdatePlan: string;
        incidentResponse: string;
    };
}
export interface ExportOptions {
    /** Output format */
    format: 'json' | 'markdown' | 'pdf';
    /** Include SBOM */
    includeSBOM: boolean;
    /** Include risk assessment */
    includeRiskAssessment: boolean;
    /** Include validation results */
    includeValidation: boolean;
    /** Software version to document */
    softwareVersion: string;
}
export declare class FDAExporter {
    private static instance;
    private constructor();
    static getInstance(): FDAExporter;
    /**
     * Generate TPLC documentation
     */
    generateTPLCReport(options?: Partial<ExportOptions>): TPLCReport;
    /**
     * Export report to specified format
     */
    export(report: TPLCReport, format: 'json' | 'markdown' | 'pdf'): string;
    /**
     * Get intended use statement
     */
    private getIntendedUse;
    /**
     * Generate Software Bill of Materials
     */
    private generateSBOM;
    /**
     * Generate risk assessment
     */
    private generateRiskAssessment;
    /**
     * Generate validation summary
     */
    private generateValidationSummary;
    /**
     * Generate Pre-market Cyber Controls Plan
     */
    private generatePCCP;
    /**
     * Convert report to Markdown format
     */
    private toMarkdown;
}
export declare const fdaExporter: FDAExporter;
//# sourceMappingURL=FDAExporter.d.ts.map