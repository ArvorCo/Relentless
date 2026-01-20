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

// Test micro-task
export {
  runTest,
  parseTestOutput,
  parseFallbackTestOutput,
  type TestFailure,
  type TestResult,
  type TestOptions,
  type TestParseResult,
} from "./test";

// Security micro-task
export {
  runSecurity,
  scanFileForVulnerabilities,
  type Vulnerability,
  type SecurityResult,
  type SecurityOptions,
  type VulnerabilityType,
  type VulnerabilitySeverity,
  type OwaspCategory,
} from "./security";

// Quality micro-task
export {
  runQuality,
  analyzeComplexity,
  detectUnusedExports,
  detectDuplication,
  type QualityIssue,
  type QualityResult,
  type QualityOptions,
  type QualityIssueType,
} from "./quality";

// Docs micro-task
export {
  runDocs,
  detectMissingJSDoc,
  detectNewExportsWithoutReadme,
  detectNewCliCommandsWithoutReadme,
  type DocsIssue,
  type DocsResult,
  type DocsOptions,
  type DocsIssueType,
} from "./docs";
