#!/usr/bin/env node

/**
 * Detect project technology stack
 * This script analyzes the project structure to detect programming language and framework
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

// Helper function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Helper function to read and search file content
function fileContains(filePath, searchTerms) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, "utf8").toLowerCase();
    return searchTerms.some((term) => content.includes(term.toLowerCase()));
  } catch (error) {
    return false;
  }
}

// Helper function to count HTML files
async function countHtmlFiles() {
  try {
    const { stdout } = await execAsync(
      'find . -name "*.html" | head -5 | wc -l'
    );
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    // Fallback for Windows or if find command fails
    try {
      const files = fs.readdirSync(".", { recursive: true });
      return files.filter((file) => file.endsWith(".html")).slice(0, 5).length;
    } catch (fallbackError) {
      return 0;
    }
  }
}

async function detectStack() {
  try {
    console.log("🔍 Analyzing project structure...");

    // Default values
    let language = "generic";
    let framework = "generic";
    let hasFrontend = "false";

    // Detect JavaScript/Node.js projects
    if (fileExists("package.json")) {
      language = "javascript";

      const reactFrameworks = [
        "react",
        "vue",
        "angular",
        "svelte",
        "next",
        "nuxt",
      ];
      if (fileContains("package.json", reactFrameworks)) {
        hasFrontend = "true";

        if (fileContains("package.json", ["react"])) {
          framework = "react";
        } else if (fileContains("package.json", ["vue"])) {
          framework = "vue";
        } else if (fileContains("package.json", ["angular"])) {
          framework = "angular";
        } else if (fileContains("package.json", ["next"])) {
          framework = "nextjs";
        } else {
          framework = "javascript";
        }
      } else {
        framework = "nodejs";
      }
    }
    // Detect Python projects
    else if (
      fileExists("requirements.txt") ||
      fileExists("pyproject.toml") ||
      fileExists("setup.py")
    ) {
      language = "python";
      framework = "python";

      const pythonFiles = ["requirements.txt", "pyproject.toml", "setup.py"];
      const webFrameworks = ["flask", "django", "fastapi"];

      if (pythonFiles.some((file) => fileContains(file, webFrameworks))) {
        hasFrontend = "true";
        framework = "python-web";
      }
    }
    // Detect Go projects
    else if (fileExists("go.mod")) {
      language = "go";
      framework = "go";
    }
    // Detect Java projects
    else if (fileExists("pom.xml") || fileExists("build.gradle")) {
      language = "java";
      framework = "java";
    }
    // Detect Rust projects
    else if (fileExists("Cargo.toml")) {
      language = "rust";
      framework = "rust";
    }
    // Fallback: Check for HTML files
    else {
      const htmlCount = await countHtmlFiles();
      if (htmlCount > 0) {
        hasFrontend = "true";
        framework = "html";
      }
    }

    console.log(
      `✅ Detected: ${language} (${framework}) - Frontend: ${hasFrontend}`
    );

    // Set GitHub Actions outputs
    console.log(`language=${language}`);
    console.log(`framework=${framework}`);
    console.log(`has_frontend=${hasFrontend}`);

    // Write to GITHUB_OUTPUT if in GitHub Actions environment
    if (process.env.GITHUB_OUTPUT) {
      const outputs = [
        `language=${language}`,
        `framework=${framework}`,
        `has_frontend=${hasFrontend}`,
      ].join("\n");

      fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs + "\n");
    }
  } catch (error) {
    console.error("❌ Error detecting project stack:", error.message);
    process.exit(1);
  }
}

// Run the script
detectStack();
