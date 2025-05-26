#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function scanReportsDirectory() {
  const reportsDir = path.join(__dirname, "../../reports/teams");
  const teams = [];

  if (!fs.existsSync(reportsDir)) {
    console.log("Reports directory does not exist");
    return teams;
  }

  const teamDirs = fs
    .readdirSync(reportsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const teamName of teamDirs) {
    const teamDir = path.join(reportsDir, teamName);
    const prDirs = fs
      .readdirSync(teamDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const prDir of prDirs) {
      const prPath = path.join(teamDir, prDir);
      const htmlReportPath = path.join(
        prPath,
        `hackathon-report-${teamName}.html`
      );
      const scoreBreakdownPath = path.join(prPath, "score-breakdown.json");

      if (fs.existsSync(htmlReportPath) && fs.existsSync(scoreBreakdownPath)) {
        try {
          const scoreData = JSON.parse(
            fs.readFileSync(scoreBreakdownPath, "utf8")
          );
          const stats = fs.statSync(htmlReportPath);

          teams.push({
            teamName,
            prNumber: prDir.replace("pr-", ""),
            htmlPath: `teams/${teamName}/${prDir}/hackathon-report-${teamName}.html`,
            overallScore: scoreData.overall_score || 0,
            grade: scoreData.grade || "N/A",
            componentScores: scoreData.component_scores || {},
            lastModified: stats.mtime.toISOString(),
            timestamp:
              scoreData.calculation_timestamp || stats.mtime.toISOString(),
          });
        } catch (error) {
          console.warn(
            `Error reading score data for ${teamName}/${prDir}:`,
            error.message
          );
        }
      }
    }
  }

  // Sort by overall score descending
  teams.sort((a, b) => b.overallScore - a.overallScore);
  return teams;
}

function getScoreGrade(score) {
  if (score >= 90) return { grade: "A+", color: "#4CAF50", bgColor: "#E8F5E8" };
  if (score >= 85) return { grade: "A", color: "#4CAF50", bgColor: "#E8F5E8" };
  if (score >= 80) return { grade: "A-", color: "#8BC34A", bgColor: "#F1F8E9" };
  if (score >= 75) return { grade: "B+", color: "#CDDC39", bgColor: "#F9FBE7" };
  if (score >= 70) return { grade: "B", color: "#CDDC39", bgColor: "#F9FBE7" };
  if (score >= 65) return { grade: "B-", color: "#FFEB3B", bgColor: "#FFFDE7" };
  if (score >= 60) return { grade: "C+", color: "#FFC107", bgColor: "#FFF8E1" };
  if (score >= 55) return { grade: "C", color: "#FF9800", bgColor: "#FFF3E0" };
  if (score >= 50) return { grade: "C-", color: "#FF5722", bgColor: "#FBE9E7" };
  return { grade: "F", color: "#F44336", bgColor: "#FFEBEE" };
}

