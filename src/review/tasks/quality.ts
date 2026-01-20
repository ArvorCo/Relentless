/**
 * Quality Micro-Task
 *
 * Scans changed files for dead code, duplication, and complexity issues.
 *
 * Features:
 * - Retrieves changed files from git diff
 * - Detects unused exports (dead code)
 * - Detects code duplication (>20 similar tokens)
 * - Detects high function complexity (>10)
 * - Generates fix tasks for high-impact issues
 * - Duplication is advisory only (no fix tasks)
 * - Supports @relentless-ignore-quality comment
 *
 * @module src/review/tasks/quality
 */

import type { ReviewTaskResult, FixTask } from "../types";

/**
 * Types of quality issues
 */
export type QualityIssueType = "dead_code" | "duplication" | "high_complexity";

/**
 * A detected quality issue
 */
export interface QualityIssue {
  /** Type of quality issue */
  type: QualityIssueType;
  /** File path where found */
  file: string;
  /** Line number (1-based, optional) */
  line?: number;
  /** Description of the issue */
  message: string;
  /** Symbol name (for dead code) */
  symbol?: string;
  /** Function name (for complexity) */
  functionName?: string;
  /** Complexity score (for high_complexity) */
  score?: number;
  /** Similarity percentage (for duplication) */
  similarity?: number;
  /** Related files (for duplication) */
  files?: string[];
}

/**
 * Extended result type for quality micro-task
 */
export interface QualityResult extends ReviewTaskResult {
  /** The command that was executed */
  command: string;
  /** Number of files scanned */
  scannedFiles: number;
  /** Detected quality issues */
  issues?: QualityIssue[];
  /** Number of dead code issues */
  deadCodeCount: number;
  /** Number of duplication issues */
  duplications: number;
  /** Number of complexity issues */
  complexityIssues: number;
  /** Overall quality score (0-100) */
  overallQualityScore: number;
  /** Human-readable summary */
  summary?: string;
}

/**
 * Options for running quality scan
 */
export interface QualityOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Custom file reader for testing */
  readFile?: (path: string) => Promise<string>;
  /** Custom all files reader for testing (for dead code detection) */
  readAllFiles?: () => Promise<Map<string, string>>;
}

/**
 * Code file extensions to scan
 */
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

/**
 * Complexity decision points pattern
 * Matches: if, else if, while, for, case, catch, &&, ||, ?:
 */
