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
    VulpesNameScanner?: new () => {
        initialize(firstNames: string[], surnames: string[]): void;
        detectLastFirst(text: string): {
            characterStart: number;
            characterEnd: number;
            text: string;
            confidence: number;
            pattern: string;
        }[];
        detectFirstLast?(text: string): {
            characterStart: number;
            characterEnd: number;
            text: string;
            confidence: number;
            pattern: string;
        }[];
        detectSmart?(text: string): {
            characterStart: number;
            characterEnd: number;
            text: string;
            confidence: number;
            pattern: string;
        }[];
        isInitialized(): boolean;
        getStats(): {
            firstNames: number;
            surnames: number;
        };
    };
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
    postfilterDecisions?: (spans: {
        filterType: string;
        text: string;
        confidence: number;
    }[]) => {
        keep: boolean;
        removedBy?: string | null;
    }[];
    VulpesStreamingKernel?: new (mode: string, bufferSize: number, overlap: number) => {
        push(chunk: string): void;
        popSegment(force?: boolean): string | null;
        reset(): void;
        getStats(): {
            bufferLenUtf16: number;
            lastSentenceEndUtf16: number;
            lastWhitespaceUtf16: number;
        };
    };
    VulpesStreamingNameScanner?: new (overlapUtf16: number) => {
        initialize(firstNames: string[], surnames: string[]): void;
        isInitialized(): boolean;
        reset(): void;
        push(textChunk: string): {
            characterStart: number;
            characterEnd: number;
            text: string;
            confidence: number;
            pattern: string;
        }[];
    };
    VulpesStreamingIdentifierScanner?: new (overlapUtf16: number) => {
        reset(): void;
        push(textChunk: string): {
            filterType: string;
            characterStart: number;
            characterEnd: number;
            text: string;
            confidence: number;
            pattern: string;
        }[];
    };
    sha256Hex?: (buffer: Buffer) => string;
    sha256HexString?: (text: string) => string;
    hmacSha256Hex?: (key: string, message: string) => string;
    merkleRootSha256Hex?: (leafHashesHex: string[]) => string;
    dicomHashToken?: (salt: string, value: string) => string;
    dicomHashUid?: (salt: string, value: string) => string;
    scanAllIdentifiers?: (text: string) => {
        filterType: string;
        characterStart: number;
        characterEnd: number;
        text: string;
        confidence: number;
        pattern: string;
    }[];
    applyReplacements?: (text: string, replacements: {
        characterStart: number;
        characterEnd: number;
        replacement: string;
    }[]) => string;
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