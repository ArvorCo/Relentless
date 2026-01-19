/**
 * PRD Types
 *
 * Defines the structure of prd.json for user stories
 */

import { z } from "zod";
import { ModeSchema, ComplexitySchema, HarnessNameSchema } from "../config/schema";

// ============================================================================
// Routing Metadata Schemas (US-026)
// ============================================================================

/**
 * Routing metadata schema for user stories.
 *
 * Contains classification and routing decisions made during the
 * `/relentless.tasks` phase after complexity classification.
 *
 * @example
 * {
 *   complexity: "medium",
 *   harness: "claude",
 *   model: "sonnet-4.5",
 *   mode: "good",
 *   estimatedCost: 0.15,
 *   classificationReasoning: "Keywords suggest medium complexity"
 * }
 */
export const RoutingMetadataSchema = z.object({
  /** Task complexity level determined by the classifier */
  complexity: ComplexitySchema,
  /** Selected harness for executing this story */
  harness: HarnessNameSchema,
  /** Selected model within the harness */
  model: z.string(),
  /** Mode used for routing decision (free, cheap, good, genius) */
  mode: ModeSchema,
  /** Estimated cost in USD based on token estimation */
  estimatedCost: z.number().nonnegative(),
  /** Human-readable explanation of classification reasoning (optional) */
  classificationReasoning: z.string().optional(),
});

export type RoutingMetadata = z.infer<typeof RoutingMetadataSchema>;

/**
 * Escalation attempt result type.
 *
 * Tracks the result of each execution attempt.
 */
export const EscalationResultSchema = z.enum(["success", "failure", "rate_limited"]);

export type EscalationResult = z.infer<typeof EscalationResultSchema>;

/**
 * Escalation attempt schema.
 *
 * Records a single execution attempt with its outcome.
 *
 * @example
 * {
 *   attempt: 1,
 *   harness: "claude",
 *   model: "haiku-4.5",
 *   result: "failure",
 *   error: "Task too complex",
 *   cost: 0.02,
 *   duration: 45000
 * }
 */
export const EscalationAttemptSchema = z.object({
  /** Attempt number (1-indexed) */
  attempt: z.number().int().min(1),
  /** Harness used for this attempt */
  harness: HarnessNameSchema,
  /** Model used for this attempt */
  model: z.string(),
  /** Result of the attempt */
  result: EscalationResultSchema,
  /** Error message if the attempt failed (optional) */
  error: z.string().optional(),
  /** Actual cost for this attempt in USD */
  cost: z.number().nonnegative(),
  /** Duration of the attempt in milliseconds */
  duration: z.number().nonnegative(),
});

export type EscalationAttempt = z.infer<typeof EscalationAttemptSchema>;

/**
 * Execution history schema for user stories.
 *
 * Contains execution details after the story has been executed,
 * including escalation attempts and actual costs.
 *
 * @example
 * {
 *   attempts: 2,
 *   escalations: [...],
 *   actualCost: 0.17,
 *   actualHarness: "claude",
 *   actualModel: "sonnet-4.5",
 *   inputTokens: 5000,
 *   outputTokens: 3000
 * }
 */
export const ExecutionHistorySchema = z.object({
  /** Total number of attempts made */
  attempts: z.number().int().min(1),
  /** Array of escalation attempts with details */
  escalations: z.array(EscalationAttemptSchema),
  /** Total actual cost across all attempts in USD */
  actualCost: z.number().nonnegative(),
  /** Final harness that successfully completed the story */
  actualHarness: HarnessNameSchema,
  /** Final model that successfully completed the story */
  actualModel: z.string(),
  /** Total input tokens used across all attempts (optional) */
  inputTokens: z.number().nonnegative().optional(),
  /** Total output tokens used across all attempts (optional) */
  outputTokens: z.number().nonnegative().optional(),
});

export type ExecutionHistory = z.infer<typeof ExecutionHistorySchema>;

// ============================================================================
// User Story Schema
// ============================================================================

/**
 * User story schema
 */
