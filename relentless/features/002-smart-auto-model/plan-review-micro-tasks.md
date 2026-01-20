# Review Micro-Tasks System Design

## Overview

This document details the design for breaking final review into small, independent micro-tasks that prevent context compaction during final reviews. Each micro-task runs in a fresh harness session, reports findings, and queues fix tasks before proceeding.

**Related Spec**: User Story 7 and 7a in `spec.md`

---

## Problem Statement

Long review sessions cause harness context compaction (context window bloat), which leads to:
1. Lost important details from earlier in the review
2. Inconsistent fix quality as context degrades
3. Incomplete issue detection when context truncates

**Solution**: Break final review into atomic micro-tasks, each running in isolation with fresh context.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Review Micro-Tasks System                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐     ┌──────────────────┐     ┌───────────────┐ │
│  │  User Prompt   │────▶│  Review Runner   │────▶│  Fix Queue    │ │
│  │  (Run review?) │     │  (Orchestrates)  │     │  (Prioritized)│ │
│  └────────────────┘     └────────┬─────────┘     └───────────────┘ │
│                                  │                                  │
│         ┌────────────────────────┼────────────────────────┐        │
│         │                        │                        │        │
│         ▼                        ▼                        ▼        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│  │  Typecheck  │   │    Lint     │   │  Test / Security / etc  │  │
│  │  Micro-Task │   │  Micro-Task │   │      Micro-Tasks        │  │
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘  │
│         │                 │                      │                 │
│         ▼                 ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Output Parser                             │  │
│  │  - Extracts errors/warnings from command output              │  │
│  │  - Creates structured fix tasks                               │  │
│  │  - Queues tasks for execution                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Review Micro-Task Definitions

### 1.1 Micro-Task Interface

```typescript
// src/review/types.ts

import { z } from "zod";

/**
 * Review micro-task category
 */
export const ReviewCategorySchema = z.enum([
  "typecheck",
  "lint",
  "test",
  "security",
  "quality",
  "docs"
]);
export type ReviewCategory = z.infer<typeof ReviewCategorySchema>;

/**
 * Severity level for issues found
 */
export const IssueSeveritySchema = z.enum([
  "error",    // Must fix before completion
  "warning",  // Should fix, may proceed
  "info"      // Optional improvement
]);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

/**
 * A single issue found during review
 */
export const ReviewIssueSchema = z.object({
  /** Unique issue ID */
  id: z.string(),
  /** Category of the issue */
  category: ReviewCategorySchema,
  /** Severity level */
  severity: IssueSeveritySchema,
  /** File path (if applicable) */
  filePath: z.string().optional(),
  /** Line number (if applicable) */
  line: z.number().int().positive().optional(),
  /** Column number (if applicable) */
  column: z.number().int().positive().optional(),
  /** Issue message */
  message: z.string(),
  /** Rule or check that flagged this */
  rule: z.string().optional(),
  /** Suggested fix (if available) */
  suggestedFix: z.string().optional(),
  /** Raw output from the tool */
  rawOutput: z.string().optional(),
});
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

/**
 * Result of a single micro-task execution
 */
export const MicroTaskResultSchema = z.object({
  /** Which micro-task ran */
  category: ReviewCategorySchema,
  /** Whether the task passed (no issues) */
  passed: boolean,
  /** Issues found (empty if passed) */
  issues: z.array(ReviewIssueSchema),
  /** Duration in milliseconds */
  duration: z.number(),
  /** Command that was run */
  command: z.string(),
  /** Exit code from the command */
  exitCode: z.number(),
  /** Raw stdout */
  stdout: z.string().optional(),
  /** Raw stderr */
  stderr: z.string().optional(),
});
export type MicroTaskResult = z.infer<typeof MicroTaskResultSchema>;

/**
 * A fix task to be queued
 */
export const FixTaskSchema = z.object({
  /** Unique task ID */
  id: z.string(),
  /** Priority (lower = higher priority) */
  priority: z.number().int().nonnegative(),
  /** Category that generated this fix */
  sourceCategory: ReviewCategorySchema,
  /** Issue being fixed */
  issue: ReviewIssueSchema,
  /** Description of what needs to be done */
  description: z.string(),
  /** Status */
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  /** Timestamp when created */
  createdAt: z.string().datetime(),
  /** Timestamp when completed */
  completedAt: z.string().datetime().optional(),
});
export type FixTask = z.infer<typeof FixTaskSchema>;

/**
 * Micro-task definition
 */
export interface MicroTaskDefinition {
  /** Unique identifier */
  id: ReviewCategory;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Command to run */
  command: string;
  /** Function to parse output and extract issues */
  parseOutput: (stdout: string, stderr: string, exitCode: number) => ReviewIssue[];
  /** Priority for fix tasks (lower = higher priority) */
  fixPriority: number;
  /** Whether this task blocks completion if issues found */
  blocking: boolean;
}
```

### 1.2 Micro-Task Implementations

