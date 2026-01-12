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

  // Constrain rows to prevent TUI from overflowing terminal height.
  // When constrained, keep the current story visible by windowing around its row.
  const totalRows = rows.length;
  const clampedMaxRows = maxRows === undefined ? undefined : Math.max(0, maxRows);

  let visibleRows = rows;
  let startRow = 0;

  if (clampedMaxRows !== undefined && totalRows > clampedMaxRows) {
    const currentRowIdx = currentStoryId
      ? rows.findIndex((r) => r.some((s) => s.id === currentStoryId))
      : -1;

    const windowSize = clampedMaxRows;
    const half = Math.floor(windowSize / 2);

    startRow = currentRowIdx >= 0 ? Math.max(0, currentRowIdx - half) : 0;
    if (startRow + windowSize > totalRows) {
      startRow = Math.max(0, totalRows - windowSize);
    }

    visibleRows = rows.slice(startRow, startRow + windowSize);
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.dim}>
      <Box paddingX={1} borderBottom borderColor={colors.dim}>
        <Text color={colors.dim} bold>
          {visibleRows.length < totalRows
            ? `Stories (${startRow + 1}-${startRow + visibleRows.length} of ${totalRows} rows)`
            : "Stories"}
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        {visibleRows.map((row, visibleRowIdx) => {
          const rowIdx = startRow + visibleRowIdx;
          return (
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
          );
        })}
      </Box>
    </Box>
  );
}
