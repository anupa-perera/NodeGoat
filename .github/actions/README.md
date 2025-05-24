# Simplified Hackathon Judge Workflow

This directory contains a modularized version of the hackathon judge workflow, broken down into reusable GitHub Actions.

## 📁 Structure

```
.github/
├── workflows/
│   └── self-contained-hackathon-judge.yml# Main workflow
└── actions/
    ├── setup-env/                        # Environment setup
    ├── detect-stack/                     # Technology detection
    ├── install-deps/                     # Dependency installation
    ├── test-coverage/                    # Test execution & coverage
    ├── sonar-analysis/                   # SonarCloud integration
    ├── security-scan/                    # Security vulnerability scanning
    ├── frontend-audit/                   # Lighthouse & UX analysis
    ├── team-behavior/                    # Git history analysis
    ├── ai-detection/                     # AI usage detection
    ├── calculate-score/                  # Score calculation
    └── post-comment/                     # PR comment posting
```

## 🎯 Key Improvements

### ✅ Readability

- **Modular Design**: Each analysis type is in its own action
- **Clear Inputs/Outputs**: Well-defined interfaces between components
- **Reduced Duplication**: Common patterns abstracted into reusable actions
- **Environment Variables**: Centralized configuration

### ✅ Maintainability

- **Single Responsibility**: Each action has one clear purpose
- **Easy Testing**: Actions can be tested independently
- **Version Control**: Individual actions can be versioned separately
- **Debugging**: Easier to isolate and fix issues

### ✅ Flexibility

- **Conditional Execution**: Actions run only when needed
- **Language Agnostic**: Supports multiple programming languages
- **Configurable Weights**: Easy to adjust scoring weights
- **Extensible**: New analysis types can be added easily

## 🔧 Configuration

### Required Secrets

- `SONAR_TOKEN`: SonarCloud authentication token
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Required Variables

- `SONAR_ORGANIZATION`: Your SonarCloud organization name

### Environment Variables

```yaml
env:
  NODE_VERSION: "18"
  JAVA_VERSION: "17"
  SONAR_SCANNER_VERSION: "5.0.1.3006"
  PYTHON_VERSION: "3.x"
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

## 🚀 Usage

The workflow automatically triggers on:

- Pull request events (opened, synchronized, reopened)
- Manual workflow dispatch

### Manual Trigger

```bash
# Via GitHub CLI
gh workflow run "Hackathon Judge" --field pr_number=123

# Via GitHub UI
# Go to Actions tab → Select workflow → Run workflow
```

## 🛠️ Customization

### Adding New Analysis Types

1. Create a new action in `.github/actions/your-analysis/`
2. Add the action to the main workflow
3. Update the score calculation weights
4. Modify the comment template if needed

### Adjusting Score Weights

Edit the weights in `.github/actions/calculate-score/action.yml`:

```bash
TEST_WEIGHT=25
SONAR_WEIGHT=30
SECURITY_WEIGHT=20
FRONTEND_WEIGHT=10
TEAM_WEIGHT=10
AI_WEIGHT=5
```

### Supporting New Languages

Add language detection logic to `.github/actions/detect-stack/action.yml` and corresponding setup in other actions.

## 🐛 Troubleshooting

### Common Issues

1. **SonarCloud Analysis Fails**

   - Check `SONAR_TOKEN` is correctly set
   - Verify `SONAR_ORGANIZATION` variable
   - Ensure project key is valid

2. **Tests Don't Run**

   - Check if test scripts are defined in `package.json`
   - Verify dependencies are installed correctly
   - Review test file naming conventions

3. **Security Scan Fails**
   - Ensure network access for downloading tools
   - Check file permissions for Trivy installation
   - Verify language-specific security tools are available

### Debug Mode

Enable debug logging by setting:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```
