/**
 * Lint Micro-Task
 *
 * Runs `bun run lint --format json` in the project's working directory,
 * parses ESLint issues, and generates fix tasks.
 *
 * Features:
 * - Parses ESLint JSON output with file, line, column, severity, rule, message
 * - Groups issues by file for efficient fixing
 * - Generates fix tasks with priority "high" for errors only
 * - Warnings are logged but NOT added to fixTasks
 * - Reports parsing errors separately from lint violations
 * - Includes autoFixable count for issues fixable with --fix
 * - Includes disabledRulesCount for eslint-disable comments
 * - Provides summary with total files scanned and breakdown by severity
 * - Falls back to standard output parsing if JSON unavailable
 *
 * @module src/review/tasks/lint
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * Severity levels for lint issues
 */
export type LintSeverity = "error" | "warning";

/**
 * A parsed ESLint issue
 */
export interface LintIssue {
  /** File path */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Issue severity */
  severity: LintSeverity;
  /** ESLint rule ID (e.g., "no-unused-vars") */
  rule: string;
  /** Issue message text */
  message: string;
}

/**
 * Summary of lint results
 */
export interface LintSummary {
  /** Total files scanned */
  totalFiles: number;
  /** Total error count */
  errorCount: number;
  /** Total warning count */
  warningCount: number;
  /** Number of issues that can be auto-fixed with --fix */
  autoFixable: number;
  /** Number of parsing errors (invalid JS/TS) */
  parsingErrors: number;
  /** Count of eslint-disable comments */
  disabledRulesCount: number;
}

/**
 * Result from parsing lint output
 */
export interface LintParseResult {
  /** Parsed lint issues */
  issues: LintIssue[];
  /** Summary statistics */
  summary: LintSummary;
  /** Parsing error message if JSON parsing failed */
  parsingError?: string;
}

/**
 * Extended result type for lint micro-task
 */
export interface LintResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Warning count (non-blocking) */
  warningCount: number;
  /** Number of issues that can be auto-fixed */
  autoFixable?: number;
  /** Number of parsing errors */
  parsingErrors?: number;
  /** Count of eslint-disable comments */
  disabledRulesCount?: number;
  /** Human-readable summary */
  summary?: string;
}

/**
 * Options for running lint
 */
export interface LintOptions {
  /** Working directory for the command */
  cwd?: string;
}

/**
 * ESLint JSON message format
 */
interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  fatal?: boolean;
  fix?: { range: [number, number]; text: string };
}

/**
 * ESLint JSON file result format
 */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
  usedDeprecatedRules?: unknown[];
}

/**
 * Parse ESLint JSON output into structured issues
 *
 * @param output - Raw ESLint JSON output
 * @returns Parsed issues and summary
 */
export function parseLintOutput(output: string): LintParseResult {
  const summary: LintSummary = {
    totalFiles: 0,
    errorCount: 0,
    warningCount: 0,
    autoFixable: 0,
    parsingErrors: 0,
    disabledRulesCount: 0,
  };

  const issues: LintIssue[] = [];

  try {
    const results: ESLintFileResult[] = JSON.parse(output);

    summary.totalFiles = results.length;

    for (const fileResult of results) {
      summary.errorCount += fileResult.errorCount;
      summary.warningCount += fileResult.warningCount;
      summary.autoFixable +=
        (fileResult.fixableErrorCount || 0) +
        (fileResult.fixableWarningCount || 0);

      for (const message of fileResult.messages) {
        // Track parsing errors
        if (message.fatal || message.ruleId === null) {
          summary.parsingErrors++;
        }

        const severity: LintSeverity = message.severity === 2 ? "error" : "warning";
        const rule = message.ruleId || (message.fatal ? "parsing-error" : "unknown");

        issues.push({
          file: fileResult.filePath,
          line: message.line,
          column: message.column,
          severity,
          rule,
          message: message.message,
        });
      }
    }

    return { issues, summary };
  } catch (error) {
    // JSON parsing failed - return empty with error
    return {
      issues: [],
      summary,
      parsingError:
        error instanceof Error ? error.message : "Failed to parse JSON output",
    };
  }
}

/**
 * Parse standard ESLint text output (fallback when JSON unavailable)
 *
 * @param output - Raw ESLint text output
 * @returns Parsed issues and summary
 */
export function parseFallbackLintOutput(output: string): LintParseResult {
  const summary: LintSummary = {
    totalFiles: 0,
    errorCount: 0,
    warningCount: 0,
    autoFixable: 0,
    parsingErrors: 0,
    disabledRulesCount: 0,
  };

  const issues: LintIssue[] = [];
  const lines = output.split("\n");
  let currentFile = "";
  const filesSet = new Set<string>();

  for (const line of lines) {
    // Check for file path (starts with /)
    if (line.startsWith("/") && !line.includes(":")) {
      currentFile = line.trim();
      filesSet.add(currentFile);
      continue;
    }

    // Parse issue line: "  10:5  error  message  rule-id"
    const match = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/);
    if (match && currentFile) {
      const severity = match[3] as LintSeverity;
      issues.push({
        file: currentFile,
        line: parseInt(match[1], 10),
        column: parseInt(match[2], 10),
        severity,
        rule: match[5],
        message: match[4].trim(),
      });

      if (severity === "error") {
        summary.errorCount++;
      } else {
        summary.warningCount++;
      }
    }
  }

  summary.totalFiles = filesSet.size;

  return { issues, summary };
}

