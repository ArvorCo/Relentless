/**
 * TaskItem Component
 *
 * Individual task item with status indicator, animation, and metadata
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, symbols } from "../theme.js";
import { usePulse } from "../hooks/useAnimation.js";
import type { Story } from "../types.js";

interface TaskItemProps {
  /** Story/task data */
  story: Story;
  /** Whether this is the currently active task */
  isCurrent: boolean;
  /** Whether to show compact view (less details) */
  compact?: boolean;
  /** Maximum width for title truncation */
  maxTitleWidth?: number;
}

/**
 * Get the status symbol and color for a story
 */
function getStatusIndicator(
  story: Story,
  isCurrent: boolean,
  pulseFrame: string
): { symbol: string; color: string } {
  if (isCurrent) {
    return { symbol: pulseFrame, color: colors.warning };
  }
  if (story.blocked) {
    return { symbol: symbols.blocked, color: colors.status.blocked };
  }
  if (story.passes) {
    return { symbol: symbols.complete, color: colors.success };
  }
  return { symbol: symbols.pending, color: colors.dim };
}

/**
 * Get priority badge color
 */
function getPriorityColor(priority: number): string {
  if (priority <= 2) return colors.error;
  if (priority <= 4) return colors.warning;
  return colors.dim;
}

export function TaskItem({
  story,
  isCurrent,
  compact = false,
  maxTitleWidth = 30,
}: TaskItemProps): React.ReactElement {
  const pulseFrame = usePulse(isCurrent);
  const { symbol, color } = getStatusIndicator(story, isCurrent, pulseFrame);

  // Truncate title if needed
  const displayTitle =
    story.title.length > maxTitleWidth
      ? story.title.substring(0, maxTitleWidth - 1) + "\u2026"
      : story.title;

  if (compact) {
    return (
      <Box flexDirection="row">
        {/* Status indicator */}
        <Text color={color}>{symbol.padEnd(4)}</Text>

        {/* Story ID */}
        <Text
          color={story.passes ? colors.success : isCurrent ? colors.warning : undefined}
          dimColor={story.passes}
        >
          {story.id}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row" width="100%">
      {/* Status indicator */}
      <Text color={color}>{symbol.padEnd(4)}</Text>

      {/* Story ID */}
      <Text
        color={story.passes ? colors.success : isCurrent ? colors.warning : undefined}
        dimColor={story.passes}
        bold={isCurrent}
      >
        {story.id.padEnd(9)}
      </Text>

      {/* Priority badge */}
      <Text color={getPriorityColor(story.priority)} bold={story.priority <= 3}>
        P{story.priority}{" "}
      </Text>

      {/* Title */}
      <Text
        color={story.passes ? colors.dim : isCurrent ? colors.warning : undefined}
        dimColor={story.passes}
        strikethrough={story.passes}
        wrap="truncate"
      >
        {displayTitle}
      </Text>

      {/* Metadata badges */}
      {story.research && (
        <Text color={colors.dim}> {symbols.research}</Text>
      )}

      {story.blocked && !isCurrent && (
        <Text color={colors.status.blocked}> {symbols.blocked}</Text>
      )}

      {story.phase && (
        <Text color={colors.dim} dimColor>
          {" "}
          [{story.phase}]
        </Text>
      )}
    </Box>
  );
}
