/**
 * Review Module
 *
 * Exports the review runner framework and all related types.
 *
 * @module src/review
 */

// Export runner and types
export {
  runReview,
  ReviewSummarySchema,
  ReviewTaskResultSchema,
  FixTaskSchema,
  ReviewOptionsSchema,
  type ReviewSummary,
  type ReviewTaskResult,
  type FixTask,
  type ReviewOptions,
  type MicroTaskHandler,
} from "./runner";

// Export types module types
export {
  FixTaskPrioritySchema,
  FixTaskTypeSchema,
  type FixTaskPriority,
  type FixTaskType,
  type MicroTaskHandlerRegistry,
} from "./types";

// Export micro-task implementations
export {
  runTypecheck,
  parseTypecheckOutput,
  stripAnsiCodes,
  groupErrorsByFile,
  type TypecheckError,
  type TypecheckResult,
  type TypecheckOptions,
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
  runTest,
  parseTestOutput,
  parseFallbackTestOutput,
  type TestFailure,
  type TestResult,
  type TestOptions,
  type TestParseResult,
  runSecurity,
  scanFileForVulnerabilities,
  type Vulnerability,
  type SecurityResult,
  type SecurityOptions,
  type VulnerabilityType,
  type VulnerabilitySeverity,
  type OwaspCategory,
  runQuality,
  analyzeComplexity,
  detectUnusedExports,
  detectDuplication,
  type QualityIssue,
  type QualityResult,
  type QualityOptions,
  type QualityIssueType,
  runDocs,
  detectMissingJSDoc,
  detectNewExportsWithoutReadme,
  detectNewCliCommandsWithoutReadme,
  type DocsIssue,
  type DocsResult,
  type DocsOptions,
  type DocsIssueType,
} from "./tasks";
