# Hackathon Analysis Reports

This directory contains persistent analysis reports for all hackathon submissions.

## Structure

```
reports/
├── README.md              # This file
└── teams/                # Team-specific reports
    └── [team-name]/      # Team directory
        └── pr-[number]/  # Individual PR analysis
            ├── analysis-[timestamp].json  # Detailed JSON report
            ├── latest-summary.md          # Human-readable summary
            └── raw-reports/              # Original analysis files
```

## Usage

- Navigate to specific teams in the `teams/` directory
- View `latest-summary.md` for human-readable reports
- Use `analysis-*.json` files for programmatic access to detailed data

## Automated Updates

This directory is automatically updated by the Hackathon Judge GitHub Action whenever a pull request is analyzed.

