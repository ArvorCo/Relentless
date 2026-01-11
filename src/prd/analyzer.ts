/**
 * Cross-Artifact Consistency Analysis
 *
 * Checks consistency across PRD, JSON, and code to catch errors early
 */

import { PRD, UserStory } from "./types";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

export interface ConsistencyIssue {
  category: string;
  severity: "critical" | "warning" | "info";
  message: string;
  recommendation?: string;
  storyId?: string;
}

export interface AnalysisReport {
  feature: string;
  timestamp: string;
  issues: ConsistencyIssue[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    critical: number;
    warnings: number;
    info: number;
  };
  coverage: {
    [key: string]: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

/**
 * Analyze cross-artifact consistency
 */
export async function analyzeConsistency(
  prdPath: string,
  prd: PRD
): Promise<AnalysisReport> {
  const issues: ConsistencyIssue[] = [];
  const featureDir = dirname(prdPath);
  const featureName = featureDir.split("/").pop() || "unknown";

  // Category 1: PRD Schema Validation
  await checkSchemaValidation(prd, issues);

  // Category 2: Dependency Consistency
  await checkDependencyConsistency(prd, issues);

  // Category 3: File Existence
  await checkFileExistence(featureDir, issues);

  // Category 4: Story Completeness
  await checkStoryCompleteness(prd, issues);

  // Category 5: Progress Log Sync
  await checkProgressLogSync(featureDir, prd, issues);

  // Calculate summary
  const total = prd.userStories.length;
  const completed = prd.userStories.filter((s) => s.passes).length;
  const pending = total - completed;

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  // Calculate coverage by category
  const coverage = calculateCoverage(prd);

  return {
    feature: featureName,
    timestamp: new Date().toISOString(),
    issues,
    summary: {
      total,
      completed,
      pending,
      critical,
      warnings,
      info,
    },
    coverage,
  };
}

/**
 * Check PRD schema validation
 */
async function checkSchemaValidation(
  prd: PRD,
  issues: ConsistencyIssue[]
): Promise<void> {
  // Check for missing required fields
  if (!prd.project || prd.project.trim() === "") {
    issues.push({
      category: "Schema Validation",
      severity: "critical",
      message: "PRD is missing project name",
      recommendation: "Add a project name to the PRD",
    });
  }

  if (!prd.branchName || prd.branchName.trim() === "") {
    issues.push({
      category: "Schema Validation",
      severity: "critical",
      message: "PRD is missing branch name",
      recommendation: "Add a branch name to the PRD",
    });
  }

  if (!prd.description || prd.description.trim() === "") {
    issues.push({
      category: "Schema Validation",
      severity: "warning",
      message: "PRD is missing description",
      recommendation: "Add a description to help understand the feature",
    });
  }

  // Check each user story
  for (const story of prd.userStories) {
    if (!story.id || story.id.trim() === "") {
      issues.push({
        category: "Schema Validation",
        severity: "critical",
        message: `Story has no ID`,
        recommendation: "Assign a unique ID to the story (e.g., US-001)",
      });
    }

    if (!story.title || story.title.trim() === "") {
      issues.push({
        category: "Schema Validation",
        severity: "critical",
        message: `Story ${story.id} has no title`,
        storyId: story.id,
        recommendation: "Add a descriptive title to the story",
      });
    }

    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      issues.push({
        category: "Schema Validation",
        severity: "warning",
        message: `Story ${story.id} has no acceptance criteria`,
        storyId: story.id,
        recommendation:
          "Add acceptance criteria to define clear completion requirements",
      });
    }
  }
}

/**
 * Check dependency consistency
 */
async function checkDependencyConsistency(
  prd: PRD,
  issues: ConsistencyIssue[]
): Promise<void> {
  const storyMap = new Map<string, UserStory>();
  for (const story of prd.userStories) {
    storyMap.set(story.id, story);
  }

  // Check for invalid dependencies
  for (const story of prd.userStories) {
    if (story.dependencies) {
      for (const depId of story.dependencies) {
        if (!storyMap.has(depId)) {
          issues.push({
            category: "Dependency Consistency",
            severity: "critical",
            message: `Story ${story.id} depends on non-existent story ${depId}`,
            storyId: story.id,
            recommendation: `Remove the dependency or add story ${depId}`,
          });
        }
      }
    }
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(storyId: string, path: string[] = []): string | null {
    if (recursionStack.has(storyId)) {
      return [...path, storyId].join(" -> ");
    }

    if (visited.has(storyId)) {
      return null;
    }

    visited.add(storyId);
    recursionStack.add(storyId);

    const story = storyMap.get(storyId);
    if (story?.dependencies) {
      for (const depId of story.dependencies) {
        const cycle = hasCycle(depId, [...path, storyId]);
        if (cycle) {
          return cycle;
        }
      }
    }

    recursionStack.delete(storyId);
    return null;
  }

  for (const story of prd.userStories) {
    const cycle = hasCycle(story.id);
    if (cycle) {
      issues.push({
        category: "Dependency Consistency",
        severity: "critical",
        message: `Circular dependency detected: ${cycle}`,
        recommendation: "Remove one of the dependencies to break the cycle",
      });
      break; // Only report once
    }
  }

  // Check for completed stories that depend on incomplete stories
  for (const story of prd.userStories) {
    if (story.passes && story.dependencies) {
      for (const depId of story.dependencies) {
        const depStory = storyMap.get(depId);
        if (depStory && !depStory.passes) {
          issues.push({
            category: "Dependency Consistency",
            severity: "warning",
            message: `Story ${story.id} is marked complete but depends on incomplete story ${depId}`,
            storyId: story.id,
            recommendation: `Either mark ${depId} as complete or review ${story.id}'s completion status`,
          });
        }
      }
    }
  }
}

/**
 * Check file existence
 */
async function checkFileExistence(
  featureDir: string,
  issues: ConsistencyIssue[]
): Promise<void> {
  const prdMdPath = join(featureDir, "prd.md");
  const progressPath = join(featureDir, "progress.txt");
  const planPath = join(featureDir, "plan.md");
  const constitutionPath = join(dirname(featureDir), "..", "constitution.md");

  if (!existsSync(prdMdPath)) {
    issues.push({
      category: "File Existence",
      severity: "info",
      message: "prd.md not found in feature directory",
      recommendation:
        "Consider keeping the source prd.md for documentation purposes",
    });
  }

  if (!existsSync(progressPath)) {
    issues.push({
      category: "File Existence",
      severity: "warning",
      message: "progress.txt not found",
      recommendation: "Create progress.txt to track learnings across iterations",
    });
  }

  if (existsSync(planPath)) {
    issues.push({
      category: "File Existence",
      severity: "info",
      message: "plan.md found - technical planning is in use",
    });
  }

  if (!existsSync(constitutionPath)) {
    issues.push({
      category: "File Existence",
      severity: "info",
      message: "constitution.md not found",
      recommendation:
        "Consider creating a constitution.md for project governance",
    });
  }
}

/**
 * Check story completeness
 */
async function checkStoryCompleteness(
  prd: PRD,
  issues: ConsistencyIssue[]
): Promise<void> {
  // Check for stories with very few acceptance criteria
  for (const story of prd.userStories) {
    if (story.acceptanceCriteria.length < 2) {
      issues.push({
        category: "Story Completeness",
        severity: "info",
        message: `Story ${story.id} has only ${story.acceptanceCriteria.length} acceptance criteria`,
        storyId: story.id,
        recommendation:
          "Consider adding more detailed acceptance criteria for clarity",
      });
    }
  }

  // Check for stories with empty notes that are incomplete
  for (const story of prd.userStories) {
    if (!story.passes && story.notes && story.notes.trim() !== "") {
      issues.push({
        category: "Story Completeness",
        severity: "info",
        message: `Story ${story.id} is incomplete but has notes: "${story.notes}"`,
        storyId: story.id,
        recommendation: "Review notes to understand blockers or context",
      });
    }
  }

  // Check for duplicate story IDs
  const idCounts = new Map<string, number>();
  for (const story of prd.userStories) {
    idCounts.set(story.id, (idCounts.get(story.id) || 0) + 1);
  }

  for (const [id, count] of idCounts.entries()) {
    if (count > 1) {
      issues.push({
        category: "Story Completeness",
        severity: "critical",
        message: `Duplicate story ID detected: ${id} appears ${count} times`,
        recommendation: "Ensure all story IDs are unique",
      });
    }
  }
}

/**
 * Check progress log sync
 */
async function checkProgressLogSync(
  featureDir: string,
  prd: PRD,
  issues: ConsistencyIssue[]
): Promise<void> {
  const progressPath = join(featureDir, "progress.txt");

  if (!existsSync(progressPath)) {
    return; // Already reported in file existence check
  }

  try {
    const progressContent = await Bun.file(progressPath).text();

    // Check if progress log mentions completed stories
    const completedStories = prd.userStories.filter((s) => s.passes);

    for (const story of completedStories) {
      if (!progressContent.includes(story.id)) {
        issues.push({
          category: "Progress Log Sync",
          severity: "warning",
          message: `Story ${story.id} is marked complete but not mentioned in progress.txt`,
          storyId: story.id,
          recommendation:
            "Ensure progress.txt is updated after completing each story",
        });
      }
    }
  } catch (error) {
    issues.push({
      category: "Progress Log Sync",
      severity: "warning",
      message: "Failed to read progress.txt",
      recommendation: "Check file permissions and format",
    });
  }
}

/**
 * Calculate coverage by category
 */
function calculateCoverage(prd: PRD): {
  [key: string]: { completed: number; total: number; percentage: number };
} {
  const coverage: {
    [key: string]: { completed: number; total: number; percentage: number };
  } = {};

  // Group by phase if available
  const phases = new Set<string>();
  for (const story of prd.userStories) {
    if (story.phase) {
      phases.add(story.phase);
    }
  }

  for (const phase of phases) {
    const storiesInPhase = prd.userStories.filter((s) => s.phase === phase);
    const completedInPhase = storiesInPhase.filter((s) => s.passes);

    coverage[phase] = {
      completed: completedInPhase.length,
      total: storiesInPhase.length,
      percentage: Math.round(
        (completedInPhase.length / storiesInPhase.length) * 100
      ),
    };
  }

  // If no phases, just show overall
  if (phases.size === 0) {
    coverage["Overall"] = {
      completed: prd.userStories.filter((s) => s.passes).length,
      total: prd.userStories.length,
      percentage: Math.round(
        (prd.userStories.filter((s) => s.passes).length /
          prd.userStories.length) *
          100
      ),
    };
  }

  return coverage;
}

/**
 * Format analysis report for display
 */
export function formatReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push(`\n╔═══════════════════════════════════════════════════════╗`);
  lines.push(`║  Cross-Artifact Consistency Analysis                 ║`);
  lines.push(`╚═══════════════════════════════════════════════════════╝\n`);

  lines.push(`Feature: ${report.feature}`);
  lines.push(`Timestamp: ${report.timestamp}\n`);

  // Summary
  lines.push(`Summary:`);
  lines.push(`  Stories: ${report.summary.completed}/${report.summary.total} completed (${report.summary.pending} pending)`);
  lines.push(`  Issues: ${report.issues.length} total`);
  lines.push(`    Critical: ${report.summary.critical}`);
  lines.push(`    Warnings: ${report.summary.warnings}`);
  lines.push(`    Info: ${report.summary.info}\n`);

  // Coverage
  if (Object.keys(report.coverage).length > 0) {
    lines.push(`Coverage by Phase:`);
    for (const [phase, stats] of Object.entries(report.coverage)) {
      const bar = "█".repeat(Math.floor(stats.percentage / 5));
      const emptyBar = "░".repeat(20 - Math.floor(stats.percentage / 5));
      lines.push(
        `  ${phase.padEnd(20)} ${bar}${emptyBar} ${stats.percentage}% (${stats.completed}/${stats.total})`
      );
    }
    lines.push("");
  }

  // Issues by category
  if (report.issues.length > 0) {
    const categories = new Set(report.issues.map((i) => i.category));

    lines.push(`Issues by Category:\n`);

    for (const category of categories) {
      const categoryIssues = report.issues.filter((i) => i.category === category);

      lines.push(`${category}:`);

      for (const issue of categoryIssues) {
        const severityIcon =
          issue.severity === "critical"
            ? "🔴"
            : issue.severity === "warning"
              ? "🟡"
              : "🔵";

        lines.push(`  ${severityIcon} ${issue.message}`);

        if (issue.recommendation) {
          lines.push(`     → ${issue.recommendation}`);
        }
      }

      lines.push("");
    }
  } else {
    lines.push(`✅ No issues found!\n`);
  }

  return lines.join("\n");
}
