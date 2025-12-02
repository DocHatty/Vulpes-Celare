const path = require("path");

async function runTest() {
  console.log("Loading VulpesCelare...");
  
  const { VulpesCelare } = require("../dist/VulpesCelare.js");
  
  console.log("VulpesCelare loaded:", VulpesCelare.NAME, "v" + VulpesCelare.VERSION);
  
  const testText = "Patient John Smith (SSN: 123-45-6789) was seen by Dr. Jane Wilson on 01/15/2024. Contact: 555-123-4567, john.smith@email.com. MRN: MRN123456.";
  
  console.log("\nOriginal text:");
  console.log(testText);
  
  const result = await VulpesCelare.redact(testText);
  
  console.log("\nRedacted text:");
  console.log(result);
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