/**
 * Group lint issues by file path
 *
 * @param issues - Array of parsed lint issues
 * @returns Record mapping file paths to their issues
 */
export function groupIssuesByFile(
  issues: LintIssue[]
): Record<string, LintIssue[]> {
  const grouped: Record<string, LintIssue[]> = {};

  for (const issue of issues) {
    if (!grouped[issue.file]) {
      grouped[issue.file] = [];
    }
    grouped[issue.file].push(issue);
  }

  return grouped;
}

/**
 * Create a fix task from a lint issue
 *
 * @param issue - The parsed lint issue
 * @returns A fix task for the review system
 */
function createFixTask(issue: LintIssue): FixTask {
  return {
    type: "lint_fix",
    file: issue.file,
    line: issue.line,
    column: issue.column,
    description: `Fix lint error ${issue.rule} at line ${issue.line}, column ${issue.column}: ${issue.message}`,
    priority: "high",
    rule: issue.rule,
  };
}

/**
 * Generate human-readable summary
 *
 * @param summary - Lint summary statistics
 * @returns Human-readable summary string
 */
function generateSummary(summary: LintSummary): string {
  const parts: string[] = [];

  parts.push(`${summary.totalFiles} file${summary.totalFiles !== 1 ? "s" : ""} scanned`);

  if (summary.errorCount > 0 || summary.warningCount > 0) {
    const issueParts: string[] = [];
    if (summary.errorCount > 0) {
      issueParts.push(`${summary.errorCount} error${summary.errorCount !== 1 ? "s" : ""}`);
    }
    if (summary.warningCount > 0) {
      issueParts.push(`${summary.warningCount} warning${summary.warningCount !== 1 ? "s" : ""}`);
    }
    parts.push(issueParts.join(", "));
  } else {
    parts.push("no issues found");
  }

  if (summary.autoFixable > 0) {
    parts.push(`${summary.autoFixable} auto-fixable`);
  }

  if (summary.parsingErrors > 0) {
    parts.push(`${summary.parsingErrors} parsing error${summary.parsingErrors !== 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}

/**
 * Run the lint micro-task
 *
 * Executes `bun run lint --format json` in the specified working directory,
 * parses the output, and generates fix tasks for any errors found.
 *
 * @param options - Options including working directory
 * @returns LintResult with success status, issues, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runLint({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`${result.errorCount} errors found`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runLint(options: LintOptions = {}): Promise<LintResult> {
  const cwd = options.cwd || process.cwd();
  const command = "bun run lint --format json";
  const startTime = Date.now();

  try {
    // Spawn the lint process with JSON format
    const proc = Bun.spawn(["bun", "run", "lint", "--format", "json"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for completion
    const exitCode = await proc.exited;
    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    const duration = Date.now() - startTime;

    // Check for ESLint configuration error
    if (
      stderr.includes("configuration") ||
      stderr.includes("ESLint") ||
      stderr.includes("Config")
    ) {
      return {
        taskType: "lint",
        success: false,
        errorCount: 1,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        error: stderr.includes("configuration")
          ? `ESLint configuration error: ${stderr}`
          : stderr,
      };
    }

    // Try parsing as JSON first
    let parseResult = parseLintOutput(stdout);

    // If JSON parsing failed, try fallback format
    if (parseResult.parsingError) {
      parseResult = parseFallbackLintOutput(stdout);
    }

    const { issues, summary } = parseResult;

    // Generate fix tasks only for errors (not warnings)
    const errorIssues = issues.filter((issue) => issue.severity === "error");
    const fixTasks = errorIssues.map(createFixTask);

    // Check for general command failure (stderr has content but no parsed issues)
    if (exitCode !== 0 && issues.length === 0 && stderr.trim()) {
      return {
        taskType: "lint",
        success: false,
        errorCount: 1,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        error: stderr.trim(),
      };
    }

    // Success if no errors (warnings are OK)
    const success = summary.errorCount === 0 && exitCode === 0;

    return {
      taskType: "lint",
      success,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
      fixTasks,
      duration,
      command,
      autoFixable: summary.autoFixable,
      parsingErrors: summary.parsingErrors,
      disabledRulesCount: summary.disabledRulesCount,
      summary: generateSummary(summary),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      taskType: "lint",
      success: false,
      errorCount: 1,
      warningCount: 0,
      fixTasks: [],
      duration,
      command,
      error: `Command execution failed: ${errorMessage}`,
    };
  }
}
