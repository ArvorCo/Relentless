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

// ============================================================================
// SKIP Command Functions
// ============================================================================

/**
 * Skip action returned by handleSkipCommand
 */
export interface SkipAction {
  type: "skip";
  storyId: string;
  rejected: boolean;
  reason?: string;
  customReason?: string;
}

/**
 * Check if any SKIP command exists in the command list
 *
 * @param commands - List of commands from queue processing
 * @returns true if SKIP command is present
 */
export function shouldSkip(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): boolean {
  return commands.some((cmd) => cmd.type === "SKIP");
}

/**
 * Get all SKIP commands from the command list
 *
 * @param commands - List of commands from queue processing
 * @returns Array of SKIP commands with story IDs
 */
export function getSkipCommands(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): Array<{ type: "SKIP"; storyId: string }> {
  return commands
    .filter((cmd): cmd is { type: "SKIP"; storyId: string } =>
      cmd.type === "SKIP" && cmd.storyId !== undefined
    );
}

/**
 * Handle SKIP command - creates action object
 *
 * Checks if the story is currently in progress. If so, rejects the skip.
 *
 * @param storyId - The story ID to skip
 * @param currentStoryId - The story currently in progress (or null if none)
 * @param customReason - Optional custom reason for the skip
 * @returns SkipAction object
 */
export function handleSkipCommand(
  storyId: string,
  currentStoryId: string | null,
  customReason?: string
): SkipAction {
  // Check if trying to skip the story currently in progress
  if (currentStoryId && storyId === currentStoryId) {
    return {
      type: "skip",
      storyId,
      rejected: true,
      reason: `Cannot skip ${storyId}: story is currently in progress. Wait for iteration to complete.`,
    };
  }

  return {
    type: "skip",
    storyId,
    rejected: false,
    customReason,
  };
}

/**
 * Log skip event to progress.txt
 *
 * @param progressPath - Path to progress.txt file
 * @param storyId - The story ID that was skipped
 * @param reason - Optional custom reason for the skip
 */
export async function logSkipToProgress(
  progressPath: string,
  storyId: string,
  reason?: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const reasonText = reason ?? "User requested skip via [SKIP] command";
  const entry = `
## Skip Event - ${timestamp}

Story ${storyId} was skipped.
${reasonText}

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Log rejected skip event to progress.txt
 *
 * @param progressPath - Path to progress.txt file
 * @param storyId - The story ID that was attempted to skip
 */
export async function logSkipRejectedToProgress(
  progressPath: string,
  storyId: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `
## Skip Rejected - ${timestamp}

Attempted to skip ${storyId} but story is currently in progress.
Skip command was ignored. Wait for the current iteration to complete.

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Format skip message for display
 *
 * @param storyId - The story ID being skipped
 * @param rejected - Whether the skip was rejected
 * @param tuiMode - Whether to format for TUI display
 * @returns Formatted skip message
 */
export function formatSkipMessage(
  storyId: string,
  rejected: boolean,
  tuiMode = false
): string {
  if (rejected) {
    if (tuiMode) {
      return `⚠️  Cannot skip ${storyId}: story is currently in progress`;
    }
    return `⚠️  Cannot skip ${storyId}: story is currently in progress. Wait for iteration to complete.`;
  }

  if (tuiMode) {
    return `⏭️  Skipped ${storyId}`;
  }
  return `⏭️  Skipped ${storyId}`;
}

// ============================================================================
// PRIORITY Command Functions
// ============================================================================

/**
 * Priority action returned by handlePriorityCommand
 */
export interface PriorityAction {
  type: "priority";
  storyId: string;
  isCurrentStory: boolean;
  message?: string;
  customReason?: string;
}

/**
 * Check if any PRIORITY command exists in the command list
 *
 * @param commands - List of commands from queue processing
 * @returns true if PRIORITY command is present
 */
export function shouldPrioritize(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): boolean {
  return commands.some((cmd) => cmd.type === "PRIORITY");
}

/**
 * Get all PRIORITY commands from the command list
 *
 * @param commands - List of commands from queue processing
 * @returns Array of PRIORITY commands with story IDs
 */
export function getPriorityCommands(
  commands: Array<{ type: QueueCommandType; storyId?: string }>
): Array<{ type: "PRIORITY"; storyId: string }> {
  return commands.filter(
    (cmd): cmd is { type: "PRIORITY"; storyId: string } =>
      cmd.type === "PRIORITY" && cmd.storyId !== undefined
  );
}

/**
 * Handle PRIORITY command - creates action object
 *
 * Checks if the story is the currently executing story. If so, shows an info message.
 *
 * @param storyId - The story ID to prioritize
 * @param currentStoryId - The story currently in progress (or null if none)
 * @param customReason - Optional custom reason for the priority change
 * @returns PriorityAction object
 */
export function handlePriorityCommand(
  storyId: string,
  currentStoryId: string | null,
  customReason?: string
): PriorityAction {
  // Check if trying to prioritize the story currently in progress
  if (currentStoryId && storyId === currentStoryId) {
    return {
      type: "priority",
      storyId,
      isCurrentStory: true,
      message: `Story ${storyId} is already in progress`,
    };
  }

  return {
    type: "priority",
    storyId,
    isCurrentStory: false,
    customReason,
  };
}

/**
 * Log priority event to progress.txt
 *
 * @param progressPath - Path to progress.txt file
 * @param storyId - The story ID that was prioritized
 * @param reason - Optional custom reason for the priority change
 */
export async function logPriorityToProgress(
  progressPath: string,
  storyId: string,
  reason?: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const reasonText = reason ?? "User requested priority via [PRIORITY] command";
  const entry = `
## Priority Change - ${timestamp}

Story ${storyId} was prioritized to be next.
${reasonText}

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Log priority info event to progress.txt (when story is already current)
 *
 * @param progressPath - Path to progress.txt file
 * @param storyId - The story ID that was attempted to prioritize
 */
export async function logPriorityInfoToProgress(
  progressPath: string,
  storyId: string
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `
## Priority Info - ${timestamp}

Attempted to prioritize ${storyId} but story is already in progress.
Execution continues normally.

---
`;

  await appendProgress(progressPath, entry);
}

/**
 * Format priority message for display
 *
 * @param storyId - The story ID being prioritized
 * @param isCurrentStory - Whether the story is the current one
 * @param tuiMode - Whether to format for TUI display
 * @returns Formatted priority message
 */
export function formatPriorityMessage(
  storyId: string,
  isCurrentStory: boolean,
  tuiMode = false
): string {
  if (isCurrentStory) {
    if (tuiMode) {
      return `ℹ️  ${storyId} is already in progress`;
    }
    return `ℹ️  Story ${storyId} is already in progress`;
  }

  if (tuiMode) {
    return `⬆️  Prioritized ${storyId}`;
  }
  return `⬆️  Prioritized ${storyId}`;
}
