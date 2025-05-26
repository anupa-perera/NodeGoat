#!/usr/bin/env node

/**
 * Fetch detailed SonarCloud analysis results
 * This script fetches detailed issues from SonarCloud API and outputs clean JSON
 */

const https = require("https");
const fs = require("fs");

// Get environment variables
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const SONAR_PROJECT_KEY = process.env.SONAR_PROJECT_KEY;
const SONAR_ORGANIZATION = process.env.SONAR_ORGANIZATION;

if (!SONAR_TOKEN || !SONAR_PROJECT_KEY || !SONAR_ORGANIZATION) {
  console.error("⚠️  SonarCloud configuration incomplete:");
  console.error("Missing required environment variables:");
  if (!SONAR_TOKEN) console.error("  - SONAR_TOKEN (repository secret)");
  if (!SONAR_PROJECT_KEY)
    console.error("  - SONAR_PROJECT_KEY (repository variable)");
  if (!SONAR_ORGANIZATION)
    console.error("  - SONAR_ORGANIZATION (repository variable)");
  console.error("");
  console.error("🔧 To fix this:");
  console.error(
    "1. Go to your repository Settings > Secrets and variables > Actions"
  );
  console.error("2. Add SONAR_TOKEN as a repository secret");
  console.error(
    "3. Add SONAR_PROJECT_KEY and SONAR_ORGANIZATION as repository variables"
  );
  console.error("4. Or set up a SonarCloud project for this repository");
  console.error("");
  console.error("⏭️  Continuing with mock SonarCloud results...");

  // Generate mock results to allow the workflow to continue
  const mockResult = {
    summary: {
      bugs: "0",
      vulnerabilities: "0",
      code_smells: "0",
      coverage: "0",
      quality_gate_status: "NOT_CONFIGURED",
      sonar_project_url: "https://sonarcloud.io",
      analysis_date: new Date().toISOString(),
    },
    detailed_issues: {
      bugs: "",
      vulnerabilities: "",
      code_smells: "",
    },
    detailed_reports: {
      bugs: {
        total_count: 0,
        by_severity: {},
        by_file: {},
        by_rule: {},
        issues: [],
      },
      vulnerabilities: {
        total_count: 0,
        by_severity: {},
        by_file: {},
        by_rule: {},
        issues: [],
      },
      code_smells: {
        total_count: 0,
        by_severity: {},
        by_file: {},
        by_rule: {},
        issues: [],
      },
    },
    files_affected: {
      total_files: 0,
      most_affected_files: [],
    },
    total_issues: 0,
    error: "SonarCloud not configured - using mock results",
    timestamp: new Date().toISOString(),
  };
  // Save mock result to reports directory
  const reportsDir = process.env.GITHUB_WORKSPACE
    ? `${process.env.GITHUB_WORKSPACE}/reports`
    : "reports";
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportsFile = `${reportsDir}/sonar-analysis-results.json`;
  fs.writeFileSync(reportsFile, JSON.stringify(mockResult, null, 2));
  console.log(`📁 Mock SonarCloud results saved to ${reportsFile}`);

  console.log("SONAR_ANALYSIS_RESULTS<<EOF");
  console.log(JSON.stringify(mockResult));
  console.log("EOF");

  process.exit(0); // Exit successfully with mock results
}

// Helper function to make HTTPS requests
function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Authorization: `Bearer ${SONAR_TOKEN}`,
        Accept: "application/json",
        ...headers,
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

