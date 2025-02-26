/**
 * @module securityScanner
 * @description Security scanning utility that integrates with AWS Security Hub
 * @requires aws-sdk
 * @requires ./logger
 */

const AWS = require('aws-sdk');
const { logger } = require('./logger');

/**
 * @class SecurityScanner
 * @description Manages security scanning and reporting to AWS Security Hub
 */
class SecurityScanner {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {string} options.region - AWS region
   * @param {string} options.accountId - AWS account ID
   */
  constructor(options = {}) {
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.accountId = options.accountId || process.env.AWS_ACCOUNT_ID;
    this.securityHub = new AWS.SecurityHub({ region: this.region });
    this.enabled = process.env.SECURITY_SCANNING_ENABLED === 'true';
    this.productName = 'PulsePlus';
    this.companyName = 'Happy Technologies LLC';
  }

  /**
   * @async
   * @function reportFinding
   * @description Report a security finding to AWS Security Hub
   * @param {Object} finding - Security finding details
   * @param {string} finding.title - Finding title
   * @param {string} finding.description - Finding description
   * @param {string} finding.severity - Finding severity (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
   * @param {string} finding.resourceId - Resource ID
   * @param {string} finding.resourceType - Resource type
   * @param {string} finding.generatorId - Generator ID
   * @param {Object} finding.remediation - Remediation details
   * @returns {Promise<Object>} Result of reporting
   * @throws {Error} If reporting fails
   */
  async reportFinding(finding) {
    if (!this.enabled) {
      logger.info('Security scanning is disabled, skipping report');
      return { skipped: true };
    }

    if (!this.accountId) {
      throw new Error('AWS account ID is required for security scanning');
    }

    try {
      const timestamp = new Date().toISOString();
      const findingId = `${finding.generatorId}-${finding.resourceId}-${timestamp}`;
      
      const securityHubFinding = {
        SchemaVersion: '2018-10-08',
        Id: findingId,
        ProductArn: `arn:aws:securityhub:${this.region}:${this.accountId}:product/${this.accountId}/${this.productName}`,
        GeneratorId: finding.generatorId,
        AwsAccountId: this.accountId,
        Types: ['Software and Configuration Checks'],
        CreatedAt: timestamp,
        UpdatedAt: timestamp,
        Severity: {
          Label: finding.severity
        },
        Title: finding.title,
        Description: finding.description,
        Resources: [
          {
            Type: finding.resourceType,
            Id: finding.resourceId,
            Partition: 'aws',
            Region: this.region
          }
        ],
        Remediation: {
          Recommendation: {
            Text: finding.remediation.recommendation || 'No recommendation provided',
            Url: finding.remediation.url || ''
          }
        },
        ProductFields: {
          'CompanyName': this.companyName,
          'ProductName': this.productName
        },
        RecordState: 'ACTIVE',
        WorkflowState: 'NEW',
        Compliance: {
          Status: 'FAILED'
        }
      };
      
      const params = {
        Findings: [securityHubFinding]
      };
      
      const result = await this.securityHub.batchImportFindings(params).promise();
      
      logger.info(`Security finding reported: ${finding.title}`, {
        findingId,
        severity: finding.severity,
        resourceId: finding.resourceId
      });
      
      return {
        success: true,
        findingId,
        result
      };
    } catch (error) {
      logger.error(`Failed to report security finding: ${error.message}`, {
        finding,
        error: error.stack
      });
      
      throw new Error(`Failed to report security finding: ${error.message}`);
    }
  }

  /**
   * @async
   * @function reportVulnerability
   * @description Report a vulnerability finding
   * @param {Object} vulnerability - Vulnerability details
   * @param {string} vulnerability.id - Vulnerability ID (e.g., CVE ID)
   * @param {string} vulnerability.name - Vulnerability name
   * @param {string} vulnerability.description - Vulnerability description
   * @param {string} vulnerability.severity - Vulnerability severity
   * @param {string} vulnerability.packageName - Affected package name
   * @param {string} vulnerability.packageVersion - Affected package version
   * @param {string} vulnerability.fixedVersion - Version with the fix
   * @returns {Promise<Object>} Result of reporting
   */
  async reportVulnerability(vulnerability) {
    return this.reportFinding({
      title: `Vulnerability: ${vulnerability.name}`,
      description: vulnerability.description,
      severity: vulnerability.severity.toUpperCase(),
      resourceId: `${vulnerability.packageName}@${vulnerability.packageVersion}`,
      resourceType: 'Package',
      generatorId: `PulsePlus/Vulnerability/${vulnerability.id}`,
      remediation: {
        recommendation: `Update ${vulnerability.packageName} to version ${vulnerability.fixedVersion} or later`,
        url: `https://nvd.nist.gov/vuln/detail/${vulnerability.id}`
      }
    });
  }

  /**
   * @async
   * @function reportSecurityIssue
   * @description Report a security issue finding
   * @param {Object} issue - Security issue details
   * @param {string} issue.id - Issue ID
   * @param {string} issue.name - Issue name
   * @param {string} issue.description - Issue description
   * @param {string} issue.severity - Issue severity
   * @param {string} issue.resourceId - Affected resource ID
   * @param {string} issue.resourceType - Affected resource type
   * @param {string} issue.recommendation - Recommendation for fixing
   * @returns {Promise<Object>} Result of reporting
   */
  async reportSecurityIssue(issue) {
    return this.reportFinding({
      title: `Security Issue: ${issue.name}`,
      description: issue.description,
      severity: issue.severity.toUpperCase(),
      resourceId: issue.resourceId,
      resourceType: issue.resourceType,
      generatorId: `PulsePlus/SecurityIssue/${issue.id}`,
      remediation: {
        recommendation: issue.recommendation,
        url: issue.url || ''
      }
    });
  }
}

module.exports = new SecurityScanner(); 