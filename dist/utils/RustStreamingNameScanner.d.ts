export type RustStreamingNameDetection = {
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
};
export declare class RustStreamingNameScanner {
    private scanner;
    private initialized;
    constructor(overlapUtf16?: number);
    isAvailable(): boolean;
    reset(): void;
    push(chunk: string): RustStreamingNameDetection[];
}
//# sourceMappingURL=RustStreamingNameScanner.d.ts.map