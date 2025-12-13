const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

try {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log(`Removed ${distDir}`);
  } else {
    console.log(`No dist directory found at ${distDir}`);
  }
} catch (error) {
  console.error(`Failed to remove ${distDir}:`, error);
  process.exitCode = 1;
}
