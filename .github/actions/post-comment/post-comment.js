#!/usr/bin/env node

/**
 * Post analysis results as a GitHub PR comment
 * This script formats and posts the hackathon analysis results
 */

const { getOctokit } = require("@actions/github");
const core = require("@actions/core");

// Parse inputs from environment variables with better defaults
const inputs = {
  overall_score: parseInt(process.env.OVERALL_SCORE) || 0,
  test_score: parseInt(process.env.TEST_SCORE) || 0,
  sonar_score: isNaN(parseInt(process.env.SONAR_SCORE))
    ? 0
    : parseInt(process.env.SONAR_SCORE),
  security_score: parseInt(process.env.SECURITY_SCORE) || 0,
  frontend_score: parseInt(process.env.FRONTEND_SCORE) || 0,
  team_score: parseInt(process.env.TEAM_SCORE) || 0,
  ai_score: parseInt(process.env.AI_SCORE) || 0,
  high_severity: parseInt(process.env.HIGH_SEVERITY || "0"),
  medium_severity: parseInt(process.env.MEDIUM_SEVERITY || "0"),
  low_severity: parseInt(process.env.LOW_SEVERITY || "0"),
  coverage_percentage: parseFloat(process.env.COVERAGE_PERCENTAGE || "0"),
  test_files: parseInt(process.env.TEST_FILES || "0"),
  sonar_status: process.env.SONAR_STATUS || "UNKNOWN",
  code_smells: parseInt(process.env.CODE_SMELLS || "0"),
  bugs: parseInt(process.env.BUGS || "0"),
  vulnerabilities: parseInt(process.env.VULNERABILITIES || "0"),
  team_name: process.env.TEAM_NAME || "Unknown Team",
  detected_stack: process.env.DETECTED_STACK || "Not detected",
  sonar_url: process.env.SONAR_URL || "#",
  pr_number: parseInt(process.env.PR_NUMBER) || 0,
  sonar_analysis_results: process.env.SONAR_ANALYSIS_RESULTS || "{}",
  reports_committed: process.env.REPORTS_COMMITTED === "true",
  report_url: process.env.REPORT_URL || "",
  html_report_file: process.env.HTML_REPORT_FILE || "",
};

// GitHub context
const github_token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const run_id = process.env.GITHUB_RUN_ID;

if (!github_token || !repository) {
  console.error(
    "Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY"
  );
  process.exit(1);
}

const [owner, repo] = repository.split("/");

// Initialize Octokit
const octokit = getOctokit(github_token);

// Helper function to format detailed SonarCloud issues
function formatDetailedSonarIssues(sonarResults) {
  if (!sonarResults || !sonarResults.detailed_issues) {
    return "";
  }

  let formattedIssues = "";
  const { bugs, vulnerabilities, code_smells } = sonarResults.detailed_issues;
  // Format bugs
  if (
    bugs &&
    bugs.trim() &&
    bugs !== "Too many issues - check SonarCloud report"
  ) {
    formattedIssues += "\n### 🐛 Bugs Found\n\n" + bugs + "\n";
  } else if (sonarResults.summary && parseInt(sonarResults.summary.bugs) > 0) {
    formattedIssues += `\n### 🐛 Bugs Found\n**${sonarResults.summary.bugs}** bugs detected. Check the [SonarCloud report](${inputs.sonar_url}) for details.\n`;
  }

  // Format vulnerabilities
  if (
    vulnerabilities &&
    vulnerabilities.trim() &&
    vulnerabilities !== "Too many issues - check SonarCloud report"
  ) {
    formattedIssues +=
      "\n### 🔒 Security Vulnerabilities\n\n" + vulnerabilities + "\n";
  } else if (
    sonarResults.summary &&
    parseInt(sonarResults.summary.vulnerabilities) > 0
  ) {
    formattedIssues += `\n### 🔒 Security Vulnerabilities\n**${sonarResults.summary.vulnerabilities}** vulnerabilities detected. Check the [SonarCloud report](${inputs.sonar_url}) for details.\n`;
  }

  // Format code smells
  if (
    code_smells &&
    code_smells.trim() &&
    code_smells !== "Too many issues - check SonarCloud report"
  ) {
    const smellsArray = code_smells.split("---").filter((s) => s.trim());
    const limitedSmells = smellsArray.slice(0, 5).join("---");
    formattedIssues +=
      "\n### 👃 Code Smells (showing first 5)\n\n" + limitedSmells;
    if (smellsArray.length > 5) {
      formattedIssues += `\n\n*... and ${
        smellsArray.length - 5
      } more code smell issues. Check the [SonarCloud report](${
        inputs.sonar_url
      }) for complete details.*\n`;
    }
    formattedIssues += "\n";
  } else if (
    sonarResults.summary &&
    parseInt(sonarResults.summary.code_smells) > 0
  ) {
    formattedIssues += `\n### 👃 Code Smells\n**${sonarResults.summary.code_smells}** code smells detected. Check the [SonarCloud report](${inputs.sonar_url}) for details.\n`;
  }

  return formattedIssues;
}

