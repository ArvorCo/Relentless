/**
 * Queue Processor
 *
 * Processes pending queue items for orchestration.
 * Separates text prompts from structured commands.
 * Moves processed items to .queue.processed.txt with timestamp.
 *
 * Queue file locations:
 * - Pending: <featurePath>/.queue.txt
 * - Processed: <featurePath>/.queue.processed.txt
 */

import { join } from "node:path";
import { rename } from "node:fs/promises";
import type { QueueItem, QueueProcessResult, QueueCommandType } from "./types";
import { parseQueueLine, formatQueueLine } from "./parser";

/** Pending queue file name */
const QUEUE_FILE = ".queue.txt";

/** Processed queue file name */
const QUEUE_PROCESSED_FILE = ".queue.processed.txt";

/**
 * Process all pending queue items
 *
 * @param featurePath - Path to the feature directory
 * @returns QueueProcessResult with prompts, commands, and warnings
 */
export async function processQueue(
  featurePath: string
): Promise<QueueProcessResult> {
  const queuePath = join(featurePath, QUEUE_FILE);
  const processedPath = join(featurePath, QUEUE_PROCESSED_FILE);

  const result: QueueProcessResult = {
    prompts: [],
    commands: [],
    warnings: [],
  };

  // Check if queue file exists
  const queueFile = Bun.file(queuePath);
  if (!(await queueFile.exists())) {
    return result;
  }

  // Read queue content
  const content = await queueFile.text();
  const lines = content.split("\n");

  // Parse all valid items
  const items: QueueItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines silently
    if (!trimmed) {
      continue;
    }

    const item = parseQueueLine(trimmed);

    if (item) {
      items.push(item);
    } else {
      // Record warning for malformed lines
      result.warnings.push(`Skipped malformed line: ${trimmed}`);
    }
  }

  // If no items to process, return early
  if (items.length === 0) {
    return result;
  }

  // Process items and separate prompts from commands
  const processedAt = new Date().toISOString();

  for (const item of items) {
    // Add processedAt timestamp
    item.processedAt = processedAt;

    if (item.type === "command" && item.command) {
      // Structured command
      const command: { type: QueueCommandType; storyId?: string } = {
        type: item.command,
      };

      if (item.targetStoryId) {
        command.storyId = item.targetStoryId;
      }

      result.commands.push(command);
    } else {
      // Text prompt - trim any trailing whitespace
      result.prompts.push(item.content.trim());
    }
  }

  // Move processed items to .queue.processed.txt
  await appendToProcessedFile(processedPath, items);

  // Clear the queue file (atomic write)
  const tempPath = `${queuePath}.tmp`;
  await Bun.write(tempPath, "");
  await rename(tempPath, queuePath);

  return result;
}

/**
 * Append processed items to the processed queue file
 *
 * @param processedPath - Path to the processed queue file
 * @param items - Items to append with processedAt timestamps
 */
async function appendToProcessedFile(
  processedPath: string,
  items: QueueItem[]
): Promise<void> {
  // Read existing content (if any)
  let existingContent = "";
  const processedFile = Bun.file(processedPath);
  if (await processedFile.exists()) {
    existingContent = await processedFile.text();
  }

  // Format new lines with processedAt marker
  const newLines = items.map((item) => {
    const baseLine = formatQueueLine(item);
    return `${baseLine} | processedAt:${item.processedAt}`;
  });

  // Combine and write atomically
  const newContent = existingContent + newLines.join("\n") + "\n";
  const tempPath = `${processedPath}.tmp`;
  await Bun.write(tempPath, newContent);
  await rename(tempPath, processedPath);
}
