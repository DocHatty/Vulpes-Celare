/**
 * ProvenanceService
 *
 * Records redaction provenance to the local RPL layer (when available).
 * Extracted from `RedactionEngine` to keep orchestration concerns separate.
 */
export type ProvenanceRecordOptions = {
    /** Override the default endpoint (default: http://localhost:3106/provenance/record) */
    endpoint?: string;
    /** Optional document identifier; default is a generated ad-hoc ID */
    docId?: string;
    /** Optional actor identifier; default is "system-redaction-engine" */
    actorId?: string;
    /** Engine/version string to include in the manifest */
    engine?: string;
};
export declare class ProvenanceService {
    private static readonly DEFAULT_ENDPOINT;
    static recordRedaction(original: string, redacted: string, options?: ProvenanceRecordOptions): Promise<void>;
}
//# sourceMappingURL=ProvenanceService.d.ts.map