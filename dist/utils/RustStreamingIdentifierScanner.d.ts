export type RustStreamingIdentifierDetection = {
    filterType: string;
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
};
export declare class RustStreamingIdentifierScanner {
    private scanner;
    constructor(overlapUtf16?: number);
    isAvailable(): boolean;
    reset(): void;
    push(chunk: string): RustStreamingIdentifierDetection[];
}
//# sourceMappingURL=RustStreamingIdentifierScanner.d.ts.map