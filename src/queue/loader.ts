/**
 * Queue Loader
 *
 * Functions for loading queue state from files.
 * Handles pending and processed items with graceful error handling.
 *
 * Queue file locations:
 * - Pending: <featurePath>/.queue.txt
 * - Processed: <featurePath>/.queue.processed.txt
 */

import { join } from "node:path";
import type { QueueItem, QueueState } from "./types";
import { parseQueueLine } from "./parser";

/** Pending queue file name */
const QUEUE_FILE = ".queue.txt";

/** Processed queue file name */
const QUEUE_PROCESSED_FILE = ".queue.processed.txt";

/**
 * Load queue state from files
 *
 * @param featurePath - Path to the feature directory
 * @returns QueueState with pending and processed items
 */
export async function loadQueue(featurePath: string): Promise<QueueState> {
  const pendingPath = join(featurePath, QUEUE_FILE);
  const processedPath = join(featurePath, QUEUE_PROCESSED_FILE);

  const warnings: string[] = [];

  // Load pending items
  const pending = await loadQueueFile(pendingPath, warnings);

  // Load processed items
  const processed = await loadQueueFile(processedPath, warnings);

  // Build state
  const state: QueueState = {
    featurePath,
    pending,
    processed,
    lastChecked: new Date().toISOString(),
  };

  // Only include warnings if there are any
  if (warnings.length > 0) {
    state.warnings = warnings;
  }

  return state;
}

/**
 * Load items from a queue file
 *
 * @param filePath - Path to the queue file
 * @param warnings - Array to collect warnings for malformed lines
 * @returns Array of QueueItems
 */
async function loadQueueFile(
  filePath: string,
  warnings: string[]
): Promise<QueueItem[]> {
  const file = Bun.file(filePath);

  // Handle missing file gracefully
  if (!(await file.exists())) {
    return [];
  }

  const content = await file.text();
  const lines = content.split("\n");
  const items: QueueItem[] = [];

  for (const line of lines) {
    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Try to parse the line
    const item = parseQueueLine(trimmed);

    if (item) {
      items.push(item);
    } else {
      // Record warning for malformed line
      warnings.push(`Skipped malformed line: ${trimmed}`);
    }
  }

  return items;
}
