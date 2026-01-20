/**
 * Security Micro-Task
 *
 * Scans changed files for OWASP top security issues and generates
 * fix tasks for critical and high severity vulnerabilities.
 *
 * Features:
 * - Retrieves changed files from git diff
 * - Pattern-based scanning for common security vulnerabilities
 * - Detects hardcoded passwords and API keys (critical)
 * - Detects unsafe eval() and innerHTML (high)
 * - Detects command injection and SQL injection risks (high/critical)
 * - Generates fix tasks for critical/high issues only
 * - Test files are reported with severity "info" only
 * - Includes OWASP category classification
 *
 * @module src/review/tasks/security
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * Types of security vulnerabilities
 */
export type VulnerabilityType =
  | "hardcoded_password"
  | "hardcoded_api_key"
  | "unsafe_eval"
  | "xss_risk"
  | "command_injection_risk"
  | "sql_injection_risk";

/**
 * Severity levels for vulnerabilities
 */
export type VulnerabilitySeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * OWASP category for vulnerability classification
 */
export type OwaspCategory =
  | "A01:2021-Broken Access Control"
  | "A02:2021-Cryptographic Failures"
  | "A03:2021-Injection"
  | "A04:2021-Insecure Design"
  | "A05:2021-Security Misconfiguration"
  | "A06:2021-Vulnerable and Outdated Components"
  | "A07:2021-Identification and Authentication Failures"
  | "A08:2021-Software and Data Integrity Failures"
  | "A09:2021-Security Logging and Monitoring Failures"
  | "A10:2021-Server-Side Request Forgery";

/**
 * A detected security vulnerability
 */
export interface Vulnerability {
  /** Type of vulnerability */
  type: VulnerabilityType;
  /** Severity level */
  severity: VulnerabilitySeverity;
  /** File path where found */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Description of the issue */
  message: string;
  /** OWASP category */
  owaspCategory: OwaspCategory;
  /** The matched pattern/code snippet */
  match?: string;
}

/**
 * Extended result type for security micro-task
 */
export interface SecurityResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Number of files scanned */
  scannedFiles: number;
  /** Detected vulnerabilities */
  vulnerabilities?: Vulnerability[];
  /** Human-readable summary */
  summary?: string;
}

/**
 * Options for running security scan
 */
export interface SecurityOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Custom file reader for testing */
  readFile?: (path: string) => Promise<string>;
}

/**
 * Security pattern definition
 */
interface SecurityPattern {
  type: VulnerabilityType;
  severity: VulnerabilitySeverity;
  pattern: RegExp;
  message: string;
  owaspCategory: OwaspCategory;
}

/**
 * Security patterns to scan for
 */
