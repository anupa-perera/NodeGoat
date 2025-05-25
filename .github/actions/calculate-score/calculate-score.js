#!/usr/bin/env node

/**
 * Calculate final weighted score from all analysis components
 * This script calculates the overall hackathon score based on various metrics
 */

const fs = require("fs");
const path = require("path");

// Parse inputs from environment variables
const inputs = {
  test_score: process.env.TEST_SCORE || "0",
  sonar_score: process.env.SONAR_SCORE || "0",
  security_score: process.env.SECURITY_SCORE || "0",
  frontend_score: process.env.FRONTEND_SCORE || "0",
  team_score: process.env.TEAM_SCORE || "0",
  ai_score: process.env.AI_SCORE || "0",
};

// Define weights (must sum to 100)
const WEIGHTS = {
  TEST_WEIGHT: 25,
  SONAR_WEIGHT: 30,
  SECURITY_WEIGHT: 20,
  FRONTEND_WEIGHT: 10,
  TEAM_WEIGHT: 10,
  AI_WEIGHT: 5,
};

// Helper function to safely convert input to integer (0-100)
function safeInt(input) {
  const num = parseInt(String(input).replace(/[^0-9]/g, ""));
  if (isNaN(num)) return 0;
  return Math.min(Math.max(num, 0), 100);
}

// Helper function to determine grade
function calculateGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function calculateScore() {
  try {
    console.log("Starting score calculation...");

    // Validate and convert input scores
    const scores = {
      test: safeInt(inputs.test_score),
      sonar: safeInt(inputs.sonar_score),
      security: safeInt(inputs.security_score),
      frontend: safeInt(inputs.frontend_score),
      team: safeInt(inputs.team_score),
      ai: safeInt(inputs.ai_score),
    };

    console.log("Validated scores:", scores);

    // Calculate weighted score
    const weightedSum =
      scores.test * WEIGHTS.TEST_WEIGHT +
      scores.sonar * WEIGHTS.SONAR_WEIGHT +
      scores.security * WEIGHTS.SECURITY_WEIGHT +
      scores.frontend * WEIGHTS.FRONTEND_WEIGHT +
      scores.team * WEIGHTS.TEAM_WEIGHT +
      scores.ai * WEIGHTS.AI_WEIGHT;

    const overallScore = Math.round(weightedSum / 100);
    const grade = calculateGrade(overallScore);

    // Create detailed breakdown
    const breakdown = {
      overall_score: overallScore,
      grade: grade,
      component_scores: scores,
      weights: WEIGHTS,
      weighted_contributions: {
        test: Math.round((scores.test * WEIGHTS.TEST_WEIGHT) / 100),
        sonar: Math.round((scores.sonar * WEIGHTS.SONAR_WEIGHT) / 100),
        security: Math.round((scores.security * WEIGHTS.SECURITY_WEIGHT) / 100),
        frontend: Math.round((scores.frontend * WEIGHTS.FRONTEND_WEIGHT) / 100),
        team: Math.round((scores.team * WEIGHTS.TEAM_WEIGHT) / 100),
        ai: Math.round((scores.ai * WEIGHTS.AI_WEIGHT) / 100),
      },
      calculation_timestamp: new Date().toISOString(),
    }; // Save to file
    const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const reportsDir = path.join(workspaceRoot, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(reportsDir, "score-breakdown.json"),
      JSON.stringify(breakdown, null, 2)
    );

    // Set GitHub Actions outputs
    const outputs = [
      `overall_score=${overallScore}`,
      `grade=${grade}`,
      `breakdown=${JSON.stringify(breakdown)}`,
    ];

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs.join("\n") + "\n");
    }

    // Log outputs for debugging
    console.log(
      `✅ Final score calculated: ${overallScore}/100 (Grade ${grade})`
    );
    console.log("Component contributions:");
    Object.entries(breakdown.weighted_contributions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} points`);
    });
  } catch (error) {
    console.error("❌ Error calculating score:", error.message);
    process.exit(1);
  }
}

// Run the script
calculateScore();
