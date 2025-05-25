const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Run security vulnerability analysis for different programming languages
 */
async function runSecurityScan() {
  try {
    const language = process.env.LANGUAGE || "javascript";

    let securityScore = 100;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    let securityIssuesSummary = "";
    let vulnerabilityDetails = "[]";
    console.log(`🔒 Running security analysis for ${language}...`);

    // Create reports directory in workspace root
    const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const reportsDir = path.join(workspaceRoot, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Change to workspace root for scanning
    process.chdir(workspaceRoot);

    // Install and run Trivy for vulnerability scanning
    await installAndRunTrivy();

    // Run language-specific security tools
    switch (language.toLowerCase()) {
      case "javascript":
        await analyzeJavaScriptSecurity();
        break;
      case "python":
        await analyzePythonSecurity();
        break;
      case "go":
        await analyzeGoSecurity();
        break;
      default:
        console.log(
          `⚠️ Language ${language} security analysis using generic tools only`
        );
    }

    async function installAndRunTrivy() {
      try {
        console.log("🔒 Installing Trivy vulnerability scanner...");
        execSync(
          "curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.18.3",
          { stdio: "pipe" }
        );

        console.log("🔒 Running Trivy filesystem scan...");
        execSync("trivy fs --format json --output trivy-results.json .", {
          stdio: "pipe",
        });
        if (fs.existsSync("trivy-results.json")) {
          const trivyResultsPath = path.join(reportsDir, "trivy-results.json");
          fs.copyFileSync("trivy-results.json", trivyResultsPath);
          console.log("📁 Trivy results saved to reports/trivy-results.json");

          // Parse Trivy results
          const trivyResults = JSON.parse(
            fs.readFileSync("trivy-results.json", "utf8")
          );

          let trivyHigh = 0;
          let trivyMedium = 0;
          let trivyLow = 0;

          if (trivyResults.Results) {
            for (const result of trivyResults.Results) {
              if (result.Vulnerabilities) {
                for (const vuln of result.Vulnerabilities) {
                  switch (vuln.Severity) {
                    case "HIGH":
                    case "CRITICAL":
                      trivyHigh++;
                      break;
                    case "MEDIUM":
                      trivyMedium++;
                      break;
                    case "LOW":
                      trivyLow++;
                      break;
                  }
                }
              }
            }
          }

          highSeverity += trivyHigh;
          mediumSeverity += trivyMedium;
          lowSeverity += trivyLow;

          // Extract top Trivy issues
          const topTrivyIssues = [];
          if (trivyResults.Results) {
            for (const result of trivyResults.Results) {
              if (result.Vulnerabilities) {
                for (const vuln of result.Vulnerabilities) {
                  if (
                    (vuln.Severity === "HIGH" ||
                      vuln.Severity === "CRITICAL") &&
                    topTrivyIssues.length < 3
                  ) {
                    topTrivyIssues.push(
                      `- **${vuln.VulnerabilityID}** (${vuln.Severity}): ${
                        vuln.Title || "Security vulnerability"
                      }`
                    );
                  }
                }
              }
            }
          }

          if (topTrivyIssues.length > 0) {
            securityIssuesSummary +=
              "**Container/OS Vulnerabilities:**\\n" +
              topTrivyIssues.join("\\n") +
              "\\n\\n";
          }
        }
      } catch (error) {
        console.log(`⚠️ Trivy scan completed with warnings: ${error.message}`);
      }
    }

    async function analyzeJavaScriptSecurity() {
      try {
        if (fs.existsSync("package.json")) {
          console.log("🔒 Running npm audit...");

          try {
            execSync("npm audit --json > npm-audit.json", { stdio: "pipe" });
          } catch (error) {
            // npm audit exits with non-zero when vulnerabilities are found
            console.log("⚠️ npm audit found vulnerabilities");
          }

          if (fs.existsSync("npm-audit.json")) {
            const auditResults = JSON.parse(
              fs.readFileSync("npm-audit.json", "utf8")
            );

            if (
              auditResults.metadata &&
              auditResults.metadata.vulnerabilities
            ) {
              highSeverity += auditResults.metadata.vulnerabilities.high || 0;
              mediumSeverity +=
                auditResults.metadata.vulnerabilities.moderate || 0;
              lowSeverity += auditResults.metadata.vulnerabilities.low || 0;
            }

            // Extract top npm issues
            const topNpmIssues = [];
            if (auditResults.vulnerabilities) {
              const vulnEntries = Object.entries(auditResults.vulnerabilities);
              for (const [name, vuln] of vulnEntries.slice(0, 3)) {
                if (vuln.severity === "high" || vuln.severity === "critical") {
                  topNpmIssues.push(
                    `- **${name}** (${vuln.severity}): ${
                      vuln.title || "NPM vulnerability"
                    }`
                  );
                }
              }
            }

            if (topNpmIssues.length > 0) {
              securityIssuesSummary =
                "**NPM Dependencies:**\\n" +
                topNpmIssues.join("\\n") +
                "\\n\\n" +
                securityIssuesSummary;
            }

            fs.copyFileSync(
              "npm-audit.json",
              path.join(reportsDir, "npm-audit.json")
            );
          }
        }
      } catch (error) {
        console.log(
          `⚠️ JavaScript security analysis completed with warnings: ${error.message}`
        );
      }
    }

    async function analyzePythonSecurity() {
      try {
        console.log("🔒 Installing Python security tools...");
        execSync("pip3 install safety semgrep", { stdio: "pipe" });

        if (fs.existsSync("requirements.txt")) {
          console.log("🔒 Running Safety check...");
          try {
            execSync("safety check --json > safety-report.json", {
              stdio: "pipe",
            });

            if (fs.existsSync("safety-report.json")) {
              const safetyResults = JSON.parse(
                fs.readFileSync("safety-report.json", "utf8")
              );

              // Count vulnerabilities by severity (Safety doesn't provide severity levels by default)
              if (Array.isArray(safetyResults)) {
                mediumSeverity += safetyResults.length; // Assume medium severity for Safety findings
              }
              fs.copyFileSync(
                "safety-report.json",
                path.join(reportsDir, "safety-report.json")
              );
            }
          } catch (error) {
            console.log("⚠️ Safety check completed with warnings");
          }
        }
      } catch (error) {
        console.log(
          `⚠️ Python security analysis completed with warnings: ${error.message}`
        );
      }
    }

    async function analyzeGoSecurity() {
      try {
        console.log("🔒 Installing Go security tools...");
        execSync(
          "go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest",
          { stdio: "pipe" }
        );

        console.log("🔒 Running gosec...");
        try {
          execSync("gosec -fmt json -out gosec-report.json ./...", {
            stdio: "pipe",
          });

          if (fs.existsSync("gosec-report.json")) {
            const gosecResults = JSON.parse(
              fs.readFileSync("gosec-report.json", "utf8")
            );

            if (gosecResults.Issues) {
              // gosec severity: HIGH, MEDIUM, LOW
              for (const issue of gosecResults.Issues) {
                switch (issue.severity) {
                  case "HIGH":
                    highSeverity++;
                    break;
                  case "MEDIUM":
                    mediumSeverity++;
                    break;
                  case "LOW":
                    lowSeverity++;
                    break;
                }
              }
            }

            fs.copyFileSync(
              "gosec-report.json",
              path.join(reportsDir, "gosec-report.json")
            );
          }
        } catch (error) {
          console.log("⚠️ gosec completed with warnings");
        }
      } catch (error) {
        console.log(
          `⚠️ Go security analysis completed with warnings: ${error.message}`
        );
      }
    }

    // Calculate security score
    securityScore =
      securityScore - highSeverity * 20 - mediumSeverity * 10 - lowSeverity * 5;
    securityScore = Math.max(securityScore, 0);

    // Create vulnerability summary
    if (!securityIssuesSummary) {
      const totalIssues = highSeverity + mediumSeverity + lowSeverity;
      if (totalIssues > 0) {
        securityIssuesSummary = `Security scan detected ${totalIssues} issues. Run detailed security analysis for specifics.`;
      } else {
        securityIssuesSummary = "No major security vulnerabilities detected.";
      }
    }

    // Create comprehensive security report
    const securityReport = {
      summary: {
        score: securityScore,
        totalIssues: highSeverity + mediumSeverity + lowSeverity,
        highSeverity: highSeverity,
        mediumSeverity: mediumSeverity,
        lowSeverity: lowSeverity,
      },
      language: language,
      toolsUsed: ["trivy"],
      timestamp: new Date().toISOString(),
      details: securityIssuesSummary,
    };

    // Add language-specific tools to report
    if (language === "javascript" && fs.existsSync("npm-audit.json")) {
      securityReport.toolsUsed.push("npm-audit");
    } else if (language === "python" && fs.existsSync("safety-report.json")) {
      securityReport.toolsUsed.push("safety");
    } else if (language === "go" && fs.existsSync("gosec-report.json")) {
      securityReport.toolsUsed.push("gosec");
    }
    fs.writeFileSync(
      path.join(reportsDir, "security-summary.json"),
      JSON.stringify(securityReport, null, 2)
    );

    // Set outputs
    core.setOutput("security_score", securityScore.toString());
    core.setOutput("high_severity", highSeverity.toString());
    core.setOutput("medium_severity", mediumSeverity.toString());
    core.setOutput("low_severity", lowSeverity.toString());
    core.setOutput("security_issues", JSON.stringify(securityReport));
    core.setOutput(
      "vulnerability_summary",
      securityIssuesSummary.replace(/\n/g, "|")
    );

    console.log(
      `✅ Security scan complete - Score: ${securityScore}/100 | Issues: H:${highSeverity} M:${mediumSeverity} L:${lowSeverity}`
    );
  } catch (error) {
    console.error("❌ Error running security scan:", error);
    core.setFailed(`Failed to run security scan: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
runSecurityScan();
