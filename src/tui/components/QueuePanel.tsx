/**
 * Queue Panel Component
 *
 * Displays pending queue items in the TUI.
 * Provides formatting functions and file watching capabilities.
 */

import React from "react";
import { Box, Text } from "ink";
import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { colors, symbols } from "../theme.js";
import { loadQueue } from "../../queue/index.js";
import type { QueueItem } from "../../queue/types.js";

/** Refresh interval for queue panel in milliseconds */
export const QUEUE_PANEL_REFRESH_INTERVAL = 500;

/** Formatted queue panel item for display */
export interface QueuePanelItem {
  index: number;
  content: string;
  type: "prompt" | "command";
  isCommand: boolean;
}

/** Result of formatting queue items for panel display */
export interface QueuePanelFormatResult {
  isEmpty: boolean;
  message?: string;
  items: QueuePanelItem[];
}

/** Options for formatting queue panel */
export interface FormatQueueOptions {
  maxContentLength?: number;
}

/**
 * Formats queue items for panel display.
 * Handles empty queue, truncation, and command marking.
 */
export function formatQueueForPanel(
  items: QueueItem[],
  options?: FormatQueueOptions
): QueuePanelFormatResult {
  if (items.length === 0) {
    return {
      isEmpty: true,
      message: "Queue empty",
      items: [],
    };
  }

  const maxLength = options?.maxContentLength;

  const formattedItems: QueuePanelItem[] = items.map((item, index) => {
    let content = item.content;

    // Truncate if needed
    if (maxLength && content.length > maxLength) {
      content = content.slice(0, maxLength) + "...";
    }

    return {
      index: index + 1,
      content,
      type: item.type,
      isCommand: item.type === "command",
    };
  });

  return {
    isEmpty: false,
    items: formattedItems,
  };
}

/**
 * Loads queue items from a feature path for TUI display.
 * Returns empty array if queue file doesn't exist.
 */
export async function loadQueueForTUI(featurePath: string): Promise<QueueItem[]> {
  try {
    const queueState = await loadQueue(featurePath);
    return queueState.pending;
  } catch {
    return [];
  }
}

/**
 * Starts watching the queue file for changes.
 * Returns a watcher that can be stopped with stopWatchingQueue.
 */
export function watchQueueFile(
  featurePath: string,
  callback: () => void
): FSWatcher {
  const queueFilePath = join(featurePath, ".queue.txt");
  const watcher = watch(queueFilePath, { persistent: false }, () => {
    callback();
  });
  return watcher;
}

/**
 * Stops watching the queue file.
 */
export function stopWatchingQueue(watcher: FSWatcher): void {
  watcher.close();
}

/** Props for QueuePanel component */
interface QueuePanelProps {
  items: QueueItem[];
  maxItems?: number;
}

/**
 * Queue Panel Component
 *
 * Displays pending queue items in the TUI.
 */
export function QueuePanel({
  items,
  maxItems = 5,
}: QueuePanelProps): React.ReactElement {
  const formatted = formatQueueForPanel(items, { maxContentLength: 40 });
  const displayItems = formatted.items.slice(0, maxItems);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color={colors.accent} bold>
          {symbols.bullet} Queue
        </Text>
        {!formatted.isEmpty && (
          <Text color={colors.dim}> ({items.length} items)</Text>
        )}
      </Box>

      {formatted.isEmpty ? (
        <Box paddingLeft={2}>
          <Text color={colors.dim}>{formatted.message}</Text>
        </Box>
      ) : (
        displayItems.map((item) => (
          <Box key={item.index} paddingLeft={2}>
            <Text color={colors.dim}>{item.index}. </Text>
            {item.isCommand ? (
              <Text color={colors.warning}>{item.content}</Text>
            ) : (
              <Text>{item.content}</Text>
            )}
          </Box>
        ))
      )}

      {!formatted.isEmpty && items.length > maxItems && (
        <Box paddingLeft={2}>
          <Text color={colors.dim}>
            ... and {items.length - maxItems} more
          </Text>
        </Box>
      )}
    </Box>
  );
}
