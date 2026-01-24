/**
 * MessageItem Component
 *
 * Individual message with timestamp in mIRC style
 */

import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import type { MessageItem as MessageItemType } from "../types.js";

interface MessageItemProps {
  /** Message data */
  message: MessageItemType;
  /** Whether to show full timestamp or just time */
  showFullTimestamp?: boolean;
  /** Maximum content width for truncation */
  maxWidth?: number;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date, full: boolean = false): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (full) {
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${hours}:${minutes}`;
}

/**
 * Get color for message type
 */
function getMessageColor(type: MessageItemType["type"]): string {
  switch (type) {
    case "command":
      return colors.message.command;
    case "prompt":
      return colors.message.prompt;
    case "system":
      return colors.message.system;
    case "info":
      return colors.message.info;
    case "success":
      return colors.message.success;
    case "error":
      return colors.message.error;
    default:
      return colors.dim;
  }
}

/**
 * Get prefix symbol for message type
 */
function getMessagePrefix(type: MessageItemType["type"]): string {
  switch (type) {
    case "command":
      return ">";
    case "prompt":
      return "\u00BB";
    case "system":
      return "\u2022";
    case "info":
      return "i";
    case "success":
      return "\u2713";
    case "error":
      return "\u00D7";
    default:
      return " ";
  }
}

export function MessageItemComponent({
  message,
  showFullTimestamp = false,
  maxWidth = 40,
}: MessageItemProps): React.ReactElement {
  const timestamp = formatTimestamp(message.timestamp, showFullTimestamp);
  const color = getMessageColor(message.type);
  const prefix = getMessagePrefix(message.type);

  // Truncate content if needed
  const displayContent =
    message.content.length > maxWidth
      ? message.content.substring(0, maxWidth - 1) + "\u2026"
      : message.content;

  return (
    <Box flexDirection="row">
      {/* Timestamp */}
      <Text color={colors.dim}>{timestamp} </Text>

      {/* Type prefix */}
      <Text color={color} bold>
        {prefix}{" "}
      </Text>

      {/* Content */}
      <Text color={color} wrap="truncate">
        {displayContent}
      </Text>
    </Box>
  );
}

export { MessageItemComponent as MessageItem };
