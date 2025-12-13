export type RustReplacement = {
    characterStart: number;
    characterEnd: number;
    replacement: string;
};
export declare const RustApplyKernel: {
    isAvailable(): boolean;
    apply(text: string, replacements: RustReplacement[]): string | null;
    applyUnsafe(text: string, replacements: RustReplacement[]): string | null;
};
//# sourceMappingURL=RustApplyKernel.d.ts.map