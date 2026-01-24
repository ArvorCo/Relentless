/**
 * Queue Input Component
 *
 * Provides an input field for adding items to the queue from the TUI.
 * Activated by pressing 'q', submitted with Enter, cancelled with Escape.
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import { addToQueue } from "../../queue/index.js";

/** State for queue input component */
export interface QueueInputState {
  /** Whether input mode is active */
  active: boolean;
  /** Current input value */
  value: string;
}

/** Result from handleQueueKeypress */
export interface QueueKeypressResult extends QueueInputState {
  /** Value to submit to queue (only set when enter pressed with non-empty value) */
  submit?: string;
}

/** Formatted input for display */
export interface QueueInputFormatted {
  prompt: string;
  value: string;
  cursor: string;
}

/** Result from submitToQueue */
export interface QueueSubmitResult {
  success: boolean;
  error?: string;
}

/**
 * Handles keypress events for queue input.
 * Returns the new state after processing the keypress.
 *
 * @param key - The key that was pressed
 * @param state - Current input state
 * @param isCtrl - Whether a control key modifier was pressed
 * @returns New state after processing keypress
 */
export function handleQueueKeypress(
  key: string,
  state: QueueInputState,
  isCtrl: boolean
): QueueKeypressResult {
  // If not active, only 'q' activates input mode
  if (!state.active) {
    if (key === "q") {
      return { active: true, value: "" };
    }
    return { ...state };
  }

  // Handle special keys when active
  const lowerKey = key.toLowerCase();

  if (lowerKey === "escape") {
    return { active: false, value: "" };
  }

  if (lowerKey === "return") {
    if (state.value.trim() === "") {
      // Don't submit empty values
      return { ...state };
    }
    return { active: false, value: "", submit: state.value };
  }

  if (lowerKey === "backspace") {
    return { ...state, value: state.value.slice(0, -1) };
  }

  // Ignore control keys and special keys
  if (isCtrl || lowerKey === "tab" || lowerKey === "up" || lowerKey === "down" || lowerKey === "left" || lowerKey === "right") {
    return { ...state };
  }

  // Add printable character to value
  if (key.length === 1) {
    return { ...state, value: state.value + key };
  }

  return { ...state };
}

/**
 * Formats the input for display in the TUI.
 *
 * @param value - Current input value
 * @returns Formatted components for display
 */
export function formatQueueInput(value: string): QueueInputFormatted {
  return {
    prompt: "Queue:",
    value,
    cursor: "_",
  };
}

/**
 * Submits a value to the queue.
 *
 * @param featurePath - Path to the feature directory
 * @param value - Value to add to the queue
 * @returns Result of the submission
 */
export async function submitToQueue(
  featurePath: string,
  value: string
): Promise<QueueSubmitResult> {
  try {
    await addToQueue(featurePath, value);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Props for QueueInput component */
interface QueueInputProps {
  /** Whether input mode is active */
  active: boolean;
  /** Current input value */
  value: string;
}

/**
 * Queue Input Component
 *
 * Displays a full-width input field at the bottom of the TUI for adding items to the queue.
 * Styled like Claude Code's input area with horizontal borders.
 */
export function QueueInput({ active, value }: QueueInputProps): React.ReactElement | null {
  if (!active) {
    // Show hint when not active
    return (
      <Box flexDirection="column" width="100%">
        <Box width="100%">
          <Text color={colors.dim}>{"─".repeat(80)}</Text>
        </Box>
        <Box paddingX={1}>
          <Text color={colors.dim}>Press 'q' to add to queue, 'd' to delete, 'D' to clear</Text>
        </Box>
        <Box width="100%">
          <Text color={colors.dim}>{"─".repeat(80)}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      <Box width="100%">
        <Text color={colors.accent}>{"─".repeat(80)}</Text>
      </Box>
      <Box paddingX={1} width="100%">
        <Text color={colors.accent} bold>❯ </Text>
        <Text>{value}</Text>
        <Text color={colors.accent}>█</Text>
      </Box>
      <Box width="100%">
        <Text color={colors.accent}>{"─".repeat(80)}</Text>
      </Box>
    </Box>
  );
}
