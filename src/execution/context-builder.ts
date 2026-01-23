/**
 * Context Builder - Task-Specific Context Extraction
 *
 * Optimizes token usage by extracting only relevant context for the current story
 * instead of loading entire files wholesale.
 *
 * This module provides:
 * - extractStoryFromTasks: Extract current story + dependencies from tasks.md
 * - filterChecklistForStory: Filter checklist to story-specific items
 * - extractStoryMetadata: Extract current story metadata from PRD
 * - buildProgressSummary: Build concise progress summary
 */

import { existsSync } from "node:fs";
import type { PRD, UserStory } from "../prd/types";
import { countStories } from "../prd/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Context extracted from tasks.md for a specific story
 */
export interface StoryContext {
  /** Markdown content for the current story section */
  currentStory: string;
  /** Markdown content for dependency story sections */
  dependencies: string[];
  /** Concise progress summary (e.g., "Progress: 5/18 stories complete") */
  progressSummary: string;
  /** Story statistics from PRD */
  stats: {
    total: number;
    completed: number;
    pending: number;
    skipped: number;
  };
}

/**
 * Checklist items filtered for a specific story
 */
export interface FilteredChecklist {
  /** Items tagged with the specific story ID [US-XXX] */
  storyItems: string[];
  /** Items tagged [Constitution] - always relevant */
  constitutionItems: string[];
  /** Items tagged [Edge Case], [Gap], [Clarified] - general relevance */
  generalItems: string[];
  /** Total item count in the original checklist */
  totalItemCount: number;
}

/**
 * Metadata extracted for a specific story from PRD
 */
export interface StoryMetadata {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number;
  dependencies: string[];
  phase?: string;
  research?: boolean;
}

// ============================================================================
// Story Extraction from tasks.md
// ============================================================================

/**
 * Extract story section from tasks.md content
 *
 * Stories are identified by the pattern: ### US-XXX: Title
 * The section ends at the next story header or section divider (---)
 */
function extractStorySectionFromContent(
  content: string,
  storyId: string
): string {
  const lines = content.split("\n");
  const storyPattern = new RegExp(`^###\\s+${storyId}:`, "i");

  let inStory = false;
  let storyLines: string[] = [];

  for (const line of lines) {
    // Check if we're starting the target story
    if (storyPattern.test(line)) {
      inStory = true;
      storyLines = [line];
      continue;
    }

    if (inStory) {
      // Check if we've hit the next story or section divider
      if (/^###\s+US-\d+:/.test(line) || /^---$/.test(line)) {
        break;
      }
      storyLines.push(line);
    }
  }

  return storyLines.join("\n").trim();
}

/**
 * Extract a story section and its dependencies from tasks.md
 *
 * @param tasksPath - Path to tasks.md file
 * @param currentStoryId - ID of the current story (e.g., "US-002")
 * @param prd - PRD object with all story metadata including dependencies
 * @returns StoryContext with current story, dependencies, and stats
 */
export async function extractStoryFromTasks(
  tasksPath: string,
  currentStoryId: string,
  prd: PRD
): Promise<StoryContext> {
  // Get stats from PRD
  const stats = countStories(prd);
  const progressSummary = buildProgressSummary(prd);

  // Handle missing file
  if (!existsSync(tasksPath)) {
    return {
      currentStory: "",
      dependencies: [],
      progressSummary,
      stats,
    };
  }

  const content = await Bun.file(tasksPath).text();

  // Extract current story section
  const currentStory = extractStorySectionFromContent(content, currentStoryId);

  // Find the story in PRD to get dependencies
  const story = prd.userStories.find((s) => s.id === currentStoryId);
  const dependencyIds = story?.dependencies ?? [];

  // Extract dependency story sections
  const dependencies: string[] = [];
  for (const depId of dependencyIds) {
    const depSection = extractStorySectionFromContent(content, depId);
    if (depSection) {
      dependencies.push(depSection);
    }
  }

  return {
    currentStory,
    dependencies,
    progressSummary,
    stats,
  };
}

// ============================================================================
// Checklist Filtering
// ============================================================================

/**
 * Filter checklist items for a specific story
 *
 * Extracts:
 * - Items tagged with the story ID [US-XXX]
 * - Items tagged [Constitution] (always relevant)
 * - Items tagged [Edge Case], [Gap], [Clarified] (general relevance)
 *
 * @param checklistPath - Path to checklist.md file
 * @param storyId - ID of the current story (e.g., "US-002")
 * @returns FilteredChecklist with categorized items
 */
export async function filterChecklistForStory(
  checklistPath: string,
  storyId: string
): Promise<FilteredChecklist> {
  // Handle missing file
  if (!existsSync(checklistPath)) {
    return {
      storyItems: [],
      constitutionItems: [],
      generalItems: [],
      totalItemCount: 0,
    };
  }

  const content = await Bun.file(checklistPath).text();
  const lines = content.split("\n");

  const storyItems: string[] = [];
  const constitutionItems: string[] = [];
  const generalItems: string[] = [];
  let totalItemCount = 0;

  // Pattern for checklist items: - [ ] CHK-XXX [TAG] Description
  // or: - [x] CHK-XXX [TAG] Description
  const checklistItemPattern = /^-\s+\[[ x]\]\s+CHK-\d+/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if it's a checklist item
    if (checklistItemPattern.test(trimmed)) {
      totalItemCount++;

      // Categorize by tag
      if (trimmed.includes(`[${storyId}]`)) {
        storyItems.push(trimmed);
      } else if (trimmed.includes("[Constitution]")) {
        constitutionItems.push(trimmed);
      } else if (
        trimmed.includes("[Edge Case]") ||
        trimmed.includes("[Gap]") ||
        trimmed.includes("[Clarified]")
      ) {
        generalItems.push(trimmed);
      }
    }
  }

  return {
    storyItems,
    constitutionItems,
    generalItems,
    totalItemCount,
  };
}

