/**
 * CLI Queue Functions
 *
 * Functions for queue CLI commands.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { findRelentlessDir } from "../config";
import {
  addToQueue,
  loadQueue,
  removeFromQueue,
  clearQueue,
  type QueueItem,
} from "../queue";

/** Result of a queue add operation */
export interface QueueAddResult {
  success: boolean;
  message?: string;
  error?: string;
}

/** Options for queueAdd function */
export interface QueueAddOptions {
  message: string;
  featurePath: string;
}

/** Result of resolving a feature path */
export interface ResolveFeaturePathResult {
  path?: string;
  error?: string;
}

/**
 * Resolves the feature path from a working directory and feature name.
 *
 * @param workingDir - The working directory (project root)
 * @param featureName - The feature name
 * @returns The resolved feature path or an error
 */
export async function resolveFeaturePath(
  workingDir: string,
  featureName: string
): Promise<ResolveFeaturePathResult> {
  const relentlessDir = findRelentlessDir(workingDir);

  if (!relentlessDir) {
    return {
      error: "Relentless not initialized. Run: relentless init",
    };
  }

  const featurePath = join(relentlessDir, "features", featureName);

  if (!existsSync(featurePath)) {
    return {
      error: `Feature '${featureName}' not found`,
    };
  }

  return { path: featurePath };
}

/**
 * Adds a message to the queue for a feature.
 *
 * @param options - The queue add options
 * @returns The result of the operation
 */
export async function queueAdd(options: QueueAddOptions): Promise<QueueAddResult> {
  const { message, featurePath } = options;

  // Validate feature path exists
  if (!existsSync(featurePath)) {
    return {
      success: false,
      error: `Feature path not found: ${featurePath}`,
    };
  }

  try {
    await addToQueue(featurePath, message);

    return {
      success: true,
      message: `Added to queue: ${message}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add to queue: ${(error as Error).message}`,
    };
  }
}

/** Item in queue list output */
export interface QueueListItem {
  index: number;
  timestamp: string;
  content: string;
  type: "prompt" | "command";
}

/** Result of a queue list operation */
export interface QueueListResult {
  success: boolean;
  isEmpty: boolean;
  pendingItems: QueueListItem[];
  processedItems: QueueListItem[];
  featureName?: string;
  error?: string;
}

/** Options for queueList function */
export interface QueueListOptions {
  featurePath: string;
  showAll: boolean;
}

/**
 * Converts a QueueItem to a QueueListItem.
 *
 * @param item - The QueueItem to convert
 * @param index - The 1-based index
 * @returns The QueueListItem
 */
function toQueueListItem(item: QueueItem, index: number): QueueListItem {
  return {
    index,
    timestamp: item.addedAt,
    content: item.content,
    type: item.type,
  };
}

/**
 * Lists queue items for a feature.
 *
 * @param options - The queue list options
 * @returns The result of the operation
 */
export async function queueList(options: QueueListOptions): Promise<QueueListResult> {
  const { featurePath, showAll } = options;

  // Validate feature path exists
  if (!existsSync(featurePath)) {
    return {
      success: false,
      isEmpty: true,
      pendingItems: [],
      processedItems: [],
      error: `Feature path not found: ${featurePath}`,
    };
  }

  try {
    const state = await loadQueue(featurePath);

    const pendingItems = state.pending.map((item, index) =>
      toQueueListItem(item, index + 1)
    );

    const processedItems = showAll
      ? state.processed.map((item, index) => toQueueListItem(item, index + 1))
      : [];

    const isEmpty = pendingItems.length === 0 && processedItems.length === 0;

    return {
      success: true,
      isEmpty,
      pendingItems,
      processedItems,
      featureName: featurePath.split("/").pop(),
    };
  } catch (error) {
    return {
      success: false,
      isEmpty: true,
      pendingItems: [],
      processedItems: [],
      error: `Failed to list queue: ${(error as Error).message}`,
    };
  }
}

/** Options for formatting queue list output */
export interface FormatQueueListOptions {
  success: boolean;
  isEmpty: boolean;
  pendingItems: QueueListItem[];
  processedItems: QueueListItem[];
  featureName: string;
}

