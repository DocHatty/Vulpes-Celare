"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustStreamingNameScanner = void 0;
const binding_1 = require("../native/binding");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
class RustStreamingNameScanner {
    constructor(overlapUtf16 = 32) {
        this.scanner = null;
        this.initialized = false;
        try {
            const binding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
            if (binding.VulpesStreamingNameScanner) {
                this.scanner = new binding.VulpesStreamingNameScanner(overlapUtf16);
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
        if (!this.initialized) {
            const { firstNames, surnames } = NameDictionary_1.NameDictionary.getNameLists();
            this.scanner.initialize(firstNames, surnames);
            this.initialized = true;
        }
        try {
            return this.scanner.push(chunk);
        }
        catch {
            return [];
        }
    }
}
exports.RustStreamingNameScanner = RustStreamingNameScanner;
//# sourceMappingURL=RustStreamingNameScanner.js.map