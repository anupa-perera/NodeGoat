const core = require("@actions/core");
const fs = require("fs");

/**
 * Create a formatted job summary for the hackathon analysis
 */
async function createJobSummary() {
  try {
    // Get inputs from environment variables
    const teamName = process.env.TEAM_NAME || "Unknown";
    const finalScore = process.env.FINAL_SCORE || "0";
    const detectedStack = process.env.DETECTED_STACK || "Unknown";
    const detectedLanguage = process.env.DETECTED_LANGUAGE || "Unknown";
    const testScore = process.env.TEST_SCORE || "0";
    const sonarScore = process.env.SONAR_SCORE || "0";
    const securityScore = process.env.SECURITY_SCORE || "0";
    const frontendScore = process.env.FRONTEND_SCORE || "0";
    const teamScore = process.env.TEAM_SCORE || "0";
    const aiScore = process.env.AI_SCORE || "0";
    const sonarUrl = process.env.SONAR_URL || "#";
    const githubRepository = process.env.GITHUB_REPOSITORY || "";
    const githubRunId = process.env.GITHUB_RUN_ID || "";

    // Create the summary content
    const summaryContent = `## 🏆 Hackathon Analysis Complete

**Team:** ${teamName}  
**Final Score:** ${finalScore}/100  
**Stack:** ${detectedStack} (${detectedLanguage})

### 📊 Score Breakdown
- **Tests & Coverage:** ${testScore}/100
- **Code Quality (SonarCloud):** ${sonarScore}/100
- **Security:** ${securityScore}/100
- **Frontend UX:** ${frontendScore}/100
- **Team Collaboration:** ${teamScore}/100
- **AI Attribution:** ${aiScore}/100

### 🔗 Resources
- [SonarCloud Report](${sonarUrl})
- [Analysis Artifacts](https://github.com/${githubRepository}/actions/runs/${githubRunId})

### 📈 Analysis Summary
Generated on: ${new Date().toISOString()}  
Analysis completed successfully with comprehensive scoring across all evaluation criteria.
`;

    // Write to GitHub Step Summary
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      fs.appendFileSync(summaryFile, summaryContent);
      console.log("✅ Job summary created successfully");
    } else {
      console.log("📄 Summary Content:");
      console.log(summaryContent);
    }

    // Set output for potential downstream use
    core.setOutput("summary_created", "true");
    core.setOutput("final_score", finalScore);
  } catch (error) {
    console.error("❌ Error creating job summary:", error);
    core.setFailed(`Failed to create job summary: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
createJobSummary();
