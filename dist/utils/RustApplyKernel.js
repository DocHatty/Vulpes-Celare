"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustApplyKernel = void 0;
const binding_1 = require("../native/binding");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
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
    return RustAccelConfig_1.RustAccelConfig.isApplySpansEnabled();
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