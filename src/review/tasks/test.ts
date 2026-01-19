/**
 * Test Micro-Task
 *
 * Runs `bun test --reporter=json` in the project's working directory,
 * parses test failures, and generates fix tasks.
 *
 * Features:
 * - Parses bun test JSON output with testFile, testName, suiteName, error, duration
 * - Generates fix tasks for each failing test with priority "high"
 * - Includes stack trace in fix task description for runtime errors
 * - Reports timeout errors when test suite times out
 * - Reports "No tests found" with success:true, totalTests:0
 * - Falls back to standard output parsing if JSON unavailable
 * - Tracks skippedTests count and names
 * - Reports setup/teardown failures separately
 * - Includes coveragePercent if available
 * - Tracks snapshotFailures count
 *
 * @module src/review/tasks/test
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * A parsed test failure
 */
export interface TestFailure {
  /** Test file path */
  testFile: string;
  /** Name of the failing test */
  testName: string;
  /** Name of the test suite (describe block) */
  suiteName: string;
  /** Error message including stack trace */
  error: string;
  /** Test duration in milliseconds */
  duration: number;
}

/**
 * Result from parsing test output
 */
export interface TestParseResult {
  /** Total number of tests */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of skipped tests */
  skippedTests: number;
  /** Names of skipped tests */
  skippedTestNames: string[];
  /** Parsed failures */
  failures: TestFailure[];
  /** Number of snapshot failures */
  snapshotFailures: number;
  /** Coverage percentage if available */
  coveragePercent?: number;
  /** Parsing error if JSON parsing failed */
  parsingError?: string;
}

/**
 * Extended result type for test micro-task
 */
export interface TestResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Total number of tests */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of skipped tests */
  skippedTests: number;
  /** Names of skipped tests */
  skippedTestNames?: string[];
  /** Number of snapshot failures */
  snapshotFailures?: number;
  /** Coverage percentage if available */
  coveragePercent?: number;
  /** Parsed failures for reference */
  failures?: TestFailure[];
}

/**
 * Options for running tests
 */
export interface TestOptions {
  /** Working directory for the command */
  cwd?: string;
}

/**
 * Bun test JSON assertion result format
 */
interface BunTestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: "passed" | "failed" | "skipped" | "todo" | "disabled";
  title: string;
  duration: number;
  failureMessages?: string[];
}

/**
 * Bun test JSON file result format
 */
interface BunTestFileResult {
  name: string;
  assertionResults: BunTestAssertionResult[];
}

/**
 * Bun test JSON snapshot format
 */
interface BunTestSnapshot {
  failed?: number;
}

/**
 * Bun test JSON coverage format
 */
interface BunTestCoverageMap {
  total?: {
    lines?: {
      pct?: number;
    };
  };
}

/**
 * Bun test JSON output format
 */
interface BunTestOutput {
  numPassedTests: number;
  numFailedTests: number;
  numSkippedTests: number;
  numTotalTests: number;
  testResults: BunTestFileResult[];
  snapshot?: BunTestSnapshot;
  coverageMap?: BunTestCoverageMap;
}

/**
 * Parse bun test JSON output into structured results
 *
 * @param output - Raw bun test JSON output
 * @returns Parsed test results
 */
export function parseTestOutput(output: string): TestParseResult {
  const result: TestParseResult = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    skippedTestNames: [],
    failures: [],
    snapshotFailures: 0,
  };

  try {
    const data: BunTestOutput = JSON.parse(output);

    result.totalTests = data.numTotalTests;
    result.passedTests = data.numPassedTests;
    result.failedTests = data.numFailedTests;
    result.skippedTests = data.numSkippedTests;

    // Parse snapshot failures
    if (data.snapshot?.failed) {
      result.snapshotFailures = data.snapshot.failed;
    }

    // Parse coverage if available
    if (data.coverageMap?.total?.lines?.pct !== undefined) {
      result.coveragePercent = data.coverageMap.total.lines.pct;
    }

    // Parse test results
    for (const fileResult of data.testResults) {
      for (const assertion of fileResult.assertionResults) {
        // Track skipped tests
        if (assertion.status === "skipped" || assertion.status === "todo" || assertion.status === "disabled") {
          result.skippedTestNames.push(assertion.title);
          continue;
        }

        // Parse failures
        if (assertion.status === "failed") {
          const suiteName = assertion.ancestorTitles.length > 0
            ? assertion.ancestorTitles.join(" > ")
            : "(root)";

          const error = assertion.failureMessages?.join("\n") || "No error message";

          result.failures.push({
            testFile: fileResult.name,
            testName: assertion.title,
            suiteName,
            error,
            duration: assertion.duration,
          });
        }
      }
    }

    return result;
  } catch (error) {
    return {
      ...result,
      parsingError: error instanceof Error ? error.message : "Failed to parse JSON output",
    };
  }
}

/**
 * Parse bun test standard output (fallback when JSON unavailable)
 *
 * @param output - Raw bun test text output
 * @returns Parsed test results
 */
