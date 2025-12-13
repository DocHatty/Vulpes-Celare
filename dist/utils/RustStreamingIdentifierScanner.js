"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustStreamingIdentifierScanner = void 0;
const binding_1 = require("../native/binding");
class RustStreamingIdentifierScanner {
    constructor(overlapUtf16 = 64) {
        this.scanner = null;
        try {
            const binding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
            if (binding.VulpesStreamingIdentifierScanner) {
                this.scanner = new binding.VulpesStreamingIdentifierScanner(overlapUtf16);
            }
        }
        catch {
            this.scanner = null;
        }
    }
    isAvailable() {
        return Boolean(this.scanner);
    }
    reset() {
        this.scanner?.reset();
    }
    push(chunk) {
        if (!this.scanner)
            return [];
        try {
            return this.scanner.push(chunk);
        }
        catch {
            return [];
        }
    }
}
exports.RustStreamingIdentifierScanner = RustStreamingIdentifierScanner;
//# sourceMappingURL=RustStreamingIdentifierScanner.js.map