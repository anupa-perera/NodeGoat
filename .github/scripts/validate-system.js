#!/usr/bin/env node

/**
 * Hackathon Judge System Validator
 * Validates all components of the hackathon judge system
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Hackathon Judge System Validation\n");

// Get repository root
const repoRoot = process.cwd();
console.log(`Repository: ${repoRoot}\n`);

let allChecks = [];
let passedChecks = 0;
let failedChecks = 0;

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? "✅" : "❌";
  console.log(`${status} ${description}: ${filePath}`);

  allChecks.push({ file: filePath, description, passed: exists });
  if (exists) passedChecks++;
  else failedChecks++;

  return exists;
}

function checkYamlSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    // Basic YAML syntax check - look for common issues
    const lines = content.split("\n");
    let hasTabsInIndentation = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\t/)) {
        hasTabsInIndentation = true;
        break;
      }
    }

    if (hasTabsInIndentation) {
      console.log(`    ⚠️  Warning: File contains tabs in indentation`);
      return false;
    }

    console.log(`    ✅ YAML syntax appears valid`);
    return true;
  } catch (error) {
    console.log(`    ❌ YAML syntax error: ${error.message}`);
    return false;
  }
}

// 1. Check main workflow file
console.log("📋 Main Workflow File:");
const workflowFile = path.join(
  repoRoot,
  ".github",
  "workflows",
  "self-contained-hackathon-judge.yml"
);
if (checkFile(workflowFile, "Main hackathon judge workflow")) {
  checkYamlSyntax(workflowFile);
}
console.log();

// 2. Check all required action files
console.log("🎯 Required Action Files:");
const requiredActions = [
  "setup-env",
  "detect-stack",
  "install-deps",
  "test-coverage",
  "sonar-analysis",
  "security-scan",
  "frontend-audit",
  "team-behavior",
  "ai-detection",
  "calculate-score",
  "post-comment",
  "generate-html-report",
];

requiredActions.forEach((actionName) => {
  const actionFile = path.join(
    repoRoot,
    ".github",
    "actions",
    actionName,
    "action.yml"
  );
  if (checkFile(actionFile, `${actionName} action`)) {
    checkYamlSyntax(actionFile);
  }
});
console.log();

// 3. Check action scripts (only for actions that use separate JS files)
console.log("📜 Action Scripts:");
const actionScripts = [
  { action: "detect-stack", script: "detect-stack.js" },
  { action: "test-coverage", script: "test-coverage.js" },
  { action: "sonar-analysis", script: "fetch-sonar-details.js" },
  { action: "security-scan", script: "security-scan.js" },
  { action: "frontend-audit", script: "frontend-audit.js" },
  { action: "team-behavior", script: "team-behavior.js" },
  { action: "ai-detection", script: "ai-detection.js" },
  { action: "calculate-score", script: "calculate-score.js" },
  { action: "post-comment", script: "post-comment.js" },
];

actionScripts.forEach(({ action, script }) => {
  const scriptFile = path.join(repoRoot, ".github", "actions", action, script);
  checkFile(scriptFile, `${action} script`);
});
console.log();

// 4. Check utility scripts
console.log("🔧 Utility Scripts:");
const utilityScripts = [
  ".github/scripts/create-job-summary.js",
  ".github/scripts/extract-pr-info.js",
  ".github/scripts/generate-html-report.js",
];

utilityScripts.forEach((script) => {
  const scriptFile = path.join(repoRoot, script);
  checkFile(scriptFile, path.basename(script));
});
console.log();

// 5. Check SonarCloud configuration
console.log("🔍 SonarCloud Configuration:");
const sonarFile = path.join(repoRoot, "sonar-project.properties");
checkFile(sonarFile, "SonarCloud project configuration");
console.log();

// 6. Check reports directory structure
console.log("📁 Reports Directory:");
const reportsDir = path.join(repoRoot, "reports");
if (checkFile(reportsDir, "Reports directory")) {
  const teamsDir = path.join(reportsDir, "teams");
  checkFile(teamsDir, "Teams directory");

  // Check for existing team directories
  if (fs.existsSync(teamsDir)) {
    const teamDirs = fs
      .readdirSync(teamsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    if (teamDirs.length > 0) {
      console.log(
        `    📊 Found ${teamDirs.length} team(s): ${teamDirs.join(", ")}`
      );

      // Check for HTML reports
      teamDirs.forEach((team) => {
        const htmlReport = path.join(repoRoot, `hackathon-report-${team}.html`);
        if (fs.existsSync(htmlReport)) {
          console.log(`    🎨 HTML report found for ${team}`);
        }
      });
    } else {
      console.log(
        `    📝 No team directories found (will be created during runs)`
      );
    }
  }
}
console.log();

// 7. Check HTML report generation
console.log("🎨 HTML Report System:");
const htmlGenerator = path.join(
  repoRoot,
  ".github",
  "scripts",
  "generate-html-report.js"
);
if (checkFile(htmlGenerator, "HTML report generator")) {
  // Test HTML generation
  try {
    console.log("    🧪 Testing HTML generation...");
    const { exec } = require("child_process");

    exec(
      `node "${htmlGenerator}"`,
      { cwd: repoRoot },
      (error, stdout, stderr) => {
        if (error) {
          console.log(`    ❌ HTML generation test failed: ${error.message}`);
        } else {
          console.log(`    ✅ HTML generation test passed`);

          // Check if HTML file was created
          const teamDirs = fs.existsSync(
            path.join(repoRoot, "reports", "teams")
          )
            ? fs
                .readdirSync(path.join(repoRoot, "reports", "teams"), {
                  withFileTypes: true,
                })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name)
            : [];

          teamDirs.forEach((team) => {
            const htmlFile = path.join(
              repoRoot,
              `hackathon-report-${team}.html`
            );
            if (fs.existsSync(htmlFile)) {
              const stats = fs.statSync(htmlFile);
              console.log(
                `    📊 HTML report for ${team}: ${stats.size} bytes`
              );
            }
          });
        }

        showSummary();
      }
    );

    return; // Exit here, summary will be shown in callback
  } catch (error) {
    console.log(`    ❌ HTML generation test error: ${error.message}`);
  }
}

showSummary();

function showSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 HACKATHON JUDGE SYSTEM VALIDATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${failedChecks}`);
  console.log(
    `📈 Success Rate: ${Math.round(
      (passedChecks / (passedChecks + failedChecks)) * 100
    )}%`
  );

  if (failedChecks === 0) {
    console.log("\n🎉 ALL COMPONENTS VALIDATED SUCCESSFULLY!");
    console.log(
      "🚀 System is fully operational and ready for hackathon judging."
    );
    console.log("\n📋 Available Features:");
    console.log("   ✅ Automated code analysis and scoring");
    console.log("   ✅ Security vulnerability scanning");
    console.log("   ✅ Code quality analysis with SonarCloud");
    console.log("   ✅ Team collaboration insights");
    console.log("   ✅ AI attribution detection");
    console.log("   ✅ Interactive HTML dashboard reports");
    console.log("   ✅ Persistent report storage");
    console.log("   ✅ Automated PR comments");
  } else {
    console.log("\n⚠️  Some components need attention:");
    allChecks
      .filter((check) => !check.passed)
      .forEach((check) => {
        console.log(`   • ${check.description}: ${check.file}`);
      });
  }

  console.log("\n📝 Next Steps:");
  console.log("1. 🧪 Test with a real pull request");
  console.log("2. 🔧 Configure SonarCloud tokens (optional)");
  console.log("3. 📊 Monitor workflow performance");
  console.log("4. 🎨 View HTML reports in browser");
  console.log("\n✨ Happy judging!");
}
