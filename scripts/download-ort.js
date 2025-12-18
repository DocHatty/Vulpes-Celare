// Downloads a pinned ONNX Runtime (ORT) shared library into `native/` for the
// current platform/arch. Intended for CI and deterministic local setup.
//
// Uses GitHub release assets from microsoft/onnxruntime.

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

function fail(message) {
  console.error(`[ort:download] ${message}`);
  process.exit(1);
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "vulpes-celare",
            Accept: "application/vnd.github+json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new Error(`HTTP ${res.statusCode} for ${url}: ${data}`),
              );
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        },
      )
      .on("error", reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "vulpes-celare",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
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
        },
      )
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

function run(cmd, args, options) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0)
    process.exit(res.status);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  const repoRoot = path.join(__dirname, "..");
  const nativeDir = path.join(repoRoot, "native");
  if (!fs.existsSync(nativeDir)) fs.mkdirSync(nativeDir, { recursive: true });

  const pkg = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const version =
    process.env.VULPES_ORT_VERSION || pkg.vulpesOrtVersion || "1.22.0";
  const tag = `v${version}`;

  const platform = process.platform;
  const arch = process.arch;

  const assetName = (() => {
    if (platform === "win32" && arch === "x64")
      return `onnxruntime-win-x64-${version}.zip`;
    if (platform === "linux" && arch === "x64")
      return `onnxruntime-linux-x64-${version}.tgz`;
    if (platform === "darwin" && arch === "x64")
      return `onnxruntime-osx-x86_64-${version}.tgz`;
    if (platform === "darwin" && arch === "arm64")
      return `onnxruntime-osx-arm64-${version}.tgz`;
    return null;
  })();

  if (!assetName) {
    fail(`Unsupported platform/arch: ${platform}-${arch}`);
  }

  const destName = (() => {
    if (platform === "win32") return "onnxruntime.dll";
    if (platform === "darwin") return "libonnxruntime.dylib";
    return "libonnxruntime.so";
  })();

  const destPath = path.join(nativeDir, destName);
  if (fs.existsSync(destPath) && process.env.VULPES_ORT_FORCE !== "1") {
    console.log(
      `[ort:download] ORT already present: ${path.relative(repoRoot, destPath)}`,
    );
    return;
  }

  const release = `https://api.github.com/repos/microsoft/onnxruntime/releases/tags/${tag}`;
  console.log(`[ort:download] Fetching release metadata: ${release}`);
  const json = await requestJson(release);
  const assets = Array.isArray(json.assets) ? json.assets : [];
  const asset = assets.find((a) => a && a.name === assetName);
  if (!asset || !asset.browser_download_url) {
    const names = assets.map((a) => a.name).filter(Boolean);
    fail(`ORT asset not found: ${assetName}\nAvailable: ${names.join(", ")}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vulpes-ort-"));
  const archivePath = path.join(tmpDir, assetName);

  console.log(`[ort:download] Downloading ${assetName}`);
  await downloadFile(asset.browser_download_url, archivePath);

  const extractDir = path.join(tmpDir, "extract");
  fs.mkdirSync(extractDir, { recursive: true });

  // Use the platform tar to handle both .zip and .tgz.
  run("tar", ["-xf", archivePath, "-C", extractDir]);

  const files = walk(extractDir);

  const pickBasename = (() => {
    if (platform === "win32") return "onnxruntime.dll";
    if (platform === "darwin") return "libonnxruntime.dylib";
    return "libonnxruntime.so";
  })();

  let match = files.find((f) => path.basename(f) === pickBasename);
  if (!match && platform === "linux") {
    match = files.find((f) =>
      path.basename(f).startsWith("libonnxruntime.so."),
    );
  }
  if (!match) {
    fail(`Failed to locate ORT shared library after extract (${pickBasename})`);
  }

  fs.copyFileSync(match, destPath);
  console.log(
    `[ort:download] Copied ${path.relative(extractDir, match)} -> ${path.relative(repoRoot, destPath)}`,
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