// Helper function to create progress bar
function createProgressBar(score) {
  const filledBlocks = Math.floor(score / 10);
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
  console.log(
    `🔧 Progress bar for score ${score}: "${progressBar}" (${filledBlocks} filled, ${emptyBlocks} empty)`
  );
  return progressBar;
}

// Helper function to get grade emoji
function getGradeEmoji(score) {
  if (score >= 90) return "🏆";
  if (score >= 80) return "🥇";
  if (score >= 70) return "🥈";
  if (score >= 60) return "🥉";
  return "🔧";
}

// Helper function to get status emoji
function getStatusEmoji(score) {
  if (score >= 80) return "✅";
  if (score >= 60) return "⚠️";
  return "❌";
}

async function postComment() {
  try {
    // Debug: Log received inputs
    console.log("📊 Received inputs:");
    console.log(`  Team Name: ${inputs.team_name}`);
    console.log(`  Technology Stack: ${inputs.detected_stack}`);
    console.log(`  Overall Score: ${inputs.overall_score}`);
    console.log(`  Sonar Score: ${inputs.sonar_score}`);
    console.log(`  Sonar Status: ${inputs.sonar_status}`);
    console.log(`  PR Number: ${inputs.pr_number}`);
    console.log(`  Reports Committed: ${inputs.reports_committed}`);
    console.log(`  Report URL: ${inputs.report_url}`);
    console.log("");

    console.log("Parsing detailed SonarCloud analysis results...");

    // Parse detailed SonarCloud analysis results
    let detailedSonarResults = {};
    try {
      if (
        inputs.sonar_analysis_results &&
        inputs.sonar_analysis_results !== "{}" &&
        inputs.sonar_analysis_results.length > 2
      ) {
        // Check if JSON appears to be truncated
        if (
          !inputs.sonar_analysis_results.trim().endsWith("}") &&
          !inputs.sonar_analysis_results.trim().endsWith("]")
        ) {
          console.log("Warning: SonarCloud results appear to be truncated");
          // Try to parse partial JSON by adding closing braces
          const truncatedInput = inputs.sonar_analysis_results.trim() + "}}}}";
          try {
            detailedSonarResults = JSON.parse(truncatedInput);
            console.log("Successfully parsed truncated JSON");
          } catch (truncatedError) {
            console.log(
              "Could not parse even with added closing braces:",
              truncatedError.message
            );
          }
        } else {
          detailedSonarResults = JSON.parse(inputs.sonar_analysis_results);
          console.log("Successfully parsed complete JSON");
        }
      }
    } catch (error) {
      console.log(
        "Could not parse detailed SonarCloud results:",
        error.message
      );
      console.log(
        "Input that caused error:",
        inputs.sonar_analysis_results.substring(0, 200)
      );
    }
    const total_vulnerabilities =
      inputs.high_severity + inputs.medium_severity + inputs.low_severity;

    // Debug: Log all values being used in the comment
    console.log("🔍 Creating comment with these values:");
    console.log(`  Team Name: "${inputs.team_name}"`);
    console.log(`  Technology Stack: "${inputs.detected_stack}"`);
    console.log(`  Overall Score: ${inputs.overall_score}`);
    console.log(`  Test Score: ${inputs.test_score}`);
    console.log(
      `  Sonar Score: ${
        inputs.sonar_score
      } (type: ${typeof inputs.sonar_score})`
    );
    console.log(`  Security Score: ${inputs.security_score}`);
    console.log(`  Frontend Score: ${inputs.frontend_score}`);
    console.log(`  Team Score: ${inputs.team_score}`);
    console.log(`  AI Score: ${inputs.ai_score}`);
    console.log("");

    const comment = [
      "# 🏆 Hackathon Code Analysis Results",
      "",
      `**👥 Team:** ${inputs.team_name}`,
      `**🛠️ Technology Stack:** ${inputs.detected_stack}`,
      `**📊 Overall Score:** ${getGradeEmoji(inputs.overall_score)} **${
        inputs.overall_score
      }/100**`,
      "",
      "## 📈 Detailed Score Breakdown",
      "",
      "| Category | Score | Progress | Weight |",
      "|----------|-------|----------|---------|",
      `| ${getStatusEmoji(inputs.test_score)} **Tests & Coverage** | ${
        inputs.test_score
      }/100 | \`${createProgressBar(inputs.test_score)}\` | 25% |`,
      `| ${getStatusEmoji(inputs.sonar_score)} **Code Quality** | ${
        inputs.sonar_score
      }/100 | \`${createProgressBar(inputs.sonar_score)}\` | 30% |`,
      `| ${getStatusEmoji(inputs.security_score)} **Security** | ${
        inputs.security_score
      }/100 | \`${createProgressBar(inputs.security_score)}\` | 20% |`,
      `| ${getStatusEmoji(inputs.frontend_score)} **Frontend UX** | ${
        inputs.frontend_score
      }/100 | \`${createProgressBar(inputs.frontend_score)}\` | 10% |`,
      `| ${getStatusEmoji(inputs.team_score)} **Team Collaboration** | ${
        inputs.team_score
      }/100 | \`${createProgressBar(inputs.team_score)}\` | 10% |`,
      `| ${getStatusEmoji(inputs.ai_score)} **AI Attribution** | ${
        inputs.ai_score
      }/100 | \`${createProgressBar(inputs.ai_score)}\` | 5% |`,
      "",
      "## 🔗 Quick Links",
      ...(inputs.reports_committed && inputs.report_url
        ? [
            `- 💾 **[Persistent Analysis Report](${inputs.report_url})** - Stored analysis results for team tracking`,
          ]
        : []),
      ...(inputs.html_report_file
        ? [
            `- 🎨 **[Interactive HTML Dashboard](https://github.com/${owner}/${repo}/actions/runs/${run_id})** - Beautiful visual report (download from artifacts)`,
          ]
        : []),
      "",
    ]; // Add code quality analysis section
    comment.push("## 🔧 Code Quality Analysis");

    // Show detailed SonarCloud issues if available
    const detailedIssuesText = formatDetailedSonarIssues(detailedSonarResults);
    if (detailedIssuesText) {
      comment.push(detailedIssuesText);
    } else {
      // Fallback to basic summary
      if (inputs.sonar_status !== "UNKNOWN") {
        const gateStatus =
          inputs.sonar_status === "FAILED" ? "❌ FAILED" : "✅ PASSED";
        comment.push(`**🚦 Quality Gate:** ${gateStatus}`);
        comment.push(
          `**📋 Issues Summary:** ${inputs.bugs} Bugs | ${inputs.code_smells} Code Smells | ${inputs.vulnerabilities} Vulnerabilities`
        );
      } else {
        comment.push("⏳ **SonarCloud analysis is pending or unavailable.**");
      }
      comment.push("");
    }
    comment.push("## 🎯 Priority Action Items");
    comment.push("");

    const actionItems = [];

    // Generate action items based on findings
    if (total_vulnerabilities > 0) {
      actionItems.push(
        `**🔒 Security:** Fix ${total_vulnerabilities} vulnerabilities (${inputs.high_severity} high, ${inputs.medium_severity} medium, ${inputs.low_severity} low)`
      );
    }

    if (inputs.test_files === 0) {
      actionItems.push(
        "**🧪 Testing:** Create test files and achieve basic test coverage"
      );
    } else if (inputs.coverage_percentage < 80) {
      actionItems.push(
        `**🧪 Testing:** Increase coverage from ${inputs.coverage_percentage.toFixed(
          1
        )}% to 80%+`
      );
    }

    if (
      inputs.bugs > 0 ||
      inputs.code_smells > 5 ||
      inputs.sonar_status === "FAILED"
    ) {
      actionItems.push(
        `**🔧 Code Quality:** Address ${inputs.bugs} bugs and ${inputs.code_smells} code smells`
      );
    }

    if (inputs.frontend_score < 70) {
      actionItems.push(
        "**🎨 Frontend:** Improve user experience and UI/UX design"
      );
    }

    if (inputs.team_score < 70) {
      actionItems.push(
        "**👥 Collaboration:** Improve commit practices and team coordination"
      );
    }

    if (actionItems.length === 0) {
      if (inputs.overall_score >= 85) {
        comment.push("🏆 **Excellent work!** Your code meets high standards.");
      } else {
        comment.push(
          "📝 **Good progress!** Continue improving your code quality."
        );
      }
    } else {
      actionItems.forEach((item) => comment.push(`- ${item}`));
    }
    comment.push("");
    comment.push("---");
    comment.push("");

    // Add helpful footer
    const currentDate = new Date().toISOString().split("T")[0];
    comment.push(`<div align="center">`);
    comment.push("");
    comment.push(`**🤖 Automated Analysis Report**`);
    comment.push(
      `📅 Generated on ${currentDate} | 🔄 PR #${inputs.pr_number} | ⚡ Powered by GitHub Actions`
    );
    comment.push("");
    comment.push(
      `*Need help improving your score? Check the [analysis links](#-quick-links) above for detailed reports.*`
    );
    comment.push("");
    comment.push(`</div>`);

    const finalComment = comment.join("\n");

    // Post the comment
    await octokit.rest.issues.createComment({
      issue_number: inputs.pr_number,
      owner: owner,
      repo: repo,
      body: finalComment,
    });

    console.log(
      "✅ Successfully posted analysis comment to PR #" + inputs.pr_number
    );
  } catch (error) {
    console.error("❌ Error posting comment:", error.message);
    process.exit(1);
  }
}

// Run the script
postComment();
