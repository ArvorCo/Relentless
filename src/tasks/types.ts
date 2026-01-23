/**
 * Claude Code Tasks Types
 *
 * Type definitions and Zod schemas for Claude Code's Tasks feature.
 * Tasks are a native primitive for tracking work across sessions and subagents.
 *
 * @see https://docs.anthropic.com/claude-code
 */

import { z } from "zod";

/**
 * Task status values
 */
export type TaskStatus = "pending" | "in_progress" | "completed";

/**
 * Claude Task Schema
 *
 * Represents a single task in Claude's task list.
 * Based on the TodoWrite tool's task structure.
 */
export const ClaudeTaskSchema = z.object({
  /** Unique task identifier */
  id: z.string(),
  /** Task description (imperative form) */
  content: z.string(),
  /** Present continuous form for display during execution */
  activeForm: z.string(),
  /** Current status */
  status: z.enum(["pending", "in_progress", "completed"]),
  /** Optional link to Relentless story ID */
  storyId: z.string().optional(),
  /** Task IDs this task depends on */
  dependencies: z.array(z.string()).optional(),
  /** When the task was created */
  createdAt: z.string().optional(),
  /** When the task was last updated */
  updatedAt: z.string().optional(),
});

export type ClaudeTask = z.infer<typeof ClaudeTaskSchema>;

/**
 * TaskList Schema
 *
 * Represents a complete task list for a feature.
 * Stored in ~/.claude/tasks/{id}.json
 */
export const TaskListSchema = z.object({
  /** TaskList identifier (e.g., "relentless-auth") */
  id: z.string(),
  /** Human-readable name */
  name: z.string().optional(),
  /** Associated feature name in Relentless */
  featureName: z.string().optional(),
  /** All tasks in this list */
  tasks: z.array(ClaudeTaskSchema),
  /** When the task list was created */
  createdAt: z.string(),
  /** When the task list was last updated */
  updatedAt: z.string(),
  /** Metadata for sync tracking */
  metadata: z.object({
    /** Source of the task list */
    source: z.enum(["relentless", "claude", "manual"]).optional(),
    /** Last sync timestamp with PRD */
    lastPrdSync: z.string().optional(),
    /** PRD path if synced from PRD */
    prdPath: z.string().optional(),
  }).optional(),
});

export type TaskList = z.infer<typeof TaskListSchema>;

/**
 * TaskList Summary
 *
 * Quick overview of a task list's status.
 */
export interface TaskListSummary {
  id: string;
  name?: string;
  featureName?: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync Result
 *
 * Result of syncing tasks with PRD.
 */
export interface SyncResult {
  success: boolean;
  /** Tasks added during sync */
  added: number;
  /** Tasks updated during sync */
  updated: number;
  /** Tasks removed during sync */
  removed: number;
  /** Errors encountered */
  errors: string[];
  /** Warnings during sync */
  warnings: string[];
}

/**
 * Import Result
 *
 * Result of importing Claude tasks to PRD format.
 */
export interface ImportResult {
  success: boolean;
  /** Number of stories created */
  storiesCreated: number;
  /** Path to the created PRD file */
  prdPath?: string;
  /** Errors encountered */
  errors: string[];
}

/**
 * TaskList ID format
 *
 * Generates a TaskList ID for a feature.
 * Format: relentless-{feature-name}
 */
export function generateTaskListId(featureName: string): string {
  // Sanitize feature name: lowercase, replace spaces/special chars with hyphens
  const sanitized = featureName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `relentless-${sanitized}`;
}

/**
 * Task list directory path
 */
export function getTasksDirectory(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return `${home}/.claude/tasks`;
}

/**
 * Task list file path
 */
export function getTaskListPath(taskListId: string): string {
  return `${getTasksDirectory()}/${taskListId}.json`;
}
