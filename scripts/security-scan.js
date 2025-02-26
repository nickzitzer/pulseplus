#!/usr/bin/env node
/**
 * Security scanning script for CI/CD pipeline
 * 
 * This script runs various security scanning tools and reports findings
 * to AWS Security Hub.
 * 
 * Usage: node security-scan.js [options]
 * Options:
 *   --snyk           Run Snyk vulnerability scanning
 *   --zap            Run OWASP ZAP scanning
 *   --sonarqube      Run SonarQube scanning
 *   --all            Run all scans (default)
 *   --report-only    Only report findings, don't fail the build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const securityScanner = require('../backend/utils/securityScanner');
const logger = require('../backend/utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  snyk: args.includes('--all') || args.includes('--snyk'),
  zap: args.includes('--all') || args.includes('--zap'),
  sonarqube: args.includes('--all') || args.includes('--sonarqube'),
  reportOnly: args.includes('--report-only'),
};

// If no specific scan is selected, run all
if (!options.snyk && !options.zap && !options.sonarqube && !args.includes('--all')) {
  options.snyk = true;
  options.zap = true;
  options.sonarqube = true;
}

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// Tracking variables
let criticalIssuesFound = 0;
let highIssuesFound = 0;
let mediumIssuesFound = 0;
let lowIssuesFound = 0;

/**
 * Run a command and return its output
 * @param {string} command - Command to run
 * @param {boolean} ignoreErrors - Whether to ignore errors
 * @returns {string} Command output
 */
function runCommand(command, ignoreErrors = false) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    if (ignoreErrors) {
      return error.stdout || '';
    }
    logger.error(`Command failed: ${command}`, { error: error.message });
    throw error;
  }
}

/**
 * Run Snyk vulnerability scanning
 */
async function runSnykScan() {
  logger.info('Starting Snyk vulnerability scanning...');
  
  try {
    // Ensure Snyk is installed
    runCommand('npm install -g snyk', true);
    
    // Authenticate with Snyk (assuming SNYK_TOKEN is set in environment)
    if (process.env.SNYK_TOKEN) {
      runCommand('snyk auth ${SNYK_TOKEN}', true);
    }
    
    // Run Snyk test and output JSON results
    const outputFile = path.join(__dirname, '../reports/snyk-results.json');
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    
    runCommand(`snyk test --json > ${outputFile} || true`);
    
    // Parse results
    if (fs.existsSync(outputFile)) {
      const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      
      // Report vulnerabilities to Security Hub
      if (results.vulnerabilities && Array.isArray(results.vulnerabilities)) {
        for (const vuln of results.vulnerabilities) {
          await securityScanner.reportVulnerability({
            id: vuln.id,
            name: vuln.title,
            description: vuln.description || `Vulnerability in ${vuln.packageName}`,
            severity: vuln.severity,
            packageName: vuln.packageName,
            packageVersion: vuln.version,
            fixedVersion: vuln.fixedIn[0] || 'unknown'
          });
          
          // Count issues by severity
          switch (vuln.severity.toLowerCase()) {
            case 'critical':
              criticalIssuesFound++;
              break;
            case 'high':
              highIssuesFound++;
              break;
            case 'medium':
              mediumIssuesFound++;
              break;
            case 'low':
              lowIssuesFound++;
              break;
          }
        }
        
        logger.info(`Snyk found ${results.vulnerabilities.length} vulnerabilities`);
      }
    }
  } catch (error) {
    logger.error('Snyk scanning failed', { error: error.message });
    if (!options.reportOnly) {
      process.exit(EXIT_FAILURE);
    }
  }
}

/**
 * Run OWASP ZAP scanning
 */