const COMPLEXITY_PATTERNS = [
  /\bif\s*\(/g,
  /\belse\s+if\s*\(/g,
  /\bwhile\s*\(/g,
  /\bfor\s*\(/g,
  /\bcase\s+[^:]+:/g,
  /\bcatch\s*\(/g,
  /\?\s*[^:]+\s*:/g, // ternary
  /&&/g,
  /\|\|/g,
];

/**
 * Export patterns
 */
const EXPORT_PATTERNS = [
  { pattern: /export\s+function\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+const\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+let\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+var\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+class\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+type\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+interface\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+enum\s+(\w+)/g, isDefault: false },
  { pattern: /export\s+default\s+/g, isDefault: true },
];

/**
 * Ignore comment pattern
 */
const IGNORE_PATTERN = /@relentless-ignore-quality/;

/**
 * Check if a file should be scanned
 */
function shouldScanFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Check if file has ignore comment
 */
function hasIgnoreComment(content: string): boolean {
  return IGNORE_PATTERN.test(content);
}

/**
 * Calculate cyclomatic complexity for a function body
 */
function calculateComplexity(code: string): number {
  let complexity = 1; // Base complexity

  for (const pattern of COMPLEXITY_PATTERNS) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Extract function bodies from code
 */
function extractFunctions(
  code: string
): Array<{ name: string; body: string; line: number }> {
  const functions: Array<{ name: string; body: string; line: number }> = [];
  const lines = code.split("\n");

  // Simple function extraction - find function declarations and extract bodies
  let currentFunction: { name: string; startLine: number; braceCount: number } | null =
    null;
  let functionBody = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!currentFunction) {
      // Look for function start
      // Regular function
      const funcMatch = line.match(/function\s+(\w+)\s*\([^)]*\)\s*\{?/);
      if (funcMatch) {
        currentFunction = {
          name: funcMatch[1],
          startLine: i + 1,
          braceCount: (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length,
        };
        functionBody = line;
        if (currentFunction.braceCount === 0 && line.includes("{")) {
          // Single line function or starting
          currentFunction.braceCount = 1;
        }
        continue;
      }

      // Arrow function
      const arrowMatch = line.match(
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/
      );
      if (arrowMatch) {
        currentFunction = {
          name: arrowMatch[1],
          startLine: i + 1,
          braceCount: (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length,
        };
        functionBody = line;
        continue;
      }

      // Class method
      const methodMatch = line.match(/^\s*(\w+)\s*\([^)]*\)\s*\{/);
      if (methodMatch && !line.includes("function") && !line.includes("=>")) {
        currentFunction = {
          name: methodMatch[1],
          startLine: i + 1,
          braceCount: (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length,
        };
        functionBody = line;
        continue;
      }
    } else {
      // Continue collecting function body
      functionBody += "\n" + line;
      currentFunction.braceCount +=
        (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      if (currentFunction.braceCount <= 0) {
        // Function ended
        functions.push({
          name: currentFunction.name,
          body: functionBody,
          line: currentFunction.startLine,
        });
        currentFunction = null;
        functionBody = "";
      }
    }
  }

  return functions;
}

/**
 * Analyze code complexity
 *
 * @param content - File content to analyze
 * @param filePath - Path to the file (for context)
 * @returns Array of high complexity issues (complexity > 10)
 */
export function analyzeComplexity(
  content: string,
  filePath: string
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const functions = extractFunctions(content);

  for (const func of functions) {
    const complexity = calculateComplexity(func.body);

    if (complexity > 10) {
      issues.push({
        type: "high_complexity",
        file: filePath,
        line: func.line,
        message: `Function ${func.name} has cyclomatic complexity of ${complexity}`,
        functionName: func.name,
        score: complexity,
      });
    }
  }

  return issues;
}

/**
 * Extract exports from a file
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];

  for (const { pattern, isDefault } of EXPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const symbol = isDefault ? "default" : match[1];
      if (symbol && !exports.includes(symbol)) {
        exports.push(symbol);
      }
    }
  }

  return exports;
}

/**
 * Check if a symbol is used in any file
 */
function isSymbolUsed(
  symbol: string,
  sourceFile: string,
  files: Map<string, string>
): boolean {
  for (const [filePath, content] of files) {
    if (filePath === sourceFile) continue;

    // Check for import
    const importPattern = new RegExp(
      `import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`,
      "g"
    );
    if (importPattern.test(content)) {
      return true;
    }

    // Check for re-export
    const reexportPattern = new RegExp(
      `export\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`,
      "g"
    );
    if (reexportPattern.test(content)) {
      return true;
    }

    // Check for default import
    if (symbol === "default") {
      const defaultImportPattern = new RegExp(
        `import\\s+\\w+\\s+from\\s+['"]\\..*${sourceFile.replace(/\.[^.]+$/, "")}`,
        "g"
      );
      if (defaultImportPattern.test(content)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect unused exports
 *
 * @param files - Map of file paths to their content
 * @param changedFiles - Array of changed file paths to check
 * @returns Array of dead code issues
 */
export function detectUnusedExports(
  files: Map<string, string>,
  changedFiles: string[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const filePath of changedFiles) {
    const content = files.get(filePath);
    if (!content) continue;

    const exports = extractExports(content);

    for (const symbol of exports) {
      if (!isSymbolUsed(symbol, filePath, files)) {
        issues.push({
          type: "dead_code",
          file: filePath,
          message: `Export '${symbol}' is not used anywhere in the codebase`,
          symbol,
        });
      }
    }
  }

  return issues;
}

/**
 * Simple tokenizer for duplication detection
 */
function tokenize(content: string): string[] {
  // Remove comments
  const noComments = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  // Split into tokens (words, operators, etc.)
  const tokens = noComments.match(/\w+|[^\s\w]/g) || [];
  return tokens;
}

/**
 * Calculate token similarity between two arrays
 */
function calculateSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return (intersection / union) * 100;
}

/**
 * Detect code duplication
 *
 * @param files - Map of file paths to their content
 * @param changedFiles - Array of changed file paths to check
 * @returns Array of duplication issues
 */
export function detectDuplication(
  files: Map<string, string>,
  changedFiles: string[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const tokenizedFiles: Array<{ path: string; tokens: string[] }> = [];

  // Tokenize all changed files
  for (const filePath of changedFiles) {
    const content = files.get(filePath);
    if (!content) continue;

    const tokens = tokenize(content);
    if (tokens.length >= 20) {
      tokenizedFiles.push({ path: filePath, tokens });
    }
  }

  // Compare each pair of files
  for (let i = 0; i < tokenizedFiles.length; i++) {
    for (let j = i + 1; j < tokenizedFiles.length; j++) {
      const file1 = tokenizedFiles[i];
      const file2 = tokenizedFiles[j];

      // Compare tokens
      const similarity = calculateSimilarity(file1.tokens, file2.tokens);

      // If > 70% similarity and both have > 20 tokens, flag as duplication
      if (
        similarity > 70 &&
        file1.tokens.length > 20 &&
        file2.tokens.length > 20
      ) {
        issues.push({
          type: "duplication",
          file: file1.path,
          message: `High similarity (${similarity.toFixed(1)}%) detected between files`,
          similarity,
          files: [file1.path, file2.path],
        });
      }
    }
  }

  return issues;
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  issues: QualityIssue[],
  scannedFiles: number
): string {
  if (issues.length === 0) {
    return `${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned, no quality issues found`;
  }

  const byType: Record<QualityIssueType, number> = {
    dead_code: 0,
    duplication: 0,
    high_complexity: 0,
  };

  for (const issue of issues) {
    byType[issue.type]++;
  }

  const parts: string[] = [];
  parts.push(`${scannedFiles} file${scannedFiles !== 1 ? "s" : ""} scanned`);

  const issueParts: string[] = [];
  if (byType.dead_code > 0) issueParts.push(`${byType.dead_code} dead code`);
  if (byType.duplication > 0)
    issueParts.push(`${byType.duplication} duplication`);
  if (byType.high_complexity > 0)
    issueParts.push(`${byType.high_complexity} complexity`);

  if (issueParts.length > 0) {
    parts.push(issueParts.join(", "));
  }

  return parts.join(", ");
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateQualityScore(
  issues: QualityIssue[],
  scannedFiles: number
): number {
  if (scannedFiles === 0) return 100;

  let score = 100;

  for (const issue of issues) {
    switch (issue.type) {
      case "dead_code":
        score -= 5;
        break;
      case "duplication":
        score -= 3;
        break;
      case "high_complexity":
        score -= issue.score && issue.score > 20 ? 10 : 5;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Create a fix task from a quality issue
 */
function createFixTask(issue: QualityIssue): FixTask {
  let description: string;

  switch (issue.type) {
    case "dead_code":
      description = `Remove unused export: ${issue.symbol}`;
      break;
    case "high_complexity":
      description = `Refactor function ${issue.functionName}: complexity ${issue.score}`;
      break;
    default:
      description = issue.message;
  }

  return {
    type: "quality_fix",
    file: issue.file,
    line: issue.line,
    description,
    priority: "medium",
  };
}

/**
 * Run the quality micro-task
 *
 * Retrieves changed files from git diff, analyzes them for quality issues,
 * and generates fix tasks for high-impact problems.
 *
 * @param options - Options including working directory and custom file reader
 * @returns QualityResult with success status, issues, and fix tasks
 *
 * @example
 * ```typescript
 * const result = await runQuality({ cwd: "/path/to/project" });
 * if (!result.success) {
 *   console.log(`${result.issues?.length} quality issues found`);
 *   result.fixTasks.forEach(task => console.log(task.description));
 * }
 * ```
 */
export async function runQuality(
  options: QualityOptions = {}
): Promise<QualityResult> {
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
        taskType: "quality",
        success: true,
        errorCount: 0,
        warningCount: 0,
        fixTasks: [],
        duration,
        command,
        scannedFiles: 0,
        issues: [],
        deadCodeCount: 0,
        duplications: 0,
        complexityIssues: 0,
        overallQualityScore: 100,
        summary: "0 files scanned, no code files in diff",
      };
    }

    // Read all files for analysis
    let allFiles: Map<string, string>;
    if (options.readAllFiles) {
      allFiles = await options.readAllFiles();
    } else {
      allFiles = new Map();
      for (const filePath of changedFiles) {
        try {
          let content: string;
          if (options.readFile) {
            content = await options.readFile(filePath);
          } else {
            const file = Bun.file(`${cwd}/${filePath}`);
            content = await file.text();
          }
          allFiles.set(filePath, content);
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    }

    const allIssues: QualityIssue[] = [];
    const filesToAnalyze: string[] = [];

    // Analyze each changed file
    for (const filePath of changedFiles) {
      try {
        let content: string;
        if (allFiles.has(filePath)) {
          content = allFiles.get(filePath)!;
        } else if (options.readFile) {
          content = await options.readFile(filePath);
          allFiles.set(filePath, content);
        } else {
          const file = Bun.file(`${cwd}/${filePath}`);
          content = await file.text();
          allFiles.set(filePath, content);
        }

        // Skip files with ignore comment
        if (hasIgnoreComment(content)) {
          continue;
        }

        // Track files that should be analyzed
        filesToAnalyze.push(filePath);

        // Analyze complexity
        const complexityIssues = analyzeComplexity(content, filePath);
        allIssues.push(...complexityIssues);
      } catch {
        // File unparseable, skip silently
        continue;
      }
    }

    // Detect unused exports (only for non-ignored files)
    const deadCodeIssues = detectUnusedExports(allFiles, filesToAnalyze);
    allIssues.push(...deadCodeIssues);

    // Detect duplication (only for non-ignored files)
    const duplicationIssues = detectDuplication(allFiles, filesToAnalyze);
    allIssues.push(...duplicationIssues);

    // Count issues by type
    const deadCodeCount = allIssues.filter((i) => i.type === "dead_code").length;
    const duplications = allIssues.filter((i) => i.type === "duplication").length;
    const complexityIssues = allIssues.filter(
      (i) => i.type === "high_complexity"
    ).length;

    // Generate fix tasks for high-impact issues
    const fixableIssues = allIssues.filter((issue) => {
      // Dead code always gets fix tasks
      if (issue.type === "dead_code") return true;
      // Complexity > 20 gets fix tasks
      if (issue.type === "high_complexity" && issue.score && issue.score > 20)
        return true;
      // Duplication is advisory only
      return false;
    });

    // Limit to top 10 most impactful
    const sortedIssues = fixableIssues.sort((a, b) => {
      // Higher complexity first
      if (a.type === "high_complexity" && b.type === "high_complexity") {
        return (b.score || 0) - (a.score || 0);
      }
      // Complexity before dead code
      if (a.type === "high_complexity") return -1;
      if (b.type === "high_complexity") return 1;
      return 0;
    });

    const topIssues = sortedIssues.slice(0, 10);
    const fixTasks = topIssues.map(createFixTask);

    // Calculate quality score
    const overallQualityScore = calculateQualityScore(
      allIssues,
      changedFiles.length
    );

    // Determine success - fail if there are high complexity issues > 20
    const criticalComplexityIssues = allIssues.filter(
      (i) => i.type === "high_complexity" && i.score && i.score > 20
    );
    const success = criticalComplexityIssues.length === 0;

    return {
      taskType: "quality",
      success,
      errorCount: criticalComplexityIssues.length,
      warningCount: allIssues.length - criticalComplexityIssues.length,
      fixTasks,
      duration: Date.now() - startTime,
      command,
      scannedFiles: changedFiles.length,
      issues: allIssues,
      deadCodeCount,
      duplications,
      complexityIssues,
      overallQualityScore,
      summary: generateSummary(allIssues, changedFiles.length),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      taskType: "quality",
      success: false,
      errorCount: 1,
      warningCount: 0,
      fixTasks: [],
      duration,
      command,
      scannedFiles: 0,
      issues: [],
      deadCodeCount: 0,
      duplications: 0,
      complexityIssues: 0,
      overallQualityScore: 0,
      error: `Quality scan failed: ${errorMessage}`,
    };
  }
}
