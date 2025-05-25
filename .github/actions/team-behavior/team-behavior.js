const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Analyze git history and collaboration patterns to score team behavior
 */
async function analyzeTeamBehavior() {
  try {
    let behaviorScore = 0;
    let totalCommits = 0;
    let totalAuthors = 0;
    let messageQuality = 0;

    console.log("👥 Analyzing team collaboration patterns...");

    // Create reports directory in workspace root
    const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const reportsDir = path.join(workspaceRoot, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Change to workspace root for git analysis
    process.chdir(workspaceRoot);

    // Get total commits
    try {
      const commitsOutput = execSync("git rev-list --count HEAD", {
        encoding: "utf8",
      });
      totalCommits = parseInt(commitsOutput.trim()) || 0;
    } catch (error) {
      console.log("⚠️ Could not count commits, using 0");
      totalCommits = 0;
    }

    // Get unique authors
    try {
      const authorsOutput = execSync("git log --format='%an' | sort -u", {
        encoding: "utf8",
      });
      totalAuthors = authorsOutput.trim()
        ? authorsOutput.trim().split("\n").length
        : 1;
    } catch (error) {
      console.log("⚠️ Could not count authors, using 1");
      totalAuthors = 1;
    }

    // Calculate commit activity score (0-40 points)
    let commitScore = 0;
    if (totalCommits > 30) {
      commitScore = 40;
    } else if (totalCommits > 15) {
      commitScore = 30;
    } else if (totalCommits > 5) {
      commitScore = 20;
    } else if (totalCommits > 0) {
      commitScore = 10;
    } else {
      commitScore = 0;
    }

    // Calculate author diversity score (0-30 points)
    let authorScore = 0;
    if (totalAuthors > 4) {
      authorScore = 30;
    } else if (totalAuthors > 2) {
      authorScore = 25;
    } else if (totalAuthors > 1) {
      authorScore = 15;
    } else {
      authorScore = 5;
    }

    // Calculate commit message quality score (0-30 points)
    let messageScore = 0;
    if (totalCommits > 0) {
      try {
        const conventionalCommitsOutput = execSync(
          'git log --oneline | grep -E "(feat|fix|docs|style|refactor|test|chore):" | wc -l',
          { encoding: "utf8" }
        );
        const goodMessages = parseInt(conventionalCommitsOutput.trim()) || 0;

        messageQuality = Math.floor((goodMessages * 100) / totalCommits);
        messageScore = Math.floor((messageQuality * 30) / 100);
      } catch (error) {
        console.log("⚠️ Could not analyze commit messages");
        messageScore = 0;
        messageQuality = 0;
      }
    }

    // Calculate total behavior score
    behaviorScore = commitScore + authorScore + messageScore;

    // Cap at 100
    behaviorScore = Math.min(behaviorScore, 100);

    // Generate detailed team analysis report
    const teamAnalysis = {
      summary: {
        behaviorScore: behaviorScore,
        totalCommits: totalCommits,
        totalAuthors: totalAuthors,
        messageQuality: messageQuality,
      },
      scoring: {
        commitActivityScore: commitScore,
        authorDiversityScore: authorScore,
        messageQualityScore: messageScore,
      },
      breakdown: {
        commitActivity: {
          score: commitScore,
          maxScore: 40,
          description: getCommitActivityDescription(totalCommits),
        },
        authorDiversity: {
          score: authorScore,
          maxScore: 30,
          description: getAuthorDiversityDescription(totalAuthors),
        },
        messageQuality: {
          score: messageScore,
          maxScore: 30,
          percentage: messageQuality,
          description: getMessageQualityDescription(messageQuality),
        },
      },
      timestamp: new Date().toISOString(),
    };

    function getCommitActivityDescription(commits) {
      if (commits > 30) return "Excellent commit activity";
      if (commits > 15) return "Good commit activity";
      if (commits > 5) return "Moderate commit activity";
      if (commits > 0) return "Low commit activity";
      return "No commits found";
    }

    function getAuthorDiversityDescription(authors) {
      if (authors > 4) return "Excellent team collaboration";
      if (authors > 2) return "Good team diversity";
      if (authors > 1) return "Limited collaboration";
      return "Single contributor";
    }

    function getMessageQualityDescription(quality) {
      if (quality >= 80) return "Excellent commit message quality";
      if (quality >= 60) return "Good commit message practices";
      if (quality >= 40) return "Moderate message quality";
      if (quality >= 20) return "Poor message quality";
      return "Very poor message quality";
    }

    // Save team analysis report
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(reportsDir, "team-analysis.json"),
      JSON.stringify(teamAnalysis, null, 2)
    );
    console.log("📁 Team analysis saved to reports/team-analysis.json");

    // Set outputs
    core.setOutput("behavior_score", behaviorScore.toString());
    core.setOutput("total_commits", totalCommits.toString());
    core.setOutput("total_authors", totalAuthors.toString());
    core.setOutput("message_quality", messageQuality.toString());

    console.log(
      `✅ Team analysis complete - Score: ${behaviorScore}/100 | Commits: ${totalCommits} | Authors: ${totalAuthors} | Message Quality: ${messageQuality}%`
    );
  } catch (error) {
    console.error("❌ Error analyzing team behavior:", error);
    core.setFailed(`Failed to analyze team behavior: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
analyzeTeamBehavior();
