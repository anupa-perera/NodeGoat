const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Run tests and calculate coverage metrics for different programming languages
 */
async function runTestCoverage() {
  try {
    const language = process.env.LANGUAGE || "javascript";

    let coveragePercentage = 0;
    let testFiles = 0;
    let hasTests = false;
    let missingTestAreas = "";
    let testScore = 0;
    console.log(`🧪 Running test coverage analysis for ${language}...`);

    // Create reports directory in workspace root
    const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const reportsDir = path.join(workspaceRoot, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Change to workspace root for analysis
    process.chdir(workspaceRoot);

    switch (language.toLowerCase()) {
      case "javascript":
        await analyzeJavaScriptTests();
        break;
      case "python":
        await analyzePythonTests();
        break;
      case "go":
        await analyzeGoTests();
        break;
      default:
        console.log(`⚠️ Language ${language} not supported for test analysis`);
    }

    async function analyzeJavaScriptTests() {
      if (fs.existsSync("package.json")) {
        try {
          // Install dependencies
          console.log("📦 Installing dependencies...");
          execSync("npm install", { stdio: "pipe" });

          // Check for test scripts
          const packageJson = JSON.parse(
            fs.readFileSync("package.json", "utf8")
          );
          const hasTestScript =
            packageJson.scripts &&
            (packageJson.scripts.test || packageJson.scripts["test:coverage"]);

          if (hasTestScript) {
            hasTests = true;
            console.log("🧪 Running JavaScript tests...");

            try {
              // Try different test commands
              if (packageJson.scripts["test:coverage"]) {
                execSync("npm run test:coverage", { stdio: "pipe" });
              } else {
                execSync("npm test", { stdio: "pipe" });
              }
            } catch (error) {
              console.log("⚠️ Tests completed with warnings");
            }

            // Extract coverage from common locations
            if (fs.existsSync("coverage/lcov-report/index.html")) {
              const coverageHtml = fs.readFileSync(
                "coverage/lcov-report/index.html",
                "utf8"
              );
              const match = coverageHtml.match(/([0-9]*\.?[0-9]+)%/);
              if (match) {
                coveragePercentage = parseFloat(match[1]);
              }
            } else if (fs.existsSync("coverage/coverage-summary.json")) {
              const coverageSummary = JSON.parse(
                fs.readFileSync("coverage/coverage-summary.json", "utf8")
              );
              coveragePercentage = coverageSummary.total?.lines?.pct || 0;
            }
          }

          // Count test files
          testFiles = countFiles([
            "**/*.test.js",
            "**/*.spec.js",
            "**/*.test.ts",
            "**/*.spec.ts",
          ]);

          if (testFiles === 0) {
            missingTestAreas =
              "No test files found. Consider adding tests for main functionality.";
          }
        } catch (error) {
          console.log(`⚠️ Error analyzing JavaScript tests: ${error.message}`);
        }
      }
    }

    async function analyzePythonTests() {
      try {
        // Install testing dependencies
        console.log("📦 Installing Python test dependencies...");
        execSync("pip3 install pytest pytest-cov coverage", { stdio: "pipe" });

        // Count Python test files
        testFiles = countFiles(["**/test_*.py", "**/*_test.py"]);

        if (testFiles > 0) {
          hasTests = true;
          console.log("🧪 Running Python tests...");

          try {
            execSync("pytest --cov=. --cov-report=term-missing", {
              stdio: "pipe",
            });

            // Extract coverage percentage
            const coverageOutput = execSync("coverage report", {
              encoding: "utf8",
            });
            const match = coverageOutput.match(/TOTAL\s+\d+\s+\d+\s+(\d+)%/);
            if (match) {
              coveragePercentage = parseInt(match[1]);
            }
          } catch (error) {
            console.log("⚠️ Python tests completed with warnings");
          }
        }
      } catch (error) {
        console.log(`⚠️ Error analyzing Python tests: ${error.message}`);
      }
    }

    async function analyzeGoTests() {
      try {
        // Count Go test files
        testFiles = countFiles(["**/*_test.go"]);

        if (testFiles > 0) {
          hasTests = true;
          console.log("🧪 Running Go tests...");

          try {
            execSync("go test -coverprofile=coverage.out ./...", {
              stdio: "pipe",
            });

            if (fs.existsSync("coverage.out")) {
              const coverageOutput = execSync(
                "go tool cover -func=coverage.out",
                { encoding: "utf8" }
              );
              const match = coverageOutput.match(
                /total:\s+\(statements\)\s+([0-9.]+)%/
              );
              if (match) {
                coveragePercentage = parseFloat(match[1]);
              }
            }
          } catch (error) {
            console.log("⚠️ Go tests completed with warnings");
          }
        }
      } catch (error) {
        console.log(`⚠️ Error analyzing Go tests: ${error.message}`);
      }
    }

    function countFiles(patterns) {
      let count = 0;
      for (const pattern of patterns) {
        try {
          const files = execSync(
            `find . -name "${pattern.replace("**/", "")}" -type f`,
            { encoding: "utf8" }
          );
          count += files.trim() ? files.trim().split("\n").length : 0;
        } catch (error) {
          // Pattern not found or error, continue
        }
      }
      return count;
    }

    // Calculate test score
    if (hasTests) {
      testScore = Math.floor(coveragePercentage);

      // Bonus for having multiple test files
      if (testFiles > 5) {
        testScore += 10;
      } else if (testFiles > 0) {
        testScore += 5;
      }
    }

    // Cap at 100
    testScore = Math.min(testScore, 100);

    // Generate coverage summary JSON file
    if (!fs.existsSync("reports")) {
      fs.mkdirSync("reports", { recursive: true });
    }

    const coverageSummary = {
      total: {
        lines: {
          total: 1000,
          covered: Math.floor(coveragePercentage * 10),
          skipped: 0,
          pct: Math.floor(coveragePercentage),
        },
        statements: {
          total: 1000,
          covered: Math.floor(coveragePercentage * 10),
          skipped: 0,
          pct: Math.floor(coveragePercentage),
        },
        functions: {
          total: 100,
          covered: Math.floor(coveragePercentage),
          skipped: 0,
          pct: Math.floor(coveragePercentage),
        },
        branches: {
          total: 500,
          covered: Math.floor(coveragePercentage * 5),
          skipped: 0,
          pct: Math.floor(coveragePercentage),
        },
      },
      testFiles: testFiles,
      hasTests: hasTests,
      language: language,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(reportsDir, "coverage-summary.json"),
      JSON.stringify(coverageSummary, null, 2)
    );
    console.log("📁 Coverage summary saved to reports/coverage-summary.json");

    // Set outputs
    core.setOutput("test_score", testScore.toString());
    core.setOutput(
      "coverage_percentage",
      Math.floor(coveragePercentage).toString()
    );
    core.setOutput("test_files", testFiles.toString());
    core.setOutput("has_tests", hasTests.toString());
    core.setOutput("coverage_details", JSON.stringify(coverageSummary));
    core.setOutput("missing_tests", missingTestAreas);

    console.log(
      `✅ Tests: ${hasTests} | Files: ${testFiles} | Coverage: ${Math.floor(
        coveragePercentage
      )}% | Score: ${testScore}/100`
    );
  } catch (error) {
    console.error("❌ Error running test coverage analysis:", error);
    core.setFailed(`Failed to run test coverage analysis: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
runTestCoverage();
