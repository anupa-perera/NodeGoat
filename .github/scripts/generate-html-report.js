#!/usr/bin/env node

/**
 * Generate HTML Report from Hackathon Judge JSON Results
 * Creates a beautiful, interactive HTML dashboard from analysis results
 */

const fs = require("fs");
const path = require("path");

// Configuration
const DEFAULT_TEAM_DIR = process.argv[2] || "reports/teams";
const OUTPUT_FILE = process.argv[3] || "hackathon-report.html";

function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`⚠️  Could not load ${filePath}: ${error.message}`);
  }
  return null;
}

function findLatestTeamReport(teamDir) {
  try {
    const prDirs = fs
      .readdirSync(teamDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => name.startsWith("pr-"))
      .sort((a, b) => {
        const prNumA = parseInt(a.split("-")[1]);
        const prNumB = parseInt(b.split("-")[1]);
        return prNumB - prNumA; // Descending order
      });

    return prDirs.length > 0 ? prDirs[0] : null;
  } catch (error) {
    console.warn(
      `⚠️  Could not read team directory ${teamDir}: ${error.message}`
    );
    return null;
  }
}

function getScoreGrade(score) {
  if (score >= 90)
    return { grade: "A+", color: "#4CAF50", description: "Excellent" };
  if (score >= 80)
    return { grade: "A", color: "#8BC34A", description: "Very Good" };
  if (score >= 70) return { grade: "B", color: "#CDDC39", description: "Good" };
  if (score >= 60)
    return { grade: "C", color: "#FFC107", description: "Satisfactory" };
  if (score >= 50)
    return { grade: "D", color: "#FF9800", description: "Needs Improvement" };
  return { grade: "F", color: "#F44336", description: "Poor" };
}

function generateScoreChart(scores, weights) {
  const categories = [
    { key: "test", name: "Tests & Coverage", icon: "🧪" },
    { key: "sonar", name: "Code Quality", icon: "⚡" },
    { key: "security", name: "Security", icon: "🔒" },
    { key: "frontend", name: "Frontend UX", icon: "🎨" },
    { key: "team", name: "Team Collaboration", icon: "👥" },
    { key: "ai", name: "AI Attribution", icon: "🤖" },
  ];

  return categories
    .map((cat) => {
      const score = scores[cat.key] || 0;
      const weight = weights[`${cat.key.toUpperCase()}_WEIGHT`] || 0;
      const { color } = getScoreGrade(score);

      return `
      <div class="score-item">
        <div class="score-header">
          <span class="score-icon">${cat.icon}</span>
          <span class="score-label">${cat.name}</span>
          <span class="score-weight">(${weight}%)</span>
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${score}%; background-color: ${color}"></div>
        </div>
        <div class="score-value">${score}/100</div>
      </div>
    `;
    })
    .join("");
}

function generateSecurityDetails(securityData) {
  if (!securityData) return "<p>No security data available</p>";

  const { summary } = securityData;
  const totalIssues = summary.totalIssues || 0;

  if (totalIssues === 0) {
    return `
      <div class="security-success">
        <div class="success-icon">🛡️</div>
        <h3>Excellent Security!</h3>
        <p>No security vulnerabilities detected</p>
        <div class="score-display">Score: ${summary.score}/100</div>
      </div>
    `;
  }

  return `
    <div class="security-issues">
      <div class="issue-summary">
        <div class="issue-count high">High: ${summary.highSeverity || 0}</div>
        <div class="issue-count medium">Medium: ${
          summary.mediumSeverity || 0
        }</div>
        <div class="issue-count low">Low: ${summary.lowSeverity || 0}</div>
      </div>
      <p class="security-details">${
        securityData.details || "See security scan for details"
      }</p>
    </div>
  `;
}

function generateSonarDetails(sonarData) {
  if (!sonarData) return "<p>No SonarCloud data available</p>";

  const { summary } = sonarData;
  const bugs = parseInt(summary.bugs) || 0;
  const vulnerabilities = parseInt(summary.vulnerabilities) || 0;
  const codeSmells = parseInt(summary.code_smells) || 0;
  const coverage = parseFloat(summary.coverage) || 0;

  return `
    <div class="sonar-metrics">
      <div class="metric-card">
        <div class="metric-icon">🐛</div>
        <div class="metric-value">${bugs}</div>
        <div class="metric-label">Bugs</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">⚠️</div>
        <div class="metric-value">${vulnerabilities}</div>
        <div class="metric-label">Vulnerabilities</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">💭</div>
        <div class="metric-value">${codeSmells}</div>
        <div class="metric-label">Code Smells</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">📊</div>
        <div class="metric-value">${coverage.toFixed(1)}%</div>
        <div class="metric-label">Coverage</div>
      </div>
    </div>
    <div class="sonar-link">
      <a href="${
        summary.sonar_project_url
      }" target="_blank">View in SonarCloud 🔗</a>
    </div>
  `;
}

