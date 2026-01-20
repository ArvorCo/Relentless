/**
 * Typecheck Micro-Task
 *
 * Runs `bun run typecheck` in the project's working directory,
 * parses TypeScript errors, and generates fix tasks.
 *
 * Features:
 * - Parses TypeScript compiler errors with file, line, column, code, message
 * - Groups errors by file for efficient fixing
 * - Generates fix tasks with priority "high"
 * - Strips ANSI color codes from output
 * - Tracks warnings separately (doesn't generate fix tasks)
 * - Provides summary for 100+ errors
 * - Reports tsconfig.json configuration errors
 *
 * @module src/review/tasks/typecheck
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * A parsed TypeScript error
 */
export interface TypecheckError {
  /** File path relative to project root */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based, optional) */
  column?: number;
  /** TypeScript error code (e.g., "TS2339") */
  code: string;
  /** Error message text */
  message: string;
}

/**
 * Extended result type for typecheck micro-task
 */
export interface TypecheckResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Warning count (not included in fix tasks) */
  warningCount?: number;
  /** Summary for paginated results (when 100+ errors) */
  summary?: string;
}

/**
 * Options for running typecheck
 */
export interface TypecheckOptions {
  /** Working directory for the command */
  cwd?: string;
}

/**
 * Strip ANSI color codes from a string
 *
 * @param str - Input string potentially containing ANSI codes
 * @returns Clean string without ANSI codes
 */
export function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Parse TypeScript compiler output into structured errors
 *
 * Handles multiple output formats:
 * - Standard tsc format: `file(line,col): error TSxxxx: message`
 * - Colon-separated format: `file:line:col - error TSxxxx: message`
 * - Bun typecheck format (arrow style)
 *
 * @param output - Raw compiler output (stdout)
 * @returns Array of parsed errors (excludes warnings)
 */
export function parseTypecheckOutput(output: string): TypecheckError[] {
  const cleanOutput = stripAnsiCodes(output);
  const errors: TypecheckError[] = [];

  // Split into lines and process each
  const lines = cleanOutput.split("\n");

  for (const line of lines) {
    // Skip warning lines
    if (line.includes("warning TS") || line.includes("warning:")) {
      continue;
    }

    // Pattern 1: Standard tsc format - file(line,col): error TSxxxx: message
    const stdMatch = line.match(
      /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/
    );
    if (stdMatch) {
      errors.push({
        file: stdMatch[1],
        line: parseInt(stdMatch[2], 10),
        column: parseInt(stdMatch[3], 10),
        code: stdMatch[4],
        message: stdMatch[5],
      });
      continue;
    }

    // Pattern 1b: Without column - file(line): error TSxxxx: message
    const noColMatch = line.match(
      /^(.+?)\((\d+)\):\s*error\s+(TS\d+):\s*(.+)$/
    );
    if (noColMatch) {
      errors.push({
        file: noColMatch[1],
        line: parseInt(noColMatch[2], 10),
        code: noColMatch[3],
        message: noColMatch[4],
      });
      continue;
    }

    // Pattern 2: Colon-separated format - file:line:col - error TSxxxx: message
    const colonMatch = line.match(
      /^(.+?):(\d+):(\d+)\s+-\s*error\s+(TS\d+):\s*(.+)$/
    );
    if (colonMatch) {
      errors.push({
        file: colonMatch[1],
        line: parseInt(colonMatch[2], 10),
        column: parseInt(colonMatch[3], 10),
        code: colonMatch[4],
        message: colonMatch[5],
      });
      continue;
    }
  }

  return errors;
}

/**
 * Parse warnings from TypeScript compiler output
 *
 * @param output - Raw compiler output
 * @returns Number of warnings found
 */
function parseWarningCount(output: string): number {
  const cleanOutput = stripAnsiCodes(output);
  const lines = cleanOutput.split("\n");
  let count = 0;

  for (const line of lines) {
    if (line.includes("warning TS") || line.includes("warning:")) {
      count++;
    }
  }

  return count;
}

/**
 * Group errors by file path
 *
 * @param errors - Array of parsed errors
 * @returns Record mapping file paths to their errors
 */
export function groupErrorsByFile(
  errors: TypecheckError[]
): Record<string, TypecheckError[]> {
  const grouped: Record<string, TypecheckError[]> = {};

  for (const error of errors) {
    if (!grouped[error.file]) {
      grouped[error.file] = [];
    }
    grouped[error.file].push(error);
  }

  return grouped;
}

/**
 * Create a fix task from a TypeScript error
 *
 * @param error - The parsed TypeScript error
 * @returns A fix task for the review system
 */
function createFixTask(error: TypecheckError): FixTask {
  const lineInfo = error.column
    ? `at line ${error.line}, column ${error.column}`
    : `at line ${error.line}`;

  return {
    type: "typecheck_fix",
    file: error.file,
    line: error.line,
    column: error.column,
    description: `Fix TypeScript error ${error.code} in ${error.file} ${lineInfo}: ${error.message}`,
    priority: "high",
    code: error.code,
  };
}

/**
 * Run the typecheck micro-task
 *
 * Executes `bun run typecheck` in the specified working directory,
 * parses the output, and generates fix tasks for any errors found.
 *
 * @param options - Options including working directory
 * @returns TypecheckResult with success status, errors, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runTypecheck({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`${result.errorCount} errors found`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runTypecheck(
  options: TypecheckOptions = {}
): Promise<TypecheckResult> {
  const cwd = options.cwd || process.cwd();
  const command = "bun run typecheck";
  const startTime = Date.now();

  try {
    // Spawn the typecheck process
    const proc = Bun.spawn(["bun", "run", "typecheck"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for completion
    const exitCode = await proc.exited;
    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    const duration = Date.now() - startTime;

    // Check for tsconfig.json errors
    if (
      stderr.includes("tsconfig.json") ||
      stderr.includes("Could not find") ||
      stderr.includes("Cannot find")
    ) {
      return {
        taskType: "typecheck",
        success: false,
        errorCount: 1,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        error: `Configuration error: ${stderr.includes("tsconfig") ? "tsconfig.json not found or invalid" : stderr}`,
      };
    }

    // Parse errors from output (check both stdout and stderr)
    const combinedOutput = stdout + "\n" + stderr;
    const errors = parseTypecheckOutput(combinedOutput);
    const warningCount = parseWarningCount(combinedOutput);

    // Generate fix tasks for each error
    const fixTasks = errors.map(createFixTask);

    // Create summary for large error counts
    let summary: string | undefined;
    if (errors.length >= 100) {
      const grouped = groupErrorsByFile(errors);
      const fileCount = Object.keys(grouped).length;
      summary = `Found ${errors.length} TypeScript errors across ${fileCount} files. Top files with errors: ${Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([file, errs]) => `${file} (${errs.length})`)
        .join(", ")}`;
    }

    // Check for general command failure (stderr has content but no parsed errors)
    if (exitCode !== 0 && errors.length === 0 && stderr.trim()) {
      return {
        taskType: "typecheck",
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
    const success = errors.length === 0 && exitCode === 0;

    return {
      taskType: "typecheck",
      success,
      errorCount: errors.length,
      warningCount,
      fixTasks,
      duration,
      command,
      summary,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      taskType: "typecheck",
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
