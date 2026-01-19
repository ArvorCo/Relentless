/**
 * TUI Runner
 *
 * Wraps the execution runner with a beautiful terminal interface
 */

import React, { useState, useEffect, useCallback } from "react";
import { render, useApp, useInput } from "ink";
import { App } from "./App.js";
import type { TUIState, Story, AgentState } from "./types.js";
import type { AgentName } from "../agents/types.js";
import type { PRD } from "../prd/types.js";
import type { RelentlessConfig } from "../config/schema.js";
import { getAgent, getInstalledAgents } from "../agents/registry.js";
import { loadPRD, getNextStory, isComplete, countStories } from "../prd/index.js";
import { routeStory } from "../execution/router.js";
import { loadQueueForTUI, watchQueueFile, stopWatchingQueue, QUEUE_PANEL_REFRESH_INTERVAL } from "./components/QueuePanel.js";
import { handleQueueKeypress, submitToQueue } from "./components/QueueInput.js";
import { handleQueueDeletionKeypress, removeQueueItem, clearQueueItems } from "./components/QueueRemoval.js";
import type { FSWatcher } from "node:fs";
import { dirname } from "node:path";

export interface TUIRunnerOptions {
  agent: AgentName | "auto";
  maxIterations: number;
  workingDirectory: string;
  prdPath: string;
  promptPath: string;
  feature: string;
  config: RelentlessConfig;
  dryRun?: boolean;
  /** Cost optimization mode */
  mode?: "free" | "cheap" | "good" | "genius";
}

interface TUIRunnerProps extends TUIRunnerOptions {
  onComplete: (success: boolean) => void;
}