```typescript
// src/review/tasks/index.ts

import type { MicroTaskDefinition, ReviewIssue } from "../types";
import { parseTypecheckOutput } from "./typecheck";
import { parseLintOutput } from "./lint";
import { parseTestOutput } from "./test";
import { parseSecurityOutput } from "./security";
import { parseQualityOutput } from "./quality";
import { parseDocsOutput } from "./docs";

/**
 * All micro-task definitions in execution order
 */
export const MICRO_TASKS: MicroTaskDefinition[] = [
  {
    id: "typecheck",
    name: "Type Check",
    description: "Run TypeScript type checking",
    command: "bun run typecheck",
    parseOutput: parseTypecheckOutput,
    fixPriority: 1, // Highest priority - code won't work
    blocking: true,
  },
  {
    id: "lint",
    name: "Lint",
    description: "Run ESLint and code style checks",
    command: "bun run lint",
    parseOutput: parseLintOutput,
    fixPriority: 2, // High priority - code quality
    blocking: true, // 0-lint policy from CLAUDE.md
  },
  {
    id: "test",
    name: "Tests",
    description: "Run test suite",
    command: "bun test",
    parseOutput: parseTestOutput,
    fixPriority: 3, // Must pass before completion
    blocking: true,
  },
  {
    id: "security",
    name: "Security Scan",
    description: "Check for OWASP top 10 vulnerabilities",
    command: "bun run security:scan", // Custom script
    parseOutput: parseSecurityOutput,
    fixPriority: 4, // Critical but may have false positives
    blocking: true,
  },
  {
    id: "quality",
    name: "Code Quality",
    description: "Check dead code, duplications, complexity",
    command: "bun run quality:check", // Custom script
    parseOutput: parseQualityOutput,
    fixPriority: 5, // Important but not blocking
    blocking: false,
  },
  {
    id: "docs",
    name: "Documentation",
    description: "Verify README/docs are updated",
    command: "bun run docs:check", // Custom script
    parseOutput: parseDocsOutput,
    fixPriority: 6, // Lowest priority
    blocking: false,
  },
];

/**
 * Get micro-tasks by category
 */
export function getMicroTask(category: ReviewCategory): MicroTaskDefinition | undefined {
  return MICRO_TASKS.find(t => t.id === category);
}

/**
 * Get blocking micro-tasks only
 */
export function getBlockingMicroTasks(): MicroTaskDefinition[] {
  return MICRO_TASKS.filter(t => t.blocking);
}
```

### 1.3 Output Parsers

```typescript
// src/review/tasks/typecheck.ts

import type { ReviewIssue } from "../types";

/**
 * Parse TypeScript type check output
 *
 * Format: path/to/file.ts(line,col): error TS2345: Message
 */
export function parseTypecheckOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): ReviewIssue[] {
  if (exitCode === 0) return [];

  const issues: ReviewIssue[] = [];
  const combined = stdout + "\n" + stderr;

  // Match TypeScript error format
  const errorRegex = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
  let match;

  while ((match = errorRegex.exec(combined)) !== null) {
    issues.push({
      id: `typecheck-${issues.length + 1}`,
      category: "typecheck",
      severity: "error",
      filePath: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      message: match[5],
      rule: match[4],
      rawOutput: match[0],
    });
  }

  return issues;
}
```

```typescript
// src/review/tasks/lint.ts

import type { ReviewIssue, IssueSeverity } from "../types";

/**
 * Parse ESLint output (default format)
 *
 * Format varies but typically:
 * /path/to/file.ts
 *   line:col  severity  message  rule-name
 */
export function parseLintOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): ReviewIssue[] {
  if (exitCode === 0) return [];

  const issues: ReviewIssue[] = [];
  const lines = stdout.split("\n");
  let currentFile = "";

  for (const line of lines) {
    // Detect file path line (starts with /)
    if (line.startsWith("/") && !line.includes(" ")) {
      currentFile = line.trim();
      continue;
    }

    // Match ESLint output line
    const match = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/);
    if (match && currentFile) {
      const severity: IssueSeverity = match[3] === "error" ? "error" : "warning";

      issues.push({
        id: `lint-${issues.length + 1}`,
        category: "lint",
        severity,
        filePath: currentFile,
        line: parseInt(match[1], 10),
        column: parseInt(match[2], 10),
        message: match[4],
        rule: match[5],
        rawOutput: line,
      });
    }
  }

  return issues;
}
```

```typescript
// src/review/tasks/test.ts

import type { ReviewIssue } from "../types";

/**
 * Parse Bun test output
 *
 * Looks for FAIL markers and stack traces
 */
export function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): ReviewIssue[] {
  if (exitCode === 0) return [];

  const issues: ReviewIssue[] = [];
  const combined = stdout + "\n" + stderr;

  // Match test failure patterns
  // Bun format: FAIL path/to/test.ts > test name
  const failRegex = /FAIL\s+(.+?)\s+>\s+(.+)/g;
  let match;

  while ((match = failRegex.exec(combined)) !== null) {
    issues.push({
      id: `test-${issues.length + 1}`,
      category: "test",
      severity: "error",
      filePath: match[1],
      message: `Test failed: ${match[2]}`,
      rawOutput: match[0],
    });
  }

  // Also look for assertion errors
  const assertRegex = /AssertionError:\s*(.+)/g;
  while ((match = assertRegex.exec(combined)) !== null) {
    if (!issues.some(i => i.rawOutput?.includes(match[1]))) {
      issues.push({
        id: `test-assert-${issues.length + 1}`,
        category: "test",
        severity: "error",
        message: `Assertion failed: ${match[1]}`,
        rawOutput: match[0],
      });
    }
  }

  return issues;
}
```

