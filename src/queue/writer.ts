/**
 * Queue Writer
 *
 * Functions for writing to the queue file.
 * Uses atomic writes (temp file + rename) to prevent corruption.
 *
 * Queue file location: <featurePath>/.queue.txt
 */

import { join } from "node:path";
import { rename, unlink } from "node:fs/promises";
import type { QueueItem } from "./types";
import { parseQueueLine, parseCommand, formatQueueLine } from "./parser";

/** Queue file name */
const QUEUE_FILE = ".queue.txt";

/**
 * Add an item to the queue
 *
 * @param featurePath - Path to the feature directory
 * @param content - The content to add (text prompt or command)
 * @returns The added QueueItem
 */
export async function addToQueue(
  featurePath: string,
  content: string
): Promise<QueueItem> {
  const queuePath = join(featurePath, QUEUE_FILE);
  const timestamp = new Date().toISOString();

  // Create the queue item
  const parsedCommand = parseCommand(content);
  const id = `${timestamp.replace(/[:.]/g, "-")}-${Date.now() % 1000}`;

  const item: QueueItem = parsedCommand
    ? {
        id,
        content,
        type: "command",
        command: parsedCommand.type,
        targetStoryId: parsedCommand.storyId,
        addedAt: timestamp,
      }
    : {
        id,
        content,
        type: "prompt",
        addedAt: timestamp,
      };

  // Format the line to add
  const newLine = formatQueueLine(item) + "\n";

  // Read existing content (if any)
  let existingContent = "";
  const queueFile = Bun.file(queuePath);
  if (await queueFile.exists()) {
    existingContent = await queueFile.text();
  }

  // Atomic write: write to temp file, then rename
  const tempPath = `${queuePath}.tmp`;
  const newContent = existingContent + newLine;

  await Bun.write(tempPath, newContent);
  await rename(tempPath, queuePath);

  return item;
}

/**
 * Remove an item from the queue by index (1-based)
 *
 * @param featurePath - Path to the feature directory
 * @param index - 1-based index of the item to remove
 * @returns The removed QueueItem, or null if index is invalid
 */
export async function removeFromQueue(
  featurePath: string,
  index: number
): Promise<QueueItem | null> {
  const queuePath = join(featurePath, QUEUE_FILE);

  // Validate index
  if (index < 1) {
    return null;
  }

  // Read existing content
  const queueFile = Bun.file(queuePath);
  if (!(await queueFile.exists())) {
    return null;
  }

  const content = await queueFile.text();
  const lines = content.split("\n").filter((line) => line.trim());

  // Validate index against queue length
  if (index > lines.length) {
    return null;
  }

  // Empty queue
  if (lines.length === 0) {
    return null;
  }

  // Parse the item being removed
  const removedLine = lines[index - 1];
  const removedItem = parseQueueLine(removedLine);

  if (!removedItem) {
    return null;
  }

  // Remove the item
  const newLines = lines.filter((_, i) => i !== index - 1);
  const newContent = newLines.length > 0 ? newLines.join("\n") + "\n" : "";

  // Atomic write
  const tempPath = `${queuePath}.tmp`;
  await Bun.write(tempPath, newContent);
  await rename(tempPath, queuePath);

  return removedItem;
}

/**
 * Clear all items from the queue
 *
 * @param featurePath - Path to the feature directory
 * @returns Number of items cleared
 */
export async function clearQueue(featurePath: string): Promise<number> {
  const queuePath = join(featurePath, QUEUE_FILE);

  // Read existing content to count items
  const queueFile = Bun.file(queuePath);
  let count = 0;

  if (await queueFile.exists()) {
    const content = await queueFile.text();
    const lines = content.split("\n").filter((line) => line.trim());

    // Count valid queue lines
    for (const line of lines) {
      const item = parseQueueLine(line);
      if (item) {
        count++;
      }
    }
  }

  // Write empty file (atomic)
  const tempPath = `${queuePath}.tmp`;
  await Bun.write(tempPath, "");
  await rename(tempPath, queuePath);

  // Clean up any lingering temp file (shouldn't exist, but just in case)
  try {
    await unlink(`${queuePath}.tmp`);
  } catch {
    // Ignore if temp file doesn't exist
  }

  return count;
}