export const UserStorySchema = z.object({
  id: z.string(), // e.g., "US-001"
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.number().int().nonnegative(), // 0 = highest priority (used by PRIORITY command)
  passes: z.boolean().default(false),
  notes: z.string().default(""),
  dependencies: z.array(z.string()).optional(), // Array of story IDs this story depends on
  parallel: z.boolean().optional(), // Can be executed in parallel with other stories
  phase: z.string().optional(), // Phase marker (e.g., "Setup", "Foundation", "Stories", "Polish")
  research: z.boolean().optional(), // Requires research phase before implementation
  skipped: z.boolean().optional(), // Whether the story was skipped by user command
  // Routing metadata - populated during task planning phase (US-026)
  routing: RoutingMetadataSchema.optional(),
  // Execution history - populated after story execution (US-026)
  execution: ExecutionHistorySchema.optional(),
});

export type UserStory = z.infer<typeof UserStorySchema>;

/**
 * Complete PRD schema
 */
export const PRDSchema = z.object({
  project: z.string(),
  branchName: z.string(),
  description: z.string(),
  userStories: z.array(UserStorySchema),
});

export type PRD = z.infer<typeof PRDSchema>;

/**
 * Validate dependencies and detect circular dependencies
 */
export function validateDependencies(prd: PRD): void {
  const storyMap = new Map<string, UserStory>();
  for (const story of prd.userStories) {
    storyMap.set(story.id, story);
  }

  // Check for invalid dependencies (references to non-existent stories)
  for (const story of prd.userStories) {
    if (story.dependencies) {
      for (const depId of story.dependencies) {
        if (!storyMap.has(depId)) {
          throw new Error(`Story ${story.id} depends on non-existent story ${depId}`);
        }
      }
    }
  }

  // Detect circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(storyId: string, path: string[] = []): boolean {
    if (recursionStack.has(storyId)) {
      const cycle = [...path, storyId].join(" -> ");
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    if (visited.has(storyId)) {
      return false;
    }

    visited.add(storyId);
    recursionStack.add(storyId);

    const story = storyMap.get(storyId);
    if (story?.dependencies) {
      for (const depId of story.dependencies) {
        hasCycle(depId, [...path, storyId]);
      }
    }

    recursionStack.delete(storyId);
    return false;
  }

  for (const story of prd.userStories) {
    hasCycle(story.id);
  }
}

/**
 * Check if a story's dependencies are all completed
 */
function areDependenciesMet(story: UserStory, prd: PRD): boolean {
  if (!story.dependencies || story.dependencies.length === 0) {
    return true;
  }

  const storyMap = new Map<string, UserStory>();
  for (const s of prd.userStories) {
    storyMap.set(s.id, s);
  }

  return story.dependencies.every((depId) => {
    const depStory = storyMap.get(depId);
    return depStory?.passes ?? false;
  });
}

/**
 * Get the next story to work on
 */
export function getNextStory(prd: PRD): UserStory | null {
  // Validate dependencies first
  validateDependencies(prd);

  // Find highest priority story where passes is false, not skipped, and dependencies are met
  const pendingStories = prd.userStories
    .filter((s) => !s.passes && !s.skipped && areDependenciesMet(s, prd))
    .sort((a, b) => a.priority - b.priority);

  return pendingStories[0] ?? null;
}

/**
 * Check if all stories are complete
 */
export function isComplete(prd: PRD): boolean {
  return prd.userStories.every((s) => s.passes);
}

/**
 * Count stories by status
 */
export function countStories(prd: PRD): { total: number; completed: number; skipped: number; pending: number } {
  const total = prd.userStories.length;
  const completed = prd.userStories.filter((s) => s.passes).length;
  const skipped = prd.userStories.filter((s) => s.skipped && !s.passes).length;
  const pending = total - completed - skipped;
  return { total, completed, skipped, pending };
}

/**
 * Infer the story type from title and description
 */
export function inferStoryType(story: UserStory): string {
  const text = `${story.title} ${story.description}`.toLowerCase();

  if (text.includes("database") || text.includes("migration") || text.includes("schema") || text.includes("table")) {
    return "database";
  }
  if (text.includes("ui") || text.includes("component") || text.includes("browser") || text.includes("frontend") || text.includes("page")) {
    return "ui";
  }
  if (text.includes("api") || text.includes("endpoint") || text.includes("server") || text.includes("route")) {
    return "api";
  }
  if (text.includes("test") || text.includes("spec") || text.includes("coverage")) {
    return "test";
  }
  if (text.includes("refactor") || text.includes("cleanup") || text.includes("reorganize")) {
    return "refactor";
  }
  if (text.includes("doc") || text.includes("readme") || text.includes("comment")) {
    return "docs";
  }

  return "general";
}
