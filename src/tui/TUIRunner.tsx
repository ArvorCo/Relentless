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
import type { RelentlessConfig, Mode } from "../config/schema.js";
import { getAgent, getInstalledAgents } from "../agents/registry.js";
import { loadPRD, getNextStory, isComplete, countStories } from "../prd/index.js";
import { routeTask } from "../routing/router.js";
import { getModelForHarnessAndMode, getFreeModeHarnesses } from "../routing/fallback.js";
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
  /** Harness fallback order */
  fallbackOrder?: ("claude" | "codex" | "droid" | "opencode" | "amp" | "gemini")[];
  /** Skip final review phase */
  skipReview?: boolean;
  /** Review quality mode (can differ from execution mode) */
  reviewMode?: "free" | "cheap" | "good" | "genius";
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
  mode,
  fallbackOrder,
  onComplete,
}: TUIRunnerProps): React.ReactElement {
  const { exit } = useApp();
  const autoModeEnabled = preferredAgent === "auto";
  const autoModeConfig = config.autoMode;
  let autoMode = (mode ?? autoModeConfig.defaultMode) as Mode;
  let effectiveFallbackOrder: AgentName[] = autoModeEnabled
    ? getFreeModeHarnesses((fallbackOrder ?? autoModeConfig.fallbackOrder) as AgentName[])
    : config.fallback.priority;
  const [state, setState] = useState<TUIState>({
    feature,
    project: "",
    branchName: "",
    stories: [],
    iteration: 0,
    maxIterations,
    currentStory: null,
    currentAgent: null,
    currentRouting: undefined,
    agents: [],
    outputLines: [],
    elapsedSeconds: 0,
    idleSeconds: 0,
    isRunning: false,
    isComplete: false,
    queueItems: [],
    queueInputActive: false,
    queueInputValue: "",
    deleteMode: false,
    confirmClearActive: false,
    statusMessage: undefined,
    // New fields for enhanced TUI
    messages: [],
    layoutMode: "vertical",
    outputMode: "normal",
    totalElapsedSeconds: 0,
    startTime: new Date(),
  });

  // Queue file watcher ref
  const queueWatcherRef = React.useRef<FSWatcher | null>(null);
  const featurePathRef = React.useRef<string>("");
  const lastOutputAtRef = React.useRef<number>(Date.now());

  // Skip iteration - AbortController to kill the running process
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Idle warning threshold (5 minutes)
  const IDLE_WARNING_THRESHOLD_SECONDS = 300;

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

  // Handle keyboard input for queue and skip
  useInput((input, key) => {
    // Detect backspace: key.backspace flag OR delete/backspace character codes
    const isBackspace = key.backspace || key.delete || input === "\x7f" || input === "\b";
    const keyString = key.escape ? "escape" : key.return ? "return" : isBackspace ? "backspace" : key.tab ? "tab" : input;

    // Handle 's' key to skip current iteration when idle
    if (input === "s" && !state.queueInputActive && !state.deleteMode && !state.confirmClearActive) {
      if (state.isRunning && state.idleSeconds >= IDLE_WARNING_THRESHOLD_SECONDS) {
        // Abort the current agent process
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setState((prev) => ({
          ...prev,
          statusMessage: "Killing agent and skipping to next iteration...",
        }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, statusMessage: undefined }));
        }, 2000);
        return;
      }
    }

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

  // Timer for elapsed and idle time
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setState((prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
        idleSeconds: Math.floor((now - lastOutputAtRef.current) / 1000),
        totalElapsedSeconds: prev.startTime
          ? Math.floor((now - prev.startTime.getTime()) / 1000)
          : prev.totalElapsedSeconds + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning]);

  // Add output line (strips newlines to prevent rendering issues)
  const addOutput = useCallback((line: string) => {
    // Remove leading/trailing newlines and split if line contains embedded newlines
    const cleanLines = line.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    if (cleanLines.length === 0) return; // Skip empty lines
    
    lastOutputAtRef.current = Date.now();
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
        const prdRoutingPreference = prd.routingPreference;
        const preferredMode =
          prdRoutingPreference?.type === "auto" ? prdRoutingPreference.mode : undefined;
        autoMode = (mode ?? preferredMode ?? autoModeConfig.defaultMode) as Mode;
        const allowFree =
          prdRoutingPreference?.type === "auto"
            ? prdRoutingPreference.allowFree !== false
            : true;
        const autoFallbackOrder = (fallbackOrder ?? autoModeConfig.fallbackOrder) as AgentName[];
        const filteredFallbackOrder =
          allowFree || autoMode === "free"
            ? autoFallbackOrder
            : autoFallbackOrder.filter((h) => h !== "opencode");
        effectiveFallbackOrder = autoModeEnabled
          ? autoMode === "free"
            ? getFreeModeHarnesses(filteredFallbackOrder)
            : filteredFallbackOrder
          : config.fallback.priority;

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

        if (autoModeEnabled && !autoModeConfig.enabled) {
          addOutput("Auto mode routing enabled via CLI even though config.autoMode.enabled is false.");
        }

        // Track rate-limited agents
        const limitedAgents = new Map<AgentName, { resetTime?: Date; detectedAt: Date }>();

        // Main loop
        for (let i = 1; i <= maxIterations && !cancelled; i++) {
          // Create new AbortController for this iteration
          abortControllerRef.current = new AbortController();
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
            idleSeconds: 0,
            currentRouting: autoModeEnabled ? prev.currentRouting : undefined,
          }));
          lastOutputAtRef.current = Date.now();

          addOutput(`--- Iteration ${i}/${maxIterations} ---`);
          addOutput(`Story: ${story.id} - ${story.title}`);

          // Select agent
          let agentName: AgentName;
          let autoRoutingDecision: Awaited<ReturnType<typeof routeTask>> | null = null;
          let autoRoutingModel: string | undefined;

          if (preferredAgent === "auto") {
            autoRoutingDecision = await routeTask(story, autoModeConfig, autoMode);
            if (!autoRoutingDecision) {
              throw new Error("Failed to get routing decision");
            }
            const decision = autoRoutingDecision;
            agentName = decision.harness as AgentName;
            autoRoutingModel = decision.model;

            setState((prev) => ({
              ...prev,
              currentRouting: {
                mode: autoMode,
                complexity: decision.complexity,
                harness: agentName,
                model: decision.model,
              },
            }));

            addOutput(
              `Routing: ${autoMode}/${decision.complexity} -> ${agentName}/${decision.model}`
            );
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
              for (const fallbackName of effectiveFallbackOrder) {
                if (!limitedAgents.has(fallbackName)) {
                  const installed = agentStates.find((a) => a.name === fallbackName);
                  if (installed) {
                    agentName = fallbackName;
                    if (autoRoutingDecision && autoModeEnabled) {
                      const fallbackModel = getModelForHarnessAndMode(
                        fallbackName,
                        autoMode,
                        autoRoutingDecision.complexity,
                        autoModeConfig
                      );
                      autoRoutingModel = fallbackModel;
                      setState((prev) => ({
                        ...prev,
                        currentRouting: {
                          mode: autoMode,
                          complexity: autoRoutingDecision.complexity,
                          harness: fallbackName,
                          model: fallbackModel,
                        },
                      }));
                      addOutput(
                        `Switched to fallback agent: ${fallbackName} (model ${fallbackModel})`
                      );
                    } else {
                      addOutput(`Switched to fallback agent: ${fallbackName}`);
                    }
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
              model: autoModeEnabled ? autoRoutingModel : config.agents[agent.name]?.model,
              timeout: config.execution.timeout,
              signal: abortControllerRef.current?.signal,
            });

            let result;
            let aborted = false;
            for await (const chunk of stream) {
              if (cancelled) break;
              // Check if aborted (user pressed 's' to skip)
              if (abortControllerRef.current?.signal.aborted) {
                addOutput("⏭️ Agent killed - skipping to next iteration...");
                aborted = true;
                break;
              }
              // Split chunk into lines and add each
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.trim()) {
                  addOutput(line);
                }
              }
              result = chunk; // Will be overwritten by return value
            }

            // If aborted, continue to next iteration
            if (aborted) {
              await sleep(500); // Brief delay before next iteration
              continue;
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
              model: autoModeEnabled ? autoRoutingModel : config.agents[agent.name]?.model,
              timeout: config.execution.timeout,
              signal: abortControllerRef.current?.signal,
            });

            // Check if aborted (user pressed 's' to skip)
            if (abortControllerRef.current?.signal.aborted) {
              addOutput("⏭️ Agent killed - skipping to next iteration...");
              await sleep(500);
              continue;
            }

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

          // Delay between iterations (interruptible by abort)
          const delayMs = config.execution.iterationDelay;
          const delaySteps = Math.ceil(delayMs / 100);
          for (let step = 0; step < delaySteps; step++) {
            if (abortControllerRef.current?.signal.aborted || cancelled) break;
            await sleep(Math.min(100, delayMs - step * 100));
          }
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
