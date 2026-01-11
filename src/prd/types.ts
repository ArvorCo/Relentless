/**
 * PRD Types
 *
 * Defines the structure of prd.json for user stories
 */

import { z } from "zod";

/**
 * User story schema
 */
export const UserStorySchema = z.object({
  id: z.string(), // e.g., "US-001"
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.number().int().positive(),
  passes: z.boolean().default(false),
  notes: z.string().default(""),
  dependencies: z.array(z.string()).optional(), // Array of story IDs this story depends on
  parallel: z.boolean().optional(), // Can be executed in parallel with other stories
  phase: z.string().optional(), // Phase marker (e.g., "Setup", "Foundation", "Stories", "Polish")
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

  // Find highest priority story where passes is false and dependencies are met
  const pendingStories = prd.userStories
    .filter((s) => !s.passes && areDependenciesMet(s, prd))
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
export function countStories(prd: PRD): { total: number; completed: number; pending: number } {
  const total = prd.userStories.length;
  const completed = prd.userStories.filter((s) => s.passes).length;
  const pending = total - completed;
  return { total, completed, pending };
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
