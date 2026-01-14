/**
 * Queue Command Handlers
 *
 * Handles structured commands from the queue system.
 * Implements PAUSE, ABORT, SKIP, and PRIORITY command execution.
 */

import type { QueueCommandType } from "../queue/types";
import { appendProgress } from "../prd/progress";

/**
 * Command action types
 */
export type CommandActionType = "pause" | "abort" | "skip" | "priority" | "none";

/**
 * Pause action returned by handlePauseCommand
 */
export interface PauseAction {
  type: "pause";
  message: string;
  reason?: string;
}

/**
 * Result of executing a pause action
 */
export interface PauseResult {
  resumed: boolean;
}

/**
 * Input function type for pause action
 * Used for dependency injection in tests
 */
export type InputFunction = () => Promise<string>;

/**
 * Check if any PAUSE command exists in the command list
 *
 * @param commands - List of commands from queue processing
 * @returns true if PAUSE command is present
 */
export function shouldPause(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): boolean {
  return commands.some((cmd) => cmd.type === "PAUSE");
}

/**
 * Handle PAUSE command - creates action object
 *
 * @param reason - Optional custom reason for the pause
 * @returns PauseAction object
 */
export function handlePauseCommand(reason?: string): PauseAction {
  const baseMessage = "Paused by user. Press Enter to continue...";
  const message = reason ? `${reason}\n${baseMessage}` : baseMessage;

  return {
    type: "pause",
    message,
    reason,
  };
}

/**
 * Execute pause action - wait for user input
 *
 * In normal execution, this reads from stdin.
 * In test mode, pass a mock input function.
 *
 * @param inputFn - Optional input function for testing
 * @returns PauseResult with resumed status
 */
export async function executePauseAction(
  inputFn?: InputFunction
): Promise<PauseResult> {
  if (inputFn) {
    // Test mode - use provided input function
    await inputFn();
    return { resumed: true };
  }

  // Normal mode - wait for Enter key from stdin
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(false);
    stdin.resume();

    const onData = () => {
      stdin.pause();
      stdin.removeListener("data", onData);
      resolve({ resumed: true });
    };

    stdin.once("data", onData);
  });
}

/**
 * Log pause event to progress.txt
 *
 * @param progressPath - Path to progress.txt file
 */
export async function logPauseToProgress(progressPath: string): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `
## Pause Event - ${timestamp}

User requested pause via [PAUSE] command.
Orchestrator paused and waited for user confirmation to continue.

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Format pause message for display
 *
 * @param tuiMode - Whether to format for TUI display
 * @returns Formatted pause message
 */
export function formatPauseMessage(tuiMode = false): string {
  if (tuiMode) {
    return "⏸️  Paused by user. Press any key to continue...";
  }
  return "⏸️  Paused by user. Press Enter to continue...";
}
