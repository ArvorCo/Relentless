/**
 * PRD Validator
 *
 * Validates tasks.md content before conversion to prd.json.
 * Provides early detection of format issues with clear error messages.
 */

import { z } from "zod";

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Validation issue with context
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  storyId?: string;
  line?: number;
  suggestion?: string;
}

/**
 * Filtered criterion with reason
 */
export interface FilteredCriterion {
  storyId: string;
  text: string;
  reason: string;
  line?: number;
  suggestion?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  filteredCriteria: FilteredCriterion[];
  summary: {
    totalStories: number;
    totalCriteria: number;
    filteredCriteriaCount: number;
    storiesWithNoCriteria: string[];
  };
}

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for story ID format
 */
export const StoryIdSchema = z.string().regex(/^US-\d{3}$/, {
  message: "Story ID must be in US-XXX format (e.g., US-001)",
});

// ============================================================================
// Criterion Validation
// ============================================================================

/**
 * Result of validating a criterion
 */
export interface CriterionValidation {
  valid: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Check if a criterion line is valid with detailed feedback
 *
 * Returns validation result with reason and suggestion for invalid criteria.
 */
export function validateCriterion(text: string): CriterionValidation {
  // Skip empty or very short lines
  if (!text || text.length < 3) {
    return {
      valid: false,
      reason: "Criterion too short (less than 3 characters)",
      suggestion: "Add more context to describe what should be verified",
    };
  }

  // Skip pure file paths like `src/file.ts` (standalone, not in a sentence)
  // But allow file paths WITH context like "`src/file.ts` contains Zod schemas"
  if (text.match(/^`[^`]+\.(ts|tsx|js|jsx|css|json|md|py|go|rs|java|kt|swift|rb)`$/)) {
    return {
      valid: false,
      reason: "Standalone file path without context",
      suggestion: `Add context: "${text} contains [description]" or "${text} is updated with [changes]"`,
    };
  }

  // Skip pure section markers like **Files:** or **Note:**
  // But allow labeled criteria like **Important:** User can log in
  if (text.match(/^\*\*[^*:]+:\*\*\s*$/)) {
    return {
      valid: false,
      reason: "Section marker without content",
      suggestion: "Either add content after the marker or remove from acceptance criteria",
    };
  }

  // Skip dividers
  if (text.match(/^[-=]{3,}$/)) {
    return {
      valid: false,
      reason: "Line divider, not an acceptance criterion",
    };
  }

  return { valid: true };
}

// ============================================================================
// Story Validation
// ============================================================================

/**
 * Extract story ID from a markdown header line
 */
export function parseStoryId(line: string): { id: string | null; format: "standard" | "story" | "numbered" | null } {
  // ### US-001: Title
  const usMatch = line.match(/^###\s+US-(\d+)\s*:?\s*/i);
  if (usMatch) {
    return { id: `US-${usMatch[1].padStart(3, "0")}`, format: "standard" };
  }

  // ### Story 1: Title
  const storyMatch = line.match(/^###\s+Story\s+(\d+)\s*:?\s*/i);
  if (storyMatch) {
    return { id: `US-${storyMatch[1].padStart(3, "0")}`, format: "story" };
  }

  // ### 1. Title or ### 1: Title
  const numberedMatch = line.match(/^###\s+(\d+)\.?\s*:?\s*/);
  if (numberedMatch) {
    return { id: `US-${numberedMatch[1].padStart(3, "0")}`, format: "numbered" };
  }

  return { id: null, format: null };
}

/**
 * Parse dependency line and extract referenced story IDs
 */
export function parseDependencies(line: string): { ids: string[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const ids: string[] = [];

  // Extract all US-XXX references
  const usMatches = line.matchAll(/US[-_]?(\d+)/gi);
  for (const match of usMatches) {
    const fullMatch = match[0];
    const number = match[1].padStart(3, "0");
    const normalized = `US-${number}`;

    // Check for underscore format
    if (fullMatch.includes("_")) {
      issues.push({
        severity: "warning",
        code: "DEPENDENCY_FORMAT",
        message: `Dependency "${fullMatch}" uses underscore instead of dash`,
        suggestion: `Use "${normalized}" instead of "${fullMatch}"`,
      });
    }

    ids.push(normalized);
  }

  return { ids, issues };
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate tasks.md content before conversion
 *
 * Checks for:
 * - Story ID format and uniqueness
 * - Dependency validity (no circular, no missing)
 * - Acceptance criteria quality (warns on filtered criteria)
 * - Common format issues
 */
export function validateTasksMarkdown(content: string): ValidationResult {
  const lines = content.split("\n");
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    filteredCriteria: [],
    summary: {
      totalStories: 0,
      totalCriteria: 0,
      filteredCriteriaCount: 0,
      storiesWithNoCriteria: [],
    },
  };

  // Track state
  const storyIds = new Map<string, number>(); // id -> line number
  const storyDependencies = new Map<string, string[]>(); // id -> dependency ids
  const storyCriteriaCount = new Map<string, number>(); // id -> count of valid criteria
  let currentStoryId: string | null = null;
  let inAcceptanceCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1; // 1-based line numbers for human readability

    // Check for story header
    const storyParsed = parseStoryId(trimmed);
    if (storyParsed.id) {
      // If we have a previous story, check if it had criteria
      if (currentStoryId && (storyCriteriaCount.get(currentStoryId) ?? 0) === 0) {
        result.summary.storiesWithNoCriteria.push(currentStoryId);
      }

      currentStoryId = storyParsed.id;
      inAcceptanceCriteria = false;
      storyCriteriaCount.set(currentStoryId, 0);

      // Check for non-standard format
      if (storyParsed.format === "story") {
        result.info.push({
          severity: "info",
          code: "STORY_FORMAT",
          message: `Line ${lineNum}: "Story X" format will be normalized to "${currentStoryId}"`,
          storyId: currentStoryId,
          line: lineNum,
        });
      } else if (storyParsed.format === "numbered") {
        result.info.push({
          severity: "info",
          code: "STORY_FORMAT",
          message: `Line ${lineNum}: Numbered format will be normalized to "${currentStoryId}"`,
          storyId: currentStoryId,
          line: lineNum,
        });
      }

      // Check for duplicate story ID
      if (storyIds.has(currentStoryId)) {
        result.errors.push({
          severity: "error",
          code: "DUPLICATE_STORY_ID",
          message: `Duplicate story ID "${currentStoryId}" at line ${lineNum} (first defined at line ${storyIds.get(currentStoryId)})`,
          storyId: currentStoryId,
          line: lineNum,
          suggestion: `Use a unique ID like US-${String(storyIds.size + 1).padStart(3, "0")}`,
        });
        result.valid = false;
      } else {
        storyIds.set(currentStoryId, lineNum);
      }

      result.summary.totalStories++;
      continue;
    }

    // Check for acceptance criteria section
    if (currentStoryId && trimmed.match(/^\*\*Acceptance Criteria:?\*\*$/i)) {
      inAcceptanceCriteria = true;
      continue;
    }

    // Check for dependency line
    if (currentStoryId && trimmed.match(/^\*\*Dependencies?:?\*\*/i)) {
      const { ids, issues } = parseDependencies(trimmed);
      storyDependencies.set(currentStoryId, ids);

      for (const issue of issues) {
        issue.storyId = currentStoryId;
        issue.line = lineNum;
        result.warnings.push(issue);
      }
      inAcceptanceCriteria = false;
      continue;
    }

    // Check for section headers that end acceptance criteria
    if (currentStoryId && trimmed.match(/^\*\*(Files|Note|Technical|Design|Phase|Priority|Parallel|Research)/i)) {
      inAcceptanceCriteria = false;
      continue;
    }

    // Check for section header (##) ending current story
    if (trimmed.startsWith("## ")) {
      if (currentStoryId && (storyCriteriaCount.get(currentStoryId) ?? 0) === 0) {
        result.summary.storiesWithNoCriteria.push(currentStoryId);
      }
      currentStoryId = null;
      inAcceptanceCriteria = false;
      continue;
    }

    // Parse acceptance criteria
    if (currentStoryId && trimmed.startsWith("-")) {
      // Skip dividers
      if (trimmed.match(/^-+$/)) {
        inAcceptanceCriteria = false;
        continue;
      }

      // Extract criterion text
      let criterionText = "";
      if (trimmed.match(/^-\s*\[.\]/)) {
        criterionText = trimmed.replace(/^-\s*\[.\]\s*/, "").trim();
        inAcceptanceCriteria = true;
      } else if (inAcceptanceCriteria) {
        criterionText = trimmed.replace(/^-\s*/, "").trim();
      }

      if (criterionText) {
        result.summary.totalCriteria++;

        const validation = validateCriterion(criterionText);
        if (!validation.valid) {
          result.filteredCriteria.push({
            storyId: currentStoryId,
            text: criterionText,
            reason: validation.reason!,
            line: lineNum,
            suggestion: validation.suggestion,
          });
          result.summary.filteredCriteriaCount++;
        } else {
          const count = storyCriteriaCount.get(currentStoryId) ?? 0;
          storyCriteriaCount.set(currentStoryId, count + 1);
        }
      }
    }
  }

  // Check last story for criteria
  if (currentStoryId && (storyCriteriaCount.get(currentStoryId) ?? 0) === 0) {
    result.summary.storiesWithNoCriteria.push(currentStoryId);
  }

  // Validate dependencies
  for (const [storyId, deps] of storyDependencies) {
    for (const depId of deps) {
      if (!storyIds.has(depId)) {
        result.errors.push({
          severity: "error",
          code: "MISSING_DEPENDENCY",
          message: `Story ${storyId} depends on non-existent story ${depId}`,
          storyId,
          suggestion: `Check if the dependency ID is correct or create ${depId}`,
        });
        result.valid = false;
      }
    }
  }

  // Check for circular dependencies
  const circularCheck = detectCircularDependencies(storyDependencies);
  if (circularCheck.hasCircle) {
    result.errors.push({
      severity: "error",
      code: "CIRCULAR_DEPENDENCY",
      message: `Circular dependency detected: ${circularCheck.cycle!.join(" → ")}`,
      suggestion: "Review dependencies and remove the circular reference",
    });
    result.valid = false;
  }

  // Add warnings for stories with no acceptance criteria after filtering
  for (const storyId of result.summary.storiesWithNoCriteria) {
    result.warnings.push({
      severity: "warning",
      code: "NO_CRITERIA",
      message: `Story ${storyId} has no valid acceptance criteria after filtering`,
      storyId,
      suggestion: "Add acceptance criteria that describe testable requirements",
    });
  }

  // Add warnings for filtered criteria
  if (result.filteredCriteria.length > 0) {
    result.warnings.push({
      severity: "warning",
      code: "FILTERED_CRITERIA",
      message: `${result.filteredCriteria.length} acceptance criteria will be filtered during conversion`,
      suggestion: "Review the filtered criteria list and add context where needed",
    });
  }

  return result;
}

// ============================================================================
// Circular Dependency Detection
// ============================================================================

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(
  dependencies: Map<string, string[]>
): { hasCircle: boolean; cycle?: string[] } {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(storyId: string, path: string[]): string[] | null {
    if (recursionStack.has(storyId)) {
      // Found a cycle - return the cycle path
      const cycleStart = path.indexOf(storyId);
      return [...path.slice(cycleStart), storyId];
    }

    if (visited.has(storyId)) {
      return null;
    }

    visited.add(storyId);
    recursionStack.add(storyId);

    const deps = dependencies.get(storyId) ?? [];
    for (const depId of deps) {
      const cycle = dfs(depId, [...path, storyId]);
      if (cycle) {
        return cycle;
      }
    }

    recursionStack.delete(storyId);
    return null;
  }

  for (const storyId of dependencies.keys()) {
    const cycle = dfs(storyId, []);
    if (cycle) {
      return { hasCircle: true, cycle };
    }
  }

  return { hasCircle: false };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format validation result as human-readable output
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  // Header
  if (result.valid) {
    lines.push("✅ Validation passed");
  } else {
    lines.push("❌ Validation failed");
  }
  lines.push("");

  // Summary
  lines.push(`Stories: ${result.summary.totalStories}`);
  lines.push(`Criteria: ${result.summary.totalCriteria} total, ${result.summary.filteredCriteriaCount} filtered`);
  lines.push("");

  // Errors
  if (result.errors.length > 0) {
    lines.push(`ERRORS (${result.errors.length}):`);
    for (const error of result.errors) {
      const location = error.line ? ` (line ${error.line})` : "";
      lines.push(`  ❌ [${error.code}]${location}`);
      lines.push(`     ${error.message}`);
      if (error.suggestion) {
        lines.push(`     💡 ${error.suggestion}`);
      }
    }
    lines.push("");
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`WARNINGS (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      const location = warning.line ? ` (line ${warning.line})` : "";
      lines.push(`  ⚠️  [${warning.code}]${location}`);
      lines.push(`     ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`     💡 ${warning.suggestion}`);
      }
    }
    lines.push("");
  }

  // Filtered criteria details (if any)
  if (result.filteredCriteria.length > 0 && result.filteredCriteria.length <= 10) {
    lines.push("FILTERED CRITERIA:");
    for (const fc of result.filteredCriteria) {
      const location = fc.line ? ` (line ${fc.line})` : "";
      lines.push(`  ${fc.storyId}${location}: "${fc.text}"`);
      lines.push(`    Reason: ${fc.reason}`);
      if (fc.suggestion) {
        lines.push(`    💡 ${fc.suggestion}`);
      }
    }
    lines.push("");
  } else if (result.filteredCriteria.length > 10) {
    lines.push(`FILTERED CRITERIA: ${result.filteredCriteria.length} items (use --verbose to see all)`);
    lines.push("");
  }

  // Stories with no criteria
  if (result.summary.storiesWithNoCriteria.length > 0) {
    lines.push("STORIES WITH NO VALID CRITERIA:");
    for (const storyId of result.summary.storiesWithNoCriteria) {
      lines.push(`  ${storyId}`);
    }
    lines.push("");
  }

  // Info (only if there are no errors or warnings)
  if (result.info.length > 0 && result.errors.length === 0 && result.warnings.length === 0) {
    lines.push(`INFO (${result.info.length}):`);
    for (const info of result.info) {
      lines.push(`  ℹ️  ${info.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format validation result as JSON
 */
export function formatValidationResultJSON(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