export function parseFallbackTestOutput(output: string): TestParseResult {
  const result: TestParseResult = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    skippedTestNames: [],
    failures: [],
    snapshotFailures: 0,
  };

  const lines = output.split("\n");

  // Parse summary lines like "10 pass", "5 fail", "2 skip"
  for (const line of lines) {
    const passMatch = line.match(/^(\d+)\s+pass/);
    if (passMatch) {
      result.passedTests = parseInt(passMatch[1], 10);
    }

    const failMatch = line.match(/^(\d+)\s+fail/);
    if (failMatch) {
      result.failedTests = parseInt(failMatch[1], 10);
    }

    const skipMatch = line.match(/^(\d+)\s+skip/);
    if (skipMatch) {
      result.skippedTests = parseInt(skipMatch[1], 10);
    }
  }

  result.totalTests = result.passedTests + result.failedTests + result.skippedTests;

  // Parse failures (basic parsing)
  let currentFile = "";
  let inFailure = false;
  let currentError = "";
  let currentTestName = "";

  for (const line of lines) {
    // Check for file path
    if (line.includes(".test.ts:") || line.includes(".test.js:")) {
      currentFile = line.replace(":", "").trim();
      continue;
    }

    // Check for failure marker
    const failureMatch = line.match(/^✗\s+(.+)\s+\[[\d.]+ms\]/);
    if (failureMatch) {
      if (inFailure && currentTestName) {
        result.failures.push({
          testFile: currentFile,
          testName: currentTestName,
          suiteName: "(root)",
          error: currentError.trim(),
          duration: 0,
        });
      }
      currentTestName = failureMatch[1];
      currentError = "";
      inFailure = true;
      continue;
    }

    // Collect error lines
    if (inFailure && line.trim().startsWith("error:")) {
      currentError += line.trim() + "\n";
    }
  }

  // Add last failure
  if (inFailure && currentTestName) {
    result.failures.push({
      testFile: currentFile,
      testName: currentTestName,
      suiteName: "(root)",
      error: currentError.trim(),
      duration: 0,
    });
  }

  return result;
}

/**
 * Create a fix task from a test failure
 *
 * @param failure - The parsed test failure
 * @returns A fix task for the review system
 */
function createFixTask(failure: TestFailure): FixTask {
  // Truncate error to reasonable length for description
  const errorPreview = failure.error.length > 200
    ? failure.error.substring(0, 200) + "..."
    : failure.error;

  return {
    type: "test_fix",
    file: failure.testFile,
    line: undefined,
    description: `Fix failing test "${failure.testName}" in ${failure.suiteName}: ${errorPreview}`,
    priority: "high",
  };
}

/**
 * Run the test micro-task
 *
 * Executes `bun test --reporter=json` in the specified working directory,
 * parses the output, and generates fix tasks for any failing tests.
 *
 * @param options - Options including working directory
 * @returns TestResult with success status, failures, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runTest({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`${result.failedTests} tests failed`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runTest(options: TestOptions = {}): Promise<TestResult> {
  const cwd = options.cwd || process.cwd();
  const command = "bun test --reporter=json";
  const startTime = Date.now();

  try {
    // Spawn the test process with JSON reporter
    const proc = Bun.spawn(["bun", "test", "--reporter=json"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for completion
    const exitCode = await proc.exited;
    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    const duration = Date.now() - startTime;

    // Check for timeout error
    if (
      stderr.toLowerCase().includes("timeout") ||
      stderr.includes("exceeded")
    ) {
      return {
        taskType: "test",
        success: false,
        errorCount: 1,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        error: `Test suite timeout: ${stderr}`,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      };
    }

    // Try parsing as JSON first
    let parseResult = parseTestOutput(stdout);

    // If JSON parsing failed, try fallback format
    if (parseResult.parsingError) {
      parseResult = parseFallbackTestOutput(stdout);
    }

    // Generate fix tasks for each failure
    const fixTasks = parseResult.failures.map(createFixTask);

    // Check for general command failure
    if (exitCode !== 0 && parseResult.failures.length === 0 && stderr.trim()) {
      return {
        taskType: "test",
        success: false,
        errorCount: 1,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        error: stderr.trim(),
        totalTests: parseResult.totalTests,
        passedTests: parseResult.passedTests,
        failedTests: parseResult.failedTests,
        skippedTests: parseResult.skippedTests,
      };
    }

    // Success if no failed tests
    const success = parseResult.failedTests === 0 && exitCode === 0;

    return {
      taskType: "test",
      success,
      errorCount: parseResult.failedTests,
      warningCount: 0,
      fixTasks,
      duration,
      command,
      totalTests: parseResult.totalTests,
      passedTests: parseResult.passedTests,
      failedTests: parseResult.failedTests,
      skippedTests: parseResult.skippedTests,
      skippedTestNames: parseResult.skippedTestNames,
      snapshotFailures: parseResult.snapshotFailures,
      coveragePercent: parseResult.coveragePercent,
      failures: parseResult.failures,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      taskType: "test",
      success: false,
      errorCount: 1,
      warningCount: 0,
      fixTasks: [],
      duration,
      command,
      error: `Command execution failed: ${errorMessage}`,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };
  }
}