// ============================================================================
// Story Metadata Extraction
// ============================================================================

/**
 * Extract metadata for a specific story from PRD
 *
 * @param prd - PRD object with all stories
 * @param storyId - ID of the story to extract
 * @returns StoryMetadata or null if story not found
 */
export function extractStoryMetadata(
  prd: PRD,
  storyId: string
): StoryMetadata | null {
  const story = prd.userStories.find((s) => s.id === storyId);

  if (!story) {
    return null;
  }

  return {
    id: story.id,
    title: story.title,
    description: story.description,
    acceptanceCriteria: story.acceptanceCriteria,
    priority: story.priority,
    dependencies: story.dependencies ?? [],
    phase: story.phase,
    research: story.research,
  };
}

// ============================================================================
// Progress Summary
// ============================================================================

/**
 * Build a concise progress summary from PRD
 *
 * @param prd - PRD object with all stories
 * @returns Progress summary string (e.g., "Progress: 5/18 stories complete")
 */
export function buildProgressSummary(prd: PRD): string {
  const stats = countStories(prd);
  return `Progress: ${stats.completed}/${stats.total} stories complete`;
}

// ============================================================================
// Optimized Context Building (for runner.ts integration)
// ============================================================================

/**
 * Options for building an optimized prompt
 */
export interface OptimizedContextOptions {
  /** Path to the feature directory */
  featureDir: string;
  /** Current story being worked on */
  story: UserStory;
  /** Full PRD object */
  prd: PRD;
}

/**
 * Optimized context components extracted for prompt building
 */
export interface OptimizedContext {
  /** Story context from tasks.md */
  storyContext: StoryContext;
  /** Filtered checklist items */
  checklist: FilteredChecklist;
  /** Story metadata from PRD */
  metadata: StoryMetadata | null;
}

/**
 * Build optimized context for a story
 *
 * Extracts only the relevant portions of tasks.md and checklist.md
 * instead of loading the entire files.
 *
 * @param options - Context building options
 * @returns OptimizedContext with all extracted components
 */
export async function buildOptimizedContext(
  options: OptimizedContextOptions
): Promise<OptimizedContext> {
  const { featureDir, story, prd } = options;

  // Build paths
  const tasksPath = `${featureDir}/tasks.md`;
  const checklistPath = `${featureDir}/checklist.md`;

  // Extract context in parallel
  const [storyContext, checklist] = await Promise.all([
    extractStoryFromTasks(tasksPath, story.id, prd),
    filterChecklistForStory(checklistPath, story.id),
  ]);

  // Extract metadata
  const metadata = extractStoryMetadata(prd, story.id);

  return {
    storyContext,
    checklist,
    metadata,
  };
}

/**
 * Format story context for inclusion in prompt
 *
 * @param context - Story context from extractStoryFromTasks
 * @returns Formatted markdown string
 */
export function formatStoryContext(context: StoryContext): string {
  if (!context.currentStory) {
    return "";
  }

  let formatted = `\n\n## Current Story Context\n\n`;
  formatted += `${context.progressSummary}\n\n`;
  formatted += context.currentStory;

  if (context.dependencies.length > 0) {
    formatted += `\n\n### Dependency Stories (for reference)\n\n`;
    for (const dep of context.dependencies) {
      formatted += `${dep}\n\n`;
    }
  }

  return formatted;
}

/**
 * Format filtered checklist for inclusion in prompt
 *
 * @param checklist - Filtered checklist from filterChecklistForStory
 * @param storyId - Story ID for header
 * @returns Formatted markdown string
 */
export function formatFilteredChecklist(
  checklist: FilteredChecklist,
  storyId: string
): string {
  const hasItems =
    checklist.storyItems.length > 0 ||
    checklist.constitutionItems.length > 0 ||
    checklist.generalItems.length > 0;

  if (!hasItems) {
    return "";
  }

  let formatted = `\n\n## Relevant Quality Checklist Items\n\n`;
  formatted += `Filtered from ${checklist.totalItemCount} total items:\n\n`;

  if (checklist.storyItems.length > 0) {
    formatted += `### Story-Specific Items (${storyId})\n\n`;
    for (const item of checklist.storyItems) {
      formatted += `${item}\n`;
    }
    formatted += "\n";
  }

  if (checklist.constitutionItems.length > 0) {
    formatted += `### Constitution Items (Always Required)\n\n`;
    for (const item of checklist.constitutionItems) {
      formatted += `${item}\n`;
    }
    formatted += "\n";
  }

  if (checklist.generalItems.length > 0) {
    formatted += `### General Quality Items\n\n`;
    for (const item of checklist.generalItems) {
      formatted += `${item}\n`;
    }
    formatted += "\n";
  }

  return formatted;
}
