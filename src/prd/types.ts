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
 * Get the next story to work on
 */
export function getNextStory(prd: PRD): UserStory | null {
  // Find highest priority story where passes is false
  const pendingStories = prd.userStories
    .filter((s) => !s.passes)
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