const SECURITY_PATTERNS: SecurityPattern[] = [
  // Hardcoded passwords
  {
    type: "hardcoded_password",
    severity: "critical",
    pattern: /\b(password|pwd|passwd|secret)\s*[:=]\s*["'][^"']+["']/gi,
    message: "Hardcoded password detected. Use environment variables instead.",
    owaspCategory: "A07:2021-Identification and Authentication Failures",
  },
  {
    type: "hardcoded_password",
    severity: "critical",
    pattern: /\bPASSWORD\s*[:=]\s*["'][^"']+["']/g,
    message: "Hardcoded PASSWORD constant detected. Use environment variables instead.",
    owaspCategory: "A07:2021-Identification and Authentication Failures",
  },
  // Hardcoded API keys
  {
    type: "hardcoded_api_key",
    severity: "critical",
    pattern: /\b(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*["'][^"']+["']/gi,
    message: "Hardcoded API key detected. Use environment variables instead.",
    owaspCategory: "A02:2021-Cryptographic Failures",
  },
  {
    type: "hardcoded_api_key",
    severity: "critical",
    pattern: /["'](sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}|ghp_[a-zA-Z0-9]{36})["']/g,
    message: "Hardcoded API key pattern detected. Use environment variables instead.",
    owaspCategory: "A02:2021-Cryptographic Failures",
  },
  // Unsafe eval
  {
    type: "unsafe_eval",
    severity: "high",
    pattern: /\beval\s*\([^)]+\)/g,
    message: "Unsafe eval() detected. Avoid using eval with dynamic content.",
    owaspCategory: "A03:2021-Injection",
  },
  {
    type: "unsafe_eval",
    severity: "high",
    pattern: /new\s+Function\s*\([^)]+\)/g,
    message: "Unsafe Function constructor detected. Avoid dynamic code execution.",
    owaspCategory: "A03:2021-Injection",
  },
  // XSS risks
  {
    type: "xss_risk",
    severity: "high",
    pattern: /\.innerHTML\s*=/g,
    message: "Direct innerHTML assignment detected. Use textContent or sanitize input.",
    owaspCategory: "A03:2021-Injection",
  },
  // Command injection
  {
    type: "command_injection_risk",
    severity: "high",
    pattern: /\b(exec|execSync|spawn)\s*\(\s*["'`].*\+/g,
    message: "Command with string concatenation detected. Use parameterized commands.",
    owaspCategory: "A03:2021-Injection",
  },
  {
    type: "command_injection_risk",
    severity: "high",
    pattern: /\b(exec|execSync|spawn)\s*\(\s*`[^`]*\$\{/g,
    message: "Command with template literal interpolation detected. Sanitize input.",
    owaspCategory: "A03:2021-Injection",
  },
  // SQL injection
  {
    type: "sql_injection_risk",
    severity: "critical",
    pattern: /["'`](SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*["'`]\s*\+/gi,
    message: "SQL query with string concatenation detected. Use parameterized queries.",
    owaspCategory: "A03:2021-Injection",
  },
  {
    type: "sql_injection_risk",
    severity: "critical",
    pattern: /\.(query|execute)\s*\(\s*`[^`]*\$\{/g,
    message: "SQL query with template literal interpolation detected. Use parameterized queries.",
    owaspCategory: "A03:2021-Injection",
  },
];

/**
 * Code file extensions to scan
 */
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

/**
 * Check if a file is a test file
 */
function isTestFile(path: string): boolean {
  return (
    path.includes(".test.") ||
    path.includes(".spec.") ||
    path.includes("/tests/") ||
    path.includes("/test/") ||
    path.includes("__tests__")
  );
}

/**
 * Check if a file should be scanned
 */
function shouldScanFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Scan a file's content for security vulnerabilities
 *
 * @param content - File content to scan
 * @param filePath - Path to the file (for context)
 * @returns Array of detected vulnerabilities
 */
export function scanFileForVulnerabilities(
  content: string,
  filePath: string
): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];
  const lines = content.split("\n");
  const isTest = isTestFile(filePath);

  for (const pattern of SECURITY_PATTERNS) {
    // Reset lastIndex for global regex patterns
    pattern.pattern.lastIndex = 0;

    // Search each line for the pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pattern.pattern.lastIndex = 0;
      const match = pattern.pattern.exec(line);

      if (match) {
        // Downgrade severity to "info" for test files
        const severity = isTest ? "info" : pattern.severity;

        vulnerabilities.push({
          type: pattern.type,
          severity,
          file: filePath,
          line: i + 1,
          message: pattern.message,
          owaspCategory: pattern.owaspCategory,
          match: match[0],
        });
      }
    }
  }

  return vulnerabilities;
}

/**
 * Create a fix task from a vulnerability
 *
 * @param vulnerability - The detected vulnerability
 * @returns A fix task for the review system
 */
function createFixTask(vulnerability: Vulnerability): FixTask {
  return {
    type: "security_fix",
    file: vulnerability.file,
    line: vulnerability.line,
    description: `Fix ${vulnerability.type.replace(/_/g, " ")} at line ${vulnerability.line}: ${vulnerability.message}`,
    priority: "critical",
  };
}

/**
 * Generate human-readable summary
 *
 * @param vulnerabilities - Detected vulnerabilities
 * @param scannedFiles - Number of files scanned
 * @returns Human-readable summary string
 */
function generateSummary(
  vulnerabilities: Vulnerability[],
  scannedFiles: number
): string {
  if (vulnerabilities.length === 0) {
    return `${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned, no security issues found`;
  }

  const bySeverity: Record<VulnerabilitySeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const vuln of vulnerabilities) {
    bySeverity[vuln.severity]++;
  }

  const parts: string[] = [];
  parts.push(`${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned`);

  const issueParts: string[] = [];
  if (bySeverity.critical > 0) issueParts.push(`${bySeverity.critical} critical`);
  if (bySeverity.high > 0) issueParts.push(`${bySeverity.high} high`);
  if (bySeverity.medium > 0) issueParts.push(`${bySeverity.medium} medium`);
  if (bySeverity.low > 0) issueParts.push(`${bySeverity.low} low`);
  if (bySeverity.info > 0) issueParts.push(`${bySeverity.info} info`);

  if (issueParts.length > 0) {
    parts.push(issueParts.join(", "));
  }

  return parts.join(", ");
}

/**
 * Run the security micro-task
 *
 * Retrieves changed files from git diff, scans them for security issues,
 * and generates fix tasks for critical/high vulnerabilities.
 *
 * @param options - Options including working directory and custom file reader
 * @returns SecurityResult with success status, vulnerabilities, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runSecurity({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`${result.vulnerabilities?.length} vulnerabilities found`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runSecurity(
  options: SecurityOptions = {}
): Promise<SecurityResult> {
  const cwd = options.cwd || process.cwd();
  const command = "git diff --name-only HEAD~1";
  const startTime = Date.now();

  try {
    // Get list of changed files
    const proc = Bun.spawn(["git", "diff", "--name-only", "HEAD~1"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    const stdout = await proc.stdout.text();
    // stderr is captured but not used since git diff errors are rare
    await proc.stderr.text();

    // Parse changed files
    const changedFiles = stdout
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && shouldScanFile(f));

    const duration = Date.now() - startTime;

    // If no code files changed, return success
    if (changedFiles.length === 0) {
      return {
        taskType: "security",
        success: true,
        errorCount: 0,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        scannedFiles: 0,
        vulnerabilities: [],
        summary: "0 files scanned, no code files in diff",
      };
    }

    // Scan each file for vulnerabilities
    const allVulnerabilities: Vulnerability[] = [];

    for (const filePath of changedFiles) {
      try {
        let content: string;
        if (options.readFile) {
          content = await options.readFile(filePath);
        } else {
          const file = Bun.file(`${cwd}/${filePath}`);
          content = await file.text();
        }

        const vulnerabilities = scanFileForVulnerabilities(content, filePath);
        allVulnerabilities.push(...vulnerabilities);
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    // Generate fix tasks for critical/high vulnerabilities
    const criticalOrHigh = allVulnerabilities.filter(
      (v) => v.severity === "critical" || v.severity === "high"
    );
    const fixTasks = criticalOrHigh.map(createFixTask);

    // Count issues by severity for error/warning counts
    const errorCount = criticalOrHigh.length;
    const warningCount = allVulnerabilities.length - criticalOrHigh.length;

    // Success if no critical/high issues
    const success = errorCount === 0;

    return {
      taskType: "security",
      success,
      errorCount,
      warningCount,
      fixTasks,
      duration: Date.now() - startTime,
      command,
      scannedFiles: changedFiles.length,
      vulnerabilities: allVulnerabilities,
      summary: generateSummary(allVulnerabilities, changedFiles.length),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      taskType: "security",
      success: false,
      errorCount: 1,
      warningCount: 0,
      fixTasks: [],
      duration,
      command,
      scannedFiles: 0,
      vulnerabilities: [],
      error: `Security scan failed: ${errorMessage}`,
    };
  }
}
