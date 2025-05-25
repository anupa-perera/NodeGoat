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
  console.error(
    "Missing required environment variables: SONAR_TOKEN, SONAR_PROJECT_KEY, SONAR_ORGANIZATION"
  );
  process.exit(1);
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

// Format issues into readable text
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

      return `- **${severity}** in \`${component}:${line}\` - ${message}`;
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
    }

    // Fetch detailed issues
    const issuesUrl = `https://sonarcloud.io/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&ps=500&facets=severities,types`;
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

    // Create the final result object
    const result = {
      summary: {
        bugs: measures.bugs || "0",
        vulnerabilities: measures.vulnerabilities || "0",
        code_smells: measures.code_smells || "0",
        coverage: measures.coverage || "0",
        quality_gate_status: measures.quality_gate_details || "UNKNOWN",
      },
      detailed_issues: {
        bugs: formatIssues(bugs, "BUG"),
        vulnerabilities: formatIssues(vulnerabilities, "VULNERABILITY"),
        code_smells: formatIssues(codeSmells, "CODE_SMELL"),
      },
      total_issues: issuesResponse.total || 0,
      timestamp: new Date().toISOString(),
    };

    // Write to file and stdout
    const outputFile = "sonar-analysis-results.json";
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Results written to ${outputFile}`);

    // Output the JSON for GitHub Actions to capture
    console.log("SONAR_ANALYSIS_RESULTS<<EOF");
    console.log(JSON.stringify(result));
    console.log("EOF");
  } catch (error) {
    console.error("Error fetching SonarCloud details:", error.message);

    // Output empty result on error
    const errorResult = {
      summary: {
        bugs: "0",
        vulnerabilities: "0",
        code_smells: "0",
        coverage: "0",
        quality_gate_status: "ERROR",
      },
      detailed_issues: { bugs: "", vulnerabilities: "", code_smells: "" },
      total_issues: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    console.log("SONAR_ANALYSIS_RESULTS<<EOF");
    console.log(JSON.stringify(errorResult));
    console.log("EOF");

    process.exit(1);
  }
}

// Run the script
fetchSonarDetails();