// Helper function to safely escape text for JSON
function escapeForJson(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Format issues into readable text with enhanced details
function formatIssues(issues, type) {
  if (!issues || issues.length === 0) {
    return "";
  }

  const maxIssues = type === "CODE_SMELL" ? 5 : 10; // Limit code smells more aggressively
  const limitedIssues = issues.slice(0, maxIssues);

  const formatted = limitedIssues
    .map((issue) => {
      const severity = issue.severity || "UNKNOWN";
      const component = issue.component
        ? issue.component.replace(/^[^:]+:/, "")
        : "Unknown file";
      const line = issue.line || "?";
      const message = escapeForJson(issue.message || "No message");
      const rule = issue.rule || "unknown-rule";
      const effort = issue.effort || "N/A";

      return `- **${severity}** in \`${component}:${line}\` - ${message} (Rule: ${rule}, Effort: ${effort})`;
    })
    .join("\n");

  if (issues.length > maxIssues) {
    return (
      formatted +
      `\n\n*... and ${issues.length - maxIssues} more ${type
        .toLowerCase()
        .replace("_", " ")} issues.*`
    );
  }

  return formatted;
}

// Create detailed issue report with file locations and line numbers
function createDetailedIssueReport(issues) {
  const report = {
    total_count: issues.length,
    by_severity: {},
    by_file: {},
    by_rule: {},
    issues: [],
  };

  // Group by severity
  issues.forEach((issue) => {
    const severity = issue.severity || "UNKNOWN";
    if (!report.by_severity[severity]) {
      report.by_severity[severity] = 0;
    }
    report.by_severity[severity]++;
  });

  // Group by file
  issues.forEach((issue) => {
    const component = issue.component
      ? issue.component.replace(/^[^:]+:/, "")
      : "Unknown file";
    if (!report.by_file[component]) {
      report.by_file[component] = [];
    }
    report.by_file[component].push({
      line: issue.line || null,
      severity: issue.severity || "UNKNOWN",
      type: issue.type || "UNKNOWN",
      message: issue.message || "No message",
      rule: issue.rule || "unknown-rule",
      effort: issue.effort || "N/A",
    });
  });

  // Group by rule
  issues.forEach((issue) => {
    const rule = issue.rule || "unknown-rule";
    if (!report.by_rule[rule]) {
      report.by_rule[rule] = {
        count: 0,
        description: issue.ruleName || rule,
        files: [],
      };
    }
    report.by_rule[rule].count++;

    const component = issue.component
      ? issue.component.replace(/^[^:]+:/, "")
      : "Unknown file";
    const fileEntry = `${component}:${issue.line || "?"}`;
    if (!report.by_rule[rule].files.includes(fileEntry)) {
      report.by_rule[rule].files.push(fileEntry);
    }
  });
  // Add individual issues for detailed view (remove artificial limit, show all available)
  report.issues = issues.map((issue) => ({
    file: issue.component
      ? issue.component.replace(/^[^:]+:/, "")
      : "Unknown file",
    line: issue.line || null,
    severity: issue.severity || "UNKNOWN",
    type: issue.type || "UNKNOWN",
    message: issue.message || "No message",
    rule: issue.rule || "unknown-rule",
    effort: issue.effort || "N/A",
    creation_date: issue.creationDate || null,
    update_date: issue.updateDate || null,
  }));
  return report;
}

// Helper function to get most affected files
function getMostAffectedFiles(allIssues) {
  const fileCounts = {};

  allIssues.forEach((issue) => {
    const component = issue.component
      ? issue.component.replace(/^[^:]+:/, "")
      : "Unknown";
    if (component !== "Unknown") {
      if (!fileCounts[component]) {
        fileCounts[component] = { count: 0, issues: [] };
      }
      fileCounts[component].count++;
      fileCounts[component].issues.push({
        type: issue.type,
        severity: issue.severity,
        line: issue.line,
        message: issue.message,
      });
    }
  });

  // Sort by count and return top 10
  return Object.entries(fileCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([file, data]) => ({
      file,
      issue_count: data.count,
      issues: data.issues.slice(0, 5), // Limit to first 5 issues per file
    }));
}

async function fetchSonarDetails() {
  try {
    console.log("Fetching SonarCloud analysis details...");

    // Fetch project measures (summary)
    const measuresUrl = `https://sonarcloud.io/api/measures/component?component=${SONAR_PROJECT_KEY}&metricKeys=bugs,vulnerabilities,code_smells,coverage,quality_gate_details`;
    const measuresResponse = await makeRequest(measuresUrl);

    const measures = {};
    if (measuresResponse.component && measuresResponse.component.measures) {
      measuresResponse.component.measures.forEach((measure) => {
        measures[measure.metric] = measure.value;
      });
    } // Fetch detailed issues with expanded fields and larger page size
    const issuesUrl = `https://sonarcloud.io/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&ps=500&facets=severities,types&additionalFields=comments`;
    const issuesResponse = await makeRequest(issuesUrl);

    console.log(`Found ${issuesResponse.total || 0} total issues`);

    // Separate issues by type
    const bugs = (issuesResponse.issues || []).filter(
      (issue) => issue.type === "BUG"
    );
    const vulnerabilities = (issuesResponse.issues || []).filter(
      (issue) => issue.type === "VULNERABILITY"
    );
    const codeSmells = (issuesResponse.issues || []).filter(
      (issue) => issue.type === "CODE_SMELL"
    );

    console.log(
      `Bugs: ${bugs.length}, Vulnerabilities: ${vulnerabilities.length}, Code Smells: ${codeSmells.length}`
    );

    // Create detailed reports for each issue type
    const bugsReport = createDetailedIssueReport(bugs);
    const vulnerabilitiesReport = createDetailedIssueReport(vulnerabilities);
    const codeSmellsReport = createDetailedIssueReport(codeSmells);

    // Create the final result object with enhanced structure
    const result = {
      summary: {
        bugs: measures.bugs || "0",
        vulnerabilities: measures.vulnerabilities || "0",
        code_smells: measures.code_smells || "0",
        coverage: measures.coverage || "0",
        quality_gate_status: measures.quality_gate_details || "UNKNOWN",
        sonar_project_url: `https://sonarcloud.io/project/overview?id=${SONAR_PROJECT_KEY}`,
        analysis_date: new Date().toISOString(),
      },
      detailed_issues: {
        bugs: formatIssues(bugs, "BUG"),
        vulnerabilities: formatIssues(vulnerabilities, "VULNERABILITY"),
        code_smells: formatIssues(codeSmells, "CODE_SMELL"),
      },
      detailed_reports: {
        bugs: bugsReport,
        vulnerabilities: vulnerabilitiesReport,
        code_smells: codeSmellsReport,
      },
      files_affected: {
        total_files: new Set(
          [...bugs, ...vulnerabilities, ...codeSmells]
            .map((issue) =>
              issue.component
                ? issue.component.replace(/^[^:]+:/, "")
                : "Unknown"
            )
            .filter((file) => file !== "Unknown")
        ).size,
        most_affected_files: getMostAffectedFiles([
          ...bugs,
          ...vulnerabilities,
          ...codeSmells,
        ]),
      },
      total_issues: issuesResponse.total || 0,
      timestamp: new Date().toISOString(),
    }; // Write to file and stdout
    const outputFile = "sonar-analysis-results.json";
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Results written to ${outputFile}`); // Also save to reports directory for workflow processing
    const reportsDir = process.env.GITHUB_WORKSPACE
      ? `${process.env.GITHUB_WORKSPACE}/reports`
      : "reports";
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportsFile = `${reportsDir}/sonar-analysis-results.json`;
    fs.writeFileSync(reportsFile, JSON.stringify(result, null, 2));
    console.log(`📁 SonarCloud analysis saved to ${reportsFile}`);

    // Output the JSON for GitHub Actions to capture
    console.log("SONAR_ANALYSIS_RESULTS<<EOF");
    console.log(JSON.stringify(result));
    console.log("EOF");
  } catch (error) {
    console.error("Error fetching SonarCloud details:", error.message); // Output empty result on error
    const errorResult = {
      summary: {
        bugs: "0",
        vulnerabilities: "0",
        code_smells: "0",
        coverage: "0",
        quality_gate_status: "ERROR",
        sonar_project_url: `https://sonarcloud.io/project/overview?id=${SONAR_PROJECT_KEY}`,
        analysis_date: new Date().toISOString(),
      },
      detailed_issues: {
        bugs: "",
        vulnerabilities: "",
        code_smells: "",
      },
      detailed_reports: {
        bugs: {
          total_count: 0,
          by_severity: {},
          by_file: {},
          by_rule: {},
          issues: [],
        },
        vulnerabilities: {
          total_count: 0,
          by_severity: {},
          by_file: {},
          by_rule: {},
          issues: [],
        },
        code_smells: {
          total_count: 0,
          by_severity: {},
          by_file: {},
          by_rule: {},
          issues: [],
        },
      },
      files_affected: {
        total_files: 0,
        most_affected_files: [],
      },
      total_issues: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    }; // Save error result to reports directory
    const reportsDir = process.env.GITHUB_WORKSPACE
      ? `${process.env.GITHUB_WORKSPACE}/reports`
      : "reports";
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportsFile = `${reportsDir}/sonar-analysis-results.json`;
    fs.writeFileSync(reportsFile, JSON.stringify(errorResult, null, 2));
    console.log(`📁 SonarCloud error report saved to ${reportsFile}`);

    console.log("SONAR_ANALYSIS_RESULTS<<EOF");
    console.log(JSON.stringify(errorResult));
    console.log("EOF");

    process.exit(1);
  }
}

// Run the script
fetchSonarDetails();
