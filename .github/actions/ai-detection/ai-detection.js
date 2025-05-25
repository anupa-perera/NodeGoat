const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Detect and analyze AI-generated code patterns and attribution
 */
async function analyzeAiUsage() {
  try {
    let aiScore = 100;
    let aiPercentage = 0;
    let hasAttribution = false;

    console.log("🤖 Analyzing code for AI patterns...");

    // Create reports directory in workspace root
    const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const reportsDir = path.join(workspaceRoot, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Change to workspace root for analysis
    process.chdir(workspaceRoot);

    // Look for AI attribution in documentation files
    let attributionFiles = 0;
    const docsToCheck = ["README.md", "CONTRIBUTING.md", "docs/"];

    for (const doc of docsToCheck) {
      try {
        if (fs.existsSync(doc)) {
          const content = fs.readFileSync(doc, "utf8").toLowerCase();
          if (
            content.includes("ai") ||
            content.includes("gpt") ||
            content.includes("copilot") ||
            content.includes("claude") ||
            content.includes("chatgpt")
          ) {
            hasAttribution = true;
            attributionFiles++;
            console.log(`📝 Found AI attribution in ${doc}`);
            break;
          }
        }
      } catch (error) {
        // Continue if file doesn't exist or can't be read
      }
    }

    // Check for AI attribution in docs directory
    if (!hasAttribution && fs.existsSync("docs")) {
      try {
        const docsContent = execSync(
          'grep -r -i "ai\\|gpt\\|copilot\\|claude\\|chatgpt" docs/',
          { encoding: "utf8" }
        );
        if (docsContent.trim()) {
          hasAttribution = true;
          attributionFiles++;
          console.log("📝 Found AI attribution in docs directory");
        }
      } catch (error) {
        // No matches found
      }
    }

    // Check commit messages for AI mentions
    let aiCommits = 0;
    try {
      const commitsOutput = execSync(
        'git log --oneline | grep -i "ai\\|gpt\\|copilot\\|claude\\|chatgpt" | wc -l',
        { encoding: "utf8" }
      );
      aiCommits = parseInt(commitsOutput.trim()) || 0;

      if (aiCommits > 0) {
        hasAttribution = true;
        console.log(
          `📝 Found ${aiCommits} commit messages mentioning AI tools`
        );
      }
    } catch (error) {
      console.log("⚠️ Could not analyze commit messages");
    }

    // Analyze code files for AI-like patterns
    const codeExtensions = ["*.js", "*.ts", "*.py", "*.go", "*.java"];
    let totalFiles = 0;
    let aiPatterns = 0;

    try {
      const findCommand = `find . -type f \\( ${codeExtensions
        .map((ext) => `-name "${ext}"`)
        .join(" -o ")} \\) | grep -v node_modules`;
      const filesOutput = execSync(findCommand, { encoding: "utf8" });
      const files = filesOutput.trim() ? filesOutput.trim().split("\n") : [];
      totalFiles = files.length;

      if (totalFiles > 0) {
        console.log(`📁 Analyzing ${totalFiles} code files for AI patterns...`);

        // Count functions/methods (AI tends to generate more verbose code)
        let functionCount = 0;
        try {
          const functionOutput = execSync(
            'grep -r "function\\|def\\|func" . --include="*.js" --include="*.ts" --include="*.py" --include="*.go" | wc -l',
            { encoding: "utf8" }
          );
          functionCount = parseInt(functionOutput.trim()) || 0;
        } catch (error) {
          // No functions found
        }

        // Count comments (AI tends to add many comments)
        let commentCount = 0;
        try {
          const commentOutput = execSync(
            'grep -r "//\\|#\\|/\\*" . --include="*.js" --include="*.ts" --include="*.py" --include="*.go" | wc -l',
            { encoding: "utf8" }
          );
          commentCount = parseInt(commentOutput.trim()) || 0;
        } catch (error) {
          // No comments found
        }

        // Estimate AI percentage based on code patterns
        const commentRatio = totalFiles > 0 ? commentCount / totalFiles : 0;
        const functionRatio = totalFiles > 0 ? functionCount / totalFiles : 0;

        // Heuristic: High comment ratio + consistent patterns suggest AI
        aiPercentage = Math.min(
          100,
          Math.floor(commentRatio * 50 + functionRatio * 30)
        );

        console.log(
          `📊 Code analysis: ${commentCount} comments, ${functionCount} functions in ${totalFiles} files`
        );
        console.log(`🎯 Estimated AI usage: ${aiPercentage}%`);
      }
    } catch (error) {
      console.log("⚠️ Could not analyze code files for patterns");
    }

    // Calculate AI score
    if (hasAttribution) {
      aiScore = 100; // Full points for proper attribution
      console.log("✅ Proper AI attribution found");
    } else {
      // Deduct points based on estimated AI usage without attribution
      const deduction = Math.floor(aiPercentage / 2);
      aiScore = Math.max(0, 100 - deduction);

      if (aiPercentage > 20) {
        console.log(
          `⚠️ Possible AI usage detected (${aiPercentage}%) without attribution`
        );
      }
    }

    // Generate AI analysis report
    const aiAnalysis = {
      summary: {
        aiScore: aiScore,
        estimatedAiPercentage: aiPercentage,
        hasAttribution: hasAttribution,
        attributionSources: attributionFiles,
        aiCommits: aiCommits,
      },
      patterns: {
        totalCodeFiles: totalFiles,
        analysisMethod: "heuristic-based",
      },
      recommendations: generateRecommendations(hasAttribution, aiPercentage),
      timestamp: new Date().toISOString(),
    };

    function generateRecommendations(hasAttrib, aiPercent) {
      const recommendations = [];

      if (!hasAttrib && aiPercent > 30) {
        recommendations.push("Consider adding AI attribution to documentation");
        recommendations.push(
          "Mention AI tools used in README.md or CONTRIBUTING.md"
        );
      }

      if (!hasAttrib && aiPercent > 50) {
        recommendations.push(
          "High AI usage detected - ensure proper attribution"
        );
        recommendations.push("Document which AI tools were used and how");
      }

      if (hasAttrib) {
        recommendations.push("Great job on AI attribution!");
      }

      if (recommendations.length === 0) {
        recommendations.push("No major AI usage patterns detected");
      }

      return recommendations;
    }

    // Save AI analysis report
    if (!fs.existsSync("reports")) {
      fs.mkdirSync("reports", { recursive: true });
    }
    fs.writeFileSync(
      path.join(reportsDir, "ai-analysis.json"),
      JSON.stringify(aiAnalysis, null, 2)
    );
    console.log("📁 AI analysis saved to reports/ai-analysis.json");

    // Set outputs
    core.setOutput("ai_score", aiScore.toString());
    core.setOutput("ai_percentage", aiPercentage.toString());
    core.setOutput("has_attribution", hasAttribution.toString());

    console.log(
      `✅ AI analysis complete - Score: ${aiScore}/100 | Estimated AI: ${aiPercentage}% | Attribution: ${hasAttribution}`
    );
  } catch (error) {
    console.error("❌ Error analyzing AI usage:", error);
    core.setFailed(`Failed to analyze AI usage: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
analyzeAiUsage();
