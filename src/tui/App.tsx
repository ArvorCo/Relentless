/**
 * Relentless TUI App
 *
 * Main application component that renders the full interface
 */

import React from "react";
import { Box, Text } from "ink";
import { Header } from "./components/Header.js";
import { ProgressBar } from "./components/ProgressBar.js";
import { CurrentStory } from "./components/CurrentStory.js";
import { AgentOutput } from "./components/AgentOutput.js";
import { StoryGrid } from "./components/StoryGrid.js";
import { AgentStatus } from "./components/AgentStatus.js";
import { colors } from "./theme.js";
import type { TUIState } from "./types.js";

interface AppProps {
  state: TUIState;
}

export function App({ state }: AppProps): React.ReactElement {
  const completedCount = state.stories.filter((s) => s.passes).length;
  const totalCount = state.stories.length;

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Header agent={state.currentAgent} />

      {/* Feature info and progress */}
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Box>
          <Text color={colors.dim}>Feature: </Text>
          <Text bold>{state.feature}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={colors.dim}>Progress: </Text>
          <ProgressBar completed={completedCount} total={totalCount} />
        </Box>
      </Box>

      {/* Current story */}
      <Box paddingX={1}>
        <CurrentStory
          story={state.currentStory}
          elapsedSeconds={state.elapsedSeconds}
          isRunning={state.isRunning}
        />
      </Box>

      {/* Agent output */}
      <AgentOutput lines={state.outputLines} />

      {/* Story grid */}
      <StoryGrid
        stories={state.stories}
        currentStoryId={state.currentStory?.id}
      />

      {/* Agent status footer */}
      <AgentStatus
        agents={state.agents}
        iteration={state.iteration}
        maxIterations={state.maxIterations}
      />

      {/* Error display */}
      {state.error && (
        <Box paddingX={1}>
          <Text color={colors.error}>Error: {state.error}</Text>
        </Box>
      )}

      {/* Completion message */}
      {state.isComplete && (
        <Box paddingX={1} paddingY={1}>
          <Text color={colors.success} bold>
            🎉 All stories complete!
          </Text>
        </Box>
      )}
    </Box>
  );
}
