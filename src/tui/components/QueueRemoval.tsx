/**
 * Queue Removal Component
 *
 * Provides queue item removal functionality for the TUI.
 * - Pressing 'd' key followed by a number removes that item
 * - Pressing 'D' (shift+d) clears all items with confirmation
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import { removeFromQueue, clearQueue } from "../../queue/index.js";

/** State for queue removal mode */
export interface QueueRemovalState {
  /** Whether delete mode is active (waiting for number input) */
  deleteMode: boolean;
  /** Whether confirm clear dialog is active */
  confirmClearActive: boolean;
}

/** Extended state including queueInputActive for conflict detection */
interface QueueRemovalInputState extends QueueRemovalState {
  /** Whether queue input mode is active (prevents deletion shortcuts) */
  queueInputActive: boolean;
}

/** Result from handleQueueDeletionKeypress */
export interface QueueDeletionKeypressResult extends QueueRemovalState {
  /** Index to remove (1-based), only set when a valid number is pressed */
  removeIndex?: number;
  /** Whether to clear all items */
  clearAll?: boolean;
  /** Message to display to user */
  message?: string;
}

/** Result from removeQueueItem */
export interface RemoveQueueItemResult {
  success: boolean;
  removedContent?: string;
  error?: string;
}

/** Result from clearQueueItems */
export interface ClearQueueItemsResult {
  success: boolean;
  clearedCount: number;
  error?: string;
}

/** Formatted removal state for display */
export interface RemovalStateFormatted {
  prompt: string;
  showPrompt: boolean;
}

/**
 * Handles keypress events for queue removal.
 * Returns the new state after processing the keypress.
 *
 * @param key - The key that was pressed
 * @param state - Current removal state
 * @param isCtrl - Whether a control key modifier was pressed
 * @param queueLength - Number of items in the queue
 * @returns New state after processing keypress
 */
export function handleQueueDeletionKeypress(
  key: string,
  state: QueueRemovalInputState,
  isCtrl: boolean,
  queueLength: number
): QueueDeletionKeypressResult {
  // Don't handle keys when queue input is active
  if (state.queueInputActive) {
    return { deleteMode: state.deleteMode, confirmClearActive: state.confirmClearActive };
  }

  // Handle confirm clear dialog
  if (state.confirmClearActive) {
    const lowerKey = key.toLowerCase();

    if (lowerKey === "y") {
      return {
        deleteMode: false,
        confirmClearActive: false,
        clearAll: true,
      };
    }

    if (lowerKey === "n" || lowerKey === "escape") {
      return {
        deleteMode: false,
        confirmClearActive: false,
      };
    }

    // Ignore other keys in confirm mode
    return { deleteMode: false, confirmClearActive: true };
  }

  // Handle delete mode (waiting for number)
  if (state.deleteMode) {
    const lowerKey = key.toLowerCase();

    if (lowerKey === "escape") {
      return { deleteMode: false, confirmClearActive: false };
    }

    // Check if key is a number 1-9
    const num = parseInt(key, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      if (num > queueLength) {
        return {
          deleteMode: false,
          confirmClearActive: false,
          message: `Invalid index: ${num}. Queue has ${queueLength} items`,
        };
      }

      return {
        deleteMode: false,
        confirmClearActive: false,
        removeIndex: num,
      };
    }

    // Ignore other keys in delete mode
    return { deleteMode: true, confirmClearActive: false };
  }

  // Not in any special mode, check for activation keys
  if (key === "d") {
    if (queueLength === 0) {
      return {
        deleteMode: false,
        confirmClearActive: false,
        message: "Queue already empty",
      };
    }

    return { deleteMode: true, confirmClearActive: false };
  }

  if (key === "D") {
    if (queueLength === 0) {
      return {
        deleteMode: false,
        confirmClearActive: false,
        message: "Queue already empty",
      };
    }

    return { deleteMode: false, confirmClearActive: true };
  }

  // No change
  return { deleteMode: state.deleteMode, confirmClearActive: state.confirmClearActive };
}

/**
 * Removes an item from the queue by index.
 *
 * @param featurePath - Path to the feature directory
 * @param index - 1-based index of item to remove
 * @returns Result of the removal
 */
export async function removeQueueItem(
  featurePath: string,
  index: number
): Promise<RemoveQueueItemResult> {
  try {
    // Check if queue is empty first
    const { loadQueue } = await import("../../queue/index.js");
    const state = await loadQueue(featurePath);

    if (state.pending.length === 0) {
      return {
        success: false,
        error: "Queue is empty",
      };
    }

    if (index < 1 || index > state.pending.length) {
      return {
        success: false,
        error: `Invalid index: ${index}. Queue has ${state.pending.length} items`,
      };
    }

    const removedItem = await removeFromQueue(featurePath, index);

    if (!removedItem) {
      return {
        success: false,
        error: "Failed to remove item",
      };
    }

    return {
      success: true,
      removedContent: removedItem.content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clears all items from the queue.
 *
 * @param featurePath - Path to the feature directory
 * @returns Result of the clear operation
 */
export async function clearQueueItems(
  featurePath: string
): Promise<ClearQueueItemsResult> {
  try {
    const count = await clearQueue(featurePath);

    return {
      success: true,
      clearedCount: count,
    };
  } catch (error) {
    return {
      success: false,
      clearedCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Formats the removal state for display in the TUI.
 *
 * @param state - Current removal state
 * @returns Formatted state for display
 */
export function formatRemovalState(state: QueueRemovalState): RemovalStateFormatted {
  if (state.deleteMode) {
    return {
      prompt: "Enter number to remove (1-9) or Esc to cancel",
      showPrompt: true,
    };
  }

  if (state.confirmClearActive) {
    return {
      prompt: "Clear all items? (y/n)",
      showPrompt: true,
    };
  }

  return {
    prompt: "",
    showPrompt: false,
  };
}

/** Props for QueueRemovalPrompt component */
interface QueueRemovalPromptProps {
  /** Whether delete mode is active */
  deleteMode: boolean;
  /** Whether confirm clear dialog is active */
  confirmClearActive: boolean;
  /** Status message to display */
  statusMessage?: string;
}

/**
 * Queue Removal Prompt Component
 *
 * Displays prompts for delete mode and clear confirmation.
 * Only visible when deleteMode or confirmClearActive is true.
 */
export function QueueRemovalPrompt({
  deleteMode,
  confirmClearActive,
  statusMessage,
}: QueueRemovalPromptProps): React.ReactElement | null {
  const formatted = formatRemovalState({ deleteMode, confirmClearActive });

  if (statusMessage) {
    return (
      <Box paddingX={1}>
        <Text color={colors.warning}>{statusMessage}</Text>
      </Box>
    );
  }

  if (!formatted.showPrompt) {
    return null;
  }

  return (
    <Box paddingX={1}>
      <Text color={colors.accent} bold>
        {formatted.prompt}
      </Text>
    </Box>
  );
}
