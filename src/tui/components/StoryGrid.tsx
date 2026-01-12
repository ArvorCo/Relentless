/**
 * StoryGrid Component
 *
 * Visual grid showing all stories with status
 */

import React from "react";
import { Box, Text } from "ink";
import { colors, symbols } from "../theme.js";
import type { Story } from "../types.js";

interface StoryGridProps {
  stories: Story[];
  currentStoryId?: string;
  columns?: number;
  maxRows?: number;
}

export function StoryGrid({
  stories,
  currentStoryId,
  columns = 2,
  maxRows,
}: StoryGridProps): React.ReactElement {
  // Split stories into columns
  const rows: Story[][] = [];
  const storiesPerColumn = Math.ceil(stories.length / columns);

  for (let i = 0; i < storiesPerColumn; i++) {
    const row: Story[] = [];
    for (let col = 0; col < columns; col++) {
      const idx = col * storiesPerColumn + i;
      if (idx < stories.length) {
        row.push(stories[idx]);
      }
    }
    rows.push(row);
  }

  // Constrain to maxRows
  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingX={1}>
        <Text color={colors.dim} bold>
          ── Stories ({stories.length}) ──
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {visibleRows.map((row, rowIdx) => (
          <Box key={rowIdx} flexDirection="row">
            {row.map((story, colIdx) => {
              const isCurrent = story.id === currentStoryId;
              const symbol = isCurrent
                ? symbols.inProgress
                : story.passes
                  ? symbols.complete
                  : symbols.pending;
              const symbolColor = isCurrent
                ? colors.warning
                : story.passes
                  ? colors.success
                  : colors.dim;

              return (
                <Box key={colIdx} width="50%">
                  <Text color={symbolColor}>{symbol} </Text>
                  <Text
                    color={story.passes ? colors.success : isCurrent ? colors.warning : undefined}
                    dimColor={story.passes}
                  >
                    {story.id.padEnd(8)}
                  </Text>
                  <Text
                    color={colors.dim}
                    dimColor={story.passes}
                    strikethrough={story.passes}
                    wrap="truncate"
                  >
                    {story.title.substring(0, 25)}
                  </Text>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
