# Security Scanning and Monitoring

This document outlines the security scanning and monitoring setup for the PulsePlus application.

## Overview

PulsePlus implements a comprehensive security scanning and monitoring solution that integrates with AWS Security Hub. The solution includes:

1. **Automated Security Scanning** in the CI/CD pipeline
2. **Vulnerability Management** through AWS Security Hub
3. **Security Monitoring** and alerting
4. **Compliance Reporting**

## Security Scanning Tools

The following security scanning tools are integrated into our CI/CD pipeline:

### Snyk

[Snyk](https://snyk.io/) is used for scanning dependencies for known vulnerabilities. It checks:

- Node.js dependencies (npm packages)
- Docker images
- Infrastructure as Code (IaC) configurations

### OWASP ZAP

[OWASP ZAP](https://www.zaproxy.org/) (Zed Attack Proxy) is used for dynamic application security testing (DAST). It performs:

- Automated scans for common web vulnerabilities
- API security testing
- Active and passive scanning

### SonarQube

[SonarQube](https://www.sonarqube.org/) is used for static application security testing (SAST). It analyzes:

- Code quality
- Security vulnerabilities
- Code smells
- Technical debt

## CI/CD Integration

Security scanning is integrated into the CI/CD pipeline using AWS CodeBuild. The process is defined in the `buildspec.yml` file and includes:

1. Installing security scanning tools
2. Running security scans during the pre-build phase
3. Reporting findings to AWS Security Hub
4. Failing the build if critical or high severity issues are found (configurable)

## Running Security Scans Locally

You can run security scans locally using the `security-scan.js` script:

```bash
# Run all security scans
node scripts/security-scan.js --all

# Run specific scans
node scripts/security-scan.js --snyk --zap

# Run scans without failing on issues
node scripts/security-scan.js --all --report-only
```

## AWS Security Hub Integration

Security findings are reported to AWS Security Hub, which provides:

- Centralized view of security findings
- Prioritization of findings
- Integration with AWS services
- Compliance status

### Setting Up AWS Security Hub

1. Enable AWS Security Hub in your AWS account
2. Configure the AWS CLI with appropriate credentials
3. Set the following environment variables:
   - `AWS_REGION`: The AWS region where Security Hub is enabled
   - `AWS_ACCOUNT_ID`: Your AWS account ID
   - `SECURITY_SCANNING_ENABLED`: Set to `true` to enable reporting to Security Hub

## Security Policies

### Severity Thresholds

The CI/CD pipeline will fail if any of the following are found:

- Critical severity issues
- High severity issues

This behavior can be modified by using the `--report-only` flag in the security scanning script.

### Remediation Process

1. Security findings are reported to AWS Security Hub
2. Findings are triaged and prioritized
3. Remediation tasks are created and assigned
4. Fixes are implemented and verified

## Compliance

The security scanning setup helps maintain compliance with:

- OWASP Top 10
- NIST Cybersecurity Framework
- SOC 2
- GDPR

## Contact

For security-related questions or to report a security issue, please contact:

- Security Team: security@example.com
- Security Officer: security-officer@example.com 