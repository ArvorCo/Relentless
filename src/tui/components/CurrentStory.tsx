/**
 * CurrentStory Component
 *
 * Shows the current story being worked on with elapsed time
 */

import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { colors, symbols } from "../theme.js";
import type { Story } from "../types.js";

interface CurrentStoryProps {
  story: Story | null;
  elapsedSeconds: number;
  isRunning: boolean;
  idleSeconds: number;
  routing?: {
    mode: "free" | "cheap" | "good" | "genius";
    complexity: "simple" | "medium" | "complex" | "expert";
    harness: string;
    model: string;
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function CurrentStory({
  story,
  elapsedSeconds,
  isRunning,
  idleSeconds,
  routing,
}: CurrentStoryProps): React.ReactElement {
  if (!story) {
    return (
      <Box>
        <Text color={colors.dim}>No story in progress</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.dim}>Current Story: </Text>
        <Text color={colors.warning} bold>
          {story.id}
        </Text>
        <Text color={colors.dim}> - </Text>
        <Text>{story.title}</Text>
      </Box>
      <Box>
        {isRunning ? (
          <>
            <Text color={colors.success}>
              <Spinner type="dots" />
            </Text>
            <Text color={colors.success}> Working...</Text>
          </>
        ) : (
          <Text color={colors.dim}>{symbols.pending} Waiting</Text>
        )}
        <Text color={colors.dim}>
          {" "}
          [elapsed: {formatTime(elapsedSeconds)}, idle: {formatTime(idleSeconds)}]
        </Text>
      </Box>
      {routing && (
        <Box>
          <Text color={colors.dim}>Routing: </Text>
          <Text color={colors.warning}>
            {routing.mode}/{routing.complexity}
          </Text>
          <Text color={colors.dim}> → </Text>
          <Text>{routing.harness}/{routing.model}</Text>
        </Box>
      )}
    </Box>
  );
}