```typescript
// src/review/tasks/security.ts

import type { ReviewIssue, IssueSeverity } from "../types";

/**
 * Security vulnerability categories (OWASP Top 10 2021)
 */
const OWASP_CATEGORIES = [
  "A01:2021-Broken Access Control",
  "A02:2021-Cryptographic Failures",
  "A03:2021-Injection",
  "A04:2021-Insecure Design",
  "A05:2021-Security Misconfiguration",
  "A06:2021-Vulnerable Components",
  "A07:2021-Auth Failures",
  "A08:2021-Software Integrity Failures",
  "A09:2021-Security Logging Failures",
  "A10:2021-SSRF",
];

/**
 * Security patterns to detect
 */
const SECURITY_PATTERNS = [
  // A03: Injection
  { pattern: /eval\s*\(/, rule: "A03-no-eval", severity: "error" as IssueSeverity },
  { pattern: /new\s+Function\s*\(/, rule: "A03-no-function-constructor", severity: "error" as IssueSeverity },
  { pattern: /innerHTML\s*=/, rule: "A03-no-innerhtml", severity: "warning" as IssueSeverity },
  { pattern: /exec\s*\(\s*[`'"].*\$\{/, rule: "A03-command-injection", severity: "error" as IssueSeverity },

  // A02: Cryptographic Failures
  { pattern: /crypto\.createHash\s*\(\s*['"]md5['"]/, rule: "A02-weak-hash-md5", severity: "error" as IssueSeverity },
  { pattern: /crypto\.createHash\s*\(\s*['"]sha1['"]/, rule: "A02-weak-hash-sha1", severity: "warning" as IssueSeverity },
  { pattern: /password.*=.*['"][^'"]{0,7}['"]/, rule: "A02-hardcoded-password", severity: "error" as IssueSeverity },

  // A05: Security Misconfiguration
  { pattern: /dangerouslySetInnerHTML/, rule: "A05-dangerous-html", severity: "warning" as IssueSeverity },
  { pattern: /CORS.*\*/, rule: "A05-cors-wildcard", severity: "warning" as IssueSeverity },

  // A07: Authentication Failures
  { pattern: /jwt\.sign.*algorithm.*none/i, rule: "A07-jwt-none-algo", severity: "error" as IssueSeverity },
];

/**
 * Parse security scan output or run pattern-based scan
 */
export function parseSecurityOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): ReviewIssue[] {
  // If a security tool ran, parse its output
  // Otherwise, this is called with pattern scan results

  const issues: ReviewIssue[] = [];
  const combined = stdout + "\n" + stderr;

  // Parse structured security tool output if available
  // Format: SEVERITY | FILE:LINE | RULE | MESSAGE
  const toolRegex = /^(HIGH|MEDIUM|LOW)\s*\|\s*(.+?):(\d+)\s*\|\s*(\S+)\s*\|\s*(.+)$/gm;
  let match;

  while ((match = toolRegex.exec(combined)) !== null) {
    const severity: IssueSeverity =
      match[1] === "HIGH" ? "error" :
      match[1] === "MEDIUM" ? "warning" : "info";

    issues.push({
      id: `security-${issues.length + 1}`,
      category: "security",
      severity,
      filePath: match[2],
      line: parseInt(match[3], 10),
      rule: match[4],
      message: match[5],
      rawOutput: match[0],
    });
  }

  return issues;
}

/**
 * Run pattern-based security scan on file content
 */
export function scanFileForSecurityIssues(
  filePath: string,
  content: string
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = content.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const { pattern, rule, severity } of SECURITY_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({
          id: `security-pattern-${issues.length + 1}`,
          category: "security",
          severity,
          filePath,
          line: lineNum + 1,
          rule,
          message: `Potential security issue: ${rule}`,
          rawOutput: line.trim(),
        });
      }
    }
  }

  return issues;
}
```

---

## 2. Micro-Task Runner

### 2.1 Runner Interface

```typescript
// src/review/runner.ts

import type {
  MicroTaskDefinition,
  MicroTaskResult,
  FixTask,
  ReviewCategory,
  ReviewIssue,
} from "./types";
import type { AgentAdapter } from "../agents/types";
import type { RelentlessConfig } from "../config/schema";
import { MICRO_TASKS, getMicroTask } from "./tasks";

export interface ReviewRunnerOptions {
  /** Agent to use for fix tasks */
  agent: AgentAdapter;
  /** Working directory */
  workingDirectory: string;
  /** Feature directory */
  featureDirectory: string;
  /** Configuration */
  config: RelentlessConfig;
  /** Mode for cost/quality tradeoff */
  mode: "free" | "cheap" | "good" | "genius";
  /** Categories to run (empty = all) */
  categories?: ReviewCategory[];
  /** Skip non-blocking tasks */
  blockingOnly?: boolean;
}

export interface ReviewRunnerResult {
  /** All micro-task results */
  results: MicroTaskResult[];
  /** Whether all blocking checks passed */
  passed: boolean;
  /** Total issues found */
  totalIssues: number;
  /** Fix tasks generated */
  fixTasks: FixTask[];
  /** Total duration in milliseconds */
  duration: number;
}

/**
 * Review Runner - Orchestrates micro-task execution
 *
 * Each micro-task:
 * 1. Runs in a fresh harness session
 * 2. Captures and parses output
 * 3. Generates fix tasks for any issues
 * 4. Reports findings before proceeding
 */
export class ReviewRunner {
  private options: ReviewRunnerOptions;
  private results: MicroTaskResult[] = [];
  private fixTasks: FixTask[] = [];
  private fixTaskIdCounter = 0;

  constructor(options: ReviewRunnerOptions) {
    this.options = options;
  }

  /**
   * Run all micro-tasks in sequence
   */
  async run(): Promise<ReviewRunnerResult> {
    const startTime = Date.now();

    // Determine which tasks to run
    let tasksToRun = MICRO_TASKS;

    if (this.options.categories?.length) {
      tasksToRun = tasksToRun.filter(t =>
        this.options.categories!.includes(t.id)
      );
    }

    if (this.options.blockingOnly) {
      tasksToRun = tasksToRun.filter(t => t.blocking);
    }

    // Run each micro-task
    for (const task of tasksToRun) {
      console.log(`\n  Running ${task.name}...`);

      const result = await this.runMicroTask(task);
      this.results.push(result);

      // Report findings immediately
      this.reportResult(result);

      // Queue fix tasks if issues found
      if (result.issues.length > 0) {
        await this.queueFixTasks(result.issues, task);
      }

      // If blocking task failed and we're in strict mode, stop
      if (task.blocking && !result.passed && this.options.mode === "genius") {
        console.log(`\n  Stopping review: blocking task ${task.name} failed`);
        break;
      }
    }

    const duration = Date.now() - startTime;
    const totalIssues = this.results.reduce(
      (sum, r) => sum + r.issues.length, 0
    );
    const blockingPassed = this.results
      .filter(r => getMicroTask(r.category)?.blocking)
      .every(r => r.passed);

    return {
      results: this.results,
      passed: blockingPassed,
      totalIssues,
      fixTasks: this.fixTasks,
      duration,
    };
  }

  /**
   * Run a single micro-task
   */
  private async runMicroTask(task: MicroTaskDefinition): Promise<MicroTaskResult> {
    const startTime = Date.now();

    // Execute command
    const proc = Bun.spawn(task.command.split(" "), {
      cwd: this.options.workingDirectory,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    const duration = Date.now() - startTime;

    // Parse output for issues
    const issues = task.parseOutput(stdout, stderr, exitCode);

    return {
      category: task.id,
      passed: issues.length === 0,
      issues,
      duration,
      command: task.command,
      exitCode,
      stdout,
      stderr,
    };
  }

  /**
   * Report micro-task result to console
   */
  private reportResult(result: MicroTaskResult): void {
    if (result.passed) {
      console.log(`    ✓ ${result.category}: passed (${result.duration}ms)`);
      return;
    }

    const errors = result.issues.filter(i => i.severity === "error").length;
    const warnings = result.issues.filter(i => i.severity === "warning").length;

    console.log(`    ✗ ${result.category}: ${errors} errors, ${warnings} warnings`);

    // Show first few issues
    for (const issue of result.issues.slice(0, 5)) {
      const loc = issue.filePath
        ? `${issue.filePath}:${issue.line || "?"}`
        : "";
      console.log(`      - ${loc} ${issue.message}`);
    }

    if (result.issues.length > 5) {
      console.log(`      ... and ${result.issues.length - 5} more`);
    }
  }

  /**
   * Queue fix tasks for issues
   */
  private async queueFixTasks(
    issues: ReviewIssue[],
    task: MicroTaskDefinition
  ): Promise<void> {
    for (const issue of issues) {
      const fixTask: FixTask = {
        id: `FIX-${++this.fixTaskIdCounter}`,
        priority: task.fixPriority,
        sourceCategory: task.id,
        issue,
        description: this.generateFixDescription(issue),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      this.fixTasks.push(fixTask);
    }

    // Sort by priority
    this.fixTasks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate human-readable fix description
   */
  private generateFixDescription(issue: ReviewIssue): string {
    const location = issue.filePath
      ? `in ${issue.filePath}${issue.line ? `:${issue.line}` : ""}`
      : "";

    return `Fix ${issue.category} ${issue.severity}: ${issue.message} ${location}`.trim();
  }
}
```

### 2.2 Fresh Harness Session for Fixes

```typescript
// src/review/fix-executor.ts

import type { FixTask } from "./types";
import type { AgentAdapter } from "../agents/types";

export interface FixExecutorOptions {
  /** Agent to use */
  agent: AgentAdapter;
  /** Working directory */
  workingDirectory: string;
  /** Feature directory */
  featureDirectory: string;
  /** Allow all permissions */
  dangerouslyAllowAll: boolean;
}

/**
 * Execute fix tasks in fresh harness sessions
 *
 * Each fix task runs in complete isolation to prevent context compaction.
 */
export class FixExecutor {
  private options: FixExecutorOptions;

  constructor(options: FixExecutorOptions) {
    this.options = options;
  }

  /**
   * Execute a single fix task
   */
  async executeFix(task: FixTask): Promise<boolean> {
    const prompt = this.buildFixPrompt(task);

    // Fresh harness session for each fix
    const result = await this.options.agent.invoke(prompt, {
      workingDirectory: this.options.workingDirectory,
      dangerouslyAllowAll: this.options.dangerouslyAllowAll,
    });

    // Check if fix was successful
    // Agent should run verification command and report
    const success = result.exitCode === 0 &&
      !result.output.includes("FAIL") &&
      !result.output.includes("error");

    return success;
  }

  /**
   * Build targeted fix prompt
   */
  private buildFixPrompt(task: FixTask): string {
    const { issue } = task;

    return `
# Fix Task: ${task.id}

## Issue Details
- **Category**: ${issue.category}
- **Severity**: ${issue.severity}
- **File**: ${issue.filePath || "N/A"}
- **Line**: ${issue.line || "N/A"}
- **Rule**: ${issue.rule || "N/A"}
- **Message**: ${issue.message}

${issue.rawOutput ? `## Raw Output\n\`\`\`\n${issue.rawOutput}\n\`\`\`` : ""}

${issue.suggestedFix ? `## Suggested Fix\n${issue.suggestedFix}` : ""}

## Instructions

1. Read the file containing the issue
2. Understand the context around line ${issue.line || "the error"}
3. Apply the minimal fix to resolve the issue
4. Run the verification command to confirm:
   \`\`\`bash
   bun run ${issue.category === "typecheck" ? "typecheck" : issue.category}
   \`\`\`
5. Commit the fix with message: "fix(${issue.category}): ${issue.message.slice(0, 50)}"

**Important**: Make only the minimal change needed. Do not refactor or modify unrelated code.
`.trim();
  }
}
```

---

## 3. User Prompting Flow

### 3.1 Review Prompt Interface

```typescript
// src/review/prompt.ts

import chalk from "chalk";

export interface ReviewPromptOptions {
  /** Default mode if user doesn't specify */
  defaultMode: "free" | "cheap" | "good" | "genius";
  /** Whether to show cost estimates */
  showCostEstimate: boolean;
  /** Allow skipping */
  allowSkip: boolean;
}

export interface ReviewPromptResult {
  /** Whether to run review */
  runReview: boolean;
  /** Selected mode */
  mode?: "free" | "cheap" | "good" | "genius";
  /** Reason if skipped */
  skipReason?: string;
}

/**
 * Prompt user about running final review
 */
export async function promptForReview(
  options: ReviewPromptOptions
): Promise<ReviewPromptResult> {
  console.log(chalk.bold.blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.bold.blue("  Final Review Phase"));
  console.log(chalk.bold.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  console.log("All stories have been completed. Ready for final quality review.");
  console.log("");

  if (options.showCostEstimate) {
    console.log(chalk.dim("Estimated review costs by mode:"));
    console.log(chalk.dim("  free   - $0.00 (pattern-based only)"));
    console.log(chalk.dim("  cheap  - $0.50 (Haiku + patterns)"));
    console.log(chalk.dim("  good   - $2.00 (Sonnet review)"));
    console.log(chalk.dim("  genius - $5.00 (Opus deep review)"));
    console.log("");
  }

  console.log("Review includes: typecheck, lint, test, security, quality, docs");
  console.log("");

  // Show prompt
  const prompt = options.allowSkip
    ? `Run final review? [Y/n] Mode? [${options.defaultMode}]: `
    : `Select review mode [${options.defaultMode}]: `;

  process.stdout.write(chalk.yellow(prompt));

  // Read user input
  const input = await readLine();
  const trimmed = input.trim().toLowerCase();

  // Parse response
  if (options.allowSkip && (trimmed === "n" || trimmed === "no")) {
    return {
      runReview: false,
      skipReason: "User declined review",
    };
  }

  // Parse mode from input
  const modeMatch = trimmed.match(/^(free|cheap|good|genius)$/);
  const mode = modeMatch
    ? modeMatch[1] as ReviewPromptResult["mode"]
    : options.defaultMode;

  return {
    runReview: true,
    mode,
  };
}

/**
 * Read a line from stdin
 */
async function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(false);
    stdin.resume();
    stdin.setEncoding("utf8");

    let data = "";
    const onData = (chunk: string) => {
      data += chunk;
      if (data.includes("\n")) {
        stdin.pause();
        stdin.removeListener("data", onData);
        resolve(data.split("\n")[0]);
      }
    };

    stdin.on("data", onData);
  });
}
```

### 3.2 Skip Review Handling

```typescript
// src/review/skip.ts

import chalk from "chalk";

/**
 * Handle --skip-review flag
 */
export function handleSkipReview(silent = false): void {
  if (!silent) {
    console.log(chalk.yellow("\n⚠️  Skipping final review (--skip-review flag)"));
    console.log(chalk.dim("  This may leave quality issues in the codebase."));
    console.log(chalk.dim("  Consider running 'relentless review' manually later."));
  }
}

/**
 * Log skip to progress.txt
 */
export async function logReviewSkipped(
  progressPath: string,
  reason: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = `
## Review Skipped - ${timestamp}

Final review was skipped.
Reason: ${reason}

**Warning**: Quality checks were not performed. Consider running manually:
\`\`\`bash
relentless review
\`\`\`

---
`;

  await Bun.write(progressPath, entry, { mode: "append" });
}
```

---

## 4. Fix Task Queue

### 4.1 Queue Manager

```typescript
// src/review/fix-queue.ts

import { join } from "node:path";
import type { FixTask, ReviewCategory } from "./types";

const FIX_QUEUE_FILE = ".fix-queue.json";

export interface FixQueueState {
  /** Pending fix tasks */
  pending: FixTask[];
  /** Completed fix tasks */
  completed: FixTask[];
  /** Skipped fix tasks */
  skipped: FixTask[];
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Fix Queue Manager
 *
 * Manages the queue of fix tasks generated by review micro-tasks.
 * Persists state to .fix-queue.json in the feature directory.
 */
export class FixQueueManager {
  private featurePath: string;
  private queuePath: string;
  private state: FixQueueState;

  constructor(featurePath: string) {
    this.featurePath = featurePath;
    this.queuePath = join(featurePath, FIX_QUEUE_FILE);
    this.state = {
      pending: [],
      completed: [],
      skipped: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Load queue state from disk
   */
  async load(): Promise<void> {
    const file = Bun.file(this.queuePath);
    if (await file.exists()) {
      this.state = await file.json();
    }
  }

  /**
   * Save queue state to disk
   */
  async save(): Promise<void> {
    this.state.updatedAt = new Date().toISOString();
    await Bun.write(this.queuePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Add fix tasks to queue
   */
  async addTasks(tasks: FixTask[]): Promise<void> {
    this.state.pending.push(...tasks);
    // Re-sort by priority
    this.state.pending.sort((a, b) => a.priority - b.priority);
    await this.save();
  }

  /**
   * Get next pending task
   */
  getNextTask(): FixTask | undefined {
    return this.state.pending[0];
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): FixTask[] {
    return [...this.state.pending];
  }

  /**
   * Get pending tasks by category
   */
  getTasksByCategory(category: ReviewCategory): FixTask[] {
    return this.state.pending.filter(t => t.sourceCategory === category);
  }

  /**
   * Mark task as in progress
   */
  async startTask(taskId: string): Promise<FixTask | undefined> {
    const task = this.state.pending.find(t => t.id === taskId);
    if (task) {
      task.status = "in_progress";
      await this.save();
    }
    return task;
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string): Promise<void> {
    const index = this.state.pending.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const task = this.state.pending.splice(index, 1)[0];
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      this.state.completed.push(task);
      await this.save();
    }
  }

  /**
   * Skip task
   */
  async skipTask(taskId: string, reason?: string): Promise<void> {
    const index = this.state.pending.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const task = this.state.pending.splice(index, 1)[0];
      task.status = "skipped";
      this.state.skipped.push(task);
      await this.save();
    }
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.state.pending.length === 0;
  }

  /**
   * Get summary statistics
   */
  getSummary(): { pending: number; completed: number; skipped: number } {
    return {
      pending: this.state.pending.length,
      completed: this.state.completed.length,
      skipped: this.state.skipped.length,
    };
  }

  /**
   * Clear all tasks
   */
  async clear(): Promise<void> {
    this.state = {
      pending: [],
      completed: [],
      skipped: [],
      updatedAt: new Date().toISOString(),
    };
    await this.save();
  }
}
```

### 4.2 Fix Priority Levels

```typescript
// src/review/priority.ts

/**
 * Fix task priority levels
 *
 * Lower number = higher priority (processed first)
 */
export const FIX_PRIORITIES = {
  /** Type errors - code won't compile */
  typecheck: 1,
  /** Lint errors - code quality issues */
  lint: 2,
  /** Test failures - functionality broken */
  test: 3,
  /** Security issues - vulnerabilities */
  security: 4,
  /** Quality issues - maintainability */
  quality: 5,
  /** Documentation - completeness */
  docs: 6,
} as const;

/**
 * Adjust priority based on severity
 *
 * Errors get priority boost, info items get deprioritized
 */
export function adjustPriorityBySeverity(
  basePriority: number,
  severity: "error" | "warning" | "info"
): number {
  switch (severity) {
    case "error":
      return basePriority; // No adjustment
    case "warning":
      return basePriority + 10; // Lower priority
    case "info":
      return basePriority + 20; // Much lower priority
  }
}
```

---

## 5. Integration with Runner

### 5.1 Updated Run Function

```typescript
// src/execution/runner.ts (additions)

import { ReviewRunner, type ReviewRunnerResult } from "../review/runner";
import { FixQueueManager } from "../review/fix-queue";
import { FixExecutor } from "../review/fix-executor";
import { promptForReview, handleSkipReview, logReviewSkipped } from "../review/prompt";

export interface RunOptions {
  // ... existing options ...

  /** Skip final review */
  skipReview?: boolean;
  /** Review mode override */
  reviewMode?: "free" | "cheap" | "good" | "genius";
}

/**
 * Run final review phase
 */
async function runFinalReview(
  options: RunOptions,
  agent: AgentAdapter,
  featureDir: string,
  progressPath: string
): Promise<ReviewRunnerResult | null> {
  // Check if review should be skipped
  if (options.skipReview) {
    handleSkipReview();
    await logReviewSkipped(progressPath, "CLI flag --skip-review");
    return null;
  }

  // Prompt user for review preferences
  const promptResult = await promptForReview({
    defaultMode: options.reviewMode ?? options.config.review?.defaultMode ?? "good",
    showCostEstimate: true,
    allowSkip: true,
  });

  if (!promptResult.runReview) {
    handleSkipReview(true);
    await logReviewSkipped(progressPath, promptResult.skipReason ?? "User declined");
    return null;
  }

  // Run review micro-tasks
  const reviewRunner = new ReviewRunner({
    agent,
    workingDirectory: options.workingDirectory,
    featureDirectory: featureDir,
    config: options.config,
    mode: promptResult.mode!,
  });

  console.log(chalk.cyan(`\n  Starting review in ${promptResult.mode} mode...\n`));

  const reviewResult = await reviewRunner.run();

  // Report summary
  reportReviewSummary(reviewResult);

  // If issues found, process fix queue
  if (reviewResult.fixTasks.length > 0) {
    await processFixQueue(
      reviewResult.fixTasks,
      options,
      agent,
      featureDir
    );
  }

  return reviewResult;
}

/**
 * Process fix task queue
 */
async function processFixQueue(
  fixTasks: FixTask[],
  options: RunOptions,
  agent: AgentAdapter,
  featureDir: string
): Promise<void> {
  const queue = new FixQueueManager(featureDir);
  await queue.load();
  await queue.addTasks(fixTasks);

  const executor = new FixExecutor({
    agent,
    workingDirectory: options.workingDirectory,
    featureDirectory: featureDir,
    dangerouslyAllowAll: options.config.agents[agent.name]?.dangerouslyAllowAll ?? true,
  });

  console.log(chalk.cyan(`\n  Processing ${fixTasks.length} fix tasks...\n`));

  while (!queue.isEmpty()) {
    const task = queue.getNextTask();
    if (!task) break;

    console.log(chalk.dim(`  Fixing: ${task.description}`));

    await queue.startTask(task.id);
    const success = await executor.executeFix(task);

    if (success) {
      await queue.completeTask(task.id);
      console.log(chalk.green(`    ✓ Fixed`));
    } else {
      console.log(chalk.yellow(`    ⚠ Fix attempt failed - may need manual intervention`));
      // Keep in queue for retry or manual fix
    }
  }

  // Show final summary
  const summary = queue.getSummary();
  console.log(chalk.dim(`\n  Fix summary: ${summary.completed} completed, ${summary.pending} pending, ${summary.skipped} skipped`));
}

/**
 * Report review summary
 */
function reportReviewSummary(result: ReviewRunnerResult): void {
  console.log(chalk.bold("\n  Review Summary"));
  console.log(chalk.bold("  ─────────────"));

  for (const taskResult of result.results) {
    const icon = taskResult.passed ? "✓" : "✗";
    const color = taskResult.passed ? chalk.green : chalk.red;
    console.log(color(`  ${icon} ${taskResult.category}: ${taskResult.issues.length} issues`));
  }

  console.log("");
  console.log(chalk.dim(`  Total: ${result.totalIssues} issues in ${(result.duration / 1000).toFixed(1)}s`));

  if (result.passed) {
    console.log(chalk.green.bold("\n  ✓ All blocking checks passed!"));
  } else {
    console.log(chalk.yellow.bold("\n  ⚠ Some blocking checks failed - fix tasks queued"));
  }
}
```

---

## 6. Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Final Review Execution Flow                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  All Stories    │
    │   Complete?     │
    └────────┬────────┘
             │ yes
             ▼
    ┌─────────────────┐
    │  --skip-review  │───────────────────────────────┐
    │     flag?       │                               │
    └────────┬────────┘                               │
             │ no                                     │
             ▼                                        │
    ┌─────────────────┐                               │
    │  Prompt User    │                               │
    │  "Run review?"  │                               │
    │  [Y/n] Mode?    │                               │
    └────────┬────────┘                               │
             │                                        │
    ┌────────┴────────┐                               │
    │ yes             │ no                            │
    ▼                 ▼                               │
┌───────────┐   ┌───────────┐                         │
│ Start     │   │ Log skip  │                         │
│ Review    │   │ + warn    │─────────────────────────┤
└─────┬─────┘   └───────────┘                         │
      │                                               │
      ▼                                               │
┌─────────────────────────────────────────────────┐   │
│         Micro-Task Loop (Sequential)             │   │
│                                                  │   │
│  ┌──────────────────────────────────────────┐   │   │
│  │  For each task in [typecheck, lint,      │   │   │
│  │  test, security, quality, docs]:         │   │   │
│  │                                          │   │   │
│  │  1. Run command in fresh session         │   │   │
│  │  2. Parse output for issues              │   │   │
│  │  3. Report findings immediately          │   │   │
│  │  4. Queue fix tasks if issues found      │   │   │
│  │  5. If blocking + failed + genius mode:  │   │   │
│  │     → Stop review loop                   │   │   │
│  │                                          │   │   │
│  └──────────────────────────────────────────┘   │   │
│                                                  │   │
└───────────────────────┬─────────────────────────┘   │
                        │                             │
                        ▼                             │
              ┌─────────────────┐                     │
              │  Fix Tasks      │                     │
              │  Queued?        │                     │
              └────────┬────────┘                     │
                       │                              │
              ┌────────┴────────┐                     │
              │ yes             │ no                  │
              ▼                 │                     │
    ┌─────────────────────┐     │                     │
    │   Fix Task Loop     │     │                     │
    │                     │     │                     │
    │  For each fix task: │     │                     │
    │  1. Fresh session   │     │                     │
    │  2. Apply fix       │     │                     │
    │  3. Verify          │     │                     │
    │  4. Mark complete   │     │                     │
    │     or retry        │     │                     │
    └──────────┬──────────┘     │                     │
               │                │                     │
               ▼                │                     │
    ┌─────────────────────┐     │                     │
    │  Re-run Failed      │     │                     │
    │  Micro-Tasks?       │     │                     │
    └──────────┬──────────┘     │                     │
               │                │                     │
    ┌──────────┴──────────┐     │                     │
    │ yes                 │ no  │                     │
    ▼                     │     │                     │
  [Loop back to           │     │                     │
   Micro-Task Loop]       │     │                     │
                          │     │                     │
                          ▼     ▼                     │
                    ┌───────────────┐                 │
                    │ Report Final  │                 │
                    │ Summary       │◄────────────────┘
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Feature      │
                    │  Complete     │
                    └───────────────┘
```

---

## 7. Configuration Schema Additions

```typescript
// src/config/schema.ts (additions)

/**
 * Review configuration
 */
export const ReviewConfigSchema = z.object({
  /** Prompt user before running review */
  promptUser: z.boolean().default(true),
  /** Default review mode */
  defaultMode: z.enum(["free", "cheap", "good", "genius"]).default("good"),
  /** Micro-tasks to run (empty = all) */
  microTasks: z.array(z.enum([
    "typecheck", "lint", "test", "security", "quality", "docs"
  ])).default([]),
  /** Skip non-blocking tasks in fast mode */
  blockingOnly: z.boolean().default(false),
  /** Max fix attempts per issue */
  maxFixAttempts: z.number().int().positive().default(3),
  /** Re-run failed micro-tasks after fixes */
  rerunAfterFix: z.boolean().default(true),
});

export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;

// Add to RelentlessConfigSchema:
// review: ReviewConfigSchema.default({}),
```

---

## 8. Task Breakdown for Implementation

### Phase 1: Core Types and Interfaces (2-3 hours)
- [ ] Create `src/review/types.ts` with all type definitions
- [ ] Add Zod schemas for validation
- [ ] Export types from `src/review/index.ts`

### Phase 2: Output Parsers (3-4 hours)
- [ ] Implement `parseTypecheckOutput` in `src/review/tasks/typecheck.ts`
- [ ] Implement `parseLintOutput` in `src/review/tasks/lint.ts`
- [ ] Implement `parseTestOutput` in `src/review/tasks/test.ts`
- [ ] Implement `parseSecurityOutput` in `src/review/tasks/security.ts`
- [ ] Implement `parseQualityOutput` in `src/review/tasks/quality.ts`
- [ ] Implement `parseDocsOutput` in `src/review/tasks/docs.ts`
- [ ] Write unit tests for each parser

### Phase 3: Micro-Task Runner (3-4 hours)
- [ ] Implement `ReviewRunner` class in `src/review/runner.ts`
- [ ] Add command execution logic
- [ ] Add output capture and parsing
- [ ] Add immediate reporting
- [ ] Write unit tests

### Phase 4: Fix Queue Manager (2-3 hours)
- [ ] Implement `FixQueueManager` in `src/review/fix-queue.ts`
- [ ] Add persistence to `.fix-queue.json`
- [ ] Add priority sorting
- [ ] Write unit tests

### Phase 5: Fix Executor (2-3 hours)
- [ ] Implement `FixExecutor` in `src/review/fix-executor.ts`
- [ ] Add prompt generation for fixes
- [ ] Add verification logic
- [ ] Write unit tests

### Phase 6: User Prompting (1-2 hours)
- [ ] Implement `promptForReview` in `src/review/prompt.ts`
- [ ] Implement `handleSkipReview`
- [ ] Add progress logging
- [ ] Write unit tests

### Phase 7: Integration (2-3 hours)
- [ ] Update `src/execution/runner.ts` with review phase
- [ ] Add CLI options (`--skip-review`, `--review-mode`)
- [ ] Update config schema
- [ ] Write integration tests

### Phase 8: Documentation (1-2 hours)
- [ ] Update README with review options
- [ ] Document configuration
- [ ] Add usage examples

**Total Estimated Time**: 16-24 hours

---

## 9. Test Plan

### Unit Tests

```typescript
// tests/review/parsers.test.ts

import { describe, it, expect } from "bun:test";
import { parseTypecheckOutput } from "../../src/review/tasks/typecheck";
import { parseLintOutput } from "../../src/review/tasks/lint";
import { parseTestOutput } from "../../src/review/tasks/test";

describe("parseTypecheckOutput", () => {
  it("returns empty array for exit code 0", () => {
    const issues = parseTypecheckOutput("", "", 0);
    expect(issues).toEqual([]);
  });

  it("parses TypeScript error format", () => {
    const stdout = "src/index.ts(10,5): error TS2345: Argument of type 'string' is not assignable";
    const issues = parseTypecheckOutput(stdout, "", 1);

    expect(issues).toHaveLength(1);
    expect(issues[0].filePath).toBe("src/index.ts");
    expect(issues[0].line).toBe(10);
    expect(issues[0].rule).toBe("TS2345");
  });
});

describe("parseLintOutput", () => {
  it("parses ESLint output format", () => {
    const stdout = `/path/to/file.ts
  10:5  error  Missing return type  @typescript-eslint/explicit-function-return-type`;

    const issues = parseLintOutput(stdout, "", 1);

    expect(issues).toHaveLength(1);
    expect(issues[0].filePath).toBe("/path/to/file.ts");
    expect(issues[0].line).toBe(10);
    expect(issues[0].severity).toBe("error");
  });
});

describe("parseTestOutput", () => {
  it("parses Bun test failure format", () => {
    const stdout = `FAIL tests/example.test.ts > should work`;

    const issues = parseTestOutput(stdout, "", 1);

    expect(issues).toHaveLength(1);
    expect(issues[0].filePath).toBe("tests/example.test.ts");
    expect(issues[0].category).toBe("test");
  });
});
```

### Integration Tests

```typescript
// tests/review/integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ReviewRunner } from "../../src/review/runner";
import { FixQueueManager } from "../../src/review/fix-queue";
import { createTempDir, cleanup } from "../helpers";

describe("ReviewRunner integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanup(tempDir);
  });

  it("runs all micro-tasks in sequence", async () => {
    // Setup test files with known issues
    // Run review
    // Verify all tasks executed
    // Verify issues were found
    // Verify fix tasks were queued
  });

  it("stops on blocking failure in genius mode", async () => {
    // Setup with typecheck error
    // Run in genius mode
    // Verify stopped after typecheck
  });
});
```

---

## 10. Future Enhancements

1. **Parallel Micro-Tasks**: Run non-dependent tasks in parallel (e.g., typecheck + lint)
2. **Custom Micro-Tasks**: Allow users to define custom review tasks
3. **AI-Assisted Security Scan**: Use LLM to analyze code for security issues
4. **Incremental Review**: Only review changed files
5. **Review Cache**: Skip unchanged files on re-review
6. **Review Reports**: Generate HTML/PDF reports of findings
7. **CI Integration**: Export results in JUnit/TAP format for CI systems
