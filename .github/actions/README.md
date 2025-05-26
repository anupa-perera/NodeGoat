# Hackathon Judge - Automated Code Analysis Workflow

This repository contains a comprehensive automated hackathon judging system that analyzes pull requests and generates detailed reports for teams. The system evaluates code quality, security, testing, frontend usability, team collaboration, and AI usage attribution.

## 🎯 What It Does

### Automated Analysis Pipeline

The workflow automatically runs when:

- **Pull Requests** are opened, synchronized, or reopened
- **Manual Workflow Dispatch** is triggered

### Complete Team Evaluation

For each PR submission, the system:

1. **Extracts Team Information** from PR metadata
2. **Detects Technology Stack** (language, framework, frontend presence)
3. **Installs Dependencies** based on detected stack
4. **Runs Tests & Coverage Analysis**
5. **Performs SonarCloud Code Quality Analysis**
6. **Conducts Security Vulnerability Scanning**
7. **Audits Frontend Usability** (if applicable)
8. **Analyzes Team Collaboration Patterns**
9. **Detects AI Usage Attribution**
10. **Calculates Final Score** with weighted components
11. **Generates Multiple Report Formats**
12. **Commits Reports to Repository**
13. **Creates Dashboard Index Page**
14. **Posts Results as PR Comments**

## 📊 Reports Generated

### 1. **Team Directory Structure**

```
reports/teams/[TeamName]/pr-[PR-Number]/
├── ai-analysis.json              # AI usage detection results
├── coverage-summary.json         # Test coverage metrics
├── security-summary.json         # Security vulnerability summary
├── team-analysis.json           # Team collaboration analysis
├── trivy-results.json           # Detailed security scan results
├── score-breakdown.json         # Component scores and weights
├── sonar-analysis-results.json  # SonarCloud analysis details
├── analysis-[timestamp].json    # Timestamped analysis metadata
├── latest-summary.md            # Human-readable summary
└── hackathon-report-[TeamName].html  # Detailed HTML report
```

### 2. **Dashboard Index Page**

- **Location**: `reports/index.html`
- **Features**:
  - Team performance overview cards
  - Statistics grid (total teams, average score, top performer)
  - Direct links to individual team reports
  - Responsive design for mobile/desktop
  - Automatic updates when new reports are added

### 3. **GitHub Actions Artifacts**

- **Name**: `hackathon-analysis-[TeamName]-pr[PR-Number]`
- **Contents**: All JSON reports and analysis files
- **Retention**: 30 days

## 🔧 Environment Variables

### Required Environment Variables

```yaml
env:
  NODE_VERSION: "18" # Node.js version for setup
  JAVA_VERSION: "17" # Java version for SonarCloud
  SONAR_SCANNER_VERSION: "5.0.1.3006" # SonarCloud scanner version
  PYTHON_VERSION: "3.x" # Python version for tools
```

### Required Secrets

- `SONAR_TOKEN`: SonarCloud authentication token
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Required Repository Variables

- `SONAR_PROJECT_KEY`: Your SonarCloud project key
- `SONAR_ORGANIZATION`: Your SonarCloud organization name

### Required Permissions

```yaml
permissions:
  issues: write # To post PR comments
  pull-requests: write # To update PR status
  contents: write # To commit reports to repository
```

## 📁 Repository Structure

```
.github/
├── workflows/
│   └── self-contained-hackathon-judge.yml  # Main workflow
├── actions/                                # Modular analysis components
│   ├── setup-env/                         # Environment setup
│   ├── detect-stack/                      # Technology detection
│   ├── install-deps/                      # Dependency installation
│   ├── test-coverage/                     # Test execution & coverage
│   ├── sonar-analysis/                    # SonarCloud integration
│   ├── security-scan/                     # Security vulnerability scanning
│   ├── frontend-audit/                    # Lighthouse & UX analysis
│   ├── team-behavior/                     # Git history analysis
│   ├── ai-detection/                      # AI usage detection
│   ├── calculate-score/                   # Score calculation
│   ├── generate-html-report/              # HTML report generation
│   └── post-comment/                      # PR comment posting
└── scripts/
    ├── extract-pr-info.js                 # PR metadata extraction
    ├── generate-index.js                  # Dashboard generation
    └── generate-html-report.js            # HTML report creation
```

## 📊 Scoring System

| Component              | Weight | Description                                              |
| ---------------------- | ------ | -------------------------------------------------------- |
| **Tests & Coverage**   | 25%    | Unit tests, integration tests, code coverage             |
| **Code Quality**       | 30%    | SonarCloud analysis (bugs, code smells, maintainability) |
| **Security**           | 20%    | Vulnerability scanning, dependency security              |
| **Frontend UX**        | 10%    | Lighthouse scores (performance, accessibility, SEO)      |
| **Team Collaboration** | 10%    | Git history, commit quality, author diversity            |
| **AI Attribution**     | 5%     | Proper attribution of AI-assisted development            |

## 🚀 Access Reports

### Team Reports

Individual team reports are accessible at:

```
https://github.com/[owner]/[repo]/tree/main/reports/teams/[TeamName]/pr-[PR-Number]/
```

### Dashboard

The main dashboard is available at:

```
https://github.com/[owner]/[repo]/blob/main/reports/index.html
```

### PR Comments

Each analyzed PR receives an automated comment with:

- Overall score and breakdown
- Links to detailed reports
- Security vulnerability summary
- Code quality metrics
- Dashboard link
