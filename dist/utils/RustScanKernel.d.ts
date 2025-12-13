import { RedactionContext } from "../context/RedactionContext";
export type RustKernelDetection = {
    filterType: string;
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
};
export declare const RustScanKernel: {
    isAvailable(): boolean;
    getDetections(context: RedactionContext, text: string, type: string): RustKernelDetection[] | null;
};
//# sourceMappingURL=RustScanKernel.d.ts.map