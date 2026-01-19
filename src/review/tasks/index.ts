/**
 * Review Micro-Tasks
 *
 * Individual task implementations for the review runner.
 * Each task runs in isolation and produces fix tasks.
 *
 * @module src/review/tasks
 */

// Typecheck micro-task
export {
  runTypecheck,
  parseTypecheckOutput,
  stripAnsiCodes,
  groupErrorsByFile,
  type TypecheckError,
  type TypecheckResult,
  type TypecheckOptions,
} from "./typecheck";

// Lint micro-task
export {
  runLint,
  parseLintOutput,
  parseFallbackLintOutput,
  groupIssuesByFile,
  type LintIssue,
  type LintResult,
  type LintOptions,
  type LintSummary,
  type LintParseResult,
  type LintSeverity,
} from "./lint";
