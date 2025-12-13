"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustScanKernel = void 0;
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
function isKernelEnabled() {
    return process.env.VULPES_SCAN_ACCEL === "1";
}
const cache = new WeakMap();
exports.RustScanKernel = {
    isAvailable() {
        return typeof getBinding()?.scanAllIdentifiers === "function";
    },
    getDetections(context, text, type) {
        if (!isKernelEnabled())
            return null;
        const binding = getBinding();
        const scanAll = binding?.scanAllIdentifiers;
        if (typeof scanAll !== "function")
            return null;
        const existing = cache.get(context);
        if (existing && existing.text === text) {
            return existing.byType.get(type) ?? [];
        }
        let detections = [];
        try {
            detections = scanAll(text) ?? [];
        }
        catch {
            detections = [];
        }
        const byType = new Map();
        for (const d of detections) {
            const list = byType.get(d.filterType) ?? [];
            list.push(d);
            byType.set(d.filterType, list);
        }
        cache.set(context, { text, byType });
        return byType.get(type) ?? [];
    },
};
//# sourceMappingURL=RustScanKernel.js.map