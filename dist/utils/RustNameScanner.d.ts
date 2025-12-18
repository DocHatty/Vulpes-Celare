export type RustNameDetection = {
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
};
export declare const RustNameScanner: {
    isAvailable(): boolean;
    detectLastFirst(text: string): RustNameDetection[];
    detectFirstLast(text: string): RustNameDetection[];
    detectSmart(text: string): RustNameDetection[];
};
//# sourceMappingURL=RustNameScanner.d.ts.map