function generateIndexHTML(teams) {
  const timestamp = new Date().toISOString();
  const totalTeams = teams.length;
  const averageScore =
    totalTeams > 0
      ? teams.reduce((sum, team) => sum + team.overallScore, 0) / totalTeams
      : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hackathon Judge - Team Reports</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .stats-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }

        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .teams-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
        }

        .team-card {
            background: white;
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .team-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            border-color: #667eea;
        }

        .team-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .team-info h3 {
            font-size: 1.5em;
            color: #333;
            margin-bottom: 5px;
        }

        .pr-number {
            color: #666;
            font-size: 0.9em;
        }

        .overall-score {
            text-align: center;
            padding: 15px;
            border-radius: 15px;
            margin-bottom: 15px;
        }

        .score-value {
            font-size: 2.2em;
            font-weight: bold;
            display: block;
        }

        .score-grade {
            font-size: 1.1em;
            margin-top: 5px;
            opacity: 0.8;
        }

        .components-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }

        .component {
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            background: #f8f9fa;
        }

        .component-icon {
            font-size: 1.2em;
            margin-bottom: 3px;
        }

        .component-score {
            font-weight: bold;
            font-size: 0.9em;
        }

        .component-label {
            font-size: 0.7em;
            color: #666;
            margin-top: 2px;
        }

        .view-report-btn {
            display: block;
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            text-align: center;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .view-report-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .timestamp {
            text-align: center;
            color: white;
            margin-top: 40px;
            opacity: 0.8;
            font-size: 0.9em;
        }

        .no-reports {
            text-align: center;
            background: white;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .no-reports h2 {
            color: #666;
            margin-bottom: 15px;
        }

        .no-reports p {
            color: #999;
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .teams-grid {
                grid-template-columns: 1fr;
            }
            
            .components-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 Hackathon Judge</h1>
            <p>Team Performance Dashboard</p>
        </div>

        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-value">${totalTeams}</div>
                <div class="stat-label">Teams Analyzed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${averageScore.toFixed(1)}</div>
                <div class="stat-label">Average Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${
                  teams.filter((t) => t.overallScore >= 70).length
                }</div>
                <div class="stat-label">Teams with B+ or Higher</div>
            </div>
        </div>

        ${
          teams.length > 0
            ? `
            <div class="teams-grid">
                ${teams
                  .map((team) => {
                    const scoreInfo = getScoreGrade(team.overallScore);
                    return `
                        <div class="team-card">
                            <div class="team-header">
                                <div class="team-info">
                                    <h3>${team.teamName}</h3>
                                    <div class="pr-number">PR #${
                                      team.prNumber
                                    }</div>
                                </div>
                            </div>
                            
                            <div class="overall-score" style="background-color: ${
                              scoreInfo.bgColor
                            }; color: ${scoreInfo.color};">
                                <span class="score-value">${
                                  team.overallScore
                                }/100</span>
                                <div class="score-grade">Grade: ${
                                  scoreInfo.grade
                                }</div>
                            </div>
                            
                            <div class="components-grid">
                                <div class="component">
                                    <div class="component-icon">🧪</div>
                                    <div class="component-score">${
                                      team.componentScores.test || 0
                                    }</div>
                                    <div class="component-label">Tests</div>
                                </div>
                                <div class="component">
                                    <div class="component-icon">⚡</div>
                                    <div class="component-score">${
                                      team.componentScores.sonar || 0
                                    }</div>
                                    <div class="component-label">Quality</div>
                                </div>
                                <div class="component">
                                    <div class="component-icon">🔒</div>
                                    <div class="component-score">${
                                      team.componentScores.security || 0
                                    }</div>
                                    <div class="component-label">Security</div>
                                </div>
                                <div class="component">
                                    <div class="component-icon">🎨</div>
                                    <div class="component-score">${
                                      team.componentScores.frontend || 0
                                    }</div>
                                    <div class="component-label">Frontend</div>
                                </div>
                                <div class="component">
                                    <div class="component-icon">👥</div>
                                    <div class="component-score">${
                                      team.componentScores.team || 0
                                    }</div>
                                    <div class="component-label">Team</div>
                                </div>
                                <div class="component">
                                    <div class="component-icon">🤖</div>
                                    <div class="component-score">${
                                      team.componentScores.ai || 0
                                    }</div>
                                    <div class="component-label">AI</div>
                                </div>
                            </div>
                            
                            <a href="${team.htmlPath}" class="view-report-btn">
                                📊 View Detailed Report
                            </a>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `
            : `
            <div class="no-reports">
                <h2>No Reports Available</h2>
                <p>No team reports have been generated yet. Reports will appear here when teams submit pull requests.</p>
            </div>
        `
        }

        <div class="timestamp">
            Last updated: ${new Date(timestamp).toLocaleString()}
        </div>
    </div>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Animate cards on scroll
            const cards = document.querySelectorAll('.team-card');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            });

            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        });
    </script>
</body>
</html>`;
}

function main() {
  try {
    console.log("🔍 Scanning reports directory...");
    console.log("Current working directory:", process.cwd());
    console.log("Script directory:", __dirname);

    const teams = scanReportsDirectory();

    console.log(`📊 Found ${teams.length} team reports`);
    if (teams.length > 0) {
      console.log(
        "Teams found:",
        teams.map((t) => `${t.teamName} (${t.overallScore}/100)`)
      );
    }

    const htmlContent = generateIndexHTML(teams);
    const outputPath = path.join(__dirname, "../../reports/index.html");

    console.log("Output path:", outputPath);

    // Ensure reports directory exists
    const reportsDir = path.dirname(outputPath);
    console.log("Reports directory:", reportsDir);

    if (!fs.existsSync(reportsDir)) {
      console.log("Creating reports directory...");
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, htmlContent, "utf8");

    console.log(`✅ Index page generated successfully: ${outputPath}`);
    console.log(
      `📈 Teams processed: ${teams
        .map((t) => `${t.teamName} (${t.overallScore}/100)`)
        .join(", ")}`
    );
  } catch (error) {
    console.error("❌ Error generating index page:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanReportsDirectory, generateIndexHTML };
