/**
 * Relentless TUI App
 *
 * Main application component with responsive 3-column layout
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
import { QueueRemovalPrompt } from "./components/QueueRemoval.js";
import { TaskPanel } from "./components/TaskPanel.js";
import { OutputPanel } from "./components/OutputPanel.js";
import { MessageQueuePanel } from "./components/MessageQueuePanel.js";
import { StatusBar } from "./components/StatusBar.js";
import { LayoutSwitcher } from "./layouts/LayoutSwitcher.js";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout.js";
import { colors } from "./theme.js";
import type { TUIState } from "./types.js";

interface AppProps {
  state: TUIState;
}

export function App({ state }: AppProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const layout = useResponsiveLayout();

  const completedCount = state.stories.filter((s) => s.passes).length;
  const totalCount = state.stories.length;

  // Calculate available rows for stories based on terminal height
  const chromeHeight = 11;
  const agentOutputLines = 6;
  const availableForStories = Math.max(8, terminalRows - chromeHeight - agentOutputLines);
  const storyRows = Math.ceil(totalCount / 2);
  const maxStoryRows = Math.min(storyRows, availableForStories);

  // Use 3-column layout for wider terminals
  if (layout.mode !== "vertical") {
    return (
      <Box flexDirection="column" width="100%">
        <LayoutSwitcher
          taskPanel={
            <TaskPanel
              stories={state.stories}
              currentStoryId={state.currentStory?.id}
              maxRows={terminalRows - 4}
              showPhases={true}
            />
          }
          outputPanel={
            <OutputPanel
              lines={state.outputLines}
              maxLines={terminalRows - 6}
              currentStory={state.currentStory}
              currentAgent={state.currentAgent?.displayName}
              currentModel={state.currentRouting?.model}
              routing={state.currentRouting}
              displayMode={state.outputMode}
            />
          }
          queuePanel={
            <MessageQueuePanel
              messages={state.messages}
              queueItems={state.queueItems}
              maxMessages={terminalRows - 10}
              maxQueueItems={5}
            />
          }
          statusBar={
            <StatusBar
              costData={state.costData}
              tokens={state.costData?.tokens}
              iteration={state.iteration}
              maxIterations={state.maxIterations}
              agents={state.agents}
              elapsedSeconds={state.totalElapsedSeconds || state.elapsedSeconds}
              mode={state.currentRouting?.mode}
              complexity={state.currentRouting?.complexity}
              harness={state.currentRouting?.harness}
              model={state.currentRouting?.model}
              savingsPercent={state.savingsPercent}
              completedStories={completedCount}
              totalStories={totalCount}
            />
          }
          forceMode={layout.mode}
        />

        {/* Error display */}
        {state.error && (
          <Box paddingX={1}>
            <Text color={colors.error}>Error: {state.error}</Text>
          </Box>
        )}

        {/* Completion message */}
        {state.isComplete && (
          <Box paddingX={1}>
            <Text color={colors.success} bold>
              All stories complete!
            </Text>
          </Box>
        )}

        {/* Idle warning when agent has been idle for too long */}
        {state.isRunning && state.idleSeconds >= 300 && (
          <Box paddingX={1}>
            <Text color={colors.warning}>
              Agent idle for {Math.floor(state.idleSeconds / 60)}m {state.idleSeconds % 60}s - Press 's' to skip
            </Text>
          </Box>
        )}

        {/* Queue removal prompt */}
        <QueueRemovalPrompt
          deleteMode={state.deleteMode}
          confirmClearActive={state.confirmClearActive}
          statusMessage={state.statusMessage}
        />

        {/* Full-width queue input at bottom (Claude Code style) */}
        {!state.deleteMode && !state.confirmClearActive && !state.statusMessage && (
          <QueueInput active={state.queueInputActive} value={state.queueInputValue} />
        )}
      </Box>
    );
  }

  // Vertical layout fallback for narrow terminals
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
          idleSeconds={state.idleSeconds}
          routing={state.currentRouting}
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

      {/* Status bar */}
      <StatusBar
        costData={state.costData}
        tokens={state.costData?.tokens}
        iteration={state.iteration}
        maxIterations={state.maxIterations}
        agents={state.agents}
        elapsedSeconds={state.totalElapsedSeconds || state.elapsedSeconds}
        mode={state.currentRouting?.mode}
        complexity={state.currentRouting?.complexity}
        harness={state.currentRouting?.harness}
        model={state.currentRouting?.model}
        savingsPercent={state.savingsPercent}
        completedStories={completedCount}
        totalStories={totalCount}
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
            All stories complete!
          </Text>
        </Box>
      )}

      {/* Queue removal prompt */}
      <QueueRemovalPrompt
        deleteMode={state.deleteMode}
        confirmClearActive={state.confirmClearActive}
        statusMessage={state.statusMessage}
      />

      {/* Idle warning when agent has been idle for too long */}
      {state.isRunning && state.idleSeconds >= 300 && (
        <Box paddingX={1}>
          <Text color={colors.warning}>
            Agent idle for {Math.floor(state.idleSeconds / 60)}m {state.idleSeconds % 60}s - Press 's' to skip to next iteration
          </Text>
        </Box>
      )}

      {/* Full-width queue input at bottom (Claude Code style) */}
      {!state.deleteMode && !state.confirmClearActive && !state.statusMessage && (
        <QueueInput active={state.queueInputActive} value={state.queueInputValue} />
      )}
    </Box>
  );
}
