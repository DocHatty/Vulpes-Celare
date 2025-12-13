"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadNativeBinding = loadNativeBinding;
const path_1 = require("path");
/**
 * Loads the platform-specific NAPI binding from `native/`.
 *
 * `configureOrt=true` sets `ORT_DYLIB_PATH` to the bundled DLL by default (Windows),
 * unless the user already provided `VULPES_ORT_PATH`/`ORT_DYLIB_PATH`.
 *
 * Keep this separate so text-only accelerators can load the addon without forcing ORT.
 */
function loadNativeBinding(options = {}) {
    const configureOrt = options.configureOrt ?? false;
    if (configureOrt) {
        if (process.env.VULPES_ORT_PATH && !process.env.ORT_DYLIB_PATH) {
            process.env.ORT_DYLIB_PATH = (0, path_1.resolve)(process.env.VULPES_ORT_PATH);
        }
        if (!process.env.ORT_DYLIB_PATH) {
            process.env.ORT_DYLIB_PATH = (0, path_1.resolve)(__dirname, "../../native/onnxruntime.dll");
        }
    }
    const platform = process.platform;
    const arch = process.arch;
    try {
        if (platform === "win32" && arch === "x64") {
            return require("../../native/vulpes_core.win32-x64-msvc.node");
        }
        if (platform === "darwin" && arch === "x64") {
            return require("../../native/vulpes_core.darwin-x64.node");
        }
        if (platform === "darwin" && arch === "arm64") {
            return require("../../native/vulpes_core.darwin-arm64.node");
        }
        if (platform === "linux" && arch === "x64") {
            return require("../../native/vulpes_core.linux-x64-gnu.node");
        }
        throw new Error(`Unsupported platform: ${platform}-${arch}`);
    }
    catch (e) {
        throw new Error("Vulpes native binding not found. Ensure the Rust core is built. " +
            "Run: cd src/rust && cargo build --release");
    }
}
//# sourceMappingURL=binding.js.map