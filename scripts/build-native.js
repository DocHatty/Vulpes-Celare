// Cross-platform-ish native rebuild helper.
// Builds the Rust NAPI addon and copies the produced dynamic library into `native/`
// using the filename that `src/native/binding.ts` expects.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[native:build] ${message}`);
  process.exit(1);
}

function run(cmd, args, options) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0) {
    process.exit(res.status);
  }
}

function main() {
  const repoRoot = path.join(__dirname, "..");
  const rustDir = path.join(repoRoot, "src", "rust");
  const nativeDir = path.join(repoRoot, "native");

  if (!fs.existsSync(rustDir)) fail("Missing Rust crate at src/rust");
  if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });

  const platform = process.platform;
  const arch = process.arch;

  const targetName = (() => {
    if (platform === "win32" && arch === "x64") return "vulpes_core.win32-x64-msvc.node";
    if (platform === "darwin" && arch === "x64") return "vulpes_core.darwin-x64.node";
    if (platform === "darwin" && arch === "arm64") return "vulpes_core.darwin-arm64.node";
    if (platform === "linux" && arch === "x64") return "vulpes_core.linux-x64-gnu.node";
    return null;
  })();

  if (!targetName) {
    fail(`Unsupported platform/arch for this build helper: ${platform}-${arch}`);
  }

  run("cargo", ["build", "--release"], { cwd: rustDir });

  const releaseDir = path.join(rustDir, "target", "release");
  if (!fs.existsSync(releaseDir)) fail("Missing src/rust/target/release after build");

  // We build a cdylib and then rename it to `.node` for Node to load.
  const artifactPath = (() => {
    if (platform === "win32") return path.join(releaseDir, "vulpes_core.dll");
    if (platform === "darwin") return path.join(releaseDir, "libvulpes_core.dylib");
    if (platform === "linux") return path.join(releaseDir, "libvulpes_core.so");
    return null;
  })();

  if (!artifactPath || !fs.existsSync(artifactPath)) {
    fail(`Built artifact not found: ${artifactPath ?? "(unknown)"}`);
  }

  const destPath = path.join(nativeDir, targetName);
  fs.copyFileSync(artifactPath, destPath);
  console.log(`[native:build] Copied ${path.relative(repoRoot, artifactPath)} -> ${path.relative(repoRoot, destPath)}`);
}

main();
