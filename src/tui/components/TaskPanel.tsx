/**
 * TaskPanel Component
 *
 * Left panel showing scrollable task list with phase grouping
 */

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { colors, symbols } from "../theme.js";
import { TaskItem } from "./TaskItem.js";
import type { Story } from "../types.js";

interface TaskPanelProps {
  /** All stories */
  stories: Story[];
  /** Currently active story ID */
  currentStoryId?: string;
  /** Maximum visible rows */
  maxRows?: number;
  /** Panel title */
  title?: string;
  /** Whether to show phase headers */
  showPhases?: boolean;
}

interface PhaseGroup {
  phase: string;
  stories: Story[];
}

/**
 * Group stories by phase
 */
function groupByPhase(stories: Story[]): PhaseGroup[] {
  const groups = new Map<string, Story[]>();

  for (const story of stories) {
    const phase = story.phase ?? "Tasks";
    if (!groups.has(phase)) {
      groups.set(phase, []);
    }
    groups.get(phase)!.push(story);
  }

  return Array.from(groups.entries()).map(([phase, stories]) => ({
    phase,
    stories,
  }));
}

/**
 * Calculate scroll window to keep current story visible
 */
function calculateScrollWindow(
  totalItems: number,
  currentIndex: number,
  maxVisible: number
): { start: number; end: number } {
  if (totalItems <= maxVisible) {
    return { start: 0, end: totalItems };
  }

  // Center the current item in the window
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, currentIndex - half);

  // Adjust if window goes past the end
  if (start + maxVisible > totalItems) {
    start = Math.max(0, totalItems - maxVisible);
  }

  return { start, end: Math.min(totalItems, start + maxVisible) };
}

export function TaskPanel({
  stories,
  currentStoryId,
  maxRows = 20,
  title = "Tasks",
  showPhases = true,
}: TaskPanelProps): React.ReactElement {
  // Calculate completion stats
  const completedCount = stories.filter((s) => s.passes).length;
  const totalCount = stories.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find current story index
  const currentIndex = stories.findIndex((s) => s.id === currentStoryId);

  // Group stories by phase if enabled
  const phaseGroups = useMemo(() => {
    if (!showPhases) {
      return [{ phase: "", stories }];
    }
    return groupByPhase(stories);
  }, [stories, showPhases]);

  // Calculate which items to show (with scrolling)
  const { start, end } = calculateScrollWindow(stories.length, currentIndex, maxRows);
  const visibleStories = stories.slice(start, end);
  const hasMore = end < stories.length;
  const hasLess = start > 0;

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>
          {title}
        </Text>
        <Text color={colors.dim}>
          {" "}
          ({completedCount}/{totalCount})
        </Text>
        <Text color={progressPercent === 100 ? colors.success : colors.dim}>
          {" "}
          {progressPercent}%
        </Text>
      </Box>

      {/* Scroll indicator (top) */}
      {hasLess && (
        <Box>
          <Text color={colors.dim}>
            {symbols.priority.high} {start} more above
          </Text>
        </Box>
      )}

      {/* Task list */}
      <Box flexDirection="column">
        {showPhases
          ? phaseGroups.map((group) => {
              // Filter visible stories for this phase
              const visibleInPhase = group.stories.filter((s) =>
                visibleStories.includes(s)
              );
              if (visibleInPhase.length === 0) return null;

              return (
                <Box key={group.phase} flexDirection="column" marginBottom={1}>
                  {/* Phase header */}
                  {group.phase && (
                    <Box marginBottom={0}>
                      <Text color={colors.accent} bold>
                        [{group.phase}]
                      </Text>
                      <Text color={colors.dim}>
                        {" "}
                        ({group.stories.filter((s) => s.passes).length}/
                        {group.stories.length})
                      </Text>
                    </Box>
                  )}

                  {/* Stories in phase */}
                  {visibleInPhase.map((story) => (
                    <TaskItem
                      key={story.id}
                      story={story}
                      isCurrent={story.id === currentStoryId}
                      maxTitleWidth={25}
                    />
                  ))}
                </Box>
              );
            })
          : visibleStories.map((story) => (
              <TaskItem
                key={story.id}
                story={story}
                isCurrent={story.id === currentStoryId}
                maxTitleWidth={25}
              />
            ))}
      </Box>

      {/* Scroll indicator (bottom) */}
      {hasMore && (
        <Box>
          <Text color={colors.dim}>
            {symbols.priority.low} {stories.length - end} more below
          </Text>
        </Box>
      )}
    </Box>
  );
}
