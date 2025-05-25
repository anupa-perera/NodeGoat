#!/usr/bin/env node

/**
 * Extract PR information for hackathon analysis
 * This script extracts PR details and sets outputs for the workflow
 */

const core = require("@actions/core");
const context = require("@actions/github").context;

async function extractPRInfo() {
  try {
    console.log("Extracting PR information...");

    const isPR = context.eventName === "pull_request";
    const prNumber = isPR
      ? context.payload.pull_request.number
      : process.env.INPUT_PR_NUMBER;
    const teamName = isPR
      ? context.payload.pull_request.user.login
      : "manual-run";
    const headSha = isPR ? context.payload.pull_request.head.sha : context.sha;
    const forkRepo = isPR
      ? context.payload.pull_request.head.repo.full_name
      : `${context.repo.owner}/${context.repo.repo}`;

    console.log(`PR Number: ${prNumber}`);
    console.log(`Team Name: ${teamName}`);
    console.log(`Head SHA: ${headSha}`);
    console.log(`Fork Repo: ${forkRepo}`);
    console.log(
      `Is Fork: ${forkRepo !== `${context.repo.owner}/${context.repo.repo}`}`
    );

    // Set outputs for GitHub Actions
    core.setOutput("pr_number", prNumber);
    core.setOutput("team_name", teamName);
    core.setOutput("head_sha", headSha);
    core.setOutput("fork_repo", forkRepo);
    core.setOutput(
      "is_fork",
      forkRepo !== `${context.repo.owner}/${context.repo.repo}`
    );

    console.log("✅ Successfully extracted PR information");
  } catch (error) {
    console.error("❌ Error extracting PR information:", error.message);
    core.setFailed(error.message);
    process.exit(1);
  }
}

// Run the script
extractPRInfo();
