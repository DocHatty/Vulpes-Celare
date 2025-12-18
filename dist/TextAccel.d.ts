export declare const TextAccel: {
    isEnabled(): boolean;
    /**
     * Normalizes common OCR substitutions (O->0, l/I/|->1, S->5, etc.) in Rust.
     *
     * Disabled by default to avoid forcing the native addon for text-only users.
     * Enable via `VULPES_TEXT_ACCEL=1`.
     */
    normalizeOCR(text: string): string;
    extractDigits(text: string): string | null;
    extractDigitsWithOCR(text: string): string | null;
    extractAlphanumeric(text: string, preserveCase?: boolean): string | null;
    passesLuhn(text: string): boolean | null;
};
//# sourceMappingURL=TextAccel.d.ts.map