/**
 * Formats the time portion of an ISO timestamp.
 *
 * @param timestamp - ISO timestamp string
 * @returns Time in HH:MM format
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "--:--";
  }
}

/**
 * Formats the date portion of an ISO timestamp.
 *
 * @param timestamp - ISO timestamp string
 * @returns Date in YYYY-MM-DD format
 */
function formatDate(timestamp: string): string {
  try {
    return timestamp.split("T")[0];
  } catch {
    return "----:--:--";
  }
}

/**
 * Formats queue list output for display.
 *
 * @param options - The format options
 * @returns Formatted string for display
 */
export function formatQueueList(options: FormatQueueListOptions): string {
  const { isEmpty, pendingItems, processedItems, featureName } = options;

  const lines: string[] = [];

  // Header with feature name
  lines.push(`\nQueue: ${featureName}`);
  lines.push("");

  if (isEmpty) {
    lines.push("Queue is empty");
    lines.push("");
    return lines.join("\n");
  }

  // Pending items
  if (pendingItems.length > 0) {
    lines.push(`Pending (${pendingItems.length} items):`);
    for (const item of pendingItems) {
      const time = formatTime(item.timestamp);
      const date = formatDate(item.timestamp);
      const typeIndicator = item.type === "command" ? " [cmd]" : "";
      lines.push(`  ${item.index}. [${date} ${time}] ${item.content}${typeIndicator}`);
    }
    lines.push("");
  }

  // Processed items
  if (processedItems.length > 0) {
    lines.push(`Processed (${processedItems.length} items):`);
    for (const item of processedItems) {
      const time = formatTime(item.timestamp);
      const date = formatDate(item.timestamp);
      lines.push(`  ${item.index}. [${date} ${time}] ${item.content} ✓`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Result of a queue remove operation */
export interface QueueRemoveResult {
  success: boolean;
  message?: string;
  removedContent?: string;
  error?: string;
}

/** Options for queueRemove function */
export interface QueueRemoveOptions {
  index: number;
  featurePath: string;
}

/**
 * Removes an item from the queue by 1-based index.
 *
 * @param options - The queue remove options
 * @returns The result of the operation
 */
export async function queueRemove(
  options: QueueRemoveOptions
): Promise<QueueRemoveResult> {
  const { index, featurePath } = options;

  // Validate feature path exists
  if (!existsSync(featurePath)) {
    return {
      success: false,
      error: `Feature path not found: ${featurePath}`,
    };
  }

  // Validate index is positive
  if (index < 1) {
    return {
      success: false,
      error: `Invalid index: ${index}. Index must be 1 or greater`,
    };
  }

  // Load queue to check state
  const state = await loadQueue(featurePath);
  const queueLength = state.pending.length;

  // Handle empty queue
  if (queueLength === 0) {
    return {
      success: false,
      error: "Queue is empty",
    };
  }

  // Validate index against queue length
  if (index > queueLength) {
    const itemWord = queueLength === 1 ? "item" : "items";
    return {
      success: false,
      error: `Invalid index: ${index}. Queue has ${queueLength} ${itemWord}`,
    };
  }

  // Remove the item
  const removedItem = await removeFromQueue(featurePath, index);

  if (!removedItem) {
    return {
      success: false,
      error: `Failed to remove item at index ${index}`,
    };
  }

  return {
    success: true,
    message: `Removed: ${removedItem.content}`,
    removedContent: removedItem.content,
  };
}

/** Result of a queue clear operation */
export interface QueueClearResult {
  success: boolean;
  message?: string;
  clearedCount: number;
  error?: string;
}

/** Options for queueClear function */
export interface QueueClearOptions {
  featurePath: string;
}

/**
 * Clears all items from the queue.
 *
 * @param options - The queue clear options
 * @returns The result of the operation
 */
export async function queueClear(
  options: QueueClearOptions
): Promise<QueueClearResult> {
  const { featurePath } = options;

  // Validate feature path exists
  if (!existsSync(featurePath)) {
    return {
      success: false,
      clearedCount: 0,
      error: `Feature path not found: ${featurePath}`,
    };
  }

  // Clear the queue
  const count = await clearQueue(featurePath);

  if (count === 0) {
    return {
      success: true,
      clearedCount: 0,
      message: "Queue is already empty",
    };
  }

  const itemWord = count === 1 ? "item" : "items";
  return {
    success: true,
    clearedCount: count,
    message: `Cleared ${count} ${itemWord} from queue`,
  };
}
