/**
 * Queue Parser
 *
 * Functions for parsing and formatting queue items.
 * Handles line-based queue format with ISO timestamp prefix.
 *
 * Queue line format: `2026-01-13T10:30:00.000Z | content`
 * Command format: `[COMMAND]` or `[COMMAND arg]`
 */

import type { QueueItem, QueueCommandType, ParsedCommand } from "./types";

/**
 * Valid command names (uppercase for matching)
 */
const VALID_COMMANDS = ["PAUSE", "SKIP", "PRIORITY", "ABORT"] as const;

/**
 * Commands that require a story ID argument
 */
const COMMANDS_WITH_STORY_ID = ["SKIP", "PRIORITY"] as const;

/**
 * Regex patterns for parsing
 */
const QUEUE_LINE_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s*\|\s*(.+)$/;
const COMMAND_PATTERN = /^\[\s*([A-Za-z]+)(?:\s+([^\]]+))?\s*\]$/;
const PROCESSED_AT_PATTERN = /\s*\|\s*processedAt:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/;

/**
 * Parse a single queue line into a QueueItem
 *
 * @param line - The raw line from the queue file
 * @returns QueueItem if valid, null if malformed
 */
export function parseQueueLine(line: string): QueueItem | null {
  // Handle empty or whitespace-only lines
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // Match the queue line pattern: timestamp | content
  const match = trimmedLine.match(QUEUE_LINE_PATTERN);
  if (!match) {
    return null;
  }

  const [, timestamp, rawContent] = match;
  let trimmedContent = rawContent.trim();
  let processedAt: string | undefined;

  // Check for processedAt suffix (from processed queue file)
  const processedMatch = trimmedContent.match(PROCESSED_AT_PATTERN);
  if (processedMatch) {
    processedAt = processedMatch[1];
    // Remove the processedAt suffix from content
    trimmedContent = trimmedContent.replace(PROCESSED_AT_PATTERN, "").trim();
  }

  // Generate unique ID from timestamp
  const id = `${timestamp.replace(/[:.]/g, "-")}-${Date.now() % 1000}`;

  // Check if content is a command
  const parsedCommand = parseCommand(trimmedContent);

  if (parsedCommand) {
    const item: QueueItem = {
      id,
      content: trimmedContent,
      type: "command",
      command: parsedCommand.type,
      targetStoryId: parsedCommand.storyId,
      addedAt: timestamp,
    };
    if (processedAt) {
      item.processedAt = processedAt;
    }
    return item;
  }

  // Regular prompt
  const item: QueueItem = {
    id,
    content: trimmedContent,
    type: "prompt",
    addedAt: timestamp,
  };
  if (processedAt) {
    item.processedAt = processedAt;
  }
  return item;
}

/**
 * Parse command content into a ParsedCommand
 *
 * @param content - The content string (e.g., "[PAUSE]" or "[SKIP US-003]")
 * @returns ParsedCommand if valid command, null otherwise
 */
export function parseCommand(content: string): ParsedCommand | null {
  const trimmedContent = content.trim();

  // Match command pattern: [COMMAND] or [COMMAND arg]
  const match = trimmedContent.match(COMMAND_PATTERN);
  if (!match) {
    return null;
  }

  const [, command, arg] = match;
  const upperCommand = command.toUpperCase();

  // Validate command name
  if (!VALID_COMMANDS.includes(upperCommand as (typeof VALID_COMMANDS)[number])) {
    return null;
  }

  const commandType = upperCommand as QueueCommandType;

  // Check if command requires a story ID
  if (COMMANDS_WITH_STORY_ID.includes(commandType as (typeof COMMANDS_WITH_STORY_ID)[number])) {
    if (!arg) {
      return null;
    }
    // Uppercase the story ID for consistency (e.g., "us-003" -> "US-003")
    const storyId = arg.trim().toUpperCase();
    return { type: commandType, storyId };
  }

  // Commands without arguments
  return { type: commandType };
}

/**
 * Format a QueueItem back to a queue line string
 *
 * @param item - The queue item to format
 * @returns Formatted queue line string
 */
export function formatQueueLine(item: Pick<QueueItem, "addedAt" | "content">): string {
  return `${item.addedAt} | ${item.content}`;
}
