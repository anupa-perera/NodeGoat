#!/usr/bin/env node

/**
 * Hackathon Judge System Validation Script
 * This script validates the system configuration and key components
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Hackathon Judge System Validation\n");

// File paths to check
const requiredFiles = [
  ".github/workflows/self-contained-hackathon-judge.yml",
  ".github/scripts/extract-pr-info.js",
  ".github/actions/sonar-analysis/action.yml",
  ".github/actions/sonar-analysis/fetch-sonar-details.js",
  ".github/actions/post-comment/action.yml",
  ".github/actions/post-comment/post-comment.js",
  "sonar-project.properties",
  ".github/docs/HACKATHON_JUDGE_SETUP.md",
];

const requiredActions = [
  "ai-detection",
  "calculate-score",
  "detect-stack",
  "frontend-audit",
  "install-deps",
  "post-comment",
  "security-scan",
  "setup-env",
  "sonar-analysis",
  "team-behavior",
  "test-coverage",
];

let allValid = true;

// Check required files
console.log("📁 Checking required files:");
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allValid = false;
  }
}

// Check action directories
console.log("\n🎬 Checking action directories:");
for (const action of requiredActions) {
  const actionPath = `.github/actions/${action}`;
  const actionFile = `${actionPath}/action.yml`;

  if (fs.existsSync(actionPath) && fs.existsSync(actionFile)) {
    console.log(`✅ ${action}`);
  } else {
    console.log(`❌ ${action} - MISSING`);
    allValid = false;
  }
}

// Check YAML syntax (basic)
console.log("\n📋 Checking YAML syntax:");
try {
  const workflowContent = fs.readFileSync(
    ".github/workflows/self-contained-hackathon-judge.yml",
    "utf8"
  );
  if (workflowContent.includes("name: Hackathon Judge")) {
    console.log("✅ Main workflow file appears valid");
  } else {
    console.log("❌ Main workflow file may be corrupted");
    allValid = false;
  }
} catch (error) {
  console.log("❌ Cannot read main workflow file");
  allValid = false;
}

// Check SonarCloud configuration
console.log("\n🔍 Checking SonarCloud configuration:");
try {
  const sonarConfig = fs.readFileSync("sonar-project.properties", "utf8");
  if (
    sonarConfig.includes("sonar.projectKey=") &&
    sonarConfig.includes("sonar.organization=")
  ) {
    console.log("✅ SonarCloud configuration file exists");
  } else {
    console.log("❌ SonarCloud configuration incomplete");
    allValid = false;
  }
} catch (error) {
  console.log("❌ SonarCloud configuration file missing");
  allValid = false;
}

// Check Node.js dependencies
console.log("\n📦 Checking Node.js setup:");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`✅ Package.json found (${packageJson.name})`);
} catch (error) {
  console.log("❌ Package.json not found or invalid");
  allValid = false;
}

// Final validation result
console.log("\n" + "=".repeat(50));
if (allValid) {
  console.log("🎉 System validation PASSED!");
  console.log("✅ All required components are present");
  console.log("🚀 System is ready for hackathon judging");
  console.log("\nNext steps:");
  console.log("1. Configure SonarCloud secrets and variables");
  console.log("2. Test with a sample pull request");
  console.log("3. Verify report generation works correctly");
} else {
  console.log("❌ System validation FAILED!");
  console.log("🔧 Please fix the missing components above");
  console.log(
    "📖 See .github/docs/HACKATHON_JUDGE_SETUP.md for setup instructions"
  );
}
console.log("=".repeat(50));

process.exit(allValid ? 0 : 1);
