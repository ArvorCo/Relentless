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
 * Abort action returned by handleAbortCommand
 */
export interface AbortAction {
  type: "abort";
  reason: string;
  exitCode: number;
}

/**
 * Progress summary for abort message
 */
export interface AbortProgressSummary {
  storiesCompleted: number;
  storiesTotal: number;
  iterations: number;
  duration: number;
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

// ============================================================================
// ABORT Command Functions
// ============================================================================

/**
 * Check if any ABORT command exists in the command list
 *
 * @param commands - List of commands from queue processing
 * @returns true if ABORT command is present
 */
export function shouldAbort(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): boolean {
  return commands.some((cmd) => cmd.type === "ABORT");
}

/**
 * Handle ABORT command - creates action object
 *
 * @param reason - Optional custom reason for the abort
 * @returns AbortAction object
 */
export function handleAbortCommand(reason?: string): AbortAction {
  return {
    type: "abort",
    reason: reason ?? "User requested abort via [ABORT] command",
    exitCode: 0, // Clean exit, not an error
  };
}

/**
 * Log abort event to progress.txt
 *
 * @param progressPath - Path to progress.txt file
 * @param reason - Optional custom reason for the abort
 */
export async function logAbortToProgress(
  progressPath: string,
  reason?: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const reasonText = reason ?? "User requested abort via [ABORT] command";
  const entry = `
## Abort Event - ${timestamp}

${reasonText}
Orchestrator stopped cleanly with exit code 0.

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Format abort message for display
 *
 * @param tuiMode - Whether to format for TUI display
 * @returns Formatted abort message
 */
export function formatAbortMessage(tuiMode = false): string {
  if (tuiMode) {
    return "🛑 Aborted by user.";
  }
  return "🛑 Aborted by user.";
}

/**
 * Generate progress summary for abort
 *
 * @param summary - Progress summary data
 * @returns Formatted summary string
 */
export function generateAbortSummary(summary: AbortProgressSummary): string {
  const { storiesCompleted, storiesTotal, iterations, duration } = summary;

  // Format duration
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const durationStr =
    minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

  return `
Progress Summary:
  Stories: ${storiesCompleted}/${storiesTotal} complete
  Iterations: ${iterations}
  Duration: ${durationStr}
`;
}
