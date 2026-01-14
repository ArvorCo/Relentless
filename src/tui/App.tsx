/**
 * Relentless TUI App
 *
 * Main application component that renders the full interface
 */

import React from "react";
import { Box, Text, useStdout } from "ink";
import { Header } from "./components/Header.js";
import { ProgressBar } from "./components/ProgressBar.js";
import { CurrentStory } from "./components/CurrentStory.js";
import { AgentOutput } from "./components/AgentOutput.js";
import { StoryGrid } from "./components/StoryGrid.js";
import { AgentStatus } from "./components/AgentStatus.js";
import { QueuePanel } from "./components/QueuePanel.js";
import { QueueInput } from "./components/QueueInput.js";
import { colors } from "./theme.js";
import type { TUIState } from "./types.js";

interface AppProps {
  state: TUIState;
}

export function App({ state }: AppProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalRows = stdout.rows ?? 24;
  
  const completedCount = state.stories.filter((s) => s.passes).length;
  const totalCount = state.stories.length;
  
  // Calculate available rows for stories based on terminal height
  // Chrome: Header(2) + Feature/Progress(2) + CurrentStory(2) + AgentOutputHeader(1) + AgentStatusFooter(2) + Padding(2) = ~11 lines
  // AgentOutput: 6 lines
  // Remaining space for stories
  const chromeHeight = 11;
  const agentOutputLines = 6;
  const availableForStories = Math.max(8, terminalRows - chromeHeight - agentOutputLines);
  
  // Calculate story rows needed for 2-column layout
  const storyRows = Math.ceil(totalCount / 2);
  const maxStoryRows = Math.min(storyRows, availableForStories);

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Header agent={state.currentAgent} />

      {/* Feature info and progress */}
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        <Box>
          <Text color={colors.dim}>Feature: </Text>
          <Text bold>{state.feature}</Text>
        </Box>
        <Box>
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
      <AgentOutput lines={state.outputLines} maxLines={agentOutputLines} />

      {/* Queue panel */}
      <QueuePanel items={state.queueItems} maxItems={3} />

      {/* Story grid */}
      <StoryGrid
        stories={state.stories}
        currentStoryId={state.currentStory?.id}
        maxRows={maxStoryRows}
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

      {/* Queue input */}
      <QueueInput active={state.queueInputActive} value={state.queueInputValue} />

      {/* Keyboard hint when not in input mode */}
      {!state.queueInputActive && (
        <Box paddingX={1}>
          <Text color={colors.dim}>Press 'q' to add to queue</Text>
        </Box>
      )}
    </Box>
  );
}
