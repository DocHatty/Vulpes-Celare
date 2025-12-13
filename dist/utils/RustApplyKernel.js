"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustApplyKernel = void 0;
const binding_1 = require("../native/binding");
let cachedBinding = undefined;
function getBinding() {
    if (cachedBinding !== undefined)
        return cachedBinding;
    try {
        cachedBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedBinding = null;
    }
    return cachedBinding;
}
function isEnabled() {
    // Rust apply kernel is now DEFAULT (promoted from opt-in).
    // Set VULPES_APPLY_SPANS_ACCEL=0 to disable and use pure TypeScript.
    const val = process.env.VULPES_APPLY_SPANS_ACCEL;
    return val === undefined || val === "1";
}
exports.RustApplyKernel = {
    isAvailable() {
        return typeof getBinding()?.applyReplacements === "function";
    },
    apply(text, replacements) {
        if (!isEnabled())
            return null;
        const binding = getBinding();
        const apply = binding?.applyReplacements;
        if (typeof apply !== "function")
            return null;
        try {
            return apply(text, replacements);
        }
        catch {
            return null;
        }
    },
    applyUnsafe(text, replacements) {
        const binding = getBinding();
        const apply = binding?.applyReplacements;
        if (typeof apply !== "function")
            return null;
        try {
            return apply(text, replacements);
        }
        catch {
            return null;
        }
    },
};
//# sourceMappingURL=RustApplyKernel.js.map