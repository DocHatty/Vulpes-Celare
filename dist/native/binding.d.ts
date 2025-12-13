export type VulpesNativeBinding = {
    VulpesEngine: new (detPath: string, recPath: string) => {
        detectText(buffer: Buffer): {
            text: string;
            confidence: number;
            boxPoints: number[][];
        }[];
    };
    VulpesPhoneticMatcher?: new () => {
        initialize(firstNames: string[], surnames: string[]): void;
        matchFirstName(input: string): {
            original: string;
            matched: string;
            confidence: number;
            matchType: string;
        } | null;
        matchSurname(input: string): {
            original: string;
            matched: string;
            confidence: number;
            matchType: string;
        } | null;
        matchAnyName(input: string): {
            original: string;
            matched: string;
            confidence: number;
            matchType: string;
        } | null;
        isInitialized(): boolean;
        getStats(): {
            firstNames: number;
            surnames: number;
            primaryCodes: number;
            secondaryCodes: number;
        };
    };
    initCore: () => string;
    detectFaces: (buffer: Buffer, modelPath: string, confidenceThreshold?: number, nmsThreshold?: number) => {
        type: "FACE" | "SIGNATURE" | "FINGERPRINT" | "OTHER";
        box: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        confidence: number;
    }[];
    normalizeOcr?: (text: string) => string;
    extractDigits?: (text: string) => string;
    extractDigitsWithOcr?: (text: string) => string;
    extractAlphanumeric?: (text: string, preserveCase?: boolean) => string;
    passesLuhn?: (text: string) => boolean;
    dropOverlappingSpans?: (spans: {
        characterStart: number;
        characterEnd: number;
        filterType: string;
        confidence: number;
        priority: number;
    }[]) => number[];
    tokenizeWithPositions?: (text: string, includePunctuation: boolean) => {
        text: string;
        start: number;
        end: number;
    }[];
    sha256Hex?: (buffer: Buffer) => string;
    sha256HexString?: (text: string) => string;
    hmacSha256Hex?: (key: string, message: string) => string;
    merkleRootSha256Hex?: (leafHashesHex: string[]) => string;
    dicomHashToken?: (salt: string, value: string) => string;
    dicomHashUid?: (salt: string, value: string) => string;
};
type LoadOptions = {
    configureOrt?: boolean;
};
/**
 * Loads the platform-specific NAPI binding from `native/`.
 *
 * `configureOrt=true` sets `ORT_DYLIB_PATH` to the bundled DLL by default (Windows),
 * unless the user already provided `VULPES_ORT_PATH`/`ORT_DYLIB_PATH`.
 *
 * Keep this separate so text-only accelerators can load the addon without forcing ORT.
 */
export declare function loadNativeBinding(options?: LoadOptions): VulpesNativeBinding;
export {};
//# sourceMappingURL=binding.d.ts.map