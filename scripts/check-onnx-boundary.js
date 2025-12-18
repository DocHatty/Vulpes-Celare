// Enforces the "single ORT owner" boundary:
// - No JS ONNX Runtime bindings (e.g., onnxruntime-node) in the Node process
// - Vision inference must remain in the Rust addon (ort)
//
// This is a regression guardrail to prevent reintroducing DLL conflicts.

const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[onnx-boundary] ${message}`);
  process.exit(1);
}

function hasDependency(pkg, name) {
  return Boolean(
    (pkg.dependencies && pkg.dependencies[name]) ||
      (pkg.devDependencies && pkg.devDependencies[name]) ||
      (pkg.optionalDependencies && pkg.optionalDependencies[name]) ||
      (pkg.peerDependencies && pkg.peerDependencies[name]),
  );
}

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      walk(full, files);
      continue;
    }
    if (!e.isFile()) continue;
    if (full.endsWith(".ts") || full.endsWith(".js")) files.push(full);
  }
}

function fileContains(filePath, needle) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.includes(needle);
  } catch {
    return false;
  }
}

function main() {
  const repoRoot = path.join(__dirname, "..");
  const pkgPath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(pkgPath)) fail("package.json not found");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  if (hasDependency(pkg, "onnxruntime-node")) {
    fail("package.json contains forbidden dependency: onnxruntime-node");
  }
  if (hasDependency(pkg, "onnxruntime")) {
    fail("package.json contains forbidden dependency: onnxruntime (JS binding)");
  }

  const lockPath = path.join(repoRoot, "package-lock.json");
  if (fs.existsSync(lockPath) && fileContains(lockPath, "onnxruntime-node")) {
    fail("package-lock.json references forbidden dependency: onnxruntime-node");
  }
  if (fs.existsSync(lockPath) && fileContains(lockPath, "\"onnxruntime\"")) {
    // Most repos shouldn't have this at all; if you intentionally add it, update this guardrail.
    fail("package-lock.json references forbidden dependency: onnxruntime (JS binding)");
  }

  const srcRoot = path.join(repoRoot, "src");
  if (!fs.existsSync(srcRoot)) fail("src/ not found");

  const files = [];
  walk(srcRoot, files);

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");

    if (text.includes("onnxruntime-node")) {
      fail(`Found forbidden onnxruntime-node reference in: ${path.relative(repoRoot, file)}`);
    }

    // Forbid JS ONNX Runtime imports/requires. Allow mentions of the native DLL filename.
    if (
      /from\s+["']onnxruntime["']/.test(text) ||
      /require\(\s*["']onnxruntime["']\s*\)/.test(text)
    ) {
      fail(`Found forbidden JS onnxruntime import/require in: ${path.relative(repoRoot, file)}`);
    }
  }

  console.log("[onnx-boundary] OK (no JS ONNX runtime bindings detected)");
}

main();