function TUIRunnerComponent({
  agent: preferredAgent,
  maxIterations,
  workingDirectory,
  prdPath,
  promptPath,
  feature,
  config,
  dryRun = false,
  onComplete,
}: TUIRunnerProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<TUIState>({
    feature,
    project: "",
    branchName: "",
    stories: [],
    iteration: 0,
    maxIterations,
    currentStory: null,
    currentAgent: null,
    agents: [],
    outputLines: [],
    elapsedSeconds: 0,
    isRunning: false,
    isComplete: false,
    queueItems: [],
    queueInputActive: false,
    queueInputValue: "",
    deleteMode: false,
    confirmClearActive: false,
    statusMessage: undefined,
  });

  // Queue file watcher ref
  const queueWatcherRef = React.useRef<FSWatcher | null>(null);
  const featurePathRef = React.useRef<string>("");

  // Load queue items function
  const loadQueueItems = useCallback(async () => {
    if (!featurePathRef.current) return;
    const items = await loadQueueForTUI(featurePathRef.current);
    setState((prev) => ({
      ...prev,
      queueItems: items,
    }));
  }, []);

  // Set up queue file watching
  useEffect(() => {
    // Get feature path from PRD path
    const featurePath = dirname(prdPath);
    featurePathRef.current = featurePath;

    // Initial load
    loadQueueItems();

    // Set up file watcher
    try {
      queueWatcherRef.current = watchQueueFile(featurePath, () => {
        loadQueueItems();
      });
    } catch {
      // Queue file may not exist yet, that's ok
    }

    // Also set up a polling interval as backup (file watchers can be unreliable)
    const pollInterval = setInterval(() => {
      loadQueueItems();
    }, QUEUE_PANEL_REFRESH_INTERVAL);

    return () => {
      if (queueWatcherRef.current) {
        stopWatchingQueue(queueWatcherRef.current);
      }
      clearInterval(pollInterval);
    };
  }, [prdPath, loadQueueItems]);

  // Handle keyboard input for queue
  useInput((input, key) => {
    const keyString = key.escape ? "escape" : key.return ? "return" : key.backspace ? "backspace" : key.tab ? "tab" : input;

    // First check deletion handling (d/D keys, numbers in delete mode, y/n in confirm mode)
    const deletionState = {
      deleteMode: state.deleteMode,
      confirmClearActive: state.confirmClearActive,
      queueInputActive: state.queueInputActive,
    };

    const deletionResult = handleQueueDeletionKeypress(
      keyString,
      deletionState,
      key.ctrl || key.meta,
      state.queueItems.length
    );

    // Handle removal action
    if (deletionResult.removeIndex !== undefined && featurePathRef.current) {
      removeQueueItem(featurePathRef.current, deletionResult.removeIndex).then((result) => {
        if (result.success) {
          loadQueueItems();
          setState((prev) => ({
            ...prev,
            statusMessage: `Removed: ${result.removedContent}`,
            deleteMode: false,
            confirmClearActive: false,
          }));
          // Clear status message after 2 seconds
          setTimeout(() => {
            setState((prev) => ({ ...prev, statusMessage: undefined }));
          }, 2000);
        } else {
          setState((prev) => ({
            ...prev,
            statusMessage: result.error,
            deleteMode: false,
            confirmClearActive: false,
          }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, statusMessage: undefined }));
          }, 2000);
        }
      });
      return;
    }

    // Handle clear all action
    if (deletionResult.clearAll && featurePathRef.current) {
      clearQueueItems(featurePathRef.current).then((result) => {
        if (result.success) {
          loadQueueItems();
          setState((prev) => ({
            ...prev,
            statusMessage: `Cleared ${result.clearedCount} items from queue`,
            deleteMode: false,
            confirmClearActive: false,
          }));
          // Clear status message after 2 seconds
          setTimeout(() => {
            setState((prev) => ({ ...prev, statusMessage: undefined }));
          }, 2000);
        }
      });
      return;
    }

    // Check if deletion result has a message
    if (deletionResult.message) {
      setState((prev) => ({
        ...prev,
        statusMessage: deletionResult.message,
        deleteMode: deletionResult.deleteMode,
        confirmClearActive: deletionResult.confirmClearActive,
      }));
      // Clear status message after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, statusMessage: undefined }));
      }, 2000);
      return;
    }

    // Update deletion state if changed
    if (deletionResult.deleteMode !== state.deleteMode || deletionResult.confirmClearActive !== state.confirmClearActive) {
      setState((prev) => ({
        ...prev,
        deleteMode: deletionResult.deleteMode,
        confirmClearActive: deletionResult.confirmClearActive,
      }));
      // If in a special mode, don't process queue input
      if (deletionResult.deleteMode || deletionResult.confirmClearActive) {
        return;
      }
    }

    // Handle queue input (only if not in delete/confirm mode)
    if (!state.deleteMode && !state.confirmClearActive) {
      const inputState = {
        active: state.queueInputActive,
        value: state.queueInputValue,
      };

      const inputResult = handleQueueKeypress(
        keyString,
        inputState,
        key.ctrl || key.meta
      );

      // Handle submission
      if (inputResult.submit && featurePathRef.current) {
        submitToQueue(featurePathRef.current, inputResult.submit).then(() => {
          // Reload queue items after submission
          loadQueueItems();
        });
      }

      // Update state
      setState((prev) => ({
        ...prev,
        queueInputActive: inputResult.active,
        queueInputValue: inputResult.value,
      }));
    }
  });

  // Timer for elapsed time
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning]);

  // Add output line (strips newlines to prevent rendering issues)
  const addOutput = useCallback((line: string) => {
    // Remove leading/trailing newlines and split if line contains embedded newlines
    const cleanLines = line.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    if (cleanLines.length === 0) return; // Skip empty lines
    
    setState((prev) => ({
      ...prev,
      outputLines: [...prev.outputLines.slice(-100), ...cleanLines], // Keep last 100 lines
    }));
  }, []);

  // Main execution effect
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Load PRD
        const prd = await loadPRD(prdPath);

        // Get installed agents
        const installed = await getInstalledAgents();
        const agentStates: AgentState[] = installed.map((a) => ({
          name: a.name,
          displayName: a.displayName,
          active: false,
          rateLimited: false,
        }));

        // Initial state
        setState((prev) => ({
          ...prev,
          project: prd.project,
          branchName: prd.branchName,
          stories: prd.userStories.map((s) => ({
            id: s.id,
            title: s.title,
            passes: s.passes,
            priority: s.priority,
            criteriaCount: s.acceptanceCriteria.length,
            research: s.research,
            phase: s.phase,
          })),
          agents: agentStates,
        }));

        addOutput(`Starting Relentless for feature: ${feature}`);
        addOutput(`Project: ${prd.project}`);
        addOutput(`Max iterations: ${maxIterations}`);

        if (dryRun) {
          addOutput("DRY RUN - not executing agents");
        }

        // Track rate-limited agents
        const limitedAgents = new Map<AgentName, { resetTime?: Date; detectedAt: Date }>();

        // Main loop
        for (let i = 1; i <= maxIterations && !cancelled; i++) {
          setState((prev) => ({ ...prev, iteration: i }));

          // Reload PRD
          const currentPRD = await loadPRD(prdPath);

          // Check completion
          if (isComplete(currentPRD)) {
            addOutput("All stories complete!");
            setState((prev) => ({ ...prev, isComplete: true, isRunning: false }));
            break;
          }

          // Get next story
          const story = getNextStory(currentPRD);
          if (!story) {
            addOutput("No more stories to work on!");
            setState((prev) => ({ ...prev, isComplete: true, isRunning: false }));
            break;
          }

          // Update current story
          setState((prev) => ({
            ...prev,
            currentStory: {
              id: story.id,
              title: story.title,
              passes: story.passes,
              priority: story.priority,
              criteriaCount: story.acceptanceCriteria.length,
              research: story.research,
              phase: story.phase,
            },
            elapsedSeconds: 0,
          }));

          addOutput(`--- Iteration ${i}/${maxIterations} ---`);
          addOutput(`Story: ${story.id} - ${story.title}`);

          // Select agent
          let agentName: AgentName;
          if (preferredAgent === "auto") {
            agentName = routeStory(story, config.routing);
          } else {
            agentName = preferredAgent;
          }

          // Check if agent is rate-limited
          const limitState = limitedAgents.get(agentName);
          if (limitState) {
            const hasReset = limitState.resetTime
              ? new Date() >= limitState.resetTime
              : new Date().getTime() - limitState.detectedAt.getTime() > 3600000;

            if (hasReset) {
              limitedAgents.delete(agentName);
            } else {
              // Try fallback
              for (const fallbackName of config.fallback.priority) {
                if (!limitedAgents.has(fallbackName)) {
                  const installed = agentStates.find((a) => a.name === fallbackName);
                  if (installed) {
                    agentName = fallbackName;
                    addOutput(`Switched to fallback agent: ${fallbackName}`);
                    break;
                  }
                }
              }
            }
          }

          const agent = getAgent(agentName);

          // Update agent state
          setState((prev) => ({
            ...prev,
            currentAgent: {
              name: agent.name,
              displayName: agent.displayName,
              active: true,
              rateLimited: false,
            },
            agents: prev.agents.map((a) => ({
              ...a,
              active: a.name === agent.name,
            })),
            isRunning: true,
          }));

          addOutput(`Agent: ${agent.displayName}`);

          if (dryRun) {
            addOutput("[Dry run - skipping execution]");
            await sleep(1000);
            continue;
          }

          // Load prompt
          const prompt = await Bun.file(promptPath).text();

          // Invoke agent with streaming if available
          if (agent.invokeStream) {
            const stream = agent.invokeStream(prompt, {
              workingDirectory,
              dangerouslyAllowAll: config.agents[agent.name]?.dangerouslyAllowAll ?? true,
              model: config.agents[agent.name]?.model,
            });

            let result;
            for await (const chunk of stream) {
              if (cancelled) break;
              // Split chunk into lines and add each
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.trim()) {
                  addOutput(line);
                }
              }
              result = chunk; // Will be overwritten by return value
            }

            // Get the final result
            const finalResult = await stream.next();
            if (finalResult.done && finalResult.value) {
              const agentResult = finalResult.value;

              // Check rate limit
              const rateLimit = agent.detectRateLimit(agentResult.output);
              if (rateLimit.limited) {
                addOutput(`⚠️ ${agent.displayName} rate limited!`);
                limitedAgents.set(agent.name, {
                  resetTime: rateLimit.resetTime,
                  detectedAt: new Date(),
                });

                setState((prev) => ({
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.name === agent.name
                      ? { ...a, rateLimited: true, resetTime: rateLimit.resetTime }
                      : a
                  ),
                }));

                i--; // Retry iteration
                await sleep(config.fallback.retryDelay);
                continue;
              }

              if (agentResult.isComplete) {
                addOutput("🎉 Agent signaled COMPLETE!");
              }

              addOutput(`Duration: ${(agentResult.duration / 1000).toFixed(1)}s`);
            }
          } else {
            // Non-streaming fallback
            addOutput("Running agent (non-streaming)...");
            const result = await agent.invoke(prompt, {
              workingDirectory,
              dangerouslyAllowAll: config.agents[agent.name]?.dangerouslyAllowAll ?? true,
              model: config.agents[agent.name]?.model,
            });

            // Add output preview
            const lines = result.output.split("\n").slice(0, 10);
            for (const line of lines) {
              if (line.trim()) {
                addOutput(line);
              }
            }
            if (result.output.split("\n").length > 10) {
              addOutput(`... (${result.output.split("\n").length - 10} more lines)`);
            }

            // Check rate limit
            const rateLimit = agent.detectRateLimit(result.output);
            if (rateLimit.limited) {
              addOutput(`⚠️ ${agent.displayName} rate limited!`);
              limitedAgents.set(agent.name, {
                resetTime: rateLimit.resetTime,
                detectedAt: new Date(),
              });

              setState((prev) => ({
                ...prev,
                agents: prev.agents.map((a) =>
                  a.name === agent.name
                    ? { ...a, rateLimited: true, resetTime: rateLimit.resetTime }
                    : a
                ),
              }));

              i--; // Retry iteration
              await sleep(config.fallback.retryDelay);
              continue;
            }

            if (result.isComplete) {
              addOutput("🎉 Agent signaled COMPLETE!");
            }

            addOutput(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
          }

          // Update stories from PRD
          const updatedPRD = await loadPRD(prdPath);
          setState((prev) => ({
            ...prev,
            stories: updatedPRD.userStories.map((s) => ({
              id: s.id,
              title: s.title,
              passes: s.passes,
              priority: s.priority,
              criteriaCount: s.acceptanceCriteria.length,
              research: s.research,
              phase: s.phase,
            })),
          }));

          const counts = countStories(updatedPRD);
          addOutput(`Progress: ${counts.completed}/${counts.total} complete`);

          // Delay between iterations
          await sleep(config.execution.iterationDelay);
        }

        // Final state
        const finalPRD = await loadPRD(prdPath);
        const success = isComplete(finalPRD);

        setState((prev) => ({
          ...prev,
          isRunning: false,
          isComplete: success,
        }));

        if (!success) {
          addOutput(`⚠️ Reached max iterations (${maxIterations}) without completing all stories.`);
        }

        onComplete(success);
      } catch (error) {
        addOutput(`Error: ${error}`);
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: String(error),
        }));
        onComplete(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return <App state={state} />;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the TUI
 */
export async function runTUI(options: TUIRunnerOptions): Promise<boolean> {
  // Clear terminal before starting TUI to prevent rendering artifacts
  process.stdout.write('\x1B[2J\x1B[0f');
  
  return new Promise((resolve) => {
    const { unmount } = render(
      <TUIRunnerComponent
        {...options}
        onComplete={(success) => {
          // Wait a bit to show final state
          setTimeout(() => {
            unmount();
            resolve(success);
          }, 2000);
        }}
      />
    );
  });
}
