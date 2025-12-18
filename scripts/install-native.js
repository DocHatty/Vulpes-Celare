// Postinstall helper: ensure the platform-specific native addon and pinned ORT
// shared library are present.
//
// Strategy:
// 1) If `native/<expected>.node` exists, do nothing.
// 2) Else, try downloading a prebuilt bundle from this repo's GitHub Releases.
// 3) Ensure ORT is present by downloading it (unless already bundled).
//
// Set `VULPES_SKIP_NATIVE_DOWNLOAD=1` to disable downloads.
// Set `VULPES_NATIVE_BUILD_FALLBACK=1` to fall back to `npm run native:build`.

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

function fail(message) {
  console.error(`[native:install] ${message}`);
  process.exit(1);
}

function run(cmd, args, options) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0)
    process.exit(res.status);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "vulpes-celare" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          const next = res.headers.location;
          if (!next) return reject(new Error("Redirect missing location"));
          file.close();
          fs.unlinkSync(dest);
          return resolve(downloadFile(next, dest));
        }
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

function ensureOrt(repoRoot) {
  const nativeDir = path.join(repoRoot, "native");
  const ortName =
    process.platform === "win32"
      ? "onnxruntime.dll"
      : process.platform === "darwin"
        ? "libonnxruntime.dylib"
        : "libonnxruntime.so";
  const ortPath = path.join(nativeDir, ortName);
  if (fs.existsSync(ortPath)) return;
  run("node", [path.join(repoRoot, "scripts", "download-ort.js")], {
    cwd: repoRoot,
  });
}

async function main() {
  const repoRoot = path.join(__dirname, "..");
  const nativeDir = path.join(repoRoot, "native");
  if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });

  const platform = process.platform;
  const arch = process.arch;
  const requireNative = process.env.VULPES_REQUIRE_NATIVE === "1";

  const bindingName = (() => {
    if (platform === "win32" && arch === "x64")
      return "vulpes_core.win32-x64-msvc.node";
    if (platform === "darwin" && arch === "x64")
      return "vulpes_core.darwin-x64.node";
    if (platform === "darwin" && arch === "arm64")
      return "vulpes_core.darwin-arm64.node";
    if (platform === "linux" && arch === "x64")
      return "vulpes_core.linux-x64-gnu.node";
    return null;
  })();

  if (!bindingName) {
    const msg =
      `Native addon is not available for this platform/arch (${platform}-${arch}). ` +
      `Vulpes will run in JS-only mode; set VULPES_REQUIRE_NATIVE=1 to hard-fail installs.`;
    if (requireNative) fail(msg);
    console.warn(`[native:install] ${msg}`);
    return;
  }

  const bindingPath = path.join(nativeDir, bindingName);
  if (fs.existsSync(bindingPath)) {
    ensureOrt(repoRoot);
    return;
  }

  // Windows-first packaging: allow other platforms to install without failing,
  // unless explicitly required.
  if (!(platform === "win32" && arch === "x64")) {
    const msg =
      `Missing native addon (${bindingName}) but prebuilt binaries are currently Windows-first. ` +
      `Vulpes will run in JS-only mode; set VULPES_REQUIRE_NATIVE=1 to hard-fail installs.`;
    if (requireNative) fail(msg);
    console.warn(`[native:install] ${msg}`);
    return;
  }

  // Developer ergonomics: if this is a git checkout, don't hard-fail installs
  // (prebuilt bundles are typically only available for published releases).
  if (
    fs.existsSync(path.join(repoRoot, ".git")) &&
    process.env.VULPES_FORCE_PREBUILT !== "1"
  ) {
    console.warn(
      `[native:install] Native addon missing in git checkout (${bindingName}). ` +
        `Build it locally with \`npm run native:build\` (or set VULPES_FORCE_PREBUILT=1 to force download).`,
    );
    return;
  }

  if (process.env.VULPES_SKIP_NATIVE_DOWNLOAD === "1") {
    fail(
      `Missing native addon (${bindingName}) and downloads are disabled; run \`npm run native:build\``,
    );
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const version = pkg.version || "0.0.0";
  const repoUrl =
    (pkg.repository && pkg.repository.url) ||
    "https://github.com/DocHatty/Vulpes-Celare.git";
  const cleanRepo = repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");

  const asset = `vulpes-native-${platform}-${arch}.tar.gz`;
  const url = `${cleanRepo}/releases/download/v${version}/${asset}`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vulpes-native-"));
  const archivePath = path.join(tmpDir, asset);

  console.log(`[native:install] Downloading prebuilt native bundle: ${url}`);
  try {
    await downloadFile(url, archivePath);
  } catch (e) {
    if (process.env.VULPES_NATIVE_BUILD_FALLBACK === "1") {
      console.warn(
        `[native:install] Download failed; falling back to local build (set VULPES_NATIVE_BUILD_FALLBACK=0 to disable): ${e instanceof Error ? e.message : String(e)}`,
      );
      run("node", [path.join(repoRoot, "scripts", "build-native.js")], {
        cwd: repoRoot,
      });
      ensureOrt(repoRoot);
      return;
    }
    fail(
      `Failed to download prebuilt native bundle (${asset}). You can either:\n` +
        `- build locally: \`npm run native:build\`\n` +
        `- or set VULPES_NATIVE_BUILD_FALLBACK=1 to auto-build during install\n` +
        `Error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  run("tar", ["-xf", archivePath, "-C", repoRoot]);

  if (!fs.existsSync(bindingPath)) {
    fail(`Prebuilt bundle extracted but binding still missing: ${bindingName}`);
  }

  ensureOrt(repoRoot);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