async function runZapScan() {
  logger.info('Starting OWASP ZAP scanning...');
  
  try {
    // This would typically be run in a Docker container
    // For this example, we'll simulate the results
    
    const zapFindings = [
      {
        id: 'ZAP-XSS-1',
        name: 'Cross-Site Scripting (Reflected)',
        description: 'Reflected Cross-site scripting vulnerabilities arise when data is copied from a request and echoed into the application\'s immediate response in an unsafe way.',
        severity: 'high',
        resourceId: '/api/users/profile',
        resourceType: 'ApiEndpoint',
        recommendation: 'Validate all input and encode output before rendering to page'
      },
      {
        id: 'ZAP-CSRF-1',
        name: 'Cross-Site Request Forgery',
        description: 'CSRF is an attack that forces an end user to execute unwanted actions on a web application in which they\'re currently authenticated.',
        severity: 'medium',
        resourceId: '/api/settings/update',
        resourceType: 'ApiEndpoint',
        recommendation: 'Implement anti-CSRF tokens for all state-changing operations'
      }
    ];
    
    // Report findings to Security Hub
    for (const finding of zapFindings) {
      await securityScanner.reportSecurityIssue(finding);
      
      // Count issues by severity
      switch (finding.severity.toLowerCase()) {
        case 'critical':
          criticalIssuesFound++;
          break;
        case 'high':
          highIssuesFound++;
          break;
        case 'medium':
          mediumIssuesFound++;
          break;
        case 'low':
          lowIssuesFound++;
          break;
      }
    }
    
    logger.info(`ZAP scan completed with ${zapFindings.length} findings`);
  } catch (error) {
    logger.error('ZAP scanning failed', { error: error.message });
    if (!options.reportOnly) {
      process.exit(EXIT_FAILURE);
    }
  }
}

/**
 * Run SonarQube scanning
 */
async function runSonarQubeScan() {
  logger.info('Starting SonarQube scanning...');
  
  try {
    // This would typically be run using the SonarQube scanner
    // For this example, we'll simulate the results
    
    const sonarFindings = [
      {
        id: 'SONAR-SEC-1',
        name: 'Hardcoded Credentials',
        description: 'Credentials should not be hard-coded in source files.',
        severity: 'critical',
        resourceId: 'backend/services/authService.js',
        resourceType: 'SourceCode',
        recommendation: 'Move credentials to environment variables or a secure vault'
      },
      {
        id: 'SONAR-SEC-2',
        name: 'SQL Injection',
        description: 'User input should be sanitized before being used in SQL queries.',
        severity: 'high',
        resourceId: 'backend/services/userService.js',
        resourceType: 'SourceCode',
        recommendation: 'Use parameterized queries or an ORM to prevent SQL injection'
      }
    ];
    
    // Report findings to Security Hub
    for (const finding of sonarFindings) {
      await securityScanner.reportSecurityIssue(finding);
      
      // Count issues by severity
      switch (finding.severity.toLowerCase()) {
        case 'critical':
          criticalIssuesFound++;
          break;
        case 'high':
          highIssuesFound++;
          break;
        case 'medium':
          mediumIssuesFound++;
          break;
        case 'low':
          lowIssuesFound++;
          break;
      }
    }
    
    logger.info(`SonarQube scan completed with ${sonarFindings.length} findings`);
  } catch (error) {
    logger.error('SonarQube scanning failed', { error: error.message });
    if (!options.reportOnly) {
      process.exit(EXIT_FAILURE);
    }
  }
}

/**
 * Main function
 */
async function main() {
  logger.info('Starting security scanning...');
  
  // Run selected scans
  if (options.snyk) {
    await runSnykScan();
  }
  
  if (options.zap) {
    await runZapScan();
  }
  
  if (options.sonarqube) {
    await runSonarQubeScan();
  }
  
  // Summary
  logger.info('Security scanning completed', {
    criticalIssues: criticalIssuesFound,
    highIssues: highIssuesFound,
    mediumIssues: mediumIssuesFound,
    lowIssues: lowIssuesFound,
    totalIssues: criticalIssuesFound + highIssuesFound + mediumIssuesFound + lowIssuesFound
  });
  
  // Determine exit code
  if (!options.reportOnly && (criticalIssuesFound > 0 || highIssuesFound > 0)) {
    logger.error('Critical or high severity issues found. Failing the build.');
    process.exit(EXIT_FAILURE);
  }
  
  process.exit(EXIT_SUCCESS);
}

// Run the main function
main().catch(error => {
  logger.error('Security scanning failed', { error: error.message });
  process.exit(EXIT_FAILURE);
}); 