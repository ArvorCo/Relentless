/**
 * Docs Micro-Task
 *
 * Checks if README and JSDoc need updates based on changed files.
 *
 * Features:
 * - Retrieves changed files from git diff
 * - Detects new exports in index.ts without README update
 * - Detects new CLI commands in bin/ without README update
 * - Detects missing JSDoc on exported functions
 * - JSDoc issues are advisory (success: true)
 * - README issues block (success: false)
 * - Excludes functions with @internal tag
 * - Skips test files for JSDoc checks
 *
 * @module src/review/tasks/docs
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * Types of documentation issues
 */
export type DocsIssueType = "missing_readme_update" | "missing_jsdoc";

/**
 * A detected documentation issue
 */
export interface DocsIssue {
  /** Type of documentation issue */
  type: DocsIssueType;
  /** File path where found */
  file: string;
  /** Line number (1-based, optional) */
  line?: number;
  /** Description of the issue */
  message: string;
  /** Function name (for missing_jsdoc) */
  functionName?: string;
}

/**
 * Extended result type for docs micro-task
 */
export interface DocsResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Number of files scanned */
  scannedFiles: number;
  /** Detected documentation issues */
  issues?: DocsIssue[];
  /** Whether README needs update */
  readmeNeedsUpdate: boolean;
  /** Number of missing JSDoc issues */
  missingJSDocCount: number;
  /** Number of exported functions analyzed */
  exportedFunctionsCount: number;
  /** Human-readable summary */
  summary?: string;
}

/**
 * Options for running docs scan
 */
export interface DocsOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Custom file reader for testing */
  readFile?: (path: string) => Promise<string>;
}

/**
 * Code file extensions to scan for JSDoc
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
 * Check if a file should be scanned for JSDoc
 */
function shouldScanFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext)) && !isTestFile(path);
}

/**
 * Check if a file is an index file
 */
function isIndexFile(path: string): boolean {
  return path.endsWith("/index.ts") || path.endsWith("/index.js") || path === "index.ts" || path === "index.js";
}

/**
 * Check if a file is in the bin directory
 */
function isBinFile(path: string): boolean {
  return path.startsWith("bin/") || path.startsWith("./bin/");
}

/**
 * Check if a file is README.md
 */
function isReadmeFile(path: string): boolean {
  return path === "README.md" || path.endsWith("/README.md");
}

/**
 * Check if a file is a markdown file that doesn't require README update
 */
function isExemptMarkdownFile(path: string): boolean {
  const exemptFiles = ["CLAUDE.md", "AGENTS.md", "CHANGELOG.md", "LICENSE.md"];
  const fileName = path.split("/").pop() || "";
  return exemptFiles.includes(fileName);
}

/**
 * Pattern to match exported functions
 */
const EXPORTED_FUNCTION_PATTERNS = [
  // export function name()
  /export\s+function\s+(\w+)\s*\(/g,
  // export const name = () =>
  /export\s+const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/g,
  // export class Name
  /export\s+class\s+(\w+)/g,
];

/**
 * Pattern to match JSDoc comment
 */
const JSDOC_PATTERN = /\/\*\*[\s\S]*?\*\//g;

/**
 * Pattern to match @internal tag
 */
const INTERNAL_TAG_PATTERN = /@internal/;

/**
 * Detect missing JSDoc on exported functions
 *
 * @param content - File content to analyze
 * @param filePath - Path to the file (for context)
 * @returns Array of missing JSDoc issues
 */
export function detectMissingJSDoc(
  content: string,
  filePath: string
): DocsIssue[] {
  // Skip test files
  if (isTestFile(filePath)) {
    return [];
  }

  const issues: DocsIssue[] = [];

  // Find all JSDoc comments and their positions
  const jsdocComments: Array<{ start: number; end: number; content: string }> = [];
  JSDOC_PATTERN.lastIndex = 0;
  let match;
  while ((match = JSDOC_PATTERN.exec(content)) !== null) {
    const start = content.substring(0, match.index).split("\n").length;
    const commentLines = match[0].split("\n").length;
    jsdocComments.push({
      start,
      end: start + commentLines - 1,
      content: match[0],
    });
  }

  // Find all exported functions
  for (const pattern of EXPORTED_FUNCTION_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      const functionName = match[1];
      const matchPos = match.index;
      const lineNumber = content.substring(0, matchPos).split("\n").length;

      // Check if there's a JSDoc comment immediately before this line
      const hasJSDoc = jsdocComments.some((jsdoc) => {
        // JSDoc should end on the line before the function
        return jsdoc.end === lineNumber - 1 || jsdoc.end === lineNumber;
      });

      if (!hasJSDoc) {
        issues.push({
          type: "missing_jsdoc",
          file: filePath,
          line: lineNumber,
          message: `Missing JSDoc documentation for exported ${match[0].includes("class") ? "class" : "function"} '${functionName}'`,
          functionName,
        });
      } else {
        // Check if JSDoc has @internal tag
        const jsdoc = jsdocComments.find(
          (j) => j.end === lineNumber - 1 || j.end === lineNumber
        );
        if (jsdoc && INTERNAL_TAG_PATTERN.test(jsdoc.content)) {
          // Skip internal functions (remove from issues if added)
          const existingIndex = issues.findIndex(
            (i) => i.functionName === functionName && i.file === filePath
          );
          if (existingIndex !== -1) {
            issues.splice(existingIndex, 1);
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Detect new exports in index.ts without README update
 *
 * @param changedFiles - Array of changed file paths
 * @param readmeUpdated - Whether README.md was updated
 * @param fileContents - Map of file paths to their content
 * @returns Array of missing README update issues
 */
export function detectNewExportsWithoutReadme(
  changedFiles: string[],
  readmeUpdated: boolean,
  fileContents: Map<string, string>
): DocsIssue[] {
  if (readmeUpdated) {
    return [];
  }

  const issues: DocsIssue[] = [];
  const indexFiles = changedFiles.filter(isIndexFile);

  for (const indexFile of indexFiles) {
    const content = fileContents.get(indexFile);
    if (!content) continue;

    // Check if file has export statements
    const hasExports = /export\s+\{/.test(content) || /export\s+\w+/.test(content);
    if (hasExports) {
      issues.push({
        type: "missing_readme_update",
        file: indexFile,
        message: `New exports added to ${indexFile} but README.md not updated`,
      });
    }
  }

  return issues;
}

/**
 * Detect new CLI commands in bin/ without README update
 *
 * @param changedFiles - Array of changed file paths
 * @param readmeUpdated - Whether README.md was updated
 * @returns Array of missing README update issues
 */
export function detectNewCliCommandsWithoutReadme(
  changedFiles: string[],
  readmeUpdated: boolean
): DocsIssue[] {
  if (readmeUpdated) {
    return [];
  }

  const issues: DocsIssue[] = [];
  const binFiles = changedFiles.filter(isBinFile);

  for (const binFile of binFiles) {
    issues.push({
      type: "missing_readme_update",
      file: binFile,
      message: `New CLI command ${binFile} added but README.md not updated`,
    });
  }

  return issues;
}

/**
 * Count exported functions in content
 */
function countExportedFunctions(content: string): number {
  let count = 0;
  for (const pattern of EXPORTED_FUNCTION_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(new RegExp(pattern.source, "g"));
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  issues: DocsIssue[],
  scannedFiles: number,
  readmeNeedsUpdate: boolean
): string {
  const parts: string[] = [];
  parts.push(`${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned`);

  if (readmeNeedsUpdate) {
    parts.push("README needs update");
  }

  const jsdocIssues = issues.filter((i) => i.type === "missing_jsdoc").length;
  if (jsdocIssues > 0) {
    parts.push(`${jsdocIssues} missing JSDoc`);
  }

  if (issues.length === 0) {
    return `${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned, documentation up to date`;
  }

  return parts.join(", ");
}

/**
 * Create a fix task from a docs issue
 */
function createFixTask(issue: DocsIssue): FixTask {
  let description: string;

  switch (issue.type) {
    case "missing_readme_update":
      description = `Update README to document new ${issue.file.includes("bin/") ? "commands" : "exports"}`;
      break;
    case "missing_jsdoc":
      description = `Add JSDoc for ${issue.functionName}`;
      break;
    default:
      description = issue.message;
  }

  return {
    type: "docs_fix",
    file: issue.file,
    line: issue.line,
    description,
    priority: "low",
  };
}

/**
 * Run the docs micro-task
 *
 * Retrieves changed files from git diff, analyzes them for documentation issues,
 * and generates fix tasks for missing documentation.
 *
 * @param options - Options including working directory and custom file reader
 * @returns DocsResult with success status, issues, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runDocs({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`README needs update: ${result.readmeNeedsUpdate}`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runDocs(
  options: DocsOptions = {}
): Promise<DocsResult> {
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
      .filter((f) => f.length > 0);

    const duration = Date.now() - startTime;

    // If no files changed, return success
    if (changedFiles.length === 0) {
      return {
        taskType: "docs",
        success: true,
        errorCount: 0,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        scannedFiles: 0,
        issues: [],
        readmeNeedsUpdate: false,
        missingJSDocCount: 0,
        exportedFunctionsCount: 0,
        summary: "0 files scanned, no changed files",
      };
    }

    // Check if README was updated
    const readmeUpdated = changedFiles.some(isReadmeFile);

    // Filter out exempt markdown files for README checks
    const relevantChangedFiles = changedFiles.filter(
      (f) => !isExemptMarkdownFile(f)
    );

    // Read file contents for analysis
    const fileContents = new Map<string, string>();
    for (const filePath of changedFiles) {
      if (shouldScanFile(filePath) || isIndexFile(filePath)) {
        try {
          let content: string;
          if (options.readFile) {
            content = await options.readFile(filePath);
          } else {
            const file = Bun.file(`${cwd}/${filePath}`);
            content = await file.text();
          }
          fileContents.set(filePath, content);
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    }

    const allIssues: DocsIssue[] = [];
    let totalExportedFunctions = 0;

    // Check for JSDoc issues on code files
    for (const [filePath, content] of fileContents) {
      if (shouldScanFile(filePath)) {
        const jsdocIssues = detectMissingJSDoc(content, filePath);
        allIssues.push(...jsdocIssues);
        totalExportedFunctions += countExportedFunctions(content);
      }
    }

    // Check for README update issues
    const exportIssues = detectNewExportsWithoutReadme(
      relevantChangedFiles,
      readmeUpdated,
      fileContents
    );
    allIssues.push(...exportIssues);

    const cliIssues = detectNewCliCommandsWithoutReadme(
      relevantChangedFiles,
      readmeUpdated
    );
    allIssues.push(...cliIssues);

    // Count issues
    const missingJSDocCount = allIssues.filter(
      (i) => i.type === "missing_jsdoc"
    ).length;
    const readmeNeedsUpdate =
      exportIssues.length > 0 || cliIssues.length > 0;

    // Generate fix tasks for all issues
    const fixTasks = allIssues.map(createFixTask);

    // JSDoc issues are advisory (success: true), README issues block (success: false)
    const success = !readmeNeedsUpdate;

    // Code files scanned for JSDoc
    const scannedFiles = Array.from(fileContents.keys()).filter(shouldScanFile).length;

    return {
      taskType: "docs",
      success,
      errorCount: readmeNeedsUpdate ? 1 : 0,
      warningCount: missingJSDocCount,
      fixTasks,
      duration: Date.now() - startTime,
      command,
      scannedFiles,
      issues: allIssues,
      readmeNeedsUpdate,
      missingJSDocCount,
      exportedFunctionsCount: totalExportedFunctions,
      summary: generateSummary(allIssues, scannedFiles, readmeNeedsUpdate),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      taskType: "docs",
      success: false,
      errorCount: 1,
      warningCount: 0,
      fixTasks: [],
      duration,
      command,
      scannedFiles: 0,
      issues: [],
      readmeNeedsUpdate: false,
      missingJSDocCount: 0,
      exportedFunctionsCount: 0,
      error: `Docs scan failed: ${errorMessage}`,
    };
  }
}