function generateTeamDetails(teamData) {
  if (!teamData) return "<p>No team data available</p>";

  const { summary, breakdown } = teamData;

  return `
    <div class="team-metrics">
      <div class="team-stat">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">${summary.totalCommits || 0}</div>
          <div class="stat-label">Total Commits</div>
        </div>
      </div>
      <div class="team-stat">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">${summary.totalAuthors || 0}</div>
          <div class="stat-label">Contributors</div>
        </div>
      </div>
      <div class="team-stat">
        <div class="stat-icon">💬</div>
        <div class="stat-content">
          <div class="stat-value">${summary.messageQuality || 0}%</div>
          <div class="stat-label">Message Quality</div>
        </div>
      </div>
    </div>
    
    <div class="team-breakdown">
      <h4>Detailed Breakdown:</h4>
      ${Object.entries(breakdown || {})
        .map(
          ([key, data]) => `
        <div class="breakdown-item">
          <span class="breakdown-label">${key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())}:</span>
          <span class="breakdown-score">${data.score}/${data.maxScore}</span>
          <span class="breakdown-desc">${data.description}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function generateAIDetails(aiData) {
  if (!aiData) return "<p>No AI analysis data available</p>";

  const { summary, recommendations } = aiData;

  return `
    <div class="ai-metrics">
      <div class="ai-score ${
        summary.hasAttribution ? "ai-good" : "ai-warning"
      }">
        <div class="ai-icon">${summary.hasAttribution ? "✅" : "⚠️"}</div>
        <div class="ai-content">
          <div class="ai-title">AI Attribution</div>
          <div class="ai-status">${
            summary.hasAttribution
              ? "Properly Attributed"
              : "Missing Attribution"
          }</div>
        </div>
      </div>
      
      <div class="ai-stats">
        <div class="ai-stat">
          <span class="ai-stat-label">Estimated AI Usage:</span>
          <span class="ai-stat-value">${
            summary.estimatedAiPercentage || 0
          }%</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-label">AI-related Commits:</span>
          <span class="ai-stat-value">${summary.aiCommits || 0}</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-label">Code Files Analyzed:</span>
          <span class="ai-stat-value">${
            aiData.patterns?.totalCodeFiles || 0
          }</span>
        </div>
      </div>
    </div>
    
    <div class="ai-recommendations">
      <h4>Recommendations:</h4>
      <ul>
        ${(recommendations || []).map((rec) => `<li>${rec}</li>`).join("")}
      </ul>
    </div>
  `;
}

