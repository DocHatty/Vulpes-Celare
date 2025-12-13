"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextAccel = void 0;
const binding_1 = require("./native/binding");
let cachedNative;
function getNative() {
    if (cachedNative !== undefined)
        return cachedNative;
    try {
        const binding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
        cachedNative = {
            normalizeOcr: typeof binding.normalizeOcr === "function"
                ? binding.normalizeOcr
                : undefined,
            extractDigits: typeof binding.extractDigits === "function"
                ? binding.extractDigits
                : undefined,
            extractDigitsWithOcr: typeof binding.extractDigitsWithOcr === "function"
                ? binding.extractDigitsWithOcr
                : undefined,
            extractAlphanumeric: typeof binding.extractAlphanumeric === "function"
                ? binding.extractAlphanumeric
                : undefined,
            passesLuhn: typeof binding.passesLuhn === "function"
                ? binding.passesLuhn
                : undefined,
        };
        return cachedNative;
    }
    catch {
        cachedNative = null;
        return null;
    }
}
exports.TextAccel = {
    isEnabled() {
        return process.env.VULPES_TEXT_ACCEL === "1";
    },
    /**
     * Normalizes common OCR substitutions (O->0, l/I/|->1, S->5, etc.) in Rust.
     *
     * Disabled by default to avoid forcing the native addon for text-only users.
     * Enable via `VULPES_TEXT_ACCEL=1`.
     */
    normalizeOCR(text) {
        if (!this.isEnabled())
            return text;
        const native = getNative();
        if (!native?.normalizeOcr)
            return text;
        return native.normalizeOcr(text);
    },
    extractDigits(text) {
        if (!this.isEnabled())
            return null;
        const native = getNative();
        if (!native?.extractDigits)
            return null;
        return native.extractDigits(text);
    },
    extractDigitsWithOCR(text) {
        if (!this.isEnabled())
            return null;
        const native = getNative();
        if (!native?.extractDigitsWithOcr)
            return null;
        return native.extractDigitsWithOcr(text);
    },
    extractAlphanumeric(text, preserveCase = true) {
        if (!this.isEnabled())
            return null;
        const native = getNative();
        if (!native?.extractAlphanumeric)
            return null;
        return native.extractAlphanumeric(text, preserveCase);
    },
    passesLuhn(text) {
        if (!this.isEnabled())
            return null;
        const native = getNative();
        if (!native?.passesLuhn)
            return null;
        return native.passesLuhn(text);
    },
};
//# sourceMappingURL=TextAccel.js.map