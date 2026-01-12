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
import { colors } from "./theme.js";
import type { TUIState } from "./types.js";

interface AppProps {
  state: TUIState;
}

export function App({ state }: AppProps): React.ReactElement {
  const { stdout } = useStdout();
  
  // DEBUG: Log stdout properties
  React.useEffect(() => {
    console.error(`[TUI DEBUG] stdout.rows=${stdout.rows}, stdout.columns=${stdout.columns}, isTTY=${stdout.isTTY}`);
  }, [stdout.rows, stdout.columns, stdout.isTTY]);
  
  const [terminalRows, setTerminalRows] = React.useState(() => {
    const rows = stdout.rows ?? 24;
    console.error(`[TUI DEBUG] Initial terminalRows: ${rows}`);
    return rows;
  });

  React.useEffect(() => {
    if (!stdout.isTTY) return;

    const handleResize = () => {
      const newRows = stdout.rows ?? 24;
      console.error(`[TUI DEBUG] Resize: ${newRows} rows`);
      setTerminalRows(newRows);
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  const completedCount = state.stories.filter((s) => s.passes).length;
  const totalCount = state.stories.length;

  // Prevent Ink from overflowing terminal height.
  // Total height = agentOutputLines + storyGridRows + 18 (with compact layout below).
  const contentBudget = Math.max(0, terminalRows - 18);

  const minAgentLines = contentBudget > 0 ? Math.min(3, contentBudget) : 0;
  const maxAgentLines = Math.min(10, contentBudget);
  let agentOutputLines = Math.floor(contentBudget * 0.35);
  agentOutputLines = Math.max(minAgentLines, Math.min(maxAgentLines, agentOutputLines));

  let storyGridRows = contentBudget - agentOutputLines;
  if (totalCount > 0 && storyGridRows === 0 && contentBudget >= 2) {
    agentOutputLines -= 1;
    storyGridRows = 1;
  }
  
  // DEBUG: Log calculated values
  console.error(`[TUI DEBUG] terminalRows=${terminalRows}, contentBudget=${contentBudget}, agentOutputLines=${agentOutputLines}, storyGridRows=${storyGridRows}, totalStories=${totalCount}`);

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

      {/* Story grid */}
      <StoryGrid
        stories={state.stories}
        currentStoryId={state.currentStory?.id}
        maxRows={storyGridRows}
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
