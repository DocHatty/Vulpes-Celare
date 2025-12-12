const path = require("path");
const fs = require("fs");

process.env.ORT_DYLIB_PATH = path.resolve("onnxruntime.dll");
console.log("ORT_DYLIB_PATH set to:", process.env.ORT_DYLIB_PATH);

try {
  const bindingPath = "../native/vulpes_core.win32-x64-msvc.node";
  console.log("Loading binding from:", bindingPath);
  const binding = require(bindingPath);

  console.log("Testing initCore...");
  console.log(binding.initCore());

  const detPath = path.resolve("models/ocr/det.onnx");
  const recPath = path.resolve("models/ocr/rec.onnx");

  console.log("Creating Engine...");
  const engine = new binding.VulpesEngine(detPath, recPath);
  console.log("Engine created.");

  const imagePath = "test_image.png";
  if (fs.existsSync(imagePath)) {
    console.log("Reading image:", imagePath);
    const buffer = fs.readFileSync(imagePath);
    console.log("Detecting text...");
    const results = engine.detectText(buffer);
    console.log("Detected regions:", results.length);
  } else {
    console.log("No test image found.");
  }
} catch (e) {
  console.error("Test Failed:", e);
}
