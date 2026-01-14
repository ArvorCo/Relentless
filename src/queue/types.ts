/**
 * Queue Types
 *
 * Defines Zod schemas and TypeScript types for the queue system.
 * Used for validating queue items, commands, and state.
 */

import { z } from "zod";

/**
 * Valid queue command types
 */
export const QueueCommandTypeSchema = z.enum(["PAUSE", "SKIP", "PRIORITY", "ABORT"]);
export type QueueCommandType = z.infer<typeof QueueCommandTypeSchema>;

/**
 * Queue item type - either a text prompt or a structured command
 */
export const QueueItemTypeSchema = z.enum(["prompt", "command"]);
export type QueueItemType = z.infer<typeof QueueItemTypeSchema>;

/**
 * A single queue item
 */
export const QueueItemSchema = z.object({
  /** Unique ID (timestamp-based) */
  id: z.string(),
  /** Raw content from file */
  content: z.string(),
  /** Type of item */
  type: QueueItemTypeSchema,
  /** Parsed command type (if type is "command") */
  command: QueueCommandTypeSchema.optional(),
  /** Target story ID (for SKIP/PRIORITY) */
  targetStoryId: z.string().optional(),
  /** When item was added (ISO timestamp) */
  addedAt: z.string().datetime(),
  /** When item was processed (ISO timestamp, null if pending) */
  processedAt: z.string().datetime().optional(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

/**
 * Queue state for a feature
 */
export const QueueStateSchema = z.object({
  /** Path to feature directory */
  featurePath: z.string(),
  /** Pending items */
  pending: z.array(QueueItemSchema),
  /** Processed items (audit trail) */
  processed: z.array(QueueItemSchema),
  /** Last time queue was checked (ISO timestamp) */
  lastChecked: z.string().datetime().optional(),
  /** Warnings from loading (e.g., malformed lines) */
  warnings: z.array(z.string()).optional(),
});
export type QueueState = z.infer<typeof QueueStateSchema>;

/**
 * Result of processing queue commands
 */
export interface QueueProcessResult {
  /** Text prompts to inject into agent context */
  prompts: string[];
  /** Commands to execute */
  commands: Array<{
    type: QueueCommandType;
    storyId?: string;
  }>;
  /** Warnings (e.g., unrecognized commands treated as prompts) */
  warnings: string[];
}

/**
 * Parsed command result from parseCommand
 */
export interface ParsedCommand {
  type: QueueCommandType;
  storyId?: string;
}
