/**
 * MessageQueuePanel Component
 *
 * mIRC-style message queue panel for the right column
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, borders, symbols } from "../theme.js";
import { MessageItem } from "./MessageItem.js";
import type { MessageItem as MessageItemType } from "../types.js";
import type { QueueItem } from "../../queue/types.js";

interface MessageQueuePanelProps {
  /** Messages to display (mIRC-style) */
  messages: MessageItemType[];
  /** Queue items (pending commands) */
  queueItems: QueueItem[];
  /** Maximum messages to show */
  maxMessages?: number;
  /** Maximum queue items to show */
  maxQueueItems?: number;
  /** Panel title */
  title?: string;
}

/**
 * Format queue item for display
 */
function formatQueueItem(item: QueueItem, index: number): string {
  return `${index + 1}. ${item.content}`;
}

export function MessageQueuePanel({
  messages,
  queueItems,
  maxMessages = 10,
  maxQueueItems = 3,
  title = "Messages",
}: MessageQueuePanelProps): React.ReactElement {
  // Get visible messages (most recent)
  const visibleMessages = messages.slice(-maxMessages);
  const hasMoreMessages = messages.length > maxMessages;

  // Get visible queue items
  const visibleQueueItems = queueItems.slice(0, maxQueueItems);
  const hasMoreQueueItems = queueItems.length > maxQueueItems;

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      {/* Messages section */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={colors.accent} bold>
            {title}
          </Text>
          {messages.length > 0 && (
            <Text color={colors.dim}> ({messages.length})</Text>
          )}
        </Box>

        {/* Scroll indicator */}
        {hasMoreMessages && (
          <Text color={colors.dim}>
            {symbols.priority.high} {messages.length - maxMessages} more
          </Text>
        )}

        {/* Messages list */}
        <Box flexDirection="column">
          {visibleMessages.length > 0 ? (
            visibleMessages.map((msg) => (
              <MessageItem key={msg.id} message={msg} maxWidth={25} />
            ))
          ) : (
            <Text color={colors.dim} dimColor>
              No messages yet
            </Text>
          )}
        </Box>
      </Box>

      {/* Queue section */}
      <Box flexDirection="column">
        <Box>
          <Text color={colors.dim} bold>
            {borders.horizontal}
            {borders.horizontal} Queue {borders.horizontal}
          </Text>
          {queueItems.length > 0 && (
            <Text color={colors.warning}> ({queueItems.length})</Text>
          )}
        </Box>

        {/* Queue items */}
        <Box flexDirection="column">
          {visibleQueueItems.length > 0 ? (
            visibleQueueItems.map((item, i) => (
              <Text key={item.addedAt} color={colors.dim} wrap="truncate">
                {formatQueueItem(item, i)}
              </Text>
            ))
          ) : (
            <Text color={colors.dim} dimColor>
              Empty
            </Text>
          )}

          {/* More items indicator */}
          {hasMoreQueueItems && (
            <Text color={colors.dim}>
              +{queueItems.length - maxQueueItems} more
            </Text>
          )}
        </Box>

        {/* Help text */}
        <Box marginTop={1}>
          <Text color={colors.dim} dimColor>
            Items sent to agent each iteration
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