function generateHTML(teamName, reportData) {
  const {
    scoreData,
    securityData,
    sonarData,
    teamData,
    aiData,
    coverageData,
    prNumber,
  } = reportData;

  const overallScore = scoreData?.overall_score || 0;
  const { grade, color, description } = getScoreGrade(overallScore);
  const timestamp = new Date().toISOString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hackathon Judge Report - ${teamName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .overall-score {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .score-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .score-circle .score {
            font-size: 3rem;
            font-weight: bold;
        }
        
        .grade-info {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }
        
        .main-content {
            padding: 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }
        
        .section {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: transform 0.3s ease;
        }
        
        .section:hover {
            transform: translateY(-5px);
        }
        
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.5rem;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        .score-item {
            margin-bottom: 20px;
            background: white;
            border-radius: 10px;
            padding: 15px;
        }
        
        .score-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .score-icon {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .score-label {
            flex: 1;
            font-weight: 600;
        }
        
        .score-weight {
            color: #666;
            font-size: 0.9rem;
        }
        
        .score-bar {
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .score-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
        }
        
        .score-value {
            text-align: right;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .security-success {
            text-align: center;
            color: #27ae60;
        }
        
        .success-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .score-display {
            font-size: 1.5rem;
            font-weight: bold;
            margin-top: 15px;
        }
        
        .sonar-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .metric-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .sonar-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .sonar-link a {
            color: #3498db;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }
        
        .sonar-link a:hover {
            color: #2980b9;
        }
        
        .team-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .team-stat {
            background: white;
            border-radius: 10px;
            padding: 20px;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .stat-icon {
            font-size: 2rem;
            margin-right: 15px;
        }
        
        .stat-value {
            font-size: 1.8rem;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .team-breakdown {
            background: white;
            border-radius: 10px;
            padding: 20px;
        }
        
        .breakdown-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        
        .breakdown-item:last-child {
            border-bottom: none;
        }
        
        .breakdown-label {
            flex: 1;
            font-weight: 600;
        }
        
        .breakdown-score {
            margin: 0 15px;
            font-weight: bold;
            color: #3498db;
        }
        
        .breakdown-desc {
            color: #666;
            font-size: 0.9rem;
        }
        
        .ai-metrics {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .ai-score {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
        }
        
        .ai-good {
            background: #d4edda;
            color: #155724;
        }
        
        .ai-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .ai-icon {
            font-size: 2rem;
            margin-right: 15px;
        }
        
        .ai-title {
            font-weight: bold;
            font-size: 1.2rem;
        }
        
        .ai-stats {
            display: grid;
            gap: 10px;
        }
        
        .ai-stat {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .ai-stat:last-child {
            border-bottom: none;
        }
        
        .ai-stat-label {
            color: #666;
        }
        
        .ai-stat-value {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .ai-recommendations {
            background: white;
            border-radius: 10px;
            padding: 20px;
        }
        
        .ai-recommendations ul {
            padding-left: 20px;
        }
        
        .ai-recommendations li {
            margin-bottom: 8px;
            color: #2c3e50;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .timestamp {
            margin-top: 10px;
            font-size: 0.8rem;
        }
        
        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
                padding: 20px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .score-circle {
                width: 120px;
                height: 120px;
            }
            
            .score-circle .score {
                font-size: 2.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏆 Hackathon Judge Report</h1>
            <div class="subtitle">Team: ${teamName} | PR #${
    prNumber || "N/A"
  }</div>
        </header>
        
        <section class="overall-score">
            <div class="score-circle">
                <div class="score">${overallScore}</div>
            </div>
            <div class="grade-info">Grade: ${grade} - ${description}</div>
            <div>Overall Score: ${overallScore}/100</div>
        </section>
        
        <main class="main-content">
            <section class="section">
                <h2>📊 Score Breakdown</h2>
                ${generateScoreChart(
                  scoreData?.component_scores || {},
                  scoreData?.weights || {}
                )}
            </section>
            
            <section class="section">
                <h2>🔒 Security Analysis</h2>
                ${generateSecurityDetails(securityData)}
            </section>
            
            <section class="section">
                <h2>⚡ Code Quality (SonarCloud)</h2>
                ${generateSonarDetails(sonarData)}
            </section>
            
            <section class="section">
                <h2>👥 Team Collaboration</h2>
                ${generateTeamDetails(teamData)}
            </section>
            
            <section class="section">
                <h2>🤖 AI Attribution Analysis</h2>
                ${generateAIDetails(aiData)}
            </section>
            
            <section class="section">
                <h2>🧪 Test Coverage</h2>
                ${
                  coverageData
                    ? `
                  <div class="coverage-info">
                    <p>Coverage data available - see detailed analysis for metrics.</p>
                  </div>
                `
                    : "<p>No coverage data available</p>"
                }
            </section>
        </main>
        
        <footer class="footer">
            <div>Generated by Hackathon Judge System</div>
            <div class="timestamp">Report generated: ${new Date(
              timestamp
            ).toLocaleString()}</div>
        </footer>
    </div>
    
    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Animate score bars
            const scoreBars = document.querySelectorAll('.score-fill');
            scoreBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 500);
            });
            
            // Add click effects to sections
            document.querySelectorAll('.section').forEach(section => {
                section.addEventListener('click', function() {
                    this.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        this.style.transform = 'translateY(-5px)';
                    }, 150);
                });
            });
        });
    </script>
</body>
</html>
  `;
}

function main() {
  console.log("🎨 Generating HTML Report...\n");

  // Find all teams
  if (!fs.existsSync(DEFAULT_TEAM_DIR)) {
    console.error(`❌ Teams directory not found: ${DEFAULT_TEAM_DIR}`);
    process.exit(1);
  }

  const teams = fs
    .readdirSync(DEFAULT_TEAM_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  if (teams.length === 0) {
    console.error("❌ No teams found in reports directory");
    process.exit(1);
  }

  // Process each team (or just the latest one)
  teams.forEach((teamName) => {
    console.log(`📊 Processing team: ${teamName}`);

    const teamDir = path.join(DEFAULT_TEAM_DIR, teamName);
    const latestPR = findLatestTeamReport(teamDir);

    if (!latestPR) {
      console.warn(`⚠️  No PR reports found for team ${teamName}`);
      return;
    }

    console.log(`📁 Using latest PR: ${latestPR}`);

    const reportDir = path.join(teamDir, latestPR);

    // Load all JSON files
    const reportData = {
      scoreData: loadJsonFile(path.join(reportDir, "score-breakdown.json")),
      securityData: loadJsonFile(path.join(reportDir, "security-summary.json")),
      sonarData: loadJsonFile(
        path.join(reportDir, "sonar-analysis-results.json")
      ),
      teamData: loadJsonFile(path.join(reportDir, "team-analysis.json")),
      aiData: loadJsonFile(path.join(reportDir, "ai-analysis.json")),
      coverageData: loadJsonFile(path.join(reportDir, "coverage-summary.json")),
      prNumber: latestPR.split("-")[1],
    };

    // Generate HTML
    const html = generateHTML(teamName, reportData);

    // Write HTML file
    const outputPath = OUTPUT_FILE.includes(".html")
      ? OUTPUT_FILE.replace(".html", `-${teamName}.html`)
      : `${OUTPUT_FILE}-${teamName}.html`;

    fs.writeFileSync(outputPath, html);
    console.log(`✅ HTML report generated: ${outputPath}`);
  });

  console.log("\n🎉 HTML report generation complete!");
}

if (require.main === module) {
  main();
}

module.exports = { generateHTML, loadJsonFile